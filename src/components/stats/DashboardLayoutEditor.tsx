import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Joyride, STATUS, Step } from 'react-joyride';
import {
    X, GripVertical, Eye, EyeOff, RotateCcw, Save,
    Layout, BarChart2, PieChart, Hash, List, Activity,
    Trash2, Sparkles, ChevronLeft, ChevronRight, Plus,
    Columns, Square, LayoutGrid, TrendingUp, AlignLeft,
    Donut, Radio, HelpCircle
} from 'lucide-react';
import { WidgetLayout, DEFAULT_LAYOUT, getWidgetDef } from '../../constants/statsWidgets';
import { CustomWidgetConfig } from '../../hooks/useCustomWidgets';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    layout: WidgetLayout[];
    saving: boolean;
    onSave: (layout: WidgetLayout[]) => Promise<void>;
    onReset: () => Promise<void>;
    onClose: () => void;
    customWidgets: CustomWidgetConfig[];
    savingCustom: boolean;
    onSaveCustom: (config: CustomWidgetConfig) => Promise<boolean>;
    onDeleteCustom: (id: string) => void;
    checkWidgetViability: (config: CustomWidgetConfig) => Promise<boolean>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJI_OPTIONS = ['📊','📈','📉','💡','🔍','🎯','🏆','⚡','🔮','🛡️','🗺️','💼','📋','🏷️','🚚','🛒','⭐','📍','🔥','💰'];

const DATA_SOURCE_OPTIONS = [
    { value: 'empresa_cliente', label: 'Clientes (Locales)', icon: '🏪' },
    { value: 'repartidores', label: 'Repartidores', icon: '🚚' },
    { value: 'consumidores', label: 'Consumidores', icon: '🛒' },
    { value: 'actividades', label: 'Actividades / Historial', icon: '📋' },
];

const GROUP_BY_OPTIONS: Record<string, { value: string; label: string }[]> = {
    empresa_cliente: [
        { value: 'estado', label: 'Estado' },
        { value: 'rubro', label: 'Rubro' },
        { value: 'situacion', label: 'Situación' },
        { value: 'responsable', label: 'Responsable' },
        { value: 'creado_por', label: 'Creado por' },
    ],
    repartidores: [
        { value: 'estado', label: 'Estado' },
        { value: 'responsable', label: 'Responsable' },
        { value: 'localidad', label: 'Localidad' },
    ],
    consumidores: [
        { value: 'localidad', label: 'Localidad' },
    ],
    actividades: [
        { value: 'descripcion', label: 'Tipo de Actividad' },
        { value: 'usuario', label: 'Usuario' },
    ],
};

const CHART_TYPES = [
    { value: 'kpi',          label: 'KPI',              description: 'Número grande destacado',    icon: <Hash size={18} /> },
    { value: 'bar',          label: 'Barras',           description: 'Columnas verticales',         icon: <BarChart2 size={18} /> },
    { value: 'bar_horizontal',label:'Barras Horiz.',    description: 'Columnas horizontales',       icon: <AlignLeft size={18} /> },
    { value: 'line',         label: 'Línea',            description: 'Tendencia en el tiempo',      icon: <Activity size={18} /> },
    { value: 'area',         label: 'Área',             description: 'Línea con área rellena',      icon: <TrendingUp size={18} /> },
    { value: 'pie',          label: 'Torta',            description: 'Proporciones circulares',     icon: <PieChart size={18} /> },
    { value: 'doughnut',     label: 'Dona',             description: 'Torta con hueco central',     icon: <Donut size={18} /> },
    { value: 'radar',        label: 'Radar',            description: 'Múltiples dimensiones',       icon: <Radio size={18} /> },
    { value: 'list',         label: 'Lista',            description: 'Ranking con barras',          icon: <List size={18} /> },
];

const SIZE_OPTIONS = [
    { value: 'full', label: 'Completo', sub: '12 cols', icon: <Square size={14} /> },
    { value: 'half', label: 'Mitad', sub: '6 cols', icon: <Columns size={14} /> },
    { value: 'third', label: 'Tercio', sub: '4 cols', icon: <LayoutGrid size={14} /> },
];

