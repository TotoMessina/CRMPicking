import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, MapPin, Navigation, MessageSquare, Clock, ChevronRight, Route, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ESTADOS_COLORES = {
    'Pendiente': { bg: 'var(--bg-elevated)', border: 'var(--border)', badge: '#f59e0b', badgeBg: 'rgba(245,158,11,0.15)' },
    'Visitado':  { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.4)', badge: '#10b981', badgeBg: 'rgba(16,185,129,0.15)' },
    'Ausente':   { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', badge: '#ef4444', badgeBg: 'rgba(239,68,68,0.12)' },
    'Cancelado': { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.3)', badge: '#64748b', badgeBg: 'rgba(100,116,139,0.12)' },
};

export default function RutaDiaria() {
    const { user, empresaActiva } = useAuth();
    const [visitas, setVisitas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [filterDate, setFilterDate] = useState(() => new Date().toISOString().split('T')[0]);

    const fetchVisitas = async () => {
        if (!user?.email || !empresaActiva?.id) return;
        setLoading(true);
        try {
            // Step 1: fetch the route entries (no join)
            const { data: visitasRaw, error } = await supabase
                .from('visitas_diarias')
                .select('*')
                .eq('empresa_id', empresaActiva.id)
                .eq('usuario_asignado_email', user.email)
                .eq('fecha_asignada', filterDate)
                .order('orden', { ascending: true });

            if (error) throw error;
            if (!visitasRaw || visitasRaw.length === 0) { setVisitas([]); return; }

            // Step 2: fetch client details separately
            const clienteIds = [...new Set(visitasRaw.map(v => v.cliente_id))];
            const { data: clientesRaw } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion, telefono, lat, lng')
                .in('id', clienteIds);

            // Step 3: merge
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

    useEffect(() => {
        fetchVisitas();
    }, [user, empresaActiva, filterDate]);

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

    const totalVisitados = visitas.filter(v => v.estado === 'Visitado').length;
    const esHoy = filterDate === new Date().toISOString().split('T')[0];

    return (
        <div className="ruta-page">
            {/* Header */}
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
            </div>

            {/* Content */}
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
                                    {/* Número de orden + estado */}
                                    <div className="ruta-card-top">
                                        <div className="ruta-orden-badge">#{idx + 1}</div>
                                        <span
                                            className="ruta-estado-badge"
                                            style={{ color: colores.badge, background: colores.badgeBg }}
                                        >
                                            {visita.estado}
                                        </span>
                                    </div>

                                    {/* Info del cliente */}
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

                                        {/* Comentario del admin */}
                                        {visita.comentarios_admin && (
                                            <div className="ruta-comentario">
                                                <MessageSquare size={13} />
                                                <span>{visita.comentarios_admin}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Botones de navegación */}
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

                                    {/* Acciones principales */}
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
        </div>
    );
}
