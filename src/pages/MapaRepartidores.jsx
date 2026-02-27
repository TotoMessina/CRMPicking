import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { MapPin, RefreshCw, Navigation, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

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
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const heatLayerRef = useRef(null);

    const [repartidores, setRepartidores] = useState([]);
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

    const fetchRepartidores = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("repartidores")
            .select("id,nombre,telefono,email,direccion,localidad,estado,responsable,lat,lng")
            .not("lat", "is", null)
            .not("lng", "is", null);

        if (error) {
            toast.error("Error al cargar repartidores");
        } else {
            const mapped = (data || []).map(r => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
            setRepartidores(mapped);
        }
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
            () => toast.error("Error al obtener ubicación", { id: 'geo' }),
            { enableHighAccuracy: true }
        );
    };

    const handleRegisterHere = () => {
        if (!myLocation) return toast.error("Primero debés ubicarte");
        setEditingId(null);
        setSelectedLatLng(myLocation);
        setModalOpen(true);
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Mapa de Repartidores</h1>
                    <p className="muted" style={{ margin: 0 }}>Distribución geográfica, cobertura radial (2KM) y mapas de calor.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Button variant="secondary" onClick={handleLocateMe}><Navigation size={16} /> Ubicarme</Button>
                    <Button variant="secondary" onClick={handleRegisterHere} disabled={!myLocation}><MapPin size={16} /> Registrar Aquí</Button>
                    <Button variant="secondary" onClick={fetchRepartidores}><RefreshCw size={16} /> Refrescar</Button>

                    <Button variant={showCoverage ? "primary" : "secondary"} onClick={handleToggleCoverage}>Ver Cobertura</Button>
                    <Button variant={showHeatmap ? "primary" : "secondary"} onClick={handleToggleHeatmap}><Layers size={16} /> Mapa de Calor</Button>
                </div>
            </div>

            <div style={{ flex: 1, width: '100%', minHeight: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', zIndex: 1 }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '600px' }}></div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {ESTADOS.map(est => (
                    <div key={est} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: ESTADO_COLOR[est] }}></div>
                        {est}
                    </div>
                ))}
            </div>

            <RepartidorModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedLatLng(null); }}
                repartidorId={editingId}
                initialLocation={selectedLatLng}
                onSaved={() => { setModalOpen(false); fetchRepartidores(); setSelectedLatLng(null); }}
            />
        </div>
    );
}
