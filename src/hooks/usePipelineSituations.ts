import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    SITUACION_DEFAULT,
    SITUACION_SIN_COMUNICACION,
    SITUACION_EN_PROCESO,
    SITUACION_FUNCIONANDO
} from '../constants/estados';

export interface PipelineSituation {
    id: string;
    label: string;
    color: string;
    orden: number;
    is_default: boolean;
    estados_visibles?: string[];
    db_id?: string;
}

/**
 * usePipelineSituations
 */
export function usePipelineSituations(empresaId: string | undefined) {
    const [situations, setSituations] = useState<PipelineSituation[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);

    const DEFAULT_CONFIG: PipelineSituation[] = [
        { id: SITUACION_SIN_COMUNICACION, label: 'sin comunicacion nueva', color: '#94a3b8', orden: 1, is_default: true, estados_visibles: [] },
        { id: SITUACION_EN_PROCESO,       label: 'en proceso',             color: '#f59e0b', orden: 2, is_default: false, estados_visibles: [] },
        { id: SITUACION_FUNCIONANDO,      label: 'en funcionamiento',      color: '#10b981', orden: 3, is_default: false, estados_visibles: [] }
    ];

    const fetchSituations = async () => {
        if (!empresaId) return;
        setLoading(true);
        try {
            const { data, error: fetchError } = await (supabase as any)
                .from('empresa_pipeline_situaciones')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('orden', { ascending: true });

            if (fetchError) throw fetchError;

            if (data && (data as any[]).length > 0) {
                setSituations((data as any[]).map((s: any) => ({
                    id: s.label,
                    label: s.label,
                    color: s.color,
                    orden: s.orden,
                    is_default: s.is_default,
                    estados_visibles: s.estados_visibles || [],
                    db_id: s.id
                })));
            } else {
                setSituations(DEFAULT_CONFIG);
            }
        } catch (err) {
            console.error("Error fetching pipeline situations:", err);
            setError(err);
            setSituations(DEFAULT_CONFIG);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSituations();
    }, [empresaId]);

    return { 
        situations, 
        loading, 
        error, 
        refresh: fetchSituations,
        defaultSituation: situations.find(s => s.is_default)?.label || SITUACION_DEFAULT
    };
}
