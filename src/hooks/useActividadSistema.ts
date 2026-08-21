import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { es, enUS } from 'date-fns/locale';

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

export function useActividadSistema() {
    const { t, i18n } = useTranslation();
    const dateLocale = i18n.language === 'en' ? enUS : es;
    const { role, paginasPermitidas, empresaActiva }: any = useAuth();
    const isSuperAdmin = role === 'super-admin';
    const hasAccess = isSuperAdmin || (paginasPermitidas && paginasPermitidas['/actividad-sistema']?.includes(role));

    // Tab State: 'audit' | 'errors' | 'performance'
    const [activeTab, setActiveTab] = useState<'audit' | 'errors' | 'performance'>('audit');

    // Audit logs state
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [systemUsers, setSystemUsers] = useState<{id: string, nombre: string}[]>([]);
    
    // Error logs state
    const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
    const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);

    // Postgres DBA state
    const [dbaStats, setDbaStats] = useState<any>(null);
    const [loadingDba, setLoadingDba] = useState(false);
    const [copiedQueryIndex, setCopiedQueryIndex] = useState<number | null>(null);

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
        supabase.from('usuarios').select('id, nombre').order('nombre').then(({data}: any) => {
            if(data) setSystemUsers(data);
        });
    }, [hasAccess]);

    // Fetch Audit Logs
    const fetchLogs = async () => {
        setLoading(true);
        if (!empresaActiva?.id) { setLoading(false); return; }

        let query = supabase
            .from('audit_logs')
            .select('*, usuarios(nombre)', { count: 'exact' });

        if (isSuperAdmin && filterTable === 'usuarios') {
            // Superadmin puede auditar usuarios globales
        } else {
            query = query.or(`empresa_id.eq.${empresaActiva.id},empresa_id.is.null`);
        }

        if (filterTable !== 'Todos') query = query.eq('table_name', filterTable);
        if (filterAction !== 'Todas') query = query.eq('action_type', filterAction);
        if (filterUser !== 'Todos') query = query.eq('changed_by', filterUser);

        if (dateFrom) query = query.gte('created_at', `${dateFrom}T00:00:00`);
        if (dateTo) query = query.lte('created_at', `${dateTo}T23:59:59.999`);

        const { data, count, error } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) {
            if (import.meta.env.DEV) {
                console.error("Error fetching audit logs:", error);
            }
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
            if (import.meta.env.DEV) {
                console.error("Error fetching error logs:", error);
            }
        } else {
            setErrorLogs((data || []) as ErrorLog[]);
            setTotalCount(count || 0);
            setTotalPages(Math.max(1, Math.ceil((count || 0) / pageSize)));
        }
        setLoading(false);
    };

    // Fetch Postgres DBA Telemetry Cockpit
    const fetchDbaStats = async () => {
        setLoadingDba(true);
        try {
            const { data, error } = await supabase.rpc('get_dba_diagnostics');
            if (error) {
                if (import.meta.env.DEV) {
                    console.error("Error fetching DBA diagnostics RPC:", error);
                }
            } else {
                setDbaStats(data as any);
            }
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error("Unexpected exception fetching DBA metrics:", err);
            }
        } finally {
            setLoadingDba(false);
        }
    };

    // Main fetch effect
    useEffect(() => {
        if (!hasAccess) return;
        if (activeTab === 'audit') {
            fetchLogs();
        } else if (activeTab === 'errors') {
            fetchErrorLogs();
        } else {
            fetchDbaStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, activeTab, hasAccess, filterTable, filterAction, filterUser, dateFrom, dateTo, errorLevel, errorEnv]);

    // Humanize user agents
    const parseUserAgent = (ua?: string) => {
        if (!ua) return t('common.unknown_device', 'Dispositivo Desconocido');
        const lower = ua.toLowerCase();
        if (lower.includes('iphone') || lower.includes('ipad')) return 'iOS Mobile';
        if (lower.includes('android')) return 'Android Mobile';
        if (lower.includes('macintosh')) return 'macOS Desktop';
        if (lower.includes('windows')) return 'Windows Desktop';
        if (lower.includes('linux')) return 'Linux Desktop';
        return t('common.web_browser', 'Navegador Web');
    };

    return {
        t,
        i18n,
        dateLocale,
        role,
        paginasPermitidas,
        empresaActiva,
        isSuperAdmin,
        hasAccess,
        activeTab,
        setActiveTab,
        logs,
        setLogs,
        systemUsers,
        errorLogs,
        setErrorLogs,
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
    };
}
