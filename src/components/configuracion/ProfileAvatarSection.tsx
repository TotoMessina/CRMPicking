import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Camera, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const BUCKET = 'avatares';
const MAX_SIZE_MB = 2;

export function ProfileAvatarSection() {
    const { t } = useTranslation();
    const { user, avatarUrl, updateAvatarUrl, isDemoMode } = useAuth();
    const askConfirm = useConfirm();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const handleAvatarClick = () => fileInputRef.current?.click();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user?.email) return;

        if (!file.type.startsWith('image/')) {
            toast.error(t('settings.invalid_image', { defaultValue: 'El archivo debe ser una imagen (JPG, PNG, WEBP, etc.)' }));
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            toast.error(t('settings.image_too_large', { size: MAX_SIZE_MB, defaultValue: `La imagen no puede superar los ${MAX_SIZE_MB}MB` }));
            return;
        }

        const objectUrl = URL.createObjectURL(file);
        setAvatarPreview(objectUrl);

        setUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const filePath = `${user.email}/avatar.${ext}`;

            const { error: uploadError } = await supabase.storage
                .from(BUCKET)
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from(BUCKET)
                .getPublicUrl(filePath);

            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

            await updateAvatarUrl(publicUrl);
            toast.success(t('settings.avatar_updated', { defaultValue: '¡Foto de perfil actualizada!' }), { icon: '📸' });
        } catch (err: any) {
            if (import.meta.env.DEV) {
                console.error('Avatar upload error:', err);
            }
            toast.error(t('settings.upload_error', { error: err.message || 'Error desconocido', defaultValue: 'Error al subir la imagen: ' + (err.message || 'Error desconocido') }));
            setAvatarPreview(null);
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        if (!avatarUrl) return;
        const confirmed = await askConfirm({
            title: t('settings.remove_avatar_title', { defaultValue: 'Eliminar avatar' }),
            message: t('settings.confirm_remove_avatar', { defaultValue: '¿Eliminar tu foto de perfil?' }),
            confirmText: t('common.actions.delete', { defaultValue: 'Eliminar' }),
            cancelText: t('common.actions.cancel', { defaultValue: 'Cancelar' }),
            variant: 'danger'
        });
        if (!confirmed) return;

        setUploadingAvatar(true);
        try {
            const pathMatch = avatarUrl.match(/avatares\/(.+?)(?:\?|$)/);
            if (pathMatch?.[1]) {
                await supabase.storage.from(BUCKET).remove([decodeURIComponent(pathMatch[1])]);
            }
            await (updateAvatarUrl as any)(null);
            setAvatarPreview(null);
            toast.success(t('settings.avatar_removed', { defaultValue: 'Foto de perfil eliminada' }));
        } catch (err) {
            if (import.meta.env.DEV) {
                console.error('Remove avatar error:', err);
            }
            toast.error(t('settings.remove_avatar_error', { defaultValue: 'Error al eliminar la foto' }));
        } finally {
            setUploadingAvatar(false);
        }
    };

    const displayedAvatar = avatarPreview || avatarUrl;
    const userInitial = (user?.user_metadata?.display_name || user?.email || '?')[0].toUpperCase();

    return (
        <section className="config-section">
            <div className="config-section-header">
                <h2>{t('settings.avatar')}</h2>
                <p className="config-section-header-desc">{t('settings.avatar_desc')}</p>
            </div>

            <div className="config-section-body avatar-padding avatar-settings-body">
                <div className="avatar-preview-container">
                    <div
                        onClick={handleAvatarClick}
                        title="Cambiar foto"
                        className="avatar-image-frame"
                        style={{
                            background: displayedAvatar ? 'transparent' : 'linear-gradient(135deg, var(--accent) 0%, #333 100%)',
                            opacity: uploadingAvatar ? 0.6 : 1,
                        }}
                    >
                        {displayedAvatar ? (
                            <img src={displayedAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span className="avatar-initials-fallback">{userInitial}</span>
                        )}
                        <div className="avatar-upload-overlay">
                            <Camera size={22} color="#fff" />
                        </div>
                    </div>

                    {uploadingAvatar && (
                        <div className="avatar-upload-overlay" style={{ background: 'rgba(0,0,0,0.5)' }}>
                            <div className="avatar-spinner" />
                        </div>
                    )}
                </div>

                <div className="avatar-presets-group">
                    <div className="avatar-presets-row">
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            disabled={uploadingAvatar}
                            className="avatar-emoji-btn active"
                            style={{ display: 'flex', alignItems: 'center', gap: '7px' }}
                        >
                            <Camera size={15} />
                            {t('settings.change_photo')}
                        </button>
                        {!isDemoMode && displayedAvatar && (
                            <button
                                type="button"
                                onClick={handleRemoveAvatar}
                                disabled={uploadingAvatar}
                                className="avatar-emoji-btn"
                                style={{ display: 'flex', alignItems: 'center', gap: '7px', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                            >
                                <Trash2 size={15} />
                                {t('settings.remove_photo')}
                            </button>
                        )}
                    </div>
                    <p className="avatar-limits-desc">
                        {t('settings.avatar_hint', { size: MAX_SIZE_MB })}
                    </p>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="avatar-file-input"
            />
        </section>
    );
}
