import React from 'react';
import { KpiState } from '../../hooks/useStatistics';
import { TrendingUp, Calendar, AlertTriangle, Clock, Activity, Zap } from 'lucide-react';

interface Props {
    kpis: KpiState;
}

export const StatKpiCards: React.FC<Props> = ({ kpis }) => {
    const cards = [
        { label: 'Clientes activos', val: kpis.totalClientesActivos, meta: 'Base activa', icon: <TrendingUp size={20} color="var(--accent)" />, danger: false, theme: '#0c0c0c' },
        { label: 'Agenda con fecha', val: kpis.conFecha, meta: 'Próximo contacto', icon: <Calendar size={20} color="#34d399" />, danger: false, theme: '#10b981' },
        { label: 'Vencidos', val: kpis.vencidos, meta: 'Anterior a hoy', danger: true, icon: <AlertTriangle size={20} color="#fb7185" />, theme: '#f43f5e' },
        { label: 'Sin fecha', val: kpis.sinFecha, meta: 'Sin próximo contacto', icon: <Clock size={20} color="#94a3b8" />, danger: false, theme: '#64748b' },
        { label: 'Actividades 7d', val: kpis.act7, meta: 'Clientes', icon: <Zap size={20} color="#fbbf24" />, danger: false, theme: '#f59e0b' },
        { label: 'Actividades 30d', val: kpis.act30, meta: 'Clientes', icon: <Activity size={20} color="#94a3b8" />, danger: false, theme: '#64748b' }
    ];

    return (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {cards.map(k => (
                <div 
                    key={k.label} 
                    style={{ 
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '20px',
                        borderRadius: '16px',
                        background: k.danger ? 'rgba(244, 63, 94, 0.05)' : 'var(--bg-elevated)',
                        border: `1px solid ${k.danger ? 'rgba(244, 63, 94, 0.3)' : 'var(--border)'}`,
                        boxShadow: k.danger ? '0 0 15px rgba(244, 63, 94, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: 'var(--text-muted)' }}>
                            {k.label}
                        </span>
                        <div style={{ padding: '6px', borderRadius: '8px', background: k.danger ? 'rgba(244, 63, 94, 0.1)' : 'var(--bg)' }}>
                            {k.icon}
                        </div>
                    </div>
                    
                    <strong style={{ fontSize: '1.875rem', fontWeight: 900, letterSpacing: '-0.025em', marginTop: '4px', marginBottom: '4px', color: k.danger ? '#f43f5e' : 'var(--text)' }}>
                        {k.val}
                    </strong>
                    
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-dull)' }}>
                        {k.meta}
                    </span>
                    
                    {/* Subtle decorative gradient blob */}
                    <div style={{
                        position: 'absolute',
                        right: '-24px',
                        bottom: '-24px',
                        width: '96px',
                        height: '96px',
                        borderRadius: '50%',
                        filter: 'blur(24px)',
                        opacity: 0.15,
                        pointerEvents: 'none',
                        background: k.theme
                    }} />
                </div>
            ))}
        </section>
    );
};
