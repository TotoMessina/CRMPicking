import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useCompanyUsers = (empresaId: string | null) => {
    return useQuery({
        queryKey: ['company_users', empresaId],
        queryFn: async () => {
            if (!empresaId) return [];

            // Fetch users linked to this company via empresa_usuario
            const { data, error } = await supabase
                .from('empresa_usuario')
                .select('usuario_email, usuarios(nombre)')
                .eq('empresa_id', empresaId);

            if (error) throw error;

            // Map to a simple list of names (responsables are strings in the clients table)
            const users = (data || [])
                .map((eu: any) => eu.usuarios?.nombre)
                .filter(Boolean)
                .sort();

            return [...new Set(users)]; // Unique names
        },
        enabled: !!empresaId,
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};
