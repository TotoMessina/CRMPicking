import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export function ActividadRepartidorModal({ isOpen, onClose, repartidorId, repartidorNombre, onSaved }) {
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
        if (!formData.descripcion.trim()) return toast.error("La descripción es obligatoria");

        setLoading(true);

        const fechaISO = formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString();

        const payload = {
            repartidor_id: repartidorId,
            detalle: formData.descripcion.trim(),
            fecha_accion: fechaISO,
            usuario: formData.usuario.trim() || 'Sistema',
        };

        const { error } = await supabase.from("actividades_repartidores").insert([payload]);
        if (error) {
            toast.error(error.message);
        } else {
            toast.success("Actividad agregada");
            onSaved();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>Agregar actividad</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="muted" style={{ marginBottom: '16px', fontSize: '14px' }}>
                    Repartidor: {repartidorNombre} (ID: {repartidorId})
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="field">
                        <span className="field-label">Descripción *</span>
                        <textarea name="descripcion" className="input" rows="4" placeholder="Detalle de la gestión..." value={formData.descripcion} onChange={handleChange} required></textarea>
                    </label>

                    <div className="form-row-2">
                        <label className="field">
                            <span className="field-label">Fecha y hora</span>
                            <input name="fecha" className="input" type="datetime-local" value={formData.fecha} onChange={handleChange} />
                        </label>
                        <label className="field">
                            <span className="field-label">Usuario (opcional)</span>
                            <input name="usuario" className="input" type="text" placeholder="Ej: Toto / Admin" value={formData.usuario} onChange={handleChange} />
                        </label>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
