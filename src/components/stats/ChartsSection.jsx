import { Bar, Doughnut } from 'react-chartjs-2';
import { COMMON_CHART_OPTIONS } from '../../constants/statsConstants';

export const ChartsSection = ({ chartsData, listsData }) => {
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
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                {[
                    { title: 'Crecimiento diario (Altas)', data: chartsData.crecimientoDiario },
                    { title: 'Evolución Consumidores', data: chartsData.consumidoresEvolucion },
                    { title: 'Evolución Repartidores', data: chartsData.repartidoresEvolucion }
                ].map(c => (
                    <div key={c.title} className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{c.title}</h3>
                        <div style={{ height: '300px' }}>
                            {c.data && <Bar data={c.data} options={COMMON_CHART_OPTIONS} />}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                {[
                    { title: 'Rubros (Clientes)', data: chartsData.rubros, list: listsData.rubros },
                    { title: 'Estados (Clientes)', data: chartsData.estados, list: listsData.estados },
                    { title: 'Creadores (Altas)', data: chartsData.creados, list: listsData.creados }
                ].map(c => (
                    <div key={c.title} className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px' }}>{c.title}</h3>
                        <div style={{ height: '250px', marginBottom: '16px' }}>
                            {c.data && <Doughnut data={c.data} options={{ ...COMMON_CHART_OPTIONS, maintainAspectRatio: false }} />}
                        </div>
                        {renderDoughnutList(c.list)}
                    </div>
                ))}
            </div>
        </>
    );
};
