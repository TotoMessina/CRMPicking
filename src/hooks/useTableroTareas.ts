import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DropResult } from '@hello-pangea/dnd';
import toast from 'react-hot-toast';

export interface ChecklistItem {
    id: string;
    text: string;
    completed: boolean;
    assigned_to?: string[];
}

export interface Task {
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

export interface KanbanColumn {
    id: string;
    title: string;
    color: string;
}

export const DEFAULT_COLUMNS: KanbanColumn[] = [
    { id: 'Pendiente', title: 'Pendientes', color: 'var(--text)' },
    { id: 'En Proceso', title: 'En Proceso', color: 'var(--accent)' },
    { id: 'Finalizado', title: 'Finalizados', color: '#10b981' }
];

export function useTableroTareas() {
    const { empresaActiva, isDemoMode } = useAuth();
    const columns = (empresaActiva?.config?.kanbanColumns || DEFAULT_COLUMNS) as KanbanColumn[];

    const [tasks, setTasks] = useState<Record<string, Task[]>>(() => {
        const initial: Record<string, Task[]> = {};
        columns.forEach(col => {
            initial[col.id] = [];
        });
        return initial;
    });
    const [usuarios, setUsuarios] = useState<{ email: string; nombre?: string }[]>([]);
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
    }>(() => ({
        titulo: '',
        descripcion: '',
        estado: columns[0]?.id || 'Pendiente',
        asignado_a: [],
        fecha_vencimiento: '',
        checklist: []
    }));
    const [newChecklistText, setNewChecklistText] = useState('');
    const [assigneeForNewItem, setAssigneeForNewItem] = useState<string[]>([]);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

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
            const activeCols = (empresaActiva.config?.kanbanColumns || DEFAULT_COLUMNS) as KanbanColumn[];
            const grouped: Record<string, Task[]> = {};
            activeCols.forEach(col => {
                grouped[col.id] = [];
            });
            const rawData = data as any[] || [];
            rawData.forEach(t => {
                const estado = t.estado || activeCols[0].id;
                if (grouped[estado]) {
                    grouped[estado].push({
                        ...t,
                        checklist: (t.checklist as unknown) as ChecklistItem[]
                    } as Task);
                } else {
                    const firstColId = activeCols[0].id;
                    if (grouped[firstColId]) {
                        grouped[firstColId].push({
                            ...t,
                            checklist: (t.checklist as unknown) as ChecklistItem[]
                        } as Task);
                    }
                }
            });
            setTasks(grouped);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsuarios();
        fetchTasks();
    }, [empresaActiva]);

    const onDragEnd = async (result: DropResult) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const sourceCol = source.droppableId;
        const destCol = destination.droppableId;
        
        const sourceTasks = Array.from(tasks[sourceCol] || []);
        const destTasks = sourceCol === destCol ? sourceTasks : Array.from(tasks[destCol] || []);

        const [movedTask] = sourceTasks.splice(source.index, 1);
        if (!movedTask) return;
        
        movedTask.estado = destCol;
        destTasks.splice(destination.index, 0, movedTask);

        const newTasks = { ...tasks, [sourceCol]: sourceTasks };
        if (sourceCol !== destCol) newTasks[destCol] = destTasks;

        setTasks(newTasks);

        const updates: any[] = [];
        destTasks.forEach((t, i) => {
            updates.push({
                id: t.id,
                titulo: t.titulo,
                estado: destCol,
                orden: i,
                empresa_id: empresaActiva?.id
            });
        });

        if (sourceCol !== destCol) {
            sourceTasks.forEach((t, i) => {
                updates.push({
                    id: t.id,
                    titulo: t.titulo,
                    estado: sourceCol,
                    orden: i,
                    empresa_id: empresaActiva?.id
                });
            });
        }

        try {
            const { error } = await supabase.from('tareas_tablero').upsert(updates);
            if (error) throw error;
        } catch (e) {
            console.error('Error saving task drag and drop order:', e);
            toast.error('Error al guardar el orden del tablero');
            fetchTasks();
        }
    };

    const openModal = (task: Task | null = null) => {
        const defaultEstado = columns[0]?.id || 'Pendiente';
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
            setForm({ titulo: '', descripcion: '', estado: defaultEstado, asignado_a: [], fecha_vencimiento: '', checklist: [] });
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
        if (error) {
            toast.error('Error eliminando tarea');
        } else {
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

    return {
        tasks,
        usuarios,
        loading,
        isModalOpen,
        setIsModalOpen,
        editingTask,
        form,
        setForm,
        newChecklistText,
        setNewChecklistText,
        assigneeForNewItem,
        setAssigneeForNewItem,
        editingItemId,
        setEditingItemId,
        saving,
        fetchTasks,
        onDragEnd,
        openModal,
        saveTask,
        deleteTask,
        addChecklistItem,
        updateChecklistItemAssignees,
        toggleCheckitem,
        updateChecklistText,
        removeChecklist,
        getProgress,
        getUserName,
        getUserInitials,
        isDemoMode,
        columns
    };
}
