import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { X, AlertCircle } from 'lucide-react';

// Helper: inline error message under a field
function FieldError({ msg }) {
    if (!msg) return null;
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger, #ef4444)', fontSize: '0.78rem', marginTop: '4px' }}>
            <AlertCircle size={13} /> {msg}
        </span>
    );
}

// Fields that live on each step (used to auto-navigate to first error)
const STEP_FIELDS = {
    1: ['nombre_local', 'direccion', 'nombre', 'telefono'],
    2: ['rubro'],
    3: [],
};

const ERR_STYLE = { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.18)' };

export function ClienteModal({ isOpen, onClose, clienteId, initialLocation, onSaved }) {
    const { user, userName } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const emptyForm = (overrides = {}) => ({
        nombre_local: '', direccion: '', nombre: '', telefono: '',
        mail: '', cuit: '', horarios_atencion: '', rubro: '',
        estado: '1 - Cliente relevado', responsable: '',
        estilo_contacto: 'Sin definir', interes: 'Bajo',
        venta_digital: 'false', venta_digital_cual: '',
        situacion: 'sin comunicacion nueva', notas: '',
        tipo_contacto: 'Visita Presencial',
        fecha_proximo_contacto: '', hora_proximo_contacto: '',
        lat: null, lng: null,
        ...overrides,
    });

    const [formData, setFormData] = useState(emptyForm());
    const [stepEnteredAt, setStepEnteredAt] = useState(Date.now());

    // Auto-fill responsable with the current user's name when creating a new client
    useEffect(() => {
        if (!isOpen || clienteId || !user) return;
        supabase.from('usuarios').select('nombre').eq('email', user.email).maybeSingle()
            .then(({ data }) => {
                if (data?.nombre) {
                    setFormData(prev => ({ ...prev, responsable: data.nombre }));
                }
            });
    }, [isOpen, clienteId, user]);

    useEffect(() => {
        if (isOpen && clienteId) {
            loadCliente(clienteId);
        } else if (isOpen && !clienteId) {
            setFormData(emptyForm({
                lat: initialLocation?.lat ?? null,
                lng: initialLocation?.lng ?? null,
            }));
            setErrors({});
            handleStepChange(1);
        }
    }, [isOpen, clienteId]);

    const handleStepChange = (newStep) => {
        setStep(newStep);
        setStepEnteredAt(Date.now());
    };

    const loadCliente = async (id) => {
        setLoading(true);
        const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
        if (error) {
            toast.error('Error cargando cliente');
            onClose();
        } else if (data) {
            setFormData({ ...emptyForm(), ...data, venta_digital: data.venta_digital ? 'true' : 'false' });
            setErrors({});
        }
        setLoading(false);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value }));
        // Clear error on change
        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    // Validate all fields and return errors object
    const validate = () => {
        const errs = {};
        if (!formData.nombre_local?.trim()) errs.nombre_local = 'El nombre del local es requerido';
        if (!formData.direccion?.trim()) errs.direccion = 'La dirección es requerida';
        if (!formData.nombre?.trim()) errs.nombre = 'El nombre del contacto es requerido';
        if (!formData.telefono?.trim()) errs.telefono = 'El teléfono es requerido';
        if (!formData.rubro?.trim()) errs.rubro = 'El rubro es requerido';
        return errs;
    };

    const handleNextPhase = (e) => {
        if (e) e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            for (const [s, fields] of Object.entries(STEP_FIELDS)) {
                if (fields.some(f => errs[f])) { handleStepChange(Number(s)); break; }
            }
        } else {
            handleStepChange(step + 1);
        }
    };

    const handleFormKeyDown = (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (step < 3) handleNextPhase();
            else handleSubmit(e);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevent double click on "Siguiente" triggering "Guardar"
        if (step === 3 && Date.now() - stepEnteredAt < 500) {
            return;
        }

        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            // Navigate to first step that has an error
            for (const [s, fields] of Object.entries(STEP_FIELDS)) {
                if (fields.some(f => errs[f])) { handleStepChange(Number(s)); break; }
            }
            return;
        }

        setLoading(true);

        const rawPayload = {
            nombre_local: formData.nombre_local || null,
            direccion: formData.direccion || null,
            nombre: formData.nombre || null,
            telefono: formData.telefono || null,
            mail: formData.mail || null,
            cuit: formData.cuit || null,
            rubro: formData.rubro || null,
            estado: formData.estado || null,
            responsable: formData.responsable || null,
            estilo_contacto: formData.estilo_contacto || null,
            interes: formData.interes || null,
            venta_digital: formData.venta_digital === 'true',
            venta_digital_cual: formData.venta_digital_cual || null,
            situacion: formData.situacion || null,
            tipo_contacto: formData.tipo_contacto || null,
            notas: formData.notas || null,
            fecha_proximo_contacto: formData.fecha_proximo_contacto?.trim() || null,
            hora_proximo_contacto: formData.hora_proximo_contacto?.trim() || null,
            lat: formData.lat != null && formData.lat !== '' ? parseFloat(formData.lat) : null,
            lng: formData.lng != null && formData.lng !== '' ? parseFloat(formData.lng) : null,
        };

        // Strip null date fields so they never appear in ?columns= (prevents Postgres type error)
        const dateFields = new Set(['fecha_proximo_contacto', 'hora_proximo_contacto']);
        const payload = Object.fromEntries(
            Object.entries(rawPayload).filter(([k, v]) => !(dateFields.has(k) && (v === null || v === '')))
        );

        // Override with map coordinates when creating from the map
        if (initialLocation && !clienteId) {
            payload.lat = parseFloat(initialLocation.lat);
            payload.lng = parseFloat(initialLocation.lng);
        }

        let err;
        if (clienteId) {
            const { error } = await supabase.from('clientes').update(payload).eq('id', clienteId);
            err = error;
            if (!error) {
                const parts = [];
                if (payload.estado) parts.push(`Estado: ${payload.estado}`);
                if (payload.situacion && (payload.estado?.startsWith('4') || payload.estado?.startsWith('5'))) parts.push(`Situación: ${payload.situacion}`);
                if (payload.notas) parts.push(`Notas: "${payload.notas}"`);
                const desc = `✏️ Edición de cliente${parts.length ? ': ' + parts.join(' · ') : ''}`;
                const { error: actErr } = await supabase.from('actividades').insert([{
                    cliente_id: clienteId,
                    descripcion: desc,
                    fecha: new Date().toISOString()
                }]);
                if (actErr) console.warn('No se pudo guardar historial de edición:', actErr.message);
            }
        } else {
            // Include creator name for analytics when creating a new client
            payload.creado_por = userName || user?.email || null;
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

    const inp = (name, extra = {}) => ({
        name,
        value: formData[name] || '',
        onChange: handleChange,
        style: errors[name] ? ERR_STYLE : {},
        ...extra,
    });

    return createPortal(
        <div className="modal active" onClick={(e) => e.target.classList.contains('modal') && onClose()}>
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 style={{ margin: 0 }}>{clienteId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
                    <Button variant="secondary" onClick={onClose} style={{ padding: '8px' }}>
                        <X size={20} />
                    </Button>
                </div>

                {/* Step indicators */}
                <div className="wizard-steps" style={{ marginBottom: '24px' }}>
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`step-indicator ${step === s ? 'active' : ''} ${Object.keys(STEP_FIELDS[s] || []).some(f => errors[STEP_FIELDS[s][f]]) ? 'error' : ''}`}
                            onClick={() => handleStepChange(s)}
                            style={{
                                cursor: 'pointer',
                                ...(STEP_FIELDS[s]?.some(f => errors[f]) ? { background: '#ef4444', opacity: 1 } : {})
                            }}
                        />
                    ))}
                </div>

                <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
                    {/* ── STEP 1 ── */}
                    {step === 1 && (
                        <div>
                            <h3 style={{ marginBottom: '16px' }}>1. Datos del Local y Contacto</h3>
                            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="field">
                                    <label>Nombre del Local *</label>
                                    <input type="text" {...inp('nombre_local')} />
                                    <FieldError msg={errors.nombre_local} />
                                </div>
                                <div className="field">
                                    <label>Dirección *</label>
                                    <input type="text" {...inp('direccion')} />
                                    <FieldError msg={errors.direccion} />
                                </div>
                                <div className="field">
                                    <label>Nombre del Contacto *</label>
                                    <input type="text" {...inp('nombre')} />
                                    <FieldError msg={errors.nombre} />
                                </div>
                                <div className="field">
                                    <label>Teléfono *</label>
                                    <input type="text" {...inp('telefono')} />
                                    <FieldError msg={errors.telefono} />
                                </div>
                                <div className="field">
                                    <label>Mail</label>
                                    <input type="email" {...inp('mail')} />
                                </div>
                                <div className="field">
                                    <label>CUIT</label>
                                    <input type="text" {...inp('cuit', { placeholder: 'XX-XXXXXXXX-X' })} />
                                </div>
                                <div className="field">
                                    <label>Horarios de Atención</label>
                                    <input type="text" {...inp('horarios_atencion', { placeholder: 'Ej: Lun-Vie 9-18' })} />
                                </div>
                                <div className="field">
                                    <label>Estilo de Contacto</label>
                                    <select name="estilo_contacto" value={formData.estilo_contacto || 'Sin definir'} onChange={handleChange}>
                                        <option value="Sin definir">Sin definir</option>
                                        <option value="Dueño">Dueño</option>
                                        <option value="Empleado">Empleado</option>
                                        <option value="Cerrado">Cerrado</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label>Tipo de Contacto</label>
                                    <select name="tipo_contacto" value={formData.tipo_contacto || 'Visita Presencial'} onChange={handleChange}>
                                        <option value="Visita Presencial">Visita Presencial</option>
                                        <option value="Llamada">Llamada</option>
                                    </select>
                                </div>
                                <div className="field" style={{ gridColumn: '1 / -1' }}>
                                    <label>Responsable</label>
                                    <input
                                        type="text"
                                        name="responsable"
                                        value={formData.responsable || ''}
                                        onChange={handleChange}
                                        placeholder="Nombre del responsable"
                                        style={{ background: 'var(--bg-elevated)', fontWeight: 500 }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2 ── */}
                    {step === 2 && (
                        <div>
                            <h3 style={{ marginBottom: '16px' }}>2. Clasificación del Cliente</h3>
                            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="field">
                                    <label>Rubro *</label>
                                    <select {...inp('rubro')}>
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
                                        <option value="Fiambrería">Fiambrería</option>
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
                                        <option value="Verdulería">Verdulería</option>
                                        <option value="Vinoteca">Vinoteca</option>
                                    </select>
                                    <FieldError msg={errors.rubro} />
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

                                {/* Interés bar */}
                                <div className="field" style={{ gridColumn: '1 / -1' }}>
                                    <label>Interés</label>
                                    {(() => {
                                        const levels = [
                                            { value: 'Bajo', color: '#94a3b8', label: 'Bajo' },
                                            { value: 'Medio', color: '#f59e0b', label: 'Medio' },
                                            { value: 'Alto', color: '#10b981', label: 'Alto' },
                                        ];
                                        const activeIdx = levels.findIndex(l => l.value === (formData.interes || 'Bajo'));
                                        const activeColor = levels[activeIdx]?.color || '#94a3b8';
                                        return (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'flex', gap: '4px', height: '10px' }}>
                                                    {levels.map((l, i) => (
                                                        <div key={l.value} onClick={() => setFormData(prev => ({ ...prev, interes: l.value }))}
                                                            style={{ flex: 1, borderRadius: '99px', cursor: 'pointer', background: i <= activeIdx ? activeColor : 'var(--border)', transition: 'background 0.25s ease', opacity: i <= activeIdx ? 1 : 0.4 }} />
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {levels.map((l, i) => (
                                                        <button key={l.value} type="button" onClick={() => setFormData(prev => ({ ...prev, interes: l.value }))}
                                                            style={{ flex: 1, padding: '6px 4px', fontSize: '0.78rem', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', border: '1px solid', background: i <= activeIdx ? `${activeColor}18` : 'var(--bg)', color: i <= activeIdx ? activeColor : 'var(--text-muted)', borderColor: i <= activeIdx ? `${activeColor}60` : 'var(--border)', transition: 'all 0.2s ease' }}>
                                                            {l.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Venta digital */}
                                <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label>¿Venta Digital?</label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500 }}>
                                        <input type="checkbox" name="venta_digital" checked={formData.venta_digital === 'true'} onChange={handleChange}
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                                        {formData.venta_digital === 'true' ? 'Sí, tiene venta digital' : 'No tiene venta digital'}
                                    </label>
                                    {formData.venta_digital === 'true' && (
                                        <input type="text" name="venta_digital_cual" placeholder="¿Cuál? Ej: Pedidos Ya, Rappi..." value={formData.venta_digital_cual || ''} onChange={handleChange} style={{ marginTop: '4px' }} />
                                    )}
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

                    {/* ── STEP 3 ── */}
                    {step === 3 && (
                        <div>
                            <h3 style={{ marginBottom: '16px' }}>3. Agenda y Notas</h3>
                            <div className="grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="field">
                                    <label>Próxima Visita</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input type="date" name="fecha_proximo_contacto" value={formData.fecha_proximo_contacto || ''} onChange={handleChange} style={{ flex: 1 }} />
                                        {formData.fecha_proximo_contacto && (
                                            <button type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, fecha_proximo_contacto: '' }))}
                                                style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                            >✕ Sin fecha</button>
                                        )}
                                    </div>
                                </div>
                                <div className="field">
                                    <label>Notas</label>
                                    <textarea name="notas" rows="3" value={formData.notas || ''} onChange={handleChange}></textarea>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                        <Button variant="secondary" type="button" onClick={() => handleStepChange(step > 1 ? step - 1 : 1)} style={{ visibility: step === 1 ? 'hidden' : 'visible' }}>
                            Anterior
                        </Button>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
                            {step < 3 ? (
                                <Button key="siguiente" variant="primary" type="button" onClick={handleNextPhase}>Siguiente</Button>
                            ) : (
                                <Button key="guardar" variant="primary" type="submit" disabled={loading}>
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
