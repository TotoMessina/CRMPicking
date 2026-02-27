import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { Search, Edit2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Usuarios() {
    const { user: currentUser } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rolFilter, setRolFilter] = useState('');

    // Modal state
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ role: '', activo: true, avatar_emoji: '📍' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .order('nombre', { ascending: true });

            if (error) throw error;
            setUsuarios(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsuarios = useMemo(() => {
        return usuarios.filter(u => {
            const n = (u.nombre || '').toLowerCase();
            const e = (u.email || '').toLowerCase();
            const r = u.role || 'user';

            const matchText = !searchTerm || n.includes(searchTerm.toLowerCase()) || e.includes(searchTerm.toLowerCase());
            const matchRol = !rolFilter || r === rolFilter;

            return matchText && matchRol;
        });
    }, [usuarios, searchTerm, rolFilter]);

    const handleOpenModal = (user) => {
        setSelectedUser(user);
        setEditForm({
            role: user.role || 'user',
            activo: user.activo !== false, // default true if undefined
            avatar_emoji: user.avatar_emoji || '📍'
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({
                    role: editForm.role,
                    activo: editForm.activo,
                    avatar_emoji: editForm.avatar_emoji
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            toast.success('Usuario actualizado correctamente');
            setIsModalOpen(false);
            fetchUsuarios();
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Error al actualizar usuario');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Gestión de Usuarios</h1>
                    <p className="muted" style={{ margin: '4px 0 0 0' }}>Administra los accesos y roles del equipo.</p>
                </div>
                <Button variant="secondary" onClick={fetchUsuarios}>🔄 Refrescar</Button>
            </header>

            <section className="controls" style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="text"
                            className="input"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', paddingLeft: '38px' }}
                        />
                    </div>
                    <select
                        className="input"
                        style={{ width: 'auto' }}
                        value={rolFilter}
                        onChange={(e) => setRolFilter(e.target.value)}
                    >
                        <option value="">Todos los roles</option>
                        <option value="Administrador">Administrador</option>
                        <option value="Activador PickingUp">Activador PickingUp</option>
                        <option value="Activador Golomax">Activador Golomax</option>
                        <option value="user">Usuario (default)</option>
                    </select>
                </div>
            </section>

            <div className="table-container" style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', overflowX: 'auto' }}>
                <table className="tabla-datos" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '16px' }}>Nombre</th>
                            <th style={{ padding: '16px' }}>Email</th>
                            <th style={{ padding: '16px' }}>Rol</th>
                            <th style={{ padding: '16px' }}>Estado</th>
                            <th style={{ padding: '16px', textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }} className="muted">Cargando usuarios...</td></tr>
                        ) : filteredUsuarios.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center' }} className="muted">No se encontraron usuarios.</td></tr>
                        ) : (
                            filteredUsuarios.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '1.2em' }}>{u.avatar_emoji || '📍'}</span>
                                            {u.nombre || '-'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }} className="muted">{u.email || '-'}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span className="badge" style={{ backgroundColor: 'var(--bg-body)' }}>{u.role || 'user'}</span>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        {u.activo !== false ? (
                                            <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em', fontWeight: 500 }}>Activo</span>
                                        ) : (
                                            <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em', fontWeight: 500 }}>Inactivo</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <Button variant="secondary" className="btn-sm" onClick={() => handleOpenModal(u)} disabled={currentUser?.id === u.id}>
                                            <Edit2 size={14} style={{ marginRight: '6px' }} /> Editar
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Editar Rol */}
            {isModalOpen && selectedUser && (
                <div className="modal active">
                    <div className="modal-content" style={{ maxWidth: '400px' }}>
                        <button className="modal-close" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        <h2 style={{ marginTop: 0 }}>Editar Usuario</h2>
                        <p className="muted" style={{ marginBottom: '24px' }}>Usuario: <strong>{selectedUser.nombre || selectedUser.email}</strong></p>

                        <form onSubmit={handleSave}>
                            <div className="field" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Rol del Usuario</label>
                                <select
                                    className="input"
                                    style={{ width: '100%' }}
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                >
                                    <option value="Administrador">Administrador</option>
                                    <option value="Activador PickingUp">Activador PickingUp</option>
                                    <option value="Activador Golomax">Activador Golomax</option>
                                    <option value="user">Usuario normal</option>
                                </select>
                            </div>

                            <div className="field" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Emoji / Marcador (Mapa)</label>
                                <select
                                    className="input"
                                    style={{ width: '100%' }}
                                    value={editForm.avatar_emoji}
                                    onChange={(e) => setEditForm({ ...editForm, avatar_emoji: e.target.value })}
                                >
                                    <option value="📍">📍 Marcador (Por defecto)</option>
                                    <option value="🟢">🟢 Verde</option>
                                    <option value="🔵">🔵 Azul</option>
                                    <option value="🟣">🟣 Púrpura</option>
                                    <option value="🟠">🟠 Naranja</option>
                                    <option value="🔴">🔴 Rojo</option>
                                    <option value="🚗">🚗 Auto</option>
                                    <option value="🏍️">🏍️ Moto</option>
                                    <option value="🚶">🚶 Caminante</option>
                                    <option value="⭐">⭐ Estrella</option>
                                </select>
                            </div>

                            <div className="field" style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.activo}
                                        onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <strong>Usuario Activo</strong> (Puede iniciar sesión y realizar acciones)
                                </label>
                            </div>

                            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>Cancelar</Button>
                                <Button type="submit" variant="primary" disabled={saving}>
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
