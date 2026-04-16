import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, CheckSquare, Clock, User, Trash2, Edit2, X, GripVertical, Activity } from 'lucide-react';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { formatToLocal } from '../utils/dateUtils';

const COLUMNS = [
    { id: 'Pendiente', title: 'Pendientes', color: 'var(--text)' },
    { id: 'En Proceso', title: 'En Proceso', color: 'var(--accent)' },
    { id: 'Finalizado', title: 'Finalizados', color: '#10b981' }
];

export default function TableroTareas() {
    const { user, role, empresaActiva, isDemoMode } = useAuth();
    const isAdmin = role === 'Administrador';

    const [tasks, setTasks] = useState({
        'Pendiente': [],
        'En Proceso': [],
        'Finalizado': []
    });
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [form, setForm] = useState({
        titulo: '', descripcion: '', estado: 'Pendiente', asignado_a: [], fecha_vencimiento: '', checklist: []
    });
    const [newChecklistText, setNewChecklistText] = useState('');
    const [assigneeForNewItem, setAssigneeForNewItem] = useState([]); // Array of emails for the item being added
    const [editingItemId, setEditingItemId] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsuarios();
        fetchTasks();
    }, []);

    const fetchUsuarios = async () => {
        if (!empresaActiva) return;
        
        // Filtramos para obtener solo los usuarios vinculados a esta empresa
        const { data, error } = await supabase
            .from('empresa_usuario')
            .select('usuarios!inner(email, nombre)')
            .eq('empresa_id', empresaActiva.id);
            
        if (error) {
            console.error('Error cargando usuarios de la empresa:', error);
            return;
        }
        
        // Mapeamos el resultado del join para obtener la lista plana de usuarios
        const mappedUsers = (data || []).map(item => item.usuarios);
        setUsuarios(mappedUsers);
    };

    const fetchTasks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tareas_tablero')
            .select('*')
            .eq('empresa_id', empresaActiva?.id)
            .order('orden', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Error al cargar tareas');
        } else {
            const grouped = { 'Pendiente': [], 'En Proceso': [], 'Finalizado': [] };
            data?.forEach(t => {
                const estado = t.estado || 'Pendiente';
                if (grouped[estado]) grouped[estado].push(t);
            });
            setTasks(grouped);
        }
        setLoading(false);
    };

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceColUrl = source.droppableId;
        const destColUrl = destination.droppableId;
        const sourceTasks = Array.from(tasks[sourceColUrl]);
        const destTasks = sourceColUrl === destColUrl ? sourceTasks : Array.from(tasks[destColUrl]);

        const [movedTask] = sourceTasks.splice(source.index, 1);
        movedTask.estado = destColUrl;
        destTasks.splice(destination.index, 0, movedTask);

        const newTasks = { ...tasks, [sourceColUrl]: sourceTasks };
        if (sourceColUrl !== destColUrl) newTasks[destColUrl] = destTasks;

        // Update local state immediately for swift UX
        setTasks(newTasks);

        // Update sequence in DB
        const updates = destTasks.map((t, i) => ({
            id: t.id,
            estado: destColUrl,
            orden: i,
            titulo: t.titulo // required for bulk upsert if missing defaults
        }));

        try {
            for (let up of updates) {
                await supabase.from('tareas_tablero').update({ estado: up.estado, orden: up.orden }).eq('id', up.id);
            }
        } catch (e) {
            console.error(e);
            toast.error('Error guardando el orden');
            fetchTasks(); // revert on fail
        }
    };

    const openModal = (task = null) => {
        if (task) {
            setEditingTask(task);
            setForm({
                titulo: task.titulo,
                descripcion: task.descripcion || '',
                estado: task.estado,
                asignado_a: task.asignado_a ? task.asignado_a.split(',') : [],
                fecha_vencimiento: task.fecha_vencimiento || '',
                checklist: task.checklist || [] // [{ text, completed }]
            });
        } else {
            setEditingTask(null);
            setForm({ titulo: '', descripcion: '', estado: 'Pendiente', asignado_a: [], fecha_vencimiento: '', checklist: [] });
        }
        setNewChecklistText('');
        setAssigneeForNewItem([]);
        setEditingItemId(null);
        setIsModalOpen(true);
    };

    const saveTask = async (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = { ...form, empresa_id: empresaActiva?.id };

        // Fix for Postgres type validation (empty strings to null)
        if (!payload.fecha_vencimiento) payload.fecha_vencimiento = null;
        payload.asignado_a = payload.asignado_a && payload.asignado_a.length > 0 ? payload.asignado_a.join(',') : null;

        if (editingTask) {
            const { error } = await supabase.from('tareas_tablero').update(payload).eq('id', editingTask.id);
            if (error) {
                console.error('Error actualizando la tarea:', error);
                toast.error('Error actualizando la tarea');
            } else {
                toast.success('Tarea guardada');
            }
        } else {
            // New task goes to the end of Pendiente by default
            payload.orden = tasks['Pendiente'] ? tasks['Pendiente'].length : 0;
            const { error } = await supabase.from('tareas_tablero').insert([payload]);
            if (error) {
                console.error('Error creando tarea:', error);
                toast.error('Error creando tarea');
            } else {
                toast.success('Tarea creada');
            }
        }

        setSaving(false);
        setIsModalOpen(false);
        fetchTasks();
    };

    const deleteTask = async (id) => {
        if (!window.confirm('¿Eliminar esta tarea definitivamente?')) return;
        const { error } = await supabase.from('tareas_tablero').delete().eq('id', id);
        if (error) toast.error('Error eliminando tarea');
        else {
            toast.success('Tarea eliminada');
            fetchTasks();
        }
    };

    const addChecklistItem = () => {
        if (!newChecklistText.trim()) return;
        setForm(prev => ({
            ...prev,
            checklist: [...prev.checklist, { 
                id: Date.now().toString(), 
                text: newChecklistText.trim(), 
                completed: false,
                assigned_to: assigneeForNewItem || []
            }]
        }));
        setNewChecklistText('');
        setAssigneeForNewItem([]);
    };

    const updateChecklistItemAssignees = (itemId, email) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.map(i => {
                if (i.id !== itemId) return i;
                const current = i.assigned_to || [];
                const next = current.includes(email) 
                    ? current.filter(e => e !== email) 
                    : [...current, email];
                return { ...i, assigned_to: next };
            })
        }));
    };

    const toggleCheckitem = (itemId) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i)
        }));
    };

    const updateChecklistText = (itemId, newText) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.map(i => i.id === itemId ? { ...i, text: newText } : i)
        }));
    };

    const removeChecklist = (itemId) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.filter(i => i.id !== itemId)
        }));
    };

    const getProgress = (cl) => {
        if (!cl || cl.length === 0) return 0;
        return Math.round((cl.filter(i => i.completed).length / cl.length) * 100);
    };

    const getUserName = (email) => {
        const u = usuarios.find(x => x.email === email);
        return u ? u.nombre || u.email.split('@')[0] : email;
    };

    const getUserInitials = (email) => {
        const u = usuarios.find(x => x.email === email);
        if (!u) return email.substring(0, 2).toUpperCase();
        return u.nombre ? u.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : email.substring(0, 2).toUpperCase();
    };

    return (
        <div style={{ 
            padding: 'max(16px, 2vw)', 
            height: '100dvh', 
            display: 'flex', 
            flexDirection: 'column', 
            maxWidth: '1600px', 
            margin: '0 auto', 
            overflow: 'hidden',
            position: 'relative'
        }}>
            <style>{`
                .kanban-container::-webkit-scrollbar { height: 8px; }
                .kanban-container::-webkit-scrollbar-track { background: transparent; }
                .kanban-container::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
                .kanban-container::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
                
                .kanban-column {
                    flex: 1 1 320px;
                    min-width: 300px;
                    max-width: 450px;
                }

                @media (max-width: 1024px) {
                    .kanban-column {
                        flex: 0 0 320px;
                    }
                }

                @media (max-width: 768px) {
                    .kanban-container {
                        scroll-snap-type: x mandatory;
                        gap: 12px !important;
                        padding: 0 10px !important;
                    }
                    .kanban-column {
                        scroll-snap-align: center;
                        min-width: calc(100vw - 32px) !important;
                        max-width: calc(100vw - 32px) !important;
                        padding: 12px !important;
                    }
                    .task-modal-overlay {
                        padding: 0 !important;
                        background: var(--bg) !important;
                    }
                    .task-modal-content {
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 100% !important;
                        max-height: 100dvh !important;
                        border-radius: 0 !important;
                        border: none !important;
                        margin: 0 !important;
                    }
                    .task-form-container {
                        padding: 16px !important;
                        overflow-x: hidden !important;
                    }
                    .responsive-grid {
                        grid-template-columns: 1fr !important;
                    }
                    .subtask-input-row {
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    .subtask-assignees {
                        padding-left: 0 !important;
                        margin-top: 8px !important;
                    }
                }
                
                .progress-bar-container {
                    width: 100%;
                    height: 6px;
                    background: var(--bg);
                    border-radius: 10px;
                    overflow: hidden;
                    margin: 4px 0;
                    border: 1px solid var(--border);
                }
                .progress-bar-fill {
                    height: 100%;
                    background: var(--accent);
                    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>
            <header style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: '1 1 min-content' }}>
                    <h1 style={{ margin: 0, fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckSquare size={24} color="var(--accent)" />
                        Tablero de Tareas
                    </h1>
                    <p className="muted" style={{ margin: '4px 0 0 0', fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>Gestión ágil de actividades del equipo</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Button variant="secondary" onClick={fetchTasks} style={{ borderRadius: '12px' }}>
                        🔄 Refrescar
                    </Button>
                    <Button onClick={() => openModal()} style={{ borderRadius: '12px', boxShadow: 'var(--shadow-md)' }}>
                        <Plus size={18} style={{ marginRight: '6px' }} /> Nueva Tarea
                    </Button>
                </div>
            </header>

            {loading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="kanban-container" style={{
                        display: 'flex',
                        gap: '20px',
                        flex: 1,
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        paddingBottom: '20px',
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'var(--border) transparent',
                    }}>
                        {COLUMNS.map(col => (
                            <Droppable droppableId={col.id} key={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="kanban-column"
                                        style={{
                                            background: snapshot.isDraggingOver ? 'var(--bg-active)' : 'var(--bg-glass)',
                                            borderRadius: '20px',
                                            padding: '16px',
                                            border: '1px solid var(--border)',
                                            display: 'flex', flexDirection: 'column', gap: '16px',
                                            transition: 'all 0.3s ease',
                                            boxShadow: snapshot.isDraggingOver ? 'var(--shadow-lg)' : 'var(--shadow-sm)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '2px dashed var(--border)' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: col.color, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                                                {col.id === 'Pendiente' && <Clock size={18} />}
                                                {col.id === 'En Proceso' && <Activity size={18} />}
                                                {col.id === 'Finalizado' && <CheckSquare size={18} />}
                                                {col.title}
                                            </h3>
                                            <span style={{
                                                fontSize: '0.85rem', background: 'var(--bg-elevated)', color: 'var(--text)',
                                                padding: '4px 12px', borderRadius: '16px', fontWeight: 'bold', border: '1px solid var(--border)',
                                                boxShadow: 'var(--shadow-sm)'
                                            }}>
                                                {tasks[col.id].length}
                                            </span>
                                        </div>

                                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                                            {tasks[col.id].map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => openModal(task)}
                                                            className="bento-card" // Using existing styles for hover effects
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                background: 'var(--bg-elevated)',
                                                                padding: '16px',
                                                                borderRadius: '16px',
                                                                border: '1px solid var(--border)',
                                                                borderLeft: `4px solid ${col.color}`, // Colored left border indicator
                                                                cursor: 'grab',
                                                                display: 'flex', flexDirection: 'column',
                                                                gap: '12px',
                                                                boxShadow: snapshot.isDragging ? '0 15px 30px rgba(0,0,0,0.2)' : 'var(--shadow-sm)',
                                                                transform: snapshot.isDragging ? provided.draggableProps.style.transform + ' scale(1.05) rotate(3deg)' : provided.draggableProps.style.transform,
                                                                transition: snapshot.isDragging ? 'none' : 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                                                zIndex: snapshot.isDragging ? 99 : 1
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                                <strong style={{ fontSize: '1.05rem', lineHeight: '1.4', color: 'var(--text)' }}>{task.titulo}</strong>
                                                            </div>

                                                            {task.checklist?.length > 0 && (
                                                                <div className="progress-bar-container">
                                                                    <div className="progress-bar-fill" style={{ 
                                                                        width: `${getProgress(task.checklist)}%`,
                                                                        backgroundColor: getProgress(task.checklist) === 100 ? '#10b981' : 'var(--accent)'
                                                                    }} />
                                                                </div>
                                                            )}

                                                            {task.descripcion && (
                                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                    {task.descripcion}
                                                                </p>
                                                            )}

                                                            {task.checklist?.length > 0 && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                                                                    <div style={{
                                                                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem',
                                                                        background: getProgress(task.checklist) === 100 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg)',
                                                                        border: '1px solid', borderColor: getProgress(task.checklist) === 100 ? '#10b981' : 'var(--border)',
                                                                        padding: '4px 8px', borderRadius: '8px', width: 'fit-content', fontWeight: 600
                                                                    }}>
                                                                        <CheckSquare size={12} color={getProgress(task.checklist) === 100 ? '#10b981' : 'var(--text-muted)'} />
                                                                        <span style={{ color: getProgress(task.checklist) === 100 ? '#10b981' : 'var(--text-muted)' }}>
                                                                            {task.checklist.filter(i => i.completed).length}/{task.checklist.length}
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    {/* Subtask Assignees */}
                                                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                        {[...new Set(task.checklist.flatMap(i => i.assigned_to || []))].slice(0, 3).map((email, idx) => (
                                                                            <div key={email} title={`Subtarea: ${getUserName(email)}`} style={{
                                                                                width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold',
                                                                                boxShadow: 'var(--shadow-xs)', border: '1px solid var(--border)',
                                                                                marginLeft: idx > 0 ? '-6px' : '0px', zIndex: 5 - idx
                                                                            }}>
                                                                                {getUserInitials(email)}
                                                                            </div>
                                                                        ))}
                                                                        {[...new Set(task.checklist.flatMap(i => i.assigned_to || []))].length > 3 && (
                                                                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '4px' }}>+</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                    {task.asignado_a ? task.asignado_a.split(',').map((email, idx) => (
                                                                        <div key={email} title={getUserName(email)} style={{
                                                                            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: '#fff',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold',
                                                                            boxShadow: 'var(--shadow-sm)', border: '2px solid var(--bg-elevated)',
                                                                            marginLeft: idx > 0 ? '-8px' : '0px', zIndex: 10 - idx
                                                                        }}>
                                                                            {getUserName(email).substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                    )) : <div />}
                                                                </div>

                                                                {task.fecha_vencimiento && (
                                                                    <div style={{
                                                                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600,
                                                                        color: new Date(task.fecha_vencimiento) < new Date() && task.estado !== 'Finalizado' ? '#ef4444' : 'var(--text-muted)',
                                                                        background: new Date(task.fecha_vencimiento) < new Date() && task.estado !== 'Finalizado' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg)',
                                                                        padding: '4px 8px', borderRadius: '12px'
                                                                    }}>
                                                                        <Clock size={12} /> {formatToLocal(task.fecha_vencimiento)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        ))}
                    </div>
                </DragDropContext>
            )}

            {/* Modal Tarea - FIXED POSITIONING */}
            {isModalOpen && (
                <div className="task-modal-overlay" style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999, // Ensure it's on top of everything
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="task-modal-content" style={{
                        background: 'var(--bg-elevated)',
                        width: '95%',
                        maxWidth: '700px',
                        borderRadius: '24px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        maxHeight: '90vh',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', borderRadius: '20px 20px 0 0' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {editingTask ? <Edit2 size={24} color="var(--accent)" /> : <Plus size={24} color="var(--accent)" />}
                                {editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--border)' }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="task-form-container" style={{ overflowY: 'auto', padding: '24px' }}>
                            <form id="task-form" onSubmit={saveTask}>
                                <div className="field" style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text)' }}>Título de la tarea *</label>
                                    <input required type="text" className="input" style={{ width: '100%', padding: '12px', fontSize: '1rem', borderRadius: '12px' }} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Realizar inventario del mes" />
                                </div>

                                <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                    <div className="field">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}><Activity size={16} /> Estado</label>
                                        <select className="input" style={{ width: '100%', padding: '10px', borderRadius: '10px' }} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="En Proceso">En Proceso</option>
                                            <option value="Finalizado">Finalizado</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}><User size={16} /> Asignados ({form.asignado_a.length})</label>
                                        <div style={{
                                            background: 'var(--bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)',
                                            maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px'
                                        }}>
                                            {usuarios.map(u => (
                                                <label key={u.email} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text)' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={form.asignado_a.includes(u.email)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setForm({ ...form, asignado_a: [...form.asignado_a, u.email] });
                                                            } else {
                                                                setForm({ ...form, asignado_a: form.asignado_a.filter(email => email !== u.email) });
                                                            }
                                                        }}
                                                        style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                                                    />
                                                    {u.nombre || u.email.split('@')[0]}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="field">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.9rem' }}><Clock size={16} /> Vencimiento</label>
                                        <input type="date" className="input" style={{ width: '100%', padding: '10px', borderRadius: '10px' }} value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} />
                                    </div>
                                </div>

                                <div className="field" style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text)' }}>Descripción</label>
                                    <textarea className="input" style={{ width: '100%', minHeight: '120px', resize: 'vertical', padding: '12px', borderRadius: '12px', lineHeight: '1.5' }} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Agrega notas, links o detalles extra sobre la tarea..." />
                                </div>

                                <div className="field" style={{ background: 'var(--bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', fontWeight: 600, color: 'var(--text)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <CheckSquare size={18} color="var(--accent)" /> Subtareas (Checklist)
                                        </span>
                                        {form.checklist.length > 0 && (
                                            <span style={{ fontSize: '0.85rem', background: getProgress(form.checklist) === 100 ? '#10b981' : 'var(--bg-elevated)', color: getProgress(form.checklist) === 100 ? '#fff' : 'var(--text)', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold' }}>
                                                {getProgress(form.checklist)}% completado
                                            </span>
                                        )}
                                    </label>

                                    {form.checklist.length > 0 && (
                                        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {form.checklist.map(item => (
                                                <div key={item.id} style={{
                                                    display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-elevated)',
                                                    padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
                                                    opacity: item.completed ? 0.7 : 1, transition: 'all 0.2s'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                            <input type="checkbox" checked={item.completed} onChange={() => toggleCheckitem(item.id)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
                                                        </div>
                                                        
                                                        {editingItemId === item.id ? (
                                                            <input 
                                                                type="text" 
                                                                className="input" 
                                                                autoFocus
                                                                style={{ flex: 1, padding: '6px 12px', fontSize: '0.95rem', background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '8px' }}
                                                                value={item.text} 
                                                                onChange={e => updateChecklistText(item.id, e.target.value)}
                                                                onBlur={() => setEditingItemId(null)}
                                                                onKeyDown={e => { if (e.key === 'Enter') setEditingItemId(null); }}
                                                            />
                                                        ) : (
                                                            <span 
                                                                style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text)', fontSize: '0.95rem', fontWeight: 500, cursor: 'text' }}
                                                                onClick={() => setEditingItemId(item.id)}
                                                            >
                                                                {item.text}
                                                            </span>
                                                        )}

                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button 
                                                                type="button" 
                                                                title="Editar texto"
                                                                onClick={() => setEditingItemId(editingItemId === item.id ? null : item.id)} 
                                                                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeChecklist(item.id)} 
                                                                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="subtask-assignees" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '32px' }}>
                                                        {usuarios.map(u => (
                                                            <button
                                                                key={u.email}
                                                                type="button"
                                                                onClick={() => updateChecklistItemAssignees(item.id, u.email)}
                                                                style={{
                                                                    fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px',
                                                                    background: (item.assigned_to || []).includes(u.email) ? 'var(--accent)' : 'var(--bg)',
                                                                    color: (item.assigned_to || []).includes(u.email) ? '#fff' : 'var(--text-muted)',
                                                                    border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {u.nombre || u.email.split('@')[0]}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div className="subtask-input-row" style={{ display: 'flex', gap: '10px' }}>
                                            <input
                                                type="text"
                                                className="input"
                                                style={{ 
                                                    flex: 1, 
                                                    padding: '12px 16px', 
                                                    fontSize: '1rem', 
                                                    borderRadius: '12px',
                                                    background: 'var(--bg-elevated)', 
                                                    border: '1px solid var(--border)' 
                                                }}
                                                placeholder="Escribe el nombre de la subtarea..."
                                                value={newChecklistText}
                                                onChange={e => setNewChecklistText(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                                            />
                                            <Button type="button" variant="secondary" onClick={addChecklistItem}>Fijar Subtarea</Button>
                                        </div>
                                        
                                        <div className="subtask-assignees" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Asignar a:</span>
                                            {usuarios.map(u => (
                                                <button
                                                    key={u.email}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = assigneeForNewItem || [];
                                                        setAssigneeForNewItem(current.includes(u.email) ? current.filter(e => e !== u.email) : [...current, u.email]);
                                                    }}
                                                    style={{
                                                        fontSize: '0.75rem', padding: '4px 10px', borderRadius: '12px',
                                                        background: (assigneeForNewItem || []).includes(u.email) ? 'var(--accent)' : 'var(--bg)',
                                                        color: (assigneeForNewItem || []).includes(u.email) ? '#fff' : 'var(--text-muted)',
                                                        border: '1px solid var(--border)', cursor: 'pointer'
                                                    }}
                                                >
                                                    {u.nombre || u.email.split('@')[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Modal Footer - STICKY ON MOBILE IF NEEDED */}
                        <div style={{ 
                            padding: '16px 24px', 
                            borderTop: '1px solid var(--border)', 
                            background: 'var(--bg-glass)', 
                            display: 'flex', 
                            flexWrap: 'wrap',
                            gap: '12px',
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginTop: 'auto'
                        }}>
                            <div>
                                {editingTask && !isDemoMode && (
                                    <button type="button" onClick={() => deleteTask(editingTask.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, padding: '10px 16px', borderRadius: '12px', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}>
                                        <Trash2 size={18} /> Eliminar Tarea
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving} style={{ borderRadius: '12px' }}>Cancelar</Button>
                                <Button type="submit" form="task-form" disabled={saving} style={{ borderRadius: '12px', padding: '0 24px' }}>{saving ? 'Guardando...' : 'Guardar Tarea'}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
