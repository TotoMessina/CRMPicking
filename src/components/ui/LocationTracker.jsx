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
    const REPORT_INTERVAL = 30 * 1000; // 30 seconds for testing
    const watchId = useRef(null);

    useEffect(() => {
        if (!user || !navigator.geolocation) return;

        const updateLocation = async (position) => {
            const now = Date.now();
            console.log('Location change detected:', position.coords);
            
            // Only report if enough time has passed (throttle)
            if (now - lastReportedTime.current < REPORT_INTERVAL) {
                console.log('Reporting throttled. Needs to wait:', (REPORT_INTERVAL - (now - lastReportedTime.current)) / 1000, 's');
                return;
            }

            const { latitude: lat, longitude: lng } = position.coords;
            console.log('Reporting location to Supabase...', { lat, lng });

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
                    console.log('✅ Location reported successfully to usuarios table');
                } else {
                    console.error('❌ Error reporting location:', error);
                }
            } catch (err) {
                console.error('❌ Exception in LocationTracker:', err);
            }
        };

        const handleError = (error) => {
            console.error('Geolocation error:', error);
        };

        // Initial check
        navigator.geolocation.getCurrentPosition(updateLocation, handleError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });

        // Start watching position
        watchId.current = navigator.geolocation.watchPosition(
            updateLocation,
            handleError,
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 0
            }
        );

        // Also a periodic check every 30s to force update last_seen even if stationary
        const interval = setInterval(() => {
            navigator.geolocation.getCurrentPosition(updateLocation, handleError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 });
        }, REPORT_INTERVAL);

        return () => {
            if (watchId.current !== null) {
                navigator.geolocation.clearWatch(watchId.current);
            }
            clearInterval(interval);
        };
    }, [user]);

    return null; // This component has no UI
};
