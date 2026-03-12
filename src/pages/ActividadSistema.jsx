import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, Database, ArrowRight, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ActividadSistema() {
    const { user, isAdmin } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const pageSize = 50;

    useEffect(() => {
        if (!isAdmin) return;
        fetchLogs();
    }, [page, isAdmin]);

    const fetchLogs = async () => {
        setLoading(true);
        // Supabase query to public.audit_logs
        let request = supabase
            .from('audit_logs')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        const { data, count, error } = await request;
        
        if (error) {
            console.error("Error fetching audit logs:", error);
        } else {
            setLogs(data || []);
            setTotalPages(Math.max(1, Math.ceil((count || 0) / pageSize)));
        }
        setLoading(false);
    };

    const renderDiff = (oldData, newData) => {
        if (!oldData && !newData) return <span className="muted">Sin cambios detectables</span>;
        
        if (!oldData && newData) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>Fila Creada</span>
                </div>
            );
        }
        
        if (oldData && !newData) {
             return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger)' }}>Fila Eliminada</span>
                </div>
            );
        }

        const changes = [];
        for (const key in newData) {
            // Ignore common auto-updated timestamps
            if (key === 'updated_at' || key === 'created_at') continue;
            
            const oldVal = oldData[key];
            const newVal = newData[key];
            
            if (oldVal !== newVal) {
                // Formatting for display
                const oldDisplay = oldVal === null || oldVal === '' ? '<vacío>' : String(oldVal);
                const newDisplay = newVal === null || newVal === '' ? '<vacío>' : String(newVal);
                changes.push({ key, oldDisplay, newDisplay });
            }
        }

        if (changes.length === 0) {
            return <span className="muted">Cambio en timestamps o metadatos</span>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {changes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)', minWidth: '80px' }}>{c.key}:</span>
                        <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{c.oldDisplay}</span>
                        <ArrowRight size={14} className="muted" />
                        <span style={{ color: 'var(--success)' }}>{c.newDisplay}</span>
                    </div>
                ))}
            </div>
        );
    };

    if (!isAdmin) {
        return (
            <div className="page-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <h2 style={{ color: 'var(--danger)' }}>Acceso Denegado</h2>
                <p className="muted">Sólo los administradores pueden ver el registro de auditoría del sistema.</p>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Database size={24} />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 4px 0' }}>Auditoría del Sistema</h1>
                    <p className="muted" style={{ margin: 0 }}>Registro de cada modificación a nivel de Base de Datos</p>
                </div>
            </header>

            <div className="bento-card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div className="skeleton-line" style={{ height: '20px', width: '200px', margin: '0 auto 16px auto' }}></div>
                        <div className="skeleton-line short" style={{ margin: '0 auto' }}></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <Activity size={48} className="muted" style={{ opacity: 0.5, marginBottom: '16px' }} />
                        <h3 className="muted" style={{ margin: 0 }}>No hay registros de actividad</h3>
                    </div>
                ) : (
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', width: '20%' }}>Fecha y Hora</th>
                                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', width: '15%' }}>Tabla / ID</th>
                                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', width: '10%' }}>Acción</th>
                                    <th style={{ padding: '16px 20px', fontWeight: 600, fontSize: '0.85rem', width: '40%' }}>Cambios Detectados</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                        <td style={{ padding: '20px', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)', fontWeight: 500, marginBottom: '4px' }}>
                                                <Clock size={14} className="muted" />
                                                {format(parseISO(log.created_at), "dd MMM yyyy", { locale: es })}
                                            </div>
                                            <div className="muted" style={{ fontSize: '0.85rem', marginLeft: '22px' }}>
                                                {format(parseISO(log.created_at), "HH:mm:ss", { locale: es })}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '4px', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                                                {log.table_name}
                                            </div>
                                            <div className="muted" style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                                                ID: {log.record_id?.split('-')[0] || log.record_id}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px', verticalAlign: 'top' }}>
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                borderRadius: '6px', 
                                                fontSize: '0.75rem', 
                                                fontWeight: 700, 
                                                background: log.action_type === 'INSERT' ? 'rgba(34, 197, 94, 0.15)' : log.action_type === 'DELETE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                                                color: log.action_type === 'INSERT' ? '#4ade80' : log.action_type === 'DELETE' ? '#f87171' : '#38bdf8'
                                            }}>
                                                {log.action_type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px', verticalAlign: 'top' }}>
                                            {renderDiff(log.old_data, log.new_data)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
                    <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                    <span className="muted" style={{ fontSize: '0.9rem' }}>Página {page} de {totalPages}</span>
                    <button className="btn btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
                </div>
            )}
        </div>
    );
}
