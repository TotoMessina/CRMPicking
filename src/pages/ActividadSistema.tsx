import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    Activity, Clock, Database, ArrowRight, Search, Filter, 
    ChevronLeft, ChevronRight, X, Calendar, User, AlertTriangle, 
    Terminal, Eye, ShieldAlert, Cpu, Download
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useActividadSistema } from '../hooks/useActividadSistema';

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

export const ActividadSistema: React.FC = () => {
    const {
        t,
        i18n,
        dateLocale,
        isSuperAdmin,
        hasAccess,
        activeTab,
        setActiveTab,
        logs,
        systemUsers,
        errorLogs,
        selectedError,
        setSelectedError,
        dbaStats,
        loadingDba,
        copiedQueryIndex,
        setCopiedQueryIndex,
        loading,
        page,
        setPage,
        totalPages,
        totalCount,
        searchTerm,
        setSearchTerm,
        filterTable,
        setFilterTable,
        filterAction,
        setFilterAction,
        filterUser,
        setFilterUser,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        errorSearch,
        setErrorSearch,
        errorLevel,
        setErrorLevel,
        errorEnv,
        setErrorEnv,
        fetchLogs,
        fetchErrorLogs,
        fetchDbaStats,
        parseUserAgent
    } = useActividadSistema();

    // Map values for true/false to readable text
    const formatVal = (val: any) => {
        if (val === null || val === undefined || val === '') return t('common.never', 'vacío');
        if (typeof val === 'boolean') return val ? t('common.yes', 'Sí') : t('common.no', 'No');
        if (typeof val === 'object') return '{Estructura de Datos}';
        return String(val);
    };

    const renderDiff = (oldData: any, newData: any) => {
        if (!oldData && !newData) return <div className="muted" style={{ fontSize: '0.85rem' }}>{t('audit.diff.silent')}</div>;
        
        if (!oldData && newData) {
            const ident = newData.nombre_local || newData.nombre || newData.email || newData.titulo || t('common.reference', 'un registro');
            return (
                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--success)' }}>
                        ✨ {t('audit.diff.created_prefix')} <strong>{ident}</strong> {t('audit.diff.created_suffix')}
                    </span>
                </div>
            );
        }
        
        if (oldData && !newData) {
            const ident = oldData.nombre_local || oldData.nombre || oldData.email || oldData.titulo || t('common.reference', 'un registro');
            return (
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--danger)' }}>
                        🗑️ {t('audit.diff.deleted_prefix')} <strong>{ident}</strong> {t('audit.diff.deleted_suffix')}
                    </span>
                </div>
            );
        }
        
        if (newData && newData.duracion) {
            return (
                <div style={{ padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
                        <Clock size={16} /> {t('audit.diff.shift_end')}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                        {t('audit.diff.total_active')} <span style={{ fontSize: '1rem', fontWeight: 800 }}>{newData.duracion}</span>
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
            return <div className="muted" style={{ fontSize: '0.8rem italic' }}>{t('audit.diff.internal_adjust')}</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t('audit.diff.updated_label')}</span>
                <ul style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {changes.map((c, i) => (
                        <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                            {c.oldDisplay !== t('common.never') ? (
                                <span>
                                    {t('audit.diff.updated_item_prefix')} <strong>{c.key}</strong>
                                    {t('audit.diff.updated_item_from')} <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{c.oldDisplay}</span> {t('audit.diff.updated_item_to')} <strong style={{ color: 'var(--success)' }}>{c.newDisplay}</strong>.
                                </span>
                            ) : (
                                <span>
                                    {t('audit.diff.added_item_prefix')} <strong>{c.key}</strong>
                                    {t('audit.diff.added_item_suffix')} <strong style={{ color: 'var(--success)' }}>{c.newDisplay}</strong>.
                                </span>
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
                <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{t('audit.access_denied')}</h2>
                <p className="muted">{t('audit.no_permissions')}</p>
                <button className="btn-primario" style={{ marginTop: '24px' }} onClick={() => window.history.back()}>{t('audit.go_back')}</button>
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
                        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>{t('audit.title')}</h1>
                        <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>{t('audit.subtitle')}</p>
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
                        <Database size={16} /> {t('audit.tab_audit')}
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
                        <ShieldAlert size={16} /> {t('audit.tab_errors')}
                    </button>
                    {isSuperAdmin && (
                        <button 
                            onClick={() => { setActiveTab('performance'); setPage(1); }}
                            style={{
                                padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                background: activeTab === 'performance' ? 'var(--accent)' : 'transparent',
                                color: activeTab === 'performance' ? '#fff' : 'var(--text-muted)',
                                fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.25s ease',
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            <Cpu size={16} /> {t('audit.tab_dba')}
                        </button>
                    )}
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
                                <input type="text" placeholder={t('audit.search_id')} className="input premium-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ paddingLeft: '36px', width: '100%' }} />
                            </div>
                            <div style={{ display: 'flex', flex: '1 1 300px', gap: '8px' }}>
                                <select className="input premium-input" style={{ flex: 1 }} value={filterTable} onChange={e => {setFilterTable(e.target.value); setPage(1);}}>
                                    <option value="Todos">{t('audit.tables.all')}</option>
                                    <option value="clientes">{t('audit.tables.clients')}</option>
                                    <option value="visitas_diarias">{t('audit.tables.routes')}</option>
                                    <option value="repartidores">{t('audit.tables.drivers')}</option>
                                    <option value="usuarios">{t('audit.tables.users')}</option>
                                </select>
                                <select className="input premium-input" style={{ flex: 1 }} value={filterAction} onChange={e => {setFilterAction(e.target.value); setPage(1);}}>
                                    <option value="Todas">{t('audit.actions.all')}</option>
                                    <option value="INSERT">{t('audit.actions.insert')}</option>
                                    <option value="UPDATE">{t('audit.actions.update')}</option>
                                    <option value="DELETE">{t('audit.actions.delete')}</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 200px' }}>
                                <User size={16} className="muted" />
                                <select className="input premium-input" style={{ width: '100%' }} value={filterUser} onChange={e => {setFilterUser(e.target.value); setPage(1);}}>
                                    <option value="Todos">{t('audit.workers.any')}</option>
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
                                placeholder={t('audit.search_errors')} 
                                className="input premium-input" 
                                value={errorSearch} 
                                onChange={e => setErrorSearch(e.target.value)} 
                                style={{ paddingLeft: '36px', width: '100%' }} 
                            />
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <select className="input premium-input" style={{ width: '100%' }} value={errorLevel} onChange={e => {setErrorLevel(e.target.value); setPage(1);}}>
                                <option value="Todos">{t('audit.levels.any')}</option>
                                <option value="error">{t('audit.levels.error')}</option>
                                <option value="warning">{t('audit.levels.warning')}</option>
                                <option value="info">{t('audit.levels.info')}</option>
                            </select>
                        </div>
                        <div style={{ flex: '1 1 180px' }}>
                            <select className="input premium-input" style={{ width: '100%' }} value={errorEnv} onChange={e => {setErrorEnv(e.target.value); setPage(1);}}>
                                <option value="Todos">{t('audit.environments.all')}</option>
                                <option value="production">{t('audit.environments.production')}</option>
                                <option value="development">{t('audit.environments.development')}</option>
                            </select>
                        </div>
                    </div>
                )}
            </header>

            {/* --- RESULTS VIEWS --- */}
            <div className="results-container">
                {loading || loadingDba ? (
                    <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px dashed var(--border)' }}>
                        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                        <div className="muted">{t('audit.loading')}</div>
                    </div>
) : activeTab === 'audit' ? (
                    // --- AUDIT VIEW ---
                    logs.filter(l => !searchTerm || l.record_id.includes(searchTerm)).length === 0 ? (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '80px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                            <Database size={48} className="text-accent" style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <h3 className="muted">{t('audit.no_activity')}</h3>
                            <p className="muted" style={{ fontSize: '0.9rem' }}>{t('audit.no_activity_desc')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="desktop-only" style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.headers.occurred_on')}</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.headers.employee')}</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.headers.category')}</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.headers.type')}</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.headers.details')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.filter(l => !searchTerm || l.record_id.includes(searchTerm)).map(log => (
                                            <tr key={log.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '16px', verticalAlign: 'top', width: '140px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
                                                        <Clock size={14} className="text-accent" />
                                                        {format(parseISO(log.created_at), "HH:mm:ss", { locale: dateLocale })}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                        {format(parseISO(log.created_at), i18n.language === 'en' ? "MMMM dd yyyy" : "dd MMMM yyyy", { locale: dateLocale })}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', verticalAlign: 'top', width: '180px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                                                            {log.usuarios?.nombre?.charAt(0) || '?'}
                                                        </div>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.usuarios?.nombre || t('audit.workers.system')}</span>
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
                                                {format(parseISO(log.created_at), "dd/MM HH:mm", { locale: dateLocale })}
                                            </div>
                                            <span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, background: log.action_type === 'INSERT' ? 'rgba(34, 197, 94, 0.1)' : log.action_type === 'DELETE' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(14, 165, 233, 0.1)', color: log.action_type === 'INSERT' ? '#22c55e' : log.action_type === 'DELETE' ? '#ef4444' : '#0284c7', border: '1px solid currentColor' }}>
                                                {log.action_type}
                                            </span>
                                        </div>
                                        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(124,58,237,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{log.usuarios?.nombre?.charAt(0) || '?'}</div>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{log.usuarios?.nombre || t('audit.workers.system').toUpperCase()}</span>
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
                ) : activeTab === 'errors' ? (
                    // --- TELEMETRY / ERRORS VIEW ---
                    filteredErrorLogs.length === 0 ? (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '80px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                            <AlertTriangle size={48} className="text-accent" style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <h3 className="muted">{t('audit.no_errors')}</h3>
                            <p className="muted" style={{ fontSize: '0.9rem' }}>{t('audit.no_errors_desc')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="desktop-only" style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.headers_error.date')}</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '100px' }}>{t('audit.headers_error.level')}</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.headers_error.message')}</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.headers_error.user_env')}</th>
                                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '200px' }}>{t('audit.headers_error.device_url')}</th>
                                            <th style={{ padding: '16px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', width: '80px' }}>{t('audit.headers_error.action')}</th>
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
                                                            {format(parseISO(log.created_at), "HH:mm:ss", { locale: dateLocale })}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                            {format(parseISO(log.created_at), i18n.language === 'en' ? "MMM dd yyyy" : "dd MMM yyyy", { locale: dateLocale })}
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
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{log.user_email || t('audit.inspector.anonymous')}</div>
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
                                                            title={t('audit.inspector.title')}
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
                                                    {format(parseISO(log.created_at), "dd/MM HH:mm:ss", { locale: dateLocale })}
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
                                                {t('audit.inspector.affected_user')}: <strong>{log.user_email || t('audit.inspector.anonymous')}</strong> ({env})
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
                                                    <Eye size={14} /> {t('audit.inspector.inspect')}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )
                ) : (
                    // --- DBA COCKPIT VIEW ---
                    !dbaStats ? (
                        <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '80px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                            <AlertTriangle size={48} className="text-accent" style={{ marginBottom: '16px', opacity: 0.3 }} />
                            <h3 className="muted">{t('audit.dba.error_loading')}</h3>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Subtitle & Export Button */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <span className="muted" style={{ fontSize: '0.9rem' }}>{t('audit.dba.subtitle')}</span>
                                <button 
                                    onClick={() => {
                                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dbaStats, null, 2));
                                        const downloadAnchor = document.createElement('a');
                                        downloadAnchor.setAttribute("href", dataStr);
                                        downloadAnchor.setAttribute("download", `dba_diagnostics_${new Date().toISOString().split('T')[0]}.json`);
                                        document.body.appendChild(downloadAnchor);
                                        downloadAnchor.click();
                                        downloadAnchor.remove();
                                    }}
                                    className="btn-secundario"
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem' }}
                                >
                                    <Download size={16} /> {t('audit.dba.export_json')}
                                </button>
                            </div>

                            {/* DBA Premium Cards Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                                {/* Card 1: Total Storage */}
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Database size={22} />
                                    </div>
                                    <div>
                                        <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.dba.card_total_size')}</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
                                            {(() => {
                                                const totalBytes = (dbaStats.storage || []).reduce((acc: number, item: any) => acc + Number(item.table_size_bytes || 0) + Number(item.index_size_bytes || 0), 0);
                                                if (totalBytes === 0) return '0 B';
                                                const k = 1024;
                                                const sizes = ['B', 'KB', 'MB', 'GB'];
                                                const idxVal = Math.floor(Math.log(totalBytes) / Math.log(k));
                                                return parseFloat((totalBytes / Math.pow(k, idxVal)).toFixed(2)) + ' ' + sizes[idxVal];
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Cache Hit Rate */}
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Cpu size={22} />
                                    </div>
                                    <div>
                                        <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.dba.card_cache_hit')}</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: (dbaStats.cache?.hit_ratio || 100) > 95 ? '#10b981' : '#f59e0b' }}>
                                            {dbaStats.cache?.hit_ratio || '100'}%
                                        </div>
                                    </div>
                                </div>

                                {/* Card 3: Active Connections */}
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Activity size={22} />
                                    </div>
                                    <div>
                                        <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.dba.card_connections')}</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px' }}>
                                            {dbaStats.sessions?.total_connections || 1}
                                        </div>
                                    </div>
                                </div>

                                {/* Card 4: Unused Indexes */}
                                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: (dbaStats.unused_indexes || []).length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(124, 58, 237, 0.1)', color: (dbaStats.unused_indexes || []).length > 0 ? '#ef4444' : 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <AlertTriangle size={22} />
                                    </div>
                                    <div>
                                        <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('audit.dba.card_unused_indexes')}</div>
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '4px', color: (dbaStats.unused_indexes || []).length > 0 ? '#ef4444' : 'inherit' }}>
                                            {(dbaStats.unused_indexes || []).length}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Storage Ratio Bar Distribution */}
                            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800 }}>{t('audit.dba.storage_distribution')}</h3>
                                <p className="muted" style={{ margin: '0 0 20px 0', fontSize: '0.85rem' }}>{t('audit.dba.storage_desc')}</p>
                                {(() => {
                                    const totalDataBytes = (dbaStats.storage || []).reduce((acc: number, item: any) => acc + Number(item.table_size_bytes || 0), 0);
                                    const totalIndexBytes = (dbaStats.storage || []).reduce((acc: number, item: any) => acc + Number(item.index_size_bytes || 0), 0);
                                    const totalBytes = totalDataBytes + totalIndexBytes;
                                    const dataPercent = totalBytes > 0 ? (totalDataBytes / totalBytes) * 100 : 50;
                                    const indexPercent = totalBytes > 0 ? (totalIndexBytes / totalBytes) * 100 : 50;

                                    const formatBytes = (bytes: number) => {
                                        if (bytes === 0) return '0 B';
                                        const k = 1024;
                                        const sizes = ['B', 'KB', 'MB', 'GB'];
                                        const idxVal = Math.floor(Math.log(bytes) / Math.log(k));
                                        return parseFloat((bytes / Math.pow(k, idxVal)).toFixed(2)) + ' ' + sizes[idxVal];
                                    };

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            <div style={{ height: '32px', borderRadius: '10px', display: 'flex', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-body)' }}>
                                                <div style={{ width: `${dataPercent}%`, background: 'linear-gradient(90deg, var(--accent), #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 800, transition: 'width 0.5s ease' }} title={`Data: ${formatBytes(totalDataBytes)}`}>
                                                    {dataPercent > 15 && `${dataPercent.toFixed(1)}%`}
                                                </div>
                                                <div style={{ width: `${indexPercent}%`, background: 'linear-gradient(90deg, #0ea5e9, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 800, transition: 'width 0.5s ease' }} title={`Indexes: ${formatBytes(totalIndexBytes)}`}>
                                                    {indexPercent > 15 && `${indexPercent.toFixed(1)}%`}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--accent)' }}></span>
                                                    <span style={{ fontWeight: 600 }}>{t('audit.dba.table_data')}:</span>
                                                    <span className="muted">{formatBytes(totalDataBytes)}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#0ea5e9' }}></span>
                                                    <span style={{ fontWeight: 600 }}>{t('audit.dba.table_indexes')}:</span>
                                                    <span className="muted">{formatBytes(totalIndexBytes)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Active Sessions & pg_stat_activity */}
                            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800 }}>{t('audit.dba.connections_monitoring')}</h3>
                                <p className="muted" style={{ margin: '0 0 20px 0', fontSize: '0.85rem' }}>{t('audit.dba.connections_desc')}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                    <div style={{ flex: '1 1 200px', background: 'var(--bg-body)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{dbaStats.sessions?.active_queries || 0}</div>
                                        <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>{t('audit.dba.active_label')}</div>
                                    </div>
                                    <div style={{ flex: '1 1 200px', background: 'var(--bg-body)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>{dbaStats.sessions?.idle_connections || 0}</div>
                                        <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>{t('audit.dba.idle_label')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Slowest Queries Table */}
                            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800 }}>{t('audit.dba.slow_queries')}</h3>
                                <p className="muted" style={{ margin: '0 0 20px 0', fontSize: '0.85rem' }}>{t('audit.dba.slow_queries_desc')}</p>
                                {!(dbaStats.slow_queries) || dbaStats.slow_queries.length === 0 ? (
                                    <div style={{ background: 'var(--bg-body)', borderRadius: '12px', padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        {t('audit.dba.no_slow_queries')}
                                    </div>
                                ) : (
                                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>{t('audit.dba.query_header')}</th>
                                                    <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', width: '80px' }}>{t('audit.dba.calls_header')}</th>
                                                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', width: '100px' }}>{t('audit.dba.total_time_header')}</th>
                                                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', width: '100px' }}>{t('audit.dba.mean_time_header')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dbaStats.slow_queries.map((q: any, idxQ: number) => (
                                                    <tr key={idxQ} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                        <td style={{ padding: '12px', verticalAlign: 'middle', maxWidth: '300px' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                <code style={{ background: 'var(--bg-body)', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', display: 'block', overflowX: 'auto', whiteSpace: 'pre', fontFamily: 'monospace', maxHeight: '60px', overflowY: 'auto' }}>
                                                                    {q.query}
                                                                </code>
                                                                <button 
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(q.query);
                                                                        setCopiedQueryIndex(idxQ);
                                                                        setTimeout(() => setCopiedQueryIndex(null), 2000);
                                                                    }}
                                                                    style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                >
                                                                    {copiedQueryIndex === idxQ ? '✔️ Copied!' : t('audit.dba.copy_query')}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700 }}>{q.calls}</td>
                                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{q.total_time_ms.toLocaleString()} ms</td>
                                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{q.mean_time_ms.toLocaleString()} ms</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Unused Indexes Panel */}
                            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 800 }}>{t('audit.dba.unused_indexes_panel')}</h3>
                                <p className="muted" style={{ margin: '0 0 20px 0', fontSize: '0.85rem' }}>{t('audit.dba.unused_indexes_desc')}</p>
                                {!(dbaStats.unused_indexes) || dbaStats.unused_indexes.length === 0 ? (
                                    <div style={{ background: 'var(--bg-body)', borderRadius: '12px', padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', color: '#10b981', fontWeight: 700, fontSize: '0.85rem' }}>
                                        ✔️ {t('audit.dba.no_unused_indexes')}
                                    </div>
                                ) : (
                                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>{t('audit.dba.index_name_header')}</th>
                                                    <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)' }}>{t('audit.headers.category')}</th>
                                                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', width: '100px' }}>{t('audit.dba.scans_header')}</th>
                                                    <th style={{ padding: '12px', textAlign: 'right', color: 'var(--text-muted)', width: '120px' }}>{t('audit.dba.card_unused_indexes')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dbaStats.unused_indexes.map((idx: any, idxI: number) => {
                                                    const formatBytes = (bytes: number) => {
                                                        if (bytes === 0) return '0 B';
                                                        const k = 1024;
                                                        const sizes = ['B', 'KB', 'MB', 'GB'];
                                                        const idxVal = Math.floor(Math.log(bytes) / Math.log(k));
                                                        return parseFloat((bytes / Math.pow(k, idxVal)).toFixed(2)) + ' ' + sizes[idxVal];
                                                    };
                                                    return (
                                                        <tr key={idxI} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                            <td style={{ padding: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{idx.index_name}</td>
                                                            <td style={{ padding: '12px', fontWeight: 600 }}>{idx.table_name.toUpperCase()}</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700 }}>{idx.scans}</td>
                                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{formatBytes(idx.index_size_bytes)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* --- PAGINATION --- */}
            {activeTab !== 'performance' && totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '32px' }}>
                    <button className="btn-secundario" disabled={page === 1} onClick={() => { setPage(p => p - 1); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}><ChevronLeft size={16} /> {t('audit.pagination.back')}</button>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--accent)' }}>{page}</span>
                        <span className="muted" style={{ fontSize: '0.85rem' }}>/ {totalPages}</span>
                    </div>
                    <button className="btn-secundario" disabled={page === totalPages} onClick={() => { setPage(p => p + 1); window.scrollTo({top:0, behavior:'smooth'}); }} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>{t('audit.pagination.next')} <ChevronRight size={16} /></button>
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
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>{t('audit.inspector.occurred_on')}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                                        {format(parseISO(selectedError.created_at), i18n.language === 'en' ? "MMMM dd yyyy, HH:mm:ss" : "dd MMMM yyyy, HH:mm:ss", { locale: dateLocale })}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>{t('audit.inspector.affected_user')}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px' }}>
                                        {selectedError.user_email || t('audit.inspector.anonymous')}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>{t('audit.inspector.origin_url')}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                        {selectedError.url || '/'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>{t('audit.inspector.environment')}</div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '2px', color: selectedError.metadata?.environment === 'production' ? 'var(--success)' : 'inherit' }}>
                                        {selectedError.metadata?.environment === 'production' ? t('audit.environments.production') : t('audit.environments.development')}
                                    </div>
                                </div>
                            </div>

                            {/* Stack Trace */}
                            {selectedError.stack && (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Terminal size={14} className="text-accent" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                            {t('audit.inspector.stack_trace')}
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
                                            {t('audit.inspector.component_stack')}
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
                                    {t('audit.inspector.full_metadata')}
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
                                {t('audit.inspector.close')}
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
