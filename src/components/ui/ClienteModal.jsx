import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export function ClienteModal({ isOpen, onClose, clienteId, initialLocation, onSaved }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        nombre_local: '',
        direccion: '',
        nombre: '',
        telefono: '',
        mail: '',
        cuit: '',
        rubro: '',
        estado: '1 - Cliente relevado',
        responsable: '',
        estilo_contacto: 'Sin definir',
        interes: 'Bajo',
        venta_digital: 'false',
        venta_digital_cual: '',
        situacion: 'sin comunicacion nueva',
        notas: '',
        fecha_proximo_contacto: '',
        hora_proximo_contacto: '',
        lat: null,
        lng: null
    });

    useEffect(() => {
        if (isOpen && clienteId) {
            loadCliente(clienteId);
        } else if (isOpen && !clienteId) {
            setFormData({
                nombre_local: '', direccion: '', nombre: '', telefono: '', mail: '', cuit: '', rubro: '',
                estado: '1 - Cliente relevado', responsable: '', estilo_contacto: 'Sin definir', interes: 'Bajo',
                venta_digital: 'false', venta_digital_cual: '', situacion: 'sin comunicacion nueva', notas: '', fecha_proximo_contacto: '', hora_proximo_contacto: '',
                lat: initialLocation ? initialLocation.lat : null,
                lng: initialLocation ? initialLocation.lng : null
            });
            setStep(1);
        }
    }, [isOpen, clienteId]);

    const loadCliente = async (id) => {
        setLoading(true);
        const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
        if (error) {
            toast.error('Error cargando cliente');
            onClose();
        } else if (data) {
            setFormData({ ...data, venta_digital: data.venta_digital ? 'true' : 'false' });
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            venta_digital: formData.venta_digital === 'true'
        };

        // If location is provided, ensure it's saved
        if (initialLocation && !clienteId) {
            payload.lat = initialLocation.lat;
            payload.lng = initialLocation.lng;
        }

        let err;
        if (clienteId) {
            const { error } = await supabase.from('clientes').update(payload).eq('id', clienteId);
            err = error;
            if (!error) {
                // Log the edit in actividades
                const parts = [];
                if (payload.estado) parts.push(`Estado: ${payload.estado}`);
                if (payload.situacion && (payload.estado?.startsWith('4') || payload.estado?.startsWith('5'))) parts.push(`Situación: ${payload.situacion}`);
                if (payload.notas) parts.push(`Notas: "${payload.notas}"`);
                const desc = `✏️ Edición de cliente${parts.length ? ': ' + parts.join(' · ') : ''}`;
                await supabase.from('actividades').insert([{
                    cliente_id: clienteId,
                    descripcion: desc,
                    fecha: new Date().toISOString(),
                    tipo: 'edicion'
                }]);
            }
        } else {
            const { error } = await supabase.from('clientes').insert([payload]);
            err = error;
        }

        if (err) {
            console.error('Error guardando cliente:', err);
            toast.error('Ocurrió un error al guardar el cliente');
        } else {
            toast.success(clienteId ? 'Cliente actualizado' : 'Cliente creado exitosamente');
            onSaved();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && onClose()}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>{clienteId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                    <Button variant="secondary" onClick={onClose} style={{ padding: '8px' }}>
                        <X size={20} />
                    </Button>
                </div>

                <div className="wizard-steps" style={{ marginBottom: '24px' }}>
                    <div className={`step-indicator ${step === 1 ? 'active' : ''}`} onClick={() => setStep(1)} style={{ cursor: 'pointer' }}></div>
                    <div className={`step-indicator ${step === 2 ? 'active' : ''}`} onClick={() => setStep(2)} style={{ cursor: 'pointer' }}></div>
                    <div className={`step-indicator ${step === 3 ? 'active' : ''}`} onClick={() => setStep(3)} style={{ cursor: 'pointer' }}></div>
                </div>

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <div>
                            <h3 style={{ marginBottom: '16px' }}>1. Datos del Local y Contacto</h3>
                            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="field">
                                    <label>Nombre del Local *</label>
                                    <input type="text" name="nombre_local" required value={formData.nombre_local || ''} onChange={handleChange} />
                                </div>
                                <div className="field">
                                    <label>Dirección *</label>
                                    <input type="text" name="direccion" required value={formData.direccion || ''} onChange={handleChange} />
                                </div>
                                <div className="field">
                                    <label>Nombre del Contacto *</label>
                                    <input type="text" name="nombre" required value={formData.nombre || ''} onChange={handleChange} />
                                </div>
                                <div className="field">
                                    <label>Teléfono *</label>
                                    <input type="text" name="telefono" required value={formData.telefono || ''} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h3 style={{ marginBottom: '16px' }}>2. Clasificación del Cliente</h3>
                            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="field">
                                    <label>Rubro *</label>
                                    <select name="rubro" required value={formData.rubro || ''} onChange={handleChange}>
                                        <option value="">Seleccionar rubro...</option>
                                        <option value="Accesorios de Celular">Accesorios de Celular</option>
                                        <option value="Almacén">Almacén</option>
                                        <option value="Artículos de Limpieza">Artículos de Limpieza</option>
                                        <option value="Autoservicio">Autoservicio</option>
                                        <option value="Carnicería">Carnicería</option>
                                        <option value="Cotillón">Cotillón</option>
                                        <option value="Dietética">Dietética</option>
                                        <option value="Farmacia">Farmacia</option>
                                        <option value="Ferretería">Ferretería</option>
                                        <option value="Gastronómico">Gastronómico</option>
                                        <option value="Granja">Granja</option>
                                        <option value="Heladería">Heladería</option>
                                        <option value="Juguetería">Juguetería</option>
                                        <option value="Kiosco">Kiosco</option>
                                        <option value="Librería">Librería</option>
                                        <option value="Mercería">Mercería</option>
                                        <option value="Panadería">Panadería</option>
                                        <option value="Papelera">Papelera</option>
                                        <option value="Pescadería">Pescadería</option>
                                        <option value="Pet Shop">Pet Shop</option>
                                        <option value="Sin definir">Sin definir</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Estado</label>
                                    <select name="estado" value={formData.estado || ''} onChange={handleChange}>
                                        <option value="1 - Cliente relevado">1 - Cliente relevado</option>
                                        <option value="2 - Local Visitado No Activo">2 - Local Visitado No Activo</option>
                                        <option value="3 - Primer Ingreso">3 - Primer Ingreso</option>
                                        <option value="4 - Local Creado">4 - Local Creado</option>
                                        <option value="5 - Local Visitado Activo">5 - Local Visitado Activo</option>
                                        <option value="6 - Local No Interesado">6 - Local No Interesado</option>
                                    </select>
                                </div>
                            </div>

                            {(formData.estado.startsWith('4') || formData.estado.startsWith('5')) && (
                                <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
                                    <div className="field">
                                        <label>Situación *</label>
                                        <select name="situacion" value={formData.situacion || 'sin comunicacion nueva'} onChange={handleChange}>
                                            <option value="sin comunicacion nueva">Sin comunicación nueva</option>
                                            <option value="en proceso">En proceso</option>
                                            <option value="en funcionamiento">En funcionamiento</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h3 style={{ marginBottom: '16px' }}>3. Agenda y Notas</h3>
                            <div className="grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="field">
                                    <label>Próxima Visita</label>
                                    <input type="date" name="fecha_proximo_contacto" value={formData.fecha_proximo_contacto || ''} onChange={handleChange} />
                                </div>
                                <div className="field">
                                    <label>Notas</label>
                                    <textarea name="notas" rows="3" value={formData.notas || ''} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                        <Button variant="secondary" type="button" onClick={() => setStep(step > 1 ? step - 1 : 1)} style={{ visibility: step === 1 ? 'hidden' : 'visible' }}>
                            Anterior
                        </Button>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                            {step < 3 ? (
                                <Button variant="primary" type="button" onClick={() => setStep(step + 1)}>Siguiente</Button>
                            ) : (
                                <Button variant="primary" type="submit" disabled={loading}>
                                    {loading ? 'Guardando...' : 'Guardar Cliente'}
                                </Button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
