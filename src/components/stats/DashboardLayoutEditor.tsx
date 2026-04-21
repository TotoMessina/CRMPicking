import React, { useState, useRef, useEffect } from 'react';
import {
    X, GripVertical, Eye, EyeOff, RotateCcw, Save,
    Layout, BarChart2, PieChart, Hash, List,
    ChevronRight, Trash2, Sparkles, ChevronLeft
} from 'lucide-react';
import { WidgetLayout, DEFAULT_LAYOUT, getWidgetDef } from '../../constants/statsWidgets';
import { CustomWidgetConfig } from '../../hooks/useCustomWidgets';

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
    { value: 'empresa_cliente', label: 'Clientes (Locales)' },
    { value: 'repartidores', label: 'Repartidores' },
    { value: 'consumidores', label: 'Consumidores' },
    { value: 'actividades', label: 'Actividades / Historial' },
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
    { value: 'kpi', label: 'Número KPI', icon: <Hash size={18} /> },
    { value: 'bar', label: 'Barras', icon: <BarChart2 size={18} /> },
    { value: 'pie', label: 'Torta', icon: <PieChart size={18} /> },
    { value: 'list', label: 'Lista', icon: <List size={18} /> },
];

const COLOR_OPTIONS = ['#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b'];

const BLANK_WIDGET: CustomWidgetConfig = {
    title: '',
    icon: '📊',
    chart_type: 'kpi',
    data_source: 'empresa_cliente',
    group_by: '',
    filter_field: '',
    filter_value: '',
    color: '#6366f1',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const DashboardLayoutEditor: React.FC<Props> = ({
    layout, saving, onSave, onReset, onClose,
    customWidgets, savingCustom, onSaveCustom, onDeleteCustom, checkWidgetViability
}) => {
    const [activeTab, setActiveTab] = useState<'layout' | 'create'>('layout');
    const [draft, setDraft] = useState<WidgetLayout[]>([]);
    const [newWidget, setNewWidget] = useState<CustomWidgetConfig>({ ...BLANK_WIDGET, size: 'full' });
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [step, setStep] = useState(1);
    const [evaluating, setEvaluating] = useState(false);
    const [viabilityError, setViabilityError] = useState('');

    const dragIndex = useRef<number | null>(null);
    const [dragOver, setDragOver] = useState<number | null>(null);

    // Keep draft in sync with layout prop (important when new custom widgets are added/removed outside)
    useEffect(() => {
        setDraft([...layout].sort((a, b) => a.order - b.order));
    }, [layout]);

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
                setViabilityError('Los filtros no arrojan registros. Debes crear un widget con datos reales.');
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

    const handleUpdateSize = (id: string, size: 'full' | 'half' | 'third') => {
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
        return null; // Orphaned widget
    };

    const needsGroupBy = newWidget.chart_type !== 'kpi';
    const visibleCount = draft.filter(w => w.visible).length;

    // Styles
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '10px 14px', borderRadius: '10px',
        border: '1px solid var(--border)', background: 'var(--bg)',
        color: 'var(--text)', fontSize: '0.875rem', outline: 'none',
        boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '0.78rem', fontWeight: 700,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
        marginBottom: '6px',
    };

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease' }} />

            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 1001,
                width: 'min(480px, 100vw)', background: 'var(--bg)', borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', boxShadow: '-20px 0 60px rgba(0,0,0,0.25)',
                animation: 'slideInRight 0.25s cubic-bezier(0.16,1,0.3,1)',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)' }}>
                            <Layout size={20} color="#6366f1" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Personalizar Dashboard</h2>
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{visibleCount} widgets activos</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    {[{ key: 'layout', label: '🎛️ Mi Dashboard' }, { key: 'create', label: '✦ Crear Widget' }].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key as any); setStep(1); }}
                            style={{
                                flex: 1, padding: '14px', border: 'none', cursor: 'pointer',
                                background: activeTab === tab.key ? 'var(--bg)' : 'var(--bg-elevated)',
                                color: activeTab === tab.key ? '#6366f1' : 'var(--text-muted)',
                                fontWeight: activeTab === tab.key ? 700 : 500,
                                fontSize: '0.82rem',
                                borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'layout' ? (
                        <>
                            <div style={{ padding: '10px 20px', background: 'rgba(99,102,241,0.05)', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <GripVertical size={13} /> Arrastrá para reordenar
                            </div>
                            <div style={{ padding: '16px' }}>
                                {draft.map((widget, index) => {
                                    const def = getLocalDef(widget.id);
                                    if (!def) return null;
                                    const isCustom = !!customWidgets.find(w => w.id === widget.id);
                                    const isOver = dragOver === index;
                                    return (
                                        <div
                                            key={widget.id} draggable onDragStart={() => handleDragStart(index)}
                                            onDragEnter={() => handleDragEnter(index)} onDragOver={e => e.preventDefault()}
                                            onDrop={() => handleDrop(index)} onDragEnd={handleDragEnd}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', marginBottom: '6px',
                                                borderRadius: '12px', border: `1px solid ${isOver ? '#6366f1' : 'var(--border)'}`,
                                                background: isOver ? 'rgba(99,102,241,0.08)' : widget.visible ? 'var(--bg-elevated)' : 'rgba(0,0,0,0.02)',
                                                cursor: 'grab', opacity: widget.visible ? 1 : 0.45, transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <GripVertical size={15} color="var(--text-muted)" />
                                            <span style={{ fontSize: '1.1rem' }}>{def.icon}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{def.label}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{def.description}</div>
                                            </div>
                                            
                                            {isCustom ? (
                                                <select 
                                                    value={def.size || 'full'} 
                                                    onChange={(e) => handleUpdateSize(widget.id, e.target.value as any)}
                                                    style={{ fontSize: '0.65rem', padding: '2px 4px', borderRadius: '6px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', outline: 'none' }}
                                                >
                                                    <option value="full">1/1</option>
                                                    <option value="half">1/2</option>
                                                    <option value="third">1/3</option>
                                                </select>
                                            ) : (
                                                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', flexShrink: 0, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                                    {def.size === 'full' ? '1/1' : def.size === 'half' ? '1/2' : '1/3'}
                                                </span>
                                            )}

                                            <button onClick={() => toggleVisibility(widget.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: widget.visible ? '#10b981' : '#94a3b8' }}>
                                                {widget.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                                            </button>
                                            
                                            {isCustom && (
                                                <button onClick={() => onDeleteCustom(widget.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#ef4444', marginLeft: '-4px' }}>
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Layout Footer Actions - INSIDE scroll but at end */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                    <button onClick={handleReset} style={{ padding: '10px 14px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                                        <RotateCcw size={13} /> Restaurar
                                    </button>
                                    <button onClick={handleSaveLayout} disabled={saving} style={{ flex: 1, padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
                                        <Save size={15} /> {saving ? 'Guardando...' : 'Guardar Dashboard'}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ padding: '24px' }}>
                            {/* Wizard Steps */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                                {[1,2,3].map(s => (
                                    <div key={s} style={{ width: '24px', height: '24px', borderRadius: '50%', background: step >= s ? '#6366f1' : 'var(--bg-elevated)', color: step >= s ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{s}</div>
                                ))}
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                    {step === 1 ? 'Tipo' : step === 2 ? 'Datos' : 'Diseño'}
                                </span>
                            </div>

                            {step === 1 && (
                                <div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                                        {CHART_TYPES.map(ct => (
                                            <button key={ct.value} onClick={() => setNewWidget(prev => ({ ...prev, chart_type: ct.value as any }))} style={{ padding: '16px', borderRadius: '12px', border: `2px solid ${newWidget.chart_type === ct.value ? '#6366f1' : 'var(--border)'}`, background: newWidget.chart_type === ct.value ? 'rgba(99,102,241,0.05)' : 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                {ct.icon} {ct.label}
                                            </button>
                                        ))}
                                    </div>
                                    <label style={labelStyle}>Fuente de datos</label>
                                    <select value={newWidget.data_source} onChange={e => setNewWidget(prev => ({ ...prev, data_source: e.target.value as any, group_by: '' }))} style={inputStyle}>
                                        {DATA_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                            )}

                            {step === 2 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {needsGroupBy && (
                                        <div>
                                            <label style={labelStyle}>Agrupar por</label>
                                            <select value={newWidget.group_by} onChange={e => setNewWidget(prev => ({ ...prev, group_by: e.target.value }))} style={inputStyle}>
                                                <option value="">Seleccionar campo...</option>
                                                {GROUP_BY_OPTIONS[newWidget.data_source]?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label style={labelStyle}>Filtro (Opcional)</label>
                                        <select value={newWidget.filter_field} onChange={e => setNewWidget(prev => ({ ...prev, filter_field: e.target.value }))} style={inputStyle}>
                                            <option value="">Sin filtro</option>
                                            {GROUP_BY_OPTIONS[newWidget.data_source]?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                    </div>
                                    {newWidget.filter_field && <input value={newWidget.filter_value} onChange={e => setNewWidget(prev => ({ ...prev, filter_value: e.target.value }))} style={inputStyle} placeholder="Valor del filtro exacto..." />}

                                    {viabilityError && (
                                        <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                            {viabilityError}
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label style={labelStyle}>Tamaño en pantalla</label>
                                        <select value={newWidget.size || 'full'} onChange={e => setNewWidget(prev => ({ ...prev, size: e.target.value as any }))} style={inputStyle}>
                                            <option value="full">Ocupar toda la fila (1/1)</option>
                                            <option value="half">Ocupar la mitad (1/2)</option>
                                            <option value="third">Ocupar un tercio (1/3)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Nombre</label>
                                        <input value={newWidget.title} onChange={e => setNewWidget(prev => ({ ...prev, title: e.target.value }))} style={inputStyle} placeholder="Nombre del widget..." />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ ...inputStyle, width: 'auto' }}>{newWidget.icon} Cambiar ícono</button>
                                        <div style={{ flex: 1, display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {COLOR_OPTIONS.slice(0, 5).map(c => <div key={c} onClick={() => setNewWidget(p => ({ ...p, color: c }))} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, cursor: 'pointer', border: newWidget.color === c ? '2px solid white' : 'none', outline: newWidget.color === c ? `2px solid ${c}` : 'none' }} />)}
                                        </div>
                                    </div>
                                    {showEmojiPicker && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', background: 'var(--bg-elevated)', padding: '10px', borderRadius: '10px' }}>
                                            {EMOJI_OPTIONS.map(e => <span key={e} onClick={() => { setNewWidget(p => ({ ...p, icon: e })); setShowEmojiPicker(false); }} style={{ fontSize: '1.2rem', cursor: 'pointer', padding: '4px' }}>{e}</span>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Wizard Actions - Following content */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                {step > 1 && <button onClick={() => setStep(s => s - 1)} disabled={evaluating} style={{ padding: '10px 16px', borderRadius: '10px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer' }}><ChevronLeft size={16} /></button>}
                                {step < 3 ? (
                                    <button onClick={handleNextStep} disabled={evaluating || (step === 2 && needsGroupBy && !newWidget.group_by)} style={{ flex: 1, padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                                        {evaluating ? 'Comprobando datos...' : 'Siguiente'}
                                    </button>
                                ) : (
                                    <button onClick={handleSaveWidget} disabled={savingCustom || !newWidget.title.trim()} style={{ flex: 1, padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Crear Widget</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </>
    );
};
