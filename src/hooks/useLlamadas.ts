import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface Llamada {
    id: number;
    empresa_id: string;
    // 🔵 BD
    nombre: string | null;
    apellido: string | null;
    telefono: string | null;
    mail: string | null;
    // 🟢 FORMS
    direccion: string | null;
    localidad: string | null;
    nombre_comercio: string | null;
    // 🟠 OPERADOR
    rubro: string | null;
    nombre_operador: string | null;
    respuesta_llamado: string | null;
    tiempo_llamado: string | null;
    envio_whatsapp: boolean | null;
    siguio_redes: string | null;
    completo_formulario: boolean | null;
    envio_listo: boolean | null;
    created_at: string;
    updated_at: string;
}

export interface LlamadaFilters {
    busqueda: string;
    operador: string;
    rubro: string;
    respuesta: string;
}

export interface UseLlamadasParams {
    empresaId: string | null;
    page: number;
    pageSize: number;
    filters: LlamadaFilters;
}

export function useLlamadas({ empresaId, page, pageSize, filters }: UseLlamadasParams) {
    return useQuery({
        queryKey: ['llamadas', { empresaId, page, pageSize, filters }],
        queryFn: async () => {
            if (!empresaId) return { llamadas: [] as Llamada[], total: 0 };

            let query = (supabase as any)
                .from('llamadas')
                .select('*', { count: 'exact' })
                .eq('empresa_id', empresaId)
                .order('created_at', { ascending: false });

            if (filters.busqueda) {
                query = query.or(
                    `nombre.ilike.%${filters.busqueda}%,apellido.ilike.%${filters.busqueda}%,telefono.ilike.%${filters.busqueda}%`
                );
            }
            if (filters.operador) {
                query = query.ilike('nombre_operador', `%${filters.operador}%`);
            }
            if (filters.rubro) {
                query = query.eq('rubro', filters.rubro);
            }
            if (filters.respuesta) {
                query = query.eq('respuesta_llamado', filters.respuesta);
            }

            query = query.range((page - 1) * pageSize, page * pageSize - 1);

            const { data, count, error } = await query;
            if (error) throw error;
            return { llamadas: (data || []) as Llamada[], total: count || 0 };
        },
        enabled: !!empresaId,
    });
}

export function useCreateLlamada() {
    const { empresaActiva } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Llamada>) => {
            const { data: result, error } = await (supabase as any)
                .from('llamadas')
                .insert({ ...data, empresa_id: empresaActiva?.id })
                .select()
                .single();
            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            toast.success('Ficha de llamada creada');
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
        },
        onError: (err: any) => toast.error(`Error al crear: ${err.message}`),
    });
}

export function useUpdateLlamada() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Llamada> }) => {
            const { error } = await (supabase as any)
                .from('llamadas')
                .update(data)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Ficha actualizada');
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
        },
        onError: (err: any) => toast.error(`Error al actualizar: ${err.message}`),
    });
}

export function useDeleteLlamada() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await (supabase as any)
                .from('llamadas')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Ficha eliminada');
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
        },
        onError: (err: any) => toast.error(`Error al eliminar: ${err.message}`),
    });
}
