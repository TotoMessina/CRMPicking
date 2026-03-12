import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    clienteId: string | null;
    clienteNombre: string;
    onSaved: () => void;
}

interface FormData {
    descripcion: string;
    fecha: string;
    usuario: string;
}

export const ActividadClienteModal: React.FC<Props> = ({ isOpen, onClose, clienteId, clienteNombre, onSaved }) => {
    const { empresaActiva }: any = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        descripcion: '',
        fecha: '',
        usuario: ''
    });

    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            const pad = (n: number) => String(n).padStart(2, "0");
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.descripcion.trim()) return toast.error("La descripción es obligatoria");

        setLoading(true);

        const fechaISO = formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString();

        const payload = {
            cliente_id: clienteId,
            descripcion: formData.descripcion.trim(),
            fecha: fechaISO,
            usuario: formData.usuario.trim() || null,
            empresa_id: empresaActiva?.id
        };

        const { error } = await supabase.from("actividades").insert([payload]);
        const isOffline = error && (error.message === 'Failed to fetch' || error.message?.includes('fetch') || !navigator.onLine);

        if (error && !isOffline) {
            toast.error(error.message);
            setLoading(false);
            return;
        }

        toast.success(isOffline ? "Actividad agregada (Offline)" : "Actividad agregada");

        // Sync last activity on both tables
        const syncUpdates = Promise.all([
            supabase.from("clientes").update({ ultima_actividad: fechaISO }).eq("id", clienteId),
            supabase.from("empresa_cliente").update({ ultima_actividad: fechaISO }).eq("cliente_id", clienteId).eq("empresa_id", empresaActiva?.id)
        ]);

        if (isOffline) {
            syncUpdates.catch(() => {});
        } else {
            await syncUpdates;
        }

        onSaved();
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
                    Cliente: {clienteNombre} (ID: {clienteId})
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="field">
                        <span className="field-label">Descripción *</span>
                        <textarea name="descripcion" className="input" rows={4} placeholder="Detalle de la gestión..." value={formData.descripcion} onChange={handleChange} required></textarea>
                    </label>

                    <div className="form-row-2">
                        <label className="field">
                            <span className="field-label">Fecha y hora</span>
                            <input name="fecha" className="input" type="datetime-local" value={formData.fecha} onChange={handleChange} />
                        </label>
                        <label className="field">
                            <span className="field-label">Usuario</span>
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
