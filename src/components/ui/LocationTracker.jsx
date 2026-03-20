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
    const [isRutaActive, setIsRutaActive] = useState(() => {
        return localStorage.getItem('modo-ruta-active') === 'true';
    });

    const REPORT_INTERVAL = isRutaActive ? 15000 : 60000;

    // 2. Escuchar cambios de Modo Ruta desde la UI (solo para frecuencia de GPS)
    useEffect(() => {
        const handleRutaChange = (e) => {
            setIsRutaActive(e.detail);
            localStorage.setItem('modo-ruta-active', e.detail);
        };

        window.addEventListener('modo-ruta-changed', handleRutaChange);
        
        return () => {
            window.removeEventListener('modo-ruta-changed', handleRutaChange);
        };
    }, []);

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

