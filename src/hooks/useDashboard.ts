import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePipelineStates } from './usePipelineStates';
import { startOfDay, subDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChartData } from 'chart.js';
import { getChurnRisk } from '../utils/riskScoring';

export interface DashboardStats {
    clientesTotal: number;
    nuevosHoy: number;
    repartidores: number;
    consumidores: number;
    crecimientoDiario: ChartData<'bar'>;
    distribucionCartera: ChartData<'doughnut'>;
    ultimasVisitas: any[];
    proximosContactos: any[];
    localesMapa: any[];
    topChurn: any[];
}

export function useDashboard() {
    const { empresaActiva, userName } = useAuth();
    const { t } = useTranslation();
    const { states: COLUMNS, loading: loadingStates } = usePipelineStates(empresaActiva?.id);
    
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats>({
        clientesTotal: 0,
        nuevosHoy: 0,
        repartidores: 0,
        consumidores: 0,
        crecimientoDiario: { labels: [], datasets: [] },
        distribucionCartera: { labels: [], datasets: [] },
        ultimasVisitas: [],
        proximosContactos: [],
        localesMapa: [],
        topChurn: []
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const handleSearch = async (val: string) => {
        setSearchQuery(val);
        if (!val.trim() || !empresaActiva?.id) {
            setSearchResults([]);
            return;
        }
        setSearching(true);
        try {
            const { data: clientIds } = await supabase
                .from('empresa_cliente')
                .select('cliente_id')
                .eq('empresa_id', empresaActiva.id)
                .eq('activo', true)
                .limit(50);

            if (!clientIds || clientIds.length === 0) {
                setSearchResults([]);
                return;
            }

            const ids = clientIds.map(c => c.cliente_id).filter((id): id is number => id !== null);

            const { data } = await supabase
                .from('clientes')
                .select('id, nombre_local, direccion')
                .in('id', ids)
                .ilike('nombre_local', `%${val}%`)
                .limit(5);

            setSearchResults(data || []);
        } catch (e) {
            if (import.meta.env.DEV) {
                console.error(e);
            }
        } finally {
            setSearching(false);
        }
    };

    const loadDashboardData = async () => {
        if (!empresaActiva?.id || !COLUMNS || COLUMNS.length === 0) return;

        try {
            setLoading(true);
            const today = startOfDay(new Date()).toISOString();
            const sevenDaysAgo = subDays(new Date(), 7).toISOString();

            const activeStatus = COLUMNS.find(c => c.label.includes('Activo'))?.label || COLUMNS[Math.min(COLUMNS.length - 1, 4)]?.label;
            const relevantForChurn = COLUMNS.slice(0, Math.min(COLUMNS.length, 5)).map(c => c.label);

            const [
                { count: totalClientes },
                { count: nuevosHoyCount },
                { count: totalRepartidores },
                { count: totalConsumidores },
                { data: growthData },
                { data: stateDist },
                { data: recentVisits },
                { data: pendingContacts },
                { data: mapLocals },
                { data: churnDataResult }
            ] = await Promise.all([
                supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).gte('created_at', today).eq('activo', true),
                supabase.from('repartidores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id),
                supabase.from('consumidores').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('empresa_cliente').select('created_at').eq('empresa_id', empresaActiva.id).gte('created_at', sevenDaysAgo).eq('activo', true),
                supabase.from('empresa_cliente').select('estado').eq('empresa_id', empresaActiva.id).eq('activo', true),
                supabase.from('actividades').select('id, fecha, cliente_id, descripcion').eq('empresa_id', empresaActiva.id).eq('descripcion', 'Visita realizada').order('fecha', { ascending: false }).limit(5),
                supabase.from('empresa_cliente').select('id, cliente_id, fecha_proximo_contacto').eq('empresa_id', empresaActiva.id).not('fecha_proximo_contacto', 'is', null).gte('fecha_proximo_contacto', today.split('T')[0]).order('fecha_proximo_contacto', { ascending: true }).limit(5),
                supabase.from('empresa_cliente').select('id, estado, cliente_id').eq('empresa_id', empresaActiva.id).eq('estado', activeStatus).limit(100),
                supabase.from('empresa_cliente').select('id, cliente_id, fecha_proximo_contacto, ultima_actividad, updated_at, estado').eq('empresa_id', empresaActiva.id).eq('activo', true).in('estado', relevantForChurn).limit(100)
            ]);

            const allClientIds = new Set<number>([
                ...(recentVisits?.map(v => v.cliente_id) || []),
                ...(pendingContacts?.map(c => c.cliente_id) || []),
                ...(mapLocals?.map(m => m.cliente_id) || []),
                ...(churnDataResult?.map(ch => ch.cliente_id) || [])
            ].filter((id): id is number => id !== null));

            let clientMap: Record<string, any> = {};
            if (allClientIds.size > 0) {
                const { data: clientsRaw } = await supabase.from('clientes').select('id, nombre_local, lat, lng').in('id', Array.from(allClientIds));
                clientsRaw?.forEach((c: any) => { clientMap[c.id] = c; });
            }

            const recentVisitsFinal = (recentVisits || []).map(v => ({ ...v, clientes: (v.cliente_id ? clientMap[v.cliente_id] : null) || { nombre_local: 'Desconocido' } }));
            const churnDataFinal = (churnDataResult || []).map(ch => ({ ...ch, clientes: (ch.cliente_id ? clientMap[ch.cliente_id] : null) || { nombre_local: 'Desconocido' } }));

            const labelsGrid = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'EEE', { locale: es }));
            const growthCounts = Array(7).fill(0);
            growthData?.forEach(d => {
                if (!d.created_at) return;
                const dayIndex = 6 - Math.floor((new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24));
                if (dayIndex >= 0 && dayIndex < 7) growthCounts[dayIndex]++;
            });

            const stateCountsMap: Record<string, number> = {};
            stateDist?.forEach(d => { 
                const label = d.estado || COLUMNS[0].label;
                stateCountsMap[label] = (stateCountsMap[label] || 0) + 1; 
            });

            const stateLabels = COLUMNS.map(c => c.label);
            const stateValues = COLUMNS.map(c => stateCountsMap[c.label] || 0);
            const stateColors = COLUMNS.map(c => c.color);

            setStats({
                clientesTotal: totalClientes || 0,
                nuevosHoy: nuevosHoyCount || 0,
                repartidores: totalRepartidores || 0,
                consumidores: totalConsumidores || 0,
                crecimientoDiario: {
                    labels: labelsGrid,
                    datasets: [{
                        label: t('dashboard.charts.new_clients'),
                        data: growthCounts,
                        backgroundColor: '#0c0c0c',
                        borderRadius: 8,
                        barThickness: 12
                    }]
                },
                distribucionCartera: {
                    labels: stateLabels,
                    datasets: [{
                        data: stateValues,
                        backgroundColor: stateColors,
                        borderWidth: 0,
                        hoverOffset: 15
                    }]
                },
                ultimasVisitas: recentVisitsFinal,
                proximosContactos: pendingContacts || [],
                localesMapa: (mapLocals || []).map(m => ({ ...m, clientes: (m.cliente_id ? clientMap[m.cliente_id] : null) || null })).filter(m => m.clientes?.lat && m.clientes?.lng),
                topChurn: churnDataFinal
                    .map(c => ({ ...c, risk: getChurnRisk(c) }))
                    .filter(c => c.risk.level === 'alto' || c.risk.level === 'medio')
                    .sort((a, b) => b.risk.score - a.risk.score)
                    .slice(0, 5)
            });

        } catch (error) {
            if (import.meta.env.DEV) {
                console.error("Dashboard error:", error);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (empresaActiva?.id && COLUMNS.length > 0) {
            loadDashboardData();
        }
    }, [empresaActiva, COLUMNS]);

    return {
        empresaActiva,
        userName,
        t,
        loading: loading || loadingStates,
        stats,
        searchQuery,
        searchResults,
        setSearchResults,
        searching,
        handleSearch,
        loadDashboardData,
        COLUMNS
    };
}
