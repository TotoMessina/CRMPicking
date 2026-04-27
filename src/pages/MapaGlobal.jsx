import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Map as MapIcon, Users, Truck, Activity, RefreshCw, Navigation, Layers, Filter, X, History, Calendar, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import L from 'leaflet';
window.L = window.L || L;
import 'leaflet/dist/leaflet.css';

// Shared Map Components
import { MapControlBar } from '../components/map/MapControlBar';
import { MapStatsBadge } from '../components/map/MapStatsBadge';
import { MapLegend } from '../components/map/MapLegend';

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

    // History Tracking Mode
    const [historyMode, setHistoryMode] = useState(false);
    const [historyUser, setHistoryUser] = useState('');
    const [historyDate, setHistoryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const historyLayerRef = useRef(L.layerGroup());

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [showLegendMobile, setShowLegendMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

        // No intentar cargar si no hay internet
        if (!navigator.onLine) {
            setLoading(false);
            return;
        }

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
            
            // Load users for history selection
            const { data: usersInfo } = await supabase
                .from('usuarios')
                .select('id, nombre, email')
                .eq('role', 'vendedor'); // Or just get all if needed
            setAvailableUsers(usersInfo || []);

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

    const fetchHistory = async () => {
        if (!historyUser || !historyDate || !empresaActiva?.id) return;
        setHistoryLoading(true);
        const tId = toast.loading("Cargando recorrido...");
        
        try {
            const { data: hist, error } = await supabase
                .from('historial_ubicaciones')
                .select('*')
                .eq('usuario_id', historyUser)
                .eq('empresa_id', empresaActiva.id)
                .gte('fecha', `${historyDate}T00:00:00Z`)
                .lte('fecha', `${historyDate}T23:59:59Z`)
                .order('fecha', { ascending: true });

            if (error) throw error;
            setHistoryData(hist || []);
            
            if (!hist?.length) {
                toast.error("No se encontraron movimientos para esta fecha", { id: tId });
            } else {
                toast.success(`Se encontraron ${hist.length} puntos`, { id: tId });
            }
        } catch (err) {
            console.error("Error fetching history:", err);
            toast.error("Error al cargar historial", { id: tId });
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        if (historyMode && historyUser && historyDate) {
            fetchHistory();
        }
    }, [historyMode, historyUser, historyDate]);

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
        historyLayerRef.current.addTo(m);

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

        // 4. Historial (Polyline)
        const histLayer = historyLayerRef.current;
        histLayer.clearLayers();
        if (historyMode && historyData.length > 1) {
            const latlngs = historyData.map(p => [p.lat, p.lng]);
            const polyline = L.polyline(latlngs, {
                color: '#0c0c0c',
                weight: 4,
                opacity: 0.8,
                dashArray: '5, 10'
            }).addTo(histLayer);

            // Add arrows or flow indicators
            // (Simple version: add a marker for start and end)
            const start = historyData[0];
            const end = historyData[historyData.length - 1];

            L.circleMarker([start.lat, start.lng], { radius: 8, fillColor: '#22c55e', color: '#fff', weight: 3, fillOpacity: 1 })
                .bindPopup(`<b>Inicio Jornada</b><br>${format(parseISO(start.fecha), 'HH:mm')}`)
                .addTo(histLayer);

            L.circleMarker([end.lat, end.lng], { radius: 8, fillColor: '#ef4444', color: '#fff', weight: 3, fillOpacity: 1 })
                .bindPopup(`<b>Última Posición</b><br>${format(parseISO(end.fecha), 'HH:mm')}`)
                .addTo(histLayer);

            // Center map on path if newly loaded
            if (mapRef.current && historyData.length > 0) {
                mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
            }
        }

        updateVisibleCounts();
    }, [data, visibility, updateVisibleCounts, mapReady]);

    const toggleVisibility = (cat) => {
        setVisibility(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    return (
        <div className="map-immersive-container">
            
            {/* MAIN MAP VIEW */}
            <div className="map-main-view">
                <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

                {/* OVERLAY: MULTI-STATS BADGE */}
                <MapStatsBadge>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? '10px' : '20px', textAlign: 'center' }}>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: CATEGORY_COLORS.clientes, fontWeight: 800, textTransform: 'uppercase' }}>Clientes</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>{totals.clientes}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: isMobile ? '10px' : '20px' }}>
                            <div style={{ fontSize: '0.65rem', color: CATEGORY_COLORS.consumidores, fontWeight: 800, textTransform: 'uppercase' }}>Consum.</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>{totals.consumidores}</div>
                        </div>
                        <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: isMobile ? '10px' : '20px' }}>
                            <div style={{ fontSize: '0.65rem', color: CATEGORY_COLORS.repartidores, fontWeight: 800, textTransform: 'uppercase' }}>Repart.</div>
                            <div style={{ fontSize: '1rem', fontWeight: 800 }}>{totals.repartidores}</div>
                        </div>
                    </div>
                </MapStatsBadge>

                {/* OVERLAY: LEGEND */}
                <MapLegend 
                    title="Capas Activas"
                    items={Object.entries(CATEGORY_COLORS).map(([key, color]) => ({ 
                        label: `${key.charAt(0).toUpperCase() + key.slice(1)} (${countsInZone[key]})`, 
                        color 
                    }))}
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
                        📋 Capas ({Object.values(visibility).filter(v => v).length})
                    </button>
                )}

                {/* OVERLAY: HISTORY PANEL */}
                {historyMode && (
                    <div style={{
                        position: 'absolute', top: isMobile ? '80px' : '20px', right: '20px', zIndex: 1000,
                        width: isMobile ? 'calc(100% - 40px)' : '320px',
                        background: 'var(--bg-glass)', backdropFilter: 'blur(16px)',
                        padding: '20px', borderRadius: '16px', border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-xl)', animation: 'slide-up 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <History size={18} className="text-accent" />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Historial de Ruta</h3>
                            </div>
                            <button onClick={() => setHistoryMode(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>ACTIVADOR</label>
                                <select 
                                    className="input premium-input" 
                                    style={{ width: '100%' }}
                                    value={historyUser}
                                    onChange={e => setHistoryUser(e.target.value)}
                                >
                                    <option value="">Seleccionar usuario...</option>
                                    {availableUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre || u.email}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>FECHA</label>
                                <input 
                                    type="date" 
                                    className="input premium-input" 
                                    style={{ width: '100%' }}
                                    value={historyDate}
                                    onChange={e => setHistoryDate(e.target.value)}
                                />
                            </div>

                            {historyData.length > 0 && (
                                <div style={{ background: 'var(--bg-body)', padding: '12px', borderRadius: '12px', marginTop: '4px' }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Distancia aprox:</span>
                                        <span className="text-accent">
                                            {(historyData.length * 0.15).toFixed(1)} km
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {historyData.length} puntos registrados cada 1 min.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>


            {/* BOTTOM CONTROL BAR */}
            <MapControlBar isMobile={isMobile}>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <Button 
                        variant={visibility.clientes ? 'primary' : 'secondary'} 
                        size="sm" 
                        onClick={() => toggleVisibility('clientes')}
                        style={{ borderRadius: '12px', height: '40px', padding: '0 15px' }}
                    >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS.clientes, marginRight: '8px' }}></div>
                        Clientes
                    </Button>
                    <Button 
                        variant={visibility.consumidores ? 'primary' : 'secondary'} 
                        size="sm" 
                        onClick={() => toggleVisibility('consumidores')}
                        style={{ borderRadius: '12px', height: '40px', padding: '0 15px' }}
                    >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS.consumidores, marginRight: '8px' }}></div>
                        Consumidores
                    </Button>
                    <Button 
                        variant={visibility.repartidores ? 'primary' : 'secondary'} 
                        size="sm" 
                        onClick={() => toggleVisibility('repartidores')}
                        style={{ borderRadius: '12px', height: '40px', padding: '0 15px' }}
                    >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS.repartidores, marginRight: '8px' }}></div>
                        Repartidores
                    </Button>
                </div>

                <div style={{ width: '1px', height: '24px', background: 'var(--border)', flexShrink: 0, margin: '0 8px' }}></div>

                <Button variant="secondary" onClick={fetchData} disabled={loading} style={{ borderRadius: '12px', height: '40px' }}>
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {isMobile ? '' : 'Refrescar'}
                </Button>

                <div style={{ borderLeft: '1px solid var(--border)', height: '24px', margin: '0 8px' }}></div>

                <Button 
                    variant={historyMode ? "primary" : "secondary"} 
                    onClick={() => setHistoryMode(!historyMode)}
                    style={{ borderRadius: '12px', height: '40px', padding: '0 16px', gap: '8px' }}
                >
                    <History size={16} />
                    <span className="hide-mobile">Historial Ruta</span>
                </Button>
            </MapControlBar>

            <style tabIndex="-1">{`
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
