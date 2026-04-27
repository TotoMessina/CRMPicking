import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Plus, Trash2, GripVertical, Save, RefreshCcw, 
    Palette, Settings2, Info, Shield, Layers, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { usePipelineStates } from '../hooks/usePipelineStates';
import { usePipelineSituations } from '../hooks/usePipelineSituations';

export default function PipelineSettings() {
    const { empresaActiva, role, roleName } = useAuth();
    const [activeTab, setActiveTab] = useState('states'); // 'states' | 'situations'

    // States logic
    const { states: initialStates, loading: statesLoading, refresh: refreshStates } = usePipelineStates(empresaActiva?.id);
    const [localStates, setLocalStates] = useState([]);
    
    // Situations logic
    const { situations: initialSituations, loading: situationsLoading, refresh: refreshSituations } = usePipelineSituations(empresaActiva?.id);
    const [localSituations, setLocalSituations] = useState([]);

    const [saving, setSaving] = useState(false);
    const isAdmin = role === 'super-admin' || roleName === 'admin' || role === 'admin';

    // Sync local state when hooks finish
    useEffect(() => {
        if (initialStates) setLocalStates([...initialStates]);
    }, [initialStates]);

    useEffect(() => {
        if (initialSituations) setLocalSituations([...initialSituations]);
    }, [initialSituations]);

    const activeItems = activeTab === 'states' ? localStates : localSituations;
    const setActiveItems = activeTab === 'states' ? setLocalStates : setLocalSituations;

    const handleAddItem = () => {
        const items = activeItems;
        const newOrder = items.length > 0 ? Math.max(...items.map(s => s.orden)) + 1 : 1;
        const newItem = {
            id: `temp-${Date.now()}`,
            label: activeTab === 'states' ? `Nueva Etapa ${newOrder}` : `Nueva Situación ${newOrder}`,
            color: activeTab === 'states' ? '#0c0c0c' : '#94a3b8',
            orden: newOrder,
            is_default: items.length === 0,
            estados_visibles: [],
            is_new: true
        };
        setActiveItems([...items, newItem]);
    };

    const handleUpdateItem = (id, field, value) => {
        setActiveItems(prev => prev.map(s => {
            if (s.id === id) {
                const updated = { ...s, [field]: value };
                return updated;
            }
            if (field === 'is_default' && value === true) {
                return { ...s, is_default: false };
            }
            return s;
        }));
    };

    const toggleStateVisibility = (itemId, stateLabel) => {
        setActiveItems(prev => prev.map(s => {
            if (s.id === itemId) {
                const visible = s.estados_visibles || [];
                const updated = visible.includes(stateLabel)
                    ? visible.filter(l => l !== stateLabel)
                    : [...visible, stateLabel];
                return { ...s, estados_visibles: updated };
            }
            return s;
        }));
    };

    const handleRemoveItem = async (id, db_id) => {
        if (!db_id) {
            setActiveItems(prev => prev.filter(s => s.id !== id));
            return;
        }

        const table = activeTab === 'states' ? 'empresa_pipeline_estados' : 'empresa_pipeline_situaciones';
        const itemLabel = activeItems.find(s => s.id === id).label;

        // Check if there are clients in this state/situation
        const queryField = activeTab === 'states' ? 'estado' : 'situacion';
        const { count } = await supabase
            .from('empresa_cliente')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaActiva.id)
            .eq(queryField, itemLabel);

        if (count > 0) {
            toast.error(`No podés borrar esto porque tiene ${count} clientes asociados.`);
            return;
        }

        const { error } = await supabase.from(table).delete().eq('id', db_id);
        if (error) {
            toast.error("Error al eliminar el registro");
        } else {
            toast.success("Eliminado correctamente");
            setActiveItems(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const items = Array.from(activeItems);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const updatedOrders = items.map((item, index) => ({
            ...item,
            orden: index + 1
        }));

        setActiveItems(updatedOrders);
    };

    const handleSave = async () => {
        if (!empresaActiva?.id) return;

        // VALIDACIÓN: Evitar nombres duplicados en la lista local antes de enviar
        const labels = activeItems.map(item => item.label?.trim().toLowerCase());
        const hasDuplicates = labels.some((label, index) => labels.indexOf(label) !== index);

        if (hasDuplicates) {
            toast.error("No podés tener dos elementos con el mismo nombre.");
            return;
        }

        setSaving(true);
        try {
            const table = activeTab === 'states' ? 'empresa_pipeline_estados' : 'empresa_pipeline_situaciones';
            const itemsToSave = activeItems;

            const toUpsert = itemsToSave.map(s => {
                const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
                let finalId = null;
                if (s.db_id && isUUID(s.db_id)) finalId = s.db_id;
                else if (s.id && isUUID(s.id)) finalId = s.id;
                
                if (!finalId) finalId = crypto.randomUUID();

                const row = {
                    id: finalId,
                    empresa_id: empresaActiva.id,
                    label: s.label?.trim(),
                    color: s.color,
                    orden: parseInt(s.orden) || 0,
                    is_default: !!s.is_default
                };

                if (activeTab === 'situations') {
                    row.estados_visibles = s.estados_visibles || [];
                }

                return row;
            });

            const { error } = await supabase.from(table).upsert(toUpsert, { onConflict: 'id' });
            if (error) throw error;

            toast.success("Configuración guardada");
            if (activeTab === 'states') refreshStates();
            else refreshSituations();
        } catch (err) {
            console.error("Error al guardar:", err);
            toast.error(err.message || "Fallo al guardar");
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <Shield size={64} className="muted" style={{ marginBottom: '20px' }} />
                <h2>Acceso Restringido</h2>
                <p className="muted">Solo los administradores pueden configurar el sistema.</p>
                <button onClick={() => window.history.back()} className="btn-link" style={{ marginTop: '20px' }}>VOLVER</button>
            </div>
        );
    }

    const isLoading = statesLoading || situationsLoading;

    return (
        <div className="container" style={{ maxWidth: '850px', margin: '24px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: 950, letterSpacing: '-0.03em', margin: 0 }}>
                        Ajustes de <span style={{ color: 'var(--accent)' }}>Workflow</span>
                    </h1>
                    <p className="muted" style={{ margin: '4px 0 0 0' }}>Gestioná las etapas y situaciones de tus clientes.</p>
                </div>
                <button 
                    onClick={() => activeTab === 'states' ? refreshStates() : refreshSituations()}
                    className="btn-icon"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', width: '44px', height: '44px', borderRadius: '12px' }}
                >
                    <RefreshCcw size={18} className={isLoading ? 'spin' : ''} />
                </button>
            </div>

            {/* TAB SELECTOR */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'var(--bg-elevated)', padding: '6px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <button 
                    onClick={() => setActiveTab('states')}
                    style={{ 
                        flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem',
                        background: activeTab === 'states' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'states' ? 'var(--accent)' : 'var(--text-muted)',
                        boxShadow: activeTab === 'states' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Layout size={18} /> Etapas del Pipeline
                </button>
                <button 
                    onClick={() => setActiveTab('situations')}
                    style={{ 
                        flex: 1, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem',
                        background: activeTab === 'situations' ? 'var(--bg-card)' : 'transparent',
                        color: activeTab === 'situations' ? 'var(--accent)' : 'var(--text-muted)',
                        boxShadow: activeTab === 'situations' ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Layers size={18} /> Situaciones (Tags)
                </button>
            </div>

            <div className="glass-card-pro" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', marginBottom: '24px' }}>
                    <Info size={20} style={{ color: 'var(--accent)' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, margin: 0 }}>
                        {activeTab === 'states' 
                            ? 'Ordená las etapas principales del tablero Kanban.' 
                            : 'Definí situaciones secundarias para segmentar clientes en estados avanzados.'}
                    </p>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="items-list">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <AnimatePresence mode="popLayout">
                                    {activeItems.map((item, index) => (
                                        <Draggable key={item.id} draggableId={String(item.id)} index={index}>
                                            {(provided, snapshot) => (
                                                <motion.div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        background: snapshot.isDragging ? 'var(--bg-elevated)' : 'var(--bg-card)',
                                                        border: snapshot.isDragging ? '2px solid var(--accent)' : '1px solid var(--border)',
                                                        borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px' }}>
                                                        <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
                                                            <GripVertical size={20} />
                                                        </div>

                                                        <div style={{ position: 'relative', width: '28px', height: '28px', borderRadius: '8px', background: item.color, cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                                                            <input type="color" value={item.color} onChange={(e) => handleUpdateItem(item.id, 'color', e.target.value)}
                                                                style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', border: 'none', cursor: 'pointer' }} />
                                                        </div>

                                                        <input type="text" value={item.label} onChange={(e) => handleUpdateItem(item.id, 'label', e.target.value)}
                                                            className="input" placeholder="Nombre..." style={{ flex: 1, height: '38px', fontSize: '0.9rem', fontWeight: 700, border: 'none', background: 'transparent' }} />

                                                        <button 
                                                            onClick={() => handleUpdateItem(item.id, 'is_default', !item.is_default)}
                                                            className={item.is_default ? 'pill-btn active' : 'pill-btn'}
                                                        >
                                                            {item.is_default ? 'DEFAULT' : 'SET DEFAULT'}
                                                        </button>

                                                        <button onClick={() => handleRemoveItem(item.id, item.db_id)} className="btn-icon" style={{ color: 'var(--danger)', border: 'none', background: 'transparent' }}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>

                                                    {activeTab === 'situations' && (
                                                        <div style={{ padding: '0 16px 12px 48px', borderTop: '1px solid var(--border-soft)', background: 'rgba(0,0,0,0.02)' }}>
                                                            <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                                Visible en las etapas: {(!item.estados_visibles || item.estados_visibles.length === 0) && <span style={{ color: 'var(--accent)' }}>(Todas)</span>}
                                                            </p>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {localStates.map(state => {
                                                                    const isSelected = (item.estados_visibles || []).includes(state.label);
                                                                    return (
                                                                        <button
                                                                            key={state.id}
                                                                            onClick={() => toggleStateVisibility(item.id, state.label)}
                                                                            style={{
                                                                                padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                                                                                border: '1px solid',
                                                                                background: isSelected ? `${state.color}20` : 'transparent',
                                                                                color: isSelected ? state.color : 'var(--text-muted)',
                                                                                borderColor: isSelected ? state.color : 'var(--border)'
                                                                            }}
                                                                        >
                                                                            {state.label}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </Draggable>
                                    ))}
                                </AnimatePresence>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                    <button onClick={handleAddItem} className="btn-link" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-active)', padding: '12px 24px', borderRadius: '14px', flex: 1, border: '1px dashed var(--border)', fontWeight: 700 }}>
                        <Plus size={20} /> AÑADIR NUEVO
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', borderRadius: '14px', minWidth: '150px' }}>
                        {saving ? <RefreshCcw size={18} className="spin" /> : <Save size={18} />} 
                        {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                    </button>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .pill-btn {
                    font-size: 0.65rem; border: 1px solid var(--border); background: transparent; padding: 4px 10px; border-radius: 20px; font-weight: 800; cursor: pointer; color: var(--text-muted);
                }
                .pill-btn.active {
                    background: var(--success); color: #fff; border-color: var(--success);
                }
            `}} />
        </div>
    );
}
