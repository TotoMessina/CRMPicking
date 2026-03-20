import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

/**
 * LocationTracker: Componente en segundo plano que reporta la ubicación
 * e implementa el Wake Lock API para el "Modo Ruta".
 */
export const LocationTracker = () => {
    const { user } = useAuth();
    const lastReportedTime = useRef(0);
    const watchId = useRef(null);
    const wakeLock = useRef(null);
    const [isRutaActive, setIsRutaActive] = useState(() => {
        return localStorage.getItem('modo-ruta-active') === 'true';
    });

    const REPORT_INTERVAL = isRutaActive ? 15000 : 60000; // 15s en ruta, 60s normal

    // 1. Manejo del Wake Lock (Mantener pantalla encendida)
    const requestWakeLock = async () => {
        if (!('wakeLock' in navigator)) return;
        try {
            wakeLock.current = await navigator.wakeLock.request('screen');
            console.log('🔒 Wake Lock activado: La pantalla no se apagará');
            
            wakeLock.current.addEventListener('release', () => {
                console.log('🔓 Wake Lock liberado');
            });
        } catch (err) {
            console.error(`❌ Error al solicitar Wake Lock: ${err.name}, ${err.message}`);
        }
    };

    const releaseWakeLock = () => {
        if (wakeLock.current) {
            wakeLock.current.release();
            wakeLock.current = null;
        }
    };

    // 2. Escuchar cambios de Modo Ruta desde la UI
    useEffect(() => {
        const handleRutaChange = (e) => {
            const active = e.detail;
            setIsRutaActive(active);
            localStorage.setItem('modo-ruta-active', active);
            if (active) {
                requestWakeLock();
                toast('Modo Ruta Activo: Rastreo Priorizado', { icon: '🚀', style: { borderRadius: '10px', background: '#333', color: '#fff' } });
            } else {
                releaseWakeLock();
                toast('Modo Ruta Desactivado', { icon: '🛑' });
            }
        };

        window.addEventListener('modo-ruta-changed', handleRutaChange);
        
        // Si ya estaba activo al cargar, intentar re-activar wake lock
        if (isRutaActive) requestWakeLock();

        // Re-activar wake lock si la pestaña vuelve a ser visible (requerido por el navegador)
        const handleVisibilityChange = () => {
            if (wakeLock.current !== null && document.visibilityState === 'visible' && isRutaActive) {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('modo-ruta-changed', handleRutaChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [isRutaActive]);

    // 3. Lógica de Geolocalización
    useEffect(() => {
        if (!user || !navigator.geolocation) return;

        const updateLocation = async (position) => {
            const now = Date.now();
            
            // Throttle basado en el modo
            if (now - lastReportedTime.current < REPORT_INTERVAL) return;

            const { latitude: lat, longitude: lng, accuracy } = position.coords;

            try {
                const { error } = await supabase
                    .from('usuarios')
                    .update({
                        lat,
                        lng,
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', user.id);

                if (!error) {
                    lastReportedTime.current = now;
                    console.log(`📍 Ubicación [${isRutaActive ? 'RUTA' : 'NORMAL'}]:`, { lat, lng, acc: accuracy });
                }
            } catch (err) {
                console.error('❌ Exception in LocationTracker:', err);
            }
        };

        const handleError = (error) => {
            console.error('Geolocation error:', error);
            if (error.code === 1) toast.error('Permiso de ubicación denegado');
        };

        // Primera captura
        navigator.geolocation.getCurrentPosition(updateLocation, handleError, { 
            enableHighAccuracy: true, 
            timeout: 10000 
        });

        // Ver vigía
        watchId.current = navigator.geolocation.watchPosition(
            updateLocation,
            handleError,
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }
        );

        // Forzar actualización periódica
        const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(updateLocation, handleError, { 
                enableHighAccuracy: true, 
                timeout: 10000 
            });
        }, REPORT_INTERVAL);

        return () => {
            if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
            clearInterval(interval);
        };
    }, [user, isRutaActive, REPORT_INTERVAL]);

    return null;
};

