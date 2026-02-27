import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { MapPin, RefreshCw, Route as RouteIcon, Navigation, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

import { ClienteModal } from '../components/ui/ClienteModal';

const ZONE_COLORS = {
    today: "#3b82f6",
    done: "#ef4444",
    extra: "#f97316"
};

const ESTADOS = [
    "1 - Cliente relevado",
    "2 - Local Visitado No Activo",
    "3 - Primer Ingreso",
    "4 - Local Creado",
    "5 - Local Visitado Activo",
    "6 - Local No Interesado",
];

const ESTADO_COLOR = {
    "1 - Cliente relevado": "#ff3d3d",
    "2 - Local Visitado No Activo": "#ff9f1c",
    "3 - Primer Ingreso": "#ffef16",
    "4 - Local Creado": "#7700ff",
    "5 - Local Visitado Activo": "#22ff34",
    "6 - Local No Interesado": "#5f5f5f",
};

const INTERES_COLORS = {
    "Bajo": "#22c55e",
    "Medio": "#eab308",
    "Alto": "#ef4444",
    "Sin interés": "#94a3b8"
};

const ESTILO_COLORS = {
    "Dueño": "#3b82f6",
    "Empleado": "#eab308",
    "Cerrado": "#9ca3af",
    "Sin definir": "#64748b"
};

const CREATOR_COLORS = {};
function getColorForCreator(user) {
    const key = (user || "Desconocido").trim();
    if (!key) return "#94a3b8";
    if (CREATOR_COLORS[key]) return CREATOR_COLORS[key];
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
        hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    const hex = "#" + "00000".substring(0, 6 - c.length) + c;
    CREATOR_COLORS[key] = hex;
    return hex;
}

export default function MapaClientes() {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const drawnZonesRef = useRef(null);

    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showZones, setShowZones] = useState(true);
    const [zoneType, setZoneType] = useState('today');

    // Filters & Coloring
    const [colorMode, setColorMode] = useState('estado'); // estado, creador, interes, estilo
    const [activeFilters, setActiveFilters] = useState(new Set());

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedLatLng, setSelectedLatLng] = useState(null);

    // Geolocation
    const [myLocation, setMyLocation] = useState(null);
    const myMarkerRef = useRef(null);
    const myCircleRef = useRef(null);

    // Routing Mode
    const [isRoutingMode, setIsRoutingMode] = useState(false);
    const [routeStops, setRouteStops] = useState([]);
    const routingControlRef = useRef(null);

    const fetchClientes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("clientes")
            .select("id,nombre,nombre_local,estado,lat,lng,creado_por,rubro,direccion,telefono,interes,estilo_contacto")
            .eq("activo", true)
            .not("lat", "is", null)
            .not("lng", "is", null);

        if (error) {
            toast.error("Error al cargar clientes");
        } else {
            const mapped = (data || []).map(r => ({ ...r, lat: Number(r.lat), lng: Number(r.lng) })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
            setClientes(mapped);
        }
        setLoading(false);
    };

    const bindZonePopup = (layer, zoneId) => {
        const popupContent = `
            <div style="margin-bottom:8px; font-weight:bold;">Zona</div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="btn-popup-local" style="color:#0284c7; border:1px solid #0284c7; padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; background: white;" onclick="window.updateZoneColor('${zoneId}', '#3b82f6')">🔵 Marcar "Hoy"</button>
                <button class="btn-popup-local" style="color:#dc2626; border:1px solid #dc2626; padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; background: white;" onclick="window.updateZoneColor('${zoneId}', '#ef4444')">🔴 Marcar "Realizada"</button>
                <button class="btn-popup-local" style="color:#ea580c; border:1px solid #ea580c; padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; background: white;" onclick="window.updateZoneColor('${zoneId}', '#f97316')">🟠 Marcar "Extra"</button>
                <hr style="width:100%; border:0; border-top:1px solid #eee; margin:4px 0;">
                <button class="btn-popup-local" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer;" onclick="window.deleteZoneById('${zoneId}')">🗑️ Eliminar</button>
            </div>
        `;
        layer.bindPopup(popupContent);
    };

    const loadZonas = async () => {
        if (!drawnZonesRef.current) return;
        drawnZonesRef.current.clearLayers();
        if (!showZones) return;

        const { data, error } = await supabase.from('zones').select('*');
        if (error) {
            console.error("Error cargando zonas:", error);
            return;
        }

        data.forEach(zone => {
            if (!zone.coordinates) return;
            const polygon = L.polygon(zone.coordinates, {
                color: zone.color || '#ef4444',
                fillOpacity: 0.2, // Ligther opacity for clients map
                weight: 2,
                bubblingMouseEvents: false
            });
            polygon.zoneId = zone.id;
            bindZonePopup(polygon, zone.id);
            drawnZonesRef.current.addLayer(polygon);
        });
    };

    // Global popup handlers
    useEffect(() => {
        window.updateZoneColor = async (id, newColor) => {
            const { error } = await supabase.from('zones').update({ color: newColor }).eq('id', id);
            if (error) {
                toast.error("Error al actualizar color");
            } else {
                if (drawnZonesRef.current) {
                    drawnZonesRef.current.eachLayer(layer => {
                        if (layer.zoneId === id) {
                            layer.setStyle({ color: newColor });
                            layer.closePopup();
                        }
                    });
                }
                toast.success("Color actualizado");
            }
        };

        window.deleteZoneById = async (id) => {
            if (!window.confirm("¿Eliminar esta zona?")) return;
            const { error } = await supabase.from('zones').delete().eq('id', id);
            if (error) {
                toast.error("Error al eliminar zona");
            } else {
                if (drawnZonesRef.current) {
                    drawnZonesRef.current.eachLayer(layer => {
                        if (layer.zoneId === id) {
                            drawnZonesRef.current.removeLayer(layer);
                        }
                    });
                }
                toast.success("Zona eliminada");
            }
        };

        return () => {
            delete window.updateZoneColor;
            delete window.deleteZoneById;
        };
    }, []);

    useEffect(() => {
        fetchClientes();
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
            drawnZonesRef.current = new L.FeatureGroup().addTo(m);

            m.isDrawing = false;
            m.on(L.Draw.Event.DRAWSTART, () => { m.isDrawing = true; });
            m.on(L.Draw.Event.DRAWSTOP, () => { setTimeout(() => { m.isDrawing = false; }, 100); });
            m.on(L.Draw.Event.EDITSTART, () => { m.isDrawing = true; });
            m.on(L.Draw.Event.EDITSTOP, () => { setTimeout(() => { m.isDrawing = false; }, 100); });
            m.on(L.Draw.Event.DELETESTART, () => { m.isDrawing = true; });
            m.on(L.Draw.Event.DELETESTOP, () => { setTimeout(() => { m.isDrawing = false; }, 100); });

            m.on('click', (e) => {
                if (m.isDrawing) return;

                // Prevent 'Nuevo Cliente' modal if we clicked an existing SVG path (e.g. a zone or polyline)
                if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.tagName && e.originalEvent.target.tagName.toLowerCase() === 'path') {
                    return;
                }

                setEditingId(null);
                setSelectedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
                setModalOpen(true);
            });

            // Draw Control setup
            const drawControl = new L.Control.Draw({
                position: 'topright',
                draw: {
                    polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: ZONE_COLORS.today, fillOpacity: 0.2, bubblingMouseEvents: false } },
                    rectangle: { shapeOptions: { color: ZONE_COLORS.today, fillOpacity: 0.2, bubblingMouseEvents: false } },
                    polyline: false, circle: false, marker: false, circlemarker: false
                },
                edit: {
                    featureGroup: drawnZonesRef.current,
                    remove: true,
                    edit: false
                }
            });

            m.addControl(drawControl);

            m.on(L.Draw.Event.CREATED, async function (e) {
                const layer = e.layer;
                const selectElement = document.getElementById("zoneSelectorInputClientes");
                const currentZone = selectElement ? selectElement.value : 'today';
                const color = ZONE_COLORS[currentZone] || ZONE_COLORS.today;

                layer.setStyle({ color: color, fillOpacity: 0.2 });
                drawnZonesRef.current.addLayer(layer);

                const shape = layer.toGeoJSON();
                const coords = shape.geometry.coordinates[0].map(p => ({ lat: p[1], lng: p[0] }));

                if (!coords || coords.length < 3) return;

                toast.loading("Guardando zona...", { id: 'save-zone' });
                const { data, error } = await supabase.from('zones').insert([{
                    coordinates: coords,
                    color: color,
                    scope: 'kiosco_map'
                }]).select();

                if (error) {
                    toast.error("Error al guardar la zona", { id: 'save-zone' });
                    drawnZonesRef.current.removeLayer(layer);
                } else {
                    const newId = data[0].id;
                    layer.zoneId = newId;
                    bindZonePopup(layer, newId);
                    toast.success("Zona guardada", { id: 'save-zone' });
                }
            });

            m.on(L.Draw.Event.DELETED, async function (e) {
                const layers = e.layers;
                layers.eachLayer(async function (layer) {
                    if (layer.zoneId) {
                        const { error } = await supabase.from('zones').delete().eq('id', layer.zoneId);
                        if (error) toast.error("Error eliminando zona");
                    }
                });
            });

            // Fix for blank map issue on initial load
            setTimeout(() => {
                m.invalidateSize();
                loadZonas();
            }, 250);

            mapRef.current = m;
        }

        return () => {
            // Cleanup Leaflet on unmount
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Reload zones when toggle changes
    useEffect(() => {
        loadZonas();
    }, [showZones]);

    // Render Markers whenever data or filters change
    useEffect(() => {
        if (!mapRef.current || !markersLayerRef.current) return;
        const layer = markersLayerRef.current;
        layer.clearLayers();

        const hasFilters = activeFilters.size > 0;

        clientes.forEach(rec => {
            // Apply filtering
            if (hasFilters) {
                if (colorMode === "creador" && !activeFilters.has((rec.creado_por || "Desconocido").trim())) return;
                else if (colorMode === "interes" && !activeFilters.has(rec.interes || "Bajo")) return;
                else if (colorMode === "estilo" && !activeFilters.has(rec.estilo_contacto || "Sin definir")) return;
                else if (colorMode === "estado" && !activeFilters.has(rec.estado)) return;
            }

            // Determine Color
            let color = "#94a3b8";
            if (colorMode === "creador") color = getColorForCreator(rec.creado_por);
            else if (colorMode === "interes") color = INTERES_COLORS[rec.interes || "Bajo"] || INTERES_COLORS["Sin interés"];
            else if (colorMode === "estilo") color = ESTILO_COLORS[rec.estilo_contacto || "Sin definir"] || ESTILO_COLORS["Sin definir"];
            else color = ESTADO_COLOR[rec.estado] || "#94a3b8";

            // Marker interaction
            const isSelectedForRouting = routeStops.some(s => s.id === rec.id);

            const iconHtml = `
                <div style="
                    width: 14px; 
                    height: 14px; 
                    border-radius: 50%; 
                    background: ${color}; 
                    border: 2px solid ${isSelectedForRouting ? '#000' : '#fff'};
                    box-shadow: 0 0 4px rgba(0,0,0,0.4);
                    ${isSelectedForRouting ? 'transform: scale(1.3);' : ''}
                "></div>
            `;

            const icon = L.divIcon({ className: "", html: iconHtml, iconSize: [14, 14], iconAnchor: [7, 7] });

            const marker = L.marker([rec.lat, rec.lng], { icon, title: rec.nombre_local || rec.nombre }).addTo(layer);

            if (isRoutingMode) {
                marker.on('click', () => {
                    setRouteStops(prev => {
                        const exists = prev.find(s => s.id === rec.id);
                        if (exists) return prev.filter(s => s.id !== rec.id);
                        return [...prev, rec];
                    });
                });
            } else {
                marker.bindPopup(`
                    <div style="min-width:200px">
                        <b>${rec.nombre_local || rec.nombre}</b><br/>
                        <span style="font-size: 0.85em; color: #666">${rec.rubro || 'Sin rubro'}</span><br/>
                        <div style="margin-top: 8px; font-size: 0.9em;">
                            ${rec.direccion ? `📍 ${rec.direccion}<br/>` : ''}
                            ${rec.telefono ? `📞 ${rec.telefono}<br/>` : ''}
                            👤 ${rec.creado_por || 'Desconocido'}<br/>
                        </div>
                        <button class="btn-popup-edit" style="margin-top: 10px; width: 100%; padding: 6px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">Editar Cliente</button>
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
            }
        });
    }, [clientes, colorMode, activeFilters, isRoutingMode, routeStops]);

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
            (err) => toast.error("Error al obtener ubicación", { id: 'geo' }),
            { enableHighAccuracy: true }
        );
    };

    const handleRegisterHere = () => {
        if (!myLocation) return toast.error("Primero debés ubicarte");
        setEditingId(null);
        setSelectedLatLng(myLocation);
        setModalOpen(true);
    };

    const toggleFilter = (val) => {
        setActiveFilters(prev => {
            const next = new Set(prev);
            if (next.has(val)) next.delete(val);
            else next.add(val);
            return next;
        });
    };

    const haversineKm = (a, b) => {
        const R = 6371;
        const dLat = (b.lat - a.lat) * Math.PI / 180;
        const dLng = (b.lng - a.lng) * Math.PI / 180;
        const lat1 = a.lat * Math.PI / 180;
        const lat2 = b.lat * Math.PI / 180;
        const s1 = Math.sin(dLat / 2);
        const s2 = Math.sin(dLng / 2);
        const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    };

    const optimizeRoute = () => {
        if (routeStops.length < 2) return toast.error("Selecciona al menos 2 puntos para rutar");

        let startPoint = myLocation ? { id: 'me', lat: myLocation.lat, lng: myLocation.lng, nombre: 'Mi Ubicación' } : routeStops[0];
        let remaining = routeStops.filter(s => s.id !== startPoint.id);

        let ordered = [startPoint];
        let current = startPoint;

        while (remaining.length > 0) {
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < remaining.length; i++) {
                const d = haversineKm(current, remaining[i]);
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            const next = remaining.splice(bestIdx, 1)[0];
            ordered.push(next);
            current = next;
        }

        if (routingControlRef.current) {
            mapRef.current.removeControl(routingControlRef.current);
        }

        const waypoints = ordered.map(s => L.latLng(s.lat, s.lng));

        routingControlRef.current = L.Routing.control({
            waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            showAlternatives: false,
            lineOptions: { styles: [{ color: '#3b82f6', opacity: 0.8, weight: 5 }] },
            createMarker: () => null // Hide default routing markers, rely on ours
        }).addTo(mapRef.current);

        setIsRoutingMode(false);
        toast.success("Ruta generada");
    };

    const clearRoute = () => {
        setRouteStops([]);
        if (routingControlRef.current && mapRef.current) {
            mapRef.current.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }
    };

    const getLegendItems = () => {
        if (colorMode === 'estado') return ESTADOS.map(e => ({ label: e, color: ESTADO_COLOR[e] }));
        if (colorMode === 'interes') return Object.keys(INTERES_COLORS).map(k => ({ label: k, color: INTERES_COLORS[k] }));
        if (colorMode === 'estilo') return Object.keys(ESTILO_COLORS).map(k => ({ label: k, color: ESTILO_COLORS[k] }));
        // Creador
        const creators = [...new Set(clientes.map(c => (c.creado_por || 'Desconocido').trim()))];
        return creators.map(c => ({ label: c, color: getColorForCreator(c) }));
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Mapa de Clientes</h1>
                    <p className="muted" style={{ margin: 0 }}>Distribución geográfica y optimización de rutas.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Button variant="secondary" onClick={handleLocateMe}><Navigation size={16} /> Ubicarme</Button>
                    <Button variant="secondary" onClick={handleRegisterHere} disabled={!myLocation}><MapPin size={16} /> Registrar Aquí</Button>
                    <Button variant="secondary" onClick={fetchClientes}><RefreshCw size={16} /> Refrescar</Button>

                    <select className="input" style={{ width: 'auto' }} value={colorMode} onChange={(e) => { setColorMode(e.target.value); setActiveFilters(new Set()); }}>
                        <option value="estado">Ver por Estado</option>
                        <option value="creador">Ver por Creador</option>
                        <option value="interes">Ver por Interés</option>
                        <option value="estilo">Ver por Estilo Contacto</option>
                    </select>

                    <Button variant={isRoutingMode ? 'primary' : 'secondary'} onClick={() => setIsRoutingMode(!isRoutingMode)}>
                        <RouteIcon size={16} /> {isRoutingMode ? 'Cancelar Ruta' : 'Modo Ruta'}
                    </Button>

                    <Button variant={showZones ? 'primary' : 'secondary'} onClick={() => setShowZones(!showZones)}>
                        <Layers size={16} /> {showZones ? 'Zonas: ON' : 'Zonas: OFF'}
                    </Button>

                    {showZones && (
                        <select id="zoneSelectorInputClientes" value={zoneType} onChange={(e) => setZoneType(e.target.value)} className="input" style={{ width: 'auto' }}>
                            <option value="today">🔵 Hoy</option>
                            <option value="done">🔴 Realizada</option>
                            <option value="extra">🟠 Extra</option>
                        </select>
                    )}
                </div>
            </div>

            {isRoutingMode && (
                <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                    <div>
                        <strong>Modo Ruta Activo:</strong> Hacé click en los clientes que querés visitar (Seleccionados: {routeStops.length}).
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" onClick={() => setRouteStops([])}>Limpiar</Button>
                        <Button variant="primary" onClick={optimizeRoute}>Calcular Ruta Óptima</Button>
                    </div>
                </div>
            )}

            {!isRoutingMode && routeStops.length > 0 && (
                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>Ruta generada visible.</div>
                    <Button variant="secondary" onClick={clearRoute}>Limpiar Ruta</Button>
                </div>
            )}

            <div style={{ flex: 1, width: '100%', minHeight: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', zIndex: 1 }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '600px' }}></div>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {getLegendItems().map(item => (
                    <div
                        key={item.label}
                        onClick={() => toggleFilter(item.label)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '20px',
                            background: activeFilters.size > 0 && !activeFilters.has(item.label) ? 'var(--bg-card)' : 'var(--bg-elevated)',
                            opacity: activeFilters.size > 0 && !activeFilters.has(item.label) ? 0.5 : 1,
                            border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem'
                        }}
                    >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color }}></div>
                        {item.label}
                    </div>
                ))}
            </div>

            <ClienteModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedLatLng(null); }}
                clienteId={editingId}
                initialLocation={selectedLatLng}
                onSaved={() => { setModalOpen(false); fetchClientes(); setSelectedLatLng(null); }}
            />
        </div>
    );
}
