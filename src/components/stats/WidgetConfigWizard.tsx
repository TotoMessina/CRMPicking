import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Plus, Square, Columns, LayoutGrid, TrendingUp } from 'lucide-react';
import { CustomWidgetConfig } from '../../hooks/useCustomWidgets';

interface WidgetConfigWizardProps {
    newWidget: CustomWidgetConfig;
    setNewWidget: React.Dispatch<React.SetStateAction<CustomWidgetConfig>>;
    step: number;
    setStep: React.Dispatch<React.SetStateAction<number>>;
    evaluating: boolean;
    viabilityError: string;
    filterValues: string[];
    loadingFilterValues: boolean;
    showEmojiPicker: boolean;
    setShowEmojiPicker: (s: boolean) => void;
    handleNextStep: () => void;
    handleSaveWidget: () => void;
    savingCustom: boolean;
    CHART_TYPES: any[];
    DATA_SOURCE_OPTIONS: any[];
    GROUP_BY_OPTIONS: any;
    NEEDS_GROUP_BY: string[];
    TIME_GROUP_SUPPORTS: string[];
    SIZE_OPTIONS: any[];
    EMOJI_OPTIONS: string[];
    COLOR_OPTIONS: string[];
    BLANK_WIDGET: CustomWidgetConfig;
    STEP_LABELS: string[];
}

const BAR_HEIGHTS = [40, 80, 60, 95, 50, 75, 35, 65];

