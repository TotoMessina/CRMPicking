import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { WifiOff, ServerCrash, CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export function NetworkStatusHandler() {
    const { isOnline, pendingCount, isSyncing } = useOfflineSync();
    const [wasOffline, setWasOffline] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setWasOffline(true);
            // Show persistent offline toast with pending count
            toast.custom((t) => (
                <div
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}
                    style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        boxShadow: 'var(--shadow-lg)',
                        maxWidth: '400px',
                        width: '90%'
                    }}
                >
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '12px', padding: '12px', display: 'flex' }}>
                        <WifiOff size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
                            Modo Offline
                        </h4>
                        <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            Estás usando datos en caché. Los cambios se sincronizarán al recuperar la señal.
                        </p>
                        {pendingCount > 0 && (
                            <div style={{
                                marginTop: '8px',
                                padding: '4px 10px',
                                background: 'rgba(245,158,11,0.12)',
                                border: '1px solid rgba(245,158,11,0.3)',
                                borderRadius: '8px',
                                fontSize: '0.8rem',
                                color: '#d97706',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}>
                                <CloudOff size={13} />
                                {pendingCount} cambio{pendingCount !== 1 ? 's' : ''} por sincronizar
                            </div>
                        )}
                    </div>
                </div>
            ), { duration: Infinity, id: 'network-error' });
        } else {
            // Back online
            toast.dismiss('network-error');

            if (wasOffline) {
                if (isSyncing) {
                    toast.loading('Sincronizando cambios...', { id: 'syncing' });
                } else {
                    toast.success('¡Conexión restaurada!', { id: 'network-restored', duration: 3000 });
                }
                setWasOffline(false);
            }
        }
    }, [isOnline, pendingCount, isSyncing, wasOffline]);

    // Dismiss syncing toast when done
    useEffect(() => {
        if (!isSyncing) {
            toast.dismiss('syncing');
        }
    }, [isSyncing]);

    useEffect(() => {
        const showDbError = () => {
            toast.custom((t) => (
                <div
                    className={`${t.visible ? 'animate-enter' : 'animate-leave'}`}
                    style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        boxShadow: 'var(--shadow-lg)',
                        maxWidth: '400px',
                        width: '90%'
                    }}
                >
                    <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px', padding: '12px', display: 'flex' }}>
                        <ServerCrash size={28} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>Error del servidor</h4>
                        <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            Tuvimos un problema conectando con la base de datos. Por favor intentá de nuevo en unos momentos.
                        </p>
                    </div>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        style={{ padding: '8px', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
            ), { duration: 8000, id: 'db-error' });
        };

        window.addEventListener('supabase-error', showDbError);

        // Patch global toast.error to silence annoying small DB errors when offline
        const originalError = toast.error;
        toast.error = (msg, opts) => {
            if (!navigator.onLine) return;
            if (msg && msg.toLowerCase && msg.toLowerCase().includes('failed to fetch')) return;
            return originalError(msg, opts);
        };

        return () => {
            window.removeEventListener('supabase-error', showDbError);
            toast.error = originalError;
        };
    }, []);

    return null;
}
