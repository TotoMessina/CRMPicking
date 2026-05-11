import { Edit2, Hexagon, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CrmRole, UsuarioEmpresa } from '../../types/permisos';

interface TabUsuariosProps {
    usuariosEmpresa: UsuarioEmpresa[];
    rolesDinamicos: CrmRole[];
    saving: boolean;
    selectedUser: UsuarioEmpresa | null;
    isUserModalOpen: boolean;
    setIsUserModalOpen: (v: boolean) => void;
    editUserForm: { role: string; activo: boolean };
    setEditUserForm: React.Dispatch<React.SetStateAction<{ role: string; activo: boolean }>>;
    onEditUser: (user: UsuarioEmpresa) => void;
    handleSaveUser: (e: React.FormEvent) => void;
    isRoleModalOpen: boolean;
    setIsRoleModalOpen: (v: boolean) => void;
    newRoleForm: { nombre: string; color_hex: string };
    setNewRoleForm: React.Dispatch<React.SetStateAction<{ nombre: string; color_hex: string }>>;
    handleCreateRole: (e: React.FormEvent) => void;
}

export function TabUsuarios({
    usuariosEmpresa, rolesDinamicos, saving,
    selectedUser, isUserModalOpen, setIsUserModalOpen, editUserForm, setEditUserForm, onEditUser, handleSaveUser,
    isRoleModalOpen, setIsRoleModalOpen, newRoleForm, setNewRoleForm, handleCreateRole,
}: TabUsuariosProps) {
    return (
        <>
            <div className="usuarios-roles-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Hexagon size={16} /> Roles Personalizados</h3>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>Define los cargos que existen dentro de esta empresa.</p>
                    </div>
                    <button className="btn-primario" onClick={() => setIsRoleModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                        <Plus size={16} /> Crear Rol
                    </button>
                </div>

                <div className="table-container" style={{ borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto', background: 'var(--bg-card)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Usuario</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Email</th>
                                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Rol Asignado</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuariosEmpresa.length === 0 ? (
                                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center' }} className="muted">No se encontraron usuarios.</td></tr>
                            ) : (
                                usuariosEmpresa.map(u => {
                                    const assignedData = rolesDinamicos.find(r => r.nombre === u.role);
                                    const roleColor = assignedData?.color_hex || 'var(--text-muted)';
                                    return (
                                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>{u.avatar_emoji || '📍'} {u.nombre || '-'}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{u.email}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ background: `${roleColor}15`, color: roleColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, border: `1px solid ${roleColor}30` }}>
                                                    {u.role || 'Sin rol'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button className="btn-secundario" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => onEditUser(u)}>
                                                    <Edit2 size={14} style={{ marginRight: 6 }} /> Modificar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AnimatePresence>
                {isUserModalOpen && selectedUser && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setIsUserModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Edit2 size={18} /> Asignar Rol</h3>
                                <button onClick={() => setIsUserModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>
                            <p className="muted" style={{ marginBottom: 20, fontSize: '0.9rem' }}>Actualizar credenciales para <strong>{selectedUser.nombre}</strong></p>
                            <form onSubmit={handleSaveUser}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Rol Dinámico</label>
                                    <select className="input premium-input" style={{ width: '100%', appearance: 'none' }} value={editUserForm.role} onChange={e => setEditUserForm(p => ({ ...p, role: e.target.value }))}>
                                        <option value="">Seleccionar rol...</option>
                                        {rolesDinamicos.map(r => (
                                            <option key={r.nombre} value={r.nombre}>{r.nombre.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                                        <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} checked={editUserForm.activo} onChange={e => setEditUserForm(p => ({ ...p, activo: e.target.checked }))} />
                                        Acceso de Usuario Activo
                                    </label>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button type="button" className="btn-secundario" onClick={() => setIsUserModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn-primario" disabled={saving} style={{ flex: 1 }}>{saving ? 'Guardando...' : 'Confirmar'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isRoleModalOpen && (
                    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setIsRoleModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content glass-card" style={{ width: '90%', maxWidth: '400px', padding: '24px' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Plus size={18} /> Crear Nuevo Rol</h3>
                                <button onClick={() => setIsRoleModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreateRole}>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Identificador del Rol</label>
                                    <input required type="text" className="input premium-input" placeholder="Ej: analista_datos, repositor..." style={{ width: '100%' }} value={newRoleForm.nombre} onChange={e => setNewRoleForm(p => ({ ...p, nombre: e.target.value }))} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>Se guardará en minúsculas.</span>
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Etiqueta de Color</label>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <input type="color" style={{ width: 40, height: 40, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer' }} value={newRoleForm.color_hex} onChange={e => setNewRoleForm(p => ({ ...p, color_hex: e.target.value }))} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{newRoleForm.color_hex}</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button type="button" className="btn-secundario" onClick={() => setIsRoleModalOpen(false)} style={{ flex: 1 }}>Cancelar</button>
                                    <button type="submit" className="btn-primario" disabled={saving} style={{ flex: 1 }}>{saving ? 'Creando...' : 'Crear Rol'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
