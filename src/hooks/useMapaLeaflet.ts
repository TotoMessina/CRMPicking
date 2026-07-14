import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import L from 'leaflet';
import * as XLSX from 'xlsx';
import { Client } from '../types/client';
import { getChurnRisk } from '../utils/riskScoring';

const ZONE_COLORS = {
    today: "#0c0c0c",
    done: "#ef4444",
    extra: "#f97316"
} as const;

interface Activador {
    id: string;
    nombre: string;
    email: string;
    role?: string;
    lat: number;
    lng: number;
    last_seen?: string;
    avatar_emoji?: string;
}

interface UseMapaLeafletProps {
    empresaActiva: any;
    clientes: Client[];
    activadores: Activador[];
    showZones: boolean;
    showActivadores: boolean;
    isHeatmapMode: boolean;
    isRoutingMode: boolean;
    routeStops: Client[];
    setRouteStops: React.Dispatch<React.SetStateAction<Client[]>>;
    colorMode: string;
    activeFilters: Set<any>;
    historicalActivadorId: string;
    historicalDate: string;
    isHistoricalMode: boolean;
    tenantConfig: any;
    ESTADO_COLOR: Record<string, string>;
    INTERES_COLORS: Record<string, string>;
    ESTILO_COLORS: Record<string, string>;
    timeSinceLocalized: (date: string | null | undefined, t: any) => string;
    setEditingId: (id: string | null) => void;
    setSelectedLatLng: (latlng: { lat: number; lng: number } | null) => void;
    setModalOpen: (open: boolean) => void;
    setSelectedClienteForRuta: (c: { id: string; nombre: string } | null) => void;
    setAsignarModalOpen: (open: boolean) => void;
}

