import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculatePresetDates, PresetType } from '../utils/dateUtils';
import toast from 'react-hot-toast';
import { ESTADO_RELEVADO, ESTADO_LOCAL_CREADO, ESTADO_ACTIVO } from '../constants/estados';

const STATUS_COLORS: Record<string, string> = {
    [ESTADO_RELEVADO]: '#475569',
    '2 - Local Visitado No Activo': '#ef4444',
    '3 - Primer Ingreso': '#f59e0b',
    [ESTADO_LOCAL_CREADO]: '#10b981',
    [ESTADO_ACTIVO]: '#8b5cf6',
    '6 - Local No Interesado': '#ef4444',
    'Sin estado': '#cbd5e1'
};

const DOUGHNUT_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#a78bfa', '#ec4899', '#6366f1'];

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
    situacionLocales: any;
    creados: any;
    consumidoresEvolucion: any;
    repartidoresEvolucion: any;
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

export interface ExtraData {
    integrity: any;
    geoPoints: any[];
    predictives: {
        churn_rate: number;
        health_score: number;
        mtd_growth: number;
        growth_trend_pct: number;
    };
}

export interface Activator {
    email: string;
    nombre: string;
}

export const useStatistics = () => {
    const { empresaActiva }: any = useAuth();

    const [currentTab, setCurrentTab] = useState('tabApps');
    const [rangePreset, setRangePreset] = useState<PresetType | string>('30d');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterActivator, setFilterActivator] = useState('');

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
        situacionLocales: null,
        creados: null,
        consumidoresEvolucion: null,
        repartidoresEvolucion: null,
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

    const [extraData, setExtraData] = useState<ExtraData>({
        integrity: null,
        geoPoints: [],
        predictives: {
            churn_rate: 0,
            health_score: 0,
            mtd_growth: 0,
            growth_trend_pct: 0
        }
    });

    const [totalSituacion, setTotalSituacion] = useState(0);

    const rubrosEstado5Data = useMemo(() => {
        const counts: Record<string, number> = {};
        clientesEstado5Raw.forEach(c => {
            // Apply Situation filter if any are selected
            if (filtroSituacionRubros.size > 0) {
                const situ = c.situacion || 'sin comunicacion nueva';
                if (!filtroSituacionRubros.has(situ)) return;
            }
            
            const r = c.rubro || 'Sin rubro';
            counts[r] = (counts[r] || 0) + 1;
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        return {
            labels: sorted.map(x => x[0]),
            datasets: [{
                label: 'Distribución',
                data: sorted.map(x => x[1]),
                backgroundColor: DOUGHNUT_COLORS,
                borderRadius: 6,
                borderWidth: 0,
            }]
        };
    }, [clientesEstado5Raw, filtroSituacionRubros]);

    const loadActivators = useCallback(async () => {
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
    }, [empresaActiva?.id]);

    useEffect(() => {
        const range = calculatePresetDates(rangePreset as PresetType);
        if (range) {
            setDateFrom(range.from);
            setDateTo(range.to);
        }
        loadActivators();
    }, [rangePreset, loadActivators]);

    const refreshStats = useCallback(async () => {
        if (!empresaActiva?.id || !dateFrom || !dateTo) return;
        setLoading(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('get_advanced_stats', {
                p_empresa_id: empresaActiva.id,
                p_date_from: dateFrom,
                p_date_to: dateTo,
                p_filter_activator: filterActivator || null
            });

            // Also fetch activities in parallel for "Gestion Activadores"
            const isoFrom = new Date(dateFrom + "T00:00:00").toISOString();
            const isoToDate = new Date(dateTo + "T00:00:00");
            isoToDate.setDate(isoToDate.getDate() + 1);
            const isoTo = isoToDate.toISOString();

            let actQuery = supabase.from('actividades').select('id, fecha, usuario, cliente_id, descripcion').eq('empresa_id', empresaActiva.id).gte('fecha', isoFrom).lt('fecha', isoTo);
            if (filterActivator) actQuery = actQuery.eq('usuario', filterActivator);
            const { data: actData } = await actQuery;
            const actividadesRango = actData || [];

            if (rpcError) {
                console.error('RPC Error details:', rpcError);
                throw rpcError;
            }

            console.log('Stats Data Received:', data);

            // Update KPIs with safety checks
            const k = data?.kpis || {};
            const integ = data?.integrity || {};

            setKpis({
                totalClientesActivos: k.total_clientes_activos || 0,
                conFecha: k.con_fecha || 0,
                sinFecha: k.sin_fecha || 0,
                vencidos: k.vencidos || 0,
                proxHoy: k.prox_hoy || 0,
                prox7: k.prox_7 || 0,
                proxFuturo: (k.con_fecha || 0) - ((k.prox_hoy || 0) + (k.prox_7 || 0) + (k.vencidos || 0)),
                act7: k.activos_rango || 0,
                act30: k.activos_rango || 0,
                activos30: k.activos_rango || 0,
                dormidos30: k.dormidos || 0,
                sinHistorial: integ.missing_coords || 0
            });

            // Rehidratar Estado 5 Raw para RubrosSituacionChart
            setClientesEstado5Raw(data.estado5_raw || []);

            const rubrosArr: [string, number][] = (data.rubros || []).map((r: any) => [r.rubro || 'Sin rubro', r.count]);
            const estadosArr: [string, number][] = (data.estados || []).map((e: any) => [e.estado || 'Sin estado', e.count]);
            const creadoresArr: [string, number][] = (data.creadores || []).map((c: any) => [c.creador, c.count]);

            // Situacion
            const situacionArr: [string, number][] = (data.situacion || []).map((s: any) => [s.situacion, s.count]);
            setTotalSituacion(situacionArr.reduce((a, b) => a + b[1], 0));

            // Logic for Activadores
            const setActNames = new Set(activators.map(a => a.nombre?.trim().toLowerCase()));
            const breakdown = new Map<string, { total: number, efectivo: number, sts: Record<string, number> }>();
            
            // Note: Since we don't have the full clients array in the client anymore, we use the grouped creadores 
            // for the basic created count, but detailed conversion (effective closures) requires the activity log.
            creadoresArr.forEach(c => {
                const creadoRaw = c[0] || "Desconocido";
                if (setActNames.has(creadoRaw.toLowerCase())) {
                    if (!breakdown.has(creadoRaw)) breakdown.set(creadoRaw, { total: c[1], efectivo: 0, sts: {} });
                }
            });

            const cerradosPorActivador = new Map<string, Set<number>>();
            const visitasPorPersona = new Map<string, number>();

            actividadesRango.forEach((a: any) => {
                const desc = a.descripcion || '';
                const usr = (a.usuario || '').trim();
                
                if (desc === 'Visita realizada' && usr) {
                    visitasPorPersona.set(usr, (visitasPorPersona.get(usr) || 0) + 1);
                }

                if (usr && setActNames.has(usr.toLowerCase())) {
                    const isCierre = desc.includes('➔ 4 - Local Creado') || desc.includes('➔ 5 - Local Visitado Activo') || desc.includes('Estado inicial: 4 - Local Creado') || desc.includes('Estado inicial: 5 - Local Visitado Activo');
                    if (isCierre) {
                        let targetKey = usr;
                        for (const act of activators) {
                            if (act.nombre.trim().toLowerCase() === usr.toLowerCase()) {
                                targetKey = act.nombre.trim();
                                break;
                            }
                        }
                        if (!breakdown.has(targetKey)) breakdown.set(targetKey, { total: 0, efectivo: 0, sts: {} });
                        
                        if (!cerradosPorActivador.has(targetKey)) cerradosPorActivador.set(targetKey, new Set());
                        if (a.cliente_id) cerradosPorActivador.get(targetKey)!.add(a.cliente_id);
                    }
                }
            });

            Array.from(breakdown.keys()).forEach(k => {
                breakdown.get(k)!.efectivo = cerradosPorActivador.get(k)?.size || 0;
            });

            const arrBreakdown = Array.from(breakdown.entries()).map(([nombre, vals]) => ({
                nombre, 
                activos_creados_por_mi: 0,
                activos_heredados: vals.efectivo,
                creados_total: vals.total,
                visitados_total: visitasPorPersona.get(nombre) || 0,
                visitas_efectivas: vals.efectivo,
                visitas_no_efectivas: Math.max(0, (visitasPorPersona.get(nombre) || 0) - vals.efectivo)
            })).sort((a, b) => b.visitas_efectivas - a.visitas_efectivas);

            const statBreakdown = arrBreakdown.filter(x => x.creados_total > 0 || x.visitados_total > 0).map(x => ({
                name: x.nombre, 
                rate: x.visitados_total > 0 ? (x.visitas_efectivas / x.visitados_total) * 100 : 0 
            }));

            setListsData({
                rubros: rubrosArr,
                estados: estadosArr,
                creados: creadoresArr,
                activadoresDetalle: arrBreakdown,
                activadoresStats: statBreakdown
            });

            // Build charts for Daily creations
            const creationsMap = new Map((data.creations || []).map((c: any) => [c.day, c.count]));
            const mapCons = new Map((data.consumidores || []).map((c: any) => [c.day, c.count]));
            const mapRep = new Map((data.repartidores || []).map((c: any) => [c.day, c.count]));

            const mapVisitas = new Map();
            actividadesRango.forEach((a: any) => { 
                if (a.descripcion === 'Visita realizada') { 
                    const ck = a.fecha.split('T')[0]; 
                    mapVisitas.set(ck, (mapVisitas.get(ck) || 0) + 1); 
                } 
            });

            const buckets: { key: string; label: string }[] = [];
            let curr = new Date(dateFrom + "T00:00:00");
            const endD = new Date(dateTo + "T00:00:00");
            while (curr <= endD) {
                const k = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
                buckets.push({ key: k, label: `${String(curr.getDate()).padStart(2, '0')}/${String(curr.getMonth() + 1).padStart(2, '0')}` });
                curr.setDate(curr.getDate() + 1);
            }

            setChartsData({
                crecimientoDiario: {
                    labels: buckets.map(b => b.label),
                    datasets: [{ label: 'Nuevos Locales', data: buckets.map(b => creationsMap.get(b.key) || 0), backgroundColor: '#4f46e5', borderRadius: 4 }]
                },
                consumidoresEvolucion: {
                    labels: buckets.map(b => b.label),
                    datasets: [{ label: 'Nuevos Consumidores', data: buckets.map(b => mapCons.get(b.key) || 0), backgroundColor: '#10b981', borderRadius: 4 }]
                },
                repartidoresEvolucion: {
                    labels: buckets.map(b => b.label),
                    datasets: [{ label: 'Nuevos Repartidores', data: buckets.map(b => mapRep.get(b.key) || 0), backgroundColor: '#f59e0b', borderRadius: 4 }]
                },
                visitasEvolucion: {
                    labels: buckets.map(b => b.label),
                    datasets: [{ label: 'Total Visitas Diarias', data: buckets.map(b => mapVisitas.get(b.key) || 0), backgroundColor: '#ec4899', borderRadius: 4 }]
                },
                activadoresConversion: statBreakdown.length > 0 ? {
                    labels: statBreakdown.map(s => s.name),
                    datasets: [{ label: '% de Efectividad (Top)', data: statBreakdown.map(s => s.rate), backgroundColor: '#8b5cf6', borderRadius: 4 }]
                } : null,
                activadoresDia: null,
                rubros: {
                    labels: rubrosArr.map(x => x[0]),
                    datasets: [{ data: rubrosArr.map(x => x[1]), backgroundColor: DOUGHNUT_COLORS, borderWidth: 0 }]
                },
                estados: {
                    labels: estadosArr.map(x => x[0]),
                    datasets: [{ data: estadosArr.map(x => x[1]), backgroundColor: estadosArr.map(x => STATUS_COLORS[x[0]] || '#4f46e5'), borderWidth: 0 }]
                },
                creados: {
                    labels: creadoresArr.map(x => x[0]),
                    datasets: [{ data: creadoresArr.map(x => x[1]), backgroundColor: DOUGHNUT_COLORS, borderWidth: 0 }]
                },
                situacionLocales: situacionArr.length > 0 ? {
                    labels: situacionArr.map(x => x[0]),
                    datasets: [{ label: 'Distribución', data: situacionArr.map(x => x[1]), backgroundColor: '#f59e0b', borderRadius: 4 }]
                } : null
            });

            setExtraData({
                integrity: data.integrity,
                geoPoints: data.geo || [],
                predictives: data.predictives || { churn_rate: 0, health_score: 0, mtd_growth: 0, growth_trend_pct: 0 }
            });

            setLastUpdate(new Date());
        } catch (err: any) {
            console.error('Stats Error:', err);
            toast.error('Error cargando estadísticas');
        } finally {
            setLoading(false);
        }
    }, [empresaActiva?.id, dateFrom, dateTo, filterActivator]);

    useEffect(() => {
        refreshStats();
    }, [refreshStats]);

    return {
        currentTab, setCurrentTab,
        rangePreset, setRangePreset,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        filterActivator, setFilterActivator,
        loading,
        lastUpdate,
        activators,
        rubrosEstado5Data,
        kpis,
        chartsData,
        listsData,
        extraData,
        totalSituacion,
        refreshStats,
        filtroSituacionRubros, setFiltroSituacionRubros
    };
};
