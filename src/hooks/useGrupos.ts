import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Group } from '../types/client';

export function useGrupos(empresaId: string | null) {
    return useQuery({
        queryKey: ['grupos', empresaId],
        queryFn: async () => {
            if (!empresaId) return [] as Group[];
            const { data, error } = await (supabase as any)
                .from('grupos')
                .select('*')
                .eq('empresa_id', empresaId)
                .order('nombre', { ascending: true });

            if (error) throw error;
            return (data || []).map((g: any) => ({
                ...g,
                nombre: g.nombre || ''
            })) as Group[];
        },
        enabled: !!empresaId
    });
}

export function useCreateGrupo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ empresaId, nombre, color }: { empresaId: string; nombre: string; color: string }) => {
            const { data, error } = await (supabase as any)
                .from('grupos')
                .insert([{ empresa_id: empresaId, nombre, color }])
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            toast.success('Grupo creado');
            queryClient.invalidateQueries({ queryKey: ['grupos', variables.empresaId] });
        },
        onError: (error: any) => {
            toast.error('Error al crear grupo: ' + error.message);
        }
    });
}

export function useUpdateGrupo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, empresaId, nombre, color }: { id: string; empresaId: string; nombre: string; color: string }) => {
            const numericId = parseInt(id, 10);
            const { data, error } = await (supabase as any)
                .from('grupos')
                .update({ nombre, color })
                .eq('id', numericId)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            toast.success('Grupo actualizado');
            queryClient.invalidateQueries({ queryKey: ['grupos', variables.empresaId] });
        },
        onError: (error: any) => {
            toast.error('Error al actualizar grupo: ' + error.message);
        }
    });
}

export function useDeleteGrupo() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, empresaId }: { id: string; empresaId: string }) => {
            const numericId = parseInt(id, 10);
            const { error } = await (supabase as any)
                .from('grupos')
                .delete()
                .eq('id', numericId);
            if (error) throw error;
            return id;
        },
        onSuccess: (_, variables) => {
            toast.success('Grupo eliminado');
            queryClient.invalidateQueries({ queryKey: ['grupos', variables.empresaId] });
        },
        onError: (error: any) => {
            toast.error('Error al eliminar grupo: ' + error.message);
        }
    });
}

export function useUpdateClienteGrupos() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ clienteId, empresaId, grupoIds }: { clienteId: string; empresaId: string; grupoIds: string[] }) => {
            const numericClienteId = parseInt(clienteId, 10);
            
            // 1. Eliminar relaciones actuales
            const { error: deleteError } = await (supabase as any)
                .from('cliente_grupos')
                .delete()
                .eq('cliente_id', numericClienteId);
            
            if (deleteError) throw deleteError;

            // 2. Insertar nuevas relaciones si hay IDs
            if (grupoIds.length > 0) {
                const inserts = grupoIds.map(gid => ({
                    cliente_id: numericClienteId,
                    grupo_id: parseInt(gid, 10),
                    empresa_id: empresaId
                }));
                const { error: insertError } = await (supabase as any)
                    .from('cliente_grupos')
                    .insert(inserts);
                
                if (insertError) throw insertError;
            }

            return { clienteId, grupoIds };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            // También podríamos invalidar un query específico de grupos de este cliente si existiera
        },
        onError: (error: any) => {
            toast.error('Error al actualizar grupos del cliente: ' + error.message);
        }
    });
}