const WidgetPreview: React.FC<{ config: CustomWidgetConfig; CHART_TYPES: any[] }> = ({ config, CHART_TYPES }) => {
    const bg = config.color + '12';
    const border = config.color + '35';
    const PALETTE = [
        config.color, config.color + 'cc', config.color + '99',
        config.color + '66', config.color + '44', config.color + '33',
    ];

    const chartPreview = (() => {
        switch (config.chart_type) {
            case 'kpi': return (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: config.color, lineHeight: 1 }}>1.2k</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#10b981', fontSize: '0.65rem', fontWeight: 700, paddingBottom: '4px' }}>
                        <TrendingUp size={10} /> +8%
                    </div>
                </div>
            );
            case 'bar': return (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '60px' }}>
                    {BAR_HEIGHTS.map((h, i) => <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: PALETTE[i % PALETTE.length] }} />)}
                </div>
            );
            case 'bar_horizontal': return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[80, 60, 45].map((w, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', minWidth: '20px' }}>Cat {i+1}</span>
                            <div style={{ flex: 1, background: 'var(--border)', height: '10px', borderRadius: '99px' }}>
                                <div style={{ width: `${w}%`, height: '100%', borderRadius: '99px', background: config.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            );
            case 'line':
            case 'area': {
                const pts = [30,55,42,70,58,85,75,90];
                const w = 160, h = 60;
                const maxP = Math.max(...pts);
                const svgPts = pts.map((p, i) => `${(i/(pts.length-1))*w},${h - (p/maxP)*h}`).join(' ');
                const fillPts = `0,${h} ${svgPts} ${w},${h}`;
                return (
                    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '60px' }}>
                        {config.chart_type === 'area' && <polygon points={fillPts} fill={config.color + '20'} />}
                        <polyline points={svgPts} fill="none" stroke={config.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {pts.map((p, i) => <circle key={i} cx={(i/(pts.length-1))*w} cy={h-(p/maxP)*h} r="2.5" fill={config.color} />)}
                    </svg>
                );
            }
            case 'pie':
            case 'doughnut': {
                const cutout = config.chart_type === 'doughnut' ? 10 : 16;
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <svg viewBox="0 0 32 32" width="56" height="56" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
                            {config.chart_type === 'doughnut' && <circle r="8" cx="16" cy="16" fill="var(--bg)" />}
                            <circle r={cutout} cx="16" cy="16" fill="transparent" stroke={PALETTE[0]} strokeWidth={config.chart_type === 'doughnut' ? 6 : 32} strokeDasharray="40 60" />
                            <circle r={cutout} cx="16" cy="16" fill="transparent" stroke={PALETTE[1]} strokeWidth={config.chart_type === 'doughnut' ? 6 : 32} strokeDasharray="25 75" strokeDashoffset="-40" />
                            <circle r={cutout} cx="16" cy="16" fill="transparent" stroke={PALETTE[2]} strokeWidth={config.chart_type === 'doughnut' ? 6 : 32} strokeDasharray="20 80" strokeDashoffset="-65" />
                            <circle r={cutout} cx="16" cy="16" fill="transparent" stroke={PALETTE[3]} strokeWidth={config.chart_type === 'doughnut' ? 6 : 32} strokeDasharray="15 85" strokeDashoffset="-85" />
                        </svg>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {['Grupo A (40%)','Grupo B (25%)','Grupo C (20%)','Grupo D (15%)'].map((l, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                                    <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: PALETTE[i], flexShrink: 0 }} />
                                    {l}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            case 'radar': {
                const N = 6;
                const cx = 70, cy = 60, R = 50;
                const angles = Array.from({length: N}, (_, i) => (i * 2 * Math.PI / N) - Math.PI/2);
                const vals = [0.8, 0.6, 0.9, 0.5, 0.75, 0.65];
                const pts = vals.map((v, i) => [cx + v*R*Math.cos(angles[i]), cy + v*R*Math.sin(angles[i])] as [number, number]);
                const outline = angles.map((a) => [cx + R*Math.cos(a), cy + R*Math.sin(a)] as [number, number]);
                return (
                    <svg viewBox={`0 0 140 120`} style={{ width: '100%', height: '70px' }}>
                        {[0.33, 0.66, 1].map(scale => (
                            <polygon key={scale} points={outline.map(([x,y]) => `${cx+(x-cx)*scale},${cy+(y-cy)*scale}`).join(' ')}
                                fill="none" stroke={config.color + '25'} strokeWidth="0.8" />
                        ))}
                        {outline.map(([x,y], i) => <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={config.color+'30'} strokeWidth="0.8" />)}
                        <polygon points={pts.map(([x,y]) => `${x},${y}`).join(' ')} fill={config.color+'25'} stroke={config.color} strokeWidth="1.5" />
                        {pts.map(([x,y], i) => <circle key={i} cx={x} cy={y} r="2" fill={config.color} />)}
                    </svg>
                );
            }
            case 'list': return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {['Elemento A', 'Elemento B', 'Elemento C'].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem' }}>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 700, minWidth: '14px' }}>{i+1}.</span>
                            <span style={{ color: 'var(--text)', flex: 1 }}>{item}</span>
                            <div style={{ height: '4px', width: `${80 - i*22}px`, borderRadius: '99px', background: config.color, opacity: 0.8 - i*0.15 }} />
                        </div>
                    ))}
                </div>
            );
            default: return null;
        }
    })();

    const chartIcon = CHART_TYPES.find(ct => ct.value === config.chart_type)?.icon;

    return (
        <div style={{
            borderRadius: '14px', padding: '16px',
            background: bg, border: `1.5px solid ${border}`,
            display: 'flex', flexDirection: 'column', gap: '10px',
            position: 'relative', overflow: 'hidden',
            boxShadow: `0 4px 20px ${config.color}12`,
        }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: config.color + '15', filter: 'blur(20px)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 1 }}>
                <span style={{ fontSize: '1.1rem' }}>{config.icon}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{config.title || 'Mi Widget'}</div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {CHART_TYPES.find(ct => ct.value === config.chart_type)?.label || config.chart_type}
                        {config.metric && config.metric !== 'count' ? ` · ${config.metric === 'sum' ? 'Suma' : 'Promedio'}` : ''}
                        {config.time_group ? ` por ${config.time_group}` : ''}
                    </div>
                </div>
                <div style={{ padding: '5px', borderRadius: '8px', background: config.color + '22', color: config.color, flexShrink: 0 }}>
                    {chartIcon && React.cloneElement(chartIcon as any, { size: 12 })}
                </div>
            </div>
            <div style={{ zIndex: 1 }}>{chartPreview}</div>
        </div>
    );
};

