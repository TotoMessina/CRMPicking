import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { X, AlertCircle } from 'lucide-react';
import {
    ESTADO_DEFAULT, SITUACION_DEFAULT, ESTADO_RELEVADO,
    ESTADO_VISITADO_NO_ACTIVO, ESTADO_PRIMER_INGRESO, ESTADO_LOCAL_CREADO,
    ESTADO_ACTIVO, ESTADO_NO_INTERESADO,
    SITUACION_SIN_COMUNICACION, SITUACION_EN_PROCESO, SITUACION_FUNCIONANDO,
    esEstadoFinal
} from '../../constants/estados';
import { useRubros } from '../../hooks/useRubros';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    clienteId: string | null;
    initialLocation?: { lat: number; lng: number } | null;
    onSaved: () => void;
}

interface FormData {
    nombre_local: string;
    direccion: string;
    nombre: string;
    telefono: string;
    mail: string;
    cuit: string;
    horarios_atencion: string;
    rubro: string;
    estado: string;
    responsable: string;
    estilo_contacto: string;
    interes: string;
    venta_digital: string;
    venta_digital_cual: string;
    situacion: string;
    notas: string;
    tipo_contacto: string;
    fecha_proximo_contacto: string;
    hora_proximo_contacto: string;
    lat: number | null | string;
    lng: number | null | string;
    [key: string]: any;
}

// Helper: inline error message under a field
const FieldError: React.FC<{ msg?: string }> = ({ msg }) => {
    if (!msg) return null;
    return (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger, #ef4444)', fontSize: '0.78rem', marginTop: '4px' }}>
            <AlertCircle size={13} /> {msg}
        </span>
    );
}

// Fields that live on each step (used to auto-navigate to first error)
const STEP_FIELDS: Record<number, string[]> = {
    1: ['nombre_local', 'direccion', 'nombre', 'telefono'],
    2: ['rubro'],
    3: [],
};

const ERR_STYLE = { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.18)' };

