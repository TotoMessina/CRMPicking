import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, Database, ArrowRight, Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE' | 'SESSION_END';
    old_data: any;
    new_data: any;
    created_at: string;
    changed_by?: string;
    usuarios?: { nombre: string };
}

export const ActividadSistema: React.FC = () => {
    const { role, paginasPermitidas }: any = useAuth();
    const isSuperAdmin = role === 'super-admin';
    const hasAccess = isSuperAdmin || (paginasPermitidas && paginasPermitidas['/actividad-sistema']?.includes(role));
    
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 50;

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTable, setFilterTable] = useState('Todos');
    const [filterAction, setFilterAction] = useState('Todas');

    const availableTables = useMemo(() => {
        const tables = new Set(logs.map(l => l.table_name));
        return ['Todos', ...Array.from(tables)].sort();
    }, [logs]);

    useEffect(() => {
        if (!hasAccess) return;
        fetchLogs();
    }, [page, hasAccess, filterTable, filterAction]);

    const fetchLogs = async () => {
        setLoading(true);
        let query = supabase
            .from('audit_logs')
            .select('*, usuarios(nombre)', { count: 'exact' });

        if (filterTable !== 'Todos') {
            query = query.eq('table_name', filterTable);
        }
        if (filterAction !== 'Todas') {
            query = query.eq('action_type', filterAction);
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
            console.error("Error fetching audit logs:", error);
        } else {
            setLogs(data || []);
            setTotalCount(count || 0);
            setTotalPages(Math.max(1, Math.ceil((count || 0) / pageSize)));
        }
        setLoading(false);
    };

    const renderDiff = (oldData: any, newData: any) => {
        if (!oldData && !newData) return <div className="muted" style={{ fontSize: '0.85rem' }}>Sin cambios detectables</div>;
        
        if (!oldData && newData) {
            return (
                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Database size={12} /> Registro Inicial Creado
                    </span>
                </div>
            );
        }
        
        if (oldData && !newData) {
            return (
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <X size={12} /> Registro Eliminado
                    </span>
                </div>
            );
        }

        // Special handling for SESSION_END
        if (newData && newData.duracion) {
            return (
                <div style={{ padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                        <Clock size={16} /> Sesión Finalizada
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        Tiempo en App: <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{newData.duracion}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '4px' }}>
                        Inicio: {new Date(newData.inicio).toLocaleTimeString()} • Fin: {new Date(newData.fin).toLocaleTimeString()}
                    </div>
                </div>
            );
        }

        const changes = [];
        for (const key in newData) {
            if (key === 'updated_at' || key === 'created_at' || key === 'id') continue;
            
            const oldVal = oldData[key];
            const newVal = newData[key];
            
            // Shallow comparison for JSON/Strings/Numbers
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                const oldDisplay = oldVal === null || oldVal === undefined || oldVal === '' ? 'null' : String(oldVal);
                const newDisplay = newVal === null || newVal === undefined || newVal === '' ? 'null' : String(newVal);
                changes.push({ key, oldDisplay, newDisplay });
            }
        }

        if (changes.length === 0) {
            return <div className="muted" style={{ fontSize: '0.85rem italic' }}>Cambios técnicos (IDs o timestamps)</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {changes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '4px 8px', borderRadius: '6px', background: 'var(--bg)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)', opacity: 0.8 }}>{c.key}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through', fontSize: '0.75rem' }}>{c.oldDisplay}</span>
                            <ArrowRight size={10} className="muted" />
                            <span style={{ color: 'var(--success)', fontWeight: 500 }}>{c.newDisplay}</span>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    if (!hasAccess) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '100px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                    <X size={32} />
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Acceso Denegado</h2>
                <p className="muted">No tenés permisos para ver la auditoría del sistema.</p>
                <button className="btn btn-primary" style={{ marginTop: '24px' }} onClick={() => window.history.back()}>Volver</button>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Auditoría</h1>
                        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>Seguimiento detallado de cambios en la base de datos.</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    background: 'var(--bg-elevated)', 
                    padding: '16px', 
                    borderRadius: '16px', 
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    marginTop: '24px'
                }}>
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input 
                            type="text" 
                            placeholder="Buscar ID o email..." 
                            className="input" 
                            style={{ width: '100%', paddingLeft: '36px' }} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flex: '1 1 400px' }}>
                        <select className="input" style={{ flex: 1 }} value={filterTable} onChange={(e) => { setFilterTable(e.target.value); setPage(1); }}>
                            <option value="Todos">Todas las tablas</option>
                            <option value="sesiones">Sesiones (Tiempo App)</option>
                            <option value="clientes">Clientes</option>
                            <option value="empresa_cliente">Ficha de Cliente</option>
                            <option value="repartidores">Repartidores</option>
                            <option value="usuarios">Usuarios</option>
                        </select>
                        
                        <select className="input" style={{ flex: 1 }} value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}>
                            <option value="Todas">Todas las acciones</option>
                            <option value="INSERT">Altas (Insert)</option>
                            <option value="UPDATE">Modificaciones (Update)</option>
                            <option value="DELETE">Bajas (Delete)</option>
                        </select>
                    </div>
                </div>
            </header>

            <div className="results-container">
                {loading ? (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <div className="skeleton-line" style={{ height: '40px', marginBottom: '16px' }}></div>
                        <div className="skeleton-line" style={{ height: '40px', marginBottom: '16px' }}></div>
                        <div className="skeleton-line" style={{ height: '40px' }}></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '80px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                        <Database size={48} className="muted" style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <h3 className="muted">No se encontraron registros</h3>
                        <p className="muted" style={{ fontSize: '0.9rem' }}>Intentá ajustando los filtros o realizá algún cambio en Clientes para generar logs.</p>
                    </div>
                ) : (
                    <>
                        <div className="desktop-only" style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Momento</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Autor</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tabla e ID</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acción</th>
                                        <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detalles del Cambio</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                            <td style={{ padding: '16px', verticalAlign: 'top', width: '150px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                                                    <Clock size={14} className="muted" />
                                                    {format(parseISO(log.created_at), "HH:mm", { locale: es })}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    {format(parseISO(log.created_at), "dd/MM/yyyy", { locale: es })}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', verticalAlign: 'top', width: '180px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>
                                                        {log.usuarios?.nombre?.charAt(0) || '?'}
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{log.usuarios?.nombre || 'Sistema / Desconocido'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', verticalAlign: 'top', width: '200px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.75rem', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '6px' }}>
                                                    {log.table_name.toUpperCase()}
                                                </div>
                                                <div className="muted" style={{ fontSize: '0.7rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                    ID: {log.record_id}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', verticalAlign: 'top', width: '100px' }}>
                                                <span style={{ 
                                                    display: 'inline-flex',
                                                    padding: '4px 8px', 
                                                    borderRadius: '6px', 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 800, 
                                                    background: log.action_type === 'INSERT' ? 'rgba(34, 197, 94, 0.1)' : log.action_type === 'DELETE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                                                    color: log.action_type === 'INSERT' ? '#22c55e' : log.action_type === 'DELETE' ? '#ef4444' : '#8b5cf6'
                                                }}>
                                                    {log.action_type}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                                {renderDiff(log.old_data, log.new_data)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Grid View */}
                        <div className="mobile-only" style={{ display: 'none', flexDirection: 'column', gap: '16px' }}>
                            {logs.map(log => (
                                <div key={log.id} style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.85rem' }}>
                                            <Clock size={14} className="muted" />
                                            {format(parseISO(log.created_at), "dd/MM HH:mm")}
                                        </div>
                                        <span style={{ 
                                            padding: '2px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.65rem', 
                                            fontWeight: 800, 
                                            background: log.action_type === 'INSERT' ? 'rgba(34, 197, 94, 0.1)' : log.action_type === 'DELETE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)',
                                            color: log.action_type === 'INSERT' ? '#22c55e' : log.action_type === 'DELETE' ? '#ef4444' : '#8b5cf6'
                                        }}>
                                            {log.action_type}
                                        </span>
                                    </div>
                                    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700 }}>
                                            {log.usuarios?.nombre?.charAt(0) || '?'}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{log.usuarios?.nombre || 'Sistema'}</span>
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 700 }}>{log.table_name.toUpperCase()}</div>
                                        <div className="muted" style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>ID: {log.record_id}</div>
                                    </div>
                                    <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                        {renderDiff(log.old_data, log.new_data)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '32px' }}>
                    <button 
                        className="btn btn-secondary" 
                        disabled={page === 1} 
                        onClick={() => { setPage(p => p - 1); window.scrollTo(0,0); }}
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <ChevronLeft size={16} /> Anterior
                    </button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{page}</span>
                        <span className="muted" style={{ fontSize: '0.85rem' }}>de {totalPages}</span>
                    </div>
                    <button 
                        className="btn btn-secondary" 
                        disabled={page === totalPages} 
                        onClick={() => { setPage(p => p + 1); window.scrollTo(0,0); }}
                        style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        Siguiente <ChevronRight size={16} />
                    </button>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: flex !important; }
                }
                .skeleton-line {
                    background: var(--border);
                    border-radius: 8px;
                    animation: pulse 1.5s infinite ease-in-out;
                }
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                    100% { opacity: 0.6; }
                }
            ` }} />
        </div>
    );
};

export default ActividadSistema;
