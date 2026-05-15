import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Trash2, Mail, Plus, X, Send, Info, HardDrive, Tag, Edit2, Settings2 } from 'lucide-react';
import { clearLocalClients } from '../lib/offlineManager';
import { useGrupos, useCreateGrupo, useUpdateGrupo, useDeleteGrupo } from '../hooks/useGrupos';
import { useNavigate } from 'react-router-dom';


const BUCKET = 'avatares';
const MAX_SIZE_MB = 2;

export default function Configuracion() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user, avatarUrl, updateProfile, updateAvatarUrl, isDemoMode, role, roleName } = useAuth();
    const fileInputRef = useRef(null);

    // Avatar state
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    // Profile Form
    const [profileName, setProfileName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password Form
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    // Report recipients
    const [reportRecipients, setReportRecipients] = useState([]);
    const [newRecipientEmail, setNewRecipientEmail] = useState('');
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [sendingTestReport, setSendingTestReport] = useState(false);
    
    // Dia Reporte Config
    const [diaReporte, setDiaReporte] = useState(1);
    const [savingDia, setSavingDia] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileName(user.user_metadata?.display_name || '');
        }
    }, [user]);

    // Load report recipients
    useEffect(() => {
        const { empresaActiva } = { empresaActiva: null }; // Pulled from auth below
    }, []);

    const { empresaActiva } = useAuth();

    useEffect(() => {
        if (!empresaActiva?.id) return;
        setLoadingRecipients(true);
        
        supabase
            .from('report_recipients')
            .select('*')
            .eq('empresa_id', empresaActiva.id)
            .eq('activo', true)
            .then(({ data }) => {
                setReportRecipients(data || []);
                setLoadingRecipients(false);
            });
            
        // Load company designated report day
        supabase
            .from('empresas')
            .select('dia_reporte')
            .eq('id', empresaActiva.id)
            .single()
            .then(({ data }) => {
                if (data?.dia_reporte !== undefined && data.dia_reporte !== null) {
                    setDiaReporte(parseInt(data.dia_reporte));
                }
            });
    }, [empresaActiva?.id]);

    const handleSaveDiaReporte = async (nuevoDia) => {
        setSavingDia(true);
        try {
            const { error } = await supabase.rpc('update_dia_reporte', {
                p_empresa_id: empresaActiva.id,
                p_dia: parseInt(nuevoDia)
            });
            if (error) throw error;
            setDiaReporte(parseInt(nuevoDia));
            toast.success(t('settings.report_day_updated', { defaultValue: 'Día de envío actualizado' }));
        } catch (err) {
            console.error('Error updating report day:', err);
            toast.error(t('settings.report_day_error', { defaultValue: 'Error al actualizar el día de reporte' }));
        } finally {
            setSavingDia(false);
        }
    };

    const handleAddRecipient = async () => {
        if (isDemoMode) return;
        const email = newRecipientEmail.trim().toLowerCase();
        if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
            toast.error(t('settings.invalid_email', { defaultValue: 'Ingresá un email válido' }));
            return;
        }
        if (reportRecipients.some(r => r.email === email)) {
            toast.error(t('settings.email_exists', { defaultValue: 'Ese email ya está en la lista' }));
            return;
        }
        const { data, error } = await supabase
            .from('report_recipients')
            .insert({ empresa_id: empresaActiva.id, email })
            .select()
            .single();
        if (error) { toast.error(t('settings.recipient_error', { defaultValue: 'Error al agregar destinatario' })); return; }
        setReportRecipients(prev => [...prev, data]);
        setNewRecipientEmail('');
        toast.success(t('settings.recipient_added', { email, defaultValue: `${email} agregado como destinatario` }));
    };

    const handleRemoveRecipient = async (id, email) => {
        if (isDemoMode) return;
        await supabase.from('report_recipients').delete().eq('id', id);
        setReportRecipients(prev => prev.filter(r => r.id !== id));
        toast.success(t('settings.recipient_removed', { email, defaultValue: `${email} eliminado` }));
    };

    const handleSendTestReport = async () => {
        if (reportRecipients.length === 0) {
            toast.error(t('settings.no_recipients_error', { defaultValue: 'Agrega al menos un destinatario primero' }));
            return;
        }
        setSendingTestReport(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(
                `${SUPABASE_URL}/functions/v1/send-weekly-report`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({ test: true }),
                }
            );
            const result = await res.json();
            if (res.ok) {
                toast.success(t('settings.test_report_success', { defaultValue: '✅ Reporte de prueba enviado. Revisá tu casilla de correo.' }));
            } else {
                toast.error(t('settings.test_report_error', { error: result?.error || 'Error desconocido' }));
            }
        } catch (err) {
            toast.error(t('common.errors.load_error'));
        } finally {
            setSendingTestReport(false);
        }
    };


    // ── Avatar handlers ────────────────────────────────────
    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        if (!file.type.startsWith('image/')) {
            toast.error(t('settings.invalid_image', { defaultValue: 'El archivo debe ser una imagen (JPG, PNG, WEBP, etc.)' }));
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            toast.error(t('settings.image_too_large', { size: MAX_SIZE_MB, defaultValue: `La imagen no puede superar los ${MAX_SIZE_MB}MB` }));
            return;
        }

        // Local preview
        const objectUrl = URL.createObjectURL(file);
        setAvatarPreview(objectUrl);

        setUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop().toLowerCase();
            const filePath = `${user.email}/avatar.${ext}`;

            // Upload to Supabase Storage (upsert)
            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(filePath);

            // Cache-bust so the new image shows immediately
            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

            await updateAvatarUrl(publicUrl);
            toast.success(t('settings.avatar_updated', { defaultValue: '¡Foto de perfil actualizada!' }), { icon: '📸' });
        } catch (err) {
            console.error('Avatar upload error:', err);
            toast.error(t('settings.upload_error', { error: err.message || 'Error desconocido', defaultValue: 'Error al subir la imagen: ' + (err.message || 'Error desconocido') }));
            setAvatarPreview(null);
        } finally {
            setUploadingAvatar(false);
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        if (!avatarUrl) return;
        if (!window.confirm(t('settings.confirm_remove_avatar', { defaultValue: '¿Eliminar tu foto de perfil?' }))) return;

        setUploadingAvatar(true);
        try {
            // Try to remove file from storage (best effort)
            const pathMatch = avatarUrl.match(/avatares\/(.+?)(?:\?|$)/);
            if (pathMatch?.[1]) {
                await supabase.storage.from(BUCKET).remove([decodeURIComponent(pathMatch[1])]);
            }
            await updateAvatarUrl(null);
            setAvatarPreview(null);
            toast.success(t('settings.avatar_removed', { defaultValue: 'Foto de perfil eliminada' }));
        } catch (err) {
            console.error('Remove avatar error:', err);
            toast.error(t('settings.remove_avatar_error', { defaultValue: 'Error al eliminar la foto' }));
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Displayed avatar: local preview > saved URL > null (show initial)
    const displayedAvatar = avatarPreview || avatarUrl;
    const userInitial = (profileName || user?.email || '?')[0].toUpperCase();

    // ── Profile handler ────────────────────────────────────
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const trimmedName = profileName.trim();
        if (!trimmedName) { toast.error(t('settings.empty_name', { defaultValue: 'El nombre no puede estar vacío' })); return; }
        setSavingProfile(true);
        try {
            await updateProfile({ display_name: trimmedName });
            toast.success(t('settings.profile_updated', { defaultValue: 'Perfil actualizado correctamente' }));
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(t('settings.profile_error', { defaultValue: 'Error al actualizar el perfil' }));
        } finally {
            setSavingProfile(false);
        }
    };

    // ── Password handler ───────────────────────────────────
    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        const pass = newPassword.trim();
        const confirm = confirmPassword.trim();
        if (!pass) { toast.error(t('settings.empty_password', { defaultValue: 'Ingresá una nueva contraseña' })); return; }
        if (pass.length < 6) { toast.error(t('settings.password_too_short', { defaultValue: 'La contraseña debe tener al menos 6 caracteres' })); return; }
        if (pass !== confirm) { toast.error(t('settings.passwords_mismatch', { defaultValue: 'Las contraseñas no coinciden' })); return; }
        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: pass });
            if (error) throw error;
            toast.success(t('settings.password_updated', { defaultValue: 'Contraseña actualizada exitosamente' }));
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Error updating password:', error);
            toast.error(t('settings.password_error', { defaultValue: 'Error al actualizar la contraseña' }));
        } finally {
            setSavingPassword(false);
        }
    };

    // ── Grupos handlers ───────────────────────────────────
    const { data: grupos = [], isLoading: loadingGrupos } = useGrupos(empresaActiva?.id);
    const createGrupoMutation = useCreateGrupo();
    const updateGrupoMutation = useUpdateGrupo();
    const deleteGrupoMutation = useDeleteGrupo();

    const [editingGrupo, setEditingGrupo] = useState(null);
    const [grupoForm, setGrupoForm] = useState({ nombre: '', color: '#0c0c0c' });

    const handleSaveGrupo = async (e) => {
        e.preventDefault();
        if (!grupoForm.nombre.trim()) return;
        
        if (editingGrupo) {
            updateGrupoMutation.mutate({ 
                id: editingGrupo.id, 
                empresaId: empresaActiva.id, 
                ...grupoForm 
            }, {
                onSuccess: () => {
                    setEditingGrupo(null);
                    setGrupoForm({ nombre: '', color: '#0c0c0c' });
                }
            });
        } else {
            createGrupoMutation.mutate({ 
                empresaId: empresaActiva.id, 
                ...grupoForm 
            }, {
                onSuccess: () => {
                    setGrupoForm({ nombre: '', color: '#0c0c0c' });
                }
            });
        }
    };

    const handleDeleteGrupo = (id) => {
        if (isDemoMode) return;
        if (!window.confirm(t('settings.confirm_delete_group', { defaultValue: '¿Eliminar este grupo? Los clientes ya no estarán asociados a él.' }))) return;
        deleteGrupoMutation.mutate({ id, empresaId: empresaActiva.id });
    };

    const PRESET_COLORS = [
        '#0c0c0c', '#ef4444', '#10b981', '#f59e0b', 
        '#1a1a1a', '#ec4899', '#06b6d4', '#4b5563'
    ];

    return (
        <div className="container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ margin: 0 }}>{t('settings.account_config')}</h1>
                <p className="muted" style={{ margin: '8px 0 0 0' }}>{t('settings.account_config_desc')}</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* ── IDIOMA ─────────────────────────────────── */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('common.language', { defaultValue: 'Idioma' })}</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>{t('settings.language_desc', { defaultValue: 'Seleccioná tu idioma de preferencia.' })}</p>
                    </div>
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => i18n.changeLanguage('es')}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
                                    background: i18n.language.startsWith('es') ? 'var(--accent)' : 'var(--bg-body)',
                                    color: i18n.language.startsWith('es') ? '#fff' : 'var(--text-primary)',
                                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                🇪🇸 Español
                            </button>
                            <button
                                onClick={() => i18n.changeLanguage('en')}
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
                                    background: i18n.language.startsWith('en') ? 'var(--accent)' : 'var(--bg-body)',
                                    color: i18n.language.startsWith('en') ? '#fff' : 'var(--text-primary)',
                                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                🇺🇸 English
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── GESTIÓN DE PIPELINE ────────────────────── */}
                {(role === 'super-admin' || roleName === 'admin' || role === 'admin') && (
                    <section style={{ background: 'linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-card) 100%)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '12px', borderRadius: '14px', display: 'flex' }}>
                                    <Settings2 size={24} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{t('menu.groups.pipeline', { defaultValue: 'Misión y Pipeline' })}</h2>
                                    <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>{t('settings.pipeline_desc', { defaultValue: 'Personalizá los estados y etapas de tus clientes.' })}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => navigate('/configuracion/pipeline')}
                                className="btn-primary"
                                style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: 700 }}
                            >
                                {t('settings.configure_stages', { defaultValue: 'CONFIGURAR ETAPAS' })}
                            </button>
                        </div>
                    </section>
                )}

                {/* ── FOTO DE PERFIL ──────────────────────────── */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('settings.avatar')}</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>{t('settings.avatar_desc')}</p>
                    </div>

                    <div style={{ padding: '28px 24px', display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
                        {/* Avatar preview */}
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div
                                onClick={handleAvatarClick}
                                title="Cambiar foto"
                                style={{
                                    width: '90px',
                                    height: '90px',
                                    borderRadius: '20px',
                                    background: displayedAvatar ? 'transparent' : 'linear-gradient(135deg, var(--accent) 0%, #333 100%)',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.25)',
                                    border: '2px solid var(--border)',
                                    transition: 'opacity 0.2s ease',
                                    opacity: uploadingAvatar ? 0.6 : 1,
                                    position: 'relative',
                                }}
                            >
                                {displayedAvatar
                                    ? <img src={displayedAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : userInitial
                                }
                                {/* Hover overlay */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(0,0,0,0.45)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    opacity: 0, transition: 'opacity 0.2s',
                                    borderRadius: '18px',
                                }}
                                    className="avatar-overlay"
                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                >
                                    <Camera size={22} color="#fff" />
                                </div>
                            </div>

                            {/* Loading spinner overlay */}
                            {uploadingAvatar && (
                                <div style={{
                                    position: 'absolute', inset: 0, borderRadius: '20px',
                                    background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center',
                                }}>
                                    <div style={{
                                        width: '24px', height: '24px',
                                        border: '3px solid rgba(255,255,255,0.3)',
                                        borderTopColor: '#fff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.7s linear infinite',
                                    }} />
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleAvatarClick}
                                    disabled={uploadingAvatar}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '7px',
                                        padding: '9px 16px', borderRadius: '10px',
                                        border: '1px solid var(--accent)',
                                        background: 'rgba(37, 99, 235, 0.08)',
                                        color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem',
                                        cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.18s ease',
                                    }}
                                >
                                    <Camera size={15} />
                                    {t('settings.change_photo')}
                                </button>
                                {!isDemoMode && displayedAvatar && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveAvatar}
                                        disabled={uploadingAvatar}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '7px',
                                            padding: '9px 16px', borderRadius: '10px',
                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                            background: 'transparent',
                                            color: '#ef4444', fontWeight: 600, fontSize: '0.875rem',
                                            cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.18s ease',
                                        }}
                                    >
                                        <Trash2 size={15} />
                                        {t('settings.remove_photo')}
                                    </button>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {t('settings.avatar_hint', { size: MAX_SIZE_MB })}
                            </p>
                        </div>
                    </div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="avatar-file-input"
                    />
                </section>

                {/* ── PERFIL ──────────────────────────────────── */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('settings.profile')}</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>{t('settings.profile_desc')}</p>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '20px' }}>
                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>{t('settings.profile_name')}</label>
                                <input
                                    type="text"
                                    className="input premium-input"
                                    placeholder={t('settings.profile_name')}
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    style={{ width: '100%', maxWidth: '400px' }}
                                />
                            </div>

                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>{t('settings.email')}</label>
                                <input
                                    type="text"
                                    className="input premium-input"
                                    disabled
                                    value={user?.email || ''}
                                    style={{ width: '100%', maxWidth: '400px', opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'var(--bg-body)' }}
                                />
                                <small className="muted" style={{ display: 'block', marginTop: '6px' }}>{t('settings.email_desc')}</small>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <Button type="submit" variant="primary" disabled={savingProfile}>
                                    {savingProfile ? t('settings.saving') : t('settings.save_changes')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </section>

                {/* ── CONTRASEÑA ──────────────────────────────── */}
                {!isDemoMode && (
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('settings.security')}</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>{t('settings.security_desc')}</p>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <form onSubmit={handleUpdatePassword} style={{ display: 'grid', gap: '20px' }}>
                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>{t('settings.new_password')}</label>
                                <input
                                    type="password"
                                    className="input premium-input"
                                    placeholder={t('settings.new_password')}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ width: '100%', maxWidth: '400px' }}
                                />
                            </div>
                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>{t('settings.confirm_password')}</label>
                                <input
                                    type="password"
                                    className="input premium-input"
                                    placeholder={t('settings.confirm_password')}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{ width: '100%', maxWidth: '400px' }}
                                />
                            </div>
                            <div>
                                <Button type="submit" variant="primary" disabled={savingPassword}>
                                    {savingPassword ? t('settings.updating') : t('settings.update_password')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </section>
                )}

                {/* ── REPORTES AUTOMÁTICOS ──────────────────── */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--accent)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                                <Mail size={20} />
                            </div>
                             <div>
                                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('settings.reports')}</h2>
                                <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>{t('settings.reports_desc')}</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Setup notice */}
                        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '16px', display: 'flex', gap: '12px' }}>
                            <Info size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--text)' }}>{t('settings.reports_notice')}</strong><br />
                                1. {t('settings.reports_step_1')}<br />
                                2. {t('settings.reports_step_2')}<br />
                                3. {t('settings.reports_step_3')}<br />
                                4. {t('settings.reports_step_4')}
                            </div>
                        </div>

                        {/* Day Config */}
                        <div style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.95rem' }}>{t('settings.report_day')}</label>
                                <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{t('settings.report_day_desc')}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <select 
                                    className="input premium-input" 
                                    value={diaReporte} 
                                    onChange={e => handleSaveDiaReporte(e.target.value)}
                                    disabled={savingDia || isDemoMode}
                                    style={{ padding: '10px 16px', minWidth: '160px', fontWeight: 500 }}
                                >
                                    <option value={1}>{t('settings.days.1')}</option>
                                    <option value={2}>{t('settings.days.2')}</option>
                                    <option value={3}>{t('settings.days.3')}</option>
                                    <option value={4}>{t('settings.days.4')}</option>
                                    <option value={5}>{t('settings.days.5')}</option>
                                    <option value={6}>{t('settings.days.6')}</option>
                                    <option value={0}>{t('settings.days.0')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Recipients list */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, fontSize: '0.9rem' }}>{t('settings.recipients')}</label>
                            {loadingRecipients ? (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('common.loading')}</div>
                            ) : reportRecipients.length === 0 ? (
                                <div style={{ background: 'var(--bg-body)', borderRadius: '10px', padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', border: '1px dashed var(--border)' }}>
                                    {t('settings.no_recipients')}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {reportRecipients.map(r => (
                                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-body)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Mail size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                                                <span style={{ fontSize: '0.9rem' }}>{r.email}</span>
                                            </div>
                                            {!isDemoMode && (
                                                <button
                                                    onClick={() => handleRemoveRecipient(r.id, r.email)}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                                    title={t('common.delete')}
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add recipient */}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <input
                                type="email"
                                placeholder="gerente@empresa.com"
                                value={newRecipientEmail}
                                onChange={e => setNewRecipientEmail(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddRecipient()}
                                style={{ flex: 1, minWidth: '220px' }}
                                id="report-recipient-email-input"
                            />
                            {!isDemoMode && (
                                <Button variant="primary" onClick={handleAddRecipient} style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                    <Plus size={15} /> {t('settings.add_recipient')}
                                </Button>
                            )}
                        </div>

                        {/* Send test */}
                        <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                            <Button
                                variant="secondary"
                                onClick={handleSendTestReport}
                                disabled={sendingTestReport || reportRecipients.length === 0}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                id="send-test-report-btn"
                            >
                                <Send size={15} />
                                {sendingTestReport ? t('common.loading') : t('settings.test_report')}
                            </Button>
                            <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {t('settings.test_report_desc')}
                            </p>
                        </div>

                    </div>
                </section>

                {/* ── GRUPOS DE CLIENTES ─────────────────────── */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                                <Tag size={20} />
                            </div>
                             <div>
                                <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{t('settings.groups')}</h2>
                                <p className="muted" style={{ margin: '2px 0 0 0', fontSize: '0.85rem' }}>{t('settings.groups_desc')}</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <form onSubmit={handleSaveGrupo} style={{ background: 'var(--bg-body)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.group_name')}</label>
                                    <input 
                                        className="input" 
                                        placeholder={t('settings.group_name_placeholder')} 
                                        value={grupoForm.nombre}
                                        onChange={e => setGrupoForm({ ...grupoForm, nombre: e.target.value })}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div style={{ width: '160px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>{t('settings.color')}</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                        {PRESET_COLORS.map(c => (
                                            <button 
                                                key={c}
                                                type="button"
                                                onClick={() => setGrupoForm({ ...grupoForm, color: c })}
                                                style={{ 
                                                    width: '28px', height: '28px', borderRadius: '6px', 
                                                    background: c, border: grupoForm.color === c ? '2px solid #fff' : 'none',
                                                    boxShadow: grupoForm.color === c ? '0 0 0 2px var(--accent)' : 'none',
                                                    cursor: 'pointer'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Button type="submit" variant="primary" style={{ flex: 1 }}>
                                    {editingGrupo ? t('settings.update_group') : t('settings.create_group')}
                                </Button>
                                {editingGrupo && (
                                    <Button variant="secondary" onClick={() => { setEditingGrupo(null); setGrupoForm({ nombre: '', color: '#0c0c0c' }); }}>
                                        {t('common.cancel')}
                                    </Button>
                                )}
                            </div>
                        </form>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                            {loadingGrupos ? (
                                <p className="muted">{t('common.loading')}</p>
                            ) : grupos.length === 0 ? (
                                <p className="muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', border: '1px dashed var(--border)', borderRadius: '12px' }}>
                                    {t('settings.no_groups')}
                                </p>
                            ) : grupos.map(g => (
                                <div key={g.id} style={{ 
                                    padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', 
                                    background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    animation: 'page-enter 0.3s ease-out forwards'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: g.color }} />
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{g.nombre}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button 
                                            onClick={() => { setEditingGrupo(g); setGrupoForm({ nombre: g.nombre, color: g.color }); }}
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        {!isDemoMode && (
                                            <button 
                                                onClick={() => handleDeleteGrupo(g.id)}
                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── MANTENIMIENTO ───────────────────────────── */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Mantenimiento</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>Solucionar problemas de sincronización o visualización.</p>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border)' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>
                                Si no ves los últimos cambios o notas que el sistema no se actualiza, podés forzar una limpieza de caché.
                            </p>
                            <Button
                                variant="danger"
                                onClick={async () => {
                                    if (window.confirm('Esto limpiará la caché estática del navegador y reiniciará la aplicación. ¿Continuar?')) {
                                        if ('serviceWorker' in navigator) {
                                            const regs = await navigator.serviceWorker.getRegistrations();
                                            for (let r of regs) await r.unregister();
                                        }
                                        localStorage.clear();
                                        window.location.reload(true);
                                    }
                                }}
                            >
                                Limpiar Caché y Reiniciar App
                            </Button>
                        </div>
                        
                        <div style={{ background: 'rgba(34, 197, 94, 0.05)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <HardDrive size={18} style={{ color: 'var(--success)' }} />
                                <strong style={{ color: 'var(--success)' }}>Almacenamiento Offline-First Activo</strong>
                            </div>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>
                                El catálogo y la bóveda de clientes se almacenan en la memoria local de tu dispositivo para cargar al instante sin internet. Si notás lentitud por acumulación de datos o clientes duplicados, podés forzar la re-descarga del servidor.
                            </p>
                            <Button
                                variant="secondary"
                                onClick={async () => {
                                    if (window.confirm('¿Purgar y re-descargar base de datos local? Esto no afectará la nube.')) {
                                        await clearLocalClients();
                                        window.location.reload(true);
                                    }
                                }}
                            >
                                Re-sincronizar Catálogo Offline
                            </Button>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Versión de software detectada: <strong>v1.2.5-DEBUG-REFRESH</strong>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
