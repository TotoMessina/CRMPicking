import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { WifiOff, ServerCrash } from 'lucide-react';

export function NetworkStatusHandler() {
    useEffect(() => {
        const showOffline = () => {
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
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>Sin conexión a Internet</h4>
                        <p style={{ margin: '6px 0 0', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                            Revisá tu conexión Wi-Fi o datos móviles. Los cambios no se guardarán hasta que vuelvas a estar online.
                        </p>
                    </div>
                </div>
            ), { duration: Infinity, id: 'network-error' });
        };

        const showOnline = () => {
            toast.dismiss('network-error');
            toast.success('¡Conexión restaurada!', { id: 'network-restored' });
        };

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

        window.addEventListener('offline', showOffline);
        window.addEventListener('online', showOnline);
        window.addEventListener('supabase-error', showDbError);

        if (!navigator.onLine) showOffline();

        // Patch global toast.error to silence annoying small DB errors when we are showing the big offline UI
        const originalError = toast.error;
        toast.error = (msg, opts) => {
            if (!navigator.onLine) return; // Completely silence if offline
            if (msg && msg.toLowerCase && msg.toLowerCase().includes('failed to fetch')) return; // Silence if it's the raw network error
            return originalError(msg, opts);
        };

        return () => {
            window.removeEventListener('offline', showOffline);
            window.removeEventListener('online', showOnline);
            window.removeEventListener('supabase-error', showDbError);
            toast.error = originalError; // Restore
        };
    }, []);

    return null; // This is a headless component for the notification layer
}
