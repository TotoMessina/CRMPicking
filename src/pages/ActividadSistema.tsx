import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Activity, Clock, Database, ArrowRight, Search, Filter, 
    ChevronLeft, ChevronRight, X, Calendar, User, AlertTriangle, 
    Terminal, Eye, ShieldAlert, Cpu
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action_type: 'INSERT' | 'UPDATE' | 'DELETE' | 'SESSION_END' | string;
    old_data: any;
    new_data: any;
    created_at: string;
    changed_by?: string;
    usuarios?: { nombre: string };
}

interface ErrorLog {
    id: string;
    created_at: string;
    level: 'error' | 'warning' | 'info';
    message: string;
    stack?: string;
    component_stack?: string;
    url?: string;
    user_agent?: string;
    user_email?: string;
    metadata?: any;
}

// Diccionario de humanización de auditoría
const FIELD_DICTIONARY: Record<string, string> = {
    'nombre_local': 'Nombre del Local',
    'nombre': 'Nombre',
    'comentarios_admin': 'Nota Administrativa',
    'comentarios_vendedor': 'Nota del Vendedor',
    'estado': 'Estado Técnico',
    'activo': 'Habilitado',
    'rubro': 'Rubro del Local',
    'telefono': 'Teléfono',
    'direccion': 'Dirección',
    'email': 'Correo Electrónico',
    'role': 'Nivel de Rol',
    'latitud': 'Ubicación Mapa',
    'longitud': 'Ubicación Mapa',
    'notas': 'Notas Adicionales',
    'monto': 'Gestión de Monto ($)',
    'precio': 'Precio de Producto',
    'stock': 'Unidades en Stock',
    'estado_carga': 'Estado de Sincronización',
    'avatar_emoji': 'Avatar/Pin Mapa',
    '_sync_hash': 'Hash Local'
};

const IGNORED_FIELDS = ['lat', 'lng', 'latitud', 'longitud', '_sync_hash', 'updated_at', 'created_at', 'id'];

// Map values for true/false to readable text
const formatVal = (val: any) => {
    if (val === null || val === undefined || val === '') return 'vacío';
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    if (typeof val === 'object') return '{Estructura de Datos}';
    return String(val);
};

