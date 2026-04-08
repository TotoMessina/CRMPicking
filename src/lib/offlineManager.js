/**
 * offlineManager.js
 * Motor de sincronización Offline-First para PickingUp CRM.
 *
 * Responsabilidades:
 * 1. Mirror: Guarda snapshots de datos en IndexedDB para lectura sin red.
 * 2. Outbox: Encola mutaciones (INSERT/UPDATE) cuando no hay conexión.
 * 3. Sync: Envía la bandeja de salida a Supabase cuando vuelve la red.
 */

const DB_NAME = 'pickingup-offline-v1';
const DB_VERSION = 1;

const STORES = {
    CLIENTES: 'clientes_snapshot',
    OUTBOX: 'outbox_mutations',
};

// ─── Inicialización de IndexedDB ────────────────────────────────────────────

let _db = null;

function openDB() {
    if (_db) return Promise.resolve(_db);

    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Store para snapshot de clientes (clave = empresa_id + cliente id)
            if (!db.objectStoreNames.contains(STORES.CLIENTES)) {
                const store = db.createObjectStore(STORES.CLIENTES, { keyPath: 'id' });
                store.createIndex('empresa_id', 'empresa_id', { unique: false });
            }

            // Store para mutaciones pendientes
            if (!db.objectStoreNames.contains(STORES.OUTBOX)) {
                const outbox = db.createObjectStore(STORES.OUTBOX, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                outbox.createIndex('created_at', 'created_at', { unique: false });
            }
        };

        req.onsuccess = (e) => {
            _db = e.target.result;
            resolve(_db);
        };

        req.onerror = (e) => reject(e.target.error);
    });
}

function tx(storeName, mode = 'readonly') {
    return openDB().then((db) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        return store;
    });
}

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Guarda un array de clientes en IndexedDB para uso offline.
 * @param {Array} clientes
 */
export async function saveClientsLocally(clientes) {
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

/**
 * Lee clientes del snapshot local en IndexedDB.
 * @param {string} empresaId
 * @returns {Promise<Array>}
 */
export async function getLocalClients(empresaId) {
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

/**
 * Encola una mutación para ser enviada cuando haya conexión.
 * @param {string} table - Nombre de la tabla de Supabase
 * @param {'INSERT'|'UPDATE'|'DELETE'} method
 * @param {object} payload - Datos de la mutación
 */
export async function queueMutation(table, method, payload) {
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

/**
 * Retorna cuántas mutaciones hay en la bandeja de salida.
 * @returns {Promise<number>}
 */
export async function getPendingCount() {
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

/**
 * Envía todas las mutaciones pendientes a Supabase.
 * Se llama automáticamente cuando se detecta que vuelve la conexión.
 * @param {import('../lib/supabase').supabase} supabaseClient
 * @returns {Promise<{synced: number, failed: number}>}
 */
export async function flushOutbox(supabaseClient) {
    const store = await tx(STORES.OUTBOX, 'readwrite');

    const mutations = await new Promise((resolve) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
    });

    if (mutations.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const mutation of mutations) {
        try {
            let error = null;

            // Special case: new client creation uses a Supabase RPC
            if (mutation.table === '_rpc_crear_cliente' && mutation.method === 'INSERT') {
                const p = mutation.payload;
                const { error: rpcErr } = await supabaseClient.rpc('crear_cliente_v5_final', {
                    p_payload: {
                        p_nombre_local: p.nombre_local,
                        p_nombre: p.nombre,
                        p_direccion: p.direccion,
                        p_telefono: p.telefono,
                        p_mail: p.mail,
                        p_cuit: p.cuit,
                        p_lat: p.lat,
                        p_lng: p.lng,
                        p_empresa_id: p.empresa_id,
                        p_rubro: p.rubro,
                        p_estado: p.estado,
                        p_responsable: p.responsable,
                        p_interes: p.interes,
                        p_estilo_contacto: p.estilo_contacto,
                        p_venta_digital: p.venta_digital,
                        p_venta_digital_cual: p.venta_digital_cual,
                        p_situacion: p.situacion,
                        p_notas: p.notas,
                        p_tipo_contacto: p.tipo_contacto,
                        p_fecha_proximo_contacto: p.fecha_proximo_contacto,
                        p_hora_proximo_contacto: p.hora_proximo_contacto,
                        p_creado_por: p.creado_por || null,
                    }
                });
                error = rpcErr;
            } else if (mutation.method === 'INSERT') {
                ({ error } = await supabaseClient.from(mutation.table).insert(mutation.payload));
            } else if (mutation.method === 'UPDATE' && mutation.payload.id) {
                const { id, ...data } = mutation.payload;
                ({ error } = await supabaseClient.from(mutation.table).update(data).eq('id', id));
            } else if (mutation.method === 'DELETE' && mutation.payload.id) {
                ({ error } = await supabaseClient.from(mutation.table).delete().eq('id', mutation.payload.id));
            }

            if (!error) {
                // Remove from outbox on success
                const deleteStore = await tx(STORES.OUTBOX, 'readwrite');
                deleteStore.delete(mutation.id);
                synced++;
            } else {
                console.warn('[OfflineManager] Mutation failed:', error.message, mutation);
                failed++;
            }
        } catch (err) {
            console.warn('[OfflineManager] Unexpected error flushing mutation:', err);
            failed++;
        }
    }

    return { synced, failed };
}

/**
 * Elimina el snapshot de clientes (e.g., al hacer logout).
 */
export async function clearLocalClients() {
    try {
        const store = await tx(STORES.CLIENTES, 'readwrite');
        store.clear();
    } catch (err) {
        console.warn('[OfflineManager] Error clearing local clients:', err);
    }
}
