import { STATS_THEME } from '../../constants/statsConstants';

export const StatKpiCards = ({ kpis }) => {
    const cards = [
        { label: 'Clientes activos', val: kpis.totalClientesActivos, meta: 'Base activa' },
        { label: 'Agenda con fecha', val: kpis.conFecha, meta: 'Próximo contacto' },
        { label: 'Vencidos', val: kpis.vencidos, meta: 'Anterior a hoy', danger: true },
        { label: 'Sin fecha', val: kpis.sinFecha, meta: 'Sin próximo contacto' },
        { label: 'Actividades 7d', val: kpis.act7, meta: 'Clientes' },
        { label: 'Actividades 30d', val: kpis.act30, meta: 'Clientes' }
    ];

    return (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {cards.map(k => (
                <div 
                    key={k.label} 
                    style={{ 
                        background: 'var(--bg-elevated)', 
                        border: `1px solid ${k.danger ? STATS_THEME.colors.danger : 'var(--border)'}`, 
                        padding: '16px', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                    }}
                >
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{k.label}</span>
                    <strong style={{ fontSize: '1.8rem', color: k.danger ? STATS_THEME.colors.danger : 'var(--text)' }}>{k.val}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dull)' }}>{k.meta}</span>
                </div>
            ))}
        </section>
    );
};
