import React, { useMemo } from 'react';
import { 
    Clock, History, MessageSquare, 
    ArrowRight, MapPin, Calendar, Plus, Database 
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const EventIcon = ({ type }) => {
    switch (type) {
        case 'status_change': return <History size={16} />;
        case 'activity': return <MessageSquare size={16} />;
        case 'visit': return <MapPin size={16} />;
        case 'event': return <Calendar size={16} />;
        case 'audit': return <Database size={16} />;
        case 'creation': return <Plus size={16} />;
        default: return <Clock size={16} />;
    }
};

const EventColor = (type) => {
    switch (type) {
        case 'status_change': return 'var(--accent)';
        case 'visit': return 'var(--success)';
        case 'event': return 'var(--warning)';
        case 'creation': return 'var(--accent)';
        case 'audit': return 'var(--text-muted)';
        default: return 'var(--text-muted)';
    }
};

const safeDate = (dateStr) => {
    try {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d;
    } catch (e) {
        return null;
    }
};

export default function HistoryTimeline({ events, loading }) {
    const sortedEvents = useMemo(() => {
        if (!events || !Array.isArray(events)) return [];
        return [...events]
            .filter(e => e && e.at && !isNaN(new Date(e.at).getTime()))
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    }, [events]);

    if (loading) {
        return (
            <div className="timeline-loading">
                {[1, 2, 3].map(i => (
                    <div key={i} className="timeline-skeleton" style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
                        <div className="skeleton-dot" style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--border)', animation: 'pulse-sk 1.5s infinite ease-in-out' }}></div>
                        <div className="skeleton-line" style={{ height: '40px', flex: 1, background: 'var(--border)', borderRadius: '8px', animation: 'pulse-sk 1.5s infinite ease-in-out' }}></div>
                    </div>
                ))}
            </div>
        );
    }

    if (sortedEvents.length === 0) {
        return (
            <div className="timeline-empty" style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
                <History size={48} className="muted" style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p className="muted">No hay eventos registrados para este cliente.</p>
            </div>
        );
    }

    return (
        <div className="timeline-container">
            {sortedEvents.map((event, index) => {
                const dateObj = safeDate(event.at);
                if (!dateObj) return null;

                return (
                    <div key={event.id || index} className="timeline-item">
                        <div className="timeline-left">
                            <div className="timeline-time">
                                {format(dateObj, 'HH:mm', { locale: es })}hs
                            </div>
                            <div className="timeline-date">
                                {format(dateObj, 'dd MMM yyyy', { locale: es })}
                            </div>
                        </div>

                        <div className="timeline-middle">
                            <div 
                                className="timeline-icon" 
                                style={{ 
                                    backgroundColor: EventColor(event.type),
                                    boxShadow: `0 0 0 4px ${event.type === 'visit' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)'}` 
                                }}
                            >
                                <EventIcon type={event.type} />
                            </div>
                            {index !== sortedEvents.length - 1 && <div className="timeline-connector"></div>}
                        </div>

                        <div className="timeline-right">
                            <div className="timeline-content-card">
                                <div className="timeline-header">
                                    <span className="timeline-type-label">
                                        {event.typeLabel || event.type?.toUpperCase()}
                                    </span>
                                    {event.by && (
                                        <span className="timeline-by">
                                            por {event.userName || event.by}
                                        </span>
                                    )}
                                </div>
                                
                                <div className="timeline-body">
                                    {event.type === 'status_change' ? (
                                        <div className="status-change-display">
                                            <span className="status-old">{event.from}</span>
                                            <ArrowRight size={14} className="muted" />
                                            <span className="status-new">{event.to}</span>
                                        </div>
                                    ) : (
                                        <p className="timeline-description">{event.description}</p>
                                    )}
                                    
                                    {event.details && (
                                        <div className="timeline-details">
                                            {event.details}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse-sk {
                    0% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                    100% { opacity: 0.6; }
                }
                .timeline-container {
                    padding: 20px 0;
                    position: relative;
                }
                .timeline-item {
                    display: flex;
                    margin-bottom: 24px;
                }
                .timeline-left {
                    flex: 0 0 100px;
                    text-align: right;
                    padding-right: 20px;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    padding-top: 8px;
                }
                .timeline-time {
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: var(--text);
                }
                .timeline-date {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                }
                .timeline-middle {
                    flex: 0 0 40px;
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .timeline-icon {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    z-index: 2;
                    flex-shrink: 0;
                }
                .timeline-connector {
                    width: 2px;
                    background: var(--border);
                    flex-grow: 1;
                    margin: 4px 0;
                }
                .timeline-right {
                    flex: 1;
                    padding-left: 20px;
                    padding-bottom: 8px;
                }
                .timeline-content-card {
                    background: var(--bg-elevated);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    box-shadow: var(--shadow-sm);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .timeline-content-card:hover {
                    box-shadow: var(--shadow-md);
                    transform: translateX(4px);
                }
                .timeline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .timeline-type-label {
                    font-size: 0.65rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    color: var(--text-muted);
                    background: var(--bg);
                    padding: 2px 8px;
                    border-radius: 4px;
                }
                .timeline-by {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-style: italic;
                }
                .timeline-body {
                    font-size: 0.9rem;
                }
                .timeline-description {
                    line-height: 1.5;
                    margin: 0;
                }
                .status-change-display {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px;
                    background: var(--bg);
                    border-radius: 8px;
                }
                .status-old {
                    color: var(--text-muted);
                    font-size: 0.85rem;
                }
                .status-new {
                    color: var(--accent);
                    font-weight: 700;
                    font-size: 0.85rem;
                }
                .timeline-details {
                    margin-top: 8px;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    border-top: 1px solid var(--border);
                    padding-top: 8px;
                }
            ` }} />
        </div>
    );
}
