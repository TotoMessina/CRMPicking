import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Users, MapPin, RefreshCw, Navigation, Layers, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

import { ConsumidorModal } from '../components/ui/ConsumidorModal';

const ESTADO_COLOR = {
    "Lead": "#6366f1",
    "Contactado": "#3b82f6",
    "Interesado": "#f59e0b",
    "Cliente": "#10b981",
    "No interesado": "#ef4444"
};

export default function MapaConsumidores() {
    const { empresaActiva } = useAuth();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const heatLayerRef = useRef(null);

    const [consumidores, setConsumidores] = useState([]);
    const [totalAbsoluto, setTotalAbsoluto] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // View modes
    const [showHeatmap, setShowHeatmap] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedLatLng, setSelectedLatLng] = useState(null);

    const fetchConsumidores = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        
        // 1. Fetch total count (absolute)
        const { count: absTotal } = await supabase
            .from("consumidores")
            .select('*', { count: 'exact', head: true })
            .eq("empresa_id", empresaActiva.id)
            .eq("activo", true);
        
        setTotalAbsoluto(absTotal || 0);

        // 2. Fetch those with coordinates for the map
        const { data, error } = await supabase
            .from("consumidores")
            .select("id,nombre,telefono,mail,localidad,estado,lat,lng")
            .eq("empresa_id", empresaActiva.id)
            .eq("activo", true)
            .not("lat", "is", null)
            .not("lng", "is", null);

        if (error) {
            toast.error("Error al cargar consumidores");
        } else {
            const mapped = (data || []).map(r => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
            setConsumidores(mapped);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchConsumidores();
    }, [empresaActiva]);

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

            m.on('click', (e) => {
                setEditingId(null);
                setSelectedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
                setModalOpen(true);
            });

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

    // Update markers
    useEffect(() => {
        if (!mapRef.current || !markersLayerRef.current) return;
        markersLayerRef.current.clearLayers();

        const filtered = consumidores.filter(c => 
            c.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.localidad?.toLowerCase().includes(searchQuery.toLowerCase())
        );

        filtered.forEach(c => {
            const color = ESTADO_COLOR[c.estado] || "#94a3b8";
            const marker = L.circleMarker([c.lat, c.lng], {
                radius: 8,
                fillColor: color,
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            });

            marker.bindPopup(`
                <div style="font-family: inherit; min-width: 150px;">
                    <strong style="display:block; font-size:1.1rem; margin-bottom:4px;">${c.nombre}</strong>
                    <div style="font-size:0.85rem; color:#64748b; margin-bottom:8px;">${c.localidad || 'Sin localidad'}</div>
                    <span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:700; background:${color}22; color:${color}; border:1px solid ${color}44;">
                        ${c.estado}
                    </span>
                    <hr style="margin:10px 0; border:0; border-top:1px solid #e2e8f0;"/>
                    <button id="edit-${c.id}" style="width:100%; padding:6px; border-radius:6px; border:1px solid #e2e8f0; background:#f8fafc; cursor:pointer; font-size:0.8rem; font-weight:600;">Editar Consumidor</button>
                </div>
            `);

            marker.on('popupopen', () => {
                const btn = document.getElementById(`edit-${c.id}`);
                if (btn) {
                    btn.onclick = () => {
                        setEditingId(c.id);
                        setSelectedLatLng(null);
                        setModalOpen(true);
                    };
                }
            });

            marker.addTo(markersLayerRef.current);
        });

        // Heatmap
        if (showHeatmap && L.heatLayer) {
            if (heatLayerRef.current) mapRef.current.removeLayer(heatLayerRef.current);
            const intensity = filtered.length > 500 ? 0.3 : 0.6;
            heatLayerRef.current = L.heatLayer(filtered.map(c => [c.lat, c.lng, intensity]), {
                radius: 25,
                blur: 15,
                maxZoom: 17
            }).addTo(mapRef.current);
        } else {
            if (heatLayerRef.current) {
                mapRef.current.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
        }

        // Fit bounds if markers exist
        if (filtered.length > 0 && searchQuery) {
            const group = L.featureGroup(markersLayerRef.current.getLayers());
            mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }, [consumidores, searchQuery, showHeatmap]);

    return (
        <div className="page-container" style={{ padding: 0, height: 'calc(100vh - 64px)', position: 'relative', overflow: 'hidden' }}>
            
            {/* Header Flotante */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto', display: 'flex', gap: '10px' }}>
                    <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', minWidth: '300px' }}>
                        <Users size={20} className="text-accent" />
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Mapa de Consumidores</h2>
                            <div style={{ position: 'relative', marginTop: '6px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    className="input" 
                                    placeholder="Buscar por nombre o localidad..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{ width: '100%', padding: '6px 12px 6px 32px', fontSize: '0.85rem', borderRadius: '8px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ pointerEvents: 'auto', display: 'flex', gap: '10px' }}>
                    <Button variant={showHeatmap ? 'primary' : 'secondary'} size="sm" onClick={() => setShowHeatmap(!showHeatmap)}>
                        <Layers size={16} /> <span className="hide-mobile">{showHeatmap ? 'Ocultar Calor' : 'Mapa de Calor'}</span>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={fetchConsumidores} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* TOTAL BADGE */}
            <div className="map-stats-badge">
                <div className="map-stats-dot"></div>
                <span>Total: {totalAbsoluto} Consumidores</span>
            </div>

            {/* Mapa Container */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }}></div>

            <ConsumidorModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                consumidorId={editingId}
                initialLatLng={selectedLatLng}
                onSaved={() => { setModalOpen(false); fetchConsumidores(); }}
            />

            <style>{`
                .leaflet-popup-content-wrapper { border-radius: 12px; padding: 4px; box-shadow: var(--shadow-lg); }
                .leaflet-popup-tip { box-shadow: var(--shadow-md); }
                .text-accent { color: var(--accent); }
            `}</style>
        </div>
    );
}
