import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { MapPin, RefreshCw, Route as RouteIcon, Navigation, Layers, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ESTADOS_LISTA, ESTADO_RELEVADO, esEstadoFinal } from '../constants/estados';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import 'leaflet.heat';
import { Clock, User } from 'lucide-react';

import { ClienteModal } from '../components/ui/ClienteModal';
import { AsignarRutaModal } from '../components/ui/AsignarRutaModal';
import { useClientesMapa } from '../hooks/useClientesMapa';
import { formatToLocal } from '../utils/dateUtils';
import { useCompanyUsers } from '../hooks/useCompanyUsers';
import { useRubros } from '../hooks/useRubros';
import { ClientFilters } from '../components/clients/ClientFilters';

const ZONE_COLORS = {
    today: "#8b5cf6",
    done: "#ef4444",
    extra: "#f97316"
};

const ESTADOS = ESTADOS_LISTA;

const ESTADO_COLOR = {
    [ESTADO_RELEVADO]:          "#ff3d3d",
    "2 - Local Visitado No Activo": "#ff9f1c",
    "3 - Primer Ingreso":       "#ffef16",
    "4 - Local Creado":         "#7700ff",
    "5 - Local Visitado Activo": "#22ff34",
    "6 - Local No Interesado":  "#5f5f5f",
};

const INTERES_COLORS = {
    "Bajo": "#22c55e",
    "Medio": "#eab308",
    "Alto": "#ef4444",
    "Sin interés": "#94a3b8"
};

const ESTILO_COLORS = {
    "Dueño": "#8b5cf6",
    "Empleado": "#eab308",
    "Cerrado": "#9ca3af",
    "Sin definir": "#64748b"
};

// ─── Churn Risk Scoring (0=bajo ... 10=alto riesgo) ───────────────────────────
const CHURN_DAYS_THRESHOLD = 30; // días sin contacto para considerar en riesgo

const CHURN_COLORS = {
    bajo:  "#22c55e",  // 0–3
    medio: "#f59e0b",  // 4–6
    alto:  "#ef4444",  // 7–10
};

function getChurnScore(rec) {
    // Solo aplica a clientes activos (estado 5)
    if (!rec.estado || !rec.estado.includes('5')) return 0;

    let score = 0;
    const now = new Date();

    // Factor 1: Días sin próximo contacto agendado (peso 5)
    if (rec.fecha_proximo_contacto) {
        const diasDesde = (now - new Date(rec.fecha_proximo_contacto)) / 86400000;
        if (diasDesde > CHURN_DAYS_THRESHOLD) score += 5;
        else if (diasDesde > CHURN_DAYS_THRESHOLD / 2) score += 2;
    } else {
        score += 3; // Sin fecha agenda = riesgo moderado
    }

    // Factor 2: Tiempo desde última actualización (peso 3)
    if (rec.updated_at) {
        const diasDesdeUpdate = (now - new Date(rec.updated_at)) / 86400000;
        if (diasDesdeUpdate > CHURN_DAYS_THRESHOLD) score += 3;
        else if (diasDesdeUpdate > CHURN_DAYS_THRESHOLD / 2) score += 1;
    } else {
        score += 2;
    }

    // Factor 3: Sin teléfono registrado (peso 2 — difícil de contactar)
    if (!rec.telefono) score += 2;

    return Math.min(10, score);
}

function getChurnColor(score) {
    if (score <= 3) return CHURN_COLORS.bajo;
    if (score <= 6) return CHURN_COLORS.medio;
    return CHURN_COLORS.alto;
}

function getChurnLabel(score) {
    if (score <= 3) return 'Riesgo Bajo';
    if (score <= 6) return 'Riesgo Medio';
    return 'Riesgo Alto ⚠️';
}

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

const RUBRO_COLORS = {};
function getColorForRubro(rubro) {
    const key = (rubro || 'Sin rubro').trim();
    if (RUBRO_COLORS[key]) return RUBRO_COLORS[key];
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
    const color = `hsl(${Math.abs(hash) % 360}, 72%, 45%)`;
    RUBRO_COLORS[key] = color;
    return color;
}

