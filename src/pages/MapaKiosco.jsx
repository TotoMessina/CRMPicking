import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';

// Global styles for Kiosco popup
import '../index.css';

const ZONE_COLORS = {
    today: "#3b82f6", // Blue
    done: "#ef4444",  // Red
    extra: "#f97316"  // Orange
};

export default function MapaKiosco() {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const drawnItemsRef = useRef(null);

    const [zoneType, setZoneType] = useState('today');

    // Global helper strictly for Kiosco map popups
    useEffect(() => {
        window.updateZoneColor = async (id, newColor) => {
            const { error } = await supabase.from('zones').update({ color: newColor }).eq('id', id);
            if (error) {
                toast.error("Error al actualizar color");
            } else {
                if (drawnItemsRef.current) {
                    drawnItemsRef.current.eachLayer(layer => {
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
                if (drawnItemsRef.current) {
                    drawnItemsRef.current.eachLayer(layer => {
                        if (layer.zoneId === id) {
                            drawnItemsRef.current.removeLayer(layer);
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
        if (!drawnItemsRef.current) return;
        drawnItemsRef.current.clearLayers();

        const { data, error } = await supabase.from('zones').select('*').eq('scope', 'kiosco_map');
        if (error) {
            toast.error("Error cargando zonas");
            return;
        }

        data.forEach(zone => {
            if (!zone.coordinates) return;
            const polygon = L.polygon(zone.coordinates, {
                color: zone.color || '#ef4444',
                fillOpacity: 0.4
            });
            polygon.zoneId = zone.id;
            bindZonePopup(polygon, zone.id);
            drawnItemsRef.current.addLayer(polygon);
        });
    };

    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (!mapRef.current) {
            const m = L.map(mapContainerRef.current).setView([-34.6806, -58.5634], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(m);

            drawnItemsRef.current = new L.FeatureGroup();
            m.addLayer(drawnItemsRef.current);

            const drawControl = new L.Control.Draw({
                position: 'topright',
                draw: {
                    polygon: { allowIntersection: false, showArea: true, shapeOptions: { color: ZONE_COLORS.today, fillOpacity: 0.4 } },
                    rectangle: { shapeOptions: { color: ZONE_COLORS.today, fillOpacity: 0.4 } },
                    polyline: false, circle: false, marker: false, circlemarker: false
                },
                edit: {
                    featureGroup: drawnItemsRef.current,
                    remove: true,
                    edit: false
                }
            });

            m.addControl(drawControl);

            m.on(L.Draw.Event.CREATED, async function (e) {
                const layer = e.layer;
                // Read current zoneType directly from the component state (closure might be stale, using a ref would be better, but we read it from DOM or just pass it in)
                // Actually, due to closure inside useEffect, `zoneType` might be stale. We can get it via document.getElementById to be safe in this old-school integration pattern.
                const selectElement = document.getElementById("zoneSelectorInput");
                const currentZone = selectElement ? selectElement.value : 'today';
                const color = ZONE_COLORS[currentZone] || ZONE_COLORS.today;

                layer.setStyle({ color: color, fillOpacity: 0.4 });
                drawnItemsRef.current.addLayer(layer);

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
                    drawnItemsRef.current.removeLayer(layer);
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

            setTimeout(() => {
                m.invalidateSize();
                loadZonas();
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

    // Also reload zones when doing a manual refresh
    const handleRefresh = () => {
        toast.promise(loadZonas(), {
            loading: 'Recargando zonas...',
            success: 'Zonas recargadas',
            error: 'Error recargando zonas'
        });
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Mapa de Zonas</h1>
                    <p className="muted" style={{ margin: 0 }}>Gestión de manzanas asignadas.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.85em', fontWeight: '600' }}>Zona:</span>
                        <select id="zoneSelectorInput" value={zoneType} onChange={(e) => setZoneType(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.9em', outline: 'none', cursor: 'pointer', color: 'var(--text)', fontWeight: '600' }}>
                            <option value="today">🔵 Hoy</option>
                            <option value="done">🔴 Realizada</option>
                            <option value="extra">🟠 Extra</option>
                        </select>
                    </div>
                    <Button variant="secondary" onClick={handleRefresh}>
                        <RefreshCw size={16} /> Refrescar
                    </Button>
                </div>
            </div>

            <div style={{ flex: 1, width: '100%', minHeight: '600px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', zIndex: 1 }}>
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '600px' }}></div>
            </div>
        </div>
    );
}
