import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

/**
 * LocationTracker: A background component that reports the current user's location
 * to the 'usuarios' table in Supabase.
 */
export const LocationTracker = () => {
    const { user } = useAuth();
    const lastReportedTime = useRef(0);
    const REPORT_INTERVAL = 5 * 60 * 1000; // 5 minutes in ms
    const watchId = useRef(null);

    useEffect(() => {
        if (!user || !navigator.geolocation) return;

        const updateLocation = async (position) => {
            const now = Date.now();
            
            // Only report if enough time has passed (throttle)
            if (now - lastReportedTime.current < REPORT_INTERVAL) return;

            const { latitude: lat, longitude: lng } = position.coords;

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
                    console.log('Location reported:', { lat, lng });
                }
            } catch (err) {
                console.error('Error reporting location:', err);
            }
        };

        const handleError = (error) => {
            console.error('Geolocation error:', error);
        };

        // Start watching position
        watchId.current = navigator.geolocation.watchPosition(
            updateLocation,
            handleError,
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 60000
            }
        );

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
        };
    }, [user]);

    return null; // This component has no UI
};