export default function MapaClientes() {
    const { empresaActiva } = useAuth();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const drawnZonesRef = useRef(null);
    const markersActivadoresLayerRef = useRef(null);

    const [filters, setFilters] = useState({
        nombre: '',
        telefono: '',
        direccion: '',
        estado: [],
        situacion: [],
        responsable: [],
        creadoPor: [],
        rubro: [],
        interes: [],
        estilo: [],
        tipoContacto: [],
        proximos7: false,
        vencidos: false,
        creadoDesde: '',
        creadoHasta: '',
        contactoDesde: '',
        contactoHasta: ''
    });

    const updateFilter = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const { data: clientes = [], isLoading: loading, refetch: fetchClientes } = useClientesMapa(empresaActiva?.id, filters);
    const { data: responsablesValidos = [] } = useCompanyUsers(empresaActiva?.id);
    const { data: rubrosValidos = [] } = useRubros();
    const [activadores, setActivadores] = useState([]);
    const [showActivadores, setShowActivadores] = useState(true);
    const [showZones, setShowZones] = useState(true);
    const [zoneType, setZoneType] = useState('today');
    const [mapReady, setMapReady] = useState(false);

    // Heatmap Mode
    const [isHeatmapMode, setIsHeatmapMode] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const heatLayerRef = useRef(null);

    // Filters & Coloring
    const [colorMode, setColorMode] = useState('estado'); // estado, creador, interes, estilo
    const [activeFilters, setActiveFilters] = useState(new Set());

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedLatLng, setSelectedLatLng] = useState(null);

    // Asignar Ruta Modal state
    const [asignarModalOpen, setAsignarModalOpen] = useState(false);
    const [selectedClienteForRuta, setSelectedClienteForRuta] = useState(null);

    // Geolocation
    const [myLocation, setMyLocation] = useState(null);
    const myMarkerRef = useRef(null);
    const myCircleRef = useRef(null);

    // Routing Mode
    const [isRoutingMode, setIsRoutingMode] = useState(false);
    const [routeStops, setRouteStops] = useState([]);
    const routingControlRef = useRef(null);

    const bindZonePopup = (layer, zoneId) => {
        const popupContent = `
            <div style="margin-bottom:8px; font-weight:bold;">Zona</div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="btn-popup-local" style="color:#7c3aed; border:1px solid #7c3aed; padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; background: white;" onclick="window.updateZoneColor('${zoneId}', '#8b5cf6')">🟣 Marcar "Hoy"</button>
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

        const { data, error } = await supabase.from('zones').select('*').eq('empresa_id', empresaActiva?.id);
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
            const { error } = await supabase.from('zones').update({ color: newColor }).eq('id', id).eq('empresa_id', empresaActiva?.id);
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
            const { error } = await supabase.from('zones').delete().eq('id', id).eq('empresa_id', empresaActiva?.id);
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
    }, [empresaActiva]);

    const fetchActivadores = async () => {
        const { data, error } = await supabase
            .from("usuarios")
            .select("id, nombre, email, role, lat, lng, last_seen, avatar_emoji")
            .not("lat", "is", null)
            .not("lng", "is", null)
            .eq("activo", true);

        if (!error) {
            const filtered = (data || []).filter(u =>
                u.role?.toLowerCase().includes('activador') ||
                u.role?.toLowerCase().includes('admin')
            );
            console.log('Activadores fetched:', filtered.length, filtered);
            setActivadores(filtered);
        } else {
            console.error('Error fetching activadores for map:', error);
        }
    };

    useEffect(() => {
        fetchActivadores();
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
            markersActivadoresLayerRef.current = L.layerGroup().addTo(m);
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
            // Monkey-patch leaflet-draw 1.0.4 bug: `readableArea` uses `type` var that
            // is undefined in minified builds. Override with a safe implementation.
            if (L.GeometryUtil) {
                L.GeometryUtil.readableArea = function(area, isMetric) {
                    if (isMetric) {
                        return area >= 10000
                            ? (area / 1000000).toFixed(2) + ' km²'
                            : area.toFixed(0) + ' m²';
                    }
                    const sqyards = area / 0.836127;
                    if (sqyards >= 3097600) return (sqyards / 3097600).toFixed(2) + ' mi²';
                    if (sqyards >= 4840)    return (sqyards / 4840).toFixed(2) + ' ac';
                    return sqyards.toFixed(0) + ' yd²';
                };
            }
            const drawControl = new L.Control.Draw({
                position: 'topright',
                draw: {
                    polygon: { allowIntersection: false, showArea: true, metric: true, shapeOptions: { color: ZONE_COLORS.today, fillOpacity: 0.2, bubblingMouseEvents: false } },
                    rectangle: { showArea: true, metric: true, shapeOptions: { color: ZONE_COLORS.today, fillOpacity: 0.2, bubblingMouseEvents: false } },
                    polyline: false, circle: false, marker: false, circlemarker: false
                    // NOTE: showArea uses the patched L.GeometryUtil.readableArea above
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
                    scope: 'kiosco_map',
                    empresa_id: empresaActiva?.id
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
                        const { error } = await supabase.from('zones').delete().eq('id', layer.zoneId).eq('empresa_id', empresaActiva?.id);
                        if (error) toast.error("Error eliminando zona");
                    }
                });
            });

            // Fix for blank map issue on initial load
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize();
                    setMapReady(true);
                    loadZonas();
                }
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
    }, [empresaActiva]);

    // Reload zones when toggle changes
    useEffect(() => {
        loadZonas();
    }, [showZones, empresaActiva]);

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
                else if (colorMode === "rubro" && !activeFilters.has((rec.rubro || "Sin rubro").trim())) return;
                else if (colorMode === "interes" && !activeFilters.has(rec.interes || "Bajo")) return;
                else if (colorMode === "estilo" && !activeFilters.has(rec.estilo_contacto || "Sin definir")) return;
                else if (colorMode === "estado" && !activeFilters.has(rec.estado)) return;
            }

            // Determine Color
            let color = "#94a3b8";
            if (colorMode === "riesgo") {
                const score = getChurnScore(rec);
                // Solo mostrar clientes activos en modo riesgo
                if (!rec.estado || !rec.estado.includes('5')) return;
                color = getChurnColor(score);
            } else if (colorMode === "creador") color = getColorForCreator(rec.creado_por);
            else if (colorMode === "rubro") color = getColorForRubro(rec.rubro);
            else if (colorMode === "interes") color = INTERES_COLORS[rec.interes || "Bajo"] || INTERES_COLORS["Sin interés"];
            else if (colorMode === "estilo") color = ESTILO_COLORS[rec.estilo_contacto || "Sin definir"] || ESTILO_COLORS["Sin definir"];
            else color = ESTADO_COLOR[rec.estado] || "#94a3b8";

            // Marker interaction
            const isSelectedForRouting = routeStops.some(s => s.id === rec.id);
            const churnScore = colorMode === 'riesgo' ? getChurnScore(rec) : null;
            const isHighRisk = churnScore !== null && churnScore >= 7;
            const opacityStyle = isHeatmapMode ? 'opacity: 0.15;' : '';
            const pulseStyle = isHighRisk ? 'animation: pulse-ring 1.5s cubic-bezier(0,0,0.2,1) infinite;' : '';

            const iconHtml = `
                <div style="position: relative;">
                    ${isHighRisk ? `<div style="
                        position: absolute; top: -3px; left: -3px;
                        width: 20px; height: 20px; border-radius: 50%;
                        background: rgba(239,68,68,0.3);
                        animation: churn-pulse 1.5s ease-out infinite;
                    "></div>` : ''}
                    <div style="
                        width: ${isHighRisk ? '16px' : '14px'};
                        height: ${isHighRisk ? '16px' : '14px'};
                        border-radius: 50%;
                        background: ${color};
                        border: 2px solid ${isSelectedForRouting ? '#000' : isHighRisk ? '#ff0000' : '#fff'};
                        box-shadow: 0 0 ${isHighRisk ? '8px' : '4px'} ${isHighRisk ? 'rgba(239,68,68,0.6)' : 'rgba(0,0,0,0.4)'};
                        ${isSelectedForRouting ? 'transform: scale(1.3);' : ''}
                        ${opacityStyle}
                        position: relative; z-index: 1;
                    "></div>
                </div>
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
                    <div style="min-width:220px; padding: 5px 0;">
                        <b style="font-size: 1.1em; display: block; margin-bottom: 2px;">${rec.nombre_local || rec.nombre}</b>
                        <span style="font-size: 0.85em; color: #666; display: block; margin-bottom: 8px;">${rec.rubro || 'Sin rubro'}</span>
                        
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.9em; color: #444; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05);">
                            ${rec.direccion ? `<span>📍 ${rec.direccion}</span>` : ''}
                            ${rec.telefono ? `<span>📞 ${rec.telefono}</span>` : ''}
                            ${rec.fecha_proximo_contacto ? `<span style="color: var(--accent); font-weight: 700;">📅 Próx: ${formatToLocal(rec.fecha_proximo_contacto)}</span>` : ''}
                        </div>

                        ${rec.notas ? `
                            <div style="margin-top: 10px; padding: 8px; background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 8px; font-size: 0.9em; font-style: italic; color: #92400e;">
                                "${rec.notas}"
                            </div>
                        ` : ''}

                        ${churnScore !== null ? `
                            <div style="margin-top: 8px; padding: 6px 10px; border-radius: 8px; font-size: 0.8em; font-weight: 700; background: ${churnScore >= 7 ? '#fef2f2' : churnScore >= 4 ? '#fffbeb' : '#f0fdf4'}; color: ${churnScore >= 7 ? '#991b1b' : churnScore >= 4 ? '#92400e' : '#166534'}; border: 1px solid ${churnScore >= 7 ? '#fecaca' : churnScore >= 4 ? '#fde68a' : '#bbf7d0'};">
                                ${getChurnLabel(churnScore)} (Score: ${churnScore}/10)
                            </div>
                        ` : ''}

                        <div style="margin-top: 12px; font-size: 0.75em; color: #888;">👤 ${rec.creado_por || 'Desconocido'}</div>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                            <button class="btn-popup-edit" style="width: 100%; padding: 8px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                                ✏️ Editar Cliente
                            </button>
                            <button class="btn-popup-assign" style="width: 100%; padding: 8px; background: var(--bg-elevated); color: var(--text); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                📍 Asignar a Ruta
                            </button>
                        </div>
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

                    const btnAssign = e.popup.getElement().querySelector('.btn-popup-assign');
                    if (btnAssign) {
                        btnAssign.onclick = () => {
                            setSelectedClienteForRuta({ id: rec.id, nombre: rec.nombre_local || rec.nombre });
                            setAsignarModalOpen(true);
                            marker.closePopup();
                        };
                    }
                });
            }
        });
    }, [clientes, colorMode, activeFilters, isRoutingMode, routeStops, mapReady, isHeatmapMode]);

    // Render Heatmap
    useEffect(() => {
        if (!mapRef.current) return;
        
        if (!isHeatmapMode) {
            if (heatLayerRef.current) {
                mapRef.current.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
            return;
        }

        const points = [];
        const hasFilters = activeFilters.size > 0;

        clientes.forEach(rec => {
            if (hasFilters) {
                if (colorMode === "creador" && !activeFilters.has((rec.creado_por || "Desconocido").trim())) return;
                else if (colorMode === "rubro" && !activeFilters.has((rec.rubro || "Sin rubro").trim())) return;
                else if (colorMode === "interes" && !activeFilters.has(rec.interes || "Bajo")) return;
                else if (colorMode === "estilo" && !activeFilters.has(rec.estilo_contacto || "Sin definir")) return;
                else if (colorMode === "estado" && !activeFilters.has(rec.estado)) return;
            }
            if (rec.lat && rec.lng) {
                points.push([rec.lat, rec.lng, 1]);
            }
        });

        if (heatLayerRef.current) {
            mapRef.current.removeLayer(heatLayerRef.current);
        }

        if (L.heatLayer) {
            heatLayerRef.current = L.heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
            }).addTo(mapRef.current);
        } else {
            console.warn("L.heatLayer no está disponible.");
        }
    }, [clientes, isHeatmapMode, activeFilters, colorMode, mapReady]);

    // Render Activadores
    useEffect(() => {
        if (!mapRef.current || !markersActivadoresLayerRef.current) return;
        const layer = markersActivadoresLayerRef.current;
        layer.clearLayers();

        if (!showActivadores) return;

        activadores.forEach(user => {
            const emoji = user.avatar_emoji || '📍';
            const iconHtml = `
                <div style="font-size: 24px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 4px rgba(0,0,0,0.4)); cursor: pointer;">
                    ${emoji}
                </div>
            `;
            const icon = L.divIcon({ className: "", html: iconHtml, iconSize: [30, 30], iconAnchor: [15, 15] });
            const marker = L.marker([user.lat, user.lng], { icon, title: user.nombre }).addTo(layer);

            marker.bindPopup(`
                <div style="min-width:180px; padding: 5px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 20px;">${emoji}</span>
                        <div style="font-weight:700;">${user.nombre}</div>
                    </div>
                    <div style="background: var(--bg-body); padding: 8px; border-radius: 8px; border: 1px solid var(--border); font-size: 0.85rem;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span>🕒 Visto hace: <b>${timeSince(user.last_seen)}</b></span>
                        </div>
                    </div>
                </div>
            `);
        });
    }, [activadores, showActivadores, mapReady]);

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
            lineOptions: { styles: [{ color: '#8b5cf6', opacity: 0.8, weight: 5 }] },
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
        if (colorMode === 'riesgo') return [
            { label: 'Riesgo Bajo (0–3)', color: CHURN_COLORS.bajo },
            { label: 'Riesgo Medio (4–6)', color: CHURN_COLORS.medio },
            { label: 'Riesgo Alto ⚠️ (7–10)', color: CHURN_COLORS.alto },
        ];
        if (colorMode === 'rubro') {
            const rubros = [...new Set(clientes.map(c => (c.rubro || 'Sin rubro').trim()))].sort();
            return rubros.map(r => ({ label: r, color: getColorForRubro(r) }));
        }
        // Creador
        const creators = [...new Set(clientes.map(c => (c.creado_por || 'Desconocido').trim()))];
        return creators.map(c => ({ label: c, color: getColorForCreator(c) }));
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
            <style>{`
                @keyframes churn-pulse {
                    0% { transform: scale(0.8); opacity: 0.9; }
                    70% { transform: scale(2.5); opacity: 0; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
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
                        <option value="rubro">Ver por Rubro</option>
                        <option value="creador">Ver por Creador</option>
                        <option value="interes">Ver por Interés</option>
                        <option value="estilo">Ver por Estilo Contacto</option>
                        <option value="riesgo">⚠️ Ver por Riesgo de Abandono</option>
                    </select>

                    <Button variant={isRoutingMode ? 'primary' : 'secondary'} onClick={() => setIsRoutingMode(!isRoutingMode)}>
                        <RouteIcon size={16} /> {isRoutingMode ? 'Cancelar Ruta' : 'Modo Ruta'}
                    </Button>

                    <Button variant={isHeatmapMode ? 'primary' : 'secondary'} onClick={() => setIsHeatmapMode(!isHeatmapMode)}>
                        🔥 {isHeatmapMode ? 'Ocultar Calor' : 'Mapa de Calor'}
                    </Button>

                    <Button variant={showZones ? 'primary' : 'secondary'} onClick={() => setShowZones(!showZones)}>
                        <Layers size={16} /> {showZones ? 'Zonas: ON' : 'Zonas: OFF'}
                    </Button>

                    <Button variant={showActivadores ? 'primary' : 'secondary'} onClick={() => setShowActivadores(!showActivadores)}>
                        <User size={16} /> {showActivadores ? 'Activadores: ON' : 'Activadores: OFF'}
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
            
            {/* Sidebar Filters Drawer */}
            <div style={{
                position: 'fixed',
                top: '100px',
                left: showFilters ? '20px' : '-450px',
                width: 'min(400px, 90vw)',
                height: 'calc(100vh - 140px)',
                zIndex: 1000,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'none'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(16px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '24px',
                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                    height: '100%',
                    overflowY: 'auto',
                    padding: '4px',
                    pointerEvents: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}>
                    <style>{`
                        .drawer-hide-scrollbar::-webkit-scrollbar { display: none; }
                    `}</style>
                    <div className="drawer-hide-scrollbar">
                        <ClientFilters 
                            filters={filters}
                            updateFilter={updateFilter}
                            rubrosValidos={rubrosValidos}
                            responsablesValidos={responsablesValidos}
                        />
                    </div>
                </div>
            </div>

            {/* Toggle Button */}
            <button 
                onClick={() => setShowFilters(!showFilters)}
                style={{
                    position: 'fixed',
                    left: showFilters ? '430px' : '20px',
                    top: '120px',
                    zIndex: 1001,
                    background: showFilters ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: showFilters ? '#fff' : 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                title={showFilters ? "Cerrar Filtros" : "Abrir Filtros"}
            >
                {showFilters ? <X size={20} /> : <Filter size={20} />}
                {!showFilters && Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== '' && v !== false) && (
                    <span style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        width: '12px',
                        height: '12px',
                        background: '#ef4444',
                        borderRadius: '50%',
                        border: '2px solid #fff'
                    }}></span>
                )}
            </button>

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

            <div style={{ 
                flex: 1, 
                width: '100%', 
                minHeight: 'calc(100vh - 250px)', 
                borderRadius: '24px', 
                overflow: 'hidden', 
                border: '1px solid var(--border)', 
                position: 'relative', 
                zIndex: 1,
                boxShadow: '0 4px 24px rgba(0,0,0,0.05)'
            }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 'calc(100vh - 250px)' }}></div>
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
                onSaved={() => {
                    setModalOpen(false);
                    setTimeout(() => fetchClientes(), 300);
                    setSelectedLatLng(null);
                }}
            />

            <AsignarRutaModal 
                isOpen={asignarModalOpen}
                onClose={() => setAsignarModalOpen(false)}
                clienteId={selectedClienteForRuta?.id || null}
                clienteNombre={selectedClienteForRuta?.nombre || null}
            />
        </div>
    );
}
