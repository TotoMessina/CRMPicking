import React from 'react';
import { STATS_THEME } from '../../constants/statsConstants';

interface StatusBreakdown {
    st: string;
    count: number;
    color: string;
}

interface ActivatorDetail {
    name: string;
    total: number;
    statuses: StatusBreakdown[];
}

interface ActivatorStat {
    name: string;
    rate: number;
    total: number;
    efectivo: number;
    visitas: number;
}

interface Props {
    stats: ActivatorStat[];
    detail: ActivatorDetail[];
    filterActivator: string;
}

export const ActivadoresPerformance: React.FC<Props> = ({ stats, detail, filterActivator }) => {
    if (!stats || stats.length === 0) return null;

    return (
        <section className="tab-content active">
            {/* Per-activator KPI cards grid */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                        {filterActivator ? `📊 ${filterActivator}` : '📊 Rendimiento por Activador'}
                    </h3>
                    {!filterActivator && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '2px 10px', borderRadius: '99px' }}>
                            {stats.length} activadores
                        </span>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                    {stats.map(a => {
                        const effectColor = a.rate >= 50 ? STATS_THEME.colors.secondary : a.rate >= 25 ? STATS_THEME.colors.accent : STATS_THEME.colors.danger;
                        return (
                            <div key={a.name} style={{
                                background: 'var(--bg-elevated)',
                                border: `1px solid var(--border)`,
                                borderTop: `3px solid ${effectColor}`,
                                borderRadius: '14px',
                                padding: '20px 20px 16px',
                                display: 'flex', flexDirection: 'column', gap: '14px'
                            }}>
                                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {a.name}
                                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: effectColor }}>{Math.round(a.rate)}%</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                                    <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 6px' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{a.total}</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Relevos</div>
                                    </div>
                                    <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 6px' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: effectColor, lineHeight: 1 }}>{a.efectivo}</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Activado</div>
                                    </div>
                                    <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '10px 6px' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{a.visitas}</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Visitas</div>
                                    </div>
                                </div>
                                {/* Efectividad bar */}
                                <div>
                                    <div style={{ height: '6px', background: 'var(--bg)', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${Math.min(100, a.rate)}%`, background: effectColor, borderRadius: '99px', transition: 'width 0.6s ease' }} />
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>Efectividad de conversión</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="panel" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Rendimiento Detallado por Activador</h3>
                <div className="table-responsive">
                    <table className="table-modern" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                                <th style={{ padding: '12px' }}>Activador</th>
                                <th style={{ padding: '12px' }}>Aportes Directos</th>
                                <th style={{ padding: '12px' }}>Breakdown de Estados Asignados</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detail.map(act => (
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
        </section>
    );
};
