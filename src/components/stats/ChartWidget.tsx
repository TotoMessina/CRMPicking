import React from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { COMMON_CHART_OPTIONS, barValueLabelPlugin } from '../../constants/statsConstants';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Props {
    id: string;
    title: string;
    chartType: 'bar' | 'donut';
    data: any;
    list?: [string, number][];
}

export const ChartWidget: React.FC<Props> = ({ title, chartType, data, list }) => {
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
        <ul className="stats-list" style={{ listStyle: 'none', padding: '0', margin: '16px 0 0 0' }}>
            {items?.slice(0, 10).map((it, idx) => (
                <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-dull)' }}>{it[0]}</span>
                    <strong style={{ color: 'var(--text)' }}>{it[1]}</strong>
                </li>
            ))}
        </ul>
    );

    if (!data) return null;

    return (
        <div className="panel" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{title}</h3>
                <button onClick={(e) => handleDownloadChart(e, title)} title="Descargar PNG" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                    <Download size={16} />
                </button>
            </div>
            
            <div style={{ flex: 1, minHeight: '260px', position: 'relative' }}>
                {chartType === 'bar' ? (
                    <Bar data={data} options={COMMON_CHART_OPTIONS} plugins={[barValueLabelPlugin]} />
                ) : (
                    <Doughnut data={data} options={{ ...COMMON_CHART_OPTIONS, maintainAspectRatio: false }} />
                )}
            </div>
            
            {chartType === 'donut' && list && renderDoughnutList(list)}
        </div>
    );
};
