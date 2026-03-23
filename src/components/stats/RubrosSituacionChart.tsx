import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { COMMON_CHART_OPTIONS, STATS_THEME } from '../../constants/statsConstants';
import { ChartData, ChartOptions } from 'chart.js';

interface Props {
    data: ChartData<'bar'> | any;
    filter: Set<string>;
    setFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const RubrosSituacionChart: React.FC<Props> = ({ data, filter, setFilter }) => {
    const navigate = useNavigate();

    const handleDownloadChart = (e: React.MouseEvent) => {
        const panel = (e.currentTarget as HTMLElement).closest('.panel');
        if (!panel) return;
        const canvas = panel.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `rubros_situacion.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h3 style={{ margin: 0 }}>Rubros — Locales Estado 5</h3>
                        <button onClick={handleDownloadChart} title="Descargar PNG" style={{ background: 'var(--accent-soft)', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                            <Download size={14} />
                        </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {filter.size === 0
                            ? 'Mostrando todos los locales activos'
                            : `Filtrando por: ${[...filter].join(' + ')}`}
                    </p>
                </div>
                {/* Multi-select filter tabs */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                        onClick={() => setFilter(new Set())}
                        style={{
                            fontSize: '0.78rem', fontWeight: 600, padding: '6px 14px', borderRadius: '99px', cursor: 'pointer',
                            background: filter.size === 0 ? STATS_THEME.colors.primary : 'rgba(79,70,229,0.12)',
                            color: filter.size === 0 ? '#fff' : STATS_THEME.colors.primary,
                            border: '1px solid rgba(79,70,229,0.35)',
                            transition: 'all 0.15s ease'
                        }}
                    >Todos</button>
                    {[
                        { key: 'sin comunicacion nueva', label: 'Sin comunicación', color: '#94a3b8' },
                        { key: 'en proceso', label: 'En proceso', color: '#f59e0b' },
                        { key: 'en funcionamiento', label: 'En funcionamiento', color: '#10b981' },
                    ].map(f => {
                        const active = filter.has(f.key);
                        return (
                            <button
                                key={f.key}
                                onClick={() => setFilter(prev => {
                                    const next = new Set(prev);
                                    if (next.has(f.key)) next.delete(f.key);
                                    else next.add(f.key);
                                    return next;
                                })}
                                style={{
                                    fontSize: '0.78rem', fontWeight: 600, padding: '6px 14px', borderRadius: '99px', cursor: 'pointer',
                                    background: active ? f.color : `${f.color}18`,
                                    color: active ? '#fff' : f.color,
                                    border: `1px solid ${f.color}${active ? '' : '50'}`,
                                    transition: 'all 0.15s ease',
                                    boxShadow: active ? `0 0 0 2px ${f.color}40` : 'none'
                                }}
                            >
                                {active && '✓ '}{f.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div style={{ height: '280px' }}>
                {data.labels && data.labels.length > 0 ? (
                    <Bar
                        data={data}
                        plugins={[{
                            id: 'rubrosLabels',
                            afterDatasetDraw(chart) {
                                const { ctx } = chart;
                                chart.data.datasets.forEach((dataset, i) => {
                                    const meta = chart.getDatasetMeta(i);
                                    meta.data.forEach((bar: any, index) => {
                                        const value = dataset.data[index];
                                        if (!value || typeof value !== 'number') return;
                                        const barHeight = bar.base - bar.y;
                                        const midY = bar.y + barHeight / 2;
                                        ctx.save();
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        if (barHeight > 28) {
                                            ctx.font = 'bold 15px Inter, sans-serif';
                                            ctx.fillStyle = 'rgba(255,255,255,0.95)';
                                            ctx.fillText(value.toString(), bar.x, midY);
                                        } else {
                                            ctx.font = 'bold 12px Inter, sans-serif';
                                            const tw = ctx.measureText(value.toString()).width + 12;
                                            ctx.fillStyle = 'rgba(15,23,42,0.85)';
                                            const rx = bar.x - tw / 2, ry = bar.y - 22;
                                            ctx.beginPath();
                                            // @ts-ignore
                                            if (ctx.roundRect) ctx.roundRect(rx, ry, tw, 18, 9);
                                            else ctx.rect(rx, ry, tw, 18);
                                            ctx.fill();
                                            ctx.fillStyle = '#fff';
                                            ctx.fillText(value.toString(), bar.x, ry + 9);
                                        }
                                        ctx.restore();
                                    });
                                });
                            }
                        }]}
                        options={{
                            ...COMMON_CHART_OPTIONS,
                            onClick: (e: any, elements: any, chart: any) => {
                                if (elements && elements.length > 0) {
                                    const index = elements[0].index;
                                    const rubroClick = chart.data.labels?.[index] as string;
                                    if (rubroClick) {
                                        const activeSituaciones = Array.from(filter);
                                        navigate('/clientes', { 
                                            state: { 
                                                estado: ['5 - Local Visitado Activo'], 
                                                situacion: activeSituaciones.length > 0 ? activeSituaciones : [],
                                                rubro: [rubroClick] 
                                            } 
                                        });
                                    }
                                }
                            },
                            onHover: (event: any, chartElement: any) => {
                                if (event.native?.target) {
                                    (event.native.target as HTMLElement).style.cursor = chartElement[0] ? 'pointer' : 'default';
                                }
                            },
                            plugins: {
                                ...COMMON_CHART_OPTIONS.plugins,
                                legend: { display: false },
                                tooltip: { ...COMMON_CHART_OPTIONS.plugins?.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.raw} local${ctx.raw !== 1 ? 'es' : ''}` } }
                            },
                            scales: {
                                x: { grid: { display: false }, ticks: { color: STATS_THEME.colors.text, font: { size: 11, family: STATS_THEME.fontFamily }, maxRotation: 30 } },
                                y: { grid: { color: STATS_THEME.colors.grid }, ticks: { color: STATS_THEME.colors.text, stepSize: 1 }, beginAtZero: true }
                            }
                        } as ChartOptions<'bar'>}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Sin locales para esta situación
                    </div>
                )}
            </div>
        </div>
    );
};
