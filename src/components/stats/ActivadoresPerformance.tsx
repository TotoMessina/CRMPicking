import React from 'react';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { Trophy, Medal, Target, Users, TrendingUp, Download, Info, AlertCircle } from 'lucide-react';
import { STATS_THEME, COMMON_CHART_OPTIONS } from '../../constants/statsConstants';
import { ChartsData } from '../../hooks/useStatistics';
import { CircularProgress } from '../ui/CircularProgress';

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
    chartsData: ChartsData;
    filterActivator: string[];
}

export const ActivadoresPerformance: React.FC<Props> = ({ stats, detail, chartsData, filterActivator }) => {
    if (!stats || stats.length === 0) return null;

    // Sort by effective activations (Leaderboard ranking)
    const sortedStats = [...stats].sort((a, b) => {
        if (b.efectivo !== a.efectivo) return b.efectivo - a.efectivo;
        return b.rate - a.rate;
    });

    const getMedal = (index: number) => {
        if (index === 0) return { icon: <Trophy size={20} color="#fbbf24" />, label: '🥇 Oro' };
        if (index === 1) return { icon: <Medal size={20} color="#94a3b8" />, label: '🥈 Plata' };
        if (index === 2) return { icon: <Medal size={20} color="#b45309" />, label: '🥉 Bronce' };
        return null;
    };

    const handleDownloadChart = (e: React.MouseEvent, filename: string) => {
        const panel = (e.currentTarget as HTMLElement).closest('.panel');
        if (!panel) return;
        const canvas = panel.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    return (
        <section className="tab-content active" style={{ animation: 'fadeIn 0.5s ease-out' }}>
            {/* 1. Header & Quick View */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--accent)', color: '#fff', padding: '8px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
                        <Trophy size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Leaderboard de Activadores</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ranking basado en locales activados con éxito.</p>
                    </div>
                </div>
            </div>

            {/* 2. Top Charts Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <div className="panel bento-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <TrendingUp size={18} color="var(--accent)" /> Efectividad General
                        </h3>
                        <button onClick={(e) => handleDownloadChart(e, 'efectividad_general')} title="Descargar PNG" style={{ background: 'var(--accent-soft)', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                            <Download size={14} />
                        </button>
                    </div>
                    <div style={{ height: '300px' }}>
                        {chartsData.activadoresConversion && (
                            <Bar 
                                data={chartsData.activadoresConversion} 
                                options={{
                                    ...COMMON_CHART_OPTIONS,
                                    indexAxis: 'y' as const,
                                    plugins: {
                                        ...COMMON_CHART_OPTIONS.plugins,
                                        legend: { display: false }
                                    }
                                }} 
                            />
                        )}
                    </div>
                </div>

                <div className="panel bento-card" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Target size={18} color="var(--accent)" /> Actividad por Estado
                        </h3>
                        <button onClick={(e) => handleDownloadChart(e, 'actividad_por_estado')} title="Descargar PNG" style={{ background: 'var(--accent-soft)', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex' }}>
                            <Download size={14} />
                        </button>
                    </div>
                    <div style={{ height: '300px' }}>
                        {chartsData.activadoresDia && (
                            <Bar 
                                data={chartsData.activadoresDia} 
                                options={{
                                    ...COMMON_CHART_OPTIONS,
                                    scales: {
                                        ...COMMON_CHART_OPTIONS.scales,
                                        x: { ...COMMON_CHART_OPTIONS.scales.x, stacked: true },
                                        y: { ...COMMON_CHART_OPTIONS.scales.y, stacked: true }
                                    }
                                }} 
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* 3. The Leaderboard Ranking */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {sortedStats.map((a, index) => {
                        const medal = getMedal(index);
                        const effectColor = a.rate >= 50 ? '#10b981' : a.rate >= 25 ? '#f59e0b' : '#ef4444';
                        
                        const isUnknown = a.name === "Desconocido";
                        return (
                            <motion.div 
                                key={a.name}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bento-card" 
                                style={{
                                    padding: '24px',
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '20px',
                                    position: 'relative',
                                    border: isUnknown ? '1px dashed var(--danger)' : index < 3 ? `1px solid ${index === 0 ? '#fbbf2440' : index === 1 ? '#94a3b840' : '#b4530940'}` : '1px solid var(--border)',
                                    background: isUnknown ? 'rgba(239, 68, 68, 0.02)' : index === 0 ? 'linear-gradient(135deg, var(--bg-card) 0%, rgba(251, 191, 36, 0.03) 100%)' : 'var(--bg-card)',
                                    overflow: 'hidden'
                                }}
                            >
                                {isUnknown && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--danger)', color: '#fff', fontSize: '0.65rem', padding: '2px 8px', textAlign: 'center', fontWeight: 700 }}>
                                        ACTIVIDAD SIN USUARIO VINCULADO
                                    </div>
                                )}
                                {index < 3 && (
                                    <div style={{ 
                                        position: 'absolute', top: '12px', right: '12px', 
                                        padding: '4px 10px', borderRadius: '12px', 
                                        background: index === 0 ? '#fbbf2420' : index === 1 ? '#94a3b820' : '#b4530920',
                                        color: index === 0 ? '#d97706' : index === 1 ? '#475569' : '#92400e',
                                        fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px'
                                    }}>
                                        {medal?.icon} {medal?.label}
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <CircularProgress value={a.rate} color={effectColor} size={64} strokeWidth={6} />
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)' }}>{a.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Posición #{index + 1} en el ranking
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div style={{ textAlign: 'center' }} title="Locales creados en sistema por este usuario en el periodo seleccionado">
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {a.total}
                                            <Info size={10} style={{ opacity: 0.5 }} />
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Relevos</div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '0 8px', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }} title="Locales que el usuario logró pasar exitosamente a estado de Local Creado (4) o Local Activo (5) en este periodo">
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: effectColor, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {a.efectivo}
                                            <Info size={10} style={{ opacity: 0.5 }} />
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cierres</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }} title="Cantidad total de fotos de visitas registradas en locales">
                                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                            {a.visitas}
                                            <Info size={10} style={{ opacity: 0.5 }} />
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visitas</div>
                                    </div>
                                </div>

                                <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={14} color={effectColor} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                        {a.efectivo >= 5 ? 'Mantiene ritmo alto' : a.efectivo > 0 ? 'Progreso constante' : 'Iniciando gestiones'}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* 4. Detailed Table */}
            <div className="panel bento-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={18} color="var(--accent)" />
                    <h3 style={{ margin: 0 }}>Desglose de Gestión Detallada</h3>
                </div>
                <div className="table-responsive">
                    <table className="table-modern" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', background: 'var(--bg-elevated)', fontSize: '0.85rem' }}>
                                <th style={{ padding: '16px 24px' }}>Activador</th>
                                <th style={{ padding: '16px 24px' }}>Totales</th>
                                <th style={{ padding: '16px 24px' }}>Estados Actuales</th>
                            </tr>
                        </thead>
                        <tbody>
                            {detail.map(act => (
                                <tr key={act.name} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover-bg">
                                    <td style={{ padding: '16px 24px', fontWeight: 700, fontSize: '1rem' }}>{act.name}</td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{act.total}</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>locales</span>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {act.statuses.map(s => (
                                                <span key={s.st} style={{ background: `${s.color}20`, color: s.color, padding: '4px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, border: `1px solid ${s.color}30` }}>
                                                    {s.st}: {s.count}
                                                </span>
                                            ))}
                                        </div>
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
