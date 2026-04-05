import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Trash2 } from 'lucide-react';

const BUCKET = 'avatares';
const MAX_SIZE_MB = 2;

export default function Configuracion() {
    const { user, avatarUrl, updateProfile, updateAvatarUrl } = useAuth();
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

    useEffect(() => {
        if (user) {
            setProfileName(user.user_metadata?.display_name || '');
        }
    }, [user]);

    // ── Avatar handlers ────────────────────────────────────
    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        if (!file.type.startsWith('image/')) {
            toast.error('El archivo debe ser una imagen (JPG, PNG, WEBP, etc.)');
            return;
        }

        // Validate size
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            toast.error(`La imagen no puede superar los ${MAX_SIZE_MB}MB`);
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
            toast.success('¡Foto de perfil actualizada!', { icon: '📸' });
        } catch (err) {
            console.error('Avatar upload error:', err);
            toast.error('Error al subir la imagen: ' + (err.message || 'Error desconocido'));
            setAvatarPreview(null);
        } finally {
            setUploadingAvatar(false);
            // Reset input so same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        if (!avatarUrl) return;
        if (!window.confirm('¿Eliminar tu foto de perfil?')) return;

        setUploadingAvatar(true);
        try {
            // Try to remove file from storage (best effort)
            const pathMatch = avatarUrl.match(/avatares\/(.+?)(?:\?|$)/);
            if (pathMatch?.[1]) {
                await supabase.storage.from(BUCKET).remove([decodeURIComponent(pathMatch[1])]);
            }
            await updateAvatarUrl(null);
            setAvatarPreview(null);
            toast.success('Foto de perfil eliminada');
        } catch (err) {
            console.error('Remove avatar error:', err);
            toast.error('Error al eliminar la foto');
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
        if (!trimmedName) { toast.error('El nombre no puede estar vacío'); return; }
        setSavingProfile(true);
        try {
            await updateProfile({ display_name: trimmedName });
            toast.success('Perfil actualizado correctamente');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Error al actualizar el perfil');
        } finally {
            setSavingProfile(false);
        }
    };

    // ── Password handler ───────────────────────────────────
    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        const pass = newPassword.trim();
        const confirm = confirmPassword.trim();
        if (!pass) { toast.error('Ingresá una nueva contraseña'); return; }
        if (pass.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
        if (pass !== confirm) { toast.error('Las contraseñas no coinciden'); return; }
        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: pass });
            if (error) throw error;
            toast.success('Contraseña actualizada exitosamente');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            console.error('Error updating password:', error);
            toast.error('Error al actualizar la contraseña');
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <div className="container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ margin: 0 }}>Configuración de Cuenta</h1>
                <p className="muted" style={{ margin: '8px 0 0 0' }}>Administra tu perfil y opciones de seguridad.</p>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* ── FOTO DE PERFIL ──────────────────────────── */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Foto de Perfil</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>Se muestra en el sidebar y en tu perfil de usuario.</p>
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
                                    background: displayedAvatar ? 'transparent' : 'linear-gradient(135deg, var(--accent) 0%, #7c3aed 100%)',
                                    display: 'grid',
                                    placeItems: 'center',
                                    fontSize: '2rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.25)',
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
                                    {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
                                </button>

                                {(displayedAvatar) && (
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
                                        Eliminar foto
                                    </button>
                                )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                JPG, PNG, WEBP o GIF. Máximo {MAX_SIZE_MB}MB.
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
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Perfil</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>Información pública de tu cuenta.</p>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: '20px' }}>
                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nombre de usuario</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Tu nombre"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    style={{ width: '100%', maxWidth: '400px' }}
                                />
                            </div>

                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Email</label>
                                <input
                                    type="text"
                                    className="input"
                                    disabled
                                    value={user?.email || ''}
                                    style={{ width: '100%', maxWidth: '400px', opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'var(--bg-body)' }}
                                />
                                <small className="muted" style={{ display: 'block', marginTop: '6px' }}>El email no se puede cambiar directamente.</small>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <Button type="submit" variant="primary" disabled={savingProfile}>
                                    {savingProfile ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </section>

                {/* ── CONTRASEÑA ──────────────────────────────── */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Seguridad</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>Cambiá tu contraseña de acceso.</p>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <form onSubmit={handleUpdatePassword} style={{ display: 'grid', gap: '20px' }}>
                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nueva contraseña</label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Mínimo 6 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={{ width: '100%', maxWidth: '400px' }}
                                />
                            </div>
                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Confirmar contraseña</label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Repetí la contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{ width: '100%', maxWidth: '400px' }}
                                />
                            </div>
                            <div>
                                <Button type="submit" variant="primary" disabled={savingPassword}>
                                    {savingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                                </Button>
                            </div>
                        </form>
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
                                    if (window.confirm('Esto limpiará la caché del navegador y reiniciará la aplicación. ¿Continuar?')) {
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
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Versión de software detectada: <strong>v1.2.5-DEBUG-REFRESH</strong>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
