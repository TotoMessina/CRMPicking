import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';

/**
 * Listens for new Service Worker updates and shows a toast banner.
 * When the user clicks "Actualizar", it tells the SW to skipWaiting
 * and reloads the page to get the new version.
 */
export function UpdateNotifier() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            // Poll for updates every 60 seconds when the app is open
            if (r) {
                setInterval(() => r.update(), 60 * 1000);
            }
        },
        onRegisterError(error) {
            console.error('SW registration error:', error);
        },
    });

    useEffect(() => {
        if (!needRefresh) return;

        toast(
            (t) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔄</span>
                    <div>
                        <div style={{ fontWeight: 700, marginBottom: '2px' }}>Nueva versión disponible</div>
                        <div style={{ fontSize: '0.83rem', color: 'var(--text-muted, #888)' }}>
                            Actualizá para ver los últimos cambios.
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            setNeedRefresh(false);
                            updateServiceWorker(true);
                        }}
                        style={{
                            background: 'var(--accent, #0c0c0c)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Actualizar
                    </button>
                </div>
            ),
            {
                duration: Infinity,
                position: 'bottom-center',
                style: { maxWidth: '480px' },
            }
        );
    }, [needRefresh]);

    return null;
}
