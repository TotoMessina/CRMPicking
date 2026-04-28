import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

/**
 * offlineManager.ts
 * Motor de sincronización Offline-First para PickingUp CRM.
 */

const DB_NAME = 'pickingup-offline-v1';
const DB_VERSION = 2;

const STORES = {
    CLIENTES: 'clientes_snapshot',
    OUTBOX: 'outbox_mutations',
    TRACKING: 'user_tracking_points',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

interface Mutation {
    id?: number;
    table: string;
    method: 'INSERT' | 'UPDATE' | 'DELETE';
    payload: any;
    created_at: string;
    retries: number;
}

interface TrackingPoint {
    id?: number;
    usuario_id: string;
    empresa_id: string;
    lat: number;
    lng: number;
    created_at: string;
}

// ─── Inicialización de IndexedDB ────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            if (!db.objectStoreNames.contains(STORES.CLIENTES)) {
                const store = db.createObjectStore(STORES.CLIENTES, { keyPath: 'id' });
                store.createIndex('empresa_id', 'empresa_id', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
                const outbox = db.createObjectStore(STORES.OUTBOX, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                outbox.createIndex('created_at', 'created_at', { unique: false });
            }

            if (!db.objectStoreNames.contains(STORES.TRACKING)) {
                const tracking = db.createObjectStore(STORES.TRACKING, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                tracking.createIndex('created_at', 'created_at', { unique: false });
            }
        };

        req.onsuccess = (e) => {
            _db = (e.target as IDBOpenDBRequest).result;
            resolve(_db);
        };

        req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
    });
}

function tx(storeName: StoreName, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    return openDB().then((db) => {
        const transaction = db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    });
}

// ─── API pública ─────────────────────────────────────────────────────────────

export async function saveClientsLocally(clientes: any[]): Promise<void> {
    if (!clientes || clientes.length === 0) return;
    try {
        const store = await tx(STORES.CLIENTES, 'readwrite');
        for (const cliente of clientes) {
            store.put(cliente);
        }
    } catch (err) {
        console.warn('[OfflineManager] Error saving clients locally:', err);
    }
}

export async function getLocalClients(empresaId: string): Promise<any[]> {
    try {
        const store = await tx(STORES.CLIENTES, 'readonly');
        return new Promise((resolve, reject) => {
            const index = store.index('empresa_id');
            const req = index.getAll(empresaId);
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    } catch (err) {
        console.warn('[OfflineManager] Error reading local clients:', err);
        return [];
    }
}

export async function queueMutation(table: string, method: Mutation['method'], payload: any): Promise<void> {
    try {
        const store = await tx(STORES.OUTBOX, 'readwrite');
        store.add({
            table,
            method,
            payload,
            created_at: new Date().toISOString(),
            retries: 0,
        });
    } catch (err) {
        console.warn('[OfflineManager] Error queuing mutation:', err);
    }
}

export async function saveTrackingPoint(point: Omit<TrackingPoint, 'id' | 'created_at'>): Promise<void> {
    try {
        const store = await tx(STORES.TRACKING, 'readwrite');
        store.add({
            ...point,
            created_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn('[OfflineManager] Error saving tracking point:', err);
    }
}

export async function getPendingCount(): Promise<number> {
    try {
        const store = await tx(STORES.OUTBOX, 'readonly');
        return new Promise((resolve) => {
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(0);
        });
    } catch {
        return 0;
    }
}

export async function flushOutbox(supabaseClient: SupabaseClient<Database>): Promise<{synced: number, failed: number}> {
    let synced = 0;
    let failed = 0;

    try {
        const store = await tx(STORES.OUTBOX, 'readwrite');
        const mutations: Mutation[] = await new Promise((resolve) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });

        for (const mutation of mutations) {
            try {
                let error: any = null;

                if (mutation.table === '_rpc_crear_cliente' && mutation.method === 'INSERT') {
                    const p = mutation.payload;
                    const { error: rpcErr } = await supabaseClient.rpc('crear_cliente_v5_final', {
                        p_payload: { ...p }
                    } as any);
                    error = rpcErr;
                } else if (mutation.method === 'INSERT') {
                    ({ error } = await supabaseClient.from(mutation.table as any).insert(mutation.payload));
                } else if (mutation.method === 'UPDATE' && mutation.payload.id) {
                    const { id, ...data } = mutation.payload;
                    ({ error } = await supabaseClient.from(mutation.table as any).update(data).eq('id', id));
                } else if (mutation.method === 'DELETE' && mutation.payload.id) {
                    ({ error } = await supabaseClient.from(mutation.table as any).delete().eq('id', mutation.payload.id));
                }

                if (!error) {
                    const delStore = await tx(STORES.OUTBOX, 'readwrite');
                    if (mutation.id !== undefined) delStore.delete(mutation.id);
                    synced++;
                } else {
                    failed++;
                }
            } catch (err) {
                console.warn('[OfflineManager] Mutation error:', err);
                failed++;
            }
        }
    } catch (err) {
        console.warn('[OfflineManager] Outbox flush error:', err);
    }

    try {
        const tStore = await tx(STORES.TRACKING, 'readwrite');
        const points: TrackingPoint[] = await new Promise((resolve) => {
            const req = tStore.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });

        if (points.length > 0) {
            const cleanPoints = points.map(({ id, ...p }) => ({
                usuario_id: p.usuario_id,
                empresa_id: p.empresa_id,
                lat: p.lat,
                lng: p.lng,
                fecha: p.created_at
            }));

            const { error: tErr } = await supabaseClient
                .from('historial_ubicaciones' as any)
                .insert(cleanPoints as any);

            if (!tErr) {
                const clearStore = await tx(STORES.TRACKING, 'readwrite');
                clearStore.clear();
                synced += points.length;
            } else {
                console.error('[OfflineManager] ❌ Fallo al sincronizar puntos GPS:', tErr.message);
            }
        }
    } catch (err) {
        console.error('[OfflineManager] ❌ Error inesperado en sincronización de tracking:', err);
    }

    return { synced, failed };
}

export async function clearLocalClients(): Promise<void> {
    try {
        const store = await tx(STORES.CLIENTES, 'readwrite');
        store.clear();
    } catch (err) {
        console.warn('[OfflineManager] Error clearing local clients:', err);
    }
}
