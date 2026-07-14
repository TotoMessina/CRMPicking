import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { geocodeAddress } from '../lib/googleMaps';
import { queueMutation } from '../lib/offlineManager';
import { aiProvider } from '../lib/aiProvider';
import {
    ESTADO_DEFAULT, SITUACION_DEFAULT, ESTADO_RELEVADO,
    SITUACION_SIN_COMUNICACION, esEstadoFinal
} from '../constants/estados';
import { useUpdateClienteGrupos } from './useGrupos';

export interface FormData {
    nombre_local: string;
    direccion: string;
    nombre: string;
    telefono: string;
    mail: string;
    cuit: string;
    horarios_atencion: string | null;
    rubro: string | null;
    estado: string | null;
    responsable: string | null;
    estilo_contacto: string | null;
    interes: string | null;
    venta_digital: string;
    venta_digital_cual: string | null;
    situacion: string | null;
    notas: string | null;
    tipo_contacto: string | null;
    fecha_proximo_contacto: string | null;
    hora_proximo_contacto: string | null;
    lat: number | null | string;
    lng: number | null | string;
    registrar_visita: string;
    [key: string]: any;
}

export const DEFAULT_FORM_LAYOUT = {
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

interface UseClienteFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialClienteId: string | null;
    initialLocation?: { lat: number; lng: number } | null;
    onSaved: () => void;
    empresaActiva: any;
    userName?: string | null;
    user: any;
    defaultState: string;
    defaultSituation: string;
}

interface EmpresaClienteWithNested {
    id: string | number;
    nombre_local?: string;
    direccion?: string;
    nombre?: string;
    telefono?: string;
    mail?: string;
    cuit?: string;
    estado?: string;
    rubro?: string;
    responsable?: string;
    situacion?: string;
    notas?: string;
    tipo_contacto?: string;
    fecha_proximo_contacto?: string;
    hora_proximo_contacto?: string;
    venta_digital?: boolean;
    metadata?: Record<string, any> | null;
    clientes?: {
        nombre_local?: string;
        direccion?: string;
        nombre?: string;
        telefono?: string;
        mail?: string;
        cuit?: string;
        estado?: string;
        rubro?: string;
        responsable?: string;
        situacion?: string;
        notas?: string;
        tipo_contacto?: string;
        fecha_proximo_contacto?: string;
        hora_proximo_contacto?: string;
        venta_digital?: boolean;
        metadata?: Record<string, any> | null;
        cliente_grupos?: { grupo_id: string | number }[];
    } | null;
}

