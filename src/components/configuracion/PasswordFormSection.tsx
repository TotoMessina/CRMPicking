import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

export function PasswordFormSection() {
    const { t } = useTranslation();
    const { isDemoMode } = useAuth();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const pass = newPassword.trim();
        const confirm = confirmPassword.trim();
        if (!pass) {
            toast.error(t('settings.empty_password', { defaultValue: 'Ingresá una nueva contraseña' }));
            return;
        }
        if (pass.length < 6) {
            toast.error(t('settings.password_too_short', { defaultValue: 'La contraseña debe tener al menos 6 caracteres' }));
            return;
        }
        if (pass !== confirm) {
            toast.error(t('settings.passwords_mismatch', { defaultValue: 'Las contraseñas no coinciden' }));
            return;
        }
        setSavingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: pass });
            if (error) throw error;
            toast.success(t('settings.password_updated', { defaultValue: 'Contraseña actualizada exitosamente' }));
            setNewPassword('');
            setConfirmPassword('');
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Error updating password:', error);
            }
            toast.error(t('settings.password_error', { defaultValue: 'Error al actualizar la contraseña' }));
        } finally {
            setSavingPassword(false);
        }
    };

    if (isDemoMode) return null;

    return (
        <section className="config-section">
            <div className="config-section-header">
                <h2>{t('settings.security')}</h2>
                <p className="config-section-header-desc">{t('settings.security_desc')}</p>
            </div>

            <div className="config-section-body">
                <form onSubmit={handleUpdatePassword} className="profile-form">
                    <div className="field">
                        <label className="profile-form-label">{t('settings.new_password')}</label>
                        <input
                            type="password"
                            className="input premium-input profile-form-input"
                            placeholder={t('settings.new_password')}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label className="profile-form-label">{t('settings.confirm_password')}</label>
                        <input
                            type="password"
                            className="input premium-input profile-form-input"
                            placeholder={t('settings.confirm_password')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
    );
}
