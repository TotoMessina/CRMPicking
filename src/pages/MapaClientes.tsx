import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { 
    RefreshCw, Route as RouteIcon, Layers, Filter, X,
    User, Map as MapIcon, Info, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ESTADOS_LISTA, ESTADO_RELEVADO } from '../constants/estados';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import 'leaflet.heat';

// Shared Map UI Components
import { MapControlBar } from '../components/map/MapControlBar';
import { MapStatsBadge } from '../components/map/MapStatsBadge';
import { MapLegend } from '../components/map/MapLegend';

import { ClienteModal } from '../components/ui/ClienteModal';
import { AsignarRutaModal } from '../components/ui/AsignarRutaModal';
import { useClientesMapa, MapFilters } from '../hooks/useClientesMapa';
import { formatToLocal } from '../utils/dateUtils';
import { useCompanyUsers } from '../hooks/useCompanyUsers';
import { useRubros } from '../hooks/useRubros';
import { ClientFilters } from '../components/clients/ClientFilters';
import { getChurnRisk, CHURN_COLORS } from '../utils/riskScoring';

// Extensiones para el objeto window para los popups de Leaflet
declare global {
    interface Window {
        L: typeof L;
        updateZoneColor: (id: string, newColor: string) => Promise<void>;
        deleteZoneById: (id: string) => Promise<void>;
    }
}

const ZONE_COLORS = {
    today: "#0c0c0c",
    done: "#ef4444",
    extra: "#f97316"
} as const;

const ESTADOS = ESTADOS_LISTA;

const ESTADO_COLOR: Record<string, string> = {
    [ESTADO_RELEVADO]:          "#ff3d3d",
    "2 - Local Visitado No Activo": "#ff9f1c",
    "3 - Primer Ingreso":       "#ffef16",
    "4 - Local Creado":         "#0c0c0c",
    "5 - Local Visitado Activo": "#22ff34",
    "6 - Local No Interesado":  "#5f5f5f",
};

const INTERES_COLORS: Record<string, string> = {
    "Bajo": "#22c55e",
    "Medio": "#eab308",
    "Alto": "#ef4444",
    "Sin interés": "#94a3b8"
};

const ESTILO_COLORS: Record<string, string> = {
    "Dueño": "#0c0c0c",
    "Empleado": "#eab308",
    "Cerrado": "#9ca3af",
    "Sin definir": "#64748b"
};

