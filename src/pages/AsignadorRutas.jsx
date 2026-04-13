import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Plus, Trash2, X, Search, ChevronUp, ChevronDown,
    Route as RouteIcon, User, Calendar, MessageSquare, Save, Users, Map as MapIcon, Zap, List,
    GripVertical, Copy, Share2, Clock, MapPin, TrendingDown, Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { getChurnRisk } from '../utils/riskScoring';

// ─── Estilos de colores por estado ──────────────────────────────────────────
const ESTADOS_COLORES = {
    'Pendiente': { badge: '#f59e0b', badgeBg: 'rgba(245,158,11,0.15)', pin: '#f59e0b' },
    'Visitado':  { badge: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', pin: '#10b981' },
    'Ausente':   { badge: '#ef4444', badgeBg: 'rgba(239,68,68,0.12)', pin: '#ef4444' },
    'Cancelado': { badge: '#64748b', badgeBg: 'rgba(100,116,139,0.12)', pin: '#64748b' },
};

// Genera un ícono de pin numerado premium
const makeNumberedIcon = (num, color, done, isRisk) => L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    html: `<div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${done ? '#64748b' : color};
        border: 2.5px solid ${isRisk ? '#f87171' : 'white'};
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
    ">
        <span style="transform:rotate(45deg);color:white;font-weight:900;font-size:12px;">${num}</span>
    </div>`
});

// Helper: Centrar mapa en la ruta
function FitBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        if (points.length === 1) map.setView(points[0], 14);
        else map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
    }, [points, map]);
    return null;
}

// Helper: Forzar refresco de mapa al cambiar layouts
function MapResizer({ mobileTab, verMapa }) {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 400); // Dar margen para que las animaciones de CSS terminen
    }, [map, mobileTab, verMapa]);
    return null;
}

