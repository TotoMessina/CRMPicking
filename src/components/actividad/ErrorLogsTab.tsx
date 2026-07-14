import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ShieldAlert, Clock, Cpu, Eye, X, Terminal, AlertTriangle, Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export interface ErrorLog {
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

interface ErrorLogsTabProps {
    errorLogs: ErrorLog[];
    errorSearch: string;
    setErrorSearch: (s: string) => void;
    errorLevel: string;
    setErrorLevel: (s: string) => void;
    errorEnv: string;
    setErrorEnv: (s: string) => void;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    dateLocale: any;
    parseUserAgent: (ua?: string) => string;
    selectedError: ErrorLog | null;
    setSelectedError: (log: ErrorLog | null) => void;
}

export const ErrorLogsTab: React.FC<ErrorLogsTabProps> = ({
    errorLogs,
    errorSearch,
    setErrorSearch,
    errorLevel,
    setErrorLevel,
    errorEnv,
    setErrorEnv,
    setPage,
    dateLocale,
    parseUserAgent,
    selectedError,
    setSelectedError
}) => {
    const { t, i18n } = useTranslation();

    const filteredErrorLogs = React.useMemo(() => {
        if (!errorSearch) return errorLogs;
        const s = errorSearch.toLowerCase();
        return errorLogs.filter(log => 
            log.message.toLowerCase().includes(s) || 
            (log.stack && log.stack.toLowerCase().includes(s)) ||
            (log.user_email && log.user_email.toLowerCase().includes(s))
        );
    }, [errorLogs, errorSearch]);

    return (
        <div className="tab-pane-errors">
            {/* FILTERS */}
            <div className="filters-grid premium-filters-container">
                <div className="search-input-wrapper" style={{ flex: '1 1 300px' }}>
                    <Search size={16} className="search-input-icon" />
                    <input 
                        type="text" 
                        placeholder={t('audit.search_errors')} 
                        className="input premium-input search-input-field" 
                        value={errorSearch} 
                        onChange={e => setErrorSearch(e.target.value)} 
                    />
                </div>
                <div className="filters-dropdowns-wrapper" style={{ flex: '1 1 360px', display: 'flex', gap: '8px' }}>
                    <select className="input premium-input" style={{ flex: 1 }} value={errorLevel} onChange={e => { setErrorLevel(e.target.value); setPage(1); }}>
                        <option value="Todos">{t('audit.levels.any')}</option>
                        <option value="error">{t('audit.levels.error')}</option>
                        <option value="warning">{t('audit.levels.warning')}</option>
                        <option value="info">{t('audit.levels.info')}</option>
                    </select>
                    <select className="input premium-input" style={{ flex: 1 }} value={errorEnv} onChange={e => { setErrorEnv(e.target.value); setPage(1); }}>
                        <option value="Todos">{t('audit.environments.all')}</option>
                        <option value="production">{t('audit.environments.production')}</option>
                        <option value="development">{t('audit.environments.development')}</option>
                    </select>
                </div>
            </div>

            {/* RESULTS VIEW */}
            {filteredErrorLogs.length === 0 ? (
                <div className="empty-results-card">
                    <AlertTriangle size={48} className="empty-results-icon" />
                    <h3>{t('audit.no_errors')}</h3>
                    <p>{t('audit.no_errors_desc')}</p>
                </div>
            ) : (
                <>
                    {/* Desktop View */}
                    <div className="desktop-only audit-table-card">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t('audit.headers_error.date')}</th>
                                    <th>{t('audit.headers_error.level')}</th>
                                    <th>{t('audit.headers_error.message')}</th>
                                    <th>{t('audit.headers_error.user_env')}</th>
                                    <th>{t('audit.headers_error.device_url')}</th>
                                    <th style={{ textAlign: 'center', width: '80px' }}>{t('audit.headers_error.action')}</th>
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
                                        <tr key={log.id} className="audit-tr">
                                            <td className="time-td">
                                                <div className="time-display">
                                                    <Clock size={14} className="text-accent" />
                                                    {format(parseISO(log.created_at), "HH:mm:ss", { locale: dateLocale })}
                                                </div>
                                                <div className="date-display">
                                                    {format(parseISO(log.created_at), i18n.language === 'en' ? "MMM dd yyyy" : "dd MMM yyyy", { locale: dateLocale })}
                                                </div>
                                            </td>
                                            <td className="level-td">
                                                <span className="level-badge" style={{ background: colors.bg, color: colors.txt, border: '1px solid currentColor' }}>
                                                    {log.level}
                                                </span>
                                            </td>
                                            <td className="message-td">
                                                <div className="error-message-text">{log.message}</div>
                                                {log.stack && (
                                                    <div className="error-stack-preview">
                                                        {log.stack.split('\n')[1] || log.stack}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="user-td">
                                                <div className="user-email-text">{log.user_email || t('audit.inspector.anonymous')}</div>
                                                <div className={`env-text-label ${env === 'production' ? 'prod' : 'dev'}`}>
                                                    {envLabel}
                                                </div>
                                            </td>
                                            <td className="device-td">
                                                <div className="device-info-wrapper">
                                                    <Cpu size={12} className="muted" />
                                                    {parseUserAgent(log.user_agent)}
                                                </div>
                                                <div className="url-pathname-text" title={log.url}>
                                                    {log.url ? new URL(log.url).pathname : '/'}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button 
                                                    className="btn-secundario inspect-btn" 
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

                    {/* Mobile View */}
                    <div className="mobile-only mobile-audit-cards">
                        {filteredErrorLogs.map(log => {
                            const colors = {
                                error: { bg: 'rgba(239, 68, 68, 0.1)', txt: '#ef4444' },
                                warning: { bg: 'rgba(245, 158, 11, 0.1)', txt: '#f59e0b' },
                                info: { bg: 'rgba(59, 130, 246, 0.1)', txt: '#3b82f6' }
                            }[log.level] || { bg: 'rgba(148, 163, 184, 0.1)', txt: '#94a3b8' };

                            const env = log.metadata?.environment || 'unknown';

                            return (
                                <div key={log.id} className="mobile-audit-card">
                                    <div className="card-header-row">
                                        <div className="time-display">
                                            <Clock size={14} className="text-accent" />
                                            {format(parseISO(log.created_at), "dd/MM HH:mm:ss", { locale: dateLocale })}
                                        </div>
                                        <span className="level-badge-sm" style={{ background: colors.bg, color: colors.txt, border: '1px solid currentColor' }}>
                                            {log.level}
                                        </span>
                                    </div>
                                    <div className="error-message-text-bold">
                                        {log.message}
                                    </div>
                                    <div className="mobile-affected-user">
                                        {t('audit.inspector.affected_user')}: <strong>{log.user_email || t('audit.inspector.anonymous')}</strong> ({env})
                                    </div>
                                    <div className="card-action-row">
                                        <span className="url-pathname-text-sm">
                                            {log.url ? new URL(log.url).pathname : '/'}
                                        </span>
                                        <button 
                                            className="btn-secundario inspect-btn-sm"
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
            )}

            {/* SENTRY-LIKE ERROR DETAILS MODAL */}
            {selectedError && (
                <div className="sentry-modal-backdrop">
                    <div className="sentry-modal-card">
                        {/* Header */}
                        <header className="sentry-modal-header">
                            <div>
                                <div className="modal-top-badges">
                                    <span className={`level-badge-sm modal-badge-${selectedError.level}`}>
                                        {selectedError.level}
                                    </span>
                                    <span className="modal-error-id">
                                        ID: {selectedError.id}
                                    </span>
                                </div>
                                <h3 className="modal-error-title">
                                    {selectedError.message}
                                </h3>
                            </div>
                            <button onClick={() => setSelectedError(null)} className="modal-close-icon-btn">
                                <X size={20} />
                            </button>
                        </header>

                        {/* Body */}
                        <div className="sentry-modal-body">
                            {/* Contextual Specs Grid */}
                            <div className="modal-specs-grid">
                                <div className="spec-item">
                                    <div className="spec-title">{t('audit.inspector.occurred_on')}</div>
                                    <div className="spec-value">
                                        {format(parseISO(selectedError.created_at), i18n.language === 'en' ? "MMMM dd yyyy, HH:mm:ss" : "dd MMMM yyyy, HH:mm:ss", { locale: dateLocale })}
                                    </div>
                                </div>
                                <div className="spec-item">
                                    <div className="spec-title">{t('audit.inspector.affected_user')}</div>
                                    <div className="spec-value">
                                        {selectedError.user_email || t('audit.inspector.anonymous')}
                                    </div>
                                </div>
                                <div className="spec-item">
                                    <div className="spec-title">{t('audit.inspector.origin_url')}</div>
                                    <div className="spec-value-monospace">
                                        {selectedError.url || '/'}
                                    </div>
                                </div>
                                <div className="spec-item">
                                    <div className="spec-title">{t('audit.inspector.environment')}</div>
                                    <div className={`spec-value ${selectedError.metadata?.environment === 'production' ? 'success' : ''}`}>
                                        {selectedError.metadata?.environment === 'production' ? t('audit.environments.production') : t('audit.environments.development')}
                                    </div>
                                </div>
                            </div>

                            {/* Stack Trace */}
                            {selectedError.stack && (
                                <div className="stacktrace-container">
                                    <div className="stacktrace-title-wrapper">
                                        <Terminal size={14} className="text-accent" />
                                        <span>{t('audit.inspector.stack_trace')}</span>
                                    </div>
                                    <pre className="stacktrace-pre-box">
                                        {selectedError.stack}
                                    </pre>
                                </div>
                            )}

                            {/* React Component Stack */}
                            {selectedError.component_stack && (
                                <div className="react-stack-container">
                                    <div className="react-stack-title-wrapper">
                                        <Activity size={14} className="text-accent" />
                                        <span>{t('audit.inspector.component_stack')}</span>
                                    </div>
                                    <pre className="react-stack-pre-box">
                                        {selectedError.component_stack}
                                    </pre>
                                </div>
                            )}

                            {/* Metadata */}
                            <div className="metadata-container">
                                <div className="metadata-title">{t('audit.inspector.full_metadata')}</div>
                                <div className="metadata-wrapper">
                                    <div className="user-agent-label">
                                        <strong>User Agent:</strong> {selectedError.user_agent}
                                    </div>
                                    <pre className="metadata-json-pre">
                                        {JSON.stringify(selectedError.metadata || {}, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <footer className="sentry-modal-footer">
                            <button className="btn-primario" onClick={() => setSelectedError(null)}>
                                {t('audit.inspector.close')}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};
