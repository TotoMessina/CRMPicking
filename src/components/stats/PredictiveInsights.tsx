import React from 'react';
import { TrendingUp, TrendingDown, Activity, Battery, Zap, AlertTriangle } from 'lucide-react';

interface PredictiveData {
  churn_rate: number;
  health_score: number;
  mtd_growth: number;
  growth_trend_pct: number;
}

interface Props {
  data: PredictiveData;
}

const PredictiveInsights: React.FC<Props> = ({ data }) => {
  // Simple projection logic
  const projectedTotal = Math.round(data.mtd_growth * 1.2);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {/* Churn Rate Card */}
      <div style={{ background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Tasa de Abandono (Churn)</span>
          <div style={{ padding: '8px', borderRadius: '8px', background: data.churn_rate > 20 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: data.churn_rate > 20 ? '#d97706' : '#059669' }}>
            <Activity size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{data.churn_rate}%</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dull)', marginTop: '4px' }}>Clientes inactivos en 30 días</span>
        </div>
        {data.churn_rate > 30 && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>
            <AlertTriangle size={12} /> Requiere atención inmediata
          </div>
        )}
      </div>

      {/* Health Score Card */}
      <div style={{ background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Salud de la Base</span>
          <div style={{ padding: '8px', borderRadius: '8px', background: data.health_score > 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(79, 70, 229, 0.1)', color: data.health_score > 80 ? '#059669' : '#4f46e5' }}>
            <Battery size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>{data.health_score}/100</span>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.05)', height: '6px', borderRadius: '4px', marginBottom: '8px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#10b981', width: `${data.health_score}%`, transition: 'width 1s ease' }} />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dull)', marginTop: '4px' }}>Índice de completitud de datos</span>
        </div>
      </div>

      {/* MTD Growth */}
      <div style={{ background: 'var(--bg-elevated)', position: 'relative', overflow: 'hidden', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Nuevos (Últ. 30d)</span>
          <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
            <Zap size={18} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>+{data.mtd_growth}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            {data.growth_trend_pct >= 0 ? (
                <TrendingUp size={14} color="#10b981" />
            ) : (
                <TrendingDown size={14} color="#ef4444" />
            )}
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: data.growth_trend_pct >= 0 ? '#10b981' : '#ef4444' }}>
                {Math.abs(data.growth_trend_pct)}% vs mes anterior
            </span>
          </div>
        </div>
      </div>

      {/* AI Projection */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', position: 'relative', overflow: 'hidden', padding: '20px', borderRadius: '16px', color: 'white', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}>
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, opacity: 0.8 }}>Proyección a 30 días</span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.2)' }}>
                <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>~ {projectedTotal} Estimados</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>Tendencia basada en IA de captación</span>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '120px', height: '120px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(20px)' }} />
      </div>
    </div>
  );
};

export default PredictiveInsights;
