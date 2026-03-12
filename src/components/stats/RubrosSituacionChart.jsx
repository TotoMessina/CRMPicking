import { Bar } from 'react-chartjs-2';
import { COMMON_CHART_OPTIONS, STATS_THEME } from '../../constants/statsConstants';

export const RubrosSituacionChart = ({ data, filter, setFilter }) => {
    return (
        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px' }}>Rubros — Locales Estado 5</h3>
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
                {data.labels.length > 0 ? (
                    <Bar
                        data={data}
                        plugins={[{
                            id: 'rubrosLabels',
                            afterDatasetDraw(chart) {
                                const { ctx } = chart;
                                chart.data.datasets.forEach((dataset, i) => {
                                    const meta = chart.getDatasetMeta(i);
                                    meta.data.forEach((bar, index) => {
                                        const value = dataset.data[index];
                                        if (!value) return;
                                        const barHeight = bar.base - bar.y;
                                        const midY = bar.y + barHeight / 2;
                                        ctx.save();
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        if (barHeight > 28) {
                                            ctx.font = 'bold 15px Inter, sans-serif';
                                            ctx.fillStyle = 'rgba(255,255,255,0.95)';
                                            ctx.fillText(value, bar.x, midY);
                                        } else {
                                            ctx.font = 'bold 12px Inter, sans-serif';
                                            const tw = ctx.measureText(value).width + 12;
                                            ctx.fillStyle = 'rgba(15,23,42,0.85)';
                                            const rx = bar.x - tw / 2, ry = bar.y - 22;
                                            ctx.beginPath();
                                            ctx.roundRect(rx, ry, tw, 18, 9);
                                            ctx.fill();
                                            ctx.fillStyle = '#fff';
                                            ctx.fillText(value, bar.x, ry + 9);
                                        }
                                        ctx.restore();
                                    });
                                });
                            }
                        }]}
                        options={{
                            ...COMMON_CHART_OPTIONS,
                            plugins: {
                                ...COMMON_CHART_OPTIONS.plugins,
                                legend: { display: false },
                                tooltip: { ...COMMON_CHART_OPTIONS.plugins.tooltip, callbacks: { label: ctx => ` ${ctx.raw} local${ctx.raw !== 1 ? 'es' : ''}` } }
                            },
                            scales: {
                                x: { grid: { display: false }, ticks: { color: STATS_THEME.colors.text, font: { size: 11, family: STATS_THEME.colors.fontFamily }, maxRotation: 30 } },
                                y: { grid: { color: STATS_THEME.colors.grid }, ticks: { color: STATS_THEME.colors.text, stepSize: 1 }, beginAtZero: true }
                            }
                        }}
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
