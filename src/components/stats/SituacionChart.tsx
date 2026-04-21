import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();

    if (!data) return (
        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <div className="skeleton" style={{ height: '20px', width: '200px', marginBottom: '8px', borderRadius: '4px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '250px', borderRadius: '4px' }} />
                </div>
            </div>
            <div style={{ height: '240px', display: 'flex', alignItems: 'flex-end', gap: '12%', padding: '0 40px' }}>
                <div className="skeleton" style={{ flex: 1, height: '40%', borderRadius: '4px 4px 0 0' }} />
                <div className="skeleton" style={{ flex: 1, height: '80%', borderRadius: '4px 4px 0 0' }} />
                <div className="skeleton" style={{ flex: 1, height: '30%', borderRadius: '4px 4px 0 0' }} />
            </div>
            <div style={{ marginTop: '20px', height: '45px', borderRadius: '10px' }} className="skeleton" />
        </div>
    );

    const handleDownloadChart = (e: React.MouseEvent) => {
        const panel = (e.currentTarget as HTMLElement).closest('.panel');
        if (!panel) return;
        const canvas = panel.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `situacion_locales.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h3 style={{ marginTop: 0, marginBottom: '4px' }}>Situación — Locales en Estado 5</h3>
                    <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Distribución operativa de los locales activos (Local Visitado Activo).</p>
                </div>
                <button onClick={handleDownloadChart} title="Descargar PNG" style={{ background: 'var(--accent-soft)', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
                    <Download size={18} />
                </button>
            </div>
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
                                        if (ctx.roundRect) ctx.roundRect(rx, ry, tw, 20, 10);
                                        else ctx.rect(rx, ry, tw, 20);
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
                        onClick: (e: any, elements: any, chart: any) => {
                            if (elements && elements.length > 0) {
                                const index = elements[0].index;
                                const label = chart.data.labels?.[index] as string;
                                
                                let key = label;
                                if (label === 'Sin comunicación') key = 'sin comunicacion nueva';
                                else if (label === 'En proceso') key = 'en proceso';
                                else if (label === 'En funcionamiento') key = 'en funcionamiento';
                                
                                if (key) {
                                    navigate('/clientes', { state: { estado: ['5 - Local Visitado Activo'], situacion: [key] } });
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
                            tooltip: { ...COMMON_CHART_OPTIONS.plugins?.tooltip, callbacks: { label: (ctx: any) => ` ${ctx.raw} locales` } }
                        },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: STATS_THEME.colors.text, font: { size: 13, weight: '600', family: STATS_THEME.fontFamily } } },
                            y: { grid: { color: STATS_THEME.colors.grid }, ticks: { color: STATS_THEME.colors.text, stepSize: 1 } }
                        }
                    } as ChartOptions<'bar'>}
                />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 18px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total locales (Estado 5)</span>
                <strong style={{ fontSize: '1.5rem', color: 'var(--text)', marginLeft: 'auto' }}>{total}</strong>
                {data.labels?.map((label: string, i: number) => {
                    const value = data.datasets[0].data[i];
                    if (!value) return null;
                    const color = i === 0 ? '#94a3b8' : i === 1 ? '#f59e0b' : '#10b981'; // Simplified fallback colors
                    return (
                        <span key={label} style={{ fontSize: '0.78rem', fontWeight: 600, padding: '4px 10px', borderRadius: '99px', background: `${color}20`, color: color, border: `1px solid ${color}40` }}>
                            {label}: {value}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};
