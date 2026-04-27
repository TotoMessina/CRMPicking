import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Heart, X, User, Calendar, MapPin, Activity, 
    AlertCircle, CheckCircle2, RotateCcw, Info, Star,
    Navigation, Map as MapIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getChurnRisk } from '../utils/riskScoring';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Card Component ---
const SwipeCard = ({ client, onSwipe, index }) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-25, 25]);
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
    const heartOpacity = useTransform(x, [50, 150], [0, 1]);
    const xOpacity = useTransform(x, [-50, -150], [0, 1]);

    const handleDragEnd = (event, info) => {
        if (info.offset.x > 100) {
            onSwipe('right', client);
        } else if (info.offset.x < -100) {
            onSwipe('left', client);
        }
    };

    return (
        <motion.div
            style={{ 
                x, rotate, opacity,
                zIndex: 100 - index,
                position: 'absolute',
                width: '100%',
                height: '100%',
                cursor: 'grab',
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            whileTap={{ cursor: 'grabbing' }}
        >
            <div className="tinder-card-inner">
                <div className="card-image-placeholder">
                    <div className="header-pattern"></div>
                    <div className="client-initials">
                        {client.clientes?.nombre_local?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="risk-tag" style={{ background: client.risk?.color }}>
                        {client.risk?.level.toUpperCase()}
                    </div>
                    
                    {/* Visual Feedback Overlays - Now inside the header to avoid layout shift */}
                    <motion.div style={{ opacity: heartOpacity }} className="swipe-overlay right">
                        <Heart size={60} fill="#10b981" color="#10b981" />
                    </motion.div>
                    <motion.div style={{ opacity: xOpacity }} className="swipe-overlay left">
                        <X size={60} color="#ef4444" />
                    </motion.div>
                </div>

                <div className="card-content">
                    <h2 className="client-name">{client.clientes?.nombre_local}</h2>
                    <div className="client-detail">
                        <MapPin size={16} />
                        <span>{client.clientes?.direccion || 'Sin dirección'}</span>
                    </div>
                    <div className="client-detail">
                        <Activity size={16} />
                        <span>Última actividad: {client.ultima_actividad ? new Date(client.ultima_actividad).toLocaleDateString() : 'Nunca'}</span>
                    </div>
                    
                    <div className="risk-info">
                        <Info size={16} />
                        <span>{client.risk?.diasSinContacto} días sin contacto</span>
                    </div>

                    <div className="card-footer-info">
                        <div className="badge secondary">
                            {client.rubro || 'General'}
                        </div>
                        <div className="badge accent">
                            {client.estado}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function TinderClientes() {
    const { empresaActiva } = useAuth();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().split('T')[0];
    });

    const [stats, setStats] = useState({ added: 0, postponed: 0, scheduled: 0 });
    const [existingVisits, setExistingVisits] = useState([]);
    
    // Map Refs
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markersLayerRef = useRef(null);
    const currentMarkerRef = useRef(null);
    const routeLineRef = useRef(null);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (!mapRef.current) {
            const m = L.map(mapContainerRef.current, { zoomControl: false }).setView([-34.62, -58.44], 12);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution: "© OpenStreetMap",
            }).addTo(m);
            
            L.control.zoom({ position: 'bottomright' }).addTo(m);
            markersLayerRef.current = L.layerGroup().addTo(m);
            currentMarkerRef.current = L.layerGroup().addTo(m);
            routeLineRef.current = L.featureGroup().addTo(m);
            mapRef.current = m;
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    // Load clients with risk
    const fetchCandidates = useCallback(async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('empresa_cliente')
                .select('id, cliente_id, estado, rubro, ultima_actividad, updated_at, created_at, fecha_proximo_contacto')
                .eq('empresa_id', empresaActiva.id)
                .eq('activo', true)
                .limit(100);

            if (data) {
                const clienteIds = data.map(ec => ec.cliente_id).filter(Boolean);
                const { data: raw } = await supabase
                    .from('clientes')
                    .select('id, nombre_local, direccion, lat, lng')
                    .in('id', clienteIds);
                
                const clientMap = {};
                (raw || []).forEach(c => clientMap[c.id] = c);

                const processed = data
                    .map(ec => ({
                        ...ec,
                        clientes: clientMap[ec.cliente_id],
                        risk: getChurnRisk(ec)
                    }))
                    .filter(c => c.clientes)
                    .sort((a, b) => b.risk.score - a.risk.score);
                
                setClients(processed);
            }
        } catch (e) {
            console.error(e);
            toast.error('Error al cargar candidatos');
        } finally {
            setLoading(false);
        }
    }, [empresaActiva]);

    // Fetch existing visits for stats and map
    const fetchExistingVisits = useCallback(async () => {
        if (!empresaActiva?.id || !usuarioSeleccionado || !fechaSeleccionada) {
            setExistingVisits([]);
            setStats(prev => ({ ...prev, scheduled: 0 }));
            return;
        }

        try {
            const { data: visitasRaw, error: vError } = await supabase
                .from('visitas_diarias')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .eq('usuario_asignado_email', usuarioSeleccionado)
                .eq('fecha_asignada', fechaSeleccionada)
                .order('orden', { ascending: true });

            if (vError) throw vError;
            if (!visitasRaw || visitasRaw.length === 0) {
                setExistingVisits([]);
                setStats(prev => ({ ...prev, scheduled: 0 }));
                return;
            }

            const clienteIds = [...new Set(visitasRaw.map(v => v.cliente_id))];
            const { data: clientesRaw, error: cError } = await supabase
                .from('clientes')
                .select('id, nombre_local, lat, lng')
                .in('id', clienteIds);
            
            if (cError) throw cError;

            const clienteMap = {};
            (clientesRaw || []).forEach(c => { clienteMap[c.id] = c; });

            const enriched = visitasRaw.map(v => ({
                ...v,
                clientes: clienteMap[v.cliente_id] || null
            }));

            setExistingVisits(enriched);
            setStats(prev => ({ ...prev, scheduled: enriched.length }));
        } catch (e) {
            console.error('Error fetching existing visits:', e);
        }
    }, [empresaActiva, usuarioSeleccionado, fechaSeleccionada]);

    // Load users for assignment
    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchUsers = async () => {
            const { data: euData } = await supabase.from('empresa_usuario').select('usuario_email').eq('empresa_id', empresaActiva.id);
            const emails = (euData || []).map(e => e.usuario_email);
            if (emails.length === 0) return;
            const { data: usersData } = await supabase.from('usuarios').select('email, nombre').in('email', emails).order('nombre');
            setUsuarios((usersData || []).map(u => ({ email: u.email, nombre: u.nombre || u.email })));
        };
        fetchUsers();
    }, [empresaActiva]);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    useEffect(() => {
        fetchExistingVisits();
    }, [fetchExistingVisits]);

    // Update Map Markers and Route
    useEffect(() => {
        if (!mapRef.current || !markersLayerRef.current || !routeLineRef.current) return;
        
        markersLayerRef.current.clearLayers();
        currentMarkerRef.current.clearLayers();
        routeLineRef.current.clearLayers();

        const routePoints = [];
        const allPoints = [];

        existingVisits.forEach((v, idx) => {
            if (v.clientes?.lat && v.clientes?.lng) {
                const pos = [v.clientes.lat, v.clientes.lng];
                const icon = L.divIcon({
                    className: 'custom-marker scheduled',
                    html: `<div style="background: #0c0c0c; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: 800; box-shadow: var(--shadow-md);">${idx + 1}</div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });
                
                L.marker(pos, { icon }).addTo(markersLayerRef.current)
                    .bindTooltip(`${idx + 1}. ${v.clientes.nombre_local}`, { direction: 'top', offset: [0, -10] });
                
                routePoints.push(pos);
                allPoints.push(pos);
            }
        });

        if (routePoints.length > 1) {
            L.polyline(routePoints, { color: '#0c0c0c', weight: 4, opacity: 0.6, lineJoin: 'round' }).addTo(routeLineRef.current);
        }

        const currentClient = clients[0]?.clientes;
        if (currentClient?.lat && currentClient?.lng) {
            const pos = [currentClient.lat, currentClient.lng];
            const icon = L.divIcon({
                className: 'custom-marker current',
                html: `<div style="position: relative; width: 24px; height: 24px;"><div style="position: absolute; inset: 0; background: #0c0c0c; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div><div style="position: relative; background: #0c0c0c; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; color: white;"><span style="font-size: 10px; font-weight: 900;">★</span></div></div>`,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            
            L.marker(pos, { icon }).addTo(currentMarkerRef.current)
                .bindTooltip('<b>PRÓXIMO:</b> ' + currentClient.nombre_local, { permanent: true, className: 'tooltip-premium', direction: 'top', offset: [0, -15] });
            
            allPoints.push(pos);

            if (routePoints.length > 0) {
                const lastPoint = routePoints[routePoints.length - 1];
                L.polyline([lastPoint, pos], { color: '#333', weight: 3, opacity: 0.5, dashArray: '8, 8', lineJoin: 'round' }).addTo(routeLineRef.current);
            }
        }

        if (allPoints.length > 0 && mapRef.current) {
            const bounds = L.latLngBounds(allPoints);
            mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
        }
    }, [existingVisits, clients]);

    const handleSwipe = async (direction, client) => {
        setClients(prev => prev.filter(c => c.id !== client.id));

        if (direction === 'right') {
            if (!usuarioSeleccionado) {
                toast.error('Selecciona un vendedor primero');
                setClients(prev => [client, ...prev]); // Put it back
                return;
            }

            const { error } = await supabase.from('visitas_diarias').insert([{
                empresa_id: empresaActiva.id,
                cliente_id: client.cliente_id,
                usuario_asignado_email: usuarioSeleccionado,
                fecha_asignada: fechaSeleccionada,
                estado: 'Pendiente',
                orden: 999 
            }]);

            if (error) {
                console.error('Error inserting visit:', error);
                toast.error('Error al agregar a la ruta');
                setClients(prev => [client, ...prev]); // Put it back
            } else {
                toast.success(`Agregado a ${usuarioSeleccionado.split('@')[0]}`, { icon: '🚀' });
                setStats(prev => ({ ...prev, added: prev.added + 1, scheduled: prev.scheduled + 1 }));
                fetchExistingVisits(); // Refresh map
            }
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            const { error } = await supabase
                .from('empresa_cliente')
                .update({ fecha_proximo_contacto: dateStr })
                .eq('id', client.id);

            if (error) {
                console.error('Error postponing client:', error);
                toast.error('Error al posponer');
                setClients(prev => [client, ...prev]); // Put it back
            } else {
                toast('Pospuesto para mañana', { icon: '⏰' });
                setStats(prev => ({ ...prev, postponed: prev.postponed + 1 }));
            }
        }
    };

    return (
        <div className="tinder-page">
            <header className="tinder-header">
                <div className="tinder-title-row">
                    <div className="tinder-title">
                        <Star className="text-accent" fill="currentColor" />
                        <h1>Prospecteo Inteligente</h1>
                    </div>
                    <div className="tinder-stats-summary">
                        <div className="stat-pill primary">
                            <Navigation size={14} />
                            <span>{stats.scheduled} Agendados hoy</span>
                        </div>
                    </div>
                </div>
                
                <div className="tinder-controls">
                    <div className="control-group">
                        <label><User size={14} /> Vendedor</label>
                        <select 
                            value={usuarioSeleccionado} 
                            onChange={e => setUsuarioSeleccionado(e.target.value)}
                            className="tinder-select"
                        >
                            <option value="">Elegir...</option>
                            {usuarios.map(u => <option key={u.email} value={u.email}>{u.nombre}</option>)}
                        </select>
                    </div>
                    <div className="control-group">
                        <label><Calendar size={14} /> Fecha</label>
                        <input 
                            type="date" 
                            value={fechaSeleccionada} 
                            onChange={e => setFechaSeleccionada(e.target.value)}
                            className="tinder-input"
                        />
                    </div>
                </div>

                <div className="tinder-stats-row">
                    <div className="stat-item">
                        <CheckCircle2 size={16} className="text-success" />
                        <span>{stats.added} Sesión actual</span>
                    </div>
                    <div className="stat-item">
                        <RotateCcw size={16} className="text-warning" />
                        <span>{stats.postponed} Pospuestos</span>
                    </div>
                </div>
            </header>

            <div className="tinder-content-grid">
                <main className="tinder-main">
                    {loading ? (
                        <div className="tinder-loading">
                            <div className="loader-ring"></div>
                            <p>Buscando mejores candidatos...</p>
                        </div>
                    ) : clients.length > 0 ? (
                        <>
                            <div className="card-stack-container">
                                <AnimatePresence>
                                    {clients.slice(0, 3).reverse().map((client, index) => (
                                        <SwipeCard 
                                            key={client.id} 
                                            client={client} 
                                            index={index}
                                            onSwipe={handleSwipe}
                                        />
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="tinder-footer">
                                <button 
                                    className="action-btn decline" 
                                    onClick={() => clients[0] && handleSwipe('left', clients[0])}
                                    disabled={clients.length === 0}
                                >
                                    <X size={32} />
                                </button>
                                <button 
                                    className="action-btn accept" 
                                    onClick={() => clients[0] && handleSwipe('right', clients[0])}
                                    disabled={clients.length === 0}
                                >
                                    <Heart size={32} fill="currentColor" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="tinder-empty">
                            <div className="empty-icon">✨</div>
                            <h2>¡Todo listo por ahora!</h2>
                            <p>No hay más clientes con riesgo alto que requieran atención inmediata.</p>
                            <button className="btn-refetch" onClick={fetchCandidates}>
                                Recargar candidatos
                            </button>
                        </div>
                    )}
                </main>

                <aside className="tinder-map-container">
                    <div className="map-wrapper">
                        <div ref={mapContainerRef} className="map-view" />
                        <div className="map-overlay-info">
                            <MapIcon size={14} />
                            <span>Mapa de Ruta en Vivo</span>
                        </div>
                    </div>
                </aside>
            </div>

            <style>{`
                .tinder-page {
                    height: calc(100vh - 64px);
                    display: flex;
                    flex-direction: column;
                    background: linear-gradient(135deg, var(--bg) 0%, var(--bg-elevated) 100%);
                    color: var(--text);
                    overflow: hidden;
                    padding: 24px;
                    font-family: 'Outfit', sans-serif;
                }

                .tinder-header {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 20px;
                    padding: 20px;
                    background: var(--bg-glass);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border);
                    border-radius: 24px;
                    box-shadow: var(--shadow-lg);
                }

                .tinder-title-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .tinder-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .tinder-title h1 {
                    font-size: 1.6rem;
                    font-weight: 800;
                    margin: 0;
                    letter-spacing: -0.03em;
                    background: linear-gradient(135deg, var(--text) 0%, var(--text-muted) 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .stat-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 50px;
                    font-size: 0.8rem;
                    font-weight: 700;
                }

                .stat-pill.primary {
                    background: var(--accent-soft);
                    color: var(--accent);
                    border: 1px solid var(--border);
                }

                .tinder-controls {
                    display: flex;
                    gap: 16px;
                    flex-wrap: wrap;
                }

                .control-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    flex: 1;
                    min-width: 160px;
                }

                .control-group label {
                    font-size: 0.65rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .tinder-select, .tinder-input {
                    background: var(--bg-elevated);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 8px 12px;
                    color: var(--text);
                    font-size: 0.85rem;
                    outline: none;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .tinder-select:focus, .tinder-input:focus {
                    border-color: var(--accent);
                    box-shadow: 0 0 0 3px var(--accent-soft);
                }

                .tinder-stats-row {
                    display: flex;
                    gap: 20px;
                    padding-top: 10px;
                    border-top: 1px solid var(--border);
                }

                .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--text-muted);
                }

                .tinder-content-grid {
                    flex: 1;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                    min-height: 0;
                }

                .tinder-main {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    padding: 10px 0;
                    gap: 32px;
                }

                .card-stack-container {
                    position: relative;
                    width: 100%;
                    max-width: 360px;
                    height: 500px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .tinder-card-inner {
                    width: 100%;
                    height: 100%;
                    background: var(--bg-card);
                    border-radius: 32px;
                    border: 1px solid var(--border);
                    box-shadow: var(--shadow-lg);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    margin: 0;
                    padding: 0;
                }

                .card-image-placeholder {
                    width: 100%;
                    height: 220px;
                    background: linear-gradient(135deg, #1a1a1a 0%, #0c0c0c 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                    flex-shrink: 0;
                }

                .header-pattern {
                    position: absolute;
                    inset: 0;
                    opacity: 0.15;
                    background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0);
                    background-size: 24px 24px;
                }

                .client-initials {
                    font-size: 6rem;
                    font-weight: 900;
                    color: white;
                    opacity: 0.25;
                    letter-spacing: -6px;
                    z-index: 1;
                    text-shadow: 0 10px 20px rgba(0,0,0,0.2);
                    user-select: none;
                }

                .risk-tag {
                    position: absolute;
                    top: 24px;
                    left: 24px;
                    padding: 6px 16px;
                    border-radius: 50px;
                    color: white;
                    font-weight: 800;
                    font-size: 0.7rem;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    z-index: 5;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .swipe-overlay {
                    position: absolute;
                    top: 24px;
                    z-index: 10;
                    pointer-events: none;
                }

                .swipe-overlay.right { 
                    right: 24px; 
                    transform: rotate(-12deg); 
                    border: 4px solid var(--success); 
                    padding: 10px; 
                    border-radius: 20px; 
                    background: rgba(16, 185, 129, 0.3);
                    backdrop-filter: blur(8px);
                }
                .swipe-overlay.left { 
                    left: 24px; 
                    transform: rotate(12deg); 
                    border: 4px solid var(--danger); 
                    padding: 10px; 
                    border-radius: 20px; 
                    background: rgba(239, 68, 68, 0.3);
                    backdrop-filter: blur(8px);
                }

                .card-content {
                    padding: 28px;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                    background: var(--bg-card);
                }

                .client-name {
                    font-size: 1.6rem;
                    font-weight: 900;
                    margin: 0;
                    color: var(--text);
                    line-height: 1.1;
                    letter-spacing: -0.02em;
                }

                .client-detail {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .risk-info {
                    margin-top: 10px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: var(--accent);
                    font-weight: 700;
                    font-size: 0.9rem;
                    background: var(--accent-soft);
                    padding: 12px 16px;
                    border-radius: 16px;
                    border: 1px solid var(--border);
                }

                .card-footer-info {
                    margin-top: auto;
                    display: flex;
                    gap: 12px;
                }

                .badge {
                    padding: 6px 14px;
                    border-radius: 10px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.03em;
                }

                .badge.secondary { background: var(--bg-active); color: var(--text-muted); }
                .badge.accent { background: var(--accent-soft); color: var(--accent); }

                .tinder-footer {
                    display: flex;
                    justify-content: center;
                    gap: 48px;
                    padding-bottom: 10px;
                }

                .action-btn {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                    background: var(--bg-card);
                    color: var(--text);
                    border: 1px solid var(--border);
                }

                .action-btn:hover:not(:disabled) { transform: scale(1.15) translateY(-6px); box-shadow: 0 15px 35px rgba(0,0,0,0.15); }
                .action-btn.decline { color: var(--danger); }
                .action-btn.accept { background: linear-gradient(135deg, var(--success) 0%, #059669 100%); color: white; border: none; }

                /* Map Styles */
                .tinder-map-container {
                    background: var(--bg-glass);
                    border: 1px solid var(--border);
                    border-radius: 32px;
                    overflow: hidden;
                    box-shadow: var(--shadow-lg);
                    position: relative;
                }

                .map-wrapper { width: 100%; height: 100%; position: relative; }
                .map-view { width: 100%; height: 100%; background: #f0f0f0; }

                .map-overlay-info {
                    position: absolute;
                    top: 24px;
                    right: 24px;
                    z-index: 1000;
                    background: var(--bg-glass);
                    backdrop-filter: blur(12px);
                    padding: 10px 20px;
                    border-radius: 50px;
                    border: 1px solid var(--border);
                    font-size: 0.8rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: var(--shadow-md);
                }

                .tooltip-premium {
                    background: var(--bg-elevated) !important;
                    color: var(--text) !important;
                    border: 1px solid var(--accent) !important;
                    border-radius: 12px !important;
                    box-shadow: var(--shadow-lg) !important;
                    font-family: 'Outfit', sans-serif !important;
                    padding: 8px 12px !important;
                }

                @keyframes ping {
                    75%, 100% { transform: scale(2.5); opacity: 0; }
                }

                .loader-ring {
                    width: 50px;
                    height: 50px;
                    border: 4px solid var(--accent-soft);
                    border-top: 4px solid var(--accent);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }

                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                @media (max-width: 1024px) {
                    .tinder-content-grid { grid-template-columns: 1fr; }
                    .tinder-map-container { height: 400px; }
                    .tinder-page { overflow-y: auto; }
                    .tinder-main { padding-bottom: 40px; }
                }

                @media (max-width: 600px) {
                    .tinder-page { padding: 16px; }
                    .tinder-header { padding: 20px; border-radius: 24px; }
                    .card-stack-container { height: 500px; }
                    .card-image-placeholder { height: 200px; }
                    .action-btn { width: 64px; height: 64px; }
                    .tinder-footer { gap: 32px; }
                }
            `}</style>
        </div>
    );
}
