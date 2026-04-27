import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { Search, Edit2, X, Shield, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Usuarios() {
    const { user: currentUser, empresaActiva, isDemoMode } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [rolesDisponibles, setRolesDisponibles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [rolFilter, setRolFilter] = useState('');

    // Modal state
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({ role: '', activo: true, avatar_emoji: '📍' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (empresaActiva?.id) {
            fetchRoles();
            fetchUsuarios();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaActiva]);

    const fetchRoles = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_roles')
                .select('nombre, color_hex')
                .eq('empresa_id', empresaActiva.id);
            if (!error && data) {
                setRolesDisponibles(data);
            }
        } catch (err) {
            console.error('Error fetching roles:', err);
        }
    };

    const fetchUsuarios = async () => {
        setLoading(true);
        try {
            // 1. Obtener emails de los usuarios asociados a esta empresa
            const { data: euData, error: euError } = await supabase
                .from('empresa_usuario')
                .select('usuario_email, role')
                .eq('empresa_id', empresaActiva.id);

            if (euError) throw euError;
            
            if (!euData || euData.length === 0) {
                setUsuarios([]);
                setLoading(false);
                return;
            }

            const emails = euData.map(e => e.usuario_email);

            // 2. Fetch de perfiles excluyendo explícitamente a los super-administradores del sistema global
            const { data: usersData, error: usersError } = await supabase
                .from('usuarios')
                .select('*')
                .in('email', emails)
                .neq('role', 'super-admin')
                .order('nombre', { ascending: true });

            if (usersError) throw usersError;

            // 3. Mergear el rol interno de la empresa con el registro visual del usuario
            const merged = (usersData || []).map(u => {
                const eu = euData.find(e => e.usuario_email === u.email);
                return {
                    ...u,
                    role_empresa: eu ? eu.role : 'user'
                };
            });

            setUsuarios(merged);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Error al cargar trabajadores del sistema');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsuarios = useMemo(() => {
        return usuarios.filter(u => {
            const n = (u.nombre || '').toLowerCase();
            const e = (u.email || '').toLowerCase();
            const r = u.role_empresa || 'user';

            const matchText = !searchTerm || n.includes(searchTerm.toLowerCase()) || e.includes(searchTerm.toLowerCase());
            const matchRol = !rolFilter || r === rolFilter;

            return matchText && matchRol;
        });
    }, [usuarios, searchTerm, rolFilter]);

    const handleOpenModal = (user) => {
        setSelectedUser(user);
        setEditForm({
            role: user.role_empresa || 'user',
            activo: user.activo !== false, // default true
            avatar_emoji: user.avatar_emoji || '📍'
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedUser) return;

        setSaving(true);
        try {
            // STEP 1 & 2 unificados: RPC con elevación segura de permisos (Bypass RLS)
            const { error: rpcError } = await supabase.rpc('update_usuario_empresa_admin', {
                p_empresa_id: empresaActiva.id,
                p_target_email: selectedUser.email,
                p_target_id: selectedUser.id,
                p_new_role: editForm.role,
                p_new_activo: editForm.activo,
                p_new_emoji: editForm.avatar_emoji
            });

            if (rpcError) throw rpcError;

            toast.success('Trabajador actualizado exitosamente');
            setIsModalOpen(false);
            fetchUsuarios(); // Refresh list to reflect changes visually
        } catch (error) {
            console.error('Error updating user info:', error);
            toast.error('Fallo al actualizar el perfil o permiso. Verifica permisos de administrador.');
        } finally {
            setSaving(false);
        }
    };

    const getRoleBadgeStyle = (roleName) => {
        const found = rolesDisponibles.find(r => r.nombre === roleName);
        if (found) {
            // Custom role using dynamic color
            return {
                color: found.color_hex,
                background: `${found.color_hex}15`,
                border: `1px solid ${found.color_hex}40`,
                textTransform: 'capitalize'
            };
        }
        if (roleName === 'admin') {
            return { color: '#0c0c0c', background: 'var(--accent-soft)', border: '1px solid var(--border)' };
        }
        return { color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' };
    };

    return (
        <div className="container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Equipo de Trabajo</h1>
                    <p className="muted" style={{ margin: '4px 0 0 0' }}>Administrá roles y visualización de tu franquicia / empresa.</p>
                </div>
                <Button variant="secondary" onClick={fetchUsuarios}>🔄 Refrescar Lista</Button>
            </header>

            {/* FILTROS SUPERIORES */}
            <section className="controls" style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap', background: 'var(--bg-elevated)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                        <input
                            type="text"
                            className="input premium-input"
                            placeholder="Buscar por Nombre o Email en tu equipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', paddingLeft: '44px' }}
                        />
                    </div>
                    <select
                        className="input premium-input"
                        style={{ width: 'auto', minWidth: '180px' }}
                        value={rolFilter}
                        onChange={(e) => setRolFilter(e.target.value)}
                    >
                        <option value="">Filtro: Todos los Roles</option>
                        <option value="admin">Supervisores (Admin)</option>
                        <option value="user">Colaboradores Standard</option>
                        {rolesDisponibles.map(r => (
                            <option key={r.nombre} value={r.nombre}>Custom: {r.nombre}</option>
                        ))}
                    </select>
                </div>
            </section>

            {/* TABLA PRINCIPAL */}
            <div className="table-container" style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflowX: 'auto', boxShadow: 'var(--shadow-sm)' }}>
                <table className="tabla-datos" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-body)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trabajador</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Seguridad / Email</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Rol Designado</th>
                            <th style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado Nube</th>
                            <th style={{ padding: '16px 24px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                                <div className="muted">Indagando base de datos interna...</div>
                            </td></tr>
                        ) : filteredUsuarios.length === 0 ? (
                            <tr><td colSpan="5" style={{ padding: '60px', textAlign: 'center' }}>
                                <Shield size={48} className="muted" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                <div className="muted" style={{ fontWeight: 600 }}>No hay usuarios bajo este filtro</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>El equipo está vacío o los criterios de búsqueda ocultan al personal.</div>
                            </td></tr>
                        ) : (
                            filteredUsuarios.map(u => (
                                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--bg-body)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>
                                                {u.avatar_emoji || '📍'}
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{u.nombre || '-'}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <Shield size={14} /> {u.email || '-'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        <span style={{ 
                                            padding: '4px 10px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.75rem', 
                                            fontWeight: 800,
                                            ...getRoleBadgeStyle(u.role_empresa)
                                        }}>
                                            {u.role_empresa || 'user'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 24px' }}>
                                        {u.activo !== false ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                                                <CheckCircle size={12} /> Habilitado
                                            </span>
                                        ) : (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 800 }}>
                                                <XCircle size={12} /> Restringido
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                        {!isDemoMode && (
                                            <Button variant="secondary" className="btn-sm" onClick={() => handleOpenModal(u)}>
                                                <Edit2 size={13} style={{ marginRight: '6px' }} /> Editar Contrato
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL CONFIGURACIÓN DE USUARIO */}
            {isModalOpen && selectedUser && (
                <div className="modal active" style={{ zIndex: 1000 }}>
                    <div className="modal-content" style={{ maxWidth: '420px', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '24px', background: 'var(--bg-body)', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', right: '20px', top: '24px' }}><X size={20} /></button>
                            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.3rem' }}>Parametrizar Empleado</h2>
                            <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>Ficha técnica de: <strong style={{ color: 'var(--text)' }}>{selectedUser.nombre || selectedUser.email}</strong></p>
                        </div>

                        <form onSubmit={handleSave} style={{ padding: '24px' }}>
                            {/* ROLES DINAMICOS */}
                            <div className="field" style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>Otorgamiento de Cargo Jurídico</label>
                                <select
                                    className="input premium-input"
                                    style={{ width: '100%', opacity: currentUser?.id === selectedUser.id ? 0.6 : 1 }}
                                    value={editForm.role}
                                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                    disabled={currentUser?.id === selectedUser.id}
                                >
                                    <option value="admin">Administrador Total (Sin límite)</option>
                                    <option value="user">Usuario Genérico (Acceso base)</option>
                                    
                                    {rolesDisponibles.length > 0 && <optgroup label={`Cargos en ${empresaActiva?.nombre}`}>
                                        {rolesDisponibles.map(r => (
                                            <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
                                        ))}
                                    </optgroup>}
                                </select>
                                {currentUser?.id === selectedUser.id ? (
                                    <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '6px', fontWeight: 600 }}>No podés alterar tu propio cargo por seguridad. Pedile a otro Administrador que lo haga.</div>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>Los roles específicos permiten bloquear/habilitar diferentes pestañas en el menú central de la compañía.</div>
                                )}
                            </div>

                            {/* MARCADOR DE EMOJI EN MAPA */}
                            <div className="field" style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                                    <MapPin size={16} className="text-accent" /> Emblema Rastreador (GPS)
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                                    {['📍', '🟢', '🔵', '🟠', '🔴', '🚗', '🏍️', '🚲', '🚶', '⭐'].map(emoji => (
                                        <button
                                            type="button"
                                            key={emoji}
                                            onClick={() => setEditForm(prev => ({ ...prev, avatar_emoji: emoji }))}
                                            style={{
                                                padding: '12px 0',
                                                fontSize: '1.5rem',
                                                background: editForm.avatar_emoji === emoji ? 'var(--accent-soft)' : 'var(--bg-body)',
                                                border: editForm.avatar_emoji === emoji ? '2px solid var(--accent)' : '1px solid var(--border)',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>Se utilizará este ícono flotante para distinguir a la persona en los mapas de radar.</div>
                            </div>

                            {/* ESTADO ACTIVO */}
                            <div style={{ background: editForm.activo ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)', border: `1px solid ${editForm.activo ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, padding: '16px', borderRadius: '12px', marginBottom: '24px', transition: 'all 0.3s', opacity: currentUser?.id === selectedUser.id ? 0.6 : 1 }}>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: currentUser?.id === selectedUser.id ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
                                    <input
                                        type="checkbox"
                                        checked={editForm.activo}
                                        onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })}
                                        disabled={currentUser?.id === selectedUser.id}
                                        style={{ width: '20px', height: '20px', marginTop: '2px', accentColor: editForm.activo ? '#10b981' : '#ef4444' }}
                                    />
                                    <div>
                                        <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '2px' }}>Cuenta Operativa</strong>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Desmarcá esta casilla para bloquear por completo el acceso del usuario a los datos del sistema, revocando toda sesión activa.</span>
                                    </div>
                                </label>
                            </div>

                            {/* BOTONERA INF */}
                            <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
                                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving} style={{ flex: 1, padding: '12px' }}>Cancelar</Button>
                                {!isDemoMode && (
                                    <Button type="submit" variant="primary" disabled={saving} style={{ flex: 1.5, padding: '12px' }}>
                                        {saving ? 'Guardando Registro...' : 'Guardar Ficha Laboral'}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