export const WidgetConfigWizard: React.FC<WidgetConfigWizardProps> = ({
    newWidget,
    setNewWidget,
    step,
    setStep,
    evaluating,
    viabilityError,
    filterValues,
    loadingFilterValues,
    showEmojiPicker,
    setShowEmojiPicker,
    handleNextStep,
    handleSaveWidget,
    savingCustom,
    CHART_TYPES,
    DATA_SOURCE_OPTIONS,
    GROUP_BY_OPTIONS,
    NEEDS_GROUP_BY,
    TIME_GROUP_SUPPORTS,
    SIZE_OPTIONS,
    EMOJI_OPTIONS,
    COLOR_OPTIONS,
    BLANK_WIDGET,
    STEP_LABELS
}) => {
    const { t } = useTranslation();

    const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px', margin = '0' }) => (
        <div style={{
            width, height, borderRadius, margin,
            background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--border) 50%, var(--bg-elevated) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear',
        }} />
    );

    return (
        <div className="create-tab-content" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step Progress */}
            <div id="tour-wizard-steps" style={{ display: 'flex', alignItems: 'center' }}>
                {STEP_LABELS.map((label, i) => {
                    const s = i + 1;
                    const isActive = step === s;
                    const isDone = step > s;
                    return (
                        <React.Fragment key={s}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flex: 1 }}>
                                <div style={{
                                    width: '30px', height: '30px', borderRadius: '50%',
                                    background: isDone ? '#10b981' : isActive ? 'linear-gradient(135deg, #1a1a1a, #0c0c0c)' : 'var(--bg-elevated)',
                                    color: (isActive || isDone) ? '#fff' : 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.72rem', fontWeight: 800,
                                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.4)' : 'none',
                                    border: `2px solid ${isDone ? '#10b981' : isActive ? 'var(--accent)' : 'var(--border)'}`,
                                    transition: 'all 0.25s ease',
                                }}>
                                    {isDone ? '✓' : s}
                                </div>
                                <span style={{ fontSize: '0.65rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--accent)' : isDone ? '#10b981' : 'var(--text-muted)' }}>
                                    {label}
                                </span>
                            </div>
                            {s < 4 && <div style={{ height: '2px', flex: 1, background: step > s ? '#10b981' : 'var(--border)', marginBottom: '18px', transition: 'all 0.3s ease' }} />}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Live Widget Preview */}
            <div id="tour-live-preview">
                <p style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                    Vista Previa
                </p>
                <WidgetPreview config={newWidget} CHART_TYPES={CHART_TYPES} />
            </div>

            {/* Step 1 */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                            Tipo de visualización
                        </p>
                        <div id="tour-chart-types" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            {CHART_TYPES.map(ct => {
                                const isSelected = newWidget.chart_type === ct.value;
                                return (
                                    <button key={ct.value} onClick={() => setNewWidget(prev => ({ ...prev, chart_type: ct.value as any }))} style={{
                                        padding: '12px 8px', borderRadius: '12px',
                                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                        background: isSelected ? 'var(--accent-alpha)' : 'var(--bg-elevated)',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                        transition: 'all 0.2s ease', boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                    }}>
                                        <div style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>{ct.icon}</div>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text)', textAlign: 'center' }}>{ct.label}</div>
                                        <div style={{ fontSize: '0.59rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>{ct.description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div id="tour-data-source">
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                            Fuente de datos
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {DATA_SOURCE_OPTIONS.map(o => {
                                const isSelected = newWidget.data_source === o.value;
                                return (
                                    <button key={o.value} onClick={() => setNewWidget(prev => ({ ...prev, data_source: o.value as any, group_by: '', filter_field: '', filter_value: '' }))} style={{
                                        padding: '10px 14px', borderRadius: '11px', border: 'none',
                                        background: isSelected ? 'var(--accent-alpha)' : 'var(--bg-elevated)',
                                        cursor: 'pointer', textAlign: 'left',
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        boxShadow: isSelected ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--border)',
                                        transition: 'all 0.2s ease',
                                    }}>
                                        <span style={{ fontSize: '1rem' }}>{o.icon}</span>
                                        <span style={{ fontSize: '0.84rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--accent)' : 'var(--text)', flex: 1 }}>{o.label}</span>
                                        {isSelected && <ChevronRight size={14} color="var(--accent)" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
                <div id="tour-step-2-config" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {NEEDS_GROUP_BY.includes(newWidget.chart_type) && (
                        <div>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                Agrupar por
                            </p>
                            <select value={newWidget.group_by} onChange={e => setNewWidget(prev => ({ ...prev, group_by: e.target.value }))} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
                                <option value="">Seleccionar campo...</option>
                                {GROUP_BY_OPTIONS[newWidget.data_source]?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                            Filtro <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                        </p>
                        <select value={newWidget.filter_field} onChange={e => setNewWidget(prev => ({ ...prev, filter_field: e.target.value, filter_value: '' }))} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
                            <option value="">Sin filtro</option>
                            {GROUP_BY_OPTIONS[newWidget.data_source]?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Dynamic filter value dropdown */}
                    {newWidget.filter_field && (
                        <div>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                Valor del filtro
                            </p>
                            {loadingFilterValues ? (
                                <Skeleton height="42px" borderRadius="12px" />
                            ) : (
                                <select
                                    value={newWidget.filter_value}
                                    onChange={e => setNewWidget(prev => ({ ...prev, filter_value: e.target.value }))}
                                    style={{
                                        width: '100%', padding: '11px 14px', borderRadius: '12px',
                                        border: `1.5px solid ${newWidget.filter_value ? 'var(--accent)' : 'var(--border)'}`,
                                        background: 'var(--bg-elevated)', color: 'var(--text)',
                                        fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
                                    }}
                                >
                                    <option value="">Cualquier valor</option>
                                    {filterValues.map(v => (
                                        <option key={v} value={v}>{v}</option>
                                    ))}
                                </select>
                            )}
                            {filterValues.length === 0 && !loadingFilterValues && newWidget.filter_field && (
                                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '6px', fontStyle: 'italic' }}>
                                    No se encontraron valores disponibles para este campo.
                                </p>
                            )}
                        </div>
                    )}

                    {viabilityError && (
                        <div style={{ padding: '13px 16px', background: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
                            {viabilityError}
                        </div>
                    )}
                </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div id="tour-metrics">
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Métrica</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '7px' }}>
                            {[
                                { value: 'count', label: 'Conteo', desc: 'N° de registros' },
                                { value: 'sum', label: 'Suma', desc: 'Sumar campo' },
                                { value: 'avg', label: 'Promedio', desc: 'Media de campo' },
                            ].map(m => {
                                const isSel = (newWidget.metric || 'count') === m.value;
                                return (
                                    <button key={m.value} onClick={() => setNewWidget(prev => ({ ...prev, metric: m.value as any }))} style={{
                                        padding: '10px 6px', borderRadius: '11px',
                                        border: `2px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                                        background: isSel ? 'var(--accent-alpha)' : 'var(--bg-elevated)',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', transition: 'all 0.2s',
                                    }}>
                                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: isSel ? 'var(--accent)' : 'var(--text)' }}>{m.label}</div>
                                        <div style={{ fontSize: '0.59rem', color: 'var(--text-muted)', textAlign: 'center' }}>{m.desc}</div>
                                    </button>
                                );
                            })}
                        </div>
                        {(newWidget.metric === 'sum' || newWidget.metric === 'avg') && (
                            <div style={{ marginTop: '10px' }}>
                                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Campo numérico a calcular (ej: valor, monto)</p>
                                <input
                                    value={newWidget.metric_field || ''}
                                    onChange={e => setNewWidget(prev => ({ ...prev, metric_field: e.target.value }))}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
                                    placeholder="Nombre del campo (ej: precio)"
                                />
                            </div>
                        )}
                    </div>

                    {TIME_GROUP_SUPPORTS.includes(newWidget.chart_type) && (
                        <div id="tour-time-grouping">
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Agrupar en el tiempo <span style={{ fontWeight: 400, textTransform: 'none' }}>(opcional)</span></p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '7px' }}>
                                {[
                                    { value: '', label: 'Desactivado' },
                                    { value: 'day', label: 'Por Día' },
                                    { value: 'week', label: 'Por Semana' },
                                    { value: 'month', label: 'Por Mes' },
                                ].map(tg => {
                                    const isSel = (newWidget.time_group || '') === tg.value;
                                    return (
                                        <button key={tg.value} onClick={() => setNewWidget(prev => ({ ...prev, time_group: tg.value as any }))} style={{
                                            padding: '8px 4px', borderRadius: '10px',
                                            border: `2px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                                            background: isSel ? 'var(--accent-alpha)' : 'var(--bg-elevated)',
                                            cursor: 'pointer', fontSize: '0.68rem', fontWeight: isSel ? 700 : 500,
                                            color: isSel ? 'var(--accent)' : 'var(--text-muted)', transition: 'all 0.2s', textAlign: 'center',
                                        }}>{tg.label}</button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div id="tour-advanced-settings" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Mostrar top</p>
                            <select value={newWidget.top_n || 10} onChange={e => setNewWidget(prev => ({ ...prev, top_n: Number(e.target.value) }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                                {[5, 8, 10, 15, 20, 50].map(n => <option key={n} value={n}>Top {n}</option>)}
                            </select>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Ordenar</p>
                            <select value={newWidget.sort_dir || 'desc'} onChange={e => setNewWidget(prev => ({ ...prev, sort_dir: e.target.value as any }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                                <option value="desc">Mayor primero</option>
                                <option value="asc">Menor primero</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                            Tamaño en pantalla
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            {SIZE_OPTIONS.map(o => {
                                const isSelected = (newWidget.size || 'full') === o.value;
                                return (
                                    <button key={o.value} onClick={() => setNewWidget(prev => ({ ...prev, size: o.value as any }))} style={{
                                        padding: '12px 8px', borderRadius: '12px',
                                        border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                        background: isSelected ? 'var(--accent-alpha)' : 'var(--bg-elevated)',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', transition: 'all 0.2s ease',
                                    }}>
                                        <div style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>{o.icon}</div>
                                        <div style={{ fontSize: '0.74rem', fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>{o.label}</div>
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{o.sub}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                            Nombre
                        </p>
                        <input
                            value={newWidget.title}
                            onChange={e => setNewWidget(prev => ({ ...prev, title: e.target.value }))}
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                            placeholder="Ej: Clientes por Estado"
                        />
                    </div>

                    <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                            Ícono y color
                        </p>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ padding: '12px', borderRadius: '12px', fontSize: '1.4rem', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', cursor: 'pointer', minWidth: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {newWidget.icon}
                            </button>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', flex: 1, paddingTop: '5px' }}>
                                {COLOR_OPTIONS.map(c => (
                                    <div key={c} onClick={() => setNewWidget(p => ({ ...p, color: c }))} style={{
                                        width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer',
                                        border: newWidget.color === c ? '3px solid white' : '2px solid transparent',
                                        outline: newWidget.color === c ? `2.5px solid ${c}` : 'none',
                                        transition: 'all 0.15s ease',
                                    }} />
                                ))}
                            </div>
                        </div>
                        {showEmojiPicker && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '12px', marginTop: '10px', border: '1px solid var(--border)' }}>
                                {EMOJI_OPTIONS.map(e => (
                                    <span key={e} onClick={() => { setNewWidget(p => ({ ...p, icon: e })); setShowEmojiPicker(false); }} style={{ fontSize: '1.3rem', cursor: 'pointer', padding: '5px', borderRadius: '8px' }}>
                                        {e}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Wizard Actions */}
            <div id="tour-step-actions" style={{ display: 'flex', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                {step > 1 && (
                    <button onClick={() => setStep(s => s - 1)} disabled={evaluating} style={{ padding: '11px 16px', borderRadius: '11px', background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <ChevronLeft size={16} />
                    </button>
                )}
                {step < 4 ? (
                    <button onClick={handleNextStep} disabled={evaluating || (step === 2 && NEEDS_GROUP_BY.includes(newWidget.chart_type) && !newWidget.group_by)} style={{
                        flex: 1, padding: '11px 20px', borderRadius: '11px',
                        background: 'linear-gradient(135deg, #1a1a1a, #0c0c0c)',
                        border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden'
                    }}>
                        {evaluating && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(255,255,255,0.2)',
                                animation: 'shimmer 1s infinite linear',
                                backgroundSize: '200% 100%',
                                backgroundImage: 'linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)'
                            }} />
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: evaluating ? 0.5 : 1 }}>
                            {evaluating ? 'Verificando...' : 'Siguiente'}
                            {!evaluating && <ChevronRight size={16} />}
                        </div>
                    </button>
                ) : (
                    <button onClick={handleSaveWidget} disabled={savingCustom || !newWidget.title.trim()} style={{
                        flex: 1, padding: '11px 20px', borderRadius: '11px',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                        opacity: savingCustom || !newWidget.title.trim() ? 0.6 : 1,
                    }}>
                        <Plus size={16} />
                        {savingCustom ? 'Creando...' : 'Crear Widget'}
                    </button>
                )}
            </div>
        </div>
    );
};
