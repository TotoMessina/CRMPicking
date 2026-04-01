import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, MapPin, Navigation, MessageSquare, Route, X, Map, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Estilos de colores por estado ────────────────────────────────────────────
const ESTADOS_COLORES = {
    'Pendiente': { bg: 'var(--bg-elevated)', border: 'var(--border)', badge: '#f59e0b', badgeBg: 'rgba(245,158,11,0.15)', pin: '#f59e0b' },
    'Visitado':  { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.4)', badge: '#10b981', badgeBg: 'rgba(16,185,129,0.15)', pin: '#10b981' },
    'Ausente':   { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', badge: '#ef4444', badgeBg: 'rgba(239,68,68,0.12)', pin: '#ef4444' },
    'Cancelado': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.3)', badge: '#64748b', badgeBg: 'rgba(100,116,139,0.12)', pin: '#64748b' },
};

// Genera un ícono de pin numerado con color dinámico
const makeNumberedIcon = (num, color, done) => L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
    html: `<div style="
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${done ? '#64748b' : color};
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
    ">
        <span style="transform:rotate(45deg);color:white;font-weight:800;font-size:12px;line-height:1">${num}</span>
    </div>`
});

// Componente que centra el mapa en los puntos de la ruta
function FitBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        if (points.length === 0) return;
        if (points.length === 1) {
            map.setView(points[0], 14);
        } else {
            map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
        }
    }, [points, map]);
    return null;
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function RutaDiaria() {
    const { user, empresaActiva } = useAuth();
    const [visitas, setVisitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [vista, setVista] = useState('lista'); // 'lista' | 'mapa' | 'ambos'

    const fetchVisitas = async () => {
        if (!user?.email || !empresaActiva?.id) return;
        setLoading(true);
        try {
            const { data: visitasRaw, error } = await supabase
                .from('visitas_diarias')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .eq('usuario_asignado_email', user.email)
                .eq('fecha_asignada', filterDate)
                .order('orden', { ascending: true });

            if (error) throw error;
            if (!visitasRaw || visitasRaw.length === 0) { setVisitas([]); return; }

            const clienteIds = [...new Set(visitasRaw.map(v => v.cliente_id))];
            const { data: clientesRaw } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion, telefono, lat, lng')
                .in('id', clienteIds);

            const clienteMap = {};
            (clientesRaw || []).forEach(c => { clienteMap[c.id] = c; });
            setVisitas(visitasRaw.map(v => ({ ...v, clientes: clienteMap[v.cliente_id] || null })));
        } catch (e) {
            console.error(e);
            toast.error('Error al cargar tu ruta del día');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchVisitas(); }, [user, empresaActiva, filterDate]);

    const marcarEstado = async (visitaId, nuevoEstado) => {
        setUpdatingId(visitaId);
        const { error } = await supabase
            .from('visitas_diarias')
            .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
            .eq('id', visitaId);

        if (error) {
            toast.error('Error actualizando el estado');
        } else {
            const iconos = { Visitado: '✅', Ausente: '⛔', Pendiente: '🔄', Cancelado: '❌' };
            toast.success(`${iconos[nuevoEstado] || ''} Marcado como ${nuevoEstado}`, { duration: 2500 });
            setVisitas(prev => prev.map(v => v.id === visitaId ? { ...v, estado: nuevoEstado } : v));
        }
        setUpdatingId(null);
    };

    const abrirMaps = (direccion, lat, lng) => {
        const query = lat && lng ? `${lat},${lng}` : encodeURIComponent(direccion || '');
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
    };

    const abrirWaze = (lat, lng, direccion) => {
        if (lat && lng) {
            window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
        } else {
            window.open(`https://waze.com/ul?q=${encodeURIComponent(direccion || '')}&navigate=yes`, '_blank');
        }
    };

    // Puntos con coordenadas válidas para el mapa
    const puntosConCoords = visitas
        .map((v, idx) => ({ ...v, idx }))
        .filter(v => v.clientes?.lat && v.clientes?.lng);

    const polylinePoints = puntosConCoords.map(v => [v.clientes.lat, v.clientes.lng]);

    const totalVisitados = visitas.filter(v => v.estado === 'Visitado').length;
    const esHoy = filterDate === new Date().toISOString().split('T')[0];
    const hayMapa = puntosConCoords.length > 0;

    return (
        <div className="ruta-page">
            {/* ── Header ── */}
            <div className="ruta-header">
                <div className="ruta-header-top">
                    <div className="ruta-title-group">
                        <Route size={22} color="var(--accent)" />
                        <div>
                            <h1>Mi Ruta del Día</h1>
                            <p>{esHoy ? 'Hoy' : filterDate}</p>
                        </div>
                    </div>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="ruta-date-input"
                    />
                </div>

                {!loading && visitas.length > 0 && (
                    <div className="ruta-progress-bar-wrap">
                        <div className="ruta-progress-bar-track">
                            <div
                                className="ruta-progress-bar-fill"
                                style={{ width: `${Math.round((totalVisitados / visitas.length) * 100)}%` }}
                            />
                        </div>
                        <span className="ruta-progress-label">
                            {totalVisitados}/{visitas.length} completados
                        </span>
                    </div>
                )}

                {/* Selector de vista */}
                {!loading && visitas.length > 0 && hayMapa && (
                    <div className="ruta-vista-tabs">
                        <button
                            className={`ruta-vista-tab ${vista === 'lista' ? 'active' : ''}`}
                            onClick={() => setVista('lista')}
                        >
                            <List size={14} /> Lista
                        </button>
                        <button
                            className={`ruta-vista-tab ${vista === 'mapa' ? 'active' : ''}`}
                            onClick={() => setVista('mapa')}
                        >
                            <Map size={14} /> Mapa
                        </button>
                        <button
                            className={`ruta-vista-tab ${vista === 'ambos' ? 'active' : ''}`}
                            onClick={() => setVista('ambos')}
                        >
                            <Route size={14} /> Ambos
                        </button>
                    </div>
                )}
            </div>

            {/* ── Content ── */}
            <div className="ruta-content">
                {loading ? (
                    <div className="ruta-empty-state">
                        <div className="ruta-spinner" />
                        <p>Cargando tu ruta...</p>
                    </div>
                ) : visitas.length === 0 ? (
                    <div className="ruta-empty-state">
                        <Route size={48} color="var(--text-muted)" style={{ opacity: 0.4 }} />
                        <h3>Sin visitas asignadas</h3>
                        <p>No tenés locales programados para {esHoy ? 'hoy' : 'esta fecha'}.<br />Consultá con tu coordinador.</p>
                    </div>
                ) : (
                    <div className={`ruta-split ${vista === 'ambos' ? 'ruta-split--ambos' : ''}`}>

                        {/* ── Mapa ── */}
                        {(vista === 'mapa' || vista === 'ambos') && hayMapa && (
                            <div className="ruta-map-wrap">
                                <MapContainer
                                    center={[-34.6, -58.4]}
                                    zoom={12}
                                    style={{ height: '100%', width: '100%' }}
                                    zoomControl={true}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    />
                                    <FitBounds points={polylinePoints} />

                                    {/* Línea de la ruta */}
                                    {polylinePoints.length > 1 && (
                                        <Polyline
                                            positions={polylinePoints}
                                            pathOptions={{
                                                color: '#8b5cf6',
                                                weight: 3,
                                                opacity: 0.7,
                                                dashArray: '8, 6'
                                            }}
                                        />
                                    )}

                                    {/* Markers numerados */}
                                    {puntosConCoords.map((visita) => {
                                        const colores = ESTADOS_COLORES[visita.estado] || ESTADOS_COLORES['Pendiente'];
                                        const done = visita.estado === 'Visitado' || visita.estado === 'Cancelado';
                                        return (
                                            <Marker
                                                key={visita.id}
                                                position={[visita.clientes.lat, visita.clientes.lng]}
                                                icon={makeNumberedIcon(visita.idx + 1, colores.pin, done)}
                                            >
                                                <Popup>
                                                    <div style={{ minWidth: '160px' }}>
                                                        <strong style={{ fontSize: '0.95rem' }}>
                                                            #{visita.idx + 1} {visita.clientes.nombre_local}
                                                        </strong>
                                                        {visita.clientes.direccion && (
                                                            <p style={{ margin: '4px 0', fontSize: '0.8rem', color: '#64748b' }}>
                                                                {visita.clientes.direccion}
                                                            </p>
                                                        )}
                                                        <span style={{
                                                            display: 'inline-block',
                                                            marginTop: '4px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: '999px',
                                                            background: colores.badgeBg,
                                                            color: colores.badge
                                                        }}>
                                                            {visita.estado}
                                                        </span>
                                                        {visita.comentarios_admin && (
                                                            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#6d28d9', fontStyle: 'italic' }}>
                                                                💬 {visita.comentarios_admin}
                                                            </p>
                                                        )}
                                                        <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                                            <button
                                                                onClick={() => abrirMaps(visita.clientes.direccion, visita.clientes.lat, visita.clientes.lng)}
                                                                style={{ flex: 1, padding: '5px', fontSize: '0.75rem', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                                                            >
                                                                Google Maps
                                                            </button>
                                                        </div>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        )}

                        {/* ── Lista ── */}
                        {(vista === 'lista' || vista === 'ambos') && (
                            <div className="ruta-list">
                                {visitas.map((visita, idx) => {
                                    const cliente = visita.clientes;
                                    const colores = ESTADOS_COLORES[visita.estado] || ESTADOS_COLORES['Pendiente'];
                                    const isUpdating = updatingId === visita.id;
                                    const isVisitado = visita.estado === 'Visitado';

                                    return (
                                        <div
                                            key={visita.id}
                                            className="ruta-card"
                                            style={{
                                                background: colores.bg,
                                                borderColor: colores.border,
                                                opacity: isUpdating ? 0.7 : 1,
                                            }}
                                        >
                                            <div className="ruta-card-top">
                                                <div className="ruta-orden-badge">#{idx + 1}</div>
                                                <span
                                                    className="ruta-estado-badge"
                                                    style={{ color: colores.badge, background: colores.badgeBg }}
                                                >
                                                    {visita.estado}
                                                </span>
                                            </div>

                                            <div className="ruta-card-body">
                                                <h2 className="ruta-local-name"
                                                    style={{ textDecoration: isVisitado ? 'line-through' : 'none', opacity: isVisitado ? 0.6 : 1 }}
                                                >
                                                    {cliente?.nombre_local || 'Local sin nombre'}
                                                </h2>

                                                {cliente?.direccion && (
                                                    <div className="ruta-direccion">
                                                        <MapPin size={14} color="var(--text-muted)" />
                                                        <span>{cliente.direccion}</span>
                                                    </div>
                                                )}

                                                {visita.comentarios_admin && (
                                                    <div className="ruta-comentario">
                                                        <MessageSquare size={13} />
                                                        <span>{visita.comentarios_admin}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="ruta-nav-btns">
                                                <button
                                                    className="ruta-btn-maps"
                                                    onClick={() => abrirMaps(cliente?.direccion, cliente?.lat, cliente?.lng)}
                                                >
                                                    <Navigation size={15} /> Google Maps
                                                </button>
                                                <button
                                                    className="ruta-btn-waze"
                                                    onClick={() => abrirWaze(cliente?.lat, cliente?.lng, cliente?.direccion)}
                                                >
                                                    <img src="https://www.gstatic.com/mapspro/images/stock/956-waze-google-maps.png" alt="Waze" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                                                    Waze
                                                </button>
                                            </div>

                                            <div className="ruta-action-btns">
                                                {visita.estado !== 'Visitado' && (
                                                    <button
                                                        className="ruta-btn-check"
                                                        onClick={() => marcarEstado(visita.id, 'Visitado')}
                                                        disabled={isUpdating}
                                                    >
                                                        <CheckCircle size={20} />
                                                        {isUpdating ? 'Guardando...' : 'Marcar Visitado'}
                                                    </button>
                                                )}
                                                {visita.estado === 'Visitado' && (
                                                    <button
                                                        className="ruta-btn-revert"
                                                        onClick={() => marcarEstado(visita.id, 'Pendiente')}
                                                        disabled={isUpdating}
                                                    >
                                                        <X size={16} /> Deshacer
                                                    </button>
                                                )}
                                                {visita.estado === 'Pendiente' && (
                                                    <button
                                                        className="ruta-btn-ausente"
                                                        onClick={() => marcarEstado(visita.id, 'Ausente')}
                                                        disabled={isUpdating}
                                                    >
                                                        ⛔ Ausente
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
