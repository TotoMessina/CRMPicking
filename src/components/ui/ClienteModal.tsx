import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from './Button';
import toast from 'react-hot-toast';
import { X, AlertCircle, MapPin, Search, RefreshCw } from 'lucide-react';
import { geocodeAddress } from '../../lib/googleMaps';
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
import { usePipelineStates } from '../../hooks/usePipelineStates';
import { usePipelineSituations } from '../../hooks/usePipelineSituations';
import { aiProvider } from '../../lib/aiProvider';
import { Sparkles, Wand2 } from 'lucide-react';

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

// Fallback Form Layout (Backwards Compatibility)
const DEFAULT_FORM_LAYOUT = {
    steps: [
        {
            id: 1,
            title: "1. Datos del Local y Contacto",
            fields: [
                { key: 'nombre_local', label: 'Nombre del Local', type: 'text', required: true, isStandard: true },
                { key: 'direccion', label: 'Dirección', type: 'text', required: true, isStandard: true },
                { key: 'nombre', label: 'Nombre del Contacto', type: 'text', required: true, isStandard: true },
                { key: 'telefono', label: 'Teléfono', type: 'text', required: true, isStandard: true },
                { key: 'mail', label: 'Mail', type: 'text', required: false, isStandard: true },
                { key: 'cuit', label: 'CUIT', type: 'text', required: false, isStandard: true },
                { key: 'horarios_atencion', label: 'Horarios de Atención', type: 'text', required: false, isStandard: true },
                { key: 'estilo_contacto', label: 'Estilo de Contacto', type: 'select', required: false, isStandard: true, source: 'estilos_contacto' },
                { key: 'tipo_contacto', label: 'Tipo de Contacto', type: 'select', required: false, isStandard: true, source: 'tipos_contacto' },
                { key: 'responsable', label: 'Responsable', type: 'select', required: false, isStandard: true, source: 'responsables' }
            ]
        },
        {
            id: 2,
            title: "2. Clasificación del Cliente",
            fields: [
                { key: 'rubro', label: 'Rubro', type: 'select', required: true, isStandard: true, source: 'rubros' },
                { key: 'estado', label: 'Estado', type: 'select', required: false, isStandard: true, source: 'estados' },
                { key: 'interes', label: 'Interés', type: 'interes_bar', required: false, isStandard: true },
                { key: 'venta_digital', label: '¿Venta Digital?', type: 'venta_digital', required: false, isStandard: true },
                { key: 'grupos', label: 'Grupos / Etiquetas', type: 'grupos', required: false, isStandard: true },
                { key: 'situacion', label: 'Situación', type: 'situacion', required: false, isStandard: true }
            ]
        },
        {
            id: 3,
            title: "3. Agenda y Notas",
            fields: [
                { key: 'fecha_proximo_contacto', label: 'Próxima Visita', type: 'agenda', required: false, isStandard: true },
                { key: 'notas', label: 'Notas', type: 'textarea', required: false, isStandard: true }
            ]
        }
    ]
};

const ERR_STYLE = { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.18)' };

