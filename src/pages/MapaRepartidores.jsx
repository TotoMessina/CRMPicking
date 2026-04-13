import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { MapPin, RefreshCw, Navigation, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Shared Map Components
import { MapControlBar } from '../components/map/MapControlBar';
import { MapStatsBadge } from '../components/map/MapStatsBadge';
import { MapLegend } from '../components/map/MapLegend';

import { RepartidorModal } from '../components/ui/RepartidorModal';

const ESTADOS = [
    "Documentación sin gestionar",
    "Cuenta aun no confirmada",
    "Cuenta confirmada y repartiendo"
];

const ESTADO_COLOR = {
    "Documentación sin gestionar": "#ef4444",
    "Cuenta aun no confirmada": "#f97316",
    "Cuenta confirmada y repartiendo": "#22c55e"
};

export default function MapaRepartidores() {
    const { empresaActiva } = useAuth();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const heatLayerRef = useRef(null);

    const [repartidores, setRepartidores] = useState([]);
    const [totalAbsoluto, setTotalAbsoluto] = useState(0);
    const [repartidoresEnZona, setRepartidoresEnZona] = useState(0);
    const [loading, setLoading] = useState(true);

    // View modes
    const [showCoverage, setShowCoverage] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedLatLng, setSelectedLatLng] = useState(null);

    // Geolocation
    const [myLocation, setMyLocation] = useState(null);
    const myMarkerRef = useRef(null);
    const myCircleRef = useRef(null);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showLegendMobile, setShowLegendMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchRepartidores = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from("repartidores")
            .select("id,nombre,telefono,email,direccion,localidad,estado,responsable,lat,lng")
            .eq("empresa_id", empresaActiva.id)
            .not("lat", "is", null)
            .not("lng", "is", null);

        if (error) {
            toast.error("Error al cargar repartidores");
        } else {
            const mapped = (data || []).map(r => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
            setRepartidores(mapped);
        }

        // Fetch absolute total
        const { count } = await supabase
            .from("repartidores")
            .select("*", { count: 'exact', head: true })
            .eq("empresa_id", empresaActiva.id);
        setTotalAbsoluto(count || 0);

        setLoading(false);
    };

    useEffect(() => {
        fetchRepartidores();
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
        const inView = repartidores.filter(r => {
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lng);
            if (isNaN(lat) || isNaN(lng)) return false;
            return bounds.contains(L.latLng(lat, lng));
        }).length;
        setRepartidoresEnZona(inView);
    }, [repartidores]);

    useEffect(() => {
        if (!mapRef.current) return;
        const m = mapRef.current;
        m.on('moveend zoomend', updateVisibleCount);
        updateVisibleCount();
        return () => {
            m.off('moveend zoomend', updateVisibleCount);
        };
    }, [mapRef.current, updateVisibleCount]);

    // Resolve dependencies for Heatmap & Coverage toggling
    const handleToggleCoverage = () => {
        if (showHeatmap) setShowHeatmap(false);
        setShowCoverage(!showCoverage);
    };

    const handleToggleHeatmap = () => {
        if (showCoverage) setShowCoverage(false);
        setShowHeatmap(!showHeatmap);
    };

    // Render Markers whenever data or flags change
    useEffect(() => {
        if (!mapRef.current || !markersLayerRef.current) return;
        const layer = markersLayerRef.current;
        layer.clearLayers();

        if (heatLayerRef.current) {
            mapRef.current.removeLayer(heatLayerRef.current);
            heatLayerRef.current = null;
        }

        if (showHeatmap) {
            const points = repartidores
                .filter(r => r.estado !== "Cuenta aun no confirmada")
                .map(r => [r.lat, r.lng, 1]);

            if (points.length) {
                // Leaflet heat requires L.heatLayer which we rely on being attached to L
                if (L.heatLayer) {
                    heatLayerRef.current = L.heatLayer(points, {
                        radius: 25,
                        blur: 15,
                        maxZoom: 14,
                        gradient: { 0.4: 'blue', 0.65: 'lime', 1: 'red' }
                    }).addTo(mapRef.current);
                } else {
                    console.error("leaflet.heat not loaded on L");
                    toast.error("No se pudo cargar el mapa de calor");
                }
            }
            return;
        }

        repartidores.forEach(rec => {
            let color = ESTADO_COLOR[rec.estado] || "#94a3b8";

            const iconHtml = `
                <div style="
                    width: 14px; 
                    height: 14px; 
                    border-radius: 50%; 
                    background: ${color}; 
                    border: 2px solid #fff;
                    box-shadow: 0 0 4px rgba(0,0,0,0.4);
                "></div>
            `;

            const icon = L.divIcon({ className: "", html: iconHtml, iconSize: [14, 14], iconAnchor: [7, 7] });

            const marker = L.marker([rec.lat, rec.lng], { icon, title: rec.nombre }).addTo(layer);

            marker.bindPopup(`
                <div style="min-width:200px">
                    <div style="font-weight:700; margin-bottom:6px;">${rec.nombre}</div>
                    <div class="muted" style="font-size:0.85rem">${rec.estado}</div>
                    <div style="margin:6px 0; font-size:0.9rem;">
                       <div>📞 ${rec.telefono || "-"}</div>
                       <div>🏠 ${rec.direccion || "-"}</div>
                    </div>
                    <div>Resp: <b>${rec.responsable}</b></div>
                    <button class="btn-popup-edit" style="margin-top: 10px; width: 100%; padding: 6px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Editar Repartidor</button>
                </div>
            `);

            marker.on('popupopen', (e) => {
                const btn = e.popup.getElement().querySelector('.btn-popup-edit');
                if (btn) {
                    btn.onclick = () => {
                        setEditingId(rec.id);
                        setSelectedLatLng(null);
                        setModalOpen(true);
                        marker.closePopup();
                    };
                }
            });

            if (showCoverage && rec.estado !== "Cuenta aun no confirmada") {
                L.circle([rec.lat, rec.lng], {
                    radius: 2000, // 2km
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.08,
                    weight: 1,
                    opacity: 0.15,
                    interactive: false
                }).addTo(layer);
            }
        });
    }, [repartidores, showCoverage, showHeatmap]);

    const handleLocateMe = () => {
        if (!navigator.geolocation) return toast.error("Geolocalización no soportada");

        toast.loading("Buscando ubicación...", { id: 'geo' });
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                toast.success("Ubicación encontrada", { id: 'geo' });
                const latlng = [pos.coords.latitude, pos.coords.longitude];
                setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });

                if (mapRef.current) {
                    if (!myMarkerRef.current) {
                        myMarkerRef.current = L.marker(latlng, { title: "Mi ubicación" }).addTo(mapRef.current);
                        myCircleRef.current = L.circle(latlng, { radius: Math.max(pos.coords.accuracy, 20), opacity: 0.5 }).addTo(mapRef.current);
                    } else {
                        myMarkerRef.current.setLatLng(latlng);
                        myCircleRef.current.setLatLng(latlng);
                        myCircleRef.current.setRadius(Math.max(pos.coords.accuracy, 20));
                    }
                    mapRef.current.setView(latlng, 15);
                }
            },
            (err) => {
                console.error("Geo error:", err);
                let msg = "Error al obtener ubicación";
                if (err.code === 1) msg = "Permiso de ubicación denegado";
                else if (err.code === 2) msg = "Posición no disponible (activar GPS)";
                else if (err.code === 3) msg = "Tiempo de espera agotado";
                toast.error(msg, { id: 'geo' });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
    };

    const handleRegisterHere = () => {
        if (!myLocation) return toast.error("Primero debés ubicarte");
        setEditingId(null);
        setSelectedLatLng(myLocation);
        setModalOpen(true);
    };

    return (
        <div className="map-immersive-container">
            
            {/* MAIN MAP VIEW */}
            <div className="map-main-view">
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

                {/* OVERLAY: STATS BADGE */}
                <MapStatsBadge 
                    inView={repartidoresEnZona} 
                    total={totalAbsoluto} 
                    label="en zona" 
                    totalLabel="Total Repartidores" 
                />

                {/* OVERLAY: LEGEND */}
                <MapLegend 
                    title="Estados"
                    items={ESTADOS.map(est => ({ label: est, color: ESTADO_COLOR[est] }))}
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
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <Button variant="secondary" onClick={handleLocateMe} style={{ borderRadius: '12px', height: '42px', padding: '0 15px' }}>
                        <Navigation size={16} /> <span className="hide-mobile">Ubicarme</span>
                    </Button>
                    <Button variant="secondary" onClick={handleRegisterHere} disabled={!myLocation} style={{ borderRadius: '12px', height: '42px', padding: '0 15px' }}>
                        <MapPin size={16} /> <span className="hide-mobile">Registrar Aquí</span>
                    </Button>
                    <Button variant="secondary" onClick={fetchRepartidores} disabled={loading} style={{ borderRadius: '12px', height: '42px', width: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>

                <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0, margin: '0 8px' }}></div>

                <Button 
                    variant={showCoverage ? "primary" : "secondary"} 
                    onClick={handleToggleCoverage}
                    style={{ borderRadius: '14px', height: '42px', flexShrink: 0, padding: '0 16px' }}
                >
                    📍 Cobertura
                </Button>
                
                <Button 
                    variant={showHeatmap ? "primary" : "secondary"} 
                    onClick={handleToggleHeatmap}
                    style={{ borderRadius: '14px', height: '42px', flexShrink: 0, padding: '0 16px' }}
                >
                    <Layers size={16} /> <span className="hide-mobile">Calor</span>
                </Button>
            </MapControlBar>

            <RepartidorModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedLatLng(null); }}
                repartidorId={editingId}
                initialLocation={selectedLatLng}
                onSaved={() => { setModalOpen(false); fetchRepartidores(); setSelectedLatLng(null); }}
            />
            
            <style tabIndex="-1">{`
                .leaflet-popup-content-wrapper { border-radius: 12px; padding: 4px; box-shadow: var(--shadow-lg); }
                .leaflet-popup-tip { box-shadow: var(--shadow-md); }
            `}</style>
        </div>
    );
}
