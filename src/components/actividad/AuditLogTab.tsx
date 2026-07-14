import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, User, Calendar, Database, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface AuditLog {
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

interface AuditLogTabProps {
    logs: AuditLog[];
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    filterTable: string;
    setFilterTable: (s: string) => void;
    filterAction: string;
    setFilterAction: (s: string) => void;
    filterUser: string;
    setFilterUser: (s: string) => void;
    dateFrom: string;
    setDateFrom: (s: string) => void;
    dateTo: string;
    setDateTo: (s: string) => void;
    systemUsers: { id: string; nombre: string }[];
    setPage: React.Dispatch<React.SetStateAction<number>>;
    dateLocale: any;
    renderDiff: (oldData: any, newData: any) => React.ReactNode;
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({
    logs,
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
    systemUsers,
    setPage,
    dateLocale,
    renderDiff
}) => {
    const { t, i18n } = useTranslation();

    const filteredLogs = logs.filter(l => !searchTerm || l.record_id.includes(searchTerm));

    return (
        <div className="tab-pane-audit">
            {/* FILTERS */}
            <div className="filters-grid premium-filters-container">
                <div className="filters-row-primary">
                    <div className="search-input-wrapper">
                        <Search size={16} className="search-input-icon" />
                        <input 
                            type="text" 
                            placeholder={t('audit.search_id')} 
                            className="input premium-input search-input-field" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    <div className="filters-dropdowns-wrapper">
                        <select className="input premium-input" value={filterTable} onChange={e => { setFilterTable(e.target.value); setPage(1); }}>
                            <option value="Todos">{t('audit.tables.all')}</option>
                            <option value="clientes">{t('audit.tables.clients')}</option>
                            <option value="visitas_diarias">{t('audit.tables.routes')}</option>
                            <option value="repartidores">{t('audit.tables.drivers')}</option>
                            <option value="usuarios">{t('audit.tables.users')}</option>
                        </select>
                        <select className="input premium-input" value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
                            <option value="Todas">{t('audit.actions.all')}</option>
                            <option value="INSERT">{t('audit.actions.insert')}</option>
                            <option value="UPDATE">{t('audit.actions.update')}</option>
                            <option value="DELETE">{t('audit.actions.delete')}</option>
                        </select>
                    </div>
                </div>
                <div className="filters-row-secondary">
                    <div className="filter-user-wrapper">
                        <User size={16} className="filter-icon-prefix" />
                        <select className="input premium-input" value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1); }}>
                            <option value="Todos">{t('audit.workers.any')}</option>
                            {systemUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-dates-wrapper">
                        <Calendar size={16} className="filter-icon-prefix" />
                        <div className="date-inputs-group">
                            <input type="date" className="input premium-input date-input" title="Desde el día" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
                            <span className="date-arrow-separator">🠖</span>
                            <input type="date" className="input premium-input date-input" title="Hasta el día" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* RESULTS VIEW */}
            {filteredLogs.length === 0 ? (
                <div className="empty-results-card">
                    <Database size={48} className="empty-results-icon" />
                    <h3>{t('audit.no_activity')}</h3>
                    <p>{t('audit.no_activity_desc')}</p>
                </div>
            ) : (
                <>
                    {/* Desktop View */}
                    <div className="desktop-only audit-table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('audit.headers.occurred_on')}</th>
                                    <th>{t('audit.headers.employee')}</th>
                                    <th>{t('audit.headers.category')}</th>
                                    <th>{t('audit.headers.type')}</th>
                                    <th>{t('audit.headers.details')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="audit-tr">
                                        <td className="time-td">
                                            <div className="time-display">
                                                <Clock size={14} className="text-accent" />
                                                {format(parseISO(log.created_at), "HH:mm:ss", { locale: dateLocale })}
                                            </div>
                                            <div className="date-display">
                                                {format(parseISO(log.created_at), i18n.language === 'en' ? "MMMM dd yyyy" : "dd MMMM yyyy", { locale: dateLocale })}
                                            </div>
                                        </td>
                                        <td className="user-td">
                                            <div className="user-avatar-group">
                                                <div className="user-avatar-circle">
                                                    {log.usuarios?.nombre?.charAt(0) || '?'}
                                                </div>
                                                <span className="user-name-text">{log.usuarios?.nombre || t('audit.workers.system')}</span>
                                            </div>
                                        </td>
                                        <td className="table-td">
                                            <div className="table-badge">
                                                {log.table_name.toUpperCase()}
                                            </div>
                                            <div className="record-id-muted">ID: {log.record_id.split('-')[0]}...</div>
                                        </td>
                                        <td className="action-td">
                                            <span className={`action-badge badge-${log.action_type.toLowerCase()}`}>
                                                {log.action_type}
                                            </span>
                                        </td>
                                        <td className="diff-td">
                                            {renderDiff(log.old_data, log.new_data)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View */}
                    <div className="mobile-only mobile-audit-cards">
                        {filteredLogs.map(log => (
                            <div key={log.id} className="mobile-audit-card">
                                <div className="card-header-row">
                                    <div className="time-display">
                                        <Clock size={14} className="text-accent" />
                                        {format(parseISO(log.created_at), "dd/MM HH:mm", { locale: dateLocale })}
                                    </div>
                                    <span className={`action-badge badge-${log.action_type.toLowerCase()}`}>
                                        {log.action_type}
                                    </span>
                                </div>
                                <div className="card-user-row">
                                    <div className="user-avatar-circle-sm">{log.usuarios?.nombre?.charAt(0) || '?'}</div>
                                    <span className="user-name-text">{log.usuarios?.nombre || t('audit.workers.system').toUpperCase()}</span>
                                </div>
                                <div className="card-table-row">
                                    <div className="table-badge-sm">{log.table_name.toUpperCase()}</div>
                                </div>
                                <div className="card-diff-container">
                                    {renderDiff(log.old_data, log.new_data)}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
