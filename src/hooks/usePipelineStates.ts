import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    ESTADO_RELEVADO, 
    ESTADO_VISITADO_NO_ACTIVO, 
    ESTADO_PRIMER_INGRESO, 
    ESTADO_LOCAL_CREADO, 
    ESTADO_ACTIVO, 
    ESTADO_NO_INTERESADO 
} from '../constants/estados';

export interface PipelineState {
    id: string;
    label: string;
    color: string;
    orden: number;
    is_default: boolean;
    db_id?: string;
}

/**
 * usePipelineStates
 */
export function usePipelineStates(empresaId: string | undefined) {
    const [states, setStates] = useState<PipelineState[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);

    const DEFAULT_CONFIG: PipelineState[] = [
        { id: ESTADO_RELEVADO,           label: 'Relevado',          color: '#64748b', orden: 1, is_default: true },
        { id: ESTADO_VISITADO_NO_ACTIVO,  label: 'Visitado (No Act)', color: '#ef4444', orden: 2, is_default: false },
        { id: ESTADO_PRIMER_INGRESO,     label: 'Primer Ingreso',    color: '#f59e0b', orden: 3, is_default: false },
        { id: ESTADO_LOCAL_CREADO,       label: 'Creado',            color: '#0c0c0c', orden: 4, is_default: false },
        { id: ESTADO_ACTIVO,             label: 'Visitado (Activo)', color: '#10b981', orden: 5, is_default: false },
        { id: ESTADO_NO_INTERESADO,      label: 'No Interesado',     color: '#ef4444', orden: 6, is_default: false }
    ];

    const fetchStates = async () => {
        if (!empresaId) return;
        setLoading(true);
        try {
            const { data, error: fetchError } = await (supabase as any)
                .from('empresa_pipeline_estados')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('orden', { ascending: true });

            if (fetchError) throw fetchError;

            if (data && (data as any[]).length > 0) {
                setStates((data as any[]).map((s: any) => ({
                    id: s.label,
                    label: s.label,
                    color: s.color,
                    orden: s.orden,
                    is_default: s.is_default,
                    db_id: s.id
                })));
            } else {
                setStates(DEFAULT_CONFIG);
            }
        } catch (err) {
            console.error("Error fetching pipeline states:", err);
            setError(err);
            setStates(DEFAULT_CONFIG);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStates();
    }, [empresaId]);

    return { 
        states, 
        loading, 
        error, 
        refresh: fetchStates,
        defaultState: states.find(s => s.is_default)?.label || ESTADO_RELEVADO
    };
}
