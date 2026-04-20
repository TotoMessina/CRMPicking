import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Plus, Trash2, GripVertical, Save, RefreshCcw, 
    ChevronLeft, Palette, Settings2, Info, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';
import { usePipelineStates } from '../../hooks/usePipelineStates';

export default function PipelineSettings() {
    const { empresaActiva, role, roleName } = useAuth();
    const { states: initialStates, loading: hookLoading, error: hookError, refresh } = usePipelineStates(empresaActiva?.id);
    
    const [localStates, setLocalStates] = useState([]);
    const [saving, setSaving] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState(null);

    // Sync local state when hook finishes
    useEffect(() => {
        if (initialStates && initialStates.length > 0) {
            setLocalStates([...initialStates]);
        }
    }, [initialStates]);

    const isAdmin = role === 'super-admin' || roleName === 'admin' || role === 'admin';

    const handleAddState = () => {
        const newOrder = localStates.length > 0 ? Math.max(...localStates.map(s => s.orden)) + 1 : 1;
        const newState = {
            id: `temp-${Date.now()}`,
            label: `Nuevo Estado ${newOrder}`,
            color: '#8b5cf6',
            orden: newOrder,
            is_default: localStates.length === 0,
            is_new: true
        };
        setLocalStates([...localStates, newState]);
    };

    const handleUpdateState = (id, field, value) => {
        setLocalStates(prev => prev.map(s => {
            if (s.id === id) {
                const updated = { ...s, [field]: value };
                if (field === 'is_default' && value === true) {
                    // Solo un default a la vez
                    return updated;
                }
                return updated;
            }
            if (field === 'is_default' && value === true) {
                return { ...s, is_default: false };
            }
            return s;
        }));
    };

    const handleRemoveState = async (id, db_id) => {
        if (!db_id) {
            setLocalStates(prev => prev.filter(s => s.id !== id));
            return;
        }

        // Check if there are clients in this state
        const { count, error: countError } = await supabase
            .from('empresa_cliente')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaActiva.id)
            .eq('estado', localStates.find(s => s.id === id).label);

        if (count > 0) {
            toast.error(`No podés borrar este estado porque tiene ${count} clientes asignados.`);
            return;
        }

        const { error } = await supabase.from('empresa_pipeline_estados').delete().eq('id', db_id);
        if (error) {
            toast.error("Error al eliminar el estado");
        } else {
            toast.success("Estado eliminado");
            setLocalStates(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleDragEnd = (result) => {
        if (!result.destination) return;
        
        const items = Array.from(localStates);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update orders
        const updatedOrders = items.map((item, index) => ({
            ...item,
            orden: index + 1
        }));

        setLocalStates(updatedOrders);
    };

    const handleSave = async () => {
        if (!empresaActiva?.id) return;
        setSaving(true);
        try {
            // Separar inserts de updates
            const toUpsert = localStates.map(s => ({
                id: s.db_id || undefined, // undefined genera nuevo UUID en supabase si no existe
                empresa_id: empresaActiva.id,
                label: s.label,
                color: s.color,
                orden: s.orden,
                is_default: s.is_default
            }));

            const { error } = await supabase
                .from('empresa_pipeline_estados')
                .upsert(toUpsert, { onConflict: 'id' });

            if (error) throw error;

            toast.success("Pipeline actualizado correctamente");
            refresh();
        } catch (err) {
            console.error(err);
            toast.error("Fallo al guardar la configuración");
        } finally {
            setSaving(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
                <Shield size={64} className="muted" style={{ marginBottom: '20px' }} />
                <h2>Acceso Restringido</h2>
                <p className="muted">Solo los administradores pueden configurar las etapas del pipeline.</p>
                <button onClick={() => window.history.back()} className="btn-link" style={{ marginTop: '20px' }}>VOLVER</button>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '24px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>
                        Configuración de <span style={{ color: 'var(--accent)' }}>Pipeline</span>
                    </h1>
                    <p className="muted" style={{ margin: '4px 0 0 0' }}>Personalizá las etapas de venta de tu empresa.</p>
                </div>
                <button 
                    onClick={refresh}
                    className="btn-icon"
                    title="Recargar"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', width: '44px', height: '44px', borderRadius: '12px' }}
                >
                    <RefreshCcw size={18} className={hookLoading ? 'spin' : ''} />
                </button>
            </div>

            <div className="glass-card-pro" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--accent-soft)', borderRadius: '12px', marginBottom: '24px' }}>
                    <Info size={20} style={{ color: 'var(--accent)' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, margin: 0 }}>
                        Cambiá el orden arrastrando las etapas. El estado marcado como **Default** será el inicial para nuevos clientes.
                    </p>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="states-list">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <AnimatePresence>
                                    {localStates.map((state, index) => (
                                        <Draggable key={state.id} draggableId={String(state.id)} index={index}>
                                            {(provided, snapshot) => (
                                                <motion.div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        background: snapshot.isDragging ? 'var(--bg-elevated)' : 'var(--bg-card)',
                                                        border: snapshot.isDragging ? '2px solid var(--accent)' : '1px solid var(--border)',
                                                        borderRadius: '16px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '16px',
                                                        padding: '12px 16px',
                                                        boxShadow: snapshot.isDragging ? '0 10px 25px rgba(0,0,0,0.1)' : 'none'
                                                    }}
                                                >
                                                    <div {...provided.dragHandleProps} style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
                                                        <GripVertical size={20} />
                                                    </div>

                                                    <div style={{ position: 'relative', width: '32px', height: '32px', borderRadius: '8px', background: state.color, border: 'none', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                                                        <input 
                                                            type="color" 
                                                            value={state.color} 
                                                            onChange={(e) => handleUpdateState(state.id, 'color', e.target.value)}
                                                            style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', border: 'none', cursor: 'pointer' }}
                                                        />
                                                    </div>

                                                    <input 
                                                        type="text" 
                                                        value={state.label}
                                                        onChange={(e) => handleUpdateState(state.id, 'label', e.target.value)}
                                                        className="input"
                                                        placeholder="Nombre de la etapa..."
                                                        style={{ flex: 1, height: '40px', fontSize: '0.9rem', fontWeight: 700, borderRadius: '8px', background: 'transparent', border: '1px solid transparent' }}
                                                    />

                                                    <button 
                                                        onClick={() => handleUpdateState(state.id, 'is_default', !state.is_default)}
                                                        className={state.is_default ? 'premium-pill-btn active' : 'premium-pill-btn'}
                                                        style={{ 
                                                            fontSize: '0.65rem', 
                                                            padding: '4px 10px', 
                                                            background: state.is_default ? 'var(--success)' : 'transparent',
                                                            borderColor: state.is_default ? 'var(--success)' : 'var(--border)',
                                                            color: state.is_default ? '#fff' : 'var(--text-muted)'
                                                        }}
                                                    >
                                                        {state.is_default ? 'DEFAULT' : 'SET DEFAULT'}
                                                    </button>

                                                    <button 
                                                        onClick={() => handleRemoveState(state.id, state.db_id)}
                                                        className="btn-icon"
                                                        style={{ color: 'var(--danger)', padding: '8px', background: 'transparent', border: 'none' }}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
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
                    <button 
                        onClick={handleAddState}
                        className="btn-link"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-active)', padding: '12px 24px', borderRadius: '14px', flex: 1, border: '1px dashed var(--border)', fontWeight: 700 }}
                    >
                        <Plus size={20} /> AÑADIR NUEVA ETAPA
                    </button>
                    
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', borderRadius: '14px', minWidth: '150px' }}
                    >
                        {saving ? <RefreshCcw size={18} className="spin" /> : <Save size={18} />} 
                        {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                    </button>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .premium-pill-btn {
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    font-weight: 800;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .premium-pill-btn.active {
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
                }
            `}} />
        </div>
    );
}
