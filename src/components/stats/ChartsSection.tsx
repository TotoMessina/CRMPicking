import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { COMMON_CHART_OPTIONS, barValueLabelPlugin } from '../../constants/statsConstants';
import { ChartsData, ListsData } from '../../hooks/useStatistics';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface Props {
    chartsData: ChartsData;
    listsData: ListsData;
    enabledBars?: string[];
    enabledDonuts?: string[];
}

export const ChartsSection: React.FC<Props> = ({ chartsData, listsData, enabledBars, enabledDonuts }) => {
    const handleDownloadChart = (e: React.MouseEvent, title: string) => {
        const panel = (e.currentTarget as HTMLElement).closest('.panel');
        if (!panel) return;
        const canvas = panel.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const renderDoughnutList = (items: [string, number][] = []) => (
        <ul className="stats-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {items?.slice(0, 10).map((it, idx) => (
                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-dull)' }}>{it[0]}</span>
                    <strong style={{ color: 'var(--text)' }}>{it[1]}</strong>
                </li>
            ))}
        </ul>
    );

    const allBars = [
        { id: 'growth_chart', title: 'Crecimiento diario (Altas)', data: chartsData.crecimientoDiario },
        { id: 'consumidores_chart', title: 'Evolución Consumidores', data: chartsData.consumidoresEvolucion },
        { id: 'repartidores_chart', title: 'Evolución Repartidores', data: chartsData.repartidoresEvolucion }
    ];

    const allDonuts = [
        { id: 'rubros_donut', title: 'Rubros (Clientes)', data: chartsData.rubros, list: listsData.rubros },
        { id: 'estados_donut', title: 'Estados (Clientes)', data: chartsData.estados, list: listsData.estados },
        { id: 'creadores_donut', title: 'Creadores (Altas)', data: chartsData.creados, list: listsData.creados }
    ];

    const visibleBars = enabledBars ? allBars.filter(c => enabledBars.includes(c.id)) : allBars;
    const visibleDonuts = enabledDonuts ? allDonuts.filter(c => enabledDonuts.includes(c.id)) : allDonuts;

    return (
        <>
            {visibleBars.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    {visibleBars.map(c => (
                        <div key={c.title} className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0 }}>{c.title}</h3>
                                <button onClick={(e) => handleDownloadChart(e, c.title)} title="Descargar PNG" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    <Download size={16} />
                                </button>
                            </div>
                            <div style={{ height: '300px' }}>
                                {c.data && <Bar data={c.data} options={COMMON_CHART_OPTIONS} plugins={[barValueLabelPlugin]} />}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {visibleDonuts.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                    {visibleDonuts.map(c => (
                        <div key={c.title} className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ margin: 0 }}>{c.title}</h3>
                                <button onClick={(e) => handleDownloadChart(e, c.title)} title="Descargar PNG" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                    <Download size={16} />
                                </button>
                            </div>
                            <div style={{ height: '250px', marginBottom: '16px' }}>
                                {c.data && <Doughnut data={c.data} options={{ ...COMMON_CHART_OPTIONS, maintainAspectRatio: false }} />}
                            </div>
                            {renderDoughnutList(c.list)}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};