export const ActividadSistema: React.FC = () => {
    const { role, paginasPermitidas, empresaActiva }: any = useAuth();
    const isSuperAdmin = role === 'super-admin';
    const hasAccess = isSuperAdmin || (paginasPermitidas && paginasPermitidas['/actividad-sistema']?.includes(role));
    
    // Tab State: 'audit' | 'errors'
    const [activeTab, setActiveTab] = useState<'audit' | 'errors'>('audit');

    // Audit logs state
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [systemUsers, setSystemUsers] = useState<{id: string, nombre: string}[]>([]);
    
    // Error logs state
    const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
    const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const pageSize = 40;

    // Filters for Audit Logs
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTable, setFilterTable] = useState('Todos');
    const [filterAction, setFilterAction] = useState('Todas');
    const [filterUser, setFilterUser] = useState('Todos');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Filters for Error Logs
    const [errorSearch, setErrorSearch] = useState('');
    const [errorLevel, setErrorLevel] = useState('Todos');
    const [errorEnv, setErrorEnv] = useState('Todos');

    // Load users (Audit Logs filter)
    useEffect(() => {
        if (!hasAccess) return;
        (supabase as any).from('usuarios').select('id, nombre').order('nombre').then(({data}: any) => {
            if(data) setSystemUsers(data);
        });
    }, [hasAccess]);

    // Main fetch effect
    useEffect(() => {
        if (!hasAccess) return;
        if (activeTab === 'audit') {
            fetchLogs();
        } else {
            fetchErrorLogs();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, activeTab, hasAccess, filterTable, filterAction, filterUser, dateFrom, dateTo, errorLevel, errorEnv]);

    // Fetch Audit Logs
    const fetchLogs = async () => {
        setLoading(true);
        if (!empresaActiva?.id) { setLoading(false); return; }

        let query = (supabase as any)
            .from('audit_logs')
            .select('*, usuarios(nombre)', { count: 'exact' })
            .eq('empresa_id', empresaActiva.id);

        if (filterTable !== 'Todos') query = query.eq('table_name', filterTable);
        if (filterAction !== 'Todas') query = query.eq('action_type', filterAction);
        if (filterUser !== 'Todos') query = query.eq('changed_by', filterUser);

        if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
        if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999`);

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
            console.error("Error fetching audit logs:", error);
        } else {
            setLogs((data || []) as AuditLog[]);
            setTotalCount(count || 0);
            setTotalPages(Math.max(1, Math.ceil((count || 0) / pageSize)));
        }
        setLoading(false);
    };

    // Fetch Error Logs
    const fetchErrorLogs = async () => {
        setLoading(true);

        // Fetch logs directly
        let query = supabase
            .from('error_logs')
            .select('*', { count: 'exact' });

        if (errorLevel !== 'Todos') {
            query = query.eq('level', errorLevel);
        }

        // Environment filter (JSONB metadata check)
        if (errorEnv !== 'Todos') {
            query = query.eq('metadata->>environment', errorEnv);
        }

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
            console.error("Error fetching error logs:", error);
        } else {
            setErrorLogs((data || []) as ErrorLog[]);
            setTotalCount(count || 0);
            setTotalPages(Math.max(1, Math.ceil((count || 0) / pageSize)));
        }
        setLoading(false);
    };

    // Humanize user agents
    const parseUserAgent = (ua?: string) => {
        if (!ua) return 'Dispositivo Desconocido';
        const lower = ua.toLowerCase();
        if (lower.includes('iphone') || lower.includes('ipad')) return 'iOS Mobile';
        if (lower.includes('android')) return 'Android Mobile';
        if (lower.includes('macintosh')) return 'macOS Desktop';
        if (lower.includes('windows')) return 'Windows Desktop';
        if (lower.includes('linux')) return 'Linux Desktop';
        return 'Navegador Web';
    };

    const renderDiff = (oldData: any, newData: any) => {
        if (!oldData && !newData) return <div className="muted" style={{ fontSize: '0.85rem' }}>El sistema ejecutó una rutina silenciosa.</div>;
        
        if (!oldData && newData) {
            const ident = newData.nombre_local || newData.nombre || newData.email || newData.titulo || 'un registro';
            return (
                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>
                        ✨ Creó el elemento <strong>{ident}</strong> por primera vez en el sistema.
                    </span>
                </div>
            );
        }
        
        if (oldData && !newData) {
            const ident = oldData.nombre_local || oldData.nombre || oldData.email || oldData.titulo || 'un registro';
            return (
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger)' }}>
                        🗑️ Eliminó definitivamente a <strong>{ident}</strong> de la base de datos.
                    </span>
                </div>
            );
        }
        
        if (newData && newData.duracion) {
            return (
                <div style={{ padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                        <Clock size={16} /> Culminó su jornada (Cerró App)
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        Tiempo total activo: <span style={{ fontSize: '1rem', fontWeight: 800 }}>{newData.duracion}</span>
                    </div>
                </div>
            );
        }

        const changes = [];
        for (const key in newData) {
            if (IGNORED_FIELDS.includes(key)) continue;
            
            const oldVal = oldData[key];
            const newVal = newData[key];
            
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                const oldDisplay = formatVal(oldVal);
                const newDisplay = formatVal(newVal);
                const humanKey = FIELD_DICTIONARY[key] || key;
                changes.push({ key: humanKey, oldDisplay, newDisplay });
            }
        }

        if (changes.length === 0) {
            return <div className="muted" style={{ fontSize: '0.8rem italic' }}>Ajuste interno automático sin impacto visual.</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Modificaciones realizadas:</span>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {changes.map((c, i) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                            Actualizó <strong>{c.key}</strong>
                            {c.oldDisplay !== 'vacío' ? (
                                <span>, pasando de <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{c.oldDisplay}</span> a <strong style={{ color: 'var(--success)' }}>{c.newDisplay}</strong>.</span>
                            ) : (
                                <span>, agregando el dato <strong style={{ color: 'var(--success)' }}>{c.newDisplay}</strong>.</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    // Filter local search for error logs
    const filteredErrorLogs = useMemo(() => {
        if (!errorSearch) return errorLogs;
        const s = errorSearch.toLowerCase();
        return errorLogs.filter(log => 
            log.message.toLowerCase().includes(s) || 
            (log.stack && log.stack.toLowerCase().includes(s)) ||
            (log.user_email && log.user_email.toLowerCase().includes(s))
        );
    }, [errorLogs, errorSearch]);

    if (!hasAccess) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '100px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}><X size={32} /></div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Acceso Denegado</h2>
                <p className="muted">No tenés permisos para ver la auditoría del sistema.</p>
                <button className="btn-primario" style={{ marginTop: '24px' }} onClick={() => window.history.back()}>Regresar</button>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
            <header style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
                        <Activity size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Inspección & Auditoría</h1>
                        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>Visor rastreador de incidentes y modificaciones ejecutadas por los empleados.</p>
                    </div>
                </div>

                {/* PREMIUM TAB SWITCHER */}
                <div style={{ 
                    display: 'flex', gap: '8px', background: 'var(--bg-elevated)', 
                    padding: '6px', borderRadius: '12px', border: '1px solid var(--border)',
                    maxWidth: 'fit-content', marginTop: '20px'
                }}>
                    <button 
                        onClick={() => { setActiveTab('audit'); setPage(1); }}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: activeTab === 'audit' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'audit' ? '#fff' : 'var(--text-muted)',
                            fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.25s ease',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Database size={16} /> Auditoría de Datos
                    </button>
                    <button 
                        onClick={() => { setActiveTab('errors'); setPage(1); }}
                        style={{
                            padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: activeTab === 'errors' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'errors' ? '#fff' : 'var(--text-muted)',
                            fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.25s ease',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <ShieldAlert size={16} /> Telemetría de Errores
                    </button>
                </div>

                {/* --- FILTERS FOR AUDIT LOGS --- */}
                {activeTab === 'audit' && (
                    <div className="filters-grid" style={{ 
                        display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-elevated)', 
                        padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)', marginTop: '16px'
                    }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ flex: '1 1 200px', position: 'relative' }}>
                                <Search size={16} className="muted" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="text" placeholder="Buscar por ID..." className="input premium-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '36px', width: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', flex: '1 1 300px', gap: '8px' }}>
                                <select className="input premium-input" style={{ flex: 1 }} value={filterTable} onChange={e => {setFilterTable(e.target.value); setPage(1);}}>
                                    <option value="Todos">Todas las tablas (Estructural)</option>
                                    <option value="clientes">📍 Gestor Clientes</option>
                                    <option value="visitas_diarias">🗓️ Asignaciones de Rutas</option>
                                    <option value="repartidores">🚚 Gestión Repartidores</option>
                                    <option value="usuarios">🧑‍💻 Credenciales Usuarios</option>
                                </select>
                                <select className="input premium-input" style={{ flex: 1 }} value={filterAction} onChange={e => {setFilterAction(e.target.value); setPage(1);}}>
                                    <option value="Todas">Todas las acciones</option>
                                    <option value="INSERT">➕ Nuevas (Creaciones)</option>
                                    <option value="UPDATE">✏️ Modificaciones</option>
                                    <option value="DELETE">❌ Papelera (Eliminaciones)</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px' }}>
                                <User size={16} className="muted" />
                                <select className="input premium-input" style={{ width: '100%' }} value={filterUser} onChange={e => {setFilterUser(e.target.value); setPage(1);}}>
                                    <option value="Todos">Cualquier Trabajador</option>
                                    {systemUsers.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 300px' }}>
                                <Calendar size={16} className="muted" />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                                    <input type="date" className="input premium-input" style={{ flex: 1, padding: '8px' }} title="Desde el día" value={dateFrom} onChange={e => {setDateFrom(e.target.value); setPage(1);}} />
                                    <span className="muted" style={{ fontWeight: 600 }}>🠖</span>
                                    <input type="date" className="input premium-input" style={{ flex: 1, padding: '8px' }} title="Hasta el día" value={dateTo} onChange={e => {setDateTo(e.target.value); setPage(1);}} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- FILTERS FOR ERROR LOGS --- */}
                {activeTab === 'errors' && (
                    <div className="filters-grid" style={{ 
                        display: 'flex', flexWrap: 'wrap', gap: '12px', background: 'var(--bg-elevated)', 
                        padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)', marginTop: '16px'
                    }}>
                        <div style={{ flex: '1 1 300px', position: 'relative' }}>
                            <Search size={16} className="muted" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                            <input 
                                type="text" 
                                placeholder="Filtrar por mensaje, email o stack trace..." 
                                className="input premium-input" 
                                value={errorSearch} 
                                onChange={e => setErrorSearch(e.target.value)} 
                                style={{ paddingLeft: '36px', width: '100%' }} 
                            />
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <select className="input premium-input" style={{ width: '100%' }} value={errorLevel} onChange={e => {setErrorLevel(e.target.value); setPage(1);}}>
                                <option value="Todos">Cualquier Nivel</option>
                                <option value="error">❌ Error</option>
                                <option value="warning">⚠️ Advertencia</option>
                                <option value="info">ℹ️ Información</option>
                            </select>
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <select className="input premium-input" style={{ width: '100%' }} value={errorEnv} onChange={e => {setErrorEnv(e.target.value); setPage(1);}}>
                                <option value="Todos">Todos los Entornos</option>
                                <option value="production">🌐 Producción</option>
                                <option value="development">💻 Desarrollo</option>
                            </select>
                        </div>
                    </div>
                )}
            </header>

            {/* --- RESULTS VIEWS --- */}
            <div className="results-container">
                {loading ? (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px dashed var(--border)' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                        <div className="muted">Indagando bitácora de seguridad...</div>
                    </div>
                ) : activeTab === 'audit' ? (
                    // --- AUDIT VIEW ---
                    logs.filter(l => !searchTerm || l.record_id.includes(searchTerm)).length === 0 ? (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '80px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                            <Database size={48} className="text-accent" style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <h3 className="muted">No hay actividad para este filtro</h3>
                            <p className="muted" style={{ fontSize: '0.9rem' }}>Modificá las fechas, el autor o la tabla para descubrir acciones.</p>
                        </div>
                    ) : (
                        <>
                            <div className="desktop-only" style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ocurrió El</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Empleado</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoría Origen</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Detalles (Antes 🠖 Después)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.filter(l => !searchTerm || l.record_id.includes(searchTerm)).map(log => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '16px', verticalAlign: 'top', width: '140px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
                                                        <Clock size={14} className="text-accent" />
                                                        {format(parseISO(log.created_at), "HH:mm:ss", { locale: es })}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                        {format(parseISO(log.created_at), "dd MMMM yyyy", { locale: es })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', verticalAlign: 'top', width: '180px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                                                            {log.usuarios?.nombre?.charAt(0) || '?'}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.usuarios?.nombre || 'Proceso de Sistema'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', verticalAlign: 'top', width: '200px' }}>
                                                    <div style={{ fontWeight: 800, fontSize: '0.7rem', background: 'var(--bg-body)', color: 'var(--text)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block', marginBottom: '6px' }}>
                                                        {log.table_name.toUpperCase()}
                                                    </div>
                                                    <div className="muted" style={{ fontSize: '0.65rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>ID: {log.record_id.split('-')[0]}...</div>
                                                </td>
                                                <td style={{ padding: '16px', verticalAlign: 'top', width: '100px' }}>
                                                    <span style={{ display: 'inline-flex', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, background: log.action_type === 'INSERT' ? 'rgba(34, 197, 94, 0.1)' : log.action_type === 'DELETE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)', color: log.action_type === 'INSERT' ? '#22c55e' : log.action_type === 'DELETE' ? '#ef4444' : '#0284c7', border: '1px solid currentColor' }}>
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
                                {logs.filter(l => !searchTerm || l.record_id.includes(searchTerm)).map(log => (
                                    <div key={log.id} style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                                                <Clock size={14} className="text-accent" />
                                                {format(parseISO(log.created_at), "dd/MM HH:mm")}
                                            </div>
                                            <span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, background: log.action_type === 'INSERT' ? 'rgba(34, 197, 94, 0.1)' : log.action_type === 'DELETE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)', color: log.action_type === 'INSERT' ? '#22c55e' : log.action_type === 'DELETE' ? '#ef4444' : '#0284c7', border: '1px solid currentColor' }}>
                                                {log.action_type}
                                            </span>
                                        </div>
                                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{log.usuarios?.nombre?.charAt(0) || '?'}</div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{log.usuarios?.nombre || 'SISTEMA'}</span>
                                        </div>
                                        <div style={{ marginBottom: '16px' }}>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>{log.table_name.toUpperCase()}</div>
                                        </div>
                                        <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            {renderDiff(log.old_data, log.new_data)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )
                ) : (
                    // --- TELEMETRY / ERRORS VIEW ---
                    filteredErrorLogs.length === 0 ? (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '80px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                            <AlertTriangle size={48} className="text-accent" style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <h3 className="muted">Impecable. No se reportaron errores de aplicación.</h3>
                            <p className="muted" style={{ fontSize: '0.9rem' }}>El monitoreo en tiempo real no reporta anomalías ni excepciones de JS.</p>
                        </div>
                    ) : (
                        <>
                            <div className="desktop-only" style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fecha</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '100px' }}>Nivel</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mensaje de Error</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Usuario / Entorno</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '200px' }}>Dispositivo / URL</th>
                                            <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '80px' }}>Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredErrorLogs.map(log => {
                                            const colors = {
                                                error: { bg: 'rgba(239, 68, 68, 0.1)', txt: '#ef4444' },
                                                warning: { bg: 'rgba(245, 158, 11, 0.1)', txt: '#f59e0b' },
                                                info: { bg: 'rgba(59, 130, 246, 0.1)', txt: '#3b82f6' }
                                            }[log.level] || { bg: 'rgba(148, 163, 184, 0.1)', txt: '#94a3b8' };

                                            const env = log.metadata?.environment || 'unknown';
                                            const envLabel = env === 'production' ? '🌐 Prod' : '💻 Dev';

                                            return (
                                                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: '16px', verticalAlign: 'top', width: '140px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
                                                            <Clock size={14} className="text-accent" />
                                                            {format(parseISO(log.created_at), "HH:mm:ss", { locale: es })}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            {format(parseISO(log.created_at), "dd MMM yyyy", { locale: es })}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                                        <span style={{ 
                                                            display: 'inline-flex', padding: '4px 10px', borderRadius: '20px', 
                                                            fontSize: '0.65rem', fontWeight: 800, background: colors.bg, 
                                                            color: colors.txt, border: '1px solid currentColor', textTransform: 'uppercase'
                                                        }}>
                                                            {log.level}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px', verticalAlign: 'top', maxWidth: '300px' }}>
                                                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', wordBreak: 'break-word' }}>
                                                            {log.message}
                                                        </div>
                                                        {log.stack && (
                                                            <div className="muted" style={{ 
                                                                fontSize: '0.7rem', fontFamily: 'monospace', marginTop: '6px', 
                                                                maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', 
                                                                whiteSpace: 'nowrap', opacity: 0.6
                                                            }}>
                                                                {log.stack.split('\n')[1] || log.stack}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '16px', verticalAlign: 'top' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{log.user_email || 'Anónimo / Sin sesion'}</div>
                                                        <div style={{ 
                                                            fontSize: '0.7rem', color: env === 'production' ? 'var(--success)' : 'var(--text-muted)', 
                                                            marginTop: '4px', fontWeight: 800 
                                                        }}>
                                                            {envLabel}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px', verticalAlign: 'top', maxWidth: '200px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                            <Cpu size={12} className="muted" />
                                                            {parseUserAgent(log.user_agent)}
                                                        </div>
                                                        <div className="muted" style={{ 
                                                            fontSize: '0.7rem', wordBreak: 'break-all', marginTop: '4px', 
                                                            fontFamily: 'monospace', opacity: 0.6 
                                                        }} title={log.url}>
                                                            {log.url ? new URL(log.url).pathname : '/'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '16px', verticalAlign: 'top', textAlign: 'center' }}>
                                                        <button 
                                                            className="btn-secundario" 
                                                            style={{ padding: '6px', borderRadius: '8px' }} 
                                                            title="Inspeccionar Error"
                                                            onClick={() => setSelectedError(log)}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Grid View */}
                            <div className="mobile-only" style={{ display: 'none', flexDirection: 'column', gap: '16px' }}>
                                {filteredErrorLogs.map(log => {
                                    const colors = {
                                        error: { bg: 'rgba(239, 68, 68, 0.1)', txt: '#ef4444' },
                                        warning: { bg: 'rgba(245, 158, 11, 0.1)', txt: '#f59e0b' },
                                        info: { bg: 'rgba(59, 130, 246, 0.1)', txt: '#3b82f6' }
                                    }[log.level] || { bg: 'rgba(148, 163, 184, 0.1)', txt: '#94a3b8' };

                                    const env = log.metadata?.environment || 'unknown';

                                    return (
                                        <div key={log.id} style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '16px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem' }}>
                                                    <Clock size={14} className="text-accent" />
                                                    {format(parseISO(log.created_at), "dd/MM HH:mm:ss")}
                                                </div>
                                                <span style={{ 
                                                    padding: '4px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, 
                                                    background: colors.bg, color: colors.txt, border: '1px solid currentColor', textTransform: 'uppercase'
                                                }}>
                                                    {log.level}
                                                </span>
                                            </div>
                                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '8px' }}>
                                                {log.message}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                                Usuario: <strong>{log.user_email || 'Sin sesión'}</strong> ({env})
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                                    {log.url ? new URL(log.url).pathname : '/'}
                                                </span>
                                                <button 
                                                    className="btn-secundario" 
                                                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                    onClick={() => setSelectedError(log)}
                                                >
                                                    <Eye size={14} /> Inspeccionar
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )
                )}
            </div>

            {/* --- PAGINATION --- */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '32px' }}>
                    <button className="btn-secundario" disabled={page === 1} onClick={() => { setPage(p => p - 1); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}><ChevronLeft size={16} /> Atrás</button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent)' }}>{page}</span>
                        <span className="muted" style={{ fontSize: '0.85rem' }}>/ {totalPages}</span>
                    </div>
                    <button className="btn-secundario" disabled={page === totalPages} onClick={() => { setPage(p => p + 1); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>Siguiente <ChevronRight size={16} /></button>
                </div>
            )}

            {/* --- PREMIUM SENTRY-LIKE ERROR DETAILS MODAL --- */}
            {selectedError && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'grid', placeItems: 'center', zIndex: 1000, padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--bg-elevated)', borderRadius: '20px', border: '1px solid var(--border)',
                        width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)',
                        position: 'relative'
                    }}>
                        {/* Header */}
                        <header style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                            background: 'rgba(239, 68, 68, 0.03)'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <span style={{ 
                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 900,
                                        background: selectedError.level === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                        color: selectedError.level === 'error' ? '#ef4444' : '#f59e0b',
                                        border: '1px solid currentColor', textTransform: 'uppercase'
                                    }}>
                                        {selectedError.level}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        ID: {selectedError.id}
                                    </span>
                                </div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1.4 }}>
                                    {selectedError.message}
                                </h3>
                            </div>
                            <button 
                                onClick={() => setSelectedError(null)} 
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            >
                                <X size={20} />
                            </button>
                        </header>

                        {/* Body */}
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Contextual Specs Grid */}
                            <div style={{ 
                                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                gap: '12px', background: 'var(--bg-body)', padding: '16px', borderRadius: '12px',
                                border: '1px solid var(--border)'
                            }}>
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Ocurrió El</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                                        {format(parseISO(selectedError.created_at), "dd MMMM yyyy, HH:mm:ss", { locale: es })}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Usuario Afectado</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                                        {selectedError.user_email || 'Sesión Anónima'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>URL de Origen</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                        {selectedError.url || '/'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>Entorno de Ejecución</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px', color: selectedError.metadata?.environment === 'production' ? 'var(--success)' : 'inherit' }}>
                                        {selectedError.metadata?.environment === 'production' ? '🌐 Producción' : '💻 Desarrollo'}
                                    </div>
                                </div>
                            </div>

                            {/* Stack Trace */}
                            {selectedError.stack && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Terminal size={14} className="text-accent" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                            Rastreo de Pila (Stack Trace)
                                        </span>
                                    </div>
                                    <pre style={{
                                        margin: 0, padding: '16px', background: '#09090b', color: '#a1a1aa',
                                        borderRadius: '12px', border: '1px solid #27272a',
                                        fontSize: '0.75rem', fontFamily: 'monospace', overflowX: 'auto',
                                        whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto',
                                        lineHeight: 1.5
                                    }}>
                                        {selectedError.stack}
                                    </pre>
                                </div>
                            )}

                            {/* React Component Stack */}
                            {selectedError.component_stack && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Activity size={14} className="text-accent" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                            Componentes React (Component Tree Stack)
                                        </span>
                                    </div>
                                    <pre style={{
                                        margin: 0, padding: '16px', background: '#09090b', color: '#f43f5e',
                                        borderRadius: '12px', border: '1px solid rgba(244, 63, 94, 0.1)',
                                        fontSize: '0.75rem', fontFamily: 'monospace', overflowX: 'auto',
                                        whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto',
                                        lineHeight: 1.5
                                    }}>
                                        {selectedError.component_stack}
                                    </pre>
                                </div>
                            )}

                            {/* Metadata & User Agent JSON */}
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    Metadatos Completo & Agente de Usuario
                                </div>
                                <div style={{ 
                                    background: 'var(--bg-body)', padding: '16px', borderRadius: '12px', 
                                    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px'
                                }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <strong>User Agent:</strong> {selectedError.user_agent}
                                    </div>
                                    <pre style={{
                                        margin: 0, fontSize: '0.75rem', fontFamily: 'monospace',
                                        color: 'var(--text)', background: 'transparent', border: 'none', padding: 0
                                    }}>
                                        {JSON.stringify(selectedError.metadata || {}, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <footer style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                            <button className="btn-primario" onClick={() => setSelectedError(null)}>
                                Cerrar Inspección
                            </button>
                        </footer>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                    .mobile-only { display: flex !important; }
                }
            ` }} />
        </div>
    );
};

export default ActividadSistema;
