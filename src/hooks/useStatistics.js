import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculatePresetDates } from '../utils/dateUtils';
import toast from 'react-hot-toast';

export const useStatistics = () => {
    const { empresaActiva } = useAuth();
    
    const [currentTab, setCurrentTab] = useState('tabApps');
    const [rangePreset, setRangePreset] = useState('30d');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filterActivator, setFilterActivator] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [activators, setActivators] = useState([]);
    const [filtroSituacionRubros, setFiltroSituacionRubros] = useState(new Set());
    const [clientesEstado5Raw, setClientesEstado5Raw] = useState([]);

    const [kpis, setKpis] = useState({
        totalClientesActivos: 0,
        conFecha: 0, vencidos: 0, sinFecha: 0,
        proxHoy: 0, prox7: 0, proxFuturo: 0,
        act7: 0, act30: 0,
        activos30: 0, dormidos30: 0, sinHistorial: 0
    });

    const [chartsData, setChartsData] = useState({
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

    const [listsData, setListsData] = useState({
        rubros: [],
        estados: [],
        creados: [],
        activadoresDetalle: [],
        activadoresStats: []
    });

    const [totalSituacion, setTotalSituacion] = useState(0);

    // Computed chart data for rubros Estado5 + situacion multi-filter
    const rubrosEstado5Data = useMemo(() => {
        const filtered = filtroSituacionRubros.size === 0
            ? clientesEstado5Raw
            : clientesEstado5Raw.filter(c => filtroSituacionRubros.has(c.situacion || 'sin comunicacion nueva'));
        const counts = {};
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
            const list = data.map(d => ({
                email: d.usuario_email,
                nombre: d.usuarios?.nombre || d.usuario_email
            })).sort((a, b) => a.nombre.localeCompare(b.nombre));
            setActivators(list);
        }
    };

    const fetchAll = async (table, selectCols, applyFiltersFn) => {
        const out = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
            let q = supabase.from(table).select(selectCols).range(from, from + pageSize - 1);
            if (applyFiltersFn) q = applyFiltersFn(q);
            const { data, error } = await q;
            if (error) throw error;
            if (!data) break;
            out.push(...data);
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
            const isoFrom = startD.toISOString();
            const nextDay = new Date(endD);
            nextDay.setDate(nextDay.getDate() + 1);
            const isoTo = nextDay.toISOString();

            const buckets = [];
            let curr = new Date(startD);
            while (curr <= endD) {
                const k = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
                buckets.push({ key: k, label: `${String(curr.getDate()).padStart(2, '0')}/${String(curr.getMonth() + 1).padStart(2, '0')}` });
                curr.setDate(curr.getDate() + 1);
            }

            const [
                { count: totalClientes },
                clientesMeta,
                { count: act7 },
                { count: act30 },
                consumidores,
                repartidores,
                actividadesRango
            ] = await Promise.all([
                supabase.from('empresa_cliente').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).eq('activo', true),
                fetchAll('empresa_cliente', 'id, cliente_id, rubro, estado, situacion, responsable, creado_por, activador_cierre, activo, created_at, ultima_actividad, fecha_proximo_contacto', q => q.eq('empresa_id', empresaActiva.id).eq('activo', true)),
                supabase.from('actividades').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).gte('fecha', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString()),
                supabase.from('actividades').select('*', { count: 'exact', head: true }).eq('empresa_id', empresaActiva.id).gte('fecha', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()),
                fetchAll('consumidores', 'id, created_at', q => q.eq('empresa_id', empresaActiva.id).gte('created_at', isoFrom).lt('created_at', isoTo)),
                fetchAll('repartidores', 'id, created_at', q => q.eq('empresa_id', empresaActiva.id).gte('created_at', isoFrom).lt('created_at', isoTo)),
                fetchAll('actividades', 'id, fecha, usuario, cliente_id, descripcion', q => {
                    let qq = q.eq('empresa_id', empresaActiva.id).gte('fecha', isoFrom).lt('fecha', isoTo);
                    if (filterActivator) qq = qq.eq('usuario', filterActivator);
                    return qq;
                })
            ]);

            // Data Processing (Calculations)
            let conFecha = 0, sinFecha = 0, vencidos = 0, proxHoy = 0, prox7 = 0, proxFuturo = 0;
            const today0 = new Date(); today0.setHours(0, 0, 0, 0);
            const in7_0 = new Date(today0); in7_0.setDate(in7_0.getDate() + 7);

            clientesMeta.forEach(r => {
                if (!r.fecha_proximo_contacto) return sinFecha++;
                conFecha++;
                const dList = r.fecha_proximo_contacto.split('-');
                const d0 = new Date(dList[0], dList[1] - 1, dList[2]);
                if (d0 < today0) vencidos++;
                if (d0.getTime() === today0.getTime()) proxHoy++;
                else if (d0 > today0 && d0 <= in7_0) prox7++;
                else if (d0 > in7_0) proxFuturo++;
            });

            let activos30 = 0, dormidos30 = 0, sinHist = 0;
            clientesMeta.forEach(c => {
                if (!c.ultima_actividad) sinHist++;
                else if (c.ultima_actividad >= isoFrom && c.ultima_actividad < isoTo) activos30++;
                else if (c.ultima_actividad < isoFrom) dormidos30++;
            });

            setKpis({ totalClientesActivos: totalClientes, conFecha, sinFecha, vencidos, proxHoy, prox7, proxFuturo, act7, act30, activos30, dormidos30, sinHistorial: sinHist });

            // Charts building logic...
            const mapAltas = new Map(buckets.map(b => [b.key, 0]));
            clientesMeta.forEach(c => { if (c.created_at >= isoFrom && c.created_at < isoTo) { const ck = c.created_at.split('T')[0]; if (mapAltas.has(ck)) mapAltas.set(ck, mapAltas.get(ck) + 1); } });

            const mapCons = new Map(buckets.map(b => [b.key, 0]));
            consumidores.forEach(c => { const ck = c.created_at.split('T')[0]; if (mapCons.has(ck)) mapCons.set(ck, mapCons.get(ck) + 1); });

            const mapRepartidores = new Map(buckets.map(b => [b.key, 0]));
            repartidores.forEach(r => { const rk = r.created_at.split('T')[0]; if (mapRepartidores.has(rk)) mapRepartidores.set(rk, mapRepartidores.get(rk) + 1); });

            const mapVisitas = new Map(buckets.map(b => [b.key, 0]));
            actividadesRango.forEach(a => { if (a.descripcion === 'Visita realizada') { const ck = a.fecha.split('T')[0]; if (mapVisitas.has(ck)) mapVisitas.set(ck, mapVisitas.get(ck) + 1); } });

            const groupCount = (rows, field, empty = "Sin dato") => {
                const m = new Map();
                for (const r of rows) { const v = (r[field] || empty).trim() || empty; m.set(v, (m.get(v) || 0) + 1); }
                return [...m.entries()].sort((a, b) => b[1] - a[1]);
            };

            const rubrosArr = groupCount(clientesMeta, "rubro", "Sin rubro");
            const estadosArr = groupCount(clientesMeta, "estado", "Sin estado");
            const creadorArr = groupCount(clientesMeta, "creado_por", "Desconocido");

            const situacionMap = { 'sin comunicacion nueva': 0, 'en proceso': 0, 'en funcionamiento': 0 };
            clientesMeta.forEach(c => { if (c.estado?.startsWith('5')) { const sit = c.situacion || 'sin comunicacion nueva'; if (sit in situacionMap) situacionMap[sit]++; else situacionMap['sin comunicacion nueva']++; } });
            setTotalSituacion(Object.values(situacionMap).reduce((a, b) => a + b, 0));
            setClientesEstado5Raw(clientesMeta.filter(c => c.estado?.startsWith('5')));

            setListsData({ rubros: rubrosArr, estados: estadosArr, creados: creadorArr, activadoresDetalle: [], activadoresStats: [] });

            // Activadores logic
            const setActNames = new Set(activators.map(a => a.nombre?.trim().toLowerCase()));
            let clientesRango = clientesMeta.filter(c => c.created_at >= isoFrom && c.created_at < isoTo);
            if (filterActivator) clientesRango = clientesRango.filter(c => c.creado_por?.trim().toLowerCase() === filterActivator.toLowerCase());
            
            const visitasPorPersona = new Map();
            actividadesRango.forEach(a => { if (a.descripcion === 'Visita realizada' && a.usuario) visitasPorPersona.set(a.usuario, (visitasPorPersona.get(a.usuario) || 0) + 1); });

            const breakdown = new Map();
            clientesRango.forEach(c => {
                const creadoRaw = c.creado_por?.trim() || "Desconocido";
                const activoRaw = c.activador_cierre?.trim() || creadoRaw;
                const st = c.estado || "Sin estado";
                if (setActNames.has(creadoRaw.toLowerCase())) {
                    if (!breakdown.has(creadoRaw)) breakdown.set(creadoRaw, { total: 0, efectivo: 0, sts: {} });
                    const objA = breakdown.get(creadoRaw);
                    objA.total++;
                    if (activoRaw !== creadoRaw && (st.startsWith('4') || st.startsWith('5'))) objA.sts["1 - Cliente relevado"] = (objA.sts["1 - Cliente relevado"] || 0) + 1;
                    else { objA.sts[st] = (objA.sts[st] || 0) + 1; if (st.startsWith('4') || st.startsWith('5')) objA.efectivo++; }
                }
                if (activoRaw !== creadoRaw && (st.startsWith('4') || st.startsWith('5')) && setActNames.has(activoRaw.toLowerCase())) {
                    if (!breakdown.has(activoRaw)) breakdown.set(activoRaw, { total: 0, efectivo: 0, sts: {} });
                    const objB = breakdown.get(activoRaw); objB.total++; objB.efectivo++; objB.sts[st] = (objB.sts[st] || 0) + 1;
                }
            });

            const actConv = [...breakdown.entries()].map(([k, v]) => ({
                name: k, rate: v.total > 0 ? (v.efectivo / v.total) * 100 : 0, total: v.total, efectivo: v.efectivo, visitas: visitasPorPersona.get(k) || 0
            })).sort((a, b) => b.rate - a.rate);

            const dailyStMap = new Map();
            buckets.forEach(b => dailyStMap.set(b.key, new Map()));
            const allSt = new Set();
            clientesRango.forEach(c => {
                const nRaw = c.creado_por?.trim() || "";
                if (setActNames.has(nRaw.toLowerCase())) {
                    const st = c.estado || "Sin estado"; allSt.add(st);
                    const ck = c.created_at.split('T')[0]; if (dailyStMap.has(ck)) dailyStMap.get(ck).set(st, (dailyStMap.get(ck).get(st) || 0) + 1);
                }
            });

            const COLORS = { "1 - Cliente relevado": '#475569', "2 - Local Visitado No Activo": '#ef4444', "3 - Primer Ingreso": '#f59e0b', "4 - Local Creado": '#10b981', "5 - Local Visitado Activo": '#3b82f6', "6 - Local No Interesado": "#ef4444", "Sin estado": "#cbd5e1" };
            const datasetsStacked = Array.from(allSt).sort().map(st => ({ label: st, stack: 'A', backgroundColor: COLORS[st] || "#a78bfa", data: buckets.map(b => dailyStMap.get(b.key).get(st) || 0) }));

            const bdownClean = [...breakdown.entries()].sort((a, b) => b[1].total - a[1].total).map(([k, v]) => ({
                name: k, total: v.total, statuses: Object.entries(v.sts).sort((a, b) => b[1] - a[1]).map(([s, count]) => ({ st: s.split('-').pop().trim(), count, color: COLORS[s] || "#a78bfa" }))
            }));

            setListsData(prev => ({ ...prev, activadoresDetalle: bdownClean, activadoresStats: actConv }));

            setChartsData({
                crecimientoDiario: { labels: buckets.map(b => b.label), datasets: [{ label: 'Altas Diarias', data: buckets.map(b => mapAltas.get(b.key)), backgroundColor: '#4f46e5', borderRadius: 4 }] },
                consumidoresEvolucion: { labels: buckets.map(b => b.label), datasets: [{ label: 'Nuevos Consumidores', data: buckets.map(b => mapCons.get(b.key)), backgroundColor: '#ec4899', borderRadius: 4 }] },
                repartidoresEvolucion: { labels: buckets.map(b => b.label), datasets: [{ label: 'Nuevos Repartidores', data: buckets.map(b => mapRepartidores.get(b.key)), backgroundColor: '#10b981', borderRadius: 4 }] },
                visitasEvolucion: { labels: buckets.map(b => b.label), datasets: [{ label: 'Visitas', data: buckets.map(b => mapVisitas.get(b.key)), backgroundColor: '#4f46e5', borderRadius: 4 }] },
                rubros: { labels: rubrosArr.map(x => x[0]), datasets: [{ data: rubrosArr.map(x => x[1]), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'], borderWidth: 0 }] },
                estados: { labels: estadosArr.map(x => x[0]), datasets: [{ data: estadosArr.map(x => x[1]), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'], borderWidth: 0 }] },
                creados: { labels: creadorArr.map(x => x[0]), datasets: [{ data: creadorArr.map(x => x[1]), backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'], borderWidth: 0 }] },
                situacionLocales: { labels: ['Sin comunicación nueva', 'En proceso', 'En funcionamiento'], datasets: [{ label: 'Locales (Est. 4 y 5)', data: ['sin comunicacion nueva', 'en proceso', 'en funcionamiento'].map(k => situacionMap[k]), backgroundColor: ['#94a3b8', '#f59e0b', '#10b981'], borderRadius: 8, borderWidth: 0 }] },
                activadoresConversion: { labels: actConv.map(a => `${a.name} (${Math.round(a.rate)}%)`), datasets: [{ label: 'Efectividad %', data: actConv.map(a => a.rate), backgroundColor: '#4f46e5', borderRadius: 4 }] },
                activadoresDia: { labels: buckets.map(b => b.label), datasets: datasetsStacked }
            });

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
