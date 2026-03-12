import React from 'react';
import { Bar } from 'react-chartjs-2';
import { COMMON_CHART_OPTIONS, STATS_THEME } from '../../constants/statsConstants';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartData,
    ChartOptions
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface Props {
    data: ChartData<'bar'> | any;
    total: number;
}

export const SituacionChart: React.FC<Props> = ({ data, total }) => {
    if (!data) return <p className="muted" style={{ textAlign: 'center', paddingTop: '80px' }}>Cargando...</p>;

    return (
        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Situación — Locales en Estado 5</h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Distribución operativa de los locales activos (Local Visitado Activo).</p>
            <div style={{ height: '240px' }}>
                <Bar
                    data={data}
                    plugins={[{
                        id: 'situacionLabels',
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
                                    ctx.font = 'bold 18px Inter, sans-serif';
                                    ctx.textAlign = 'center';
                                    ctx.textBaseline = 'middle';
                                    if (barHeight > 28) {
                                        ctx.fillStyle = 'rgba(255,255,255,0.95)';
                                        ctx.fillText(value.toString(), bar.x, midY);
                                    } else {
                                        ctx.font = 'bold 13px Inter, sans-serif';
                                        const tw = ctx.measureText(value.toString()).width + 12;
                                        ctx.fillStyle = 'rgba(15,23,42,0.85)';
                                        const rx = bar.x - tw / 2, ry = bar.y - 24;
                                        ctx.beginPath();
                                        // @ts-ignore
                                        if (ctx.roundRect) {
                                            // @ts-ignore
                                            ctx.roundRect(rx, ry, tw, 20, 10);
                                        } else {
                                            ctx.rect(rx, ry, tw, 20);
                                        }
                                        ctx.fill();
                                        ctx.fillStyle = '#fff';
                                        ctx.fillText(value.toString(), bar.x, ry + 10);
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
                            tooltip: { ...COMMON_CHART_OPTIONS.plugins?.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.raw} locales` } }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: STATS_THEME.colors.text, font: { size: 13, weight: '600', family: STATS_THEME.fontFamily } } },
                            y: { grid: { color: STATS_THEME.colors.grid }, ticks: { color: STATS_THEME.colors.text, stepSize: 1 } }
                        }
                    } as ChartOptions<'bar'>}
                />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total locales (Estado 5)</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--text)', marginLeft: 'auto' }}>{total}</strong>
                {[
                    { label: 'Sin comunicación', color: '#94a3b8' },
                    { label: 'En proceso', color: '#f59e0b' },
                    { label: 'En funcionamiento', color: '#10b981' },
                ].map((s, i) => (
                    <span key={s.label} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}40` }}>
                        {s.label}: {data.datasets[0].data[i]}
                    </span>
                ))}
            </div>
        </div>
    );
};
