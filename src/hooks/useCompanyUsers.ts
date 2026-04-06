import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export const useCompanyUsers = (empresaId: string | null) => {
    return useQuery({
        queryKey: ['company_users', empresaId],
        queryFn: async () => {
            if (!empresaId) return [];

            const { data, error } = await supabase
                .from('empresa_usuario')
                .select('usuario_email, usuarios(nombre)')
                .eq('empresa_id', empresaId);

            if (error) throw error;

            const users = (data || [])
                .map((eu: any) => eu.usuarios?.nombre || eu.usuario_email)
                .filter(Boolean)
                .sort();

            return [...new Set(users)];
        },
        enabled: !!empresaId,
        staleTime: 1000 * 60 * 10,
    });
};

export const useCompanyUsersDetailed = (empresaId: string | null) => {
    return useQuery({
        queryKey: ['company_users_detailed', empresaId],
        queryFn: async () => {
            if (!empresaId) return [];

            const { data, error } = await supabase
                .from('empresa_usuario')
                .select('usuario_email, usuarios(nombre)')
                .eq('empresa_id', empresaId);

            if (error) throw error;

            return (data || [])
                .map((eu: any) => ({
                    email: eu.usuario_email,
                    nombre: eu.usuarios?.nombre || eu.usuario_email
                }))
                .filter(u => u.email)
                .sort((a, b) => a.nombre.localeCompare(b.nombre));
        },
        enabled: !!empresaId,
        staleTime: 1000 * 60 * 10,
    });
};
