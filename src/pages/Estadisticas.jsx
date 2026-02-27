import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const THEME = {
    colors: {
        primary: '#4f46e5',
        secondary: '#10b981',
        accent: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
        slate: '#475569',
        grid: 'rgba(255, 255, 255, 0.05)',
        text: '#94a3b8',
    },
    fontFamily: "'Inter', sans-serif",
};

const COMMON_OPTIONS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: THEME.colors.text,
                font: { family: THEME.fontFamily, size: 12 },
                usePointStyle: true,
                boxWidth: 8,
            }
        },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#fff',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            displayColors: true,
            usePointStyle: true,
        }
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { color: THEME.colors.text, font: { family: THEME.fontFamily, size: 10 } }
        },
        y: {
            grid: { color: THEME.colors.grid, borderDash: [4, 4] },
            ticks: { color: THEME.colors.text, font: { family: THEME.fontFamily, size: 10 }, beginAtZero: true }
        }
    }
};

const DOUGHNUT_COLORS = [
    THEME.colors.primary, THEME.colors.secondary, THEME.colors.accent,
    THEME.colors.info, THEME.colors.danger, '#8b5cf6', '#ec4899', '#6366f1'
];

export default function Estadisticas() {
    const { user } = useAuth();

    const [currentTab, setCurrentTab] = useState('tabApps');
    const [rangePreset, setRangePreset] = useState('30d');

    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Filtros
    const [activators, setActivators] = useState([]);
    const [filterActivator, setFilterActivator] = useState('');

    const [loading, setLoading] = useState(false);

    // DTOs for Charts and Tables
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
        situacionLocales: null,

        // Activadores
        activadoresDia: null,
        activadoresConversion: null,
        visitasEvolucion: null,
        visitasActivacion: null,
        rubrosPorActivador: null,
        rubrosActivadorActivos: null
    });

    const [listsData, setListsData] = useState({
        altasDiarias: [],
        rubros: [],
        estados: [],
        creados: [],
        promedioResponsable: [],
        actividadUsuarios: [],
        activadoresDetalle: []
    });

    const calculatePresetDates = (preset) => {
        if (preset === 'custom') return;
        const days = { '7d': 7, '30d': 30, '60d': 60, '90d': 90, '6m': 182, '1y': 365 }[preset] || 30;

        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - (days - 1));

        const toStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
        const fromStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;

        setDateFrom(fromStr);
        setDateTo(toStr);
    };

    useEffect(() => {
        calculatePresetDates(rangePreset);
        loadActivators();
    }, [rangePreset]);

    useEffect(() => {
        if (dateFrom && dateTo) {
            refreshStats();
        }
    }, [dateFrom, dateTo, filterActivator]); // Add dateFrom, dateTo, filterActivator


    const loadActivators = async () => {
        const { data } = await supabase.from('usuarios')
            .select('nombre, email')
            .eq('activo', true)
            .ilike('role', '%activador%');
        if (data) setActivators(data);
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

    const refreshStats = async () => {
        setLoading(true);
        try {
            const startD = new Date(dateFrom + "T00:00:00");
            const endD = new Date(dateTo + "T00:00:00");
            const isoFrom = startD.toISOString();

            const nextDay = new Date(endD);
            nextDay.setDate(nextDay.getDate() + 1);
            const isoTo = nextDay.toISOString();

            // Buckets for daily charts
            const buckets = [];
            let curr = new Date(startD);
            while (curr <= endD) {
                const k = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
                buckets.push({ key: k, label: `${String(curr.getDate()).padStart(2, '0')}/${String(curr.getMonth() + 1).padStart(2, '0')}` });
                curr.setDate(curr.getDate() + 1);
            }

            // 1. KPIs Clientes
            const [
                { count: totalClientes },
                clientesMeta,
                agendaRows,
                actividadesRango,
                { count: act7 },
                { count: act30 },
                consumidores
            ] = await Promise.all([
                supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true),
                fetchAll('clientes', 'id, rubro, estado, situacion, responsable, creado_por, activo, created_at, ultima_actividad, status_history, visitas', q => q.eq('activo', true)),
                fetchAll('clientes', 'fecha_proximo_contacto, activo', q => q.eq('activo', true)),
                fetchAll('actividades', 'id, fecha, usuario, cliente_id, descripcion', q => {
                    let qq = q.gte('fecha', isoFrom).lt('fecha', isoTo);
                    if (filterActivator) qq = qq.eq('usuario', filterActivator);
                    return qq;
                }),
                supabase.from('actividades').select('*', { count: 'exact', head: true }).gte('fecha', new Date(new Date().setDate(new Date().getDate() - 7)).toISOString()),
                supabase.from('actividades').select('*', { count: 'exact', head: true }).gte('fecha', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()),
                fetchAll('consumidores', 'id, created_at', q => q.gte('created_at', isoFrom).lt('created_at', isoTo))
            ]);

            // Agenda Calcs
            let conFecha = 0, sinFecha = 0, vencidos = 0, proxHoy = 0, prox7 = 0, proxFuturo = 0;
            const today0 = new Date(); today0.setHours(0, 0, 0, 0);
            const in7_0 = new Date(today0); in7_0.setDate(in7_0.getDate() + 7);

            agendaRows.forEach(r => {
                if (!r.fecha_proximo_contacto) return sinFecha++;
                conFecha++;
                const dList = r.fecha_proximo_contacto.split('-');
                const d0 = new Date(dList[0], dList[1] - 1, dList[2]);
                if (d0 < today0) vencidos++;
                if (d0.getTime() === today0.getTime()) proxHoy++;
                else if (d0 > today0 && d0 <= in7_0) prox7++;
                else if (d0 > in7_0) proxFuturo++;
            });

            // Salud
            let activos30 = 0, dormidos30 = 0, sinHist = 0;
            clientesMeta.forEach(c => {
                if (!c.ultima_actividad) sinHist++;
                else if (c.ultima_actividad >= isoFrom && c.ultima_actividad < isoTo) activos30++;
                else if (c.ultima_actividad < isoFrom) dormidos30++;
            });

            setKpis({
                totalClientesActivos: totalClientes, conFecha, sinFecha, vencidos, proxHoy, prox7, proxFuturo,
                act7, act30, activos30, dormidos30, sinHistorial: sinHist
            });

            // Crecimiento Diario Clientes (Altas)
            const mapAltas = new Map(buckets.map(b => [b.key, 0]));
            clientesMeta.forEach(c => {
                if (c.created_at >= isoFrom && c.created_at < isoTo) {
                    const ck = c.created_at.split('T')[0];
                    if (mapAltas.has(ck)) mapAltas.set(ck, mapAltas.get(ck) + 1);
                }
            });

            // Consumidores Evolución
            const mapCons = new Map(buckets.map(b => [b.key, 0]));
            consumidores.forEach(c => {
                const ck = c.created_at.split('T')[0];
                if (mapCons.has(ck)) mapCons.set(ck, mapCons.get(ck) + 1);
            });

            // Visitas Evolucion
            const mapVisitas = new Map(buckets.map(b => [b.key, 0]));
            actividadesRango.forEach(a => {
                if (a.descripcion === 'Visita realizada') {
                    const ck = a.fecha.split('T')[0];
                    if (mapVisitas.has(ck)) mapVisitas.set(ck, mapVisitas.get(ck) + 1);
                }
            });

            // Distributions
            const groupCount = (rows, field, empty = "Sin dato") => {
                const m = new Map();
                for (const r of rows) {
                    const v = (r[field] || empty).trim() || empty;
                    m.set(v, (m.get(v) || 0) + 1);
                }
                return [...m.entries()].sort((a, b) => b[1] - a[1]);
            };

            const rubrosArr = groupCount(clientesMeta, "rubro", "Sin rubro");
            const estadosArr = groupCount(clientesMeta, "estado", "Sin estado");
            const creadorArr = groupCount(clientesMeta, "creado_por", "Desconocido");

            // Situacion chart: clients in states 4 or 5
            const SITUACION_LABELS = ['sin comunicacion nueva', 'en proceso', 'en funcionamiento'];
            const SITUACION_COLORS = ['#94a3b8', '#f59e0b', '#10b981'];
            const situacionMap = { 'sin comunicacion nueva': 0, 'en proceso': 0, 'en funcionamiento': 0 };
            clientesMeta.forEach(c => {
                if (c.estado?.startsWith('4') || c.estado?.startsWith('5')) {
                    const sit = c.situacion || 'sin comunicacion nueva';
                    if (sit in situacionMap) situacionMap[sit]++;
                    else situacionMap['sin comunicacion nueva']++;
                }
            });

            setListsData(prev => ({
                ...prev,
                rubros: rubrosArr, estados: estadosArr, creados: creadorArr
            }));

            // Build Charts Data
            setChartsData({
                crecimientoDiario: {
                    labels: buckets.map(b => b.label),
                    datasets: [{
                        label: 'Altas Diarias',
                        data: buckets.map(b => mapAltas.get(b.key)),
                        backgroundColor: THEME.colors.primary,
                        borderRadius: 4
                    }]
                },
                consumidoresEvolucion: {
                    labels: buckets.map(b => b.label),
                    datasets: [{
                        label: 'Nuevos Consumidores',
                        data: buckets.map(b => mapCons.get(b.key)),
                        backgroundColor: '#ec4899',
                        borderRadius: 4
                    }]
                },
                visitasEvolucion: {
                    labels: buckets.map(b => b.label),
                    datasets: [{
                        label: 'Visitas',
                        data: buckets.map(b => mapVisitas.get(b.key)),
                        backgroundColor: THEME.colors.primary,
                        borderRadius: 4
                    }]
                },
                rubros: {
                    labels: rubrosArr.map(x => x[0]),
                    datasets: [{ data: rubrosArr.map(x => x[1]), backgroundColor: DOUGHNUT_COLORS, borderWidth: 0 }]
                },
                estados: {
                    labels: estadosArr.map(x => x[0]),
                    datasets: [{ data: estadosArr.map(x => x[1]), backgroundColor: DOUGHNUT_COLORS, borderWidth: 0 }]
                },
                creados: {
                    labels: creadorArr.map(x => x[0]),
                    datasets: [{ data: creadorArr.map(x => x[1]), backgroundColor: DOUGHNUT_COLORS, borderWidth: 0 }]
                },
                situacionLocales: {
                    labels: ['Sin comunicación nueva', 'En proceso', 'En funcionamiento'],
                    datasets: [{
                        label: 'Locales (Est. 4 y 5)',
                        data: SITUACION_LABELS.map(k => situacionMap[k]),
                        backgroundColor: SITUACION_COLORS,
                        borderRadius: 8,
                        borderWidth: 0,
                    }]
                },
            });

            // ---------- ACTIVADORES -----------
            if (currentTab === 'tabActivadores') {
                const setActNames = new Set(activators.map(a => a.nombre?.trim().toLowerCase()));

                const clientesRango = clientesMeta.filter(c => c.created_at >= isoFrom && c.created_at < isoTo);

                // Efectividad
                const breakdown = new Map();
                clientesRango.forEach(c => {
                    const nRaw = c.creado_por?.trim() || "Desconocido";
                    if (!nRaw) return;
                    const nLow = nRaw.toLowerCase();
                    if (setActNames.has(nLow)) {
                        if (!breakdown.has(nRaw)) breakdown.set(nRaw, { total: 0, efectivo: 0, sts: {} });
                        const obj = breakdown.get(nRaw);
                        obj.total++;
                        const st = c.estado || "Sin estado";
                        obj.sts[st] = (obj.sts[st] || 0) + 1;
                        if (st.startsWith('4') || st.startsWith('5')) obj.efectivo++;
                    }
                });

                const actConv = [...breakdown.entries()].map(([k, v]) => ({
                    name: k, rate: v.total > 0 ? (v.efectivo / v.total) * 100 : 0,
                    total: v.total, efectivo: v.efectivo
                })).sort((a, b) => b.rate - a.rate);

                // Stacked Dia
                const dailyStMap = new Map();
                buckets.forEach(b => dailyStMap.set(b.key, new Map()));
                const allSt = new Set();

                clientesRango.forEach(c => {
                    const nRaw = c.creado_por?.trim() || "";
                    if (setActNames.has(nRaw.toLowerCase())) {
                        const st = c.estado || "Sin estado";
                        allSt.add(st);
                        const ck = c.created_at.split('T')[0];
                        if (dailyStMap.has(ck)) {
                            dailyStMap.get(ck).set(st, (dailyStMap.get(ck).get(st) || 0) + 1);
                        }
                    }
                });

                const STATUS_COLORS = {
                    "1 - Cliente relevado": THEME.colors.slate,
                    "2 - Local Visitado No Activo": THEME.colors.danger,
                    "3 - Primer Ingreso": THEME.colors.accent,
                    "4 - Local Creado": THEME.colors.secondary,
                    "5 - Local Visitado Activo": THEME.colors.info,
                    "6 - Local No Interesado": "#ef4444",
                    "Sin estado": "#cbd5e1"
                };

                const datasetsStacked = Array.from(allSt).sort().map(st => ({
                    label: st,
                    stack: 'A',
                    backgroundColor: STATUS_COLORS[st] || "#a78bfa",
                    data: buckets.map(b => dailyStMap.get(b.key).get(st) || 0)
                }));

                const bdownClean = [...breakdown.entries()].sort((a, b) => b[1].total - a[1].total).map(([k, v]) => {
                    return {
                        name: k,
                        total: v.total,
                        statuses: Object.entries(v.sts).sort((a, b) => b[1] - a[1]).map(([s, count]) => ({ st: s.split('-').pop().trim(), count, color: STATUS_COLORS[s] || "#a78bfa" }))
                    };
                });

                setListsData(prev => ({ ...prev, activadoresDetalle: bdownClean }));

                setChartsData(prev => ({
                    ...prev,
                    activadoresConversion: {
                        labels: actConv.map(a => `${a.name} (${Math.round(a.rate)}%)`),
                        datasets: [{
                            label: 'Efectividad %',
                            data: actConv.map(a => a.rate),
                            backgroundColor: THEME.colors.primary,
                            borderRadius: 4
                        }]
                    },
                    activadoresDia: {
                        labels: buckets.map(b => b.label),
                        datasets: datasetsStacked
                    }
                }));

            }


        } catch (error) {
            console.error(error);
            toast.error("Error cargando estadísticas");
        } finally {
            setLoading(false);
        }
    };

    const renderDoughnutList = (items) => (
        <ul className="stats-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items.slice(0, 10).map((it, idx) => (
                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-dull)' }}>{it[0]}</span>
                    <strong style={{ color: 'var(--text)' }}>{it[1]}</strong>
                </li>
            ))}
        </ul>
    );

    return (
        <div className="stats-dashboard" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', overflowY: 'auto' }}>
            <header className="stats-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
                <div className="stats-title">
                    <h1 style={{ margin: 0 }}>Estadísticas</h1>
                    <p className="muted" style={{ margin: 0 }}>Vista ejecutiva del CRM: cartera, agenda y actividad.</p>
                </div>

                <div className="stats-topbar-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <select className="input" style={{ minWidth: '150px' }} value={rangePreset} onChange={(e) => setRangePreset(e.target.value)}>
                        <option value="7d">Últimos 7 días</option>
                        <option value="30d">Últimos 30 días</option>
                        <option value="60d">Últimos 60 días</option>
                        <option value="90d">Últimos 90 días</option>
                        <option value="6m">Últimos 6 meses</option>
                        <option value="1y">Último año</option>
                        <option value="custom">Personalizado</option>
                    </select>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="date" className="input" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setRangePreset('custom'); }} />
                        <span className="muted">→</span>
                        <input type="date" className="input" value={dateTo} onChange={e => { setDateTo(e.target.value); setRangePreset('custom'); }} />
                    </div>

                    <select className="input" style={{ minWidth: '180px' }} value={filterActivator} onChange={(e) => setFilterActivator(e.target.value)}>
                        <option value="">👨‍💼 Todo el Equipo</option>
                        {activators.map(a => <option key={a.email} value={a.nombre}>{a.nombre}</option>)}
                    </select>

                    <Button variant="secondary" onClick={refreshStats} disabled={loading}>{loading ? 'Cargando...' : 'Actualizar'}</Button>
                </div>
            </header>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div
                    style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', background: currentTab === 'tabApps' ? THEME.colors.primary : 'var(--bg-elevated)', color: currentTab === 'tabApps' ? '#fff' : 'var(--text)' }}
                    onClick={() => setCurrentTab('tabApps')}
                >
                    🚀 Ecosistema Apps
                </div>
                <div
                    style={{ flex: 1, padding: '12px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', background: currentTab === 'tabActivadores' ? THEME.colors.primary : 'var(--bg-elevated)', color: currentTab === 'tabActivadores' ? '#fff' : 'var(--text)' }}
                    onClick={() => setCurrentTab('tabActivadores')}
                >
                    ⚡ Gestión Activadores
                </div>
            </div>

            {currentTab === 'tabApps' && (
                <div className="tab-content active">
                    {/* KPIs ROW */}
                    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        {[
                            { label: 'Clientes activos', val: kpis.totalClientesActivos, meta: 'Base activa' },
                            { label: 'Agenda con fecha', val: kpis.conFecha, meta: 'Próximo contacto' },
                            { label: 'Vencidos', val: kpis.vencidos, meta: 'Anterior a hoy', danger: true },
                            { label: 'Sin fecha', val: kpis.sinFecha, meta: 'Sin próximo contacto' },
                            { label: 'Actividades 7d', val: kpis.act7, meta: 'Clientes' },
                            { label: 'Actividades 30d', val: kpis.act30, meta: 'Clientes' }
                        ].map(k => (
                            <div key={k.label} style={{ background: 'var(--bg-elevated)', border: `1px solid ${k.danger ? THEME.colors.danger : 'var(--border)'}`, padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{k.label}</span>
                                <strong style={{ fontSize: '1.8rem', color: k.danger ? THEME.colors.danger : 'var(--text)' }}>{k.val}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dull)' }}>{k.meta}</span>
                            </div>
                        ))}
                    </section>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Crecimiento diario (Altas)</h3>
                            <div style={{ height: '300px' }}>
                                {chartsData.crecimientoDiario && <Bar data={chartsData.crecimientoDiario} options={COMMON_OPTIONS} />}
                            </div>
                        </div>
                        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Evolución Consumidores</h3>
                            <div style={{ height: '300px' }}>
                                {chartsData.consumidoresEvolucion && <Bar data={chartsData.consumidoresEvolucion} options={COMMON_OPTIONS} />}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Rubros (Clientes)</h3>
                            <div style={{ height: '250px', marginBottom: '16px' }}>
                                {chartsData.rubros && <Doughnut data={chartsData.rubros} options={{ ...COMMON_OPTIONS, maintainAspectRatio: false }} />}
                            </div>
                            {renderDoughnutList(listsData.rubros)}
                        </div>
                        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Estados (Clientes)</h3>
                            <div style={{ height: '250px', marginBottom: '16px' }}>
                                {chartsData.estados && <Doughnut data={chartsData.estados} options={{ ...COMMON_OPTIONS, maintainAspectRatio: false }} />}
                            </div>
                            {renderDoughnutList(listsData.estados)}
                        </div>
                        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Creadores (Altas)</h3>
                            <div style={{ height: '250px', marginBottom: '16px' }}>
                                {chartsData.creados && <Doughnut data={chartsData.creados} options={{ ...COMMON_OPTIONS, maintainAspectRatio: false }} />}
                            </div>
                            {renderDoughnutList(listsData.creados)}
                        </div>
                    </div>

                    {/* SITUACION CHART */}
                    <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Situación — Locales en Estado 4 y 5</h3>
                        <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Distribución operativa de los locales creados y activos.</p>
                        <div style={{ height: '240px' }}>
                            {chartsData.situacionLocales ? (
                                <Bar
                                    data={chartsData.situacionLocales}
                                    options={{
                                        ...COMMON_OPTIONS,
                                        plugins: {
                                            ...COMMON_OPTIONS.plugins,
                                            legend: { display: false },
                                            tooltip: { ...COMMON_OPTIONS.plugins.tooltip, callbacks: { label: ctx => ` ${ctx.raw} locales` } }
                                        },
                                        scales: {
                                            x: { grid: { display: false }, ticks: { color: THEME.colors.text, font: { size: 13, weight: '600', family: THEME.fontFamily } } },
                                            y: { grid: { color: THEME.colors.grid }, ticks: { color: THEME.colors.text, stepSize: 1 }, beginAtZero: true }
                                        }
                                    }}
                                />
                            ) : <p className="muted" style={{ textAlign: 'center', paddingTop: '80px' }}>Cargando...</p>}
                        </div>
                    </div>
                </div>
            )}

            {currentTab === 'tabActivadores' && (
                <div className="tab-content active">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Altas Diarias (Stacked)</h3>
                            <div style={{ height: '350px' }}>
                                {chartsData.activadoresDia && <Bar data={chartsData.activadoresDia} options={{ ...COMMON_OPTIONS, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, grid: { color: THEME.colors.grid } } } }} />}
                            </div>
                        </div>
                        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Efectividad de Conversión (%)</h3>
                            <div style={{ height: '350px' }}>
                                {chartsData.activadoresConversion && <Bar data={chartsData.activadoresConversion} options={{ ...COMMON_OPTIONS, indexAxis: 'y' }} />}
                            </div>
                        </div>
                    </div>

                    <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Evolución de Visitas (Realizadas)</h3>
                        <div style={{ height: '350px' }}>
                            {chartsData.visitasEvolucion && <Bar data={chartsData.visitasEvolucion} options={COMMON_OPTIONS} />}
                        </div>
                    </div>

                    <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Rendimiento Detallado por Activador</h3>
                        <div className="table-responsive">
                            <table className="table-modern" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                                        <th style={{ padding: '12px' }}>Activador</th>
                                        <th style={{ padding: '12px' }}>Altas (Rango)</th>
                                        <th style={{ padding: '12px' }}>Breakdown de Estados</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {listsData.activadoresDetalle.map(act => (
                                        <tr key={act.name} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px', fontWeight: 600 }}>{act.name}</td>
                                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{act.total}</td>
                                            <td style={{ padding: '12px' }}>
                                                {act.statuses.map(s => (
                                                    <span key={s.st} style={{ background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40`, padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', marginRight: '4px', display: 'inline-block', marginBottom: '4px' }}>
                                                        {s.st}: <strong>{s.count}</strong>
                                                    </span>
                                                ))}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
