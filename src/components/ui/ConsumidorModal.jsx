import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCompanyUsers } from '../../hooks/useCompanyUsers';
import { Button } from './Button';
import { X, MapPin, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { geocodeAddress } from '../../lib/googleMaps';

export function ConsumidorModal({ isOpen, onClose, consumidorId, onSaved, initialLatLng }) {
    const { empresaActiva } = useAuth();
    const { data: responsablesDB = [] } = useCompanyUsers(empresaActiva?.id);
    const [loading, setLoading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '', telefono: '', mail: '', localidad: '', barrio: '',
        edad: '', genero: '', estado: 'Lead', responsable: '',
        fecha_proximo_contacto: '', hora_proximo_contacto: '', notas: '',
        lat: null, lng: null
    });

    useEffect(() => {
        if (isOpen) {
            if (consumidorId) {
                loadConsumidor(consumidorId);
            } else {
                setFormData({
                    nombre: '', telefono: '', mail: '', localidad: '', barrio: '',
                    edad: '', genero: '', estado: 'Lead', responsable: '',
                    fecha_proximo_contacto: '', hora_proximo_contacto: '', notas: '',
                    lat: initialLatLng?.lat || null,
                    lng: initialLatLng?.lng || null
                });
            }
        }
    }, [isOpen, consumidorId, initialLatLng]);

    const loadConsumidor = async (id) => {
        setLoading(true);
        const { data, error } = await supabase.from('consumidores').select('*').eq('id', id).single();
        if (!error && data) {
            setFormData({
                nombre: data.nombre || '',
                telefono: data.telefono || '',
                mail: data.mail || '',
                localidad: data.localidad || '',
                barrio: data.barrio || '',
                edad: data.edad || '',
                genero: data.genero || '',
                estado: data.estado || 'Lead',
                responsable: data.responsable || '',
                fecha_proximo_contacto: data.fecha_proximo_contacto || '',
                hora_proximo_contacto: data.hora_proximo_contacto ? data.hora_proximo_contacto.slice(0, 5) : '',
                notas: data.notas || '',
                lat: data.lat || null,
                lng: data.lng || null
            });
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGeocode = async () => {
        const searchAddress = `${formData.barrio || ''} ${formData.localidad || ''}`.trim();
        if (!searchAddress) {
            toast.error('Ingresá localidad o barrio para buscar.');
            return;
        }

        setIsGeocoding(true);
        const toastId = toast.loading('Buscando ubicación...');

        try {
            const coords = await geocodeAddress(searchAddress);
            if (coords) {
                setFormData(prev => ({
                    ...prev,
                    lat: coords.lat,
                    lng: coords.lng
                }));
                toast.success('Ubicación encontrada.', { id: toastId });
            } else {
                toast.error('No se pudo encontrar la ubicación exacta.', { id: toastId });
            }
        } catch (error) {
            toast.error('Error al conectar con el servicio de mapas.', { id: toastId });
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.nombre) return toast.error("El nombre es obligatorio");

        setLoading(true);
        const user = (await supabase.auth.getSession()).data.session?.user;
        const nombreAuth = user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Unknown';

        const payload = {
            ...formData,
            edad: formData.edad ? Number(formData.edad) : null,
            hora_proximo_contacto: formData.hora_proximo_contacto ? formData.hora_proximo_contacto + ':00' : null,
            telefono: formData.telefono || null,
            mail: formData.mail || null,
            localidad: formData.localidad || null,
            barrio: formData.barrio || null,
            genero: formData.genero || null,
            responsable: formData.responsable || null,
            fecha_proximo_contacto: formData.fecha_proximo_contacto || null,
            notas: formData.notas || null,
            lat: formData.lat || null,
            lng: formData.lng || null,
            empresa_id: empresaActiva?.id
        };

        if (consumidorId) {
            const { error } = await supabase.from('consumidores').update(payload).eq('id', consumidorId);
            if (error) toast.error(error.message);
            else {
                toast.success('Consumidor actualizado');
                // Activity sync
                await supabase.from('actividades').insert([{
                    consumidor_id: consumidorId,
                    empresa_id: empresaActiva?.id,
                    descripcion: 'Consumidor actualizado',
                    usuario: nombreAuth,
                    user_id: user?.id
                }]);
                onSaved();
            }
        } else {
            const { data, error } = await supabase.from('consumidores').insert([payload]).select().single();
            if (error) toast.error(error.message);
            else {
                toast.success('Consumidor creado');
                await supabase.from('actividades').insert([{
                    consumidor_id: data.id,
                    empresa_id: empresaActiva?.id,
                    descripcion: 'Consumidor creado',
                    usuario: nombreAuth,
                    user_id: user?.id
                }]);
                onSaved();
            }
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`modal ${isOpen ? 'is-open' : ''}`} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{consumidorId ? 'Editar consumidor' : 'Nuevo consumidor'}</h3>
                    <button className="modal-close" type="button" onClick={onClose}><X size={20} /></button>
                </div>

                {loading && consumidorId ? <div style={{ opacity: 0.5 }}>Cargando datos...</div> : (
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
                                <input name="mail" type="email" className="input" value={formData.mail} onChange={handleChange} />
                            </label>
                            <label className="field">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span className="field-label" style={{ margin: 0 }}>Localidad</span>
                                    <button 
                                        type="button" 
                                        onClick={handleGeocode}
                                        disabled={isGeocoding}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '4px',
                                            fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            opacity: isGeocoding ? 0.6 : 1
                                        }}
                                    >
                                        {isGeocoding ? <RefreshCw size={10} className="animate-spin" /> : <MapPin size={10} />}
                                        Ubicar
                                    </button>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input name="localidad" className="input" value={formData.localidad} onChange={handleChange} placeholder="Ej: Buenos Aires" style={{ paddingRight: '25px' }} />
                                    {formData.lat && formData.lng && !isGeocoding && (
                                        <div title="Ubicación fijada" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)' }} />
                                    )}
                                </div>
                            </label>
                        </div>

                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Barrio</span>
                                <input name="barrio" className="input" value={formData.barrio} onChange={handleChange} />
                            </label>
                            <label className="field">
                                <span className="field-label">Edad</span>
                                <input name="edad" type="number" min="0" className="input" value={formData.edad} onChange={handleChange} />
                            </label>
                        </div>

                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Género</span>
                                <select name="genero" className="input" value={formData.genero} onChange={handleChange}>
                                    <option value="">Sin definir</option>
                                    <option value="F">F</option>
                                    <option value="M">M</option>
                                    <option value="X">X</option>
                                </select>
                            </label>
                            <label className="field">
                                <span className="field-label">Estado</span>
                                <select name="estado" className="input" value={formData.estado} onChange={handleChange}>
                                    <option value="Lead">Lead</option>
                                    <option value="Contactado">Contactado</option>
                                    <option value="Interesado">Interesado</option>
                                    <option value="Cliente">Cliente</option>
                                    <option value="No interesado">No interesado</option>
                                </select>
                            </label>
                        </div>

                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Responsable</span>
                                <select name="responsable" className="input" value={formData.responsable} onChange={handleChange}>
                                    <option value="">Sin responsable</option>
                                    {responsablesDB.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="field">
                                <span className="field-label">Próximo contacto</span>
                                <input name="fecha_proximo_contacto" type="date" className="input" value={formData.fecha_proximo_contacto} onChange={handleChange} />
                            </label>
                        </div>

                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Hora</span>
                                <input name="hora_proximo_contacto" type="time" className="input" value={formData.hora_proximo_contacto} onChange={handleChange} />
                            </label>
                            <div></div>
                        </div>

                        <div className="form-row-2">
                            <label className="field">
                                <span className="field-label">Latitud</span>
                                <input name="lat" className="input" value={formData.lat || ''} readOnly style={{ background: 'var(--bg-active)' }} />
                            </label>
                            <label className="field">
                                <span className="field-label">Longitud</span>
                                <input name="lng" className="input" value={formData.lng || ''} readOnly style={{ background: 'var(--bg-active)' }} />
                            </label>
                        </div>

                        <label className="field">
                            <span className="field-label">Notas</span>
                            <textarea name="notas" className="input" rows="3" value={formData.notas} onChange={handleChange}></textarea>
                        </label>

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
