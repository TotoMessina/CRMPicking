import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database.types';
import { useAuth } from '../contexts/AuthContext';
import { calculatePresetDates, PresetType } from '../utils/dateUtils';
import toast from 'react-hot-toast';

export interface KpiState {
    totalClientesActivos: number;
    conFecha: number;
    vencidos: number;
    sinFecha: number;
    proxHoy: number;
    prox7: number;
    proxFuturo: number;
    act7: number;
    act30: number;
    activos30: number;
    dormidos30: number;
    sinHistorial: number;
}

export interface ChartsData {
    crecimientoDiario: any;
    rubros: any;
    estados: any;
    creados: any;
    consumidoresEvolucion: any;
    repartidoresEvolucion: any;
    situacionLocales: any;
    activadoresDia: any;
    activadoresConversion: any;
    visitasEvolucion: any;
}

export interface ListsData {
    rubros: [string, number][];
    estados: [string, number][];
    creados: [string, number][];
    activadoresDetalle: any[];
    activadoresStats: any[];
}

export interface Activator {
    email: string;
    nombre: string;
}

export const useStatistics = () => {
    const { empresaActiva } = useAuth();
    
    const [currentTab, setCurrentTab] = useState('tabApps');
    const [rangePreset, setRangePreset] = useState<PresetType | string>('30d');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterActivator, setFilterActivator] = useState<string[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [activators, setActivators] = useState<Activator[]>([]);
    const [filtroSituacionRubros, setFiltroSituacionRubros] = useState<Set<string>>(new Set());
    const [clientesEstado5Raw, setClientesEstado5Raw] = useState<any[]>([]);

    const [kpis, setKpis] = useState<KpiState>({
        totalClientesActivos: 0,
        conFecha: 0, vencidos: 0, sinFecha: 0,
        proxHoy: 0, prox7: 0, proxFuturo: 0,
        act7: 0, act30: 0,
        activos30: 0, dormidos30: 0, sinHistorial: 0
    });

    const [chartsData, setChartsData] = useState<ChartsData>({
        crecimientoDiario: null,
        rubros: null,
        estados: null,
        creados: null,
        consumidoresEvolucion: null,
        repartidoresEvolucion: null,
        situacionLocales: null,
        activadoresDia: null,
        activadoresConversion: null,
        visitasEvolucion: null,
    });

    const [listsData, setListsData] = useState<ListsData>({
        rubros: [],
        estados: [],
        creados: [],
        activadoresDetalle: [],
        activadoresStats: []
    });

    const [totalSituacion, setTotalSituacion] = useState(0);

    const rubrosEstado5Data = useMemo(() => {
        const filtered = filtroSituacionRubros.size === 0
            ? clientesEstado5Raw
            : clientesEstado5Raw.filter(c => filtroSituacionRubros.has(c.situacion || 'sin comunicacion nueva'));
        const counts: Record<string, number> = {};
        filtered.forEach(c => {
            const r = c.rubro || 'Sin rubro';
            counts[r] = (counts[r] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const RUBRO_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6', '#6366f1'];
        return {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: filtroSituacionRubros.size === 0 ? 'Todos los locales' : [...filtroSituacionRubros].join(' + '),
                data: sorted.map(x => x[1]),
                backgroundColor: sorted.map((_, i) => RUBRO_COLORS[i % RUBRO_COLORS.length]),
                borderRadius: 6,
                borderWidth: 0,
            }]
        };
    }, [clientesEstado5Raw, filtroSituacionRubros]);

    useEffect(() => {
        const range = calculatePresetDates(rangePreset);
        if (range) {
            setDateFrom(range.from);
            setDateTo(range.to);
        }
        loadActivators();
    }, [rangePreset, empresaActiva?.id]);

    useEffect(() => {
        if (dateFrom && dateTo && empresaActiva?.id) {
            refreshStats();
        }
    }, [dateFrom, dateTo, filterActivator, empresaActiva?.id]);

    const loadActivators = async () => {
        if (!empresaActiva?.id) return;
        const { data } = await supabase.from('empresa_usuario')
            .select('usuario_email, usuarios(nombre)')
            .eq('empresa_id', empresaActiva.id);

        if (data) {
            const list: Activator[] = data.map((d: any) => ({
                email: d.usuario_email,
                nombre: d.usuarios?.nombre || d.usuario_email
            })).sort((a, b) => a.nombre.localeCompare(b.nombre));
            setActivators(list);
        }
    };

    const fetchAll = async <T = any>(table: keyof Database['public']['Tables'], selectCols: string, applyFiltersFn?: (q: any) => any): Promise<T[]> => {
        const out: T[] = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
            let q = supabase.from(table).select(selectCols).range(from, from + pageSize - 1);
            if (applyFiltersFn) q = applyFiltersFn(q);
            const { data, error } = await q;
            if (error) throw error;
            if (!data) break;
            out.push(...(data as T[]));
            if (data.length < pageSize) break;
            from += pageSize;
        }
        return out;
    };

    const refreshStats = useCallback(async () => {
        if (!empresaActiva?.id || !dateFrom || !dateTo) return;
        
        setLoading(true);
        try {
            const startD = new Date(dateFrom + "T00:00:00");
            const endD = new Date(dateTo + "T00:00:00");

            const buckets: { key: string; label: string }[] = [];
            let curr = new Date(startD);
            while (curr <= endD) {
                const k = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
                buckets.push({ key: k, label: `${String(curr.getDate()).padStart(2, '0')}/${String(curr.getMonth() + 1).padStart(2, '0')}` });
                curr.setDate(curr.getDate() + 1);
            }

            const [{ data: rpcPayload, error: rpcError }, { data: est5 }] = await Promise.all([
                supabase.rpc('get_company_statistics' as any, {
                    p_empresa_id: empresaActiva.id,
                    p_date_from: dateFrom,
                    p_date_to: dateTo,
                    p_filter_activators: filterActivator.length > 0 ? filterActivator : null
                }),
                supabase.from('empresa_cliente').select('rubro, situacion').eq('empresa_id', empresaActiva.id).eq('activo', true).like('estado', '5%')
            ]);

            if (rpcError) throw rpcError;
            if (!rpcPayload) throw new Error("No data from RPC");

            setClientesEstado5Raw(est5 || []);

            const { kpis, charts, lists, activadores: actData } = rpcPayload as any;

            setKpis({
                totalClientesActivos: kpis.totalClientesActivos || 0,
                conFecha: kpis.conFecha || 0, sinFecha: kpis.sinFecha || 0, vencidos: kpis.vencidos || 0,
                proxHoy: kpis.proxHoy || 0, prox7: kpis.prox7 || 0, proxFuturo: kpis.proxFuturo || 0,
                act7: kpis.act7 || 0, act30: kpis.act30 || 0,
                activos30: kpis.activos30 || 0, dormidos30: kpis.dormidos30 || 0, sinHistorial: kpis.sinHistorial || 0
            });

            const getChartVal = (arr: any[], date: string) => arr.find((x: any) => x.date === date)?.count || 0;
            const COLORS: Record<string, string> = { "1 - Cliente relevado": '#475569', "2 - Local Visitado No Activo": '#ef4444', "3 - Primer Ingreso": '#f59e0b', "4 - Local Creado": '#10b981', "5 - Local Visitado Activo": '#3b82f6', "6 - Local No Interesado": "#ef4444", "Sin estado": "#cbd5e1" };

            const bdownClean = (actData.conversion || []).sort((a: any, b: any) => b.total - a.total).map((v: any) => ({
                name: v.creador, total: v.total,
                statuses: Object.entries(v.statuses || {}).sort((a: any, b: any) => b[1] - a[1]).map(([s, count]) => ({ st: s.split('-').pop()?.trim() || s, count, color: COLORS[s] || "#a78bfa" }))
            }));

            const actConv = (actData.conversion || []).map((v: any) => ({
                name: v.creador, rate: v.total > 0 ? (v.efectivo / v.total) * 100 : 0,
                total: v.total, efectivo: v.efectivo, visitas: v.visitas || 0
            })).sort((a: any, b: any) => b.rate - a.rate);

            setListsData({
                rubros: (lists.rubros || []).map((x: any) => [x.name, x.count]),
                estados: (lists.estados || []).map((x: any) => [x.name, x.count]),
                creados: (lists.creadores || []).map((x: any) => [x.name, x.count]),
                activadoresDetalle: bdownClean, activadoresStats: actConv
            });

            const actDiario = actData.diario || [];
            const allSt = new Set<string>();
            actDiario.forEach((d: any) => allSt.add(d.estado || "Sin estado"));
            const datasetsStacked = Array.from(allSt).sort().map(st => ({
                label: st, stack: 'A', backgroundColor: COLORS[st] || "#a78bfa",
                data: buckets.map(b => actDiario.filter((d: any) => d.date === b.key && d.estado === st).reduce((sum: number, x: any) => sum + x.count, 0))
            }));

            setChartsData({
                crecimientoDiario: { labels: buckets.map(b => b.label), datasets: [{ label: 'Altas Diarias', data: buckets.map(b => getChartVal(charts.altas_clientes, b.key)), backgroundColor: '#4f46e5', borderRadius: 4 }] },
                consumidoresEvolucion: { labels: buckets.map(b => b.label), datasets: [{ label: 'Nuevos Consumidores', data: buckets.map(b => getChartVal(charts.altas_consumidores, b.key)), backgroundColor: '#ec4899', borderRadius: 4 }] },
                repartidoresEvolucion: { labels: buckets.map(b => b.label), datasets: [{ label: 'Nuevos Repartidores', data: buckets.map(b => getChartVal(charts.altas_repartidores, b.key)), backgroundColor: '#10b981', borderRadius: 4 }] },
                visitasEvolucion: { labels: buckets.map(b => b.label), datasets: [{ label: 'Visitas', data: buckets.map(b => getChartVal(charts.visitas, b.key)), backgroundColor: '#4f46e5', borderRadius: 4 }] },
                rubros: { labels: (lists.rubros || []).map((x: any) => x.name), datasets: [{ data: (lists.rubros || []).map((x: any) => x.count), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'], borderWidth: 0 }] },
                estados: { labels: (lists.estados || []).map((x: any) => x.name), datasets: [{ data: (lists.estados || []).map((x: any) => x.count), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'], borderWidth: 0 }] },
                creados: { labels: (lists.creadores || []).map((x: any) => x.name), datasets: [{ data: (lists.creadores || []).map((x: any) => x.count), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'], borderWidth: 0 }] },
                situacionLocales: { labels: ['Sin comunicación nueva', 'En proceso', 'En funcionamiento'], datasets: [{ label: 'Locales (Est. 4 y 5)', data: ['sin comunicacion nueva', 'en proceso', 'en funcionamiento'].map(k => (lists.situacionLocales || []).find((x: any) => x.name === k)?.count || 0), backgroundColor: ['#94a3b8', '#f59e0b', '#10b981'], borderRadius: 8, borderWidth: 0 }] },
                activadoresConversion: { labels: actConv.map(a => `${a.name} (${Math.round(a.rate)}%)`), datasets: [{ label: 'Efectividad %', data: actConv.map(a => a.rate), backgroundColor: '#4f46e5', borderRadius: 4 }] },
                activadoresDia: { labels: buckets.map(b => b.label), datasets: datasetsStacked }
            });

            setTotalSituacion((lists.situacionLocales || []).reduce((acc: number, val: any) => acc + val.count, 0));
            setLastUpdate(new Date());
        } catch (error) {
            console.error(error);
            toast.error("Error cargando estadísticas");
        } finally {
            setLoading(false);
        }
    }, [empresaActiva?.id, dateFrom, dateTo, filterActivator, activators]);

    return {
        currentTab, setCurrentTab,
        rangePreset, setRangePreset,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        filterActivator, setFilterActivator,
        loading, lastUpdate,
        activators, rubrosEstado5Data,
        kpis, chartsData, listsData,
        totalSituacion, refreshStats,
        filtroSituacionRubros, setFiltroSituacionRubros
    };
};