const timeSince = (date: string | null) => {
    if (!date) return 'Nunca';
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
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

const CREATOR_COLORS: Record<string, string> = {};
function getColorForCreator(user: string | null) {
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

const RUBRO_COLORS: Record<string, string> = {};
function getColorForRubro(rubro: string | null) {
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
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const drawnZonesRef = useRef<L.FeatureGroup | null>(null);
    const markersActivadoresLayerRef = useRef<L.LayerGroup | null>(null);

    const [filters, setFilters] = useState<MapFilters>({
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

    const updateFilter = (name: keyof MapFilters, value: any) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const { data: clientes = [], isLoading: loading, refetch: fetchClientes } = useClientesMapa(empresaActiva?.id, filters);
    const { data: responsablesValidos = [] } = useCompanyUsers(empresaActiva?.id || null);
    const { data: rubrosValidos = [] } = useRubros();
    const [activadores, setActivadores] = useState<any[]>([]);
    const [showActivadores, setShowActivadores] = useState(true);
    const [showZones, setShowZones] = useState(true);
    const [zoneType, setZoneType] = useState('today');
    const [mapReady, setMapReady] = useState(false);

    // Heatmap Mode
    const [isHeatmapMode, setIsHeatmapMode] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [totalAbsoluto, setTotalAbsoluto] = useState(0);
    const [clientesEnZona, setClientesEnZona] = useState(0);
    const heatLayerRef = useRef<any>(null);
    
    useEffect(() => {
        const fetchTotal = async () => {
            if (!empresaActiva?.id) return;
            const { count } = await (supabase as any)
                .from('empresa_cliente')
                .select('*', { count: 'exact', head: true })
                .eq('empresa_id', empresaActiva.id);
            setTotalAbsoluto(count || 0);
        };
        fetchTotal();
    }, [empresaActiva]);

    const [colorMode, setColorMode] = useState('estado'); 
    const [showLegendMobile, setShowLegendMobile] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [activeFilters, setActiveFilters] = useState(new Set());

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedLatLng, setSelectedLatLng] = useState<{lat: number, lng: number} | null>(null);

    const [asignarModalOpen, setAsignarModalOpen] = useState(false);
    const [selectedClienteForRuta, setSelectedClienteForRuta] = useState<any>(null);

    const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
    const myMarkerRef = useRef<L.Marker | null>(null);
    const myCircleRef = useRef<L.Circle | null>(null);

    const [isRoutingMode, setIsRoutingMode] = useState(false);
    const [routeStops, setRouteStops] = useState<any[]>([]);
    const routingControlRef = useRef<any>(null);

    const [isHistoricalMode, setIsHistoricalMode] = useState(false);
    const [historicalActivadorId, setHistoricalActivadorId] = useState('');
    const [historicalDate, setHistoricalDate] = useState(() => new Date().toISOString().split('T')[0]);
    const historicalPathLayerRef = useRef<L.LayerGroup | null>(null);

    const bindZonePopup = (layer: any, zoneId: string) => {
        const popupContent = `
            <div style="margin-bottom:8px; font-weight:bold;">Zona</div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="btn-popup-local" style="color:var(--text); border:1px solid var(--border); padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; background: white;" onclick="window.updateZoneColor('${zoneId}', '#0c0c0c')">⬛ Marcar "Hoy"</button>
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
        if (!showZones || !empresaActiva?.id) return;

        const { data, error } = await (supabase as any).rpc('get_map_zonas', {
            p_empresa_id: empresaActiva.id
        });
        if (error) {
            console.error("Error cargando zonas:", error);
            return;
        }

        data.forEach((zone: any) => {
            if (!zone.coordinates) return;
            const polygon = L.polygon(zone.coordinates, {
                color: zone.color || '#ef4444',
                fillOpacity: 0.2, 
                weight: 2,
                bubblingMouseEvents: false
            });
            (polygon as any).zoneId = zone.id;
            bindZonePopup(polygon, zone.id);
            drawnZonesRef.current?.addLayer(polygon);
        });
    };

    useEffect(() => {
        window.updateZoneColor = async (id: string, newColor: string) => {
            const { error } = await (supabase as any).from('zones').update({ color: newColor }).eq('id', id).eq('empresa_id', empresaActiva?.id);
            if (error) {
                toast.error("Error al actualizar color");
            } else {
                if (drawnZonesRef.current) {
                    drawnZonesRef.current.eachLayer((layer: any) => {
                        if (layer.zoneId === id) {
                            layer.setStyle({ color: newColor });
                            layer.closePopup();
                        }
                    });
                }
                toast.success("Color actualizado");
            }
        };

        window.deleteZoneById = async (id: string) => {
            if (!window.confirm("¿Eliminar esta zona?")) return;
            const { error } = await (supabase as any).from('zones').delete().eq('id', id).eq('empresa_id', empresaActiva?.id);
            if (error) {
                toast.error("Error al eliminar zona");
            } else {
                if (drawnZonesRef.current) {
                    drawnZonesRef.current.eachLayer((layer: any) => {
                        if (layer.zoneId === id) {
                            drawnZonesRef.current?.removeLayer(layer);
                        }
                    });
                }
                toast.success("Zona eliminada");
            }
        };

        return () => {
            delete (window as any).updateZoneColor;
            delete (window as any).deleteZoneById;
        };
    }, [empresaActiva]);

    const fetchActivadores = async () => {
        if (!empresaActiva?.id) return;

        try {
            if (!navigator.onLine) return;

            const { data: euData, error: euError } = await (supabase as any)
                .from('empresa_usuario')
                .select('usuario_email')
                .eq('empresa_id', empresaActiva.id);

            if (euError) throw euError;
            if (!euData || euData.length === 0) {
                setActivadores([]);
                return;
            }

            const emails = euData.map((e: any) => e.usuario_email);

            const { data, error } = await (supabase as any)
                .from("usuarios")
                .select("id, nombre, email, role, lat, lng, last_seen, avatar_emoji")
                .in("email", emails)
                .not("lat", "is", null)
                .not("lng", "is", null)
                .eq("activo", true);

            if (!error) {
                const filtered = (data || []).filter((u: any) =>
                    u.role?.toLowerCase().includes('activador') ||
                    u.role?.toLowerCase().includes('admin')
                );
                setActivadores(filtered);
            } else {
                throw error;
            }
        } catch (err) {
            if (navigator.onLine) {
                console.error('Error fetching activadores for map:', err);
            }
        }
    };

    useEffect(() => {
        fetchActivadores();
        const interval = setInterval(fetchActivadores, 60000);
        return () => clearInterval(interval);
    }, []);

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

            (m as any).isDrawing = false;
            m.on('draw:drawstart' as any, () => { (m as any).isDrawing = true; });
            m.on('draw:drawstop' as any, () => { setTimeout(() => { (m as any).isDrawing = false; }, 100); });
            m.on('draw:editstart' as any, () => { (m as any).isDrawing = true; });
            m.on('draw:editstop' as any, () => { setTimeout(() => { (m as any).isDrawing = false; }, 100); });
            m.on('draw:deletestart' as any, () => { (m as any).isDrawing = true; });
            m.on('draw:deletestop' as any, () => { setTimeout(() => { (m as any).isDrawing = false; }, 100); });

            m.on('click', (e) => {
                if ((m as any).isDrawing) return;
                if (e.originalEvent && (e.originalEvent.target as any).tagName && (e.originalEvent.target as any).tagName.toLowerCase() === 'path') {
                    return;
                }
                setEditingId(null);
                setSelectedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
                setModalOpen(true);
            });

            const drawControl = new (L as any).Control.Draw({
                position: 'topright',
                draw: {
                    polygon: { allowIntersection: false, showArea: true, metric: true, shapeOptions: { color: ZONE_COLORS.today, fillOpacity: 0.2, bubblingMouseEvents: false } },
                    rectangle: { showArea: true, metric: true, shapeOptions: { color: ZONE_COLORS.today, fillOpacity: 0.2, bubblingMouseEvents: false } },
                    polyline: false, circle: false, marker: false, circlemarker: false
                },
                edit: {
                    featureGroup: drawnZonesRef.current,
                    remove: true,
                    edit: false
                }
            });

            m.addControl(drawControl);

            m.on('draw:created' as any, async function (e: any) {
                const layer = e.layer;
                const selectElement = document.getElementById("zoneSelectorInputClientes") as HTMLSelectElement;
                const currentZone = selectElement ? selectElement.value : 'today';
                const color = (ZONE_COLORS as any)[currentZone] || ZONE_COLORS.today;

                layer.setStyle({ color: color, fillOpacity: 0.2 });
                drawnZonesRef.current?.addLayer(layer);

                const shape = layer.toGeoJSON();
                const coords = shape.geometry.coordinates[0].map((p: any) => ({ lat: p[1], lng: p[0] }));

                if (!coords || coords.length < 3) return;

                toast.loading("Guardando zona...", { id: 'save-zone' });
                const { data, error } = await (supabase as any).from('zones').insert([{
                    coordinates: coords,
                    color: color,
                    scope: 'kiosco_map',
                    empresa_id: empresaActiva?.id
                }]).select();

                if (error) {
                    toast.error("Error al guardar la zona", { id: 'save-zone' });
                    drawnZonesRef.current?.removeLayer(layer);
                } else {
                    const newId = data[0].id;
                    (layer as any).zoneId = newId;
                    bindZonePopup(layer, newId);
                    toast.success("Zona guardada", { id: 'save-zone' });
                }
            });

            m.on('draw:deleted' as any, async function (e: any) {
                const layers = e.layers;
                layers.eachLayer(async function (layer: any) {
                    if (layer.zoneId) {
                        const { error } = await (supabase as any).from('zones').delete().eq('id', layer.zoneId).eq('empresa_id', empresaActiva?.id);
                        if (error) toast.error("Error eliminando zona");
                    }
                });
            });

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
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [empresaActiva]);

    const updateVisibleCount = useCallback(() => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        const inView = (clientes as any[]).filter((c: any) => {
            const lat = Number(c.lat);
            const lng = Number(c.lng);
            return !isNaN(lat) && !isNaN(lng) && bounds.contains(L.latLng(lat, lng));
        }).length;
        setClientesEnZona(inView);
    }, [clientes]);

    useEffect(() => {
        if (!mapRef.current) return;
        const m = mapRef.current;
        m.on('moveend zoomend', updateVisibleCount);
        updateVisibleCount(); 
        return () => {
            m.off('moveend zoomend', updateVisibleCount);
        };
    }, [mapRef.current, updateVisibleCount]);

    useEffect(() => {
        loadZonas();
    }, [showZones, empresaActiva]);

    useEffect(() => {
        if (!mapRef.current || !markersLayerRef.current) return;
        const layer = markersLayerRef.current;
        layer.clearLayers();

        const hasFilters = activeFilters.size > 0;

        clientes.forEach((rec: any) => {
            if (hasFilters) {
                if (colorMode === "creador" && !activeFilters.has((rec.creado_por || "Desconocido").trim())) return;
                else if (colorMode === "rubro" && !activeFilters.has((rec.rubro || "Sin rubro").trim())) return;
                else if (colorMode === "interes" && !activeFilters.has(rec.interes || "Bajo")) return;
                else if (colorMode === "estilo" && !activeFilters.has(rec.estilo_contacto || "Sin definir")) return;
                else if (colorMode === "estado" && !activeFilters.has(rec.estado)) return;
            }

            let color = "#94a3b8";
            if (colorMode === "riesgo") {
                const risk = getChurnRisk(rec);
                color = risk.color;
            } else if (colorMode === "creador") color = getColorForCreator(rec.creado_por);
            else if (colorMode === "rubro") color = getColorForRubro(rec.rubro);
            else if (colorMode === "interes") color = INTERES_COLORS[rec.interes || "Bajo"] || INTERES_COLORS["Sin interés"];
            else if (colorMode === "estilo") color = ESTILO_COLORS[rec.estilo_contacto || "Sin definir"] || ESTILO_COLORS["Sin definir"];
            else color = ESTADO_COLOR[rec.estado] || "#94a3b8";

            const isSelectedForRouting = routeStops.some(s => s.id === rec.id);
            const risk = getChurnRisk(rec);
            const isHighRisk = colorMode === 'riesgo' && risk.level === 'alto';
            const opacityStyle = isHeatmapMode ? 'opacity: 0.15;' : '';

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

            const marker = L.marker([Number(rec.lat), Number(rec.lng)], { icon, title: rec.nombre_local || rec.nombre }).addTo(layer);

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

                        ${colorMode === 'riesgo' ? `
                            <div style="margin-top: 8px; padding: 6px 10px; border-radius: 8px; font-size: 0.8em; font-weight: 700; background: ${risk.level === 'alto' ? '#fef2f2' : risk.level === 'medio' ? '#fffbeb' : '#f0fdf4'}; color: ${risk.color}; border: 1px solid ${risk.color}50;">
                                ${risk.label}
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
                    const btn = e.popup.getElement()?.querySelector('.btn-popup-edit') as HTMLButtonElement;
                    if (btn) {
                        btn.onclick = () => {
                            setEditingId(rec.id);
                            setSelectedLatLng(null);
                            setModalOpen(true);
                            marker.closePopup();
                        };
                    }

                    const btnAssign = e.popup.getElement()?.querySelector('.btn-popup-assign') as HTMLButtonElement;
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

    useEffect(() => {
        if (!mapRef.current) return;
        
        if (!isHeatmapMode) {
            if (heatLayerRef.current) {
                mapRef.current.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }
            return;
        }

        const points: any[] = [];
        const hasFilters = activeFilters.size > 0;

        clientes.forEach((rec: any) => {
            if (hasFilters) {
                if (colorMode === "creador" && !activeFilters.has((rec.creado_por || "Desconocido").trim())) return;
                else if (colorMode === "rubro" && !activeFilters.has((rec.rubro || "Sin rubro").trim())) return;
                else if (colorMode === "interes" && !activeFilters.has(rec.interes || "Bajo")) return;
                else if (colorMode === "estilo" && !activeFilters.has(rec.estilo_contacto || "Sin definir")) return;
                else if (colorMode === "estado" && !activeFilters.has(rec.estado)) return;
            }
            if (rec.lat && rec.lng) {
                points.push([Number(rec.lat), Number(rec.lng), 1]);
            }
        });

        if (heatLayerRef.current) {
            mapRef.current.removeLayer(heatLayerRef.current);
        }

        if ((L as any).heatLayer) {
            heatLayerRef.current = (L as any).heatLayer(points, {
                radius: 25,
                blur: 15,
                maxZoom: 17,
                gradient: {0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
            }).addTo(mapRef.current);
        }
    }, [clientes, isHeatmapMode, activeFilters, colorMode, mapReady]);

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
            const marker = L.marker([Number(user.lat), Number(user.lng)], { icon, title: user.nombre }).addTo(layer);

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

    const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const lat1Rad = lat1 * Math.PI / 180;
        const lat2Rad = lat2 * Math.PI / 180;
        const s1 = Math.sin(dLat / 2);
        const s2 = Math.sin(dLng / 2);
        const h = s1 * s1 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * s2 * s2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    };

    const exportarReporteRecorrido = async () => {
        if (!historicalActivadorId) return toast.error('Debe seleccionar un activador');
        toast.loading('Generando reporte...', { id: 'export' });

        const startDate = new Date(`${historicalDate}T00:00:00`).toISOString();
        const endDate = new Date(`${historicalDate}T23:59:59.999`).toISOString();

        const { data: historial, error: histErr } = await (supabase as any)
            .from('historial_ubicaciones')
            .select('lat, lng, fecha')
            .eq('empresa_id', empresaActiva?.id)
            .eq('usuario_id', historicalActivadorId)
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: true });

        if (histErr) {
            console.error("Error historial:", histErr);
            toast.error("Error al cargar historial");
            return;
        }

        const hData = historial as any[];
        if (hData.length === 0) {
            toast.error("No hay datos de ubicación para ese día");
            return;
        }

        const activador = activadores.find(a => a.id === historicalActivadorId);
        const activadorEmail = activador?.email || '';
        const activadorName = activador?.nombre || 'Activador';

        const { data: actividades } = await (supabase as any)
            .from('actividades')
            .select('id, descripcion, fecha')
            .eq('empresa_id', empresaActiva?.id)
            .eq('usuario', activadorEmail)
            .gte('fecha', startDate)
            .lte('fecha', endDate);

        let totalDistanceKm = 0;
        let diffMs = 0;
        let startTime = 'N/A';
        let endTime = 'N/A';

        if (historial && historial.length > 0) {
            startTime = new Date(historial[0].fecha).toLocaleTimeString();
            endTime = new Date(historial[historial.length - 1].fecha).toLocaleTimeString();
            diffMs = new Date(historial[historial.length - 1].fecha).getTime() - new Date(historial[0].fecha).getTime();

            for (let i = 1; i < historial.length; i++) {
                totalDistanceKm += haversineKm(Number(historial[i-1].lat), Number(historial[i-1].lng), Number(historial[i].lat), Number(historial[i].lng));
            }
        }

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const durationStr = `${hours}h ${mins}m`;
        const actCount = actividades ? actividades.length : 0;

        const wb = XLSX.utils.book_new();

        const resumenData = [
            ["Reporte de Jornada - CRM PickingUp"],
            [],
            ["Activador", activadorName],
            ["Fecha", historicalDate],
            ["Hora Inicio", startTime],
            ["Hora Fin", endTime],
            ["Duración Total", durationStr],
            ["Distancia Recorrida (Km)", totalDistanceKm.toFixed(2)],
            ["Actividades Registradas", actCount],
        ];

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

        const gpsData = (historial || []).map((p: any, index: number) => ({
            "Punto N°": index + 1,
            "Hora": new Date(p.fecha).toLocaleTimeString(),
            "Latitud": p.lat,
            "Longitud": p.lng
        }));
        const wsGps = gpsData.length > 0 ? XLSX.utils.json_to_sheet(gpsData) : XLSX.utils.aoa_to_sheet([["Sin puntos de GPS registrados"]]);
        XLSX.utils.book_append_sheet(wb, wsGps, "Rastreo GPS");

        const actData = (actividades || []).map((a: any) => ({
            "Descripción": a.descripcion,
            "Hora": new Date(a.fecha).toLocaleTimeString()
        }));
        const wsAct = actData.length > 0 ? XLSX.utils.json_to_sheet(actData) : XLSX.utils.aoa_to_sheet([["Sin actividades registradas"]]);
        XLSX.utils.book_append_sheet(wb, wsAct, "Actividades");

        XLSX.writeFile(wb, `Reporte_Ruta_${activadorName.replace(/\s+/g, '_')}_${historicalDate}.xlsx`);
        toast.success('Reporte exportado correctamente', { id: 'export' });
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
                const d = haversineKm(Number(current.lat), Number(current.lng), Number(remaining[i].lat), Number(remaining[i].lng));
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            const next = remaining.splice(bestIdx, 1)[0];
            ordered.push(next);
            current = next;
        }

        if (routingControlRef.current) {
            mapRef.current?.removeControl(routingControlRef.current);
        }

        const waypoints = ordered.map(s => L.latLng(Number(s.lat), Number(s.lng)));

        routingControlRef.current = (L as any).Routing.control({
            waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            showAlternatives: false,
            lineOptions: { styles: [{ color: '#0c0c0c', opacity: 0.8, weight: 5 }] },
            createMarker: () => null 
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
            const rubros = [...new Set((clientes as any[]).map(c => (c.rubro || 'Sin rubro').trim()))].sort();
            return rubros.map((r: any) => ({ label: r, color: getColorForRubro(r) }));
        }
        const creators = [...new Set((clientes as any[]).map(c => (c.creado_por || 'Desconocido').trim()))];
        return creators.map((c: any) => ({ label: c, color: getColorForCreator(c) }));
    };

    return (
        <div className="map-immersive-container">
            <div className="map-main-view">
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

                <MapStatsBadge 
                    inView={clientesEnZona} 
                    total={totalAbsoluto} 
                    label="en zona" 
                    totalLabel="Total locales" 
                />

                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        position: 'absolute', left: '20px', top: '20px', zIndex: 1001,
                        background: showFilters ? 'var(--accent)' : 'var(--bg-glass)',
                        backdropFilter: 'blur(12px)',
                        color: showFilters ? '#fff' : 'var(--text)',
                        border: '1px solid var(--border)', borderRadius: '50%',
                        width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)', cursor: 'pointer', transition: 'all 0.3s'
                    }}
                >
                    {showFilters ? <X size={24} /> : <Filter size={24} />}
                </button>

                <MapLegend 
                    items={getLegendItems()}
                    isMobile={isMobile}
                    showMobile={showLegendMobile}
                    onCloseMobile={() => setShowLegendMobile(false)}
                />

                {isHistoricalMode && (
                    <div style={{
                        position: 'absolute', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
                        zIndex: 1000, width: 'min(700px, 90vw)',
                        background: 'var(--bg-glass)', backdropFilter: 'blur(16px)',
                        padding: '16px 24px', borderRadius: '24px', border: '2px solid var(--accent)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)', display: 'flex', gap: '15px', alignItems: 'center'
                    }}>
                        <select 
                            className="input" 
                            style={{ flex: 1, minWidth: '150px', background: 'var(--bg-elevated)' }} 
                            value={historicalActivadorId} 
                            onChange={(e) => setHistoricalActivadorId(e.target.value)}
                        >
                            <option value="">👤 Seleccionar activador...</option>
                            {activadores.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                        
                        <input 
                            type="date" 
                            className="input" 
                            style={{ width: '150px', background: 'var(--bg-elevated)' }} 
                            value={historicalDate} 
                            onChange={(e) => setHistoricalDate(e.target.value)}
                        />
                        
                        <Button 
                            variant="primary" 
                            onClick={exportarReporteRecorrido} 
                            style={{ background: '#10b981', border: 'none', borderRadius: '12px' }}
                            disabled={!historicalActivadorId}
                        >
                            Exportar Excel
                        </Button>
                    </div>
                )}
            </div>

            <MapControlBar isMobile={isMobile}>
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px', 
                    background: 'var(--bg-glass)', padding: '6px 12px', borderRadius: '16px', 
                    border: '1px solid var(--border)', flexShrink: 0, width: 'auto'
                }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>🎨 Capas:</span>
                    <select 
                        className="input" 
                        style={{ 
                            width: isMobile ? '110px' : '150px', height: '32px', borderRadius: '10px', 
                            border: 'none', background: 'transparent', fontSize: '0.8rem', fontWeight: 600,
                            flexShrink: 0
                        }} 
                        value={colorMode} 
                        onChange={(e) => { setColorMode(e.target.value); setActiveFilters(new Set()); }}
                    >
                        <option value="estado">Estado</option>
                        <option value="rubro">Rubro</option>
                        <option value="creador">Creador</option>
                        <option value="interes">Interés</option>
                        <option value="estilo">Estilo Contacto</option>
                        <option value="riesgo">⚠️ Riesgo</option>
                    </select>
                </div>

                <div style={{ width: '1px', height: '20px', background: 'var(--border)', flexShrink: 0 }}></div>

                <Button 
                    variant={isHistoricalMode ? 'primary' : 'secondary'} 
                    onClick={() => setIsHistoricalMode(!isHistoricalMode)}
                    style={{ borderRadius: '14px', height: '40px', flexShrink: 0, flexGrow: 0, width: 'auto', minWidth: 'fit-content', padding: '0 15px', fontSize: '0.85rem' }}
                >
                    🗺️ Historial
                </Button>

                <Button 
                    variant={showZones ? 'primary' : 'secondary'} 
                    onClick={() => setShowZones(!showZones)}
                    style={{ borderRadius: '14px', height: '40px', flexShrink: 0, flexGrow: 0, width: 'auto', minWidth: 'fit-content', padding: '0 15px', fontSize: '0.85rem' }}
                >
                    <Layers size={16} /> {isMobile ? 'Zonas' : 'Zonas Diarias'}
                </Button>

                {showZones && (
                    <select 
                        id="zoneSelectorInputClientes" 
                        value={zoneType} 
                        onChange={(e) => setZoneType(e.target.value)} 
                        className="input" 
                        style={{ width: 'auto', minWidth: '100px', height: '40px', borderRadius: '12px', flexShrink: 0, flexGrow: 0 }}
                    >
                        <option value="today">🔵 Hoy</option>
                        <option value="done">🔴 Realizada</option>
                        <option value="extra">🟠 Extra</option>
                    </select>
                )}

                <Button 
                    variant={showActivadores ? 'primary' : 'secondary'} 
                    onClick={() => setShowActivadores(!showActivadores)}
                    style={{ borderRadius: '14px', height: '40px', flexShrink: 0, flexGrow: 0, width: 'auto', minWidth: 'fit-content', padding: '0 15px', fontSize: '0.85rem' }}
                >
                    <User size={16} /> {isMobile ? 'PDI' : 'Activadores'}
                </Button>

                <Button 
                    variant={isHeatmapMode ? 'primary' : 'secondary'}
                    onClick={() => setIsHeatmapMode(!isHeatmapMode)}
                    style={{ borderRadius: '14px', height: '40px', flexShrink: 0, flexGrow: 0, width: 'auto', minWidth: 'fit-content', padding: '0 15px', fontSize: '0.85rem' }}
                >
                    🔥 {isMobile ? 'Calor' : 'Mapa Calor'}
                </Button>

                <Button 
                    variant={isRoutingMode ? 'primary' : 'secondary'}
                    onClick={() => {
                        if (isRoutingMode) clearRoute();
                        setIsRoutingMode(!isRoutingMode);
                    }}
                    style={{ borderRadius: '14px', height: '40px', flexShrink: 0, flexGrow: 0, width: 'auto', minWidth: 'fit-content', padding: '0 15px', fontSize: '0.85rem' }}
                >
                    <RouteIcon size={16} /> {isRoutingMode ? 'Saliendo...' : 'Ruta'}
                </Button>

                {isRoutingMode && routeStops.length > 0 && (
                    <div style={{ marginLeft: '20px' }}>
                        <Button 
                            variant="primary" 
                            onClick={optimizeRoute}
                            style={{ background: 'var(--success)', border: 'none', borderRadius: '14px' }}
                        >
                            Calcular ({routeStops.length})
                        </Button>
                    </div>
                )}
            </MapControlBar>

            {showFilters && (
                <div style={{
                    position: 'fixed', top: '100px', left: '20px',
                    width: 'min(400px, 90vw)', maxHeight: 'calc(100vh - 200px)', zIndex: 1005
                }}>
                    <div style={{
                        background: 'var(--bg-glass)', backdropFilter: 'blur(20px) saturate(180%)',
                        border: '1px solid var(--border)', borderRadius: '28px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)', height: '100%',
                        overflowY: 'auto', padding: '10px'
                    }}>
                        <ClientFilters 
                            filters={filters as any}
                            updateFilter={(name, val) => updateFilter(name as any, val)}
                            rubrosValidos={rubrosValidos}
                            responsablesValidos={responsablesValidos}
                            gruposValidos={[]}
                        />
                    </div>
                </div>
            )}

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

            <style>{`
                @keyframes churn-pulse { 0% { transform: scale(0.95); opacity: 0.5; } 70% { transform: scale(2); opacity: 0; } 100% { transform: scale(0.95); opacity: 0; } }
            `}</style>
        </div>
    );
}
