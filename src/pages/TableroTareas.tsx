import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, CheckSquare, Clock, User, Trash2, Edit2, X, Activity } from 'lucide-react';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { formatToLocal } from '../utils/dateUtils';

const COLUMNS = [
    { id: 'Pendiente', title: 'Pendientes', color: 'var(--text)' },
    { id: 'En Proceso', title: 'En Proceso', color: 'var(--accent)' },
    { id: 'Finalizado', title: 'Finalizados', color: '#10b981' }
];

interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    assigned_to?: string[];
}

interface Task {
    id: string;
    titulo: string;
    descripcion?: string;
    estado: string;
    asignado_a?: string; // Comma separated emails
    fecha_vencimiento?: string;
    checklist?: ChecklistItem[];
    orden: number;
    empresa_id?: string;
    created_at?: string;
}

/**
 * Tasks Kanban Board Page
 */
export default function TableroTareas() {
    const { user, userName, empresaActiva, role, isDemoMode } = useAuth();

    const [tasks, setTasks] = useState<Record<string, Task[]>>({
        'Pendiente': [],
        'En Proceso': [],
        'Finalizado': []
    });
    const [usuarios, setUsuarios] = useState<{email: string, nombre?: string}[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [form, setForm] = useState<{
        titulo: string;
        descripcion: string;
        estado: string;
        asignado_a: string[];
        fecha_vencimiento: string;
        checklist: ChecklistItem[];
    }>({
        titulo: '', descripcion: '', estado: 'Pendiente', asignado_a: [], fecha_vencimiento: '', checklist: []
    });
    const [newChecklistText, setNewChecklistText] = useState('');
    const [assigneeForNewItem, setAssigneeForNewItem] = useState<string[]>([]); 
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsuarios();
        fetchTasks();
    }, [empresaActiva]);

    const fetchUsuarios = async () => {
        if (!empresaActiva) return;
        
        const { data, error } = await supabase
            .from('empresa_usuario')
            .select('usuarios!inner(email, nombre)')
            .eq('empresa_id', empresaActiva.id);
            
        if (error) {
            console.error('Error cargando usuarios de la empresa:', error);
            return;
        }
        
        const mappedUsers = (data || []).map((item: any) => item.usuarios);
        setUsuarios(mappedUsers);
    };

    const fetchTasks = async () => {
        if (!empresaActiva) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('tareas_tablero')
            .select('*')
            .eq('empresa_id', empresaActiva.id)
            .order('orden', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Error al cargar tareas');
        } else {
            const grouped: Record<string, Task[]> = { 'Pendiente': [], 'En Proceso': [], 'Finalizado': [] };
            const rawData = data as any[] || [];
            rawData.forEach(t => {
                const estado = t.estado || 'Pendiente';
                if (grouped[estado]) {
                    grouped[estado].push(t as Task);
                }
            });
            setTasks(grouped);
        }
        setLoading(false);
    };

    const onDragEnd = async (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;
        const sourceTasks = Array.from(tasks[sourceCol]);
        const destTasks = sourceCol === destCol ? sourceTasks : Array.from(tasks[destCol]);

        const [movedTask] = sourceTasks.splice(source.index, 1);
        movedTask.estado = destCol;
        destTasks.splice(destination.index, 0, movedTask);

        const newTasks = { ...tasks, [sourceCol]: sourceTasks };
        if (sourceCol !== destCol) newTasks[destCol] = destTasks;

        setTasks(newTasks);

        const updates = destTasks.map((t, i) => ({
            id: t.id,
            estado: destCol,
            orden: i
        }));

        try {
            for (let up of updates) {
                await supabase.from('tareas_tablero').update({ estado: up.estado, orden: up.orden } as any).eq('id', up.id);
            }
        } catch (e) {
            console.error(e);
            toast.error('Error guardando el orden');
            fetchTasks(); 
        }
    };

    const openModal = (task: Task | null = null) => {
        if (task) {
            setEditingTask(task);
            setForm({
                titulo: task.titulo,
                descripcion: task.descripcion || '',
                estado: task.estado,
                asignado_a: task.asignado_a ? task.asignado_a.split(',') : [],
                fecha_vencimiento: task.fecha_vencimiento || '',
                checklist: task.checklist || [] 
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

    const saveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const payload: any = { 
            titulo: form.titulo,
            descripcion: form.descripcion,
            estado: form.estado,
            fecha_vencimiento: form.fecha_vencimiento || null,
            checklist: form.checklist,
            empresa_id: empresaActiva?.id,
            asignado_a: form.asignado_a && form.asignado_a.length > 0 ? form.asignado_a.join(',') : null
        };

        if (editingTask) {
            const { error } = await supabase.from('tareas_tablero').update(payload).eq('id', editingTask.id);
            if (error) {
                console.error('Error actualizando la tarea:', error);
                toast.error('Error actualizando la tarea');
            } else {
                toast.success('Tarea guardada');
            }
        } else {
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

    const deleteTask = async (id: string) => {
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

    const updateChecklistItemAssignees = (itemId: string, email: string) => {
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

    const toggleCheckitem = (itemId: string) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i)
        }));
    };

    const updateChecklistText = (itemId: string, newText: string) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.map(i => i.id === itemId ? { ...i, text: newText } : i)
        }));
    };

    const removeChecklist = (itemId: string) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.filter(i => i.id !== itemId)
        }));
    };

    const getProgress = (cl: ChecklistItem[] | undefined) => {
        if (!cl || cl.length === 0) return 0;
        return Math.round((cl.filter(i => i.completed).length / cl.length) * 100);
    };

    const getUserName = (email: string) => {
        const u = usuarios.find(x => x.email === email);
        return u ? u.nombre || u.email.split('@')[0] : email;
    };

    const getUserInitials = (email: string) => {
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
                .kanban-column { flex: 1 1 320px; min-width: 300px; max-width: 450px; }
                @media (max-width: 1024px) { .kanban-column { flex: 0 0 320px; } }
                @media (max-width: 768px) {
                    .kanban-container { scroll-snap-type: x mandatory; gap: 12px !important; padding: 0 10px !important; }
                    .kanban-column { scroll-snap-align: center; min-width: calc(100vw - 32px) !important; max-width: calc(100vw - 32px) !important; padding: 12px !important; }
                    .task-modal-content { width: 100% !important; max-width: 100% !important; height: 100% !important; max-height: 100dvh !important; border-radius: 0 !important; }
                }
                .progress-bar-container { width: 100%; height: 6px; background: var(--bg); border-radius: 10px; overflow: hidden; margin: 4px 0; border: 1px solid var(--border); }
                .progress-bar-fill { height: 100%; background: var(--accent); transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
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
                    <Button variant="secondary" onClick={fetchTasks} style={{ borderRadius: '12px' }}>🔄 Refrescar</Button>
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
                    <div className="kanban-container" style={{ display: 'flex', gap: '20px', flex: 1, overflowX: 'auto', overflowY: 'hidden', paddingBottom: '20px' }}>
                        {COLUMNS.map(col => (
                            <Droppable droppableId={col.id} key={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className="kanban-column"
                                        style={{
                                            background: snapshot.isDraggingOver ? 'var(--bg-active)' : 'var(--bg-glass)',
                                            borderRadius: '20px', padding: '16px', border: '1px solid var(--border)',
                                            display: 'flex', flexDirection: 'column', gap: '16px', transition: 'all 0.3s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '2px dashed var(--border)' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: col.color, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                                                {col.id === 'Pendiente' && <Clock size={18} />}
                                                {col.id === 'En Proceso' && <Activity size={18} />}
                                                {col.id === 'Finalizado' && <CheckSquare size={18} />}
                                                {col.title}
                                            </h3>
                                            <span style={{ fontSize: '0.85rem', background: 'var(--bg-elevated)', color: 'var(--text)', padding: '4px 12px', borderRadius: '16px', fontWeight: 'bold', border: '1px solid var(--border)' }}>
                                                {tasks[col.id]?.length || 0}
                                            </span>
                                        </div>

                                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
                                            {(tasks[col.id] || []).map((task, index) => (
                                                <Draggable key={task.id} draggableId={task.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => openModal(task)}
                                                            className="bento-card" 
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)',
                                                                borderLeft: `4px solid ${col.color}`, cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '12px',
                                                                boxShadow: snapshot.isDragging ? '0 15px 30px rgba(0,0,0,0.2)' : 'var(--shadow-sm)',
                                                                transition: snapshot.isDragging ? 'none' : 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)', zIndex: snapshot.isDragging ? 99 : 1
                                                            } as any}
                                                        >
                                                            <strong style={{ fontSize: '1.05rem', lineHeight: '1.4', color: 'var(--text)' }}>{task.titulo}</strong>

                                                            {task.checklist && task.checklist.length > 0 && (
                                                                <div className="progress-bar-container">
                                                                    <div className="progress-bar-fill" style={{ 
                                                                        width: `${getProgress(task.checklist)}%`,
                                                                        backgroundColor: getProgress(task.checklist) === 100 ? '#10b981' : 'var(--accent)'
                                                                    }} />
                                                                </div>
                                                            )}

                                                            {task.descripcion && (
                                                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.descripcion}</p>
                                                            )}

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                                    {task.asignado_a ? task.asignado_a.split(',').map((email, idx) => (
                                                                        <div key={email} title={getUserName(email)} style={{
                                                                            width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: '#fff',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold',
                                                                            boxShadow: 'var(--shadow-sm)', border: '2px solid var(--bg-elevated)', marginLeft: idx > 0 ? '-8px' : '0px', zIndex: 10 - idx
                                                                        }}>{getUserName(email).substring(0, 2).toUpperCase()}</div>
                                                                    )) : <div />}
                                                                </div>

                                                                {task.fecha_vencimiento && (
                                                                    <div style={{
                                                                        display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600,
                                                                        color: new Date(task.fecha_vencimiento) < new Date() && task.estado !== 'Finalizado' ? '#ef4444' : 'var(--text-muted)',
                                                                        background: new Date(task.fecha_vencimiento) < new Date() && task.estado !== 'Finalizado' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg)',
                                                                        padding: '4px 8px', borderRadius: '12px'
                                                                    }}><Clock size={12} /> {formatToLocal(task.fecha_vencimiento)}</div>
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

            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--bg-elevated)', width: '95%', maxWidth: '700px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', borderRadius: '20px 20px 0 0' }}>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {editingTask ? <Edit2 size={24} color="var(--accent)" /> : <Plus size={24} color="var(--accent)" />}
                                {editingTask ? 'Editar Tarea' : 'Crear Nueva Tarea'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <div style={{ overflowY: 'auto', padding: '24px' }}>
                            <form id="task-form" onSubmit={saveTask}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Título *</label>
                                    <input required type="text" className="input" style={{ width: '100%', padding: '12px', borderRadius: '12px' }} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}><Activity size={16} /> Estado</label>
                                        <select className="input" style={{ width: '100%', padding: '10px' }} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                                            <option value="Pendiente">Pendiente</option>
                                            <option value="En Proceso">En Proceso</option>
                                            <option value="Finalizado">Finalizado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}><User size={16} /> Asignados</label>
                                        <div style={{ background: 'var(--bg)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {usuarios.map(u => (
                                                <label key={u.email} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                                    <input type="checkbox" checked={form.asignado_a.includes(u.email)} onChange={(e) => {
                                                        if (e.target.checked) setForm({ ...form, asignado_a: [...form.asignado_a, u.email] });
                                                        else setForm({ ...form, asignado_a: form.asignado_a.filter(email => email !== u.email) });
                                                    }} style={{ accentColor: 'var(--accent)' }} />
                                                    {u.nombre || u.email.split('@')[0]}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}><Clock size={16} /> Vencimiento</label>
                                        <input type="date" className="input" style={{ width: '100%', padding: '10px' }} value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Descripción</label>
                                    <textarea className="input" style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '12px' }} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
                                </div>

                                <div style={{ background: 'var(--bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', fontWeight: 600 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckSquare size={18} color="var(--accent)" /> Subtareas</span>
                                        {form.checklist.length > 0 && <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{getProgress(form.checklist)}%</span>}
                                    </label>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                                        {form.checklist.map(item => (
                                            <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-elevated)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <input type="checkbox" checked={item.completed} onChange={() => toggleCheckitem(item.id)} style={{ width: '20px', height: '20px', accentColor: 'var(--accent)' }} />
                                                    <input type="text" className="input" style={{ flex: 1, padding: '6px 12px', background: 'transparent', border: 'none' }} value={item.text} onChange={e => updateChecklistText(item.id, e.target.value)} />
                                                    <button type="button" onClick={() => removeChecklist(item.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '32px' }}>
                                                    {usuarios.map(u => (
                                                        <button key={u.email} type="button" onClick={() => updateChecklistItemAssignees(item.id, u.email)} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: (item.assigned_to || []).includes(u.email) ? 'var(--accent)' : 'var(--bg)', color: (item.assigned_to || []).includes(u.email) ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)', cursor: 'pointer' }}>{u.nombre || u.email.split('@')[0]}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input type="text" className="input" style={{ flex: 1, padding: '12px', borderRadius: '12px' }} placeholder="Nueva subtarea..." value={newChecklistText} onChange={e => setNewChecklistText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }} />
                                        <Button type="button" variant="secondary" onClick={addChecklistItem}>Añadir</Button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {editingTask && !isDemoMode && <button type="button" onClick={() => deleteTask(editingTask.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Eliminar</button>}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" form="task-form" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
