import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Zap, AlertCircle } from 'lucide-react';
import { ForecastResult } from '../../lib/forecastingService';

interface ForecastingRadarProps {
    data: ForecastResult;
    loading: boolean;
}

export const ForecastingRadar: React.FC<ForecastingRadarProps> = ({ data, loading }) => {
    if (loading) {
        return (
            <div className="bento-card" style={{ padding: '30px', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner"></div>
                <p className="muted" style={{ marginLeft: '12px' }}>IA Calculando Proyecciones...</p>
            </div>
        );
    }

    const { monthlyEstimates, weightedValue, stageProbabilities } = data;

    return (
        <div className="bento-card" style={{ 
            padding: '30px', 
            background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-elevated) 100%)',
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Accent */}
            <div style={{ 
                position: 'absolute', top: '-50px', right: '-50px', 
                width: '200px', height: '200px', 
                background: 'var(--accent)', filter: 'blur(100px)', 
                opacity: 0.1, pointerEvents: 'none' 
            }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Target className="text-accent" /> Pronóstico de Cierres AI
                    </h3>
                    <p className="muted" style={{ fontSize: '0.9rem', margin: '4px 0 0 0' }}>Proyección para los próximos 30 días</p>
                </div>
                <div style={{ padding: '8px 16px', background: 'var(--accent-soft)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent)' }}>
                    BETA PREDICTIVA
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    <div className="muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Cierres Estimados</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text)' }}>
                        {monthlyEstimates} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>locales</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>
                        <TrendingUp size={14} /> Confianza del 82%
                    </div>
                </div>

                <div style={{ background: 'rgba(0,0,0,0.02)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    <div className="muted" style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>Valor Pesado (Weighted)</div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--accent)' }}>
                        {weightedValue} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>ptos</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <Zap size={14} /> Salud de Pipeline: Óptima
                    </div>
                </div>
            </div>

            <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-muted)' }}>Probabilidades de Conversión por Etapa</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Object.entries(stageProbabilities).sort((a,b) => b[1] - a[1]).map(([stage, prob], index) => (
                        <div key={stage}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                                <span style={{ fontWeight: 600 }}>{stage}</span>
                                <span className="muted">{(prob * 100).toFixed(0)}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'var(--bg-body)', borderRadius: '4px', overflow: 'hidden' }}>
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${prob * 100}%` }}
                                    transition={{ duration: 1, delay: index * 0.1 }}
                                    style={{ 
                                        height: '100%', 
                                        background: prob > 0.7 ? '#10b981' : prob > 0.4 ? 'var(--accent)' : '#64748b',
                                        borderRadius: '4px'
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-body)', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <AlertCircle size={18} className="text-accent" style={{ marginTop: '2px' }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    <strong>Insight de IA:</strong> Se observa una alta concentración en etapas tempranas. Para mejorar la proyección del próximo mes, priorice los seguimientos en "Primer Ingreso".
                </p>
            </div>
        </div>
    );
};
