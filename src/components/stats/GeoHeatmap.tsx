import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Fix for default marker icons in Leaflet with React
// (Optional here as we are doing a heatmap, but good for stability)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
});

interface Point {
    lat: number;
    lng: number;
}

interface GeoHeatmapProps {
    points: Point[];
}

const GeoHeatmap: React.FC<GeoHeatmapProps> = ({ points }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const heatLayerRef = useRef<any>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize map if not already done
        if (!mapRef.current) {
            const map = L.map(mapContainerRef.current, {
                center: [-34.6037, -58.3816], // Buenos Aires
                zoom: 11,
                scrollWheelZoom: false,
                dragging: !(L.Browser as any).mobile,
            } as any);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            mapRef.current = map;
        }

        const map = mapRef.current;

        // Update Heatmap Points
        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
        }

        if (points && points.length > 0) {
            const data: [number, number, number][] = points.map(p => [p.lat, p.lng, 1]);
            
            // Adjust map view to fit points if available
            if (points.length > 0) {
                const group = L.featureGroup(points.map(p => L.marker([p.lat, p.lng])));
                map.fitBounds(group.getBounds().pad(0.1));
            }

            heatLayerRef.current = (L as any).heatLayer(data, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
            }).addTo(map);
        }

        // Cleanup on unmount (but we keep the map ref for performance during prop updates)
        return () => {
            // No-op here, full cleanup below
        };
    }, [points]);

    // Full cleanup on true unmount
    useEffect(() => {
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return (
        <div 
            ref={mapContainerRef} 
            style={{ 
                width: '100%', 
                height: '500px', 
                borderRadius: '16px', 
                overflow: 'hidden',
                border: '1px solid var(--border)',
                zIndex: 1
            }} 
        />
    );
};

export default React.memo(GeoHeatmap);