// Helper: Distancia Haversine
const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function AsignadorRutas() {
    const { empresaActiva } = useAuth();

    // Stats
    const [distanciaTotal, setDistanciaTotal] = useState(0);

    // State principal
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
        const date = new Date();
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().split('T')[0];
    });
    const [rutaActual, setRutaActual] = useState([]);
    const [loadingRuta, setLoadingRuta] = useState(false);

    // Tabs & Search
    const [tabActiva, setTabActiva] = useState('riesgo'); // 'riesgo' | 'buscar'
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sugerenciasRiesgo, setSugerenciasRiesgo] = useState([]);
    const [searching, setSearching] = useState(false);

    // UI
    const [editingComentario, setEditingComentario] = useState(null);
    const [verMapa, setVerMapa] = useState(true);
    const [mobileTab, setMobileTab] = useState('buscar'); // 'buscar' | 'ruta'

    // ─── EFFECTS ─────────────────────────────────────────────────────────────

    // 1. Cargar usuarios
    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchUsuarios = async () => {
            const { data: euData } = await supabase.from('empresa_usuario').select('usuario_email').eq('empresa_id', empresaActiva.id);
            const emails = (euData || []).map(e => e.usuario_email);
            if (emails.length === 0) return;
            const { data: usersData } = await supabase.from('usuarios').select('email, nombre').in('email', emails).order('nombre');
            setUsuarios((usersData || []).map(u => ({ email: u.email, nombre: u.nombre || u.email })));
        };
        fetchUsuarios();
    }, [empresaActiva]);

    // 2. Cargar sugerencias de Riesgo (Churn)
    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchRiesgo = async () => {
            // Buscamos clientes activos o relevados
            const { data, error } = await supabase
                .from('empresa_cliente')
                .select('id, cliente_id, estado, fecha_proximo_contacto, ultima_actividad, updated_at, created_at')
                .eq('empresa_id', empresaActiva.id)
                .eq('activo', true)
                .limit(50);
            
            if (data && data.length > 0) {
                const clienteIds = [...new Set(data.filter(ec => ec.cliente_id).map(ec => ec.cliente_id))];
                const { data: clientesRaw } = await supabase
                    .from('clientes')
                    .select('id, nombre_local, direccion, lat, lng')
                    .in('id', clienteIds);
                
                const clienteMap = {};
                (clientesRaw || []).forEach(c => { clienteMap[c.id] = c; });

                const dataConClientes = data.map(ec => ({
                    ...ec,
                    clientes: clienteMap[ec.cliente_id] || null
                }));

                const conRiesgo = dataConClientes
                    .filter(ec => ec.clientes)
                    .map(ec => ({ ...ec, risk: getChurnRisk(ec) }))
                    .filter(ec => ec.risk.level !== 'bajo')
                    .sort((a, b) => b.risk.score - a.risk.score)
                    .slice(0, 15);
                setSugerenciasRiesgo(conRiesgo);
            } else {
                setSugerenciasRiesgo([]);
            }
        };
        fetchRiesgo();
    }, [empresaActiva]);

    // 3. Cargar ruta actual
    const fetchRuta = useCallback(async () => {
        if (!usuarioSeleccionado || !fechaSeleccionada || !empresaActiva?.id) {
            setRutaActual([]); setDistanciaTotal(0); return;
        }
        setLoadingRuta(true);
        try {
            const { data: visitasRaw, error } = await supabase.from('visitas_diarias').select('*').eq('empresa_id', empresaActiva.id).eq('usuario_asignado_email', usuarioSeleccionado).eq('fecha_asignada', fechaSeleccionada).order('orden', { ascending: true });
            if (error) throw error;
            
            let rutasArmadas = [];
            if (visitasRaw && visitasRaw.length > 0) {
                const clienteIds = [...new Set(visitasRaw.map(v => v.cliente_id))];
                const { data: clientesRaw } = await supabase.from('clientes').select('id, nombre_local, direccion, lat, lng').in('id', clienteIds);
                const clienteMap = {};
                (clientesRaw || []).forEach(c => { clienteMap[c.id] = c; });
                rutasArmadas = visitasRaw.map(v => ({ ...v, clientes: clienteMap[v.cliente_id] || null }));
            }
            setRutaActual(rutasArmadas);
            
            // Calc distance
            let dist = 0;
            for (let i = 0; i < (visitasRaw?.length || 0) - 1; i++) {
                const v1 = visitasRaw[i].clientes; const v2 = visitasRaw[i+1].clientes;
                dist += getDistance(v1?.lat, v1?.lng, v2?.lat, v2?.lng);
            }
            setDistanciaTotal(dist);
        } catch (e) {
            toast.error('Error al cargar la ruta');
        } finally {
            setLoadingRuta(false);
        }
    }, [usuarioSeleccionado, fechaSeleccionada, empresaActiva]);

    useEffect(() => { fetchRuta(); }, [fetchRuta]);

    // 4. Buscador
    useEffect(() => {
        if (searchTerm.length < 2) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            const { data } = await supabase.rpc('buscar_clientes_empresa', { p_empresa_id: empresaActiva.id, p_nombre: searchTerm, p_limit: 8 });
            if (data) {
                setSearchResults(data.map(d => ({ id: d.ec_id, clientes: { id: d.cliente_id, nombre_local: d.nombre_local, direccion: d.direccion, lat: d.lat, lng: d.lng } })));
            }
            setSearching(false);
        }, 400);
        return () => clearTimeout(t);
    }, [searchTerm, empresaActiva]);

    // ─── ACCIONES ────────────────────────────────────────────────────────────

    const agregarAFila = async (ec) => {
        if (!usuarioSeleccionado) return toast.error('Seleccioná un usuario');
        const yaExiste = rutaActual.find(v => v.cliente_id === ec.clientes.id);
        if (yaExiste) return toast.error('Ya está en la ruta');

        const newOrder = rutaActual.length;
        const { data, error } = await supabase.from('visitas_diarias').insert([{
            empresa_id: empresaActiva.id, cliente_id: ec.clientes.id, usuario_asignado_email: usuarioSeleccionado, fecha_asignada: fechaSeleccionada, estado: 'Pendiente', orden: newOrder
        }]).select('*').single();

        if (error) return toast.error('Error al agregar');
        const dataConClientes = { ...data, clientes: ec.clientes };
        setRutaActual([...rutaActual, dataConClientes]);
        toast.success(`Agregado a ${usuarioSeleccionado.split('@')[0]}`);
    };

    const quitarVisita = async (id) => {
        const { error } = await supabase.from('visitas_diarias').delete().eq('id', id);
        if (error) return toast.error('Error al eliminar');
        const nueva = rutaActual.filter(v => v.id !== id);
        setRutaActual(nueva);
        // Re-ordenar
        const updates = nueva.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id));
        await Promise.all(updates);
    };

    const moverVisita = async (index, direccion) => {
        const nuevoIndex = index + direccion;
        if (nuevoIndex < 0 || nuevoIndex >= rutaActual.length) return;
        
        const items = [...rutaActual];
        const [movedItem] = items.splice(index, 1);
        items.splice(nuevoIndex, 0, movedItem);
        setRutaActual(items);
        
        // Persistir cambios
        const updates = items.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id));
        await Promise.all(updates);
    };

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const items = Array.from(rutaActual);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setRutaActual(items);
        
        // Persistir órdenes
        const updates = items.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id));
        await Promise.all(updates);
    };

    const vaciarRuta = async () => {
        if (!usuarioSeleccionado || !fechaSeleccionada || rutaActual.length === 0) return;
        if (!window.confirm('¿Estás seguro que deseas eliminar TODAS las visitas planificadas para este vendedor en esta fecha?')) return;
        
        const ids = rutaActual.map(v => v.id);
        const { error } = await supabase.from('visitas_diarias').delete().in('id', ids);
        
        if (error) {
            toast.error('Error al vaciar la ruta');
            console.error(error);
        } else {
            setRutaActual([]);
            toast.success('Ruta vaciada al 100%');
        }
    };

    const clonarUltimaRuta = async () => {
        if (!usuarioSeleccionado) return;
        setLoadingRuta(true);
        // 1. Buscar la fecha más reciente con ruta
        const { data: lastOne } = await supabase
            .from('visitas_diarias')
            .select('fecha_asignada')
            .eq('usuario_asignado_email', usuarioSeleccionado)
            .lt('fecha_asignada', fechaSeleccionada)
            .order('fecha_asignada', { ascending: false })
            .limit(1);
        
        if (!lastOne?.[0]) { toast.error('No hay rutas previas para clonar'); setLoadingRuta(false); return; }

        const lastDate = lastOne[0].fecha_asignada;

        // 2. Obtener locales de esa fecha
        const { data: aClonar } = await supabase.from('visitas_diarias').select('cliente_id, orden, comentarios_admin').eq('usuario_asignado_email', usuarioSeleccionado).eq('fecha_asignada', lastDate);
        
        if (aClonar) {
            const logs = aClonar.map(v => ({
                empresa_id: empresaActiva.id,
                cliente_id: v.cliente_id,
                usuario_asignado_email: usuarioSeleccionado,
                fecha_asignada: fechaSeleccionada,
                estado: 'Pendiente',
                orden: v.orden,
                comentarios_admin: v.comentarios_admin
            }));
            const { error } = await supabase.from('visitas_diarias').insert(logs);
            if (!error) {
                toast.success(`Ruta clonada del ${lastDate}`);
                fetchRuta();
            } else toast.error('Error al clonar');
        }
        setLoadingRuta(false);
    };

    const compartirWhatsApp = () => {
        if (rutaActual.length === 0) return;
        const nombreVendedor = usuarios.find(u => u.email === usuarioSeleccionado)?.nombre || usuarioSeleccionado;
        const header = `📍 *HOJA DE RUTA - ${fechaSeleccionada}*\n👤 Vendedor: ${nombreVendedor}\n📊 Locales: ${rutaActual.length}\n---------------------------\n\n`;
        const body = rutaActual.map((v, i) => {
            const c = v.clientes;
            const mapsLink = c?.lat ? `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}` : '';
            return `${i + 1}. *${c?.nombre_local}*\n🏠 ${c?.direccion}\n${v.comentarios_admin ? `📝 _${v.comentarios_admin}_\n` : ''}${mapsLink ? `🔗 GPS: ${mapsLink}\n` : ''}`;
        }).join('\n');
        
        const texto = encodeURIComponent(header + body + '\n\nGenerado por PickingUp CRM');
        window.open(`https://wa.me/?text=${texto}`, '_blank');
    };

    const optimizarRuta = async () => {
        if (rutaActual.length < 3) return toast('Añadí más locales', { icon: 'ℹ️' });
        
        toast.loading('Optimizando trayecto...', { id: 'opt' });
        let ruta = [...rutaActual];
        // Nearest Neighbor básico + 2-opt
        let optimizada = [];
        let p = [...ruta];
        let actual = p.shift();
        optimizada.push(actual);
        while (p.length > 0) {
            let idx = 0, minDist = Infinity;
            for (let i = 0; i < p.length; i++) {
                const d = getDistance(actual.clientes?.lat, actual.clientes?.lng, p[i].clientes?.lat, p[i].clientes?.lng);
                if (d < minDist) { minDist = d; idx = i; }
            }
            actual = p.splice(idx, 1)[0];
            optimizada.push(actual);
        }
        
        setRutaActual(optimizada);
        await Promise.all(optimizada.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id)));
        toast.success('Ruta optimizada sin cruces 🎯', { id: 'opt' });
    };

    // ─── RENDER ──────────────────────────────────────────────────────────────

    const polylinePoints = useMemo(() => 
        rutaActual.map(v => v.clientes?.lat && v.clientes?.lng ? [v.clientes.lat, v.clientes.lng] : null).filter(p => p !== null)
    , [rutaActual]);

    return (
        <div className="asign-pro-container">
            {/* 1. Header Pro */}
            <div className="asign-stats-bar">
                <div className="stat-card premium blue">
                    <div className="stat-squircle"><MapPin size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{rutaActual.length}</div>
                        <div className="stat-label">Locales</div>
                    </div>
                </div>
                <div className="stat-card premium emerald">
                    <div className="stat-squircle"><TrendingDown size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{distanciaTotal.toFixed(1)} KM</div>
                        <div className="stat-label">Distancia</div>
                    </div>
                </div>
                <div className="stat-card premium amber">
                    <div className="stat-squircle"><Clock size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">~{rutaActual.length * 15} min</div>
                        <div className="stat-label">Tiempo Est.</div>
                    </div>
                </div>
                <div className="stat-card premium violet interactive" style={{ cursor: 'pointer' }} onClick={() => setVerMapa(!verMapa)}>
                    <div className="stat-squircle"><MapIcon size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value" style={{ fontSize: '1.2rem' }}>{verMapa ? 'ACTIVO' : 'OCULTO'}</div>
                        <div className="stat-label">Mapa Visual</div>
                    </div>
                </div>
            </div>

            {/* Selector de Pestañas Mobile (Toggle) */}
            <div className="mobile-tabs-switcher">
                <button className={`m-tab-btn ${mobileTab === 'buscar' ? 'active' : ''}`} onClick={() => setMobileTab('buscar')}>
                    <Plus size={18} /> <span>Añadir</span>
                </button>
                <button className={`m-tab-btn ${mobileTab === 'ruta' ? 'active' : ''}`} onClick={() => setMobileTab('ruta')}>
                    <RouteIcon size={18} /> <span>Mi Ruta ({rutaActual.length})</span>
                </button>
            </div>

            {/* 2. Layout Principal */}
            <div className={`asign-main-grid view-${mobileTab}`}>
                
                {/* Panel Izquierdo: Controles y Sugerencias */}
                <div className={`side-panel ${mobileTab === 'buscar' ? 'mobile-visible' : 'mobile-hidden'}`}>
                    <div className="glass-card sticky-mobile-config">
                        <h3 className="asign-section-title" style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                            <User size={16} className="text-accent" /> 
                            <span>Configuración de Ruta</span>
                        </h3>
                        <div className="config-inputs-grid">
                            <select className="input premium-select" value={usuarioSeleccionado} onChange={e => setUsuarioSeleccionado(e.target.value)}>
                                <option value="">— Elegir Vendedor —</option>
                                {usuarios.map(u => <option key={u.email} value={u.email}>{u.nombre}</option>)}
                            </select>
                            <input type="date" className="input premium-input" value={fechaSeleccionada} onChange={e => setFechaSeleccionada(e.target.value)} />
                        </div>
                    </div>

                    <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div className="tabs-header">
                            <button className={`tab-btn ${tabActiva === 'riesgo' ? 'active' : ''}`} onClick={() => setTabActiva('riesgo')}>
                                Sugerencias Riesgo
                            </button>
                            <button className={`tab-btn ${tabActiva === 'buscar' ? 'active' : ''}`} onClick={() => setTabActiva('buscar')}>
                                Buscar Local
                            </button>
                        </div>

                        <div className="suggestions-list">
                            {tabActiva === 'riesgo' ? (
                                sugerenciasRiesgo.length > 0 ? (
                                    sugerenciasRiesgo.map(s => (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={s.id} className="suggestion-item" onClick={() => agregarAFila(s)}>
                                            <div className="risk-badge" style={{ background: s.risk.color, color: '#fff' }}>{s.risk.level}</div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.clientes.nombre_local}</div>
                                            <div className="muted" style={{ fontSize: '0.75rem' }}>{s.risk.diasSinContacto} días sin contacto</div>
                                        </motion.div>
                                    ))
                                ) : <div className="muted p-4 text-center">No hay alertas críticas hoy ✨</div>
                            ) : (
                                <div>
                                    <div className="asign-search-wrap">
                                        <Search size={15} className="asign-search-icon" />
                                        <input type="text" className="input" placeholder="Nombre del local..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '36px', width: '100%' }} />
                                    </div>
                                    <div style={{ marginTop: 12 }}>
                                        {searchResults.map(r => (
                                            <div key={r.id} className="suggestion-item" onClick={() => agregarAFila(r)}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontWeight: 600 }}>{r.clientes.nombre_local}</div>
                                                    <div style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>#{r.clientes.id}</div>
                                                </div>
                                                <div className="muted" style={{ fontSize: '0.7rem' }}>{r.clientes.direccion}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel Central: Ruta Drag & Drop */}
                <div className={`route-panel ${mobileTab === 'ruta' ? 'mobile-visible' : 'mobile-hidden'}`}>
                    <div className="route-list-container">
                        <div className="route-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <List size={18} />
                                <strong>Ruta del Día</strong>
                            </div>
                            {rutaActual.length > 0 && (
                                <button className="btn-link" onClick={vaciarRuta} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}>
                                    Vaciar Todo
                                </button>
                            )}
                        </div>

                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="ruta">
                                {(provided) => (
                                    <div {...provided.droppableProps} ref={provided.innerRef} className="route-list" style={{ ...provided.droppableProps.style, overflowY: 'auto', flex: 1, minHeight: '100px' }}>
                                        {loadingRuta ? <div className="p-8 text-center muted">Actualizando lista...</div> :
                                         rutaActual.length === 0 ? (
                                            <div className="p-12 text-center muted">
                                                <RouteIcon size={40} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                                                <p>No hay locales asignados.<br/>Usa el buscador o cloná la última ruta.</p>
                                            </div>
                                         ) : (
                                            rutaActual.map((v, i) => (
                                                <Draggable key={v.id} draggableId={String(v.id)} index={i}>
                                                    {(provided, snapshot) => (
                                                        <div ref={provided.innerRef} {...provided.draggableProps} className="route-item" style={{ ...provided.draggableProps.style, filter: snapshot.isDragging ? 'brightness(1.05)' : 'none' }}>
                                                            <div {...provided.dragHandleProps} className="route-handle">
                                                                <GripVertical size={18} />
                                                            </div>
                                                            <div className="route-item-content">
                                                                <div className="route-item-info">
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div className="route-sorter-arrows" style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '4px' }}>
                                                                            <button onClick={() => moverVisita(i, -1)} disabled={i === 0} className={`arrow-btn ${i === 0 ? 'disabled' : ''}`} title="Subir"><ChevronUp size={14} /></button>
                                                                            <button onClick={() => moverVisita(i, 1)} disabled={i === rutaActual.length - 1} className={`arrow-btn ${i === rutaActual.length - 1 ? 'disabled' : ''}`} title="Bajar"><ChevronDown size={14} /></button>
                                                                        </div>
                                                                        <span style={{ background: 'var(--accent)', color: '#fff', width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.clientes?.nombre_local}</div>
                                                                    </div>
                                                                    <div className="muted" style={{ fontSize: '0.75rem', marginLeft: 52 }}>{v.clientes?.direccion}</div>
                                                                    {v.comentarios_admin && (
                                                                        <div style={{ fontSize: '0.72rem', marginLeft: 52, color: 'var(--accent)', fontStyle: 'italic', marginTop: 1, background: 'rgba(124, 58, 237, 0.05)', padding: '1px 6px', borderRadius: '4px', borderLeft: '2px solid var(--accent)' }}>
                                                                            💬 {v.comentarios_admin}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="route-item-actions" style={{ display: 'flex', gap: '8px', paddingRight: '4px' }}>
                                                                    <button onClick={() => setEditingComentario({ id: v.id, texto: v.comentarios_admin || '' })} className={`premium-pill-btn ${v.comentarios_admin ? 'active' : ''}`} title={v.comentarios_admin ? 'Editar Nota' : 'Añadir Nota'}>
                                                                        <MessageSquare size={14} /> <span>{v.comentarios_admin ? 'Ver Nota' : 'Añadir Nota'}</span>
                                                                    </button>
                                                                    <button onClick={() => { if(window.confirm(`¿Quitar ${v.clientes?.nombre_local || 'el local'} de la ruta?`)) quitarVisita(v.id) }} className="premium-pill-btn danger" title="Eliminar de la fila">
                                                                        <Trash2 size={14} /> <span>Quitar</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))
                                         )
                                        }
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </div>

                    <AnimatePresence>
                        {editingComentario && (
                            <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }} onClick={() => setEditingComentario(null)}>
                                <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="glass-card" style={{ width: '90%', maxWidth: '420px', padding: '24px', background: 'var(--bg)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)' }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                            <div style={{ background: 'rgba(124, 58, 237, 0.1)', padding: '8px', borderRadius: '10px', display: 'flex' }}><MessageSquare size={18} className="text-accent" /></div>
                                            <strong style={{ fontSize: '1.1rem' }}>Mensaje al Vendedor</strong>
                                        </div>
                                        <button onClick={() => setEditingComentario(null)} className="premium-icon-btn" style={{ border: 'none' }}><X size={18} /></button>
                                    </div>
                                    <textarea className="input premium-input" autoFocus value={editingComentario.texto} onChange={e => setEditingComentario({...editingComentario, texto: e.target.value})} rows={4} style={{ width: '100%', marginBottom: 20, resize: 'none', fontSize: '0.95rem' }} placeholder="Escribe instrucciones especiales, horarios de atención, qué cobrar..." />
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button className="btn-secundario" onClick={() => setEditingComentario(null)} style={{ flex: 1 }}>Cancelar</button>
                                        <button className="btn-primario" onClick={async () => {
                                            const { error } = await supabase.from('visitas_diarias').update({ comentarios_admin: editingComentario.texto }).eq('id', editingComentario.id);
                                            if (error) {
                                                toast.error('No se pudo guardar la nota');
                                                return;
                                            }
                                            setRutaActual(prev => prev.map(v => v.id === editingComentario.id ? { ...v, comentarios_admin: editingComentario.texto } : v));
                                            setEditingComentario(null);
                                            toast.success('Nota guardada');
                                        }} style={{ flex: 1.5 }}>Completar</button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Panel Derecha: Mapa (Opcional) */}
                <AnimatePresence>
                    {verMapa && (
                        <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: window.innerWidth < 768 ? '100%' : '400px' }} exit={{ opacity: 0, width: 0 }} className="map-panel">
                            <div className="glass-card" style={{ height: window.innerWidth < 768 ? '300px' : '600px', padding: 0, overflow: 'hidden' }}>
                                <MapContainer center={[-34.6, -58.4]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <FitBounds points={polylinePoints} />
                                    <MapResizer mobileTab={mobileTab} verMapa={verMapa} />
                                    {polylinePoints.length > 1 && <Polyline positions={polylinePoints} pathOptions={{ color: 'var(--accent)', weight: 3, opacity: 0.6, dashArray: '5, 10' }} />}
                                    {rutaActual.map((v, idx) => {
                                        if (!v.clientes?.lat) return null;
                                        const col = ESTADOS_COLORES[v.estado] || ESTADOS_COLORES['Pendiente'];
                                        return (
                                            <Marker key={v.id} position={[v.clientes.lat, v.clientes.lng]} icon={makeNumberedIcon(idx + 1, col.pin, v.estado === 'Visitado', false)}>
                                                <Popup><strong>{v.clientes.nombre_local}</strong><br/>{v.clientes.direccion}</Popup>
                                            </Marker>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Barra Flotante de Acciones */}
            <div className="action-buttons-floating">
                <button className="btn-floating btn-secundario" onClick={clonarUltimaRuta} title="Cargar locales de la visita anterior">
                    <Copy size={16} /> <span className="hide-mobile">Clonar Última</span>
                </button>
                <button className="btn-floating btn-secundario" onClick={optimizarRuta}>
                    <Zap size={16} /> <span className="hide-mobile">Optimizar</span>
                </button>
                <button className="btn-floating btn-primario" onClick={compartirWhatsApp} disabled={rutaActual.length === 0}>
                    <Share2 size={16} /> <span className="hide-mobile">WhatsApp</span>
                </button>
                <style>{`
                .arrow-btn {
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .arrow-btn:hover:not(.disabled) {
                    color: var(--accent);
                    transform: scale(1.1);
                }
                .arrow-btn.disabled {
                    opacity: 0.1;
                    cursor: not-allowed;
                }
                .premium-pill-btn {
                    padding: 6px 14px;
                    border-radius: 20px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: var(--bg-elevated);
                    color: var(--text-muted);
                    border: 1px solid var(--border);
                    cursor: pointer;
                    font-size: 0.75rem;
                    font-weight: 600;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .premium-pill-btn.active {
                    background: rgba(124, 58, 237, 0.1);
                    color: var(--accent);
                    border-color: rgba(124, 58, 237, 0.3);
                }
                .premium-pill-btn:hover {
                    background: var(--bg-hover);
                    color: var(--text);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                .premium-pill-btn.danger {
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.05);
                    border-color: rgba(239, 68, 68, 0.1);
                }
                .premium-pill-btn.danger:hover {
                    background: #ef4444;
                    color: white;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
                }
            `}</style>
        </div>
        </div>
    );
}
