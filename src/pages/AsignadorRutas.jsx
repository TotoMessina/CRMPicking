import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Plus, Trash2, X, Search, ChevronUp, ChevronDown,
    Route as RouteIcon, User, Calendar, MessageSquare, Save, Users, Map as MapIcon, Zap, List
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Estilos de colores por estado (Sincronizado con RutaDiaria) ──────────────
const ESTADOS_COLORES = {
    'Pendiente': { bg: 'var(--bg-elevated)', border: 'var(--border)', badge: '#f59e0b', badgeBg: 'rgba(245,158,11,0.15)', pin: '#f59e0b' },
    'Visitado':  { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.4)', badge: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', pin: '#10b981' },
    'Ausente':   { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', badge: '#ef4444', badgeBg: 'rgba(239,68,68,0.12)', pin: '#ef4444' },
    'Cancelado': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.3)', badge: '#64748b', badgeBg: 'rgba(100,116,139,0.12)', pin: '#64748b' },
};

// Genera un ícono de pin numerado
const makeNumberedIcon = (num, color, done) => L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
    html: `<div style="
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${done ? '#64748b' : color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
    ">
        <span style="transform:rotate(45deg);color:white;font-weight:800;font-size:11px;line-height:1">${num}</span>
    </div>`
});

// Helper: Centrar mapa en la ruta
function FitBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        if (points.length === 1) map.setView(points[0], 14);
        else map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }, [points, map]);
    return null;
}

