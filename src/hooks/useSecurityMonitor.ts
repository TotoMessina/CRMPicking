import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { securityService } from '../lib/securityService';
import { useLocation } from 'react-router-dom';

/**
 * useSecurityMonitor
 * Hook global para detectar comportamientos sospechosos (capturas, devtools, etc.)
 */
export function useSecurityMonitor() {
    const { user, empresaActiva } = useAuth();
    const location = useLocation();
    const suspiciousCount = useRef(0);
    const lastAlertTime = useRef(0);

    useEffect(() => {
        if (!user) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Teclas de captura de pantalla (PrintScreen)
            if (e.key === 'PrintScreen' || e.key === 'PrtSc' || e.keyCode === 44) {
                logSuspicious('print_screen_attempt', { page: location.pathname });
            }

            // Atajos de DevTools (que suelen usarse para inspeccionar datos masivamente)
            if ((e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || e.key === 'F12') {
                // No bloqueamos, pero registramos si es repetitivo en páginas de datos
                if (location.pathname.includes('clientes') || location.pathname.includes('estadisticas')) {
                    suspiciousCount.current++;
                    if (suspiciousCount.current > 3) {
                        logSuspicious('devtools_heavy_use', { count: suspiciousCount.current, page: location.pathname });
                    }
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // Si el usuario cambia de pestaña muy rápido mientras está en la lista de clientes, 
                // podría estar haciendo capturas externas o copiando datos.
                // Esta es una heurística muy suave.
            }
        };

        const logSuspicious = (type: string, details: any) => {
            const now = Date.now();
            // Evitar spam de logs (máximo uno cada 5 segundos)
            if (now - lastAlertTime.current > 5000) {
                lastAlertTime.current = now;
                securityService.logAction(
                    user.email!, 
                    empresaActiva?.id, 
                    'suspicious_activity', 
                    { ...details, type },
                    'medio'
                );
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [user, empresaActiva, location.pathname]);
}
