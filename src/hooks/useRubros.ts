import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useRubros = () => {
    return useQuery({
        queryKey: ['rubros'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('rubros')
                .select('nombre')
                .order('nombre', { ascending: true });

            if (error) throw error;
            return data.map(r => r.nombre);
        },
        staleTime: 1000 * 60 * 1, // 1 minute
    });
};
