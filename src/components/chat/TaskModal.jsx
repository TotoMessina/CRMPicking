import { ClipboardList, X } from 'lucide-react';

export const TaskModal = ({ isTaskModalOpen, setIsTaskModalOpen, taskForm, setTaskForm, usuarios, selectedUser, sendingTask, handleSendTask }) => {
    if (!isTaskModalOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'var(--bg-elevated)', width: '100%', maxWidth: '500px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: '90dvh', overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ClipboardList size={19} color="var(--accent)" />
                        Asignar Tarea a {selectedUser?.nombre || selectedUser?.email.split('@')[0]}
                    </h2>
                    <button onClick={() => setIsTaskModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
                    <form id="chat-task-form" onSubmit={handleSendTask}>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Titulo *</label>
                            <input required type="text" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                value={taskForm.titulo} onChange={e => setTaskForm({ ...taskForm, titulo: e.target.value })} />
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Descripcion</label>
                            <textarea rows="3" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                value={taskForm.descripcion} onChange={e => setTaskForm({ ...taskForm, descripcion: e.target.value })} />
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Vencimiento</label>
                            <input type="date" style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                value={taskForm.fecha_vencimiento} onChange={e => setTaskForm({ ...taskForm, fecha_vencimiento: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>Asignar a</label>
                            <div style={{ background: 'var(--bg)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', maxHeight: '120px', overflowY: 'auto' }}>
                                {usuarios.map(u => (
                                    <label key={u.email} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                                        <input type="checkbox" checked={taskForm.asignado_a.includes(u.email)}
                                            onChange={(ev) => {
                                                if (ev.target.checked) setTaskForm({ ...taskForm, asignado_a: [...taskForm.asignado_a, u.email] });
                                                else setTaskForm({ ...taskForm, asignado_a: taskForm.asignado_a.filter(em => em !== u.email) });
                                            }} />
                                        {u.nombre || u.email}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </form>
                </div>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button type="button" onClick={() => setIsTaskModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}>Cancelar</button>
                    <button type="submit" form="chat-task-form" disabled={sendingTask || !taskForm.titulo.trim() || taskForm.asignado_a.length === 0}
                        style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--accent)', border: 'none', color: '#fff', opacity: sendingTask ? 0.6 : 1 }}>
                        {sendingTask ? 'Enviando...' : 'Asignar Tarea'}
                    </button>
                </div>
            </div>
        </div>
    );
};