export const ClienteModal: React.FC<Props> = ({ isOpen, onClose, clienteId: initialClienteId, initialLocation, onSaved }) => {
    const { user, userName, empresaActiva, isDemoMode }: any = useAuth();
    const { states: COLUMNS, defaultState, loading: loadingStates } = usePipelineStates(empresaActiva?.id);
    const { situations: SITUACIONES, defaultSituation, loading: loadingSituations } = usePipelineSituations(empresaActiva?.id);
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
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isMagicThinking, setIsMagicThinking] = useState(false);

    // Grupos
    const { data: gruposDB = [] } = useGrupos(empresaActiva?.id);
    const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);

    const layout = empresaActiva?.config?.formLayout || DEFAULT_FORM_LAYOUT;
    const dynamicStepFields: Record<number, string[]> = {};
    layout.steps.forEach((s: any) => {
        dynamicStepFields[s.id] = s.fields.map((f: any) => f.key);
    });
    const totalSteps = layout.steps.length;
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
        estado: defaultState || ESTADO_DEFAULT, responsable: '',
        estilo_contacto: 'Sin definir', interes: 'Bajo',
        venta_digital: 'false', venta_digital_cual: '',
        situacion: defaultSituation || SITUACION_DEFAULT, notas: '',
        tipo_contacto: 'Visita Presencial',
        fecha_proximo_contacto: '', hora_proximo_contacto: '',
        lat: null, lng: null,
        registrar_visita: 'true',
        metadata: {},
        ...overrides,
    });

    const [formData, setFormData] = useState<FormData>(emptyForm());
    const [stepEnteredAt, setStepEnteredAt] = useState(Date.now());
    const [lastGeocodedAddress, setLastGeocodedAddress] = useState<string | null>(null);

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

    // Sync defaults when creating
    useEffect(() => {
        if (!isOpen || clienteId) return;
        if (defaultState || defaultSituation) {
            setFormData(prev => ({
                ...prev,
                estado: prev.estado || defaultState || ESTADO_DEFAULT,
                situacion: prev.situacion || defaultSituation || SITUACION_DEFAULT
            }));
        }
    }, [isOpen, clienteId, defaultState, defaultSituation]);

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
            const idString = data.id.toString();
            setClienteId(idString);
            setErrors(prev => { const n = { ...prev }; delete n.telefono; return n; });
            loadCliente(idString);
            handleStepChange(1);
        } else {
            toast.success('Teléfono nuevo, podés continuar con la carga.');
            setErrors(prev => { const n = { ...prev }; delete n.telefono; return n; });
            handleStepChange(1);
        }
    };
    
    const handleMagicFill = async () => {
        const name = formData.nombre_local?.trim();
        if (!name || name.length < 3) {
            toast.error('Ingresá el nombre del local para usar la IA');
            return;
        }

        setIsMagicThinking(true);
        const tid = toast.loading('IA analizando local...');

        try {
            const suggestion = await aiProvider.suggestClientDetails(name, formData.direccion);
            
            setFormData(prev => ({
                ...prev,
                rubro: prev.rubro || suggestion.rubro || prev.rubro,
                interes: suggestion.interes || prev.interes,
                notas: (prev.notas ? prev.notas + '\n' : '') + (suggestion.notas || '')
            }));

            toast.success('¡IA completó los datos!', { id: tid });
            setIsDirty(true);
        } catch (error) {
            toast.error('Error al consultar la IA', { id: tid });
        } finally {
            setIsMagicThinking(false);
        }
    };

    const handleGeocode = async () => {
        const currentAddress = formData.direccion?.trim();
        if (!currentAddress) {
            toast.error('Por favor, ingresá una dirección primero.');
            return;
        }

        // Optimization: Skip if the address hasn't changed since the last successful geocode
        if (lastGeocodedAddress === currentAddress) {
            toast.success('Ubicación ya actualizada para esta dirección.');
            return;
        }

        setIsGeocoding(true);
        const toastId = toast.loading('Buscando ubicación...');

        try {
            const coords = await geocodeAddress(currentAddress);
            if (coords) {
                setFormData(prev => ({
                    ...prev,
                    lat: coords.lat,
                    lng: coords.lng
                }));
                setLastGeocodedAddress(currentAddress);
                toast.success('Dirección ubicada correctamente.', { id: toastId });
                setIsDirty(true);
            } else {
                toast.error('No pudimos encontrar esa dirección. Intentá agregar ciudad o país.', { id: toastId });
            }
        } catch (error) {
            toast.error('Error al conectar con el servicio de mapas.', { id: toastId });
        } finally {
            setIsGeocoding(false);
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
            const numericId = parseInt(id, 10);
            const { data: ecData, error: ecError } = await (supabase as any)
                .from('empresa_cliente')
                .select('*, clientes(*, cliente_grupos(grupo_id))')
                .eq('cliente_id', numericId)
                .eq('empresa_id', empresaActiva?.id)
                .maybeSingle();

            if (ecError) throw ecError;

            let finalData: FormData;

            if (ecData) {
                // Merge both: fallback to universal if specific is null
                const rawClientes = (ecData as any).clientes || {};
                finalData = {
                    ...emptyForm(),
                    ...rawClientes,
                    ...ecData,
                    nombre_local: (ecData as any).nombre_local || rawClientes.nombre_local || '',
                    direccion: (ecData as any).direccion || rawClientes.direccion || '',
                    nombre: (ecData as any).nombre || rawClientes.nombre || '',
                    telefono: (ecData as any).telefono || rawClientes.telefono || '',
                    mail: (ecData as any).mail || rawClientes.mail || '',
                    cuit: (ecData as any).cuit || rawClientes.cuit || '',
                    estado: (ecData as any).estado || rawClientes.estado || defaultState || ESTADO_DEFAULT,
                    rubro: (ecData as any).rubro || rawClientes.rubro || '',
                    responsable: (ecData as any).responsable || rawClientes.responsable || '',
                    situacion: (ecData as any).situacion || rawClientes.situacion || defaultSituation || SITUACION_DEFAULT,
                    notas: (ecData as any).notas || rawClientes.notas || '',
                    tipo_contacto: (ecData as any).tipo_contacto || rawClientes.tipo_contacto || 'Visita Presencial',
                    fecha_proximo_contacto: (ecData as any).fecha_proximo_contacto || rawClientes.fecha_proximo_contacto || '',
                    hora_proximo_contacto: (ecData as any).hora_proximo_contacto || rawClientes.hora_proximo_contacto || '',
                    venta_digital: ((ecData as any).venta_digital || rawClientes.venta_digital) ? 'true' : 'false',
                    metadata: (ecData as any).metadata || {}
                };

                // Track the initial address to avoid redundant geocoding if it doesn't change
                if (finalData.direccion && finalData.lat && finalData.lng) {
                    setLastGeocodedAddress(finalData.direccion.trim());
                }

                // Remove the nested joined object to keep formData clean
                delete (finalData as any).clientes;
                
                // Set selected groups
                if ((ecData as any).clientes && (ecData as any).clientes.cliente_grupos) {
                    setSelectedGrupos(((ecData as any).clientes.cliente_grupos as any[]).map((cg: any) => cg.grupo_id.toString()));
                } else {
                    setSelectedGrupos([]);
                }
            } else {
                // Fallback to just universal if not found in company
                const { data, error } = await (supabase as any).from('clientes').select('*').eq('id', id).single();
                if (error) throw error;
                
                finalData = { 
                    ...emptyForm(), 
                    ...data,
                    nombre_local: data.nombre_local || '',
                    direccion: data.direccion || '',
                    nombre: data.nombre || '',
                    telefono: data.telefono || '',
                    mail: data.mail || '',
                    cuit: data.cuit || '',
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
        layout.steps.forEach((s: any) => {
            s.fields.forEach((f: any) => {
                if (f.required) {
                    const val = f.isStandard ? formData[f.key] : formData.metadata?.[f.key];
                    if (typeof val === 'string' ? !val.trim() : (val === undefined || val === null || val === '')) {
                        errs[f.key] = `El campo "${f.label}" es requerido`;
                    }
                }
            });
        });
        return errs;
    };

    const handleNextPhase = (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            for (const s of layout.steps.map((st: any) => st.id)) {
                const fields = dynamicStepFields[s] || [];
                if (fields.some(f => errs[f])) { handleStepChange(s); break; }
            }
        } else {
            handleStepChange(step + 1);
        }
    };

    const handleFormKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
            if (step < totalSteps) handleNextPhase(e);
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

            // --- SaaS NO-CODE AUTOMATIONS ENGINE ---
            const automations = empresaActiva?.config?.automations || [];
            if (automations.length > 0) {
                automations.forEach((rule: any) => {
                    if (rule.trigger === 'state_changed') {
                        const oldState = originalData?.estado || null;
                        const newState = payload.estado || null;
                        
                        const isMatch = (!clienteId && newState === rule.value) || 
                                        (clienteId && oldState !== newState && newState === rule.value);
                                        
                        if (isMatch) {
                            if (rule.action === 'assign_responsible') {
                                payload.responsable = rule.target;
                                formData.responsable = rule.target;
                                console.log(`[AUTOMATION] Triggered 'state_changed' to ${rule.value}. Action: assigned to ${rule.target}`);
                            } else if (rule.action === 'change_situation') {
                                payload.situacion = rule.target;
                                formData.situacion = rule.target;
                                console.log(`[AUTOMATION] Triggered 'state_changed' to ${rule.value}. Action: changed situation to ${rule.target}`);
                            }
                        }
                    }
                });
            }

            let finalErr;
            let resultId: string | number | null = clienteId;

            if (clienteId) {
                const numericId = parseInt(clienteId, 10);
                
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
                    metadata: formData.metadata || {}
                };

                // 1. First update company-specific record (stato/situacion - critical)
                const { error: cErr } = await supabase
                    .from('empresa_cliente')
                    .update({
                        ...companyFields,
                        updated_at: new Date().toISOString(),
                    } as any)
                    .eq('cliente_id', numericId)
                    .eq('empresa_id', empresaActiva.id);

                if (cErr) console.error('Error actualizando empresa_cliente:', cErr);

                // 2. Then update universal client record (name, address, coords)
                const { error: uErr } = await supabase
                    .from('clientes')
                    .update(universalFields as any)
                    .eq('id', numericId);

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
                        cliente_id: numericId,
                        descripcion: desc,
                        usuario: userName || user?.email || 'Sistema',
                        empresa_id: empresaActiva.id,
                        fecha: new Date().toISOString()
                    }] as any);
                }
            } else {
                // Creation logic (New Client) via RPC
                let creadoPor: string | null = userName || null;
                if (!creadoPor && user?.email) {
                    const { data: uData } = await supabase.from('usuarios').select('nombre').eq('email', user.email).maybeSingle();
                    creadoPor = uData?.nombre || user.email;
                }

                const { data: createdId, error: rpcErr } = await (supabase as any).rpc('crear_cliente_v5_final', {
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
                        p_creado_por: creadoPor,
                        metadata: formData.metadata || {}
                    }
                });

                if (rpcErr) {
                    finalErr = rpcErr;
                } else if (createdId) {
                    resultId = createdId;
                    const numericResultId = typeof resultId === 'string' ? parseInt(resultId, 10) : resultId;
                    
                    // Log creation
                    const desc = `${initialLocation ? '📍' : '🆕'} Alta de cliente - Estado: ${payload.estado || 'Sin estado'}`;
                    await supabase.from('actividades').insert([{
                        cliente_id: numericResultId,
                        descripcion: desc,
                        usuario: creadoPor,
                        empresa_id: empresaActiva.id,
                        fecha: new Date().toISOString()
                    }] as any);

                    if (shouldRecordVisit && numericResultId) {
                        const now = new Date().toISOString();
                        await (supabase as any).from('actividades').insert([{
                            cliente_id: numericResultId,
                            descripcion: `🚚 Visita inicial realizada - Estado: ${payload.estado}`,
                            fecha: now,
                            usuario: creadoPor,
                            empresa_id: empresaActiva.id
                        }] as any);
                        await (supabase as any).from('empresa_cliente').update({ ultima_actividad: now } as any).eq('cliente_id', numericResultId).eq('empresa_id', empresaActiva.id);
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

    const activeStepObj = layout.steps.find((st: any) => st.id === step);

    const renderDynamicField = (cf: any) => {
        const isStandard = cf.isStandard;
        const val = isStandard ? (formData[cf.key] ?? '') : (formData.metadata?.[cf.key] ?? '');
        const hasError = errors[cf.key];

        const handleFieldChange = (eVal: any) => {
            setFormData(prev => {
                if (isStandard) {
                    return { ...prev, [cf.key]: eVal };
                } else {
                    return {
                        ...prev,
                        metadata: {
                            ...(prev.metadata || {}),
                            [cf.key]: eVal
                        }
                    };
                }
            });
            setIsDirty(true);
            if (errors[cf.key]) setErrors(prev => { const n = { ...prev }; delete n[cf.key]; return n; });
        };

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            let eVal: any = e.target.value;
            if (e.target.type === 'checkbox') {
                eVal = (e.target as HTMLInputElement).checked;
            }
            handleFieldChange(eVal);
        };

        return (
            <div key={cf.key} className="field" style={{ gridColumn: cf.type === 'textarea' || cf.type === 'select' || cf.type === 'groups' || cf.type === 'venta_digital' ? '1 / -1' : 'auto' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{cf.label} {cf.required ? '*' : ''}</span>
                    {cf.key === 'nombre_local' && (
                        <button 
                            type="button" 
                            onClick={handleMagicFill}
                            disabled={isMagicThinking}
                            className={`ai-button ${isMagicThinking ? 'thinking' : ''}`}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.65rem', fontWeight: 800, 
                                padding: '2px 8px', borderRadius: '6px', 
                                textTransform: 'uppercase', letterSpacing: '0.05em'
                            }}
                        >
                            {isMagicThinking ? <Sparkles size={12} className="animate-spin" /> : <Wand2 size={12} />}
                            {isMagicThinking ? 'Analizando...' : 'Magic Fill'}
                        </button>
                    )}
                    {cf.key === 'direccion' && (
                        <button 
                            type="button" 
                            onClick={handleGeocode}
                            disabled={isGeocoding}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '0.75rem', fontWeight: 600, 
                                color: lastGeocodedAddress === (formData.direccion?.trim()) ? 'var(--text-muted)' : 'var(--accent)',
                                background: 'none', border: 'none', 
                                cursor: lastGeocodedAddress === (formData.direccion?.trim()) ? 'default' : 'pointer',
                                padding: '2px 6px', borderRadius: '4px', transition: 'all 0.2s',
                                opacity: isGeocoding ? 0.6 : 1
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(var(--accent-rgb), 0.1)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                        >
                            {isGeocoding ? <RefreshCw size={12} className="animate-spin" /> : <MapPin size={12} />}
                            {isGeocoding ? 'Buscando...' : 'Ubicar en mapa'}
                        </button>
                    )}
                </label>

                {cf.type === 'interes_bar' ? (
                    (() => {
                        const levels = [
                            { value: 'Bajo', color: '#94a3b8', label: 'Bajo' },
                            { value: 'Medio', color: '#f59e0b', label: 'Medio' },
                            { value: 'Alto', color: '#10b981', label: 'Alto' },
                        ];
                        const activeIdx = levels.findIndex(l => l.value === (val || 'Bajo'));
                        const activeColor = levels[activeIdx]?.color || '#94a3b8';
                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', gap: '4px', height: '10px' }}>
                                    {levels.map((l, i) => (
                                        <div key={l.value} onClick={() => handleFieldChange(l.value)}
                                            style={{ flex: 1, borderRadius: '99px', cursor: 'pointer', background: i <= activeIdx ? activeColor : 'var(--border)', transition: 'background 0.25s ease', opacity: i <= activeIdx ? 1 : 0.4 }} />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {levels.map((l, i) => (
                                        <button key={l.value} type="button" onClick={() => handleFieldChange(l.value)}
                                            style={{ flex: 1, padding: '6px 4px', fontSize: '0.78rem', fontWeight: 600, borderRadius: '8px', cursor: 'pointer', border: '1px solid', background: i <= activeIdx ? `${activeColor}18` : 'var(--bg)', color: i <= activeIdx ? activeColor : 'var(--text-muted)', borderColor: i <= activeIdx ? `${activeColor}60` : 'var(--border)', transition: 'all 0.2s ease' }}>
                                            {l.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                ) : cf.type === 'venta_digital' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', cursor: 'pointer', fontWeight: 500 }}>
                            <input type="checkbox" checked={val === 'true' || val === true} onChange={e => handleFieldChange(e.target.checked ? 'true' : 'false')}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                            {(val === 'true' || val === true) ? 'Sí, tiene venta digital' : 'No tiene venta digital'}
                        </label>
                        {(val === 'true' || val === true) && (
                            <input type="text" placeholder="¿Cuál? Ej: Pedidos Ya, Rappi..." value={formData.venta_digital_cual || ''} onChange={e => setFormData(p => ({ ...p, venta_digital_cual: e.target.value }))} style={{ marginTop: '4px' }} />
                        )}
                    </div>
                ) : cf.type === 'grupos' ? (
                    gruposDB.length > 0 && (
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
                    )
                ) : cf.type === 'groups' ? (
                    (() => {
                        let items: string[] = [];
                        if (cf.source === 'responsables') {
                            items = [...new Set([...responsablesDB, formData.responsable])].filter(Boolean);
                        } else if (cf.source === 'rubros') {
                            items = rubrosDB;
                        } else if (cf.source === 'estados') {
                            items = COLUMNS.map(col => col.label);
                        } else if (cf.source === 'tipos_contacto') {
                            items = ['Visita Presencial', 'Llamada'];
                        } else if (cf.source === 'estilos_contacto') {
                            items = ['Sin definir', 'Dueño', 'Empleado', 'Cerrado'];
                        } else if (cf.options && cf.options.length > 0) {
                            items = cf.options;
                        }

                        const currentList: string[] = typeof val === 'string' 
                            ? val.split(',').map(s => s.trim()).filter(Boolean) 
                            : (Array.isArray(val) ? val : []);

                        return (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                {items.map((item: string) => {
                                    const isSelected = currentList.includes(item);
                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => {
                                                const newList = isSelected
                                                    ? currentList.filter(v => v !== item)
                                                    : [...currentList, item];
                                                handleFieldChange(newList.join(', '));
                                            }}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '99px',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                border: '1px solid',
                                                background: isSelected ? 'var(--accent)' : 'transparent',
                                                color: isSelected ? '#fff' : 'var(--text-muted)',
                                                borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                                                opacity: isSelected ? 1 : 0.7
                                            }}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })()
                ) : cf.type === 'situacion' ? (
                    (clienteId || esEstadoFinal(formData.estado)) && (
                        <select name="situacion" value={formData.situacion || defaultSituation || SITUACION_SIN_COMUNICACION} onChange={handleInputChange}>
                            {SITUACIONES
                                .filter(s => !s.estados_visibles || s.estados_visibles.length === 0 || s.estados_visibles.includes(formData.estado))
                                .map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.label}
                                    </option>
                                ))}
                        </select>
                    )
                ) : cf.type === 'agenda' ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="date" value={val || ''} onChange={handleInputChange} style={{ flex: 1 }} />
                        {val && (
                            <button type="button" onClick={() => handleFieldChange('')} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 9px', borderRadius: '99px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
                        )}
                    </div>
                ) : cf.type === 'boolean' ? (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)', fontWeight: 500, fontSize: '0.9rem' }}>
                        <input 
                            type="checkbox" 
                            checked={Boolean(val)} 
                            onChange={e => handleFieldChange(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
                        />
                        {cf.label}
                    </label>
                ) : cf.type === 'select' ? (
                    <select value={val || ''} onChange={handleInputChange} style={hasError ? ERR_STYLE : {}}>
                        <option value="">Seleccionar...</option>
                        {cf.options && cf.options.length > 0 ? (
                            cf.options.map((o: string) => <option key={o} value={o}>{o}</option>)
                        ) : cf.source === 'rubros' ? (
                            rubrosDB.map((r: string) => <option key={r} value={r}>{r}</option>)
                        ) : cf.source === 'estados' ? (
                            COLUMNS.map((col, idx) => (
                                <option key={col.id} value={col.id}>
                                    {idx + 1} - {col.label}
                                </option>
                            ))
                        ) : cf.source === 'responsables' ? (
                            [...new Set([...responsablesDB, formData.responsable])].filter(Boolean).map((r: any) => (
                                <option key={r} value={r}>{r}</option>
                            ))
                        ) : cf.source === 'tipos_contacto' ? (
                            <>
                                <option value="Visita Presencial">Visita Presencial</option>
                                <option value="Llamada">Llamada</option>
                            </>
                        ) : cf.source === 'estilos_contacto' ? (
                            <>
                                <option value="Sin definir">Sin definir</option>
                                <option value="Dueño">Dueño</option>
                                <option value="Empleado">Empleado</option>
                                <option value="Cerrado">Cerrado</option>
                            </>
                        ) : null}
                    </select>
                ) : cf.type === 'textarea' ? (
                    <textarea value={val || ''} onChange={handleInputChange} style={hasError ? ERR_STYLE : {}} rows={3} />
                ) : (
                    <div style={{ position: 'relative' }}>
                        <input 
                            type={cf.type === 'number' ? 'number' : 'text'} 
                            value={val || ''} 
                            onChange={handleInputChange} 
                            style={{
                                ...(hasError ? ERR_STYLE : {}),
                                ...(cf.key === 'direccion' ? { paddingRight: '35px' } : {})
                            }}
                            placeholder={cf.placeholder || 'Completar...'}
                        />
                        {cf.key === 'direccion' && formData.lat && formData.lng && !isGeocoding && (
                            <div title="Ubicación fijada" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)' }} />
                            </div>
                        )}
                    </div>
                )}
                <FieldError msg={hasError} />
            </div>
        );
    };

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
                    {layout.steps.map((st: any) => (
                        <div
                            key={st.id}
                            className={`step-indicator ${step === st.id ? 'active' : ''} ${(dynamicStepFields[st.id] || []).some(f => errors[f]) ? 'error' : ''}`}
                            onClick={() => handleStepChange(st.id)}
                            style={{
                                cursor: 'pointer',
                                ...((dynamicStepFields[st.id] || []).some(f => errors[f]) ? { background: '#ef4444', opacity: 1 } : {})
                            }}
                            title={st.title}
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

                    {/* Dynamic step rendering */}
                    {step > 0 && activeStepObj && (
                        <div>
                            <h3 style={{ marginBottom: '16px' }}>{activeStepObj.title}</h3>
                            <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {activeStepObj.fields.map((cf: any) => renderDynamicField(cf))}
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
                            {step < totalSteps ? (
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
