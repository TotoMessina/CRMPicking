import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { flushOutbox, getPendingCount } from '../lib/offlineManager';
import toast from 'react-hot-toast';

/**
 * useOfflineSync
 *
 * Hook centralizado que:
 * 1. Expone el estado de conexión en tiempo real.
 * 2. Rastrea cuántas mutaciones están en la bandeja de salida.
 * 3. Envía automáticamente la bandeja al restaurar la conexión.
 */
export function useOfflineSync() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncTimeoutRef = useRef(null);

    // Refresh the pending count badge
    const refreshPendingCount = useCallback(async () => {
        const count = await getPendingCount();
        setPendingCount(count);
    }, []);

    // Sync the outbox to Supabase
    const syncOutbox = useCallback(async () => {
        if (isSyncing) return;

        const count = await getPendingCount();
        if (count === 0) return;

        setIsSyncing(true);
        const toastId = toast.loading(`Sincronizando ${count} cambio${count !== 1 ? 's' : ''}...`);

        try {
            const { synced, failed } = await flushOutbox(supabase);

            if (synced > 0 && failed === 0) {
                toast.success(`✅ ${synced} cambio${synced !== 1 ? 's' : ''} sincronizado${synced !== 1 ? 's' : ''}`, { id: toastId });
            } else if (synced > 0 && failed > 0) {
                toast(`⚠️ ${synced} sincronizados, ${failed} fallaron`, { id: toastId });
            } else if (failed > 0) {
                toast.error(`Error sincronizando. Reintentando más tarde.`, { id: toastId });
            } else {
                toast.dismiss(toastId);
            }
        } catch (err) {
            console.error('[useOfflineSync] Flush error:', err);
            toast.error('Error al sincronizar cambios offline.', { id: toastId });
        } finally {
            setIsSyncing(false);
            refreshPendingCount();
        }
    }, [isSyncing, refreshPendingCount]);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Small delay to let network connections stabilize before syncing
            syncTimeoutRef.current = setTimeout(() => {
                syncOutbox();
            }, 1500);
        };

        const handleOffline = () => {
            setIsOnline(false);
            if (syncTimeoutRef.current) {
                clearTimeout(syncTimeoutRef.current);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial count on mount
        refreshPendingCount();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        };
    }, [syncOutbox, refreshPendingCount]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        refreshPendingCount,
        syncOutbox,
    };
}
