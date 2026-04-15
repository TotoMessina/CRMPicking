import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { X, AlertCircle } from 'lucide-react';
import { queueMutation } from '../../lib/offlineManager';

import {
    ESTADO_DEFAULT, SITUACION_DEFAULT, ESTADO_RELEVADO,
    ESTADO_VISITADO_NO_ACTIVO, ESTADO_PRIMER_INGRESO, ESTADO_LOCAL_CREADO,
    ESTADO_ACTIVO, ESTADO_NO_INTERESADO,
    SITUACION_SIN_COMUNICACION, SITUACION_EN_PROCESO, SITUACION_FUNCIONANDO,
    esEstadoFinal
} from '../../constants/estados';
import { useRubros } from '../../hooks/useRubros';
import { useCompanyUsers } from '../../hooks/useCompanyUsers';
import { useGrupos, useUpdateClienteGrupos } from '../../hooks/useGrupos';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag as TagIcon } from 'lucide-react';

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
    registrar_visita: string;
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

export const ClienteModal: React.FC<Props> = ({ isOpen, onClose, clienteId: initialClienteId, initialLocation, onSaved }) => {
    const { user, userName, empresaActiva }: any = useAuth();
    const { data: rubrosDB = [] } = useRubros();
    const { data: responsablesDB = [] } = useCompanyUsers(empresaActiva?.id);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [originalData, setOriginalData] = useState<FormData | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [clienteId, setClienteId] = useState<string | null>(initialClienteId);
    const [verifyingPhone, setVerifyingPhone] = useState(false);

    // Grupos
    const { data: gruposDB = [] } = useGrupos(empresaActiva?.id);
    const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
    const updateGruposMutation = useUpdateClienteGrupos();

    const handleClose = () => {
        if (isDirty) {
            setShowConfirm(true);
            return;
        }
        setIsDirty(false);
        onClose();
    };

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
        registrar_visita: 'true',
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

    const handleVerifyPhone = async (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        const tel = formData.telefono?.trim();
        if (!tel) {
            setErrors({ telefono: 'Ingresá un número de teléfono para verificar' });
            return;
        }

        setVerifyingPhone(true);
        const { data, error } = await supabase
            .from('clientes')
            .select('id, nombre, nombre_local')
            .eq('telefono', tel)
            .maybeSingle();

        setVerifyingPhone(false);

        if (data && data.id) {
            toast.success(`Cliente encontrado: ${data.nombre_local || data.nombre}`);
            setClienteId(data.id);
            setErrors(prev => { const n = { ...prev }; delete n.telefono; return n; });
            loadCliente(data.id);
            handleStepChange(1);
        } else {
            toast.success('Teléfono nuevo, podés continuar con la carga.');
            setErrors(prev => { const n = { ...prev }; delete n.telefono; return n; });
            handleStepChange(1);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setClienteId(initialClienteId);
            if (initialClienteId) {
                loadCliente(initialClienteId);
                handleStepChange(1);
            } else {
                setFormData(emptyForm({
                    lat: initialLocation?.lat ?? null,
                    lng: initialLocation?.lng ?? null,
                }));
                setErrors({});
                setSelectedGrupos([]);
                handleStepChange(0);
            }
            setIsDirty(false);
        }
    }, [isOpen, initialClienteId]);

    const handleStepChange = (newStep: number) => {
        setStep(newStep);
        setStepEnteredAt(Date.now());
    };

    const loadCliente = async (id: string) => {
        setLoading(true);
        try {
            const { data: ecData, error: ecError } = await supabase
                .from('empresa_cliente')
                .select('*, clientes(*, cliente_grupos(grupo_id))')
                .eq('cliente_id', id)
                .eq('empresa_id', empresaActiva?.id)
                .maybeSingle();

            if (ecError) throw ecError;

            let finalData: FormData;

            if (ecData) {
                // Merge both: fallback to universal if specific is null
                finalData = {
                    ...emptyForm(),
                    ...ecData.clientes,
                    ...ecData,
                    estado: ecData.estado || ecData.clientes?.estado || ESTADO_DEFAULT,
                    rubro: ecData.rubro || ecData.clientes?.rubro || '',
                    responsable: ecData.responsable || ecData.clientes?.responsable || '',
                    situacion: ecData.situacion || ecData.clientes?.situacion || SITUACION_DEFAULT,
                    notas: ecData.notas || ecData.clientes?.notas || '',
                    tipo_contacto: ecData.tipo_contacto || ecData.clientes?.tipo_contacto || 'Visita Presencial',
                    fecha_proximo_contacto: ecData.fecha_proximo_contacto || ecData.clientes?.fecha_proximo_contacto || '',
                    hora_proximo_contacto: ecData.hora_proximo_contacto || ecData.clientes?.hora_proximo_contacto || '',
                    venta_digital: ecData.venta_digital ? 'true' : 'false'
                };
                // Remove the nested joined object to keep formData clean
                delete (finalData as any).clientes;
                
                // Set selected groups
                if (ecData.clientes?.cliente_grupos) {
                    setSelectedGrupos(ecData.clientes.cliente_grupos.map((cg: any) => cg.grupo_id.toString()));
                } else {
                    setSelectedGrupos([]);
                }
            } else {
                // Fallback to just universal if not found in company
                const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single();
                if (error) throw error;
                
                finalData = { 
                    ...emptyForm(), 
                    ...data, 
                    venta_digital: data.venta_digital ? 'true' : 'false' 
                };
            }

            // Auto-fill responsible if empty during edit
            if (!finalData.responsable && (userName || user?.email)) {
                finalData.responsable = userName || user?.email;
                setIsDirty(true);
            }

            setFormData(finalData);
            setOriginalData(finalData);
            setErrors({});
        } catch (error: any) {
            console.error('Error cargando cliente:', error);
            toast.error('Error cargando los datos del cliente');
            handleClose();
        } finally {
            setLoading(false);
            setIsDirty(false);
        }
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let val: any = value;
        if (type === 'checkbox') {
            val = (e.target as HTMLInputElement).checked ? 'true' : 'false';
        }

        setFormData(prev => ({ ...prev, [name]: val }));
        setIsDirty(true);

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

        try {
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
                payload.lng = parseFloat(initialLocation.lng as any);
                payload.lat = parseFloat(initialLocation.lat as any);
            }

            const shouldRecordVisit = payload.estado !== ESTADO_RELEVADO || formData.registrar_visita === 'true';

            console.log('--- AUDITORÍA DE GUARDADO ---');
            console.log('Cliente:', formData.nombre_local || formData.nombre);
            console.log('Empresa Destino ID:', empresaActiva?.id);
            console.log('Empresa Destino Nombre:', empresaActiva?.nombre);
            console.log('----------------------------');

            console.log('Guardando cliente...', { clienteId, empresaId: empresaActiva?.id });

            if (!empresaActiva?.id) {
                toast.error('Error: No se detectó una empresa activa.');
                setLoading(false);
                return;
            }

            let finalErr;
            let resultId = clienteId;

            if (clienteId) {
                // EXCLUSIVELY universal fields for 'clientes' table
                const universalFields = {
                    nombre_local: payload.nombre_local,
                    nombre: payload.nombre,
                    direccion: payload.direccion,
                    lat: payload.lat,
                    lng: payload.lng,
                    telefono: payload.telefono,
                    mail: payload.mail,
                    cuit: payload.cuit,
                };

                // Company-specific fields for 'empresa_cliente' table
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

                // 1. First update company-specific record (stato/situacion - critical)
                const { error: cErr } = await supabase
                    .from('empresa_cliente')
                    .update({
                        ...companyFields,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('cliente_id', Number(clienteId))
                    .eq('empresa_id', empresaActiva.id);

                if (cErr) console.error('Error actualizando empresa_cliente:', cErr);

                // 2. Then update universal client record (name, address, coords)
                const { error: uErr } = await supabase
                    .from('clientes')
                    .update(universalFields)
                    .eq('id', Number(clienteId));

                if (uErr) console.error('Error actualizando clientes:', uErr);

                finalErr = cErr || uErr;

                if (!finalErr) {
                    const parts = [];
                    if (originalData?.estado && payload.estado && originalData.estado !== payload.estado) {
                        parts.push(`Cambio de Estado: ${originalData.estado} ➔ ${payload.estado}`);
                    }
                    if (payload.notas && originalData?.notas !== payload.notas) {
                        parts.push(`Nota actualizada: "${payload.notas}"`);
                    }

                    const desc = `✏️ Edición de cliente${parts.length ? ': ' + parts.join(' · ') : ''}`;
                    await supabase.from('actividades').insert([{
                        cliente_id: clienteId,
                        descripcion: desc,
                        usuario: userName || user?.email || 'Sistema',
                        empresa_id: empresaActiva.id,
                        fecha: new Date().toISOString()
                    }]);
                }
            } else {
                // Creation logic (New Client) via RPC
                let creadoPor = userName || null;
                if (!creadoPor && user?.email) {
                    const { data: uData } = await supabase.from('usuarios').select('nombre').eq('email', user.email).maybeSingle();
                    creadoPor = uData?.nombre || user.email;
                }

                const { data: createdId, error: rpcErr } = await supabase.rpc('crear_cliente_v5_final', {
                    p_payload: {
                        ...payload,
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
                        rubro: payload.rubro,
                        p_estado: payload.estado,
                        p_responsable: payload.responsable,
                        p_interes: payload.interes,
                        interes: payload.interes,
                        p_estilo_contacto: payload.estilo_contacto,
                        estilo_contacto: payload.estilo_contacto,
                        p_venta_digital: payload.venta_digital,
                        p_venta_digital_cual: payload.venta_digital_cual,
                        p_situacion: payload.situacion,
                        situacion: payload.situacion,
                        p_notas: payload.notas,
                        notas: payload.notas,
                        p_tipo_contacto: payload.tipo_contacto,
                        tipo_contacto: payload.tipo_contacto,
                        p_fecha_proximo_contacto: payload.fecha_proximo_contacto,
                        p_hora_proximo_contacto: payload.hora_proximo_contacto,
                        p_creado_por: creadoPor
                    }
                });

                if (rpcErr) {
                    finalErr = rpcErr;
                } else if (createdId) {
                    resultId = createdId;
                    // Log creation
                    const desc = `${initialLocation ? '📍' : '🆕'} Alta de cliente - Estado: ${payload.estado || 'Sin estado'}`;
                    await supabase.from('actividades').insert([{
                        cliente_id: resultId,
                        descripcion: desc,
                        usuario: creadoPor,
                        empresa_id: empresaActiva.id,
                        fecha: new Date().toISOString()
                    }]);

                    if (shouldRecordVisit) {
                        const now = new Date().toISOString();
                        await supabase.from('actividades').insert([{
                            cliente_id: resultId,
                            descripcion: `🚚 Visita inicial realizada - Estado: ${payload.estado}`,
                            fecha: now,
                            usuario: creadoPor,
                            empresa_id: empresaActiva.id
                        }]);
                        await supabase.from('empresa_cliente').update({ ultima_actividad: now }).eq('cliente_id', resultId).eq('empresa_id', empresaActiva.id);
                    }
                }
            }

            if (finalErr) {
                const isOffline = finalErr.message === 'Failed to fetch' || finalErr.message?.includes('fetch') || !navigator.onLine;
                if (isOffline) {
                    // Queue for offline sync
                    if (clienteId) {
                        await queueMutation('clientes', 'UPDATE', { id: clienteId, ...payload });
                        await queueMutation('empresa_cliente', 'UPDATE', { cliente_id: clienteId, empresa_id: empresaActiva.id, ...payload });
                    } else {
                        await queueMutation('_rpc_crear_cliente', 'INSERT', { empresa_id: empresaActiva.id, ...payload, registrar_visita: shouldRecordVisit });
                    }
                    toast.success('💾 Guardado sin conexión. Se sincronizará pronto.');
                    setIsDirty(false);
                    onSaved();
                } else {
                    throw finalErr;
                }
            } else {
                toast.success(clienteId ? 'Cliente actualizado' : 'Cliente creado exitosamente');
                
                // 3. Update Groups (Many-to-Many)
                if (resultId) {
                    await updateGruposMutation.mutateAsync({
                        clienteId: resultId.toString(),
                        empresaId: empresaActiva.id,
                        grupoIds: selectedGrupos
                    });
                }

                setIsDirty(false);
                onSaved();
            }
        } catch (error: any) {
            console.error('Error final guardando cliente:', error);
            toast.error(`Error al guardar: ${error.message || 'Ocurrió un error inesperado'}`);
        } finally {
            setLoading(false);
        }
    };


    const inp = (name: string, extra = {}) => ({
        name,
        value: formData[name] || '',
        onChange: handleChange,
        style: errors[name] ? ERR_STYLE : {},
        ...extra,
    });

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="modal is-open" 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
                    onClick={handleClose}
                >
                    <motion.div 
                        className="modal-content" style={{ maxWidth: '750px', width: '95%' }}
                        initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>{clienteId ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                            <button className="modal-close" type="button" onClick={handleClose}>
                                <X size={20} />
                            </button>
                        </div>

                {/* Step indicators */}
                {step > 0 && (
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
                )}

                <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown}>
                    <AnimatePresence mode="wait">
                    {clienteId && loading && Object.keys(formData).length === 0 ? (
                        <motion.div key="skeleton-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '10px 0' }}>
                            <div className="skeleton" style={{ gridColumn: '1 / -1', height: '24px', width: '35%', marginBottom: '8px', borderRadius: '6px' }} />
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="field">
                                    <div className="skeleton" style={{ height: '14px', width: '30%', marginBottom: '6px', borderRadius: '4px' }} />
                                    <div className="skeleton" style={{ height: '38px', width: '100%', borderRadius: '8px' }} />
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                    <motion.div key={step} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.2 }}>
                    
                    {/* ── STEP 0 ── */}
                    {step === 0 && (
                        <div>
                            <h3 style={{ marginBottom: '16px' }}>Verificar Teléfono</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                                Ingresá el teléfono del cliente para verificar si ya existe en la base de datos.
                            </p>
                            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                                <div className="field">
                                    <label>Teléfono *</label>
                                    <input type="text" {...inp('telefono')} placeholder="Ej: 112345678" onKeyDown={(e) => e.key === 'Enter' && handleVerifyPhone(e as any)} />
                                    <FieldError msg={errors.telefono} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
                                <Button variant="secondary" type="button" onClick={handleClose}>Cancelar</Button>
                                <Button variant="primary" type="button" onClick={handleVerifyPhone} disabled={verifyingPhone}>
                                    {verifyingPhone ? 'Verificando...' : 'Verificar y Continuar'}
                                </Button>
                            </div>
                        </div>
                    )}

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
                                    <select
                                        name="responsable"
                                        value={formData.responsable || ''}
                                        onChange={handleChange}
                                        style={{ background: 'var(--bg-elevated)', fontWeight: 500 }}
                                    >
                                        <option value="">Seleccionar responsable...</option>
                                        {[...new Set([...responsablesDB, formData.responsable])].filter(Boolean).map((r: any) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
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

                                {/* Conditional Visit Checkbox */}
                                <div className="field" style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                                    {formData.estado === ESTADO_RELEVADO ? (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                                            <input 
                                                type="checkbox" 
                                                name="registrar_visita" 
                                                checked={formData.registrar_visita === 'true'} 
                                                onChange={handleChange}
                                                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Registrar visita inicial</span>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Márcalo si ya estuviste físicamente en el local.</span>
                                            </div>
                                        </label>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#059669' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '1.2rem' }}>✅</span>
                                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Se registrará una visita automáticamente por el estado seleccionado.</span>
                                            </div>
                                        </div>
                                    )}
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
                                                        <div key={l.value} onClick={() => { setFormData(prev => ({ ...prev, interes: l.value })); setIsDirty(true); }}
                                                            style={{ flex: 1, borderRadius: '99px', cursor: 'pointer', background: i <= activeIdx ? activeColor : 'var(--border)', transition: 'background 0.25s ease', opacity: i <= activeIdx ? 1 : 0.4 }} />
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    {levels.map((l, i) => (
                                                        <button key={l.value} type="button" onClick={() => { setFormData(prev => ({ ...prev, interes: l.value })); setIsDirty(true); }}
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

                                {/* Grupos selection */}
                                {gruposDB.length > 0 && (
                                    <div className="field" style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <TagIcon size={14} /> Grupos / Etiquetas
                                        </label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                            {gruposDB.map(g => {
                                                const isSelected = selectedGrupos.includes(g.id.toString());
                                                return (
                                                    <button
                                                        key={g.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedGrupos(prev => 
                                                                isSelected 
                                                                    ? prev.filter(id => id !== g.id.toString())
                                                                    : [...prev, g.id.toString()]
                                                            );
                                                            setIsDirty(true);
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            borderRadius: '99px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            border: '2px solid',
                                                            background: isSelected ? g.color : 'transparent',
                                                            color: isSelected ? '#fff' : g.color,
                                                            borderColor: g.color,
                                                            opacity: isSelected ? 1 : 0.6
                                                        }}
                                                    >
                                                        {g.nombre}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Situación: visible siempre al editar, o cuando el estado es final al crear */}
                            {(clienteId || esEstadoFinal(formData.estado)) && (
                                <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '16px' }}>
                                    <div className="field">
                                        <label>Situación</label>
                                        <select name="situacion" value={formData.situacion || SITUACION_SIN_COMUNICACION} onChange={handleChange}>
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
                                                onClick={() => { setFormData(prev => ({ ...prev, fecha_proximo_contacto: '' })); setIsDirty(true); }}
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
                     </motion.div>
                    )}
                    </AnimatePresence>

                    {step > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                        <Button variant="secondary" type="button" onClick={() => handleStepChange(step > 1 ? step - 1 : 1)} style={{ visibility: step === 1 ? 'hidden' : 'visible' }}>
                            Anterior
                        </Button>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Button variant="secondary" type="button" onClick={handleClose}>Cancelar</Button>
                            {step < 3 ? (
                                <Button key="siguiente" variant="primary" type="button" onClick={handleNextPhase}>Siguiente</Button>
                            ) : (
                                <Button key="guardar" variant="primary" type="submit" disabled={loading}>
                                    {loading ? 'Guardando...' : 'Guardar Cliente'}
                                </Button>
                            )}
                        </div>
                    </div>
                    )}
                </form>
            </motion.div>

            <AnimatePresence>
            {showConfirm && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal active" style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(5px)' }}>
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="modal-content" style={{ maxWidth: '400px', width: '90%', textAlign: 'center', padding: '32px 24px', position: 'relative' }}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <AlertCircle size={32} />
                        </div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1.4rem' }}>¿Descartar cambios?</h3>
                        <p className="muted" style={{ margin: '0 0 24px', fontSize: '1rem', lineHeight: 1.5 }}>Tienes datos sin guardar en el formulario. Si sales ahora, se perderán para siempre.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Button variant="secondary" onClick={() => setShowConfirm(false)} style={{ flex: 1, padding: '12px' }}>
                                Volver al formulario
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
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
