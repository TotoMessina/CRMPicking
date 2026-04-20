import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    SITUACION_DEFAULT,
    SITUACION_SIN_COMUNICACION,
    SITUACION_EN_PROCESO,
    SITUACION_FUNCIONANDO
} from '../constants/estados';

/**
 * usePipelineSituations
 * Hook para obtener las situaciones (sub-estados) configuradas para la empresa activa.
 * 
 * @param {string} empresaId - ID de la empresa activa
 * @returns {Object} { situations, loading, error, refresh }
 */
export function usePipelineSituations(empresaId) {
    const [situations, setSituations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fallback defaults strings
    const DEFAULT_CONFIG = [
        { id: SITUACION_SIN_COMUNICACION, label: 'sin comunicacion nueva', color: '#94a3b8', orden: 1, is_default: true },
        { id: SITUACION_EN_PROCESO,       label: 'en proceso',             color: '#f59e0b', orden: 2, is_default: false },
        { id: SITUACION_FUNCIONANDO,      label: 'en funcionamiento',      color: '#10b981', orden: 3, is_default: false }
    ];

    const fetchSituations = async () => {
        if (!empresaId) return;
        setLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('empresa_pipeline_situaciones')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('orden', { ascending: true });

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                setSituations(data.map(s => ({
                    id: s.label, // Usamos el label como ID lógico
                    label: s.label,
                    color: s.color,
                    orden: s.orden,
                    is_default: s.is_default,
                    estados_visibles: s.estados_visibles || [],
                    db_id: s.id
                })));
            } else {
                setSituations(DEFAULT_CONFIG.map(s => ({ ...s, estados_visibles: [] })));
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
