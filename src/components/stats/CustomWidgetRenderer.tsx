import React, { useEffect, useState } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CustomWidgetConfig } from '../../hooks/useCustomWidgets';
import { Trash2, RefreshCw } from 'lucide-react';

const PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];

// Human-readable group-by labels
const GROUP_LABELS: Record<string, Record<string, string>> = {
    empresa_cliente: { estado: 'Estado', rubro: 'Rubro', situacion: 'Situación', responsable: 'Responsable', creado_por: 'Creado por' },
    repartidores: { zona: 'Zona', activo: 'Activo' },
    consumidores: {},
    actividades: { descripcion: 'Tipo de Actividad', usuario: 'Usuario' },
};

interface Props {
    config: CustomWidgetConfig;
    onDelete?: (id: string) => void;
}

export const CustomWidgetRenderer: React.FC<Props> = ({ config, onDelete }) => {
    const { empresaActiva }: any = useAuth();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        if (!empresaActiva?.id) return;
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from(config.data_source)
                .select(config.group_by ? `${config.group_by}` : '*')
                .eq('empresa_id', empresaActiva.id);

            // Apply optional filter
            if (config.filter_field && config.filter_value) {
                query = (query as any).eq(config.filter_field, config.filter_value);
            }

            const { data: rows, error: err } = await query;
            if (err) throw err;

            if (config.chart_type === 'kpi') {
                setData({ count: rows?.length ?? 0 });
            } else {
                // Count by group_by field
                const counts: Record<string, number> = {};
                (rows || []).forEach((row: any) => {
                    const key = row[config.group_by!] || 'Sin definir';
                    counts[key] = (counts[key] || 0) + 1;
                });
                const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
                setData({
                    labels: sorted.map(([k]) => k),
                    values: sorted.map(([, v]) => v),
                });
            }
        } catch (e: any) {
            setError('Error al cargar datos');
            console.error('CustomWidget error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [config.data_source, config.group_by, config.filter_field, config.filter_value, empresaActiva?.id]);

    const cardStyle: React.CSSProperties = {
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '20px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px',
    };

    const titleStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)',
    };

    if (loading) return (
        <div style={cardStyle}>
            <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Cargando {config.title}...
            </div>
        </div>
    );

    if (error) return (
        <div style={{ ...cardStyle, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.04)' }}>
            <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.85rem', padding: '16px' }}>⚠ {error}</div>
        </div>
    );

    // ---- KPI Card ----
    if (config.chart_type === 'kpi') return (
        <div style={{ ...cardStyle, borderLeft: `4px solid ${config.color}` }}>
            <div style={headerStyle}>
                <h3 style={titleStyle}><span style={{ fontSize: '1.3rem' }}>{config.icon}</span>{config.title}</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={fetchData} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><RefreshCw size={14} /></button>
                    {onDelete && config.id && <button onClick={() => onDelete(config.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}><Trash2 size={14} /></button>}
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <span style={{ fontSize: '3rem', fontWeight: 900, color: config.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{data?.count ?? 0}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingBottom: '8px' }}>registros</span>
            </div>
        </div>
    );

    const chartData = {
        labels: data?.labels || [],
        datasets: [{
            label: config.title,
            data: data?.values || [],
            backgroundColor: config.chart_type === 'pie' ? PALETTE : config.color,
            borderRadius: config.chart_type === 'bar' ? 6 : 0,
            borderWidth: 0,
        }],
    };

    const commonOpts: any = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: config.chart_type === 'pie', position: 'bottom' }, tooltip: { enabled: true } },
    };

    // ---- LIST ----
    if (config.chart_type === 'list') return (
        <div style={cardStyle}>
            <div style={headerStyle}>
                <h3 style={titleStyle}><span style={{ fontSize: '1.3rem' }}>{config.icon}</span>{config.title}</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={fetchData} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><RefreshCw size={14} /></button>
                    {onDelete && config.id && <button onClick={() => onDelete(config.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}><Trash2 size={14} /></button>}
                </div>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {(data?.labels || []).map((label: string, i: number) => (
                    <li key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '0.875rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: PALETTE[i % PALETTE.length], flexShrink: 0, display: 'inline-block' }} />
                            {label}
                        </span>
                        <strong style={{ color: config.color }}>{data?.values[i]}</strong>
                    </li>
                ))}
            </ul>
        </div>
    );

    // ---- BAR / PIE ----
    return (
        <div style={cardStyle}>
            <div style={headerStyle}>
                <h3 style={titleStyle}><span style={{ fontSize: '1.3rem' }}>{config.icon}</span>{config.title}</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={fetchData} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}><RefreshCw size={14} /></button>
                    {onDelete && config.id && <button onClick={() => onDelete(config.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}><Trash2 size={14} /></button>}
                </div>
            </div>
            <div style={{ flex: 1, minHeight: '260px', position: 'relative' }}>
                {config.chart_type === 'bar'
                    ? <Bar data={chartData} options={{ ...commonOpts, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }} />
                    : <Pie data={chartData} options={commonOpts} />
                }
            </div>
        </div>
    );
};
