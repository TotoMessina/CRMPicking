import React from 'react';
import { ClipboardList, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatUser } from '../../hooks/useChat';

interface TaskForm {
    titulo: string;
    descripcion: string;
    fecha_vencimiento: string;
    asignado_a: string[];
}

interface TaskModalProps {
    isTaskModalOpen: boolean;
    setIsTaskModalOpen: (open: boolean) => void;
    taskForm: TaskForm;
    setTaskForm: (form: TaskForm) => void;
    usuarios: ChatUser[];
    selectedUser: ChatUser | null;
    sendingTask: boolean;
    handleSendTask: (e?: React.FormEvent) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({ 
    isTaskModalOpen, setIsTaskModalOpen, taskForm, setTaskForm, 
    usuarios, selectedUser, sendingTask, handleSendTask 
}) => {
    if (!isTaskModalOpen) return null;

    return (
        <AnimatePresence>
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' } as React.CSSProperties}>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    style={{ background: 'var(--bg-elevated)', width: '100%', maxWidth: '520px', borderRadius: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: '90dvh', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' } as React.CSSProperties}
                >
                    <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.01em' }}>
                                <ClipboardList size={22} color="var(--accent)" />
                                Asignar Tarea
                            </h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Asignando a: <strong>{selectedUser?.nombre || selectedUser?.email.split('@')[0]}</strong></p>
                        </div>
                        <button onClick={() => setIsTaskModalOpen(false)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ padding: '28px', overflowY: 'auto' }} className="custom-scrollbar">
                        <form id="chat-task-form" onSubmit={handleSendTask} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.9rem' }}>Título de la tarea *</label>
                                <input required type="text" placeholder="Ej: Revisar carga de ruta" style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                                    value={taskForm.titulo} onChange={e => setTaskForm({ ...taskForm, titulo: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.9rem' }}>Descripción</label>
                                <textarea rows={3} placeholder="Detalles opcionales..." style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', resize: 'none' }}
                                    value={taskForm.descripcion} onChange={e => setTaskForm({ ...taskForm, descripcion: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, fontSize: '0.9rem' }}>Fecha de Vencimiento</label>
                                    <input type="date" style={{ width: '100%', padding: '12px 16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
                                        value={taskForm.fecha_vencimiento} onChange={e => setTaskForm({ ...taskForm, fecha_vencimiento: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 700, fontSize: '0.9rem' }}>Personas asignadas</label>
                                <div style={{ background: 'var(--bg-card)', padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {usuarios.map(u => (
                                        <label key={u.email} style={{ 
                                            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', 
                                            borderRadius: '10px', cursor: 'pointer', transition: 'background 0.2s',
                                            background: taskForm.asignado_a.includes(u.email) ? 'var(--accent-soft)' : 'transparent',
                                            color: taskForm.asignado_a.includes(u.email) ? 'var(--accent)' : 'var(--text)'
                                        } as React.CSSProperties}>
                                            <input type="checkbox" checked={taskForm.asignado_a.includes(u.email)} style={{ display: 'none' }}
                                                onChange={(ev) => {
                                                    if (ev.target.checked) setTaskForm({ ...taskForm, asignado_a: [...taskForm.asignado_a, u.email] });
                                                    else setTaskForm({ ...taskForm, asignado_a: taskForm.asignado_a.filter(em => em !== u.email) });
                                                }} />
                                            <div style={{ width: '18px', height: '18px', borderRadius: '6px', border: '2px solid', borderColor: taskForm.asignado_a.includes(u.email) ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties}>
                                                {taskForm.asignado_a.includes(u.email) && <Check size={14} strokeWidth={3} />}
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{u.nombre || u.email}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </div>

                    <div style={{ padding: '20px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--bg-glass)' }}>
                        <button type="button" onClick={() => setIsTaskModalOpen(false)} style={{ padding: '12px 20px', borderRadius: '14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                        <button type="submit" form="chat-task-form" disabled={sendingTask || !taskForm.titulo.trim() || taskForm.asignado_a.length === 0}
                            style={{ 
                                padding: '12px 24px', borderRadius: '14px', background: 'var(--accent)', border: 'none', 
                                color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                opacity: (sendingTask || !taskForm.titulo.trim() || taskForm.asignado_a.length === 0) ? 0.6 : 1 
                            }}>
                            {sendingTask ? 'Asignando...' : 'Asignar Tarea'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
