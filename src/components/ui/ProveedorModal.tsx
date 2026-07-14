import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProveedorModalProps {
    isOpen: boolean;
    onClose: () => void;
    proveedorId?: number | null;
    onSaved: () => void;
}

export function ProveedorModal({ 
    isOpen, 
    onClose, 
    proveedorId, 
    onSaved 
}: ProveedorModalProps) {
    const { empresaActiva } = useAuth();
    const askConfirm = useConfirm();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        contacto: '',
        telefono: '',
        rubro: '',
        notas: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (proveedorId) {
                loadProveedor(proveedorId);
            } else {
                setFormData({
                    nombre: '',
                    contacto: '',
                    telefono: '',
                    rubro: '',
                    notas: ''
                });
            }
        }
    }, [isOpen, proveedorId]);

    const loadProveedor = async (id: number) => {
        setLoading(true);
        const { data, error } = await supabase.from('proveedores').select('*').eq('id', id).single();
        if (!error && data) {
            setFormData({
                nombre: data.nombre || '',
                contacto: data.contacto || '',
                telefono: data.telefono || '',
                rubro: data.rubro || '',
                notas: data.notas || ''
            });
        } else {
            toast.error("Error al cargar proveedor");
        }
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombre.trim()) return toast.error("El nombre es obligatorio");

        setLoading(true);

        const payload = {
            nombre: formData.nombre.trim(),
            contacto: formData.contacto.trim() || null,
            telefono: formData.telefono.trim() || null,
            rubro: formData.rubro.trim() || null,
            notas: formData.notas.trim() || null,
            empresa_id: empresaActiva?.id
        };

        if (proveedorId) {
            const { error } = await supabase.from('proveedores').update(payload).eq('id', proveedorId as number);
            if (error) toast.error(error.message);
            else {
                toast.success('Proveedor actualizado');
                onSaved();
            }
        } else {
            const { error } = await supabase.from('proveedores').insert([payload]);
            if (error) toast.error(error.message);
            else {
                toast.success('Proveedor creado');
                onSaved();
            }
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        const confirmed = await askConfirm({
            title: 'Eliminar proveedor',
            message: '¿Eliminar proveedor? Se ocultará de la lista.',
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            variant: 'danger'
        });
        if (!confirmed) return;

        setLoading(true);
        const { error } = await supabase.from('proveedores').update({ activo: false }).eq('id', proveedorId as number);
        if (error) toast.error("Error al eliminar");
        else {
            toast.success("Proveedor eliminado");
            onSaved();
            onClose();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open" onClick={onClose}>
            <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{proveedorId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                {loading && proveedorId ? <div style={{ opacity: 0.5 }}>Cargando datos...</div> : (
                    <form onSubmit={handleSubmit}>
                        <label className="field">
                            <span className="field-label">Nombre *</span>
                            <input name="nombre" className="input" placeholder="Ej: Distribuidora Oeste" value={formData.nombre} onChange={handleChange} required />
                        </label>

                        <label className="field">
                            <span className="field-label">Contacto</span>
                            <input name="contacto" className="input" placeholder="Nombre del vendedor" value={formData.contacto} onChange={handleChange} />
                        </label>

                        <label className="field">
                            <span className="field-label">Teléfono</span>
                            <input name="telefono" className="input" value={formData.telefono} onChange={handleChange} />
                        </label>

                        <label className="field">
                            <span className="field-label">Rubro</span>
                            <input name="rubro" className="input" value={formData.rubro} onChange={handleChange} />
                        </label>

                        <label className="field">
                            <span className="field-label">Notas</span>
                            <textarea name="notas" className="input" rows={3} value={formData.notas} onChange={handleChange}></textarea>
                        </label>

                        <div className="modal-actions">
                            {proveedorId && (
                                <button type="button" onClick={handleDelete} className="btn-danger-outline" style={{ marginRight: 'auto' }} disabled={loading}>
                                    Eliminar
                                </button>
                            )}
                            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                            <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
}