export const ClienteModal: React.FC<Props> = ({ isOpen, onClose, clienteId, initialLocation, onSaved }) => {
    const { user, userName, empresaActiva }: any = useAuth();
    const { data: rubrosDB = [] } = useRubros();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [originalData, setOriginalData] = useState<FormData | null>(null);

    const emptyForm = (overrides = {}): FormData => ({
        nombre_local: '', direccion: '', nombre: '', telefono: '',
        mail: '', cuit: '', horarios_atencion: '', rubro: '',
        estado: ESTADO_DEFAULT, responsable: '',
        estilo_contacto: 'Sin definir', interes: 'Bajo',
        venta_digital: 'false', venta_digital_cual: '',
        situacion: SITUACION_DEFAULT, notas: '',
        tipo_contacto: 'Visita Presencial',
        fecha_proximo_contacto: '', hora_proximo_contacto: '',
        lat: null, lng: null,
        ...overrides,
    });

    const [formData, setFormData] = useState<FormData>(emptyForm());
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

    const handleStepChange = (newStep: number) => {
        setStep(newStep);
        setStepEnteredAt(Date.now());
    };

    const loadCliente = async (id: string) => {
        setLoading(true);
        const { data: ecData, error: ecError } = await supabase
            .from('empresa_cliente')
            .select('*, clientes(*)')
            .eq('cliente_id', id)
            .eq('empresa_id', empresaActiva?.id)
            .single();

        if (ecError) {
            // Fallback to just universal if not found in company (shouldn't happen if editing from directory)
            const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
            if (error) {
                toast.error('Error cargando cliente');
                onClose();
            } else {
                setFormData({ ...emptyForm(), ...data, venta_digital: data.venta_digital ? 'true' : 'false' });
                setErrors({});
            }
        } else if (ecData) {
            // Merge both
            const merged = {
                ...emptyForm(),
                ...ecData.clientes,
                ...ecData,
                venta_digital: ecData.venta_digital ? 'true' : 'false'
            };
            setFormData(merged);
            setOriginalData(merged);
            setErrors({});
        }
        setLoading(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let val: any = value;
        if (type === 'checkbox') {
            val = (e.target as HTMLInputElement).checked ? 'true' : 'false';
        }

        setFormData(prev => ({ ...prev, [name]: val }));

        // Clear error on change
        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    // Validate all fields and return errors object
    const validate = () => {
        const errs: Record<string, string> = {};
        if (!formData.nombre_local?.trim()) errs.nombre_local = 'El nombre del local es requerido';
        if (!formData.direccion?.trim()) errs.direccion = 'La dirección es requerida';
        if (!formData.nombre?.trim()) errs.nombre = 'El nombre del contacto es requerido';
        if (!formData.telefono?.trim()) errs.telefono = 'El teléfono es requerido';
        if (!formData.rubro?.trim()) errs.rubro = 'El rubro es requerido';
        return errs;
    };

    const handleNextPhase = (e?: React.MouseEvent | React.KeyboardEvent) => {
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

    const handleFormKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (step < 3) handleNextPhase(e);
            else handleSubmit(e as any);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
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

        const rawPayload: any = {
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
            lat: formData.lat != null && formData.lat !== '' ? parseFloat(formData.lat as string) : null,
            lng: formData.lng != null && formData.lng !== '' ? parseFloat(formData.lng as string) : null,
        };

        // If the state implies activation/closure, mark the current user as the closer
        if (esEstadoFinal(formData.estado)) {
            rawPayload.activador_cierre = userName || user?.email || null;
        }

        const payload = { ...rawPayload };

        // Override with map coordinates when creating from the map
        if (initialLocation && !clienteId) {
            payload.lat = parseFloat(initialLocation.lat as any);
            payload.lng = parseFloat(initialLocation.lng as any);
        }

        console.log('DEBUG: Iniciando proceso de guardado...', {
            clienteId,
            empresaId: empresaActiva?.id,
            nombre_local: payload.nombre_local,
            isMapCreation: !!initialLocation
        });

        if (!empresaActiva?.id) {
            console.error('ERROR: No hay empresa activa cargada en el contexto.');
            toast.error('Error: No se detectó una empresa activa. Por favor, seleccioná una empresa antes de crear un cliente.');
            setLoading(false);
            return;
        }

        let err;
        if (clienteId) {
            // Split fields for update as well
            const universalFields = {
                nombre_local: payload.nombre_local,
                nombre: payload.nombre,
                direccion: payload.direccion,
                lat: payload.lat,
                lng: payload.lng,
                telefono: payload.telefono,
                mail: payload.mail,
                cuit: payload.cuit,
                // Business synchronization to prevent legacy trigger overwrites
                estado: payload.estado,
                rubro: payload.rubro,
                responsable: payload.responsable,
                situacion: payload.situacion,
                notas: payload.notas,
                fecha_proximo_contacto: payload.fecha_proximo_contacto,
            };
            const companyFields = {
                estado: payload.estado,
                rubro: payload.rubro,
                responsable: payload.responsable,
                estilo_contacto: payload.estilo_contacto,
                interes: payload.interes,
                tipo_contacto: payload.tipo_contacto,
                venta_digital: payload.venta_digital,
                venta_digital_cual: payload.venta_digital_cual,
                situacion: payload.situacion,
                notas: payload.notas,
                fecha_proximo_contacto: payload.fecha_proximo_contacto,
                hora_proximo_contacto: payload.hora_proximo_contacto,
                activador_cierre: payload.activador_cierre,
            };

            // 1. Update universal client record
            const { error: uErr } = await supabase.from('clientes').update(universalFields).eq('id', clienteId);

            // 2. Update company-specific record
            const { error: cErr } = await supabase
                .from('empresa_cliente')
                .update(companyFields)
                .eq('cliente_id', clienteId)
                .eq('empresa_id', empresaActiva.id);

            err = uErr || cErr;

            if (!err) {
                const parts = [];
                // Compare state change
                if (originalData?.estado && payload.estado && originalData.estado !== payload.estado) {
                    parts.push(`Cambio de Estado: ${originalData.estado} ➔ ${payload.estado}`);
                } else if (payload.estado) {
                    parts.push(`Estado: ${payload.estado}`);
                }

                if (payload.situacion && esEstadoFinal(payload.estado)) {
                    if (originalData?.situacion !== payload.situacion) {
                        parts.push(`Nueva Situación: ${payload.situacion}`);
                    }
                }

                if (payload.notas && originalData?.notas !== payload.notas) {
                    parts.push(`Nota actualizada: "${payload.notas}"`);
                }

                const desc = `✏️ Edición de cliente${parts.length ? ': ' + parts.join(' · ') : ''}`;
                const { error: actErr } = await supabase.from('actividades').insert([{
                    cliente_id: clienteId,
                    descripcion: desc,
                    usuario: userName || user?.email || 'Sistema',
                    empresa_id: empresaActiva.id,
                    fecha: new Date().toISOString()
                }]);
                if (actErr) console.warn('No se pudo guardar historial de edición:', actErr.message);
            }
        } else {
            // Include creator name for analytics when creating a new client
            let creadoPor = userName || null;
            if (!creadoPor && user?.email) {
                const { data: uData } = await supabase
                    .from('usuarios')
                    .select('nombre')
                    .eq('email', user.email)
                    .maybeSingle();
                creadoPor = uData?.nombre || user.email;
            }

            // Use RPC for atomic creation to avoid RLS visibility gaps
            // Final Version (v5): Sincronizada con tipos BIGINT para IDs de cliente.
            const { data: result, error: rpcErr } = await supabase.rpc('crear_cliente_v5_final', {
                p_payload: {
                    p_nombre_local: payload.nombre_local,
                    p_nombre: payload.nombre,
                    p_direccion: payload.direccion,
                    p_telefono: payload.telefono,
                    p_mail: payload.mail,
                    p_cuit: payload.cuit,
                    p_lat: payload.lat,
                    p_lng: payload.lng,
                    p_empresa_id: empresaActiva.id,
                    p_rubro: payload.rubro,
                    p_estado: payload.estado,
                    p_responsable: payload.responsable,
                    p_interes: payload.interes,
                    p_estilo_contacto: payload.estilo_contacto,
                    p_venta_digital: payload.venta_digital,
                    p_venta_digital_cual: payload.venta_digital_cual,
                    p_situacion: payload.situacion,
                    p_notas: payload.notas,
                    p_tipo_contacto: payload.tipo_contacto,
                    p_fecha_proximo_contacto: payload.fecha_proximo_contacto,
                    p_hora_proximo_contacto: payload.hora_proximo_contacto,
                    p_creado_por: creadoPor
                }
            });

            if (rpcErr) {
                console.error('ERROR: Falla en RPC crear_cliente_v5_final:', rpcErr);
                err = rpcErr;
            } else if (result) {
                console.log('DEBUG: Cliente creado exitosamente via RPC. ID:', result);

                // Enhanced creation logging
                const isMapCreation = !!initialLocation;
                const icon = isMapCreation ? '📍' : '🆕';
                const origin = isMapCreation ? 'Alta de local desde el mapa' : 'Alta de cliente';
                const initialStatus = payload.estado || 'Sin estado';
                const desc = `${icon} ${origin} - Estado inicial: ${initialStatus}`;

                const { error: actErr } = await supabase.from('actividades').insert([{
                    cliente_id: result,
                    descripcion: desc,
                    usuario: creadoPor,
                    empresa_id: empresaActiva.id,
                    fecha: new Date().toISOString()
                }]);
                if (actErr) console.warn('No se pudo guardar actividad inicial:', actErr.message);
            }
        }

        if (err) {
            const isOfflineError = (err as any).message === 'Failed to fetch' || (err as any).message?.includes('fetch') || !navigator.onLine;
            if (isOfflineError) {
                console.log('DEBUG: Guardado offline interceptado');
                toast.success('Guardado sin conexión. Se sincronizará pronto.');
                onSaved();
            } else {
                console.error('Error final guardando cliente:', err);
                toast.error(`Error al guardar: ${(err as any).message || 'Ocurrió un error inesperado'}`);
            }
        } else {
            console.log('DEBUG: Cliente guardado con éxito. Datos enviados:', payload);
            toast.success(clienteId ? 'Cliente actualizado' : 'Cliente creado exitosamente');
            onSaved();
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    const inp = (name: string, extra = {}) => ({
        name,
        value: formData[name] || '',
        onChange: handleChange,
        style: errors[name] ? ERR_STYLE : {},
        ...extra,
    });

    return createPortal(
        <div className="modal active" onClick={(e) => (e.target as HTMLElement).classList.contains('modal') && onClose()}>
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
                            className={`step-indicator ${step === s ? 'active' : ''} ${Object.keys(STEP_FIELDS[s] || []).some(f => errors[f]) ? 'error' : ''}`}
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
                                        {rubrosDB.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                    <FieldError msg={errors.rubro} />
                                </div>
                                <div className="field">
                                    <label>Estado</label>
                                    <select name="estado" value={formData.estado || ''} onChange={handleChange}>
                                        <option value={ESTADO_RELEVADO}>1 - Cliente relevado</option>
                                        <option value={ESTADO_VISITADO_NO_ACTIVO}>2 - Local Visitado No Activo</option>
                                        <option value={ESTADO_PRIMER_INGRESO}>3 - Primer Ingreso</option>
                                        <option value={ESTADO_LOCAL_CREADO}>4 - Local Creado</option>
                                        <option value={ESTADO_ACTIVO}>5 - Local Visitado Activo</option>
                                        <option value={ESTADO_NO_INTERESADO}>6 - Local No Interesado</option>
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

                            {esEstadoFinal(formData.estado) && (
                                <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
                                    <div className="field">
                                        <label>Situación *</label>
                                        <select name="situacion" value={formData.situacion || 'sin comunicacion nueva'} onChange={handleChange}>
                                        <option value={SITUACION_SIN_COMUNICACION}>Sin comunicación nueva</option>
                                        <option value={SITUACION_EN_PROCESO}>En proceso</option>
                                        <option value={SITUACION_FUNCIONANDO}>En funcionamiento</option>
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
                                    <textarea name="notas" rows={3} value={formData.notas || ''} onChange={handleChange}></textarea>
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
