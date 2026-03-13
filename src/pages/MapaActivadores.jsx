import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { MapPin, RefreshCw, Navigation, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';

/**
 * Helper to calculate time ago in a human readable way
 */
const timeSince = (date) => {
    if (!date) return 'Nunca';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " años";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " meses";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " días";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " horas";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min";
    return Math.floor(seconds) + " seg";
};

export default function MapaActivadores() {
    const { empresaActiva } = useAuth();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);

    const [activadores, setActivadores] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchActivadores = async () => {
        setLoading(true);
        // We fetch users who have a role related to "activador" 
        // OR simply all active users if that's what the user wants.
        // The request says "el activador que esta en usuarios".
        const { data, error } = await supabase
            .from("usuarios")
            .select("id, nombre, email, role, lat, lng, last_seen, avatar_emoji")
            .not("lat", "is", null)
            .not("lng", "is", null)
            .eq("activo", true);

        if (error) {
            toast.error("Error al cargar activadores");
        } else {
            // Filter by activador roles specifically if needed, 
            // but let's show all active users with location for now.
            const filtered = (data || []).filter(u => 
                u.role?.toLowerCase().includes('activador') || 
                u.role?.toLowerCase().includes('admin')
            );
            setActivadores(filtered);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchActivadores();
        
        // Auto-refresh every minute
        const interval = setInterval(fetchActivadores, 60000);
        return () => clearInterval(interval);
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (!mapRef.current) {
            const m = L.map(mapContainerRef.current).setView([-34.62, -58.44], 12);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "© OpenStreetMap",
            }).addTo(m);

            markersLayerRef.current = L.layerGroup().addTo(m);

            setTimeout(() => {
                m.invalidateSize();
            }, 250);

            mapRef.current = m;
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Render Markers
    useEffect(() => {
        if (!mapRef.current || !markersLayerRef.current) return;
        const layer = markersLayerRef.current;
        layer.clearLayers();

        activadores.forEach(user => {
            const emoji = user.avatar_emoji || '📍';
            
            const iconHtml = `
                <div style="
                    font-size: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 0 4px rgba(0,0,0,0.4));
                    cursor: pointer;
                ">
                    ${emoji}
                </div>
            `;

            const icon = L.divIcon({ className: "", html: iconHtml, iconSize: [30, 30], iconAnchor: [15, 15] });

            const marker = L.marker([user.lat, user.lng], { icon, title: user.nombre }).addTo(layer);

            marker.bindPopup(`
                <div style="min-width:200px; padding: 5px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 20px;">${emoji}</span>
                        <div style="font-weight:700; font-size: 1.1em;">${user.nombre}</div>
                    </div>
                    <div style="font-size:0.85rem; color: var(--text-muted); margin-bottom: 12px;">
                        Rol: <span class="badge" style="background: var(--bg-body); text-transform: capitalize;">${user.role}</span>
                    </div>
                    <div style="background: var(--bg-body); padding: 8px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem;">
                        <div style="display: flex; align-items: center; gap: 6px; color: var(--text);">
                            <Clock size={14} style={{ color: 'var(--accent)' }} /> 
                            <span>Visto hace: <b>${timeSince(user.last_seen)}</b></span>
                        </div>
                        <div style="margin-top: 4px; color: var(--text-muted); font-size: 0.75rem;">
                            Actualizado: ${new Date(user.last_seen).toLocaleTimeString()}
                        </div>
                    </div>
                    <div style="margin-top: 10px; font-size: 0.8rem; color: var(--text-muted);">
                        📧 ${user.email}
                    </div>
                </div>
            `);
        });
    }, [activadores]);

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Mapa de Activadores</h1>
                    <p className="muted" style={{ margin: 0 }}>Ubicación en tiempo real del equipo de campo.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Button variant="secondary" onClick={fetchActivadores} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refrescar
                    </Button>
                </div>
            </header>

            <div style={{ flex: 1, width: '100%', minHeight: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', zIndex: 1 }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '600px' }}></div>
            </div>

            <footer style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></span>
                    {activadores.length} Activadores activos en el mapa
                </div>
                <div style={{ marginLeft: 'auto' }}>
                    Se actualiza automáticamente cada 1 minuto.
                </div>
            </footer>
        </div>
    );
}
