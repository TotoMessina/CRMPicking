import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface FormData {
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

interface UseGuardarClienteProps {
    isOpen: boolean;
    onClose: () => void;
    clienteId: string | null;
    initialLocation?: { lat: number; lng: number } | null;
    onSaved: () => void;
}

export const STEP_FIELDS: Record<number, string[]> = {
    1: ['nombre_local', 'direccion', 'nombre', 'telefono'],
    2: ['rubro'],
    3: [],
};

const emptyForm = (overrides = {}): FormData => ({
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

export const useGuardarCliente = ({ isOpen, onClose, clienteId, initialLocation, onSaved }: UseGuardarClienteProps) => {
    const { user, userName, empresaActiva }: any = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [originalData, setOriginalData] = useState<FormData | null>(null);
    const [formData, setFormData] = useState<FormData>(emptyForm());
    const [stepEnteredAt, setStepEnteredAt] = useState(Date.now());

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
            .eq('cliente_id', parseInt(id, 10))
            .eq('empresa_id', empresaActiva?.id)
            .single();

        if (ecError) {
            const { data, error } = await supabase.from('clientes').select('*').eq('id', parseInt(id, 10)).single();
            if (error) {
                toast.error('Error cargando cliente');
                onClose();
            } else {
                setFormData({ ...emptyForm(), ...data, venta_digital: data.venta_digital ? 'true' : 'false' });
                setErrors({});
            }
        } else if (ecData) {
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
        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

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

        if (step === 3 && Date.now() - stepEnteredAt < 500) return;

        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setErrors(errs);
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

        if (formData.estado?.startsWith('4') || formData.estado?.startsWith('5')) {
            rawPayload.activador_cierre = userName || user?.email || null;
        }

        const payload = { ...rawPayload };

        if (initialLocation && !clienteId) {
            payload.lat = parseFloat(initialLocation.lat as any);
            payload.lng = parseFloat(initialLocation.lng as any);
        }

        if (!empresaActiva?.id) {
            toast.error('Error: No se detectó una empresa activa. Por favor, seleccioná una empresa antes de crear un cliente.');
            setLoading(false);
            return;
        }

        let err;
        if (clienteId) {
            const universalFields = {
                nombre_local: payload.nombre_local, nombre: payload.nombre, direccion: payload.direccion,
                lat: payload.lat, lng: payload.lng, telefono: payload.telefono, mail: payload.mail, cuit: payload.cuit,
                estado: payload.estado, rubro: payload.rubro, responsable: payload.responsable,
                situacion: payload.situacion, notas: payload.notas, fecha_proximo_contacto: payload.fecha_proximo_contacto,
            };
            const companyFields = {
                estado: payload.estado, rubro: payload.rubro, responsable: payload.responsable,
                estilo_contacto: payload.estilo_contacto, interes: payload.interes, tipo_contacto: payload.tipo_contacto,
                venta_digital: payload.venta_digital, venta_digital_cual: payload.venta_digital_cual,
                situacion: payload.situacion, notas: payload.notas,
                fecha_proximo_contacto: payload.fecha_proximo_contacto, hora_proximo_contacto: payload.hora_proximo_contacto,
                activador_cierre: payload.activador_cierre,
            };

            const { error: uErr } = await supabase.from('clientes').update(universalFields).eq('id', parseInt(clienteId, 10));
            const { error: cErr } = await supabase.from('empresa_cliente').update(companyFields).eq('cliente_id', parseInt(clienteId, 10)).eq('empresa_id', empresaActiva.id);

            err = uErr || cErr;

            if (!err) {
                const parts = [];
                if (originalData?.estado && payload.estado && originalData.estado !== payload.estado) parts.push(`Cambio de Estado: ${originalData.estado} ➔ ${payload.estado}`);
                else if (payload.estado) parts.push(`Estado: ${payload.estado}`);

                if (payload.situacion && (payload.estado?.startsWith('4') || payload.estado?.startsWith('5'))) {
                    if (originalData?.situacion !== payload.situacion) parts.push(`Nueva Situación: ${payload.situacion}`);
                }

                if (payload.notas && originalData?.notas !== payload.notas) parts.push(`Nota actualizada: "${payload.notas}"`);

                const desc = `✏️ Edición de cliente${parts.length ? ': ' + parts.join(' · ') : ''}`;
                await supabase.from('actividades').insert([{
                    cliente_id: parseInt(clienteId as string, 10), descripcion: desc, usuario: userName || user?.email || 'Sistema',
                    empresa_id: empresaActiva.id, fecha: new Date().toISOString()
                }]);
            }
        } else {
            let creadoPor = userName || null;
            if (!creadoPor && user?.email) {
                const { data: uData } = await supabase.from('usuarios').select('nombre').eq('email', user.email).maybeSingle();
                creadoPor = uData?.nombre || user.email;
            }

            const { data: result, error: rpcErr } = await supabase.rpc('crear_cliente_v5_final', {
                p_payload: {
                    p_nombre_local: payload.nombre_local, p_nombre: payload.nombre, p_direccion: payload.direccion,
                    p_telefono: payload.telefono, p_mail: payload.mail, p_cuit: payload.cuit,
                    p_lat: payload.lat, p_lng: payload.lng, p_empresa_id: empresaActiva.id, p_rubro: payload.rubro,
                    p_estado: payload.estado, p_responsable: payload.responsable, p_interes: payload.interes,
                    p_estilo_contacto: payload.estilo_contacto, p_venta_digital: payload.venta_digital,
                    p_venta_digital_cual: payload.venta_digital_cual, p_situacion: payload.situacion,
                    p_notas: payload.notas, p_tipo_contacto: payload.tipo_contacto,
                    p_fecha_proximo_contacto: payload.fecha_proximo_contacto, p_hora_proximo_contacto: payload.hora_proximo_contacto,
                    p_creado_por: creadoPor
                }
            });

            if (rpcErr) {
                err = rpcErr;
            } else if (result) {
                const isMapCreation = !!initialLocation;
                const icon = isMapCreation ? '📍' : '🆕';
                const origin = isMapCreation ? 'Alta de local desde el mapa' : 'Alta de cliente';
                const initialStatus = payload.estado || 'Sin estado';
                const desc = `${icon} ${origin} - Estado inicial: ${initialStatus}`;

                await supabase.from('actividades').insert([{
                    cliente_id: parseInt(result as any, 10), descripcion: desc, usuario: creadoPor,
                    empresa_id: empresaActiva.id, fecha: new Date().toISOString()
                }]);
            }
        }

        if (err) {
            const isOfflineError = (err as any).message === 'Failed to fetch' || (err as any).message?.includes('fetch') || !navigator.onLine;
            if (isOfflineError) {
                toast.success('Guardado sin conexión. Se sincronizará pronto.');
                onSaved();
            } else {
                toast.error(`Error al guardar: ${(err as any).message || 'Ocurrió un error inesperado'}`);
            }
        } else {
            toast.success(clienteId ? 'Cliente actualizado' : 'Cliente creado exitosamente');
            onSaved();
        }
        setLoading(false);
    };

    return {
        step, loading, errors, formData, setFormData, handleChange, handleStepChange, handleNextPhase, handleFormKeyDown, handleSubmit
    };
};