export function useMapaLeaflet({
    empresaActiva,
    clientes,
    activadores,
    showZones,
    showActivadores,
    isHeatmapMode,
    isRoutingMode,
    routeStops,
    setRouteStops,
    colorMode,
    activeFilters,
    historicalActivadorId,
    historicalDate,
    isHistoricalMode,
    tenantConfig,
    ESTADO_COLOR,
    INTERES_COLORS,
    ESTILO_COLORS,
    timeSinceLocalized,
    setEditingId,
    setSelectedLatLng,
    setModalOpen,
    setSelectedClienteForRuta,
    setAsignarModalOpen
}: UseMapaLeafletProps) {
    const { t } = useTranslation();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const drawnZonesRef = useRef<L.FeatureGroup | null>(null);
    const markersActivadoresLayerRef = useRef<L.LayerGroup | null>(null);
    const heatLayerRef = useRef<any>(null);
    const routingControlRef = useRef<any>(null);
    const historicalPathLayerRef = useRef<L.LayerGroup | null>(null);

    const [mapReady, setMapReady] = useState(false);
    const [clientesEnZona, setClientesEnZona] = useState(0);
    const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);

    const myMarkerRef = useRef<L.Marker | null>(null);
    const myCircleRef = useRef<L.Circle | null>(null);

    const bindZonePopup = (layer: any, zoneId: string) => {
        const popupContent = `
            <div style="margin-bottom:8px; font-weight:bold;">${t('map.zone.title')}</div>
            <div style="display:flex; flex-direction:column; gap:6px;">
                <button class="btn-popup-local" style="color:var(--text); border:1px solid var(--border); padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; background: white;" onclick="document.dispatchEvent(new CustomEvent('zone-update',{detail:{id:'${zoneId}',color:'#0c0c0c'}}))">⬛ ${t('map.zone.mark_today')}</button>
                <button class="btn-popup-local" style="color:#dc2626; border:1px solid #dc2626; padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; background: white;" onclick="document.dispatchEvent(new CustomEvent('zone-update',{detail:{id:'${zoneId}',color:'#ef4444'}}))">🔴 ${t('map.zone.mark_done')}</button>
                <button class="btn-popup-local" style="color:#ea580c; border:1px solid #ea580c; padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer; background: white;" onclick="document.dispatchEvent(new CustomEvent('zone-update',{detail:{id:'${zoneId}',color:'#f97316'}}))">🟠 ${t('map.zone.mark_extra')}</button>
                <hr style="width:100%; border:0; border-top:1px solid #eee; margin:4px 0;">
                <button class="btn-popup-local" style="background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding: 4px 8px; font-size: 0.8em; border-radius: 6px; cursor: pointer;" onclick="document.dispatchEvent(new CustomEvent('zone-delete',{detail:{id:'${zoneId}'}}))">🗑️ ${t('common.actions.delete')}</button>
            </div>
        `;
        layer.bindPopup(popupContent);
    };

    const loadZonas = async () => {
        if (!drawnZonesRef.current) return;
        if (!showZones || !empresaActiva?.id) {
            drawnZonesRef.current.clearLayers();
            return;
        }

        const { data, error } = await supabase
            .from('zones')
            .select('*')
            .eq('empresa_id', empresaActiva.id);
        if (error) {
            console.error("Error cargando zonas:", error);
            return;
        }

        drawnZonesRef.current.clearLayers();

        data.forEach((zone: any) => {
            if (!zone.coordinates) return;
            const polygon = L.polygon(zone.coordinates, {
                color: zone.color || '#ef4444',
                fillOpacity: 0.2, 
                weight: 2,
                bubblingMouseEvents: false
            });
            (polygon as any).zoneId = zone.id;
            bindZonePopup(polygon, zone.id.toString());
            drawnZonesRef.current?.addLayer(polygon);
        });
    };

    useEffect(() => {
        loadZonas();
    }, [showZones, empresaActiva]);

    // Setup map
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
            historicalPathLayerRef.current = L.layerGroup().addTo(m);

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

                toast.loading(t('map.toast.saving_zone'), { id: 'save-zone' });
                const { data, error } = await supabase.from('zones').insert([{
                    coordinates: coords,
                    color: color,
                    scope: 'kiosco_map',
                    empresa_id: empresaActiva?.id
                }]).select();

                if (error) {
                    toast.error(t('map.toast.save_zone_error'), { id: 'save-zone' });
                    drawnZonesRef.current?.removeLayer(layer);
                } else {
                    const newId = data[0].id;
                    (layer as any).zoneId = newId;
                    bindZonePopup(layer, newId.toString());
                    toast.success(t('map.toast.save_zone_success'), { id: 'save-zone' });
                }
            });

            m.on('draw:deleted' as any, async function (e: any) {
                const layers = e.layers;
                layers.eachLayer(async function (layer: any) {
                    if (layer.zoneId) {
                        const { error } = await supabase.from('zones').delete().eq('id', layer.zoneId).eq('empresa_id', empresaActiva?.id);
                        if (error) toast.error(t('map.toast.delete_zone_error'));
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
        const inView = clientes.filter((c) => {
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

    // Geolocation tracker
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;

        let watchId: number;

        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    setMyLocation({ lat, lng });

                    if (mapRef.current) {
                        if (!myMarkerRef.current) {
                            const icon = L.divIcon({
                                className: '',
                                html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.8);position:relative;"><div style="position:absolute;top:-8px;left:-8px;width:32px;height:32px;background:rgba(59,130,246,0.2);border-radius:50%;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div></div>`,
                                iconSize: [16, 16],
                                iconAnchor: [8, 8]
                            });
                            myMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapRef.current);
                            myCircleRef.current = L.circle([lat, lng], { radius: position.coords.accuracy, color: '#3b82f6', fillOpacity: 0.1, weight: 1 }).addTo(mapRef.current);
                        } else {
                            myMarkerRef.current.setLatLng([lat, lng]);
                            myCircleRef.current?.setLatLng([lat, lng]);
                            myCircleRef.current?.setRadius(position.coords.accuracy);
                        }
                    }
                },
                (error) => {
                    console.warn("Geolocation watch error:", error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            if (myMarkerRef.current && mapRef.current) {
                mapRef.current.removeLayer(myMarkerRef.current);
                myMarkerRef.current = null;
            }
            if (myCircleRef.current && mapRef.current) {
                mapRef.current.removeLayer(myCircleRef.current);
                myCircleRef.current = null;
            }
        };
    }, [mapReady]);

    // Render Markers
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
            } else if (colorMode === "creador") {
                color = getCreatorColor(rec.creado_por);
            } else if (colorMode === "rubro") {
                color = getRubroColor(rec.rubro);
            } else if (colorMode === "interes") {
                color = INTERES_COLORS[rec.interes || "Bajo"] || INTERES_COLORS["Sin interés"];
            } else if (colorMode === "estilo") {
                color = ESTILO_COLORS[rec.estilo_contacto || "Sin definir"] || ESTILO_COLORS["Sin definir"];
            } else {
                color = ESTADO_COLOR[rec.estado] || "#94a3b8";
            }

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

            const marker = L.marker([Number(rec.lat || 0), Number(rec.lng || 0)], { icon, title: rec.nombre_local || rec.nombre }).addTo(layer);

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
                        <span style="font-size: 0.85em; color: #666; display: block; margin-bottom: 8px;">${rec.rubro || t('map.popup.no_rubro')}</span>
                        
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.9em; color: #444; background: rgba(0,0,0,0.03); padding: 8px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.05);">
                            ${rec.direccion ? `<span>📍 ${rec.direccion}</span>` : ''}
                            ${rec.telefono ? `<span>📞 ${rec.telefono}</span>` : ''}
                            ${rec.fecha_proximo_contacto ? `<span style="color: var(--accent); font-weight: 700;">📅 ${t('map.popup.next')}: ${rec.fecha_proximo_contacto}</span>` : ''}
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

                        <div style="margin-top: 12px; font-size: 0.75em; color: #888;">👤 ${rec.creado_por || t('map.popup.unknown')}</div>
                        
                        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 10px;">
                            <button class="btn-popup-edit" style="width: 100%; padding: 8px; background: var(--accent); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
                                ✏️ ${t('map.popup.edit_client')}
                            </button>
                            <button class="btn-popup-assign" style="width: 100%; padding: 8px; background: var(--bg-elevated); color: var(--text); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                📍 ${t('map.popup.assign_route')}
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
                            setSelectedClienteForRuta({ id: rec.id, nombre: rec.nombre_local || rec.nombre || '' });
                            setAsignarModalOpen(true);
                            marker.closePopup();
                        };
                    }
                });
            }
        });
    }, [clientes, colorMode, activeFilters, isRoutingMode, routeStops, mapReady, isHeatmapMode]);

    // Heatmap layers render
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

    // Render Activadores markers
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
                            <span>🕒 ${t('map.popup.seen_ago')}: <b>${timeSinceLocalized(user.last_seen, t)}</b></span>
                        </div>
                    </div>
                </div>
            `);
        });
    }, [activadores, showActivadores, mapReady]);

    // Helpers to generate random colors for dynamic categories
    const CREATOR_COLORS_CACHE: Record<string, string> = {};
    const getCreatorColor = (user: string | null) => {
        const key = (user || "Desconocido").trim();
        if (CREATOR_COLORS_CACHE[key]) return CREATOR_COLORS_CACHE[key];
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00ffffff).toString(16).toUpperCase();
        const hex = "#" + "00000".substring(0, 6 - c.length) + c;
        CREATOR_COLORS_CACHE[key] = hex;
        return hex;
    };

    const RUBRO_COLORS_CACHE: Record<string, string> = {};
    const getRubroColor = (rubro: string | null) => {
        const key = (rubro || 'Sin rubro').trim();
        if (RUBRO_COLORS_CACHE[key]) return RUBRO_COLORS_CACHE[key];
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
        const color = `hsl(${Math.abs(hash) % 360}, 72%, 45%)`;
        RUBRO_COLORS_CACHE[key] = color;
        return color;
    };

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

    const optimizeRoute = () => {
        if (routeStops.length < 2) return toast.error(t('map.toast.select_min_route'));

        let startPoint = myLocation ? { id: 'me', lat: myLocation.lat, lng: myLocation.lng, nombre: t('map.my_location') } : { id: routeStops[0].id, lat: routeStops[0].lat || 0, lng: routeStops[0].lng || 0, nombre: routeStops[0].nombre_local || routeStops[0].nombre };
        let remaining = routeStops.filter(s => s.id !== startPoint.id).map(s => ({ id: s.id, lat: s.lat || 0, lng: s.lng || 0, nombre: s.nombre_local || s.nombre }));

        let ordered = [startPoint];
        let current = startPoint;

        while (remaining.length > 0) {
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < remaining.length; i++) {
                const d = haversineKm(Number(current.lat || 0), Number(current.lng || 0), Number(remaining[i].lat || 0), Number(remaining[i].lng || 0));
                if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            const next = remaining.splice(bestIdx, 1)[0];
            ordered.push(next);
            current = next;
        }

        if (routingControlRef.current) {
            mapRef.current?.removeControl(routingControlRef.current);
        }

        const waypoints = ordered.map(s => L.latLng(Number(s.lat || 0), Number(s.lng || 0)));

        routingControlRef.current = (L as any).Routing.control({
            waypoints,
            routeWhileDragging: false,
            addWaypoints: false,
            showAlternatives: false,
            lineOptions: { styles: [{ color: '#0c0c0c', opacity: 0.8, weight: 5 }] },
            createMarker: () => null 
        }).addTo(mapRef.current);

        toast.success("Ruta generada");
    };

    const clearRoute = () => {
        setRouteStops([]);
        if (routingControlRef.current && mapRef.current) {
            mapRef.current.removeControl(routingControlRef.current);
            routingControlRef.current = null;
        }
    };

    // Render historical path line on demand
    useEffect(() => {
        if (!mapRef.current || !historicalPathLayerRef.current) return;
        const layer = historicalPathLayerRef.current;
        layer.clearLayers();

        if (!isHistoricalMode || !historicalActivadorId) return;

        const loadHistoricalPath = async () => {
            const startDate = new Date(`${historicalDate}T00:00:00`).toISOString();
            const endDate = new Date(`${historicalDate}T23:59:59.999`).toISOString();

            const { data } = await supabase
                .from('historial_ubicaciones')
                .select('lat, lng, fecha')
                .eq('empresa_id', empresaActiva?.id)
                .eq('usuario_id', historicalActivadorId)
                .gte('fecha', startDate)
                .lte('fecha', endDate)
                .order('fecha', { ascending: true });

            if (data && data.length > 1) {
                const latlngs = data.map((p: any) => L.latLng(Number(p.lat), Number(p.lng)));
                const polyline = L.polyline(latlngs, { color: '#3b82f6', weight: 4, opacity: 0.7, dashArray: '5, 10' }).addTo(layer);
                mapRef.current?.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            }
        };

        loadHistoricalPath();
    }, [isHistoricalMode, historicalActivadorId, historicalDate, empresaActiva]);

    const exportarReporteRecorrido = async () => {
        if (!historicalActivadorId) return toast.error(t('map.toast.select_activator'));
        const toastId = toast.loading(t('map.toast.exporting_report'));

        const startDate = new Date(`${historicalDate}T00:00:00`).toISOString();
        const endDate = new Date(`${historicalDate}T23:59:59.999`).toISOString();

        const { data: historial, error: histErr } = await supabase
            .from('historial_ubicaciones')
            .select('lat, lng, fecha')
            .eq('empresa_id', empresaActiva?.id)
            .eq('usuario_id', historicalActivadorId)
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: true });

        if (histErr) {
            console.error("Error historial:", histErr);
            toast.error(t('map.toast.load_history_error'), { id: toastId });
            return;
        }

        const hData = historial as any[];
        if (hData.length === 0) {
            toast.error(t('map.toast.no_gps_data'), { id: toastId });
            return;
        }

        const activador = activadores.find(a => a.id === historicalActivadorId);
        const activadorEmail = activador?.email || '';
        const activadorName = activador?.nombre || 'Activador';

        const { data: actividades } = await supabase
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
            [`Reporte de Jornada - ${tenantConfig?.app?.name || 'CRM'}`],
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
        toast.success(t('map.toast.export_success'), { id: toastId });
    };

    return {
        mapContainerRef,
        mapRef,
        mapReady,
        clientesEnZona,
        myLocation,
        optimizeRoute,
        clearRoute,
        exportarReporteRecorrido,
        loadZonas
    };
}
