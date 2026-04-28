import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Store, RefreshCcw, Edit2, Calendar, Clock, User, 
    ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';
import { ClientActivity } from '../../types/client';

interface Props {
    activities: ClientActivity[];
    maxInitial?: number;
}

const getActivityConfig = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('visita realizada')) return { icon: Store, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (desc.includes('cambio de estado')) return { icon: RefreshCcw, color: '#0c0c0c', bg: 'var(--accent-soft)' };
    if (desc.includes('edición') || desc.includes('creado')) return { icon: Edit2, color: '#333', bg: 'rgba(0, 0, 0, 0.05)' };
    if (desc.includes('próximo contacto')) return { icon: Calendar, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    if (desc.includes('error') || desc.includes('fallo')) return { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    return { icon: Clock, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
};

export const ActivityTimeline: React.FC<Props> = ({ activities, maxInitial = 5 }) => {
    const [expanded, setExpanded] = React.useState(false);
    
    if (!activities || activities.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No hay actividades registradas.
            </div>
        );
    }

    const displayedActivities = expanded ? activities : activities.slice(0, maxInitial);
    const hasMore = activities.length > maxInitial;

    return (
        <div className="activity-timeline" style={{ position: 'relative', padding: '10px 0' }}>
            {/* Vertical Line */}
            <div style={{ 
                position: 'absolute', 
                left: '15px', 
                top: '25px', 
                bottom: '25px', 
                width: '2px', 
                background: 'linear-gradient(to bottom, var(--border) 0%, var(--border) 100%)',
                opacity: 0.5
            }}></div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <AnimatePresence mode="popLayout">
                    {(displayedActivities as any[]).map((activity: any, index: number) => {
                        const { icon: Icon, color, bg } = getActivityConfig(activity.descripcion || '');
                        const date = new Date(activity.fecha);
                        
                        return (
                            <motion.div
                                key={activity.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05, duration: 0.2 }}
                                style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 1 }}
                            >
                                {/* Icon Node */}
                                <div style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '50%', 
                                    background: 'var(--bg-card)', 
                                    border: `2px solid ${color}`, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    flexShrink: 0,
                                    boxShadow: `0 0 10px ${color}20`,
                                    zIndex: 2
                                }}>
                                    <Icon size={14} style={{ color }} />
                                </div>

                                {/* Content Card */}
                                <div style={{ 
                                    flex: 1, 
                                    background: 'var(--bg-elevated)', 
                                    borderRadius: '12px', 
                                    padding: '12px 16px', 
                                    border: '1px solid var(--border)',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                    transition: 'transform 0.2s ease'
                                }} className="timeline-card-hover">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                                            {activity.descripcion}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                                            {date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            <Calendar size={12} />
                                            {date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                        </div>
                                        {activity.usuario && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
                                                <User size={12} />
                                                {activity.usuario}
                                            </div>
                                        )}
                                    </div>

                                    {activity.foto_url && (
                                        <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', maxWidth: '200px' }}>
                                            <img 
                                                src={activity.foto_url} 
                                                alt="Actividad" 
                                                style={{ width: '100%', height: 'auto', display: 'block', cursor: 'pointer' }}
                                                onClick={() => window.open(activity.foto_url, '_blank')}
                                            />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {hasMore && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        style={{
                            margin: '0 auto',
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '6px 16px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        {expanded ? (
                            <><ChevronUp size={14} /> Ver menos</>
                        ) : (
                            <><ChevronDown size={14} /> Ver {activities.length - maxInitial} más...</>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};
