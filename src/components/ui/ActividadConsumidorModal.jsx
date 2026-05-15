import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export function ActividadConsumidorModal({ isOpen, onClose, consumidorId, consumidorNombre, onSaved }) {
    const { t } = useTranslation();
    const { empresaActiva } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        descripcion: '',
        fecha: '',
        usuario: ''
    });

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, "0");
            const localDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

            setFormData({
                descripcion: '',
                fecha: localDateTime,
                usuario: ''
            });

            // Set default user
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                    const name = session.user.user_metadata?.nombre || session.user.email?.split('@')[0];
                    setFormData(prev => ({ ...prev, usuario: name }));
                }
            });
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.descripcion.trim()) return toast.error(t('consumers.activity.error_description'));
        if (!empresaActiva?.id) return toast.error(t('common.errors.no_company'));

        setLoading(true);

        const fechaISO = formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString();

        const payload = {
            consumidor_id: consumidorId,
            descripcion: formData.descripcion.trim(),
            fecha: fechaISO,
            usuario: formData.usuario.trim() || null,
            empresa_id: empresaActiva.id
        };

        const { error } = await supabase.from("actividades_consumidores").insert([payload]);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success(t('consumers.activity.success'));

            // Sync last activity on main table ignoring errors
            await supabase.from("consumidores").update({ ultima_actividad: fechaISO }).eq("id", consumidorId);

            onSaved();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>{t('consumers.activity.add_title')}</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="muted" style={{ marginBottom: '16px', fontSize: '14px' }}>
                    {t('consumers.activity.consumer')}: {consumidorNombre} (ID: {consumidorId})
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="field">
                        <span className="field-label">{t('consumers.activity.description')} *</span>
                        <textarea name="descripcion" className="input" rows="4" placeholder={t('consumers.activity.description_placeholder')} value={formData.descripcion} onChange={handleChange} required></textarea>
                    </label>

                    <div className="form-row-2">
                        <label className="field">
                            <span className="field-label">{t('consumers.activity.date')}</span>
                            <input name="fecha" className="input" type="datetime-local" value={formData.fecha} onChange={handleChange} />
                        </label>
                        <label className="field">
                            <span className="field-label">{t('consumers.activity.user')}</span>
                            <input name="usuario" className="input" type="text" placeholder="Ej: Toto / Admin" value={formData.usuario} onChange={handleChange} />
                        </label>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        <Button variant="secondary" type="button" onClick={onClose}>{t('common.cancel')}</Button>
                        <Button variant="primary" type="submit" disabled={loading}>{loading ? t('common.saving') : t('common.save')}</Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
