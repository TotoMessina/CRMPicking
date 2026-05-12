import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useRubros = () => {
    const { empresaActiva } = useAuth();
    
    return useQuery({
        queryKey: ['rubros', empresaActiva?.id || 'global'],
        queryFn: async () => {
            // Prioridad 1: Listado personalizado de la empresa
            const customRubros = empresaActiva?.config?.rubros;
            if (customRubros && Array.isArray(customRubros) && customRubros.length > 0) {
                // Devolvemos una copia ordenada para mantener consistencia visual
                return [...customRubros].sort((a, b) => a.localeCompare(b));
            }

            // Prioridad 2: Fallback a rubros globales de la base de datos
            const { data, error } = await (supabase as any)
                .from('rubros')
                .select('nombre')
                .order('nombre', { ascending: true });

            if (error) throw error;
            return (data || []).map((r: any) => r.nombre);
        },
        staleTime: 1000 * 60 * 1, // 1 minute
    });
};
