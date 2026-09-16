import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, MessageSquare, Phone, MapPin, Tag } from 'lucide-react';
import { Button } from './Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ActividadDistribuidorModalProps {
    isOpen: boolean;
    onClose: () => void;
    distribuidorId: number | string | null;
    distribuidorNombre: string;
    onSaved: () => void;
}

export const ActividadDistribuidorModal: React.FC<ActividadDistribuidorModalProps> = ({
    isOpen,
    onClose,
    distribuidorId,
    distribuidorNombre,
    onSaved
}) => {
    const { empresaActiva } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        descripcion: '',
        fecha: '',
        tipo: 'Nota',
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
                tipo: 'Nota',
                usuario: ''
            });

            // Usuario conectado
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                    const name = session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || '';
                    setFormData(prev => ({ ...prev, usuario: name }));
                }
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.descripcion.trim()) {
            return toast.error('La descripción de la actividad es requerida');
        }
        if (!empresaActiva?.id) {
            return toast.error('No se detectó empresa activa');
        }
        if (!distribuidorId) {
            return toast.error('No se especificó distribuidor');
        }

        setLoading(true);
        try {
            const fechaISO = formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString();

            const payload = {
                distribuidor_id: Number(distribuidorId),
                tipo: formData.tipo || 'Nota',
                descripcion: formData.descripcion.trim(),
                fecha: fechaISO,
                usuario: formData.usuario.trim() || 'Sistema',
                empresa_id: empresaActiva.id
            };

            const { error } = await supabase
                .from('actividades_distribuidores')
                .insert([payload]);

            if (error) throw error;

            toast.success('Actividad registrada correctamente');
            onSaved();
            onClose();
        } catch (err: any) {
            console.error('Error al registrar actividad:', err);
            toast.error(err.message || 'Error al guardar la actividad');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="modal is-open" onClick={onClose} style={{ zIndex: 9999 }}>
            <div 
                className="modal-content modal-sm" 
                onClick={e => e.stopPropagation()}
                style={{ maxWidth: '520px', width: '90%', padding: '24px', borderRadius: '18px' }}
            >
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Nueva Actividad / Seguimiento</h3>
                    <button className="modal-close" type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="muted" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                    Distribuidor: <strong>{distribuidorNombre}</strong>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                Tipo de Actividad
                            </label>
                            <select
                                name="tipo"
                                value={formData.tipo}
                                onChange={handleChange}
                                className="input"
                                style={{ width: '100%' }}
                            >
                                <option value="Nota">📝 Nota Comercial</option>
                                <option value="Llamada">📞 Llamada Telefónica</option>
                                <option value="Visita">📍 Visita Presencial</option>
                                <option value="Reunión">🤝 Reunión / Negociación</option>
                                <option value="WhatsApp">💬 Mensaje WhatsApp</option>
                                <option value="Email">✉️ Correo Electrónico</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                                Operador / Usuario
                            </label>
                            <input
                                type="text"
                                name="usuario"
                                value={formData.usuario}
                                onChange={handleChange}
                                placeholder="Tu nombre"
                                className="input"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                            Fecha y Hora
                        </label>
                        <input
                            type="datetime-local"
                            name="fecha"
                            value={formData.fecha}
                            onChange={handleChange}
                            className="input"
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                            Detalle de la Actividad / Novedad <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                            name="descripcion"
                            rows={4}
                            value={formData.descripcion}
                            onChange={handleChange}
                            placeholder="Describí qué se conversó, compromisos, pedidos, cotizaciones acordadas..."
                            className="input"
                            style={{ width: '100%', resize: 'vertical' }}
                            required
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                        <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Actividad'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
