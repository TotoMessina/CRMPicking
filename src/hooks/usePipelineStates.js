import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    ESTADOS_LISTA, 
    ESTADO_RELEVADO, 
    ESTADO_VISITADO_NO_ACTIVO, 
    ESTADO_PRIMER_INGRESO, 
    ESTADO_LOCAL_CREADO, 
    ESTADO_ACTIVO, 
    ESTADO_NO_INTERESADO 
} from '../constants/estados';

/**
 * usePipelineStates
 * Hook para obtener los estados del pipeline configurados para la empresa activa.
 * 
 * @param {string} empresaId - ID de la empresa activa
 * @returns {Object} { states, loading, error, refresh }
 */
export function usePipelineStates(empresaId) {
    const [states, setStates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fallback defaults mapping for UI consistency
    const DEFAULT_CONFIG = [
        { id: ESTADO_RELEVADO,           label: 'Relevado',          color: '#64748b', orden: 1, is_default: true },
        { id: ESTADO_VISITADO_NO_ACTIVO,  label: 'Visitado (No Act)', color: '#ef4444', orden: 2, is_default: false },
        { id: ESTADO_PRIMER_INGRESO,     label: 'Primer Ingreso',    color: '#f59e0b', orden: 3, is_default: false },
        { id: ESTADO_LOCAL_CREADO,       label: 'Creado',            color: '#8b5cf6', orden: 4, is_default: false },
        { id: ESTADO_ACTIVO,             label: 'Visitado (Activo)', color: '#10b981', orden: 5, is_default: false },
        { id: ESTADO_NO_INTERESADO,      label: 'No Interesado',     color: '#ef4444', orden: 6, is_default: false }
    ];

    const fetchStates = async () => {
        if (!empresaId) return;
        setLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from('empresa_pipeline_estados')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('orden', { ascending: true });

            if (fetchError) throw fetchError;

            if (data && data.length > 0) {
                // Transform unique labels to match expected 'id' for logical filtering
                setStates(data.map(s => ({
                    id: s.label, // Usamos el label como ID primario para no romper filtros existentes por ahora
                    label: s.label,
                    color: s.color,
                    orden: s.orden,
                    is_default: s.is_default,
                    db_id: s.id
                })));
            } else {
                // Fallback to constants if table is empty or migration hasn't run
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
