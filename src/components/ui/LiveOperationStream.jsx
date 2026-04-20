import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Zap, Store, User, MapPin, CheckCircle, 
    AlertCircle, Clock, ChevronRight, TrendingUp, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * LiveOperationStream
 * Muestra un feed en tiempo real de lo que sucede en la empresa activa.
 */
export function LiveOperationStream() {
    const { empresaActiva } = useAuth();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Cargar historial inicial (últimos 15)
    useEffect(() => {
        if (!empresaActiva?.id) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .eq('empresa_id', empresaActiva.id)
                    .order('created_at', { ascending: false })
                    .limit(15);

                if (error) throw error;
                setEvents(data.map(log => formatLogEntry(log)));
            } catch (err) {
                console.error("Error fetching activity stream:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();

        // 2. Suscribirse a cambios en tiempo real
        const channel = supabase.channel('live_ops_feed')
            .on(
                'postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'audit_logs',
                    filter: `empresa_id=eq.${empresaActiva.id}`
                }, 
                (payload) => {
                    const newEntry = formatLogEntry(payload.new);
                    setEvents(prev => [newEntry, ...prev].slice(0, 20));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [empresaActiva]);

    // Helper para transformar log técnico a mensaje humano
    const formatLogEntry = (log) => {
        const { table_name, action_type, new_data, old_data, created_at, id } = log;
        let title = "Actividad del sistema";
        let desc = "Se realizó un cambio en los registros.";
        let icon = <Info size={16} />;
        let color = "var(--text-muted)";

        if (table_name === 'empresa_cliente') {
            if (action_type === 'INSERT') {
                title = "Nuevo Local Relevado";
                desc = `Se dio de alta un nuevo punto de venta.`;
                icon = <Store size={16} />;
                color = "#10b981";
            } else if (action_type === 'UPDATE') {
                const oldStatus = old_data?.estado;
                const newStatus = new_data?.estado;
                if (oldStatus !== newStatus) {
                    title = "Cambio de Estado";
                    desc = `Local pasó a: ${newStatus}`;
                    icon = <TrendingUp size={16} />;
                    color = "#8b5cf6";
                } else {
                    title = "Datos Actualizados";
                    desc = "Se editaron detalles del local.";
                    icon = <Zap size={16} />;
                    color = "var(--accent)";
                }
            }
        } else if (table_name === 'actividades') {
            title = "Visita Realizada";
            desc = new_data?.descripcion || "Se registró una nueva gestión.";
            icon = <CheckCircle size={16} />;
            color = "#10b981";
        } else if (table_name === 'repartidores') {
            title = "Movimiento de Personal";
            desc = action_type === 'INSERT' ? "Nuevo repartidor asignado." : "Actualización de legajo.";
            icon = <User size={16} />;
            color = "#f59e0b";
        }

        return {
            id,
            title,
            desc,
            icon,
            color,
            time: created_at,
            raw: log
        };
    };

    if (loading && events.length === 0) {
        return <div className="p-4 text-center muted">Sincronizando feed en vivo...</div>;
    }

    return (
        <div className="live-stream-container">
            <div className="live-stream-header">
                <div className="flex items-center gap-2">
                    <div className="pulse-dot"></div>
                    <span className="font-bold text-sm uppercase tracking-wider">Live Operations</span>
                </div>
                <div className="badge-live">EN VIVO</div>
            </div>

            <div className="live-stream-scroll hide-scrollbar">
                <AnimatePresence initial={false}>
                    {events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: -20, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: 'auto' }}
                            exit={{ opacity: 0, x: 20 }}
                            className="live-event-card"
                            style={{ borderLeft: `3px solid ${event.color}` }}
                        >
                            <div className="event-icon-box" style={{ color: event.color }}>
                                {event.icon}
                            </div>
                            <div className="event-content">
                                <div className="event-title-row">
                                    <span className="event-title">{event.title}</span>
                                    <span className="event-time">
                                        {formatDistanceToNow(new Date(event.time), { addSuffix: true, locale: es })}
                                    </span>
                                </div>
                                <div className="event-desc">{event.desc}</div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {events.length === 0 && (
                    <div className="p-8 text-center muted text-sm">
                        Esperando actividad en la red...
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .live-stream-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    max-height: 500px;
                }
                .live-stream-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid var(--border);
                    background: var(--bg-active);
                }
                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    box-shadow: 0 0 0 rgba(239, 68, 68, 0.4);
                    animation: pulse-red 2s infinite;
                }
                @keyframes pulse-red {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                .badge-live {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    font-size: 10px;
                    font-weight: 800;
                    padding: 2px 6px;
                    border-radius: 4px;
                }
                .live-stream-scroll {
                    overflow-y: auto;
                    flex: 1;
                    padding: 8px;
                }
                .live-event-card {
                    display: flex;
                    gap: 12px;
                    padding: 10px;
                    margin-bottom: 8px;
                    background: var(--bg-card);
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    transition: all 0.2s ease;
                }
                .live-event-card:hover {
                    transform: translateX(4px);
                    background: var(--bg-elevated);
                    border-color: var(--accent-soft);
                }
                .event-icon-box {
                    width: 32px;
                    height: 32px;
                    background: var(--bg-active);
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .event-content {
                    flex: 1;
                    min-width: 0;
                }
                .event-title-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2px;
                }
                .event-title {
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: var(--text);
                }
                .event-time {
                    font-size: 0.65rem;
                    color: var(--text-muted);
                }
                .event-desc {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
            `}} />
        </div>
    );
}