export function useClienteForm({
    isOpen,
    onClose,
    initialClienteId,
    initialLocation,
    onSaved,
    empresaActiva,
    userName,
    user,
    defaultState,
    defaultSituation
}: UseClienteFormProps) {
    const { t } = useTranslation();

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
    const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
    const [stepEnteredAt, setStepEnteredAt] = useState(Date.now());
    const [lastGeocodedAddress, setLastGeocodedAddress] = useState<string | null>(null);

    const layout = empresaActiva?.config?.formLayout || DEFAULT_FORM_LAYOUT;
    const dynamicStepFields: Record<number, string[]> = {};
    layout.steps.forEach((s: any) => {
        dynamicStepFields[s.id] = s.fields.map((f: any) => f.key);
    });
    const totalSteps = layout.steps.length;
    const updateGruposMutation = useUpdateClienteGrupos();
 
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

    const handleClose = () => {
        if (isDirty) {
            setShowConfirm(true);
            return;
        }
        setIsDirty(false);
        onClose();
    };

    const handleStepChange = (newStep: number) => {
        setStep(newStep);
        setStepEnteredAt(Date.now());
    };

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
        if (!isOpen || clienteId) return;
        if (defaultState || defaultSituation) {
            setFormData(prev => ({
                ...prev,
                estado: prev.estado || defaultState || ESTADO_DEFAULT,
                situacion: prev.situacion || defaultSituation || SITUACION_DEFAULT
            }));
        }
    }, [isOpen, clienteId, defaultState, defaultSituation]);

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

    const loadCliente = async (id: string) => {
        setLoading(true);
        try {
            const numericId = parseInt(id, 10);
            const { data: ecData, error: ecError } = await supabase
                .from('empresa_cliente')
                .select('*, clientes(*, cliente_grupos(grupo_id))')
                .eq('cliente_id', numericId)
                .eq('empresa_id', empresaActiva?.id)
                .maybeSingle();

            if (ecError) throw ecError;

            let finalData: FormData;

            if (ecData) {
                const ec = ecData as unknown as EmpresaClienteWithNested;
                const rawClientes = ec.clientes || {};
                finalData = {
                    ...emptyForm(),
                    ...rawClientes,
                    ...ec,
                    nombre_local: ec.nombre_local || rawClientes.nombre_local || '',
                    direccion: ec.direccion || rawClientes.direccion || '',
                    nombre: ec.nombre || rawClientes.nombre || '',
                    telefono: ec.telefono || rawClientes.telefono || '',
                    mail: ec.mail || rawClientes.mail || '',
                    cuit: ec.cuit || rawClientes.cuit || '',
                    estado: ec.estado || rawClientes.estado || defaultState || ESTADO_DEFAULT,
                    rubro: ec.rubro || rawClientes.rubro || '',
                    responsable: ec.responsable || rawClientes.responsable || '',
                    situacion: ec.situacion || rawClientes.situacion || defaultSituation || SITUACION_DEFAULT,
                    notas: ec.notas || rawClientes.notas || '',
                    tipo_contacto: ec.tipo_contacto || rawClientes.tipo_contacto || 'Visita Presencial',
                    fecha_proximo_contacto: ec.fecha_proximo_contacto || rawClientes.fecha_proximo_contacto || '',
                    hora_proximo_contacto: ec.hora_proximo_contacto || rawClientes.hora_proximo_contacto || '',
                    venta_digital: (ec.venta_digital || rawClientes.venta_digital) ? 'true' : 'false',
                    metadata: ec.metadata || {}
                };

                if (finalData.direccion && finalData.lat && finalData.lng) {
                    setLastGeocodedAddress(finalData.direccion.trim());
                }

                const finalDataObj = finalData as Record<string, any>;
                delete finalDataObj.clientes;
                
                if (ec.clientes && ec.clientes.cliente_grupos) {
                    setSelectedGrupos((ec.clientes.cliente_grupos).map(cg => cg.grupo_id.toString()));
                } else {
                    setSelectedGrupos([]);
                }
            } else {
                const { data, error } = await supabase.from('clientes').select('*').eq('id', Number(id)).single();
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

            if (!finalData.responsable && (userName || user?.email)) {
                finalData.responsable = userName || user?.email;
                setIsDirty(true);
            }

            setFormData(finalData);
            setOriginalData(finalData);
            setErrors({});
        } catch (error: any) {
            console.error('Error cargando cliente:', error);
            toast.error(t('clients.modal.toast.load_error'));
            handleClose();
        } finally {
            setLoading(false);
            setIsDirty(false);
        }
    };

    const handleVerifyPhone = async (e?: React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        const tel = formData.telefono?.trim();
        if (!tel) {
            setErrors({ telefono: t('clients.modal.errors.phone_verify') });
            return;
        }

        setVerifyingPhone(true);
        const { data } = await supabase
            .from('clientes')
            .select('id, nombre, nombre_local')
            .eq('telefono', tel)
            .maybeSingle();

        setVerifyingPhone(false);

        if (data && data.id) {
            toast.success(t('clients.modal.toast.client_found', { name: data.nombre_local || data.nombre }));
            const idString = data.id.toString();
            setClienteId(idString);
            setErrors(prev => { const n = { ...prev }; delete n.telefono; return n; });
            loadCliente(idString);
            handleStepChange(1);
        } else {
            toast.success(t('clients.modal.toast.new_phone'));
            setErrors(prev => { const n = { ...prev }; delete n.telefono; return n; });
            handleStepChange(1);
        }
    };

    const handleMagicFill = async () => {
        const name = formData.nombre_local?.trim();
        if (!name || name.length < 3) {
            toast.error(t('clients.modal.errors.local_name_ia'));
            return;
        }

        setIsMagicThinking(true);
        const tid = toast.loading(t('clients.modal.ia.analyzing'));

        try {
            const suggestion = await aiProvider.suggestClientDetails(name, formData.direccion);
            
            setFormData(prev => ({
                ...prev,
                rubro: prev.rubro || suggestion.rubro || prev.rubro,
                interes: suggestion.interes || prev.interes,
                notas: (prev.notas ? prev.notas + '\n' : '') + (suggestion.notas || '')
            }));

            toast.success(t('clients.modal.ia.completed'), { id: tid });
            setIsDirty(true);
        } catch (error) {
            toast.error(t('clients.modal.ia.error'), { id: tid });
        } finally {
            setIsMagicThinking(false);
        }
    };

    const handleGeocode = async () => {
        const currentAddress = formData.direccion?.trim();
        if (!currentAddress) {
            toast.error(t('common.errors.enter_address_first', { defaultValue: 'Por favor, ingresá una dirección primero.' }));
            return;
        }

        if (lastGeocodedAddress === currentAddress) {
            toast.success(t('clients.modal.ia.geocode_success'));
            return;
        }

        setIsGeocoding(true);
        const toastId = toast.loading(t('clients.modal.ia.geocoding'));

        try {
            const coords = await geocodeAddress(currentAddress);
            if (coords) {
                setFormData(prev => ({
                    ...prev,
                    lat: coords.lat,
                    lng: coords.lng
                }));
                setLastGeocodedAddress(currentAddress);
                toast.success(t('clients.modal.ia.geocode_success'), { id: toastId });
                setIsDirty(true);
            } else {
                toast.error(t('clients.modal.ia.geocode_error'), { id: toastId });
            }
        } catch (error) {
            toast.error(t('clients.modal.ia.maps_error'), { id: toastId });
        } finally {
            setIsGeocoding(false);
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

        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        layout.steps.forEach((s: any) => {
            s.fields.forEach((f: any) => {
                if (f.required) {
                    const val = f.isStandard ? formData[f.key] : formData.metadata?.[f.key];
                    if (typeof val === 'string' ? !val.trim() : (val === undefined || val === null || val === '')) {
                        errs[f.key] = t('clients.modal.errors.required', { label: f.label });
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
            else handleSubmit(e);
        }
    };

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        if (step === layout.steps.length && Date.now() - stepEnteredAt < 500) {
            return;
        }

        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
            for (const [s, fields] of Object.entries(dynamicStepFields)) {
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

            if (esEstadoFinal(formData.estado)) {
                rawPayload.activador_cierre = userName || user?.email || null;
            }

            const payload = { ...rawPayload };

            if (initialLocation && !clienteId) {
                payload.lng = initialLocation.lng;
                payload.lat = initialLocation.lat;
            }

            const shouldRecordVisit = payload.estado !== ESTADO_RELEVADO || formData.registrar_visita === 'true';

            if (!empresaActiva?.id) {
                toast.error('Error: No se detectó una empresa activa.');
                setLoading(false);
                return;
            }

            const automations = empresaActiva?.config?.automations || [];
            if (automations.length > 0) {
                automations.forEach((rule: any) => {
                    let isMatch = false;
                    if (rule.trigger === 'state_changed') {
                        const oldState = originalData?.estado || null;
                        const newState = payload.estado || null;
                        isMatch = !!((!clienteId && newState === rule.value) || 
                                    (clienteId && oldState !== newState && newState === rule.value));
                    } else if (rule.trigger === 'interest_changed') {
                        const oldVal = originalData?.interes || null;
                        const newVal = payload.interes || null;
                        isMatch = !!((!clienteId && newVal === rule.value) || 
                                    (clienteId && oldVal !== newVal && newVal === rule.value));
                    }
                                        
                    if (isMatch) {
                        if (rule.action === 'assign_responsible') {
                            payload.responsable = rule.target;
                            formData.responsable = rule.target;
                        } else if (rule.action === 'change_situation') {
                            payload.situacion = rule.target;
                            formData.situacion = rule.target;
                        } else if (rule.action === 'auto_schedule') {
                            const daysToAdd = parseInt(rule.target) || 7;
                            const futureDate = new Date();
                            futureDate.setDate(futureDate.getDate() + daysToAdd);
                            const dateString = futureDate.toISOString().split('T')[0];
                            payload.fecha_proximo_contacto = dateString;
                            formData.fecha_proximo_contacto = dateString;
                        } else if (rule.action === 'add_note') {
                            const noteText = rule.target || 'Nota automática';
                            const currentNotes = payload.notas || '';
                            const timestamp = new Date().toLocaleDateString();
                            const finalNote = currentNotes 
                                ? `${currentNotes}\n\n[🤖 ${timestamp}]: ${noteText}` 
                                : `[🤖 ${timestamp}]: ${noteText}`;
                            payload.notas = finalNote;
                            formData.notas = finalNote;
                        }
                    }
                });
            }

            let finalErr;
            let resultId: string | number | null = clienteId;

            if (clienteId) {
                const numericId = parseInt(clienteId, 10);
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

                const { error: cErr } = await supabase
                    .from('empresa_cliente')
                    .update({
                        ...companyFields,
                        updated_at: new Date().toISOString(),
                    } as any)
                    .eq('cliente_id', numericId)
                    .eq('empresa_id', empresaActiva.id);

                const { error: uErr } = await supabase
                    .from('clientes')
                    .update(universalFields as any)
                    .eq('id', numericId);

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
                let creadoPor: string | null = userName || null;
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
                        p_creado_por: creadoPor,
                        metadata: formData.metadata || {}
                    }
                });

                if (rpcErr) {
                    finalErr = rpcErr;
                } else if (createdId) {
                    resultId = createdId;
                    const numericResultId = typeof resultId === 'string' ? parseInt(resultId, 10) : resultId;
                    
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
                        await supabase.from('actividades').insert([{
                            cliente_id: numericResultId,
                            descripcion: `🚚 Visita inicial realizada - Estado: ${payload.estado}`,
                            fecha: now,
                            usuario: creadoPor,
                            empresa_id: empresaActiva.id
                        }] as any);
                        await supabase.from('empresa_cliente').update({ ultima_actividad: now } as any).eq('cliente_id', numericResultId).eq('empresa_id', empresaActiva.id);
                    }
                }
            }

            if (finalErr) {
                const isOffline = finalErr.message === 'Failed to fetch' || finalErr.message?.includes('fetch') || !navigator.onLine;
                if (isOffline) {
                    if (clienteId) {
                        await queueMutation('clientes', 'UPDATE', { id: clienteId, ...payload });
                        await queueMutation('empresa_cliente', 'UPDATE', { cliente_id: clienteId, empresa_id: empresaActiva.id, ...payload });
                    } else {
                        await queueMutation('_rpc_crear_cliente', 'INSERT', { empresa_id: empresaActiva.id, ...payload, registrar_visita: shouldRecordVisit });
                    }
                    toast.success(t('clients.modal.toast.saved_offline'));
                    setIsDirty(false);
                    onSaved();
                } else {
                    throw finalErr;
                }
            } else {
                toast.success(clienteId ? t('clients.modal.toast.updated') : t('clients.modal.toast.created'));
                
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
            toast.error(t('clients.modal.toast.save_error', { error: error.message || t('common.errors.unexpected', { defaultValue: 'Ocurrió un error inesperado' }) }));
        } finally {
            setLoading(false);
        }
    };

    return {
        step,
        loading,
        errors,
        formData,
        isDirty,
        showConfirm,
        clienteId,
        verifyingPhone,
        isGeocoding,
        isMagicThinking,
        selectedGrupos,
        totalSteps,
        layout,
        dynamicStepFields,
        setStep,
        setFormData,
        setSelectedGrupos,
        setShowConfirm,
        setIsDirty,
        handleVerifyPhone,
        handleMagicFill,
        handleGeocode,
        handleClose,
        handleStepChange,
        handleChange,
        handleNextPhase,
        handleFormKeyDown,
        handleSubmit
    };
}
