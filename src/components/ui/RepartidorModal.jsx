import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

export function RepartidorModal({ isOpen, onClose, repartidorId, initialLocation, onSaved }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '', telefono: '', email: '', localidad: '', direccion: '',
        estado: 'Documentación sin gestionar', responsable: '', notas: '', created_at: '',
        lat: null, lng: null
    });

    useEffect(() => {
        if (isOpen) {
            if (repartidorId) {
                loadRepartidor(repartidorId);
            } else {
                setFormData({
                    nombre: '', telefono: '', email: '', localidad: '', direccion: '',
                    estado: 'Documentación sin gestionar', responsable: '', notas: '', created_at: '',
                    lat: initialLocation ? initialLocation.lat : null,
                    lng: initialLocation ? initialLocation.lng : null
                });
            }
        }
    }, [isOpen, repartidorId]);

    const loadRepartidor = async (id) => {
        setLoading(true);
        const { data, error } = await supabase.from('repartidores').select('*').eq('id', id).single();
        if (!error && data) {
            let createdAtFmt = '';
            if (data.created_at) {
                const d = new Date(data.created_at);
                const pad = (n) => String(n).padStart(2, "0");
                createdAtFmt = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            }

            setFormData({
                nombre: data.nombre || '',
                telefono: data.telefono || '',
                email: data.email || '',
                localidad: data.localidad || '',
                direccion: data.direccion || '',
                estado: data.estado || 'Documentación sin gestionar',
                responsable: data.responsable || '',
                notas: data.notas || '',
                created_at: createdAtFmt
            });
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre) return toast.error("El nombre es obligatorio");

        setLoading(true);
        const user = (await supabase.auth.getSession()).data.session?.user;
        const nombreAuth = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Sistema';

        let createdAtVal = formData.created_at ? new Date(formData.created_at).toISOString() : null;

        const payload = {
            nombre: formData.nombre,
            telefono: formData.telefono || null,
            email: formData.email || null,
            localidad: formData.localidad || null,
            direccion: formData.direccion || null,
            estado: formData.estado || 'Documentación sin gestionar',
            responsable: formData.responsable || null,
            notas: formData.notas || null
        };

        if (createdAtVal) {
            payload.created_at = createdAtVal;
        }

        if (initialLocation && !repartidorId) {
            payload.lat = initialLocation.lat;
            payload.lng = initialLocation.lng;
        }

        if (repartidorId) {
            const { error } = await supabase.from('repartidores').update(payload).eq('id', repartidorId);
            if (error) toast.error(error.message);
            else {
                toast.success('Repartidor actualizado');
                await supabase.from('actividades_repartidores').insert([{
                    repartidor_id: repartidorId,
                    detalle: 'Repartidor actualizado',
                    usuario: nombreAuth,
                    fecha_accion: new Date().toISOString()
                }]);
                onSaved();
            }
        } else {
            const { data, error } = await supabase.from('repartidores').insert([payload]).select().single();
            if (error) toast.error(error.message);
            else {
                toast.success('Repartidor creado');
                await supabase.from('actividades_repartidores').insert([{
                    repartidor_id: data.id,
                    detalle: 'Repartidor creado',
                    usuario: nombreAuth,
                    fecha_accion: new Date().toISOString()
                }]);
                onSaved();
            }
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal is-open">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>{repartidorId ? 'Editar repartidor' : 'Nuevo repartidor'}</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                {loading && repartidorId ? <div style={{ opacity: 0.5 }}>Cargando datos...</div> : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Nombre *</span>
                                <input name="nombre" className="input" value={formData.nombre} onChange={handleChange} required />
                            </label>
                            <label className="field">
                                <span className="field-label">Teléfono</span>
                                <input name="telefono" className="input" value={formData.telefono} onChange={handleChange} />
                            </label>
                        </div>

                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Email</span>
                                <input name="email" type="email" className="input" value={formData.email} onChange={handleChange} />
                            </label>
                            <label className="field">
                                <span className="field-label">Localidad</span>
                                <input name="localidad" className="input" value={formData.localidad} onChange={handleChange} />
                            </label>
                        </div>

                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Dirección</span>
                                <input name="direccion" className="input" value={formData.direccion} onChange={handleChange} />
                            </label>
                            <label className="field">
                                <span className="field-label">Estado</span>
                                <select name="estado" className="input" value={formData.estado} onChange={handleChange}>
                                    <option value="Documentación sin gestionar">Documentación sin gestionar</option>
                                    <option value="Cuenta aun no confirmada">Cuenta aun no confirmada</option>
                                    <option value="Cuenta confirmada y repartiendo">Cuenta confirmada y repartiendo</option>
                                </select>
                            </label>
                        </div>

                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Responsable</span>
                                <select name="responsable" className="input" value={formData.responsable} onChange={handleChange}>
                                    <option value="">Sin responsable</option>
                                    <option value="Toto">Toto</option>
                                    <option value="Ruben">Ruben</option>
                                    <option value="Tincho(B)">Tincho(B)</option>
                                    <option value="Fran">Fran</option>
                                    <option value="Ari">Ari</option>
                                    <option value="Nati">Nati</option>
                                    <option value="Dani">Dani</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </label>
                            <div></div>
                        </div>

                        <label className="field">
                            <span className="field-label">Notas</span>
                            <textarea name="notas" className="input" rows="3" value={formData.notas} onChange={handleChange}></textarea>
                        </label>

                        <div className="field" style={{ marginTop: '10px' }}>
                            <label className="form__label">Fecha de Alta (Opcional)</label>
                            <input name="created_at" className="input" type="datetime-local" value={formData.created_at} onChange={handleChange} />
                            <small className="muted" style={{ fontSize: '0.75rem' }}>Modificar solo si es necesario corregir la fecha de ingreso.</small>
                        </div>

                        <div className="modal-actions" style={{ marginTop: '24px' }}>
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