const COLOR_OPTIONS = ['#0c0c0c','#10b981','#f59e0b','#ef4444','#3b82f6','#1a1a1a','#ec4899','#14b8a6','#f97316','#64748b'];

const BLANK_WIDGET: CustomWidgetConfig = {
    title: '',
    icon: '📊',
    chart_type: 'kpi',
    data_source: 'empresa_cliente',
    group_by: '',
    filter_field: '',
    filter_value: '',
    color: '#0c0c0c',
    metric: 'count',
    top_n: 10,
    sort_dir: 'desc',
};

const STEP_LABELS = ['Tipo', 'Datos', 'Avanzado', 'Diseño'];
const TIME_GROUP_SUPPORTS = ['line', 'area', 'bar'];
const NEEDS_GROUP_BY = ['bar', 'bar_horizontal', 'pie', 'doughnut', 'radar', 'list'];

const BAR_HEIGHTS = [40, 80, 60, 95, 50, 75, 35, 65];

// ─── Widget Preview (live fake visualization) ─────────────────────────────────

const WidgetPreview: React.FC<{ config: CustomWidgetConfig }> = ({ config }) => {
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

// ─── Main Component ───────────────────────────────────────────────────────────

export const DashboardLayoutEditor: React.FC<Props> = ({
    layout, saving, onSave, onReset, onClose,
    customWidgets, savingCustom, onSaveCustom, onDeleteCustom, checkWidgetViability
}) => {
    const { empresaActiva }: any = useAuth();
    const [activeTab, setActiveTab] = useState<'layout' | 'create'>('layout');
    const [draft, setDraft] = useState<WidgetLayout[]>([]);
    const [newWidget, setNewWidget] = useState<CustomWidgetConfig>({ ...BLANK_WIDGET, size: 'full' });
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [step, setStep] = useState(1);
    const [evaluating, setEvaluating] = useState(false);
    const [viabilityError, setViabilityError] = useState('');
    const [filterValues, setFilterValues] = useState<string[]>([]);
    const [loadingFilterValues, setLoadingFilterValues] = useState(false);
    const [runTour, setRunTour] = useState(false);
    const [tourKey, setTourKey] = useState(0);

    // ── Tour Configuration ──
    // ── Tour Configuration (Context-Aware) ──
    const tourSteps: Step[] = React.useMemo(() => {
        if (activeTab === 'layout') {
            return [
                {
                    target: '#tour-tabs',
                    content: 'Bienvenido al editor. Aquí puedes alternar entre organizar tu dashboard o crear nuevos widgets personalizados.',
                    placement: 'bottom',
                    disableBeacon: true,
                },
                {
                    target: '#tour-layout-list',
                    content: 'En esta lista puedes ver todos tus widgets. Arrastra desde el borde izquierdo para cambiar el orden.',
                    placement: 'auto',
                },
                {
                    target: '.tour-size-select',
                    content: 'Ajusta el tamaño de cada widget: 1/1 para ancho completo, 1/2 o 1/3 para columnas.',
                    placement: 'auto',
                },
                {
                    target: '.tour-visibility-toggle',
                    content: 'Usa el ojo para ocultar widgets del dashboard sin eliminarlos.',
                    placement: 'auto',
                },
                {
                    target: '#tour-layout-actions',
                    content: '¡No olvides guardar cuando termines de organizar!',
                    placement: 'top',
                }
            ];
        }

        if (step === 1) {
            return [
                {
                    target: '#tour-chart-types',
                    content: 'Primero elige cómo quieres ver los datos. Tenemos desde simples números (KPI) hasta gráficos de Radar y Área.',
                    placement: 'top',
                    disableBeacon: true,
                },
                {
                    target: '#tour-data-source',
                    content: (
                        <div>
                            <p style={{ margin: '0 0 10px', fontWeight: 700 }}>¿De dónde vienen los datos?</p>
                            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                <li><b>Clientes:</b> Rubros, estados y geografía.</li>
                                <li><b>Actividades:</b> Formularios y reportes de campo.</li>
                                <li><b>Repartidores:</b> Rendimiento y logística.</li>
                                <li><b>Consumidores:</b> Datos de usuarios finales.</li>
                            </ul>
                        </div>
                    ) as any,
                    placement: 'top',
                },
                {
                    target: '#tour-step-actions',
                    content: 'Dale a "Siguiente" para configurar cómo se dividen o filtran estos datos.',
                    placement: 'top',
                }
            ];
        }

        if (step === 2) {
            return [
                {
                    target: '#tour-step-2-config',
                    content: 'Aquí aplicas la lógica de agrupación. Por ejemplo: ver "Clientes" agrupados por "Rubro".',
                    placement: 'top',
                    disableBeacon: true,
                },
                {
                    target: '#tour-step-actions',
                    content: 'También puedes aplicar filtros para que el gráfico solo muestre una ciudad o un estado específico.',
                    placement: 'top',
                }
            ];
        }

        if (step === 3) {
            return [
                {
                    target: '#tour-metrics',
                    content: 'Elige si quieres "Contar" registros o realizar cálculos de "Suma" o "Promedio" sobre algún campo numérico.',
                    placement: 'top',
                    disableBeacon: true,
                },
                {
                    target: '#tour-time-grouping',
                    content: 'En gráficos de Línea o Área, puedes ver la evolución histórica agrupando por Día, Semana o Mes.',
                    placement: 'top',
                },
                {
                    target: '#tour-advanced-settings',
                    content: 'Finalmente, podés limitar a los "Top N" resultados más importantes y elegir el orden.',
                    placement: 'top',
                }
            ];
        }

        return [];
    }, [activeTab, step]);

    const handleJoyrideCallback = (data: any) => {
        const { status, index, action } = data;
        
        // Prefetching logic based on tour step
        if (action === 'next' || action === 'prev' || action === 'start') {
            const currentStep = tourSteps[index];
            if (currentStep?.target === '#tour-data-source' && newWidget.data_source) {
                // If the user is reading about data sources, pre-fetch fields for step 2
                prefetchFilterValues(newWidget.data_source);
            }
        }

        if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
            setRunTour(false);
        }
    };

    const prefetchFilterValues = async (source: string) => {
        if (!empresaActiva?.id) return;
        const fields = GROUP_BY_OPTIONS[source] || [];
        if (fields.length === 0) return;
        
        // Predictively fetch values for the first field
        const firstField = fields[0].value;
        try {
            const { data } = await supabase
                .from(source)
                .select(firstField)
                .eq('empresa_id', empresaActiva.id)
                .limit(20); // Small sample for prefetch
            
            if (data) {
                const unique = [...new Set(data.map((row: any) => row[firstField]).filter(Boolean))].sort() as string[];
                setFilterValues(unique);
            }
        } catch (e) { /* silent fail for prefetch */ }
    };

    const dragIndex = useRef<number | null>(null);
    const [dragOver, setDragOver] = useState<number | null>(null);

    useEffect(() => {
        setDraft([...layout].sort((a, b) => a.order - b.order));
    }, [layout]);

    // ── Fetch distinct values for the selected filter field ──────────────────
    useEffect(() => {
        if (!newWidget.filter_field || !empresaActiva?.id) {
            setFilterValues([]);
            return;
        }

        const fetchValues = async () => {
            setLoadingFilterValues(true);
            try {
                const { data, error } = await supabase
                    .from(newWidget.data_source)
                    .select(newWidget.filter_field!)
                    .eq('empresa_id', empresaActiva.id);

                if (!error && data) {
                    const unique = [...new Set(
                        data.map((row: any) => row[newWidget.filter_field!]).filter(Boolean)
                    )].sort() as string[];
                    setFilterValues(unique);
                }
            } catch (err) {
                setFilterValues([]);
            } finally {
                setLoadingFilterValues(false);
            }
        };
        fetchValues();
    }, [newWidget.filter_field, newWidget.data_source, empresaActiva?.id]);

    const handleDragStart = (index: number) => { dragIndex.current = index; };
    const handleDragEnter = (index: number) => {
        if (dragIndex.current === null || dragIndex.current === index) return;
        setDragOver(index);
    };
    const handleDrop = (dropIndex: number) => {
        if (dragIndex.current === null || dragIndex.current === dropIndex) return;
        const reordered = [...draft];
        const [moved] = reordered.splice(dragIndex.current, 1);
        reordered.splice(dropIndex, 0, moved);
        setDraft(reordered.map((w, i) => ({ ...w, order: i })));
        dragIndex.current = null;
        setDragOver(null);
    };
    const handleDragEnd = () => { dragIndex.current = null; setDragOver(null); };
    const toggleVisibility = (id: string) => setDraft(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));

    const handleSaveLayout = async () => { await onSave(draft); onClose(); };
    const handleReset = async () => { setDraft([...DEFAULT_LAYOUT]); await onReset(); onClose(); };

    const handleNextStep = async () => {
        if (step === 2) {
            setEvaluating(true);
            setViabilityError('');
            const isViable = await checkWidgetViability(newWidget);
            setEvaluating(false);
            if (!isViable) {
                setViabilityError('Los filtros aplicados no devuelven registros. Revisá las opciones seleccionadas.');
                return;
            }
        }
        setStep(s => s + 1);
    };

    const handleSaveWidget = async () => {
        if (!newWidget.title.trim()) return;
        const ok = await onSaveCustom(newWidget);
        if (ok) {
            setNewWidget({ ...BLANK_WIDGET, size: 'full' });
            setStep(1);
            setActiveTab('layout');
        }
    };

    // ── UI Components ──
    const Skeleton = ({ width = '100%', height = '20px', borderRadius = '8px', margin = '0' }) => (
        <div style={{
            width, height, borderRadius, margin,
            background: 'linear-gradient(90deg, var(--bg-elevated) 25%, var(--border) 50%, var(--bg-elevated) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear',
        }} />
    );

    const handleUpdateSize = (id: string, size: 'full' | 'half' | 'third') => {
        setDraft(prev => prev.map(w => w.id === id ? { ...w, size } : w));
        const cw = customWidgets.find(w => w.id === id);
        if (cw) onSaveCustom({ ...cw, size });
    };

    const getLocalDef = (id: string) => {
        const defaultDef = getWidgetDef(id);
        if (defaultDef) return defaultDef;
        const customObj = customWidgets.find(w => w.id === id);
        if (customObj) {
            return {
                id: customObj.id!, label: customObj.title,
                description: `Personalizado · ${CHART_TYPES.find(t => t.value === customObj.chart_type)?.label}`,
                icon: customObj.icon, defaultOrder: 0, defaultVisible: true, size: customObj.size || 'full'
            } as any;
        }
        return null;
    };

    const needsGroupBy = NEEDS_GROUP_BY.includes(newWidget.chart_type);
    const visibleCount = draft.filter(w => w.visible).length;
    const totalCount = draft.length;

    // ── Size span helper ────────────────────────────────────────────────────
    const sizeToSpan = (size?: string) => size === 'third' ? 4 : size === 'half' ? 6 : 12;
    const sizeLabel = (size?: string) => size === 'third' ? '1/3' : size === 'half' ? '1/2' : '1/1';

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(6px)',
                    animation: 'fadeIn 0.25s ease'
                }}
            />

            {/* Guided Tutorial Overlay via React Joyride */}
            <Joyride
                key={tourKey}
                steps={tourSteps}
                run={runTour}
                continuous={true}
                onEvent={handleJoyrideCallback}
                options={{
                    primaryColor: 'var(--accent, #0c0c0c)',
                    textColor: '#000',
                    backgroundColor: '#ffffff',
                    overlayColor: 'rgba(0, 0, 0, 0.65)',
                    arrowColor: '#ffffff',
                    zIndex: 10000,
                    spotlightRadius: 18,
                    showProgress: true,
                    buttons: ['back', 'primary', 'skip'],
                }}
                styles={{
                    tooltip: {
                        borderRadius: '20px',
                        padding: '16px',
                        backgroundColor: '#ffffff',
                        border: '2px solid var(--accent, #0c0c0c)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                        textAlign: 'left',
                        fontFamily: "'Outfit', sans-serif",
                    },
                    tooltipContainer: {
                        padding: '5px',
                    },
                    buttonPrimary: {
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        backgroundColor: 'var(--accent, #0c0c0c)',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                    },
                    buttonBack: {
                        marginRight: '12px',
                        color: 'var(--accent, #0c0c0c)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                    },
                    buttonSkip: {
                        color: 'var(--text-muted, #64748b)',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                    },
                    spotlight: {}
                }}

                locale={{ back: 'Atrás', close: 'Cerrar', last: 'Finalizar', next: 'Siguiente', skip: 'Saltar Tour' }}
            />

            {/* Panel */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
                width: 'min(520px, 100vw)',
                background: 'var(--bg)',
                borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                boxShadow: '-24px 0 80px rgba(0,0,0,0.3)',
                animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)',
            }}>

                {/* ── Header ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 22px',
                    background: 'var(--accent-alpha)',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            padding: '10px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, #1a1a1a, #0c0c0c)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                        }}>
                            <Layout size={18} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                                Personalizar Dashboard
                            </h2>
                            <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {visibleCount} de {totalCount} widgets visibles
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => { 
                                setTourKey(prev => prev + 1);
                                setRunTour(true); 
                            }}
                            style={{
                                background: 'transparent', border: 'none',
                                cursor: 'pointer', color: 'var(--text-muted)', borderRadius: '10px',
                                width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'color 0.2s',
                            }}
                            title="¿Cómo funciona?"
                        >
                            <HelpCircle size={18} />
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'var(--accent-alpha)', border: '1px solid var(--border)',
                                cursor: 'pointer', color: 'var(--accent)', borderRadius: '10px',
                                width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div id="tour-tabs" style={{
                    display: 'flex', gap: '6px', padding: '12px 14px',
                    background: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                }}>
                    {[{ key: 'layout', label: 'Mi Dashboard', icon: '🎛️' }, { key: 'create', label: 'Crear Widget', icon: '✦' }].map(tab => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                className={tab.key === 'create' ? 'tour-tab-create' : ''}
                                onClick={() => { setActiveTab(tab.key as any); setStep(1); }}
                                style={{
                                    flex: 1, padding: '10px 14px', border: 'none', cursor: 'pointer',
                                    borderRadius: '11px',
                                    background: isActive ? 'linear-gradient(135deg, #1a1a1a, #0c0c0c)' : 'transparent',
                                    color: isActive ? '#fff' : 'var(--text-muted)',
                                    fontWeight: isActive ? 700 : 500,
                                    fontSize: '0.82rem',
                                    transition: 'all 0.2s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                                    boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none',
                                }}
                            >
                                <span>{tab.icon}</span> {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Content ── */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                    {/* ════════════════ LAYOUT TAB ════════════════ */}
                    {activeTab === 'layout' && (
                        <>
                            {/* ── PREMIUM GRID PREVIEW ── */}
                            <div style={{
                                padding: '18px 18px 14px',
                                background: 'var(--accent-alpha)',
                                borderBottom: '1px solid var(--border)',
                                flexShrink: 0,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                        <Sparkles size={13} color="var(--accent)" />
                                        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            Vista Previa
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>{visibleCount} activos</span>
                                </div>

                                {/* Styled grid — each row is a group of columns */}
                                <div style={{
                                    background: 'var(--bg)', borderRadius: '14px',
                                    padding: '10px', border: '1px solid var(--border)',
                                    display: 'flex', flexDirection: 'column', gap: '5px',
                                    maxHeight: '170px', overflowY: 'auto',
                                }}>
                                    {/* Render row by row, grouping widgets that share a row by 12 col capacity */}
                                    {(() => {
                                        const visible = draft.filter(w => w.visible);
                                        const rows: WidgetLayout[][] = [];
                                        let currentRow: WidgetLayout[] = [];
                                        let usedCols = 0;

                                        for (const w of visible) {
                                            const def = getLocalDef(w.id);
                                            if (!def) continue;
                                            const span = sizeToSpan(w.size || def.size);
                                            if (usedCols + span > 12) {
                                                rows.push(currentRow);
                                                currentRow = [w];
                                                usedCols = span;
                                            } else {
                                                currentRow.push(w);
                                                usedCols += span;
                                            }
                                        }
                                        if (currentRow.length > 0) rows.push(currentRow);

                                        if (rows.length === 0) return (
                                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                No hay widgets visibles
                                            </div>
                                        );

                                        return rows.map((row, ri) => (
                                            <div key={ri} style={{ display: 'flex', gap: '5px' }}>
                                                {row.map(w => {
                                                    const def = getLocalDef(w.id);
                                                    if (!def) return null;
                                                    const span = sizeToSpan(w.size || def.size);
                                                    const flex = span / 12;
                                                    return (
                                                        <div key={w.id} title={def.label} style={{
                                                            flex, height: '36px',
                                                            borderRadius: '9px',
                                                            background: 'var(--accent-alpha)',
                                                            border: '1px solid var(--border)',
                                                            display: 'flex', alignItems: 'center',
                                                            gap: '6px', padding: '0 10px',
                                                            overflow: 'hidden', position: 'relative',
                                                        }}>
                                                            <span style={{ fontSize: '0.75rem', flexShrink: 0 }}>{def.icon}</span>
                                                            {span >= 6 && (
                                                                <span style={{
                                                                    fontSize: '0.62rem', fontWeight: 600,
                                                                    color: 'var(--accent)', opacity: 0.85,
                                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                }}>
                                                                    {def.label}
                                                                </span>
                                                            )}
                                                            <span style={{
                                                                marginLeft: 'auto', fontSize: '0.55rem',
                                                                background: 'var(--accent-alpha)',
                                                                color: 'var(--accent)', fontWeight: 700,
                                                                padding: '2px 5px', borderRadius: '99px', flexShrink: 0,
                                                            }}>
                                                                {sizeLabel(w.size || def.size)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>

                            {/* Drag hint */}
                            <div style={{
                                padding: '7px 18px', fontSize: '0.7rem', color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', gap: '7px',
                                background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', flexShrink: 0,
                            }}>
                                <GripVertical size={11} /> Arrastrá para reordenar
                            </div>

                            {/* Widget list */}
                            <div id="tour-layout-list" style={{ padding: '12px', flexGrow: 1 }}>
                                {draft.map((widget, index) => {
                                    const def = getLocalDef(widget.id);
                                    if (!def) return null;
                                    const isCustom = !!customWidgets.find(w => w.id === widget.id);
                                    const isOver = dragOver === index;
                                    return (
                                        <div
                                            key={widget.id} draggable
                                            onDragStart={() => handleDragStart(index)}
                                            onDragEnter={() => handleDragEnter(index)}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={() => handleDrop(index)}
                                            onDragEnd={handleDragEnd}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '9px',
                                                padding: '10px 12px', marginBottom: '5px',
                                                borderRadius: '13px',
                                                border: `1.5px solid ${isOver ? 'var(--accent)' : widget.visible ? 'var(--border)' : 'transparent'}`,
                                                background: isOver ? 'var(--accent-alpha)' : widget.visible ? 'var(--bg-elevated)' : 'rgba(0,0,0,0.02)',
                                                cursor: 'grab', opacity: widget.visible ? 1 : 0.38,
                                                transition: 'all 0.15s ease',
                                                boxShadow: widget.visible ? '0 1px 3px rgba(0,0,0,0.04)' : 'none',
                                            }}
                                        >
                                            <GripVertical size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{def.icon}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.82rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {def.label}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                                    {def.description}
                                                </div>
                                            </div>

                                            <select
                                                className="tour-size-select"
                                                value={widget.size || def.size || 'full'}
                                                onChange={e => handleUpdateSize(widget.id, e.target.value as any)}
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    fontSize: '0.66rem', padding: '4px 6px', borderRadius: '8px',
                                                    background: 'var(--accent-alpha)', border: '1px solid var(--border)',
                                                    color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', outline: 'none', flexShrink: 0,
                                                }}
                                            >
                                                <option value="full">1/1</option>
                                                <option value="half">1/2</option>
                                                <option value="third">1/3</option>
                                            </select>

                                            <button className="tour-visibility-toggle" onClick={() => toggleVisibility(widget.id)} style={{
                                                background: widget.visible ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                                                border: `1px solid ${widget.visible ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.2)'}`,
                                                cursor: 'pointer', borderRadius: '8px', padding: '5px',
                                                display: 'flex', alignItems: 'center',
                                                color: widget.visible ? '#10b981' : '#94a3b8', transition: 'all 0.15s', flexShrink: 0,
                                            }}>
                                                {widget.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                                            </button>

                                            {isCustom && (
                                                <button onClick={() => onDeleteCustom(widget.id)} style={{
                                                    background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                                                    cursor: 'pointer', borderRadius: '8px', padding: '5px',
                                                    display: 'flex', alignItems: 'center',
                                                    color: '#ef4444', transition: 'all 0.15s', flexShrink: 0,
                                                }}>
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Actions */}
                                <div id="tour-layout-actions" style={{ display: 'flex', gap: '10px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
                                    <button onClick={handleReset} style={{
                                        padding: '10px 14px', borderRadius: '11px', background: 'transparent',
                                        border: '1.5px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer',
                                        fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px',
                                    }}>
                                        <RotateCcw size={13} /> Restaurar
                                    </button>
                                    <button onClick={handleSaveLayout} disabled={saving} style={{
                                        flex: 1, padding: '10px 18px', borderRadius: '11px',
                                        background: 'linear-gradient(135deg, #1a1a1a, #0c0c0c)',
                                        border: 'none', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                                        fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.35)', opacity: saving ? 0.7 : 1,
                                    }}>
                                        <Save size={14} /> {saving ? 'Guardando...' : 'Guardar Dashboard'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ════════════════ CREATE TAB ════════════════ */}
                    {activeTab === 'create' && (
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

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
                                <WidgetPreview config={newWidget} />
                            </div>

                            {/* ── Step 1 ── */}
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

                            {/* ── Step 2 ── */}
                            {step === 2 && (
                                <div id="tour-step-2-config" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {NEEDS_GROUP_BY.includes(newWidget.chart_type) && (
                                        <div>
                                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                                Agrupar por
                                            </p>
                                            <select value={newWidget.group_by} onChange={e => setNewWidget(prev => ({ ...prev, group_by: e.target.value }))} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
                                                <option value="">Seleccionar campo...</option>
                                                {GROUP_BY_OPTIONS[newWidget.data_source]?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                                            Filtro <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                                        </p>
                                        <select value={newWidget.filter_field} onChange={e => setNewWidget(prev => ({ ...prev, filter_field: e.target.value, filter_value: '' }))} style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}>
                                            <option value="">Sin filtro</option>
                                            {GROUP_BY_OPTIONS[newWidget.data_source]?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>

                                    {/* ── Dynamic filter value dropdown ── */}
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

                            {/* Step 3: Advanced options */}
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

                            {/* ── Step 4 (Design) ── */}
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
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .step-transition { animation: stepIn 0.3s ease-out; }
                @keyframes stepIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
                @media (max-width: 600px) {
                    [data-panel="layout-editor"] { width: 100vw !important; border-left: none !important; }
                }
            `}</style>
        </>
    );
};
