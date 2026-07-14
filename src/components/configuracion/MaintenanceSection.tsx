import React from 'react';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '../../contexts/ConfirmContext';
import { clearLocalClients } from '../../lib/offlineManager';
import { Button } from '../ui/Button';
import { HardDrive } from 'lucide-react';

export function MaintenanceSection() {
    const { t } = useTranslation();
    const askConfirm = useConfirm();

    return (
        <section className="config-section">
            <div className="config-section-header">
                <h2>Mantenimiento</h2>
                <p className="config-section-header-desc">Solucionar problemas de sincronización o visualización.</p>
            </div>

            <div className="config-section-body">
                <div className="maintenance-card">
                    <p>
                        Si no ves los últimos cambios o notas que el sistema no se actualiza, podés forzar una limpieza de caché.
                    </p>
                    <Button
                        variant="danger"
                        onClick={async () => {
                            const confirmed = await askConfirm({
                                title: 'Limpiar caché',
                                message: 'Esto limpiará la caché estática del navegador y reiniciará la aplicación. ¿Continuar?',
                                confirmText: 'Limpiar y reiniciar',
                                cancelText: 'Cancelar',
                                variant: 'danger'
                            });
                            if (confirmed) {
                                if ('serviceWorker' in navigator) {
                                    const regs = await navigator.serviceWorker.getRegistrations();
                                    for (let r of regs) await r.unregister();
                                }
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                    >
                        Limpiar Caché y Reiniciar App
                    </Button>
                </div>
                
                <div className="maintenance-card offline-card">
                    <div className="maintenance-card-header">
                        <HardDrive size={18} style={{ color: 'var(--success)' }} />
                        <strong style={{ color: 'var(--success)' }}>Almacenamiento Offline-First Activo</strong>
                    </div>
                    <p>
                        El catálogo y la bóveda de clientes se almacenan en la memoria local de tu dispositivo para cargar al instante sin internet. Si notás lentitud por acumulación de datos o clientes duplicados, podés forzar la re-descarga del servidor.
                    </p>
                    <Button
                        variant="secondary"
                        onClick={async () => {
                            const confirmed = await askConfirm({
                                title: 'Re-sincronizar base de datos',
                                message: '¿Purgar y re-descargar base de datos local? Esto no afectará la nube.',
                                confirmText: 'Re-sincronizar',
                                cancelText: 'Cancelar',
                                variant: 'warning'
                            });
                            if (confirmed) {
                                await clearLocalClients();
                                window.location.reload();
                            }
                        }}
                    >
                        Re-sincronizar Catálogo Offline
                    </Button>
                </div>
                <div className="software-version-desc">
                    Versión de software detectada: <strong>v1.2.5-DEBUG-REFRESH</strong>
                </div>
            </div>
        </section>
    );
}
