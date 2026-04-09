import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Map as MapIcon, Users, Truck, Activity, RefreshCw, Navigation, Layers, Filter, X } from 'lucide-react';
import toast from 'react-hot-toast';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';

const CATEGORY_COLORS = {
    clientes: "#3b82f6",     // Azul
    consumidores: "#ec4899", // Rosa
    repartidores: "#10b981"  // Verde
};

export default function MapaGlobal() {
    const { empresaActiva } = useAuth();
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const layersRef = useRef({
        clientes: L.layerGroup(),
        consumidores: L.layerGroup(),
        repartidores: L.layerGroup()
    });

    const [data, setData] = useState({
        clientes: [],
        consumidores: [],
        repartidores: []
    });

    const [visibility, setVisibility] = useState({
        clientes: true,
        consumidores: true,
        repartidores: true
    });

    const [countsInZone, setCountsInZone] = useState({
        clientes: 0,
        consumidores: 0,
        repartidores: 0
    });

    const [totals, setTotals] = useState({
        clientes: 0,
        consumidores: 0,
        repartidores: 0
    });

    const [mapReady, setMapReady] = useState(false);
    const [loading, setLoading] = useState(true);

    const applyJitter = (lat, lng, id = 0) => {
        // Use id/index to make jitter deterministic per marker if possible, 
        // or just increase random spread for better visibility
        const spread = 0.0004; 
        return [
            Number(lat) + (Math.random() - 0.5) * spread,
            Number(lng) + (Math.random() - 0.5) * spread
        ];
    };

    const fetchData = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        const toastId = toast.loading("Cargando datos globales...");

        try {
            // 0. Fetch Absolute Totals independently (Resilient loading)
            const fetchCount = async (table, isActive = false) => {
                try {
                    const query = supabase.from(table).select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id);
                    if (isActive) query.eq('activo', true);
                    const { count, error } = await query;
                    if (error) throw error;
                    return count || 0;
                } catch (e) {
                    console.warn(`Error counting ${table}:`, e);
                    return null; // Signals fallback needed
                }
            };

            const [consCount, rCount] = await Promise.all([
                fetchCount('consumidores', true),
                fetchCount('repartidores')
            ]);

            // Note: We skip direct count for 'clientes_empresa' because it often triggers 404/permission errors.
            // We will use the RPC result length as the source of truth for Clientes total.

            setTotals({
                clientes: 0, // Will be set after RPC
                consumidores: consCount || 0,
                repartidores: rCount || 0
            });

            // 1. Clientes (using RPC with higher limit)
            const { data: cliData, error: cliError } = await supabase.rpc('buscar_clientes_empresa', {
                p_empresa_id: empresaActiva.id,
                p_limit: 15000
            });

            if (cliError) throw cliError;
            
            const mappedClientes = (cliData || [])
                .filter(row => row.lat != null && row.lng != null)
                .map(row => {
                    const [jLat, jLng] = applyJitter(row.lat, row.lng);
                    return {
                        id: row.cliente_id,
                        nombre: row.nombre,
                        lat: jLat,
                        lng: jLng,
                        tipo: 'cliente'
                    };
                });

            // 2. Consumidores
            const { data: consData, error: consError } = await supabase
                .from('consumidores')
                .select('id, nombre, lat, lng')
                .eq('empresa_id', empresaActiva.id)
                .eq('activo', true)
                .not('lat', 'is', null);
            
            if (consError) throw consError;

            const mappedConsumidores = (consData || [])
                .map(c => {
                    const [jLat, jLng] = applyJitter(c.lat, c.lng);
                    return {
                        id: c.id,
                        nombre: c.nombre,
                        lat: jLat,
                        lng: jLng,
                        tipo: 'consumidor'
                    };
                });

            // 3. Repartidores
            const { data: repData, error: repError } = await supabase
                .from('repartidores')
                .select('id, nombre, lat, lng')
                .eq('empresa_id', empresaActiva.id)
                .not('lat', 'is', null);

            if (repError) throw repError;

            const mappedRepartidores = (repData || [])
                .map(r => {
                    const [jLat, jLng] = applyJitter(r.lat, r.lng);
                    return {
                        id: r.id,
                        nombre: r.nombre,
                        lat: jLat,
                        lng: jLng,
                        tipo: 'repartidor'
                    };
                });

            setData({
                clientes: mappedClientes,
                consumidores: mappedConsumidores,
                repartidores: mappedRepartidores
            });

            // Set totals with fallback to local length
            setTotals({
                clientes: mappedClientes.length, // RPC is the primary source for clientes
                consumidores: consCount !== null ? consCount : mappedConsumidores.length,
                repartidores: rCount !== null ? rCount : mappedRepartidores.length
            });

            toast.success("Mapa global actualizado", { id: toastId });
        } catch (error) {
            console.error("fetchData Global Error:", error);
            toast.error("Error al cargar datos", { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const updateVisibleCounts = useCallback(() => {
        if (!mapRef.current) return;
        const bounds = mapRef.current.getBounds();
        
        const newCounts = {
            clientes: data.clientes.filter(p => bounds.contains(L.latLng(p.lat, p.lng))).length,
            consumidores: data.consumidores.filter(p => bounds.contains(L.latLng(p.lat, p.lng))).length,
            repartidores: data.repartidores.filter(p => bounds.contains(L.latLng(p.lat, p.lng))).length
        };
        
        setCountsInZone(newCounts);
    }, [data]);

    useEffect(() => {
        fetchData();
    }, [empresaActiva]);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;
        
        // Prevent doubling initialization by checking if it already has a _leaflet_id
        const container = mapContainerRef.current;
        if (container._leaflet_id && mapRef.current) return;

        // Ensure container is empty and fresh
        if (container._leaflet_id) {
            container._leaflet_id = null;
            container.innerHTML = "";
        }

        const m = L.map(container).setView([-34.62, -58.44], 12);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap",
        }).addTo(m);

        Object.values(layersRef.current).forEach(layer => layer.addTo(m));

        m.on('moveend zoomend', updateVisibleCounts);
        mapRef.current = m;
        
        setTimeout(() => {
            m.invalidateSize();
            setMapReady(true);
        }, 100);

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setMapReady(false);
            }
        };
    }, []);

    // Sync Event Listeners with latest Data (Fix for stale closures)
    useEffect(() => {
        if (!mapRef.current || !mapReady) return;
        
        mapRef.current.on('moveend zoomend', updateVisibleCounts);
        // Initial update
        updateVisibleCounts();

        return () => {
            if (mapRef.current) {
                mapRef.current.off('moveend zoomend', updateVisibleCounts);
            }
        };
    }, [mapReady, data, updateVisibleCounts]);

    // Update Markers
    useEffect(() => {
        if (!mapRef.current) return;

        // Limpiar capas previas antes de re-dibujar
        Object.values(layersRef.current).forEach(l => l.clearLayers());

        // ORDERN DE CAPAS: Consumidores al fondo, luego Clientes, luego Repartidores arriba de todo
        
        // 1. Consumidores (Pink) - Layer 1
        if (visibility.consumidores) {
            data.consumidores.forEach(c => {
                L.circleMarker([c.lat, c.lng], {
                    radius: 5,
                    fillColor: CATEGORY_COLORS.consumidores,
                    color: "#fff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).bindPopup(`<b>Consumidor:</b> ${c.nombre}`).addTo(layersRef.current.consumidores);
            });
        }

        // 2. Clientes (Blue) - Layer 2
        if (visibility.clientes) {
            data.clientes.forEach(c => {
                L.circleMarker([c.lat, c.lng], {
                    radius: 5,
                    fillColor: CATEGORY_COLORS.clientes,
                    color: "#fff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.85
                }).bindPopup(`<b>Cliente:</b> ${c.nombre}`).addTo(layersRef.current.clientes);
            });
        }

        // 3. Repartidores (Green) - Layer 3
        if (visibility.repartidores) {
            data.repartidores.forEach(r => {
                L.circleMarker([r.lat, r.lng], {
                    radius: 5,
                    fillColor: CATEGORY_COLORS.repartidores,
                    color: "#fff",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.9
                }).bindPopup(`<b>Repartidor:</b> ${r.nombre}`).addTo(layersRef.current.repartidores);
            });
        }

        updateVisibleCounts();
    }, [data, visibility, updateVisibleCounts, mapReady]);

    const toggleVisibility = (cat) => {
        setVisibility(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MapIcon size={24} /> Mapa Global
                    </h1>
                    <p className="muted" style={{ margin: 0 }}>Vista unificada de toda la red geográfica.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <Button variant="secondary" onClick={fetchData} disabled={loading}>
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refrescar
                    </Button>
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                {/* Map */}
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '600px' }}></div>

                {/* Overlays / Toggles */}
                <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="glass-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px' }}>
                        <h3 style={{ fontSize: '0.85rem', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Capas</h3>
                        
                        <div onClick={() => toggleVisibility('clientes')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', opacity: visibility.clientes ? 1 : 0.5 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: CATEGORY_COLORS.clientes }}></div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Clientes</span>
                            <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>{countsInZone.clientes}</span>
                        </div>

                        <div onClick={() => toggleVisibility('consumidores')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', opacity: visibility.consumidores ? 1 : 0.5 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: CATEGORY_COLORS.consumidores }}></div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Consumidores</span>
                            <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>{countsInZone.consumidores}</span>
                        </div>

                        <div onClick={() => toggleVisibility('repartidores')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', opacity: visibility.repartidores ? 1 : 0.5 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: CATEGORY_COLORS.repartidores }}></div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Repartidores</span>
                            <span className="muted" style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>{countsInZone.repartidores}</span>
                        </div>
                    </div>
                </div>

                {/* Total floating badge */}
                <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000 }}>
                    <div className="map-stats-badge" style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', textAlign: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', color: CATEGORY_COLORS.clientes, fontWeight: 700, textTransform: 'uppercase' }}>Clientes</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{totals.clientes}</div>
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '15px' }}>
                                <div style={{ fontSize: '0.7rem', color: CATEGORY_COLORS.consumidores, fontWeight: 700, textTransform: 'uppercase' }}>Consum.</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{totals.consumidores}</div>
                            </div>
                            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '15px' }}>
                                <div style={{ fontSize: '0.7rem', color: CATEGORY_COLORS.repartidores, fontWeight: 700, textTransform: 'uppercase' }}>Repart.</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{totals.repartidores}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style>{`
                .glass-card {
                    background: rgba(var(--bg-card-rgb), 0.85);
                    backdrop-filter: blur(8px);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    box-shadow: var(--shadow-md);
                }
            `}</style>
        </div>
    );
}
