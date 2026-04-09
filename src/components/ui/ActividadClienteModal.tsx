import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { X, AlertCircle, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { compressImage } from '../../lib/imageCompression';


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
    const [isDirty, setIsDirty] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        descripcion: '',
        fecha: '',
        usuario: ''
    });

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);


    const handleClose = () => {
        if (isDirty) {
            setShowConfirm(true);
            return;
        }
        setIsDirty(false);
        onClose();
    };

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
            setIsDirty(false);
            setSelectedImage(null);
            setImagePreview(null);
            setUploadingImage(false);
        }
    }, [isOpen]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Por favor selecciona una imagen válida');
                return;
            }
            setSelectedImage(file);
            setImagePreview(URL.createObjectURL(file));
            setIsDirty(true);
        }
    };

    const removeImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.descripcion.trim()) return toast.error("La descripción es obligatoria");
        if (!empresaActiva?.id) return toast.error("No se detectó la empresa activa. Recargá la página.");
        if (!clienteId) return toast.error("Error: ID de cliente no detectado.");

        setLoading(true);

        try {
            let uploadedImageUrl = null;

            // 1. Upload image if selected
            if (selectedImage) {
                setUploadingImage(true);
                try {
                    // Compress before upload
                    const compressedBlob = await compressImage(selectedImage, { maxWidth: 1024, quality: 0.7 });
                    
                    const fileExt = 'jpg'; // Always jpg from compressor
                    const fileName = `${clienteId}/${Date.now()}_actividad.${fileExt}`;
                    const filePath = `actividades/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('actividades_fotos')
                        .upload(filePath, compressedBlob, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    if (uploadError) throw uploadError;

                    const { data: { publicUrl } } = supabase.storage
                        .from('actividades_fotos')
                        .getPublicUrl(filePath);
                    
                    uploadedImageUrl = publicUrl;
                } catch (imgErr: any) {
                    console.error("Error al subir imagen:", imgErr);
                    toast.error("No se pudo subir la foto, pero intentaremos guardar la nota.");
                } finally {
                    setUploadingImage(false);
                }
            }

            const fechaISO = formData.fecha ? new Date(formData.fecha).toISOString() : new Date().toISOString();

            const payload = {
                cliente_id: Number(clienteId),
                descripcion: formData.descripcion.trim(),
                fecha: fechaISO,
                usuario: formData.usuario.trim() || null,
                empresa_id: empresaActiva.id,
                foto_url: uploadedImageUrl
            };

            const { error } = await supabase.from("actividades").insert([payload]);
            const isOffline = error && (error.message === 'Failed to fetch' || error.message?.includes('fetch') || !navigator.onLine);

            if (error && !isOffline) {
                console.error("Supabase insert error:", error);
                toast.error(`Error de base de datos: ${error.message}`);
                return; // Finally will clear loading
            }

            toast.success(isOffline ? "Actividad agregada (Offline)" : "Actividad agregada");

            // Sync last activity on both tables
            const syncUpdates = Promise.all([
                supabase.from("clientes").update({ ultima_actividad: fechaISO }).eq("id", clienteId),
                supabase.from("empresa_cliente").update({ ultima_actividad: fechaISO }).eq("cliente_id", clienteId).eq("empresa_id", empresaActiva.id)
            ]);

            if (isOffline) {
                syncUpdates.catch((err) => console.warn("Offline sync update catch:", err));
            } else {
                await syncUpdates;
            }

            setIsDirty(false);
            onSaved();
            onClose(); // Auto-close on success
        } catch (err: any) {
            console.error("ActividadClienteModal - Uncaught handleSubmit Error:", err);
            toast.error("Ocurrió un error inesperado al guardar la actividad.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`modal ${isOpen ? 'is-open' : ''}`} onClick={(e) => (e.target as HTMLElement).classList.contains('modal') && handleClose()}>
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3>Agregar actividad</h3>
                    <button className="modal-close" type="button" onClick={handleClose}><X size={20} /></button>
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

                    <div className="field" style={{ marginTop: '16px' }}>
                        <span className="field-label">Adjuntar foto (opcional)</span>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginTop: '8px' }}>
                            {!imagePreview ? (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        width: '100px', height: '100px', borderRadius: '12px', border: '2px dashed var(--border)',
                                        background: 'rgba(255,255,255,0.03)', cursor: 'pointer', gap: '8px', color: 'var(--text-muted)',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <Camera size={24} />
                                    <span style={{ fontSize: '12px' }}>Añadir foto</span>
                                </button>
                            ) : (
                                <div style={{ position: 'relative', width: '100px', height: '100px' }}>
                                    <img 
                                        src={imagePreview} 
                                        alt="Preview" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--border)' }} 
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        style={{
                                            position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff',
                                            width: '24px', height: '24px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                            
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageSelect}
                                style={{ display: 'none' }}
                            />
                            
                            {imagePreview && (
                                <div style={{ flex: 1, fontSize: '13px', color: 'var(--text-muted)', paddingTop: '4px' }}>
                                    <p style={{ margin: '0 0 4px' }}>Imagen seleccionada: <strong>{selectedImage?.name}</strong></p>
                                    <p style={{ margin: '0' }}>Se comprimirá automáticamente antes de guardar.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '24px' }}>
                        <Button variant="secondary" type="button" onClick={handleClose}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={loading || uploadingImage}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                    </div>
                </form>
            </div>

            {showConfirm && (
                <div className="modal is-open" style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(5px)' }}>
                    <div className="modal-content" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '32px 24px', position: 'relative' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem' }}>¿Descartar cambios?</h3>
                        <p className="muted" style={{ margin: '0 0 24px', fontSize: '1rem', lineHeight: 1.5 }}>Escribiste una descripción sin guardar. Si sales ahora, se perderá tu nota.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Button variant="secondary" onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '12px' }}>
                                Seguir editando
                            </Button>
                            <button
                                type="button"
                                style={{
                                    flex: 1, padding: '12px', borderRadius: '10px', fontWeight: 600, fontSize: '0.95rem',
                                    background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
                                }}
                                onClick={() => { setShowConfirm(false); setIsDirty(false); onClose(); }}
                            >
                                Sí, descartar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}
