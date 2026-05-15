import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Users, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function Empresas() {
    const { t } = useTranslation();
    const { user, role, isDemoMode } = useAuth();
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usuarios, setUsuarios] = useState([]);

    // New company form
    const [showNewEmpresa, setShowNewEmpresa] = useState(false);
    const [newNombre, setNewNombre] = useState('');
    const [saving, setSaving] = useState(false);

    // Assign user form
    const [assigningEmpresaId, setAssigningEmpresaId] = useState(null);
    const [assignEmail, setAssignEmail] = useState('');
    const [assignRole, setAssignRole] = useState('activador');

    const isSuperAdmin = role === 'super-admin' || role === 'admin';

    useEffect(() => {
        fetchEmpresas();
        fetchUsuarios();
    }, []);

    const fetchEmpresas = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('empresas')
            .select('id, nombre, logo_url, created_at')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error(t('common.errors.loading_companies', { defaultValue: 'Error al cargar empresas' }));
        } else {
            // For each company, load its users
            const enriched = await Promise.all((data || []).map(async (emp) => {
                const { data: users } = await supabase
                    .from('empresa_usuario')
                    .select('usuario_email, role')
                    .eq('empresa_id', emp.id);
                return { ...emp, usuarios: users || [] };
            }));
            setEmpresas(enriched);
        }
        setLoading(false);
    };

    const fetchUsuarios = async () => {
        const { data } = await supabase.from('usuarios').select('email, nombre, role');
        setUsuarios(data || []);
    };

    const handleCreateEmpresa = async () => {
        if (!newNombre.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('empresas').insert([{ nombre: newNombre.trim() }]);
        if (error) {
            toast.error(t('common.errors.creating_company', { defaultValue: 'Error al crear empresa' }));
        } else {
            toast.success(t('companies.card.create_success', { defaultValue: `Empresa "${newNombre}" creada` }));
            setNewNombre('');
            setShowNewEmpresa(false);
            fetchEmpresas();
        }
        setSaving(false);
    };

    const handleDeleteEmpresa = async (id, nombre) => {
        if (!window.confirm(t('companies.card.delete_confirm', { name: nombre }))) return;
        const { error } = await supabase.from('empresas').delete().eq('id', id);
        if (error) {
            toast.error(t('common.errors.delete_error'));
        } else {
            toast.success(t('companies.card.delete_success'));
            fetchEmpresas();
        }
    };

    const handleAssignUser = async (empresaId) => {
        if (!assignEmail) return;
        const { error } = await supabase.from('empresa_usuario').upsert([
            { empresa_id: empresaId, usuario_email: assignEmail, role: assignRole }
        ], { onConflict: 'empresa_id,usuario_email' });

        if (error) {
            toast.error(t('common.errors.assign_user_error', { defaultValue: 'Error al asignar usuario' }));
        } else {
            toast.success(t('companies.card.assign_success'));
            setAssigningEmpresaId(null);
            setAssignEmail('');
            setAssignRole('activador');
            fetchEmpresas();
        }
    };

    const handleRemoveUser = async (empresaId, email) => {
        if (!window.confirm(t('companies.card.remove_confirm', { email }))) return;
        const { error } = await supabase.from('empresa_usuario')
            .delete().eq('empresa_id', empresaId).eq('usuario_email', email);
        if (error) {
            toast.error(t('common.errors.remove_user_error', { defaultValue: 'No se pudo quitar el usuario' }));
        } else {
            toast.success(t('companies.card.remove_success'));
            fetchEmpresas();
        }
    };

    if (!isSuperAdmin || isDemoMode) {
        return (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Building2 size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
                <h2>{t('companies.restricted_access')}</h2>
                <p>{t('companies.restricted_desc')}</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: '0 0 4px', fontSize: '1.6rem', fontWeight: 800 }}>{t('companies.title')}</h1>
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>{t('companies.subtitle')}</p>
                </div>
                <Button onClick={() => setShowNewEmpresa(true)}>
                    <Plus size={16} style={{ marginRight: '6px' }} />
                    {t('companies.new_btn')}
                </Button>
            </div>

            {/* New empresa form */}
            {showNewEmpresa && (
                <div style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
                    borderRadius: '14px', padding: '20px', marginBottom: '24px',
                    display: 'flex', gap: '12px', alignItems: 'flex-end'
                }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('companies.form.name_label')}
                        </label>
                        <input
                            className="input"
                            value={newNombre}
                            onChange={e => setNewNombre(e.target.value)}
                            placeholder={t('companies.form.name_placeholder')}
                            onKeyDown={e => e.key === 'Enter' && handleCreateEmpresa()}
                            autoFocus
                        />
                    </div>
                    <Button onClick={handleCreateEmpresa} disabled={saving || !newNombre.trim()}>
                        {saving ? t('companies.form.saving') : t('companies.form.create')}
                    </Button>
                    <Button variant="secondary" onClick={() => { setShowNewEmpresa(false); setNewNombre(''); }}>
                        {t('common.cancel')}
                    </Button>
                </div>
            )}

            {/* List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t('companies.loading')}</div>
            ) : empresas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <Building2 size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                    <p>{t('companies.empty')}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {empresas.map(emp => (
                        <div key={emp.id} style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                            borderRadius: '16px', overflow: 'hidden'
                        }}>
                            {/* Header */}
                            <div style={{
                                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
                                borderBottom: emp.usuarios.length > 0 ? '1px solid var(--border)' : 'none'
                            }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '10px',
                                    background: 'var(--accent)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    <Building2 size={20} color="#fff" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{emp.nombre}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        {t('companies.card.users_count', { count: emp.usuarios.length })}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Button
                                        variant="secondary"
                                        style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                                        onClick={() => setAssigningEmpresaId(assigningEmpresaId === emp.id ? null : emp.id)}
                                    >
                                        <UserPlus size={14} style={{ marginRight: '5px' }} />
                                        {t('companies.card.assign_user')}
                                    </Button>
                                    <button
                                        onClick={() => handleDeleteEmpresa(emp.id, emp.nombre)}
                                        title={t('common.actions.delete', { defaultValue: 'Eliminar' })}
                                        style={{
                                            background: 'transparent', border: '1px solid var(--border)',
                                            borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
                                            color: 'var(--danger, #ef4444)'
                                        }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Assign user form */}
                            {assigningEmpresaId === emp.id && (
                                <div style={{
                                    padding: '14px 20px', background: 'var(--bg-glass)',
                                    borderBottom: '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap'
                                }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('companies.assign_modal.user')}</label>
                                        <select className="input" value={assignEmail} onChange={e => setAssignEmail(e.target.value)}>
                                            <option value="">{t('companies.assign_modal.user_placeholder')}</option>
                                            {usuarios.map(u => (
                                                <option key={u.email} value={u.email}>
                                                    {u.nombre || u.email} ({u.role})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div style={{ minWidth: '140px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('companies.assign_modal.role')}</label>
                                        <select className="input" value={assignRole} onChange={e => setAssignRole(e.target.value)}>
                                            <option value="activador">{t('common.roles.activator', { defaultValue: 'Activador' })}</option>
                                            <option value="admin">{t('common.roles.admin', { defaultValue: 'Admin' })}</option>
                                            <option value="supervisor">{t('common.roles.supervisor', { defaultValue: 'Supervisor' })}</option>
                                        </select>
                                    </div>
                                    <Button onClick={() => handleAssignUser(emp.id)} disabled={!assignEmail}>
                                        {t('companies.assign_modal.assign')}
                                    </Button>
                                    <Button variant="secondary" onClick={() => setAssigningEmpresaId(null)}>
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            )}

                            {/* User list */}
                            {emp.usuarios.length > 0 && (
                                <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {emp.usuarios.map(u => {
                                        const info = usuarios.find(usr => usr.email === u.usuario_email);
                                        return (
                                            <div key={u.usuario_email} style={{
                                                display: 'flex', alignItems: 'center', gap: '10px',
                                                padding: '8px 10px', borderRadius: '8px', background: 'var(--bg)'
                                            }}>
                                                <Users size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                        {info?.nombre || u.usuario_email}
                                                    </span>
                                                    <span style={{
                                                        marginLeft: '8px', fontSize: '0.75rem', padding: '2px 8px',
                                                        borderRadius: '20px', background: 'var(--accent-alpha)',
                                                        color: 'var(--accent)', fontWeight: 600
                                                    }}>
                                                        {u.role}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {u.usuario_email}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveUser(emp.id, u.usuario_email)}
                                                    style={{
                                                        background: 'transparent', border: 'none',
                                                        cursor: 'pointer', color: 'var(--text-muted)', padding: '2px'
                                                    }}
                                                    title={t('common.actions.remove', { defaultValue: 'Quitar' })}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
