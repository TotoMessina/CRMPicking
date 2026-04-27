import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Users, MapPin, RefreshCw, Navigation, Layers, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Shared Map Components
import { MapControlBar } from '../components/map/MapControlBar';
import { MapStatsBadge } from '../components/map/MapStatsBadge';
import { MapLegend } from '../components/map/MapLegend';

import { ConsumidorModal } from '../components/ui/ConsumidorModal';

const ESTADO_COLOR = {
    "Lead": "#0c0c0c",
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
    const [consumidoresEnZona, setConsumidoresEnZona] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // View modes
    const [showHeatmap, setShowHeatmap] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedLatLng, setSelectedLatLng] = useState(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showLegendMobile, setShowLegendMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const updateVisibleCount = useCallback(() => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        const inView = consumidores.filter(c => {
            const lat = parseFloat(c.lat);
            const lng = parseFloat(c.lng);
            if (isNaN(lat) || isNaN(lng)) return false;
            return bounds.contains(L.latLng(lat, lng));
        }).length;
        setConsumidoresEnZona(inView);
    }, [consumidores]);

    useEffect(() => {
        if (!mapRef.current) return;
        const m = mapRef.current;
        m.on('moveend zoomend', updateVisibleCount);
        updateVisibleCount();
        return () => {
            m.off('moveend zoomend', updateVisibleCount);
        };
    }, [mapRef.current, updateVisibleCount]);

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
        <div className="map-immersive-container">
            
            {/* MAIN MAP VIEW */}
            <div className="map-main-view">
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

                {/* OVERLAY: STATS BADGE */}
                <MapStatsBadge 
                    inView={consumidoresEnZona} 
                    total={totalAbsoluto} 
                    label="en zona" 
                    totalLabel="Total Consumidores" 
                />

                {/* OVERLAY: LEGEND */}
                <MapLegend 
                    title="Estados"
                    items={Object.entries(ESTADO_COLOR).map(([label, color]) => ({ label, color }))}
                    isMobile={isMobile}
                    showMobile={showLegendMobile}
                    onCloseMobile={() => setShowLegendMobile(false)}
                />

                {/* MOBILE LEGEND TOGGLE */}
                {isMobile && !showLegendMobile && (
                    <button 
                        onClick={() => setShowLegendMobile(true)}
                        style={{
                            position: 'absolute', bottom: '100px', left: '20px', zIndex: 1000,
                            background: 'var(--bg-glass)', backdropFilter: 'blur(12px)',
                            padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 600, fontSize: '0.8rem'
                        }}
                    >
                        📋 Ver Leyenda
                    </button>
                )}
            </div>

            {/* BOTTOM CONTROL BAR */}
            <MapControlBar isMobile={isMobile}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: isMobile ? '100%' : '300px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            className="input" 
                            placeholder="Buscar consumidor..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px 8px 32px', fontSize: '0.85rem', borderRadius: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border)' }}
                        />
                    </div>
                </div>

                <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0, margin: '0 8px' }}></div>

                <Button 
                    variant={showHeatmap ? 'primary' : 'secondary'} 
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    style={{ borderRadius: '14px', height: '42px', flexShrink: 0, padding: '0 16px' }}
                >
                    <Layers size={16} /> <span className="hide-mobile">{showHeatmap ? 'Ocultar Calor' : 'Mapa Calor'}</span>
                </Button>

                <Button 
                    variant="secondary" 
                    onClick={fetchConsumidores} 
                    disabled={loading}
                    style={{ borderRadius: '14px', height: '42px', width: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </Button>
            </MapControlBar>

            <ConsumidorModal 
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                consumidorId={editingId}
                initialLatLng={selectedLatLng}
                onSaved={() => { setModalOpen(false); fetchConsumidores(); }}
            />

            <style tabIndex="-1">{`
                .leaflet-popup-content-wrapper { border-radius: 12px; padding: 4px; box-shadow: var(--shadow-lg); }
                .leaflet-popup-tip { box-shadow: var(--shadow-md); }
                .text-accent { color: var(--accent); }
            `}</style>
        </div>
    );
}
