import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function Configuracion() {
    const { user, updateProfile } = useAuth();

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

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const trimmedName = profileName.trim();

        if (!trimmedName) {
            toast.error('El nombre no puede estar vacío');
            return;
        }

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

    const handleUpdatePassword = async (e) => {
        e.preventDefault();

        const pass = newPassword.trim();
        const confirm = confirmPassword.trim();

        if (!pass) {
            toast.error('Ingresá una nueva contraseña');
            return;
        }
        if (pass.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (pass !== confirm) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: pass
            });

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

                {/* Perfil */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Perfil</h2>
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

                {/* Seguridad */}
                <section style={{ background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Seguridad</h2>
                        <p className="muted" style={{ margin: '4px 0 0 0', fontSize: '0.9rem' }}>Actualizar tu contraseña de acceso.</p>
                    </div>

                    <div style={{ padding: '24px' }}>
                        <form onSubmit={handleUpdatePassword} style={{ display: 'grid', gap: '20px' }}>
                            <div className="field">
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Nueva Contraseña</label>
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
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Repítela para confirmar"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={{ width: '100%', maxWidth: '400px' }}
                                />
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <Button type="submit" variant="secondary" disabled={savingPassword}>
                                    {savingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </section>

            </div>
        </div>
    );
}