// Helper: Distancia Haversine en KM
const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// ─── Componente principal ────────────────────────────────────────────────────
export default function AsignadorRutas() {
    const { empresaActiva } = useAuth();

    // State: usuarios y selección
    const [usuarios, setUsuarios] = useState([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('');
    const [fechaSeleccionada, setFechaSeleccionada] = useState(() => new Date().toISOString().split('T')[0]);

    // State: buscador de clientes
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // State: ruta actual
    const [rutaActual, setRutaActual] = useState([]);
    const [loadingRuta, setLoadingRuta] = useState(false);

    // State: UI
    const [editingComentario, setEditingComentario] = useState(null);
    const [savingComentario, setSavingComentario] = useState(false);
    const [verMapa, setVerMapa] = useState(true);

    // Load users in empresa
    useEffect(() => {
        if (!empresaActiva?.id) return;
        const fetchUsuarios = async () => {
            const { data: euData } = await supabase
                .from('empresa_usuario')
                .select('usuario_email')
                .eq('empresa_id', empresaActiva.id);

            const emails = (euData || []).map(e => e.usuario_email);
            if (emails.length === 0) { setUsuarios([]); return; }

            const { data: usersData } = await supabase
                .from('usuarios')
                .select('email, nombre')
                .in('email', emails)
                .order('nombre');

            setUsuarios((usersData || []).map(u => ({
                email: u.email,
                nombre: u.nombre || u.email
            })));
        };
        fetchUsuarios();
    }, [empresaActiva]);

    // Fetch current route
    const fetchRuta = useCallback(async () => {
        if (!usuarioSeleccionado || !fechaSeleccionada || !empresaActiva?.id) {
            setRutaActual([]);
            return;
        }
        setLoadingRuta(true);
        try {
            const { data: visitasRaw, error } = await supabase
                .from('visitas_diarias')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .eq('usuario_asignado_email', usuarioSeleccionado)
                .eq('fecha_asignada', fechaSeleccionada)
                .order('orden', { ascending: true });

            if (error) throw error;
            if (!visitasRaw || visitasRaw.length === 0) { setRutaActual([]); return; }

            const clienteIds = [...new Set(visitasRaw.map(v => v.cliente_id))];
            const { data: clientesRaw } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion, lat, lng')
                .in('id', clienteIds);

            const clienteMap = {};
            (clientesRaw || []).forEach(c => { clienteMap[c.id] = c; });
            setRutaActual(visitasRaw.map(v => ({ ...v, clientes: clienteMap[v.cliente_id] || null })));
        } catch (e) {
            console.error(e);
            toast.error('Error al cargar la ruta');
        } finally {
            setLoadingRuta(false);
        }
    }, [usuarioSeleccionado, fechaSeleccionada, empresaActiva]);

    useEffect(() => { fetchRuta(); }, [fetchRuta]);

    // Client search (Search with coordinates)
    useEffect(() => {
        if (searchTerm.length < 2) { setSearchResults([]); return; }
        const t = setTimeout(async () => {
            setSearching(true);
            const { data: clientesRaw } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion, lat, lng')
                .ilike('nombre_local', `%${searchTerm}%`)
                .limit(20);

            if (!clientesRaw || clientesRaw.length === 0) {
                setSearchResults([]);
                setSearching(false);
                return;
            }

            const { data: ecData } = await supabase
                .from('empresa_cliente')
                .select('id, cliente_id')
                .eq('empresa_id', empresaActiva?.id)
                .eq('activo', true)
                .in('cliente_id', clientesRaw.map(c => c.id));

            const merged = (ecData || []).map(ec => ({
                id: ec.id,
                clientes: clientesRaw.find(c => c.id === ec.cliente_id)
            })).filter(x => x.clientes).slice(0, 8);

            setSearchResults(merged);
            setSearching(false);
        }, 350);
        return () => clearTimeout(t);
    }, [searchTerm, empresaActiva]);

    // SMART INSERTION LOGIC
    const agregarCliente = async (ec) => {
        if (!usuarioSeleccionado) { toast.error('Seleccioná un usuario primero'); return; }
        const yaExiste = rutaActual.find(v => v.cliente_id === ec.clientes.id);
        if (yaExiste) { toast.error('Este local ya está en la ruta'); return; }

        let targetIndex = rutaActual.length;
        const newLat = ec.clientes.lat;
        const newLng = ec.clientes.lng;

        // Si tenemos coordenadas, buscar el mejor lugar (Proximidad)
        if (newLat && newLng && rutaActual.length > 0) {
            let minDistanceIncrease = Infinity;
            
            // Probar todas las posiciones posibles (inserción)
            // Calculamos el incremento de la ruta total.
            for (let i = 0; i <= rutaActual.length; i++) {
                let increase = 0;
                const prev = i > 0 ? rutaActual[i - 1]?.clientes : null;
                const next = i < rutaActual.length ? rutaActual[i]?.clientes : null;

                if (prev && next) {
                    // Costo de romper el enlace AB por ACB: d(AC) + d(CB) - d(AB)
                    const dAB = getDistance(prev.lat, prev.lng, next.lat, next.lng);
                    const dAC = getDistance(prev.lat, prev.lng, newLat, newLng);
                    const dCB = getDistance(newLat, newLng, next.lat, next.lng);
                    increase = dAC + dCB - dAB;
                } else if (prev) {
                    // Append: d(AC)
                    increase = getDistance(prev.lat, prev.lng, newLat, newLng);
                } else if (next) {
                    // Prepend: d(CB)
                    increase = getDistance(newLat, newLng, next.lat, next.lng);
                }
                
                if (increase < minDistanceIncrease) {
                    minDistanceIncrease = increase;
                    targetIndex = i;
                }
            }
        }

        // Insertar en la posición targetIndex
        const { data, error } = await supabase
            .from('visitas_diarias')
            .insert([{
                empresa_id: empresaActiva.id,
                cliente_id: ec.clientes.id,
                usuario_asignado_email: usuarioSeleccionado,
                fecha_asignada: fechaSeleccionada,
                estado: 'Pendiente',
                orden: targetIndex, // Inicial, lo corregiremos luego si es necesario
                comentarios_admin: null
            }])
            .select('*')
            .single();

        if (error) { toast.error('Error al agregar el local'); return; }

        // Actualizar la ruta localmente insertando en el índice
        const nuevaRuta = [...rutaActual];
        nuevaRuta.splice(targetIndex, 0, { ...data, clientes: ec.clientes });
        
        // Re-asignar órdenes en DB para que sea persistente
        try {
            await Promise.all(
                nuevaRuta.map((v, i) => 
                    supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id)
                )
            );
            setRutaActual(nuevaRuta);
            setSearchTerm('');
            setSearchResults([]);
            toast.success(`${ec.clientes.nombre_local} agregado (${targetIndex + 1}º por cercanía)`);
        } catch {
            fetchRuta();
        }
    };

    const quitarCliente = async (visitaId) => {
        const { error } = await supabase.from('visitas_diarias').delete().eq('id', visitaId);
        if (error) { toast.error('Error al quitar el local'); return; }
        setRutaActual(prev => prev.filter(v => v.id !== visitaId));
    };

    const moverVisita = async (idx, direccion) => {
        const nueva = [...rutaActual];
        const destIdx = idx + direccion;
        if (destIdx < 0 || destIdx >= nueva.length) return;
        [nueva[idx], nueva[destIdx]] = [nueva[destIdx], nueva[idx]];
        setRutaActual(nueva);
        try {
            await Promise.all(nueva.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id)));
        } catch {
            fetchRuta();
        }
    };

    const guardarComentario = async () => {
        if (!editingComentario) return;
        setSavingComentario(true);
        try {
            const { error } = await supabase
                .from('visitas_diarias')
                .update({ comentarios_admin: editingComentario.texto || null })
                .eq('id', editingComentario.id);
            if (error) throw error;
            setRutaActual(prev =>
                prev.map(v =>
                    v.id === editingComentario.id
                        ? { ...v, comentarios_admin: editingComentario.texto || null }
                        : v
                )
            );
            setEditingComentario(null);
            toast.success('Nota guardada');
        } catch (e) {
            console.error(e);
            toast.error('Error al guardar la nota');
        } finally {
            setSavingComentario(false);
        }
    };

    const optimizarRuta = async () => {
        if (rutaActual.length <= 2) { toast('Agregá más locales para optimizar', { icon: 'ℹ️' }); return; }
        const conCoords = rutaActual.filter(v => v.clientes?.lat && v.clientes?.lng);
        if (conCoords.length < 2) { toast.error('No hay suficientes locales con coordenadas'); return; }

        // Heurística simple: Nearest Neighbor
        const optimizada = [];
        let pendientes = [...rutaActual];
        
        // Empezamos por el primero que ya existe (origen por defecto)
        let actual = pendientes.shift();
        optimizada.push(actual);

        while (pendientes.length > 0) {
            let indexCercano = -1;
            let minDist = Infinity;

            for (let i = 0; i < pendientes.length; i++) {
                const dist = getDistance(
                    actual.clientes?.lat, actual.clientes?.lng,
                    pendientes[i].clientes?.lat, pendientes[i].clientes?.lng
                );
                if (dist < minDist) {
                    minDist = dist;
                    indexCercano = i;
                }
            }

            actual = pendientes.splice(indexCercano, 1)[0];
            optimizada.push(actual);
        }

        setRutaActual(optimizada);
        try {
            await Promise.all(optimizada.map((v, i) => supabase.from('visitas_diarias').update({ orden: i }).eq('id', v.id)));
            toast.success('Ruta optimizada por cercanía');
        } catch {
            fetchRuta();
        }
    };

    const polylinePoints = rutaActual
        .map(v => v.clientes?.lat && v.clientes?.lng ? [v.clientes.lat, v.clientes.lng] : null)
        .filter(p => p !== null);

    const usuarioInfo = usuarios.find(u => u.email === usuarioSeleccionado);

    return (
        <div className="asign-page">
            <header className="asign-header">
                <div className="asign-title-group">
                    <RouteIcon size={22} color="var(--accent)" />
                    <div>
                        <h1>Asignador de Rutas</h1>
                        <p className="muted">Organizá la ruta de cada usuario</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                     <button className="btn-secundario" onClick={() => setVerMapa(!verMapa)}>
                        {verMapa ? <List size={14} /> : <MapIcon size={14} />} 
                        <span className="hide-mobile">{verMapa ? 'Ocultar Mapa' : 'Ver Mapa'}</span>
                    </button>
                    {rutaActual.length > 1 && (
                        <button className="btn-primario" onClick={optimizarRuta}>
                            <Zap size={14} /> Optimizar
                        </button>
                    )}
                </div>
            </header>

            <div className="asign-layout">
                {/* Panel Izquierdo: Controles */}
                <div className="asign-panel-left">
                    <div className="asign-section-card">
                        <h3 className="asign-section-title"><User size={16} /> Usuario</h3>
                        <select className="input" value={usuarioSeleccionado} onChange={e => setUsuarioSeleccionado(e.target.value)}>
                            <option value="">— Seleccionar usuario —</option>
                            {usuarios.map(u => (
                                <option key={u.email} value={u.email}>{u.nombre || u.email}</option>
                            ))}
                        </select>
                    </div>

                    <div className="asign-section-card">
                        <h3 className="asign-section-title"><Calendar size={16} /> Fecha</h3>
                        <input type="date" className="input" value={fechaSeleccionada} onChange={e => setFechaSeleccionada(e.target.value)} />
                    </div>

                    <div className="asign-section-card asign-search-card">
                        <h3 className="asign-section-title"><Search size={16} /> Agregar Local</h3>
                        <div className="asign-search-wrap">
                            <Search size={15} className="asign-search-icon" />
                            <input
                                type="text" className="input" placeholder="Buscar local..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '36px' }}
                            />
                        </div>
                        {searchTerm.length >= 2 && (
                            <div className="asign-search-results">
                                {searching ? <div className="asign-search-empty">Buscando...</div> :
                                 searchResults.length === 0 ? <div className="asign-search-empty">Sin resultados</div> :
                                 searchResults.map(ec => (
                                    <button key={ec.id} className="asign-search-item" onClick={() => agregarCliente(ec)}>
                                        <div className="asign-search-item-name">{ec.clientes?.nombre_local}</div>
                                        <div className="asign-search-item-dir">{ec.clientes?.direccion}</div>
                                        <Plus size={16} className="asign-search-item-icon" />
                                    </button>
                                 ))
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* Panel Central: Ruta y Mapa */}
                <div className={`asign-layout-main ${verMapa ? 'asign-layout-main--split' : ''}`}>
                    <div className="asign-panel-right">
                        <div className="asign-ruta-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={16} color="var(--accent)" />
                                <strong>{usuarioInfo?.nombre || 'Sin usuario'}</strong>
                            </div>
                            <span className="asign-ruta-count">{rutaActual.length} locales</span>
                        </div>

                        {loadingRuta ? (
                            <div className="asign-loading">Cargando ruta...</div>
                        ) : !usuarioSeleccionado ? (
                            <div className="asign-empty-state">
                                <RouteIcon size={40} style={{ opacity: 0.3 }} />
                                <p>Seleccioná un usuario</p>
                            </div>
                        ) : (
                            <div className="asign-ruta-list">
                                {rutaActual.map((visita, idx) => {
                                    const cliente = visita.clientes;
                                    const isEditando = editingComentario?.id === visita.id;
                                    const done = visita.estado === 'Visitado';

                                    return (
                                        <div key={visita.id} className={`asign-ruta-item ${done ? 'asign-ruta-item--done' : ''}`}>
                                            <div className="asign-item-orden">
                                                <span>{idx + 1}</span>
                                                <div className="asign-ordem-arrows">
                                                    <button onClick={() => moverVisita(idx, -1)} disabled={idx === 0} className="asign-arrow-btn"><ChevronUp size={14} /></button>
                                                    <button onClick={() => moverVisita(idx, 1)} disabled={idx === rutaActual.length - 1} className="asign-arrow-btn"><ChevronDown size={14} /></button>
                                                </div>
                                            </div>

                                            <div className="asign-item-info">
                                                <div className="asign-item-name">{cliente?.nombre_local}</div>
                                                <div className="asign-item-dir">{cliente?.direccion}</div>
                                                {!isEditando ? (
                                                    <button className="asign-comentario-trigger" onClick={() => setEditingComentario({ id: visita.id, texto: visita.comentarios_admin || '' })}>
                                                        <MessageSquare size={12} />
                                                        <span>{visita.comentarios_admin || 'Agregar nota...'}</span>
                                                    </button>
                                                ) : (
                                                    <div className="asign-comentario-edit">
                                                        <textarea autoFocus className="input" value={editingComentario.texto} onChange={e => setEditingComentario(p => ({...p, texto: e.target.value}))} rows={2} />
                                                        <div className="asign-comentario-actions">
                                                            <button className="btn-link" onClick={() => setEditingComentario(null)}>Cancelar</button>
                                                            <button className="asign-btn-save" onClick={guardarComentario}>Guardar</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <button className="asign-btn-remove" onClick={() => quitarCliente(visita.id)}><Trash2 size={15} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {verMapa && usuarioSeleccionado && (
                        <div className="asign-map-wrap">
                            <MapContainer center={[-34.6, -58.4]} zoom={12} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <FitBounds points={polylinePoints} />
                                {polylinePoints.length > 1 && <Polyline positions={polylinePoints} pathOptions={{ color: 'var(--accent)', weight: 3, opacity: 0.6, dashArray: '5, 10' }} />}
                                {rutaActual.map((v, idx) => {
                                    if (!v.clientes?.lat) return null;
                                    const col = ESTADOS_COLORES[v.estado] || ESTADOS_COLORES['Pendiente'];
                                    const isDone = v.estado === 'Visitado';
                                    return (
                                        <Marker key={v.id} position={[v.clientes.lat, v.clientes.lng]} icon={makeNumberedIcon(idx + 1, col.pin, isDone)}>
                                            <Popup>
                                                <strong>#{idx + 1} {v.clientes.nombre_local}</strong>
                                                <p style={{ margin: '4px 0', fontSize: '0.8rem' }}>{v.clientes.direccion}</p>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
