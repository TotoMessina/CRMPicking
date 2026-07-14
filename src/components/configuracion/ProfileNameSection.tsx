import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

export function ProfileNameSection() {
    const { t } = useTranslation();
    const { user, updateProfile } = useAuth();
    const [profileName, setProfileName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileName(user.user_metadata?.display_name || '');
        }
    }, [user]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = profileName.trim();
        if (!trimmedName) {
            toast.error(t('settings.empty_name', { defaultValue: 'El nombre no puede estar vacío' }));
            return;
        }
        setSavingProfile(true);
        try {
            await updateProfile({ display_name: trimmedName });
            toast.success(t('settings.profile_updated', { defaultValue: 'Perfil actualizado correctamente' }));
        } catch (error) {
            if (import.meta.env.DEV) {
                console.error('Error updating profile:', error);
            }
            toast.error(t('settings.profile_error', { defaultValue: 'Error al actualizar el perfil' }));
        } finally {
            setSavingProfile(false);
        }
    };

    return (
        <section className="config-section">
            <div className="config-section-header">
                <h2>{t('settings.profile')}</h2>
                <p className="config-section-header-desc">{t('settings.profile_desc')}</p>
            </div>

            <div className="config-section-body">
                <form onSubmit={handleSaveProfile} className="profile-form">
                    <div className="field">
                        <label className="profile-form-label">{t('settings.profile_name')}</label>
                        <input
                            type="text"
                            className="input premium-input profile-form-input"
                            placeholder={t('settings.profile_name')}
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                        />
                    </div>

                    <div className="field">
                        <label className="profile-form-label">{t('settings.email')}</label>
                        <input
                            type="text"
                            className="input premium-input profile-form-input disabled"
                            disabled
                            value={user?.email || ''}
                        />
                        <small className="profile-form-desc">{t('settings.email_desc')}</small>
                    </div>

                    <div style={{ marginTop: '8px' }}>
                        <Button type="submit" variant="primary" disabled={savingProfile}>
                            {savingProfile ? t('settings.saving') : t('settings.save_changes')}
                        </Button>
                    </div>
                </form>
            </div>
        </section>
    );
}
