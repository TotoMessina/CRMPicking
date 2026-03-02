import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, CheckSquare, Clock, User, Trash2, Edit2, X, GripVertical } from 'lucide-react';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';

const COLUMNS = [
    { id: 'Pendiente', title: 'Pendientes', color: 'var(--text)' },
    { id: 'En Proceso', title: 'En Proceso', color: 'var(--accent)' },
    { id: 'Finalizado', title: 'Finalizados', color: '#10b981' }
];

export default function TableroTareas() {
    const { user, role } = useAuth();
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
        titulo: '', descripcion: '', estado: 'Pendiente', asignado_a: '', fecha_vencimiento: '', checklist: []
    });
    const [newChecklistText, setNewChecklistText] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsuarios();
        fetchTasks();
    }, []);

    const fetchUsuarios = async () => {
        const { data } = await supabase.from('usuarios').select('email, nombre').order('nombre');
        if (data) setUsuarios(data);
    };

    const fetchTasks = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tareas_tablero')
            .select('*')
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
                asignado_a: task.asignado_a || '',
                fecha_vencimiento: task.fecha_vencimiento || '',
                checklist: task.checklist || [] // [{ text, completed }]
            });
        } else {
            setEditingTask(null);
            setForm({ titulo: '', descripcion: '', estado: 'Pendiente', asignado_a: '', fecha_vencimiento: '', checklist: [] });
        }
        setNewChecklistText('');
        setIsModalOpen(true);
    };

    const saveTask = async (e) => {
        e.preventDefault();
        setSaving(true);

        const payload = { ...form };

        if (editingTask) {
            const { error } = await supabase.from('tareas_tablero').update(payload).eq('id', editingTask.id);
            if (error) toast.error('Error actualizando la tarea');
            else toast.success('Tarea guardada');
        } else {
            // New task goes to the end of Pendiente by default
            payload.orden = tasks['Pendiente'].length;
            const { error } = await supabase.from('tareas_tablero').insert([payload]);
            if (error) toast.error('Error creando tarea');
            else toast.success('Tarea creada');
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
            checklist: [...prev.checklist, { id: Date.now().toString(), text: newChecklistText.trim(), completed: false }]
        }));
        setNewChecklistText('');
    };

    const toggleCheckitem = (itemId) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i)
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

    return (
        <div style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column', maxWidth: '1600px', margin: '0 auto' }}>
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Tablero de Tareas</h1>
                    <p className="muted" style={{ margin: '4px 0 0 0' }}>Gestión de actividades del equipo</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button variant="secondary" onClick={fetchTasks}>🔄 Refrescar</Button>
                    <Button onClick={() => openModal()}><Plus size={18} style={{ marginRight: '6px' }} /> Nueva Tarea</Button>
                </div>
            </header>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando tablero...</div>
            ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '24px',
                        flex: 1,
                        alignItems: 'start'
                    }}>
                        {COLUMNS.map(col => (
                            <Droppable droppableId={col.id} key={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        style={{
                                            background: snapshot.isDraggingOver ? 'var(--bg-active)' : 'var(--bg-elevated)',
                                            borderRadius: '16px',
                                            padding: '16px',
                                            minHeight: '600px',
                                            border: '1px solid var(--border)',
                                            display: 'flex', flexDirection: 'column', gap: '12px',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', padding: '0 8px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: col.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {col.title}
                                                <span style={{ fontSize: '0.8rem', background: 'var(--bg)', color: 'var(--text)', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>
                                                    {tasks[col.id].length}
                                                </span>
                                            </h3>
                                        </div>

                                        {tasks[col.id].map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        onClick={() => openModal(task)}
                                                        style={{
                                                            ...provided.draggableProps.style,
                                                            background: 'var(--bg)',
                                                            padding: '16px',
                                                            borderRadius: '12px',
                                                            boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.15)' : 'var(--shadow-sm)',
                                                            border: '1px solid var(--border)',
                                                            cursor: 'pointer',
                                                            transform: snapshot.isDragging ? provided.draggableProps.style.transform + ' scale(1.02) rotate(2deg)' : provided.draggableProps.style.transform,
                                                            transition: snapshot.isDragging ? 'none' : 'all 0.2s'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                            <strong style={{ fontSize: '1rem', lineHeight: '1.3' }}>{task.titulo}</strong>
                                                        </div>

                                                        {task.descripcion && (
                                                            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                {task.descripcion}
                                                            </p>
                                                        )}

                                                        {task.checklist?.length > 0 && (
                                                            <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', outline: '1px solid var(--border)', padding: '4px 8px', borderRadius: '6px', width: 'fit-content' }}>
                                                                <CheckSquare size={14} color={getProgress(task.checklist) === 100 ? '#10b981' : 'var(--text-muted)'} />
                                                                <span style={{ color: getProgress(task.checklist) === 100 ? '#10b981' : 'var(--text-muted)' }}>
                                                                    {task.checklist.filter(i => i.completed).length} / {task.checklist.length} ({getProgress(task.checklist)}%)
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                                                            {task.asignado_a ? (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: 'var(--accent-alpha)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '16px', fontWeight: 500 }}>
                                                                    <User size={12} /> {getUserName(task.asignado_a)}
                                                                </div>
                                                            ) : <div />}

                                                            {task.fecha_vencimiento && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: new Date(task.fecha_vencimiento) < new Date() && task.estado !== 'Finalizado' ? '#ef4444' : 'var(--text-muted)' }}>
                                                                    <Clock size={12} /> {new Date(task.fecha_vencimiento).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        ))}
                    </div>
                </DragDropContext>
            )}

            {/* Modal Tarea */}
            {isModalOpen && (
                <div className="modal active">
                    <div className="modal-content" style={{ maxWidth: '600px', width: '100%', padding: 0 }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)' }}>
                            <h2 style={{ margin: 0 }}>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)} style={{ position: 'static' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={saveTask} style={{ padding: '24px' }}>
                            <div className="field" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Título de la tarea *</label>
                                <input required type="text" className="input" style={{ width: '100%' }} value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Realizar inventario mensual" />
                            </div>

                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div className="field" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Estado</label>
                                    <select className="input" style={{ width: '100%' }} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="En Proceso">En Proceso</option>
                                        <option value="Finalizado">Finalizado</option>
                                    </select>
                                </div>
                                <div className="field" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Asignado a</label>
                                    <select className="input" style={{ width: '100%' }} value={form.asignado_a} onChange={e => setForm({ ...form, asignado_a: e.target.value })}>
                                        <option value="">Sin asignar</option>
                                        {usuarios.map(u => <option key={u.email} value={u.email}>{u.nombre || u.email}</option>)}
                                    </select>
                                </div>
                                <div className="field" style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Vencimiento</label>
                                    <input type="date" className="input" style={{ width: '100%' }} value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} />
                                </div>
                            </div>

                            <div className="field" style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Descripción / Notas</label>
                                <textarea className="input" style={{ width: '100%', minHeight: '100px', resize: 'vertical' }} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalles de la tarea..." />
                            </div>

                            <div className="field" style={{ marginBottom: '24px', background: 'var(--bg-body)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 500 }}>
                                    <CheckSquare size={16} /> Subtareas (Checklist)
                                    {form.checklist.length > 0 && <span className="muted" style={{ fontWeight: 'normal' }}> - {getProgress(form.checklist)}%</span>}
                                </label>

                                {form.checklist.length > 0 && (
                                    <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {form.checklist.map(item => (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <input type="checkbox" checked={item.completed} onChange={() => toggleCheckitem(item.id)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                                <span style={{ flex: 1, textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? 'var(--text-muted)' : 'var(--text)' }}>
                                                    {item.text}
                                                </span>
                                                <button type="button" onClick={() => removeChecklist(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="text"
                                        className="input"
                                        style={{ flex: 1 }}
                                        placeholder="Agregar un ítem a la lista..."
                                        value={newChecklistText}
                                        onChange={e => setNewChecklistText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                                    />
                                    <Button type="button" variant="secondary" onClick={addChecklistItem}>Agregar</Button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '32px' }}>
                                <div>
                                    {editingTask && (isAdmin || editingTask.asignado_a === user?.email || role.includes('activador')) && (
                                        <button type="button" onClick={() => deleteTask(editingTask.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 500, padding: '8px' }}>
                                            <Trash2 size={18} /> Eliminar Tarea
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
                                    <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar Tarea'}</Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
