import React, { useEffect, useState, useCallback } from 'react';
import { Bar, Pie, Line, Doughnut, Radar } from 'react-chartjs-2';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomWidgetConfig } from '../../hooks/useCustomWidgets';
import { Trash2, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = [
    '#0c0c0c','#333333','#f59e0b','#ef4444','#3b82f6',
    '#64748b','#ec4899','#14b8a6','#f97316','#4b5563',
    '#06b6d4','#84cc16','#94a3b8','#fb923c','#38bdf8',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (dateStr: string, group: 'day'|'week'|'month') => {
    const d = new Date(dateStr);
    if (group === 'month') return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
    if (group === 'week') {
        // Week number within the month
        const day = d.getDate();
        const week = Math.ceil(day / 7);
        return `S${week} ${d.toLocaleDateString('es-AR', { month: 'short' })}`;
    }
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
};

const getGroupKey = (dateStr: string, group: 'day'|'week'|'month') => {
    const d = new Date(dateStr);
    if (group === 'month') return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (group === 'week') {
        const week = Math.ceil(d.getDate() / 7);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-W${week}`;
    }
    return d.toISOString().slice(0, 10);
};

const fmtNumber = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(2);
};

// ── Source date fields (used for time-series) ────────────────────────────────
const DATE_FIELDS: Record<string, string> = {
    empresa_cliente: 'created_at',
    repartidores: 'created_at',
    consumidores: 'created_at',
    actividades: 'fecha',
};

// ── Chart base options ────────────────────────────────────────────────────────

const baseOpts = (dark = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx: any) => ` ${fmtNumber(ctx.parsed.y ?? ctx.parsed ?? 0)}`,
            },
        },
    },
});

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    config: CustomWidgetConfig;
    onDelete?: (id: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export const CustomWidgetRenderer: React.FC<Props> = ({ config, onDelete }) => {
    const { empresaActiva }: any = useAuth();
    const [chartData, setChartData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const top_n = config.top_n ?? 12;
    const sort_dir = config.sort_dir ?? 'desc';
    const metric = config.metric ?? 'count';

    const fetchData = useCallback(async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        setError(null);
        try {
            // ── Time-series mode (line / area) ──────────────────────────────
            if (config.time_group && (config.chart_type === 'line' || config.chart_type === 'area' || config.chart_type === 'bar')) {
                const dateField = DATE_FIELDS[config.data_source] ?? 'created_at';
                let query = supabase
                    .from(config.data_source)
                    .select(`${dateField}${metric === 'count' ? '' : `, ${config.metric_field}`}`)
                    .eq('empresa_id', empresaActiva.id)
                    .order(dateField, { ascending: true });

                if (config.filter_field && config.filter_value) {
                    query = (query as any).eq(config.filter_field, config.filter_value);
                }

                const { data: rows, error: err } = await query;
                if (err) throw err;

                const buckets: Record<string, number[]> = {};
                (rows || []).forEach((row: any) => {
                    const date = row[dateField];
                    if (!date) return;
                    const key = getGroupKey(date, config.time_group!);
                    if (!buckets[key]) buckets[key] = [];
                    const val = metric === 'count' ? 1 : Number(row[config.metric_field!] ?? 0);
                    buckets[key].push(val);
                });

                const sortedKeys = Object.keys(buckets).sort();
                const labels = sortedKeys.map(k => fmtDate(k.replace('-W', '-') + '-01', config.time_group!));
                const values = sortedKeys.map(k => {
                    const arr = buckets[k];
                    if (metric === 'avg') return arr.reduce((a, b) => a + b, 0) / arr.length;
                    if (metric === 'sum') return arr.reduce((a, b) => a + b, 0);
                    return arr.length;
                });

                setChartData({ type: 'timeseries', labels, values });
                return;
            }

            // ── Category / group-by mode ──────────────────────────────────
            const selectFields = [
                config.group_by,
                metric !== 'count' && config.metric_field ? config.metric_field : null,
            ].filter(Boolean).join(', ');

            let query = supabase
                .from(config.data_source)
                .select(selectFields || '*')
                .eq('empresa_id', empresaActiva.id);

            if (config.filter_field && config.filter_value) {
                query = (query as any).eq(config.filter_field, config.filter_value);
            }

            const { data: rows, error: err } = await query;
            if (err) throw err;

            // ── KPI ────────────────────────────────────────────────────────
            if (config.chart_type === 'kpi') {
                let result: number;
                if (metric === 'sum' && config.metric_field) {
                    result = (rows || []).reduce((acc: number, row: any) => acc + Number(row[config.metric_field!] ?? 0), 0);
                } else if (metric === 'avg' && config.metric_field) {
                    const vals = (rows || []).map((row: any) => Number(row[config.metric_field!] ?? 0));
                    result = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
                } else {
                    result = rows?.length ?? 0;
                }
                setChartData({ type: 'kpi', value: result });
                return;
            }

            // ── Group-by aggregation ───────────────────────────────────────
            const counts: Record<string, number> = {};
            (rows || []).forEach((row: any) => {
                const key = row[config.group_by!] || 'Sin definir';
                const val = metric === 'count' ? 1 : Number(row[config.metric_field!] ?? 0);
                counts[key] = (counts[key] || 0) + val;
            });

            if (metric === 'avg') {
                const rawCounts: Record<string, number> = {};
                (rows || []).forEach((row: any) => {
                    const key = row[config.group_by!] || 'Sin definir';
                    rawCounts[key] = (rawCounts[key] || 0) + 1;
                });
                Object.keys(counts).forEach(k => { counts[k] = counts[k] / (rawCounts[k] || 1); });
            }

            const entries = Object.entries(counts);
            const sorted = sort_dir === 'asc'
                ? entries.sort((a, b) => a[1] - b[1])
                : entries.sort((a, b) => b[1] - a[1]);
            const sliced = sorted.slice(0, top_n);

            setChartData({
                type: 'grouped',
                labels: sliced.map(([k]) => k),
                values: sliced.map(([, v]) => v),
            });

        } catch (e: any) {
            setError('Error al cargar datos del widget');
            console.error('[CustomWidget]', e);
        } finally {
            setLoading(false);
        }
    }, [config.data_source, config.group_by, config.filter_field, config.filter_value,
        config.chart_type, config.metric, config.metric_field, config.time_group,
        config.top_n, config.sort_dir, empresaActiva?.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Shared card style ─────────────────────────────────────────────────────
    const cardStyle: React.CSSProperties = {
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        padding: '20px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
    };

    const Header = () => (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '7px', borderRadius: '10px', background: config.color + '20', fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>
                    {config.icon}
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{config.title}</h3>
                    {config.group_by && (
                        <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                            {metric === 'count' ? 'Conteo' : metric === 'sum' ? 'Suma' : 'Promedio'}
                            {config.time_group ? ` por ${config.time_group === 'day' ? 'día' : config.time_group === 'week' ? 'semana' : 'mes'}` : ` por ${config.group_by}`}
                        </p>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                <button onClick={fetchData} title="Actualizar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', borderRadius: '6px' }}>
                    <RefreshCw size={13} />
                </button>
                {onDelete && config.id && (
                    <button onClick={() => onDelete(config.id!)} title="Eliminar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '6px' }}>
                        <Trash2 size={13} />
                    </button>
                )}
            </div>
        </div>
    );

    // ── States ────────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={cardStyle}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <div style={{ width: '16px', height: '16px', border: `2px solid ${config.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Cargando {config.title}...
            </div>
        </div>
    );

    if (error) return (
        <div style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
            <Header />
            <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.85rem', padding: '16px' }}>⚠ {error}</div>
        </div>
    );

    // ── KPI ───────────────────────────────────────────────────────────────────
    if (config.chart_type === 'kpi') {
        const value = chartData?.value ?? 0;
        return (
            <div style={{ ...cardStyle, borderLeft: `4px solid ${config.color}` }}>
                {/* Glow effect */}
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: config.color + '15', filter: 'blur(30px)', pointerEvents: 'none' }} />
                <Header />
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', zIndex: 1 }}>
                    <span style={{ fontSize: '3.2rem', fontWeight: 900, color: config.color, letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {fmtNumber(value)}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingBottom: '8px' }}>
                        {metric === 'count' ? 'registros' : metric === 'sum' ? 'total' : 'promedio'}
                    </span>
                </div>
            </div>
        );
    }

    const labels = chartData?.labels || [];
    const values = chartData?.values || [];

    // ── List ──────────────────────────────────────────────────────────────────
    if (config.chart_type === 'list') {
        const max = Math.max(...values, 1);
        return (
            <div style={cardStyle}>
                <Header />
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {labels.map((label: string, i: number) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', minWidth: '18px' }}>#{i + 1}</span>
                            <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                            <div style={{ width: '80px', height: '6px', borderRadius: '99px', background: 'var(--border)', flexShrink: 0 }}>
                                <div style={{ height: '100%', borderRadius: '99px', width: `${(values[i] / max) * 100}%`, background: config.color, transition: 'width 0.4s ease' }} />
                            </div>
                            <strong style={{ fontSize: '0.8rem', color: config.color, minWidth: '34px', textAlign: 'right' }}>{fmtNumber(values[i])}</strong>
                        </div>
                    ))}
                    {labels.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '24px' }}>Sin datos</div>}
                </div>
            </div>
        );
    }

    // ── Prepare Chart.js dataset ──────────────────────────────────────────────

    const isCircular = config.chart_type === 'pie' || config.chart_type === 'doughnut';
    const isRadar = config.chart_type === 'radar';

    const dataset: any = {
        label: config.title,
        data: values,
        borderWidth: isCircular || isRadar ? 1.5 : 0,
        borderColor: isCircular ? PALETTE.map(c => c + 'cc') : isRadar ? config.color : config.color,
        backgroundColor: isCircular
            ? PALETTE.slice(0, values.length)
            : isRadar
                ? config.color + '30'
                : config.color,
        pointBackgroundColor: config.color,
        fill: config.chart_type === 'area',
        tension: 0.35,
        borderRadius: config.chart_type === 'bar' || config.chart_type === 'bar_horizontal' ? 5 : 0,
    };

    const jsDataset = { labels, datasets: [dataset] };

    const gridColor = 'rgba(148,163,184,0.1)';
    const tickColor = '#94a3b8';

    const opts: any = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
            legend: {
                display: isCircular || isRadar,
                position: 'bottom' as const,
                labels: { font: { size: 11 }, padding: 12, color: 'var(--text)' },
            },
            tooltip: { enabled: true },
        },
        ...((!isCircular && !isRadar) && {
            scales: {
                x: {
                    grid: { color: gridColor, display: config.chart_type === 'line' || config.chart_type === 'area' },
                    ticks: { color: tickColor, font: { size: 10 }, maxRotation: 45 },
                },
                y: {
                    beginAtZero: true,
                    grid: { color: gridColor },
                    ticks: {
                        color: tickColor, font: { size: 10 },
                        callback: (v: any) => fmtNumber(v),
                    },
                },
            },
        }),
        ...(isRadar && {
            scales: {
                r: {
                    grid: { color: gridColor },
                    pointLabels: { color: tickColor, font: { size: 10 } },
                    ticks: { display: false },
                },
            },
        }),
    };

    // Horizontal bar overrides
    if (config.chart_type === 'bar_horizontal') {
        opts.indexAxis = 'y';
        opts.scales = {
            y: { grid: { display: false }, ticks: { color: tickColor, font: { size: 10 } } },
            x: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 }, callback: (v: any) => fmtNumber(v) } },
        };
    }

    const chartEl = (() => {
        switch (config.chart_type) {
            case 'line':
            case 'area':
                return <Line data={jsDataset} options={opts} />;
            case 'pie':
                return <Pie data={jsDataset} options={opts} />;
            case 'doughnut':
                return <Doughnut data={jsDataset} options={{ ...opts, cutout: '60%' }} />;
            case 'radar':
                return <Radar data={jsDataset} options={opts} />;
            default: // bar and bar_horizontal
                return <Bar data={jsDataset} options={opts} />;
        }
    })();

    return (
        <div style={cardStyle}>
            <Header />
            <div style={{ flex: 1, minHeight: '220px', position: 'relative' }}>
                {labels.length === 0
                    ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Sin datos para mostrar</div>
                    : chartEl
                }
            </div>
        </div>
    );
};
