import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { applyLlamadasFilters, LlamadaFilters } from '../utils/filterUtils';

export type { LlamadaFilters };
export { applyLlamadasFilters };

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
    provincia: string | null;
    nombre_comercio: string | null;
    rol_contacto: string | null;
    instagram: string | null;
    origen_contacto?: string | null;
    // 🟠 OPERADOR
    rubro: string | null;
    nombre_operador: string | null;
    respuesta_llamado: string | null;
    tiempo_llamado: string | null;
    envio_whatsapp: boolean | null;
    descargo_picking_up: boolean | null;
    siguio_redes: string | null;
    completo_formulario: boolean | null;
    envio_listo: boolean | null;
    envio_catalogo_video?: boolean | null;
    solicito_video?: boolean | null;
    video_url?: string | null;
    etiqueta?: string | null;
    cantidad_llamadas?: number | null;
    fecha_ultima_llamada?: string | null;
    created_at: string;
    updated_at: string;
}

export interface UseLlamadasParams {
    empresaId: string | null;
    page: number;
    pageSize: number;
    filters: LlamadaFilters;
    sortBy?: string;
}

/**
 * Busca un cliente existente en empresa_cliente / clientes por su número de teléfono.
 * Utilizado para autocompletar la ficha en el modal.
 */
export async function findClientByPhone(empresaId: string, phone: string) {
    if (!empresaId || !phone) return null;
    const clean = phone.trim();
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean.length < 4 && digitsOnly.length < 4) return null;

    try {
        let { data: ecData } = await (supabase as any)
            .from('empresa_cliente')
            .select('*, clientes(*)')
            .eq('empresa_id', empresaId)
            .ilike('telefono', `%${clean}%`)
            .limit(1);

        if ((!ecData || ecData.length === 0) && digitsOnly.length >= 6) {
            const { data: ecDigits } = await (supabase as any)
                .from('empresa_cliente')
                .select('*, clientes(*)')
                .eq('empresa_id', empresaId)
                .ilike('telefono', `%${digitsOnly}%`)
                .limit(1);
            if (ecDigits && ecDigits.length > 0) ecData = ecDigits;
        }

        if (!ecData || ecData.length === 0) {
            let { data: cData } = await (supabase as any)
                .from('clientes')
                .select('id, nombre, nombre_local, direccion, localidad, provincia, mail, telefono, rubro')
                .ilike('telefono', `%${clean}%`)
                .limit(5);

            if ((!cData || cData.length === 0) && digitsOnly.length >= 6) {
                const { data: cDigits } = await (supabase as any)
                    .from('clientes')
                    .select('id, nombre, nombre_local, direccion, localidad, provincia, mail, telefono, rubro')
                    .ilike('telefono', `%${digitsOnly}%`)
                    .limit(5);
                if (cDigits && cDigits.length > 0) cData = cDigits;
            }

            if (cData && cData.length > 0) {
                const clientIds = cData.map((c: any) => c.id);
                const { data: ecMatches } = await (supabase as any)
                    .from('empresa_cliente')
                    .select('*, clientes(*)')
                    .eq('empresa_id', empresaId)
                    .in('cliente_id', clientIds)
                    .limit(1);
                if (ecMatches && ecMatches.length > 0) ecData = ecMatches;
            }
        }

        if (ecData && ecData.length > 0) {
            const match = ecData[0];
            const c = match.clientes || {};
            const fullNom = match.nombre || c.nombre || '';
            const parts = fullNom.trim().split(' ');
            const nom = parts[0] || '';
            const ape = parts.slice(1).join(' ') || '';

            return {
                found: true,
                nombre: nom,
                apellido: ape,
                nombre_comercio: match.nombre_local || c.nombre_local || '',
                direccion: match.direccion || c.direccion || '',
                localidad: match.localidad || c.localidad || '',
                provincia: match.provincia || c.provincia || '',
                mail: match.mail || c.mail || '',
                rubro: match.rubro || c.rubro || '',
            };
        }
    } catch (err) {
        console.error('Error buscando cliente por teléfono:', err);
    }
    return null;
}

/**
 * Sincroniza datos de la llamada con empresa_cliente y clientes si existe coincidencia de teléfono
 */
async function syncClientWithLlamada(empresaId: string, data: Partial<Llamada>) {
    if (!data.telefono || !empresaId) return;
    const phone = data.telefono.trim();
    const digitsOnly = phone.replace(/\D/g, '');

    try {
        let { data: matches } = await (supabase as any)
            .from('empresa_cliente')
            .select('id, cliente_id')
            .eq('empresa_id', empresaId)
            .ilike('telefono', `%${phone}%`);

        if ((!matches || matches.length === 0) && digitsOnly.length >= 6) {
            const { data: mDigits } = await (supabase as any)
                .from('empresa_cliente')
                .select('id, cliente_id')
                .eq('empresa_id', empresaId)
                .ilike('telefono', `%${digitsOnly}%`);
            if (mDigits && mDigits.length > 0) matches = mDigits;
        }

        if (!matches || matches.length === 0) {
            let { data: cMatches } = await (supabase as any)
                .from('clientes')
                .select('id')
                .ilike('telefono', `%${phone}%`);

            if ((!cMatches || cMatches.length === 0) && digitsOnly.length >= 6) {
                const { data: cDigits } = await (supabase as any)
                    .from('clientes')
                    .select('id')
                    .ilike('telefono', `%${digitsOnly}%`);
                if (cDigits && cDigits.length > 0) cMatches = cDigits;
            }

            if (cMatches && cMatches.length > 0) {
                const ids = cMatches.map((c: any) => c.id);
                const { data: ecFound } = await (supabase as any)
                    .from('empresa_cliente')
                    .select('id, cliente_id')
                    .eq('empresa_id', empresaId)
                    .in('cliente_id', ids);
                if (ecFound && ecFound.length > 0) matches = ecFound;
            }
        }

        if (matches && matches.length > 0) {
            const fullNombre = [data.nombre, data.apellido].filter(Boolean).join(' ') || data.nombre_comercio || null;

            for (const m of matches) {
                const ecUpdates: Record<string, any> = {
                    updated_at: new Date().toISOString()
                };
                if (fullNombre) ecUpdates.nombre = fullNombre;
                if (data.nombre_comercio) ecUpdates.nombre_local = data.nombre_comercio;
                if (data.telefono) ecUpdates.telefono = data.telefono;
                if (data.mail !== undefined) ecUpdates.mail = data.mail;
                if (data.direccion !== undefined) ecUpdates.direccion = data.direccion;
                if (data.localidad !== undefined) ecUpdates.localidad = data.localidad;
                if (data.provincia !== undefined) ecUpdates.provincia = data.provincia;
                if (data.rubro !== undefined) ecUpdates.rubro = data.rubro;

                await (supabase as any)
                    .from('empresa_cliente')
                    .update(ecUpdates)
                    .eq('id', m.id);

                if (m.cliente_id) {
                    const cUpdates: Record<string, any> = {};
                    if (fullNombre) cUpdates.nombre = fullNombre;
                    if (data.nombre_comercio) cUpdates.nombre_local = data.nombre_comercio;
                    if (data.telefono) cUpdates.telefono = data.telefono;
                    if (data.mail !== undefined) cUpdates.mail = data.mail;
                    if (data.direccion !== undefined) cUpdates.direccion = data.direccion;
                    if (data.localidad !== undefined) cUpdates.localidad = data.localidad;
                    if (data.provincia !== undefined) cUpdates.provincia = data.provincia;
                    if (data.rubro !== undefined) cUpdates.rubro = data.rubro;

                    if (Object.keys(cUpdates).length > 0) {
                        await (supabase as any)
                            .from('clientes')
                            .update(cUpdates)
                            .eq('id', m.cliente_id);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error sincronizando cliente desde llamada:', err);
    }
}

// ─────────────────────────────────────────────────────────────
// HOOKS CRUD
// ─────────────────────────────────────────────────────────────

export function useLlamadas({ empresaId, page, pageSize = 24, filters, sortBy = 'created_desc' }: UseLlamadasParams) {
    return useQuery({
        queryKey: ['llamadas', empresaId, page, pageSize, filters, sortBy],
        queryFn: async () => {
            if (!empresaId) return { llamadas: [], total: 0 };

            let query = (supabase as any)
                .from('llamadas')
                .select('*', { count: 'exact' })
                .eq('empresa_id', empresaId);

            query = applyLlamadasFilters(query, filters, sortBy);
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
            if (!empresaActiva?.id) throw new Error('No hay empresa activa');

            // Verificar si ya existe una llamada para este número de teléfono en la misma empresa
            let existing: any = null;
            if (data.telefono && data.telefono.trim()) {
                const cleanPhone = data.telefono.trim();
                const { data: found } = await (supabase as any)
                    .from('llamadas')
                    .select('id')
                    .eq('empresa_id', empresaActiva.id)
                    .eq('telefono', cleanPhone)
                    .maybeSingle();
                existing = found;
            }

            // Determinar etiqueta ('cliente nuevo' o 'cliente actualizado')
            let isExistingClient = !!existing;
            if (!isExistingClient && data.telefono && data.telefono.trim()) {
                const clientMatch = await findClientByPhone(empresaActiva.id, data.telefono.trim());
                if (clientMatch) isExistingClient = true;
            }

            const calculatedEtiqueta = data.etiqueta || (isExistingClient ? 'cliente actualizado' : 'cliente nuevo');
            const hasCallActivity = (data.cantidad_llamadas && data.cantidad_llamadas > 0) || (data.respuesta_llamado && data.respuesta_llamado.trim() !== '');

            let result: any;
            if (existing) {
                // Actualizar ficha existente
                const updatePayload: Record<string, any> = {
                    ...data,
                    etiqueta: calculatedEtiqueta,
                    updated_at: new Date().toISOString()
                };
                if (hasCallActivity && !data.fecha_ultima_llamada) {
                    updatePayload.fecha_ultima_llamada = new Date().toISOString();
                }

                let updateRes = await (supabase as any)
                    .from('llamadas')
                    .update(updatePayload)
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (updateRes.error && (updateRes.error.message?.includes('etiqueta') || updateRes.error.message?.includes('fecha_ultima_llamada'))) {
                    // Fallback si la columna no existe aún en la base de datos
                    if (updateRes.error.message?.includes('etiqueta')) delete updatePayload.etiqueta;
                    if (updateRes.error.message?.includes('fecha_ultima_llamada')) delete updatePayload.fecha_ultima_llamada;
                    updateRes = await (supabase as any)
                        .from('llamadas')
                        .update(updatePayload)
                        .eq('id', existing.id)
                        .select()
                        .single();
                }

                if (updateRes.error) throw updateRes.error;
                result = updateRes.data;
                toast.success('Ficha existente actualizada por teléfono');
            } else {
                // Crear nueva ficha
                const insertPayload: Record<string, any> = {
                    ...data,
                    etiqueta: calculatedEtiqueta,
                    empresa_id: empresaActiva.id
                };
                if (hasCallActivity && !data.fecha_ultima_llamada) {
                    insertPayload.fecha_ultima_llamada = new Date().toISOString();
                }

                let insertRes = await (supabase as any)
                    .from('llamadas')
                    .insert(insertPayload)
                    .select()
                    .single();

                if (insertRes.error && (insertRes.error.message?.includes('etiqueta') || insertRes.error.message?.includes('fecha_ultima_llamada'))) {
                    // Fallback si la columna no existe aún en la base de datos
                    if (insertRes.error.message?.includes('etiqueta')) delete insertPayload.etiqueta;
                    if (insertRes.error.message?.includes('fecha_ultima_llamada')) delete insertPayload.fecha_ultima_llamada;
                    insertRes = await (supabase as any)
                        .from('llamadas')
                        .insert(insertPayload)
                        .select()
                        .single();
                }

                if (insertRes.error) throw insertRes.error;
                result = insertRes.data;
                toast.success('Ficha de llamada creada');
            }

            // Sincronizar con la lista de clientes (solo si el cliente ya existe por teléfono)
            await syncClientWithLlamada(empresaActiva.id, data);

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['llamadas-stats'] });
        },
        onError: (err: any) => {
            console.error('Error al guardar llamada:', err);
            toast.error(err.message || 'Error al guardar ficha de llamada');
        },
    });
}

export function useUpdateLlamada() {
    const { empresaActiva } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Llamada> }) => {
            if (!empresaActiva?.id) throw new Error('No hay empresa activa');

            const hasCallActivity = (data.cantidad_llamadas && data.cantidad_llamadas > 0) || (data.respuesta_llamado && data.respuesta_llamado.trim() !== '');

            const payload: Record<string, any> = {
                ...data,
                updated_at: new Date().toISOString()
            };
            if (hasCallActivity && !data.fecha_ultima_llamada) {
                payload.fecha_ultima_llamada = new Date().toISOString();
            }

            let res = await (supabase as any)
                .from('llamadas')
                .update(payload)
                .eq('id', id)
                .eq('empresa_id', empresaActiva.id)
                .select()
                .single();

            if (res.error && (res.error.message?.includes('etiqueta') || res.error.message?.includes('fecha_ultima_llamada'))) {
                // Fallback si la columna no existe aún
                if (res.error.message?.includes('etiqueta')) delete payload.etiqueta;
                if (res.error.message?.includes('fecha_ultima_llamada')) delete payload.fecha_ultima_llamada;
                res = await (supabase as any)
                    .from('llamadas')
                    .update(payload)
                    .eq('id', id)
                    .eq('empresa_id', empresaActiva.id)
                    .select()
                    .single();
            }

            if (res.error) throw res.error;

            // Sincronizar con la lista de clientes si aplica
            await syncClientWithLlamada(empresaActiva.id, data);

            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['llamadas-stats'] });
            toast.success('Ficha actualizada');
        },
        onError: (err: any) => {
            console.error('Error al actualizar llamada:', err);
            toast.error(err.message || 'Error al actualizar ficha');
        },
    });
}

export function useIncrementLlamadaCount() {
    const { empresaActiva } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, delta = 1, currentCount = 0 }: { id: number; delta?: number; currentCount?: number }) => {
            if (!empresaActiva?.id) throw new Error('No hay empresa activa');

            const newCount = Math.max(0, currentCount + delta);
            const updatePayload: Record<string, any> = { 
                cantidad_llamadas: newCount,
                updated_at: new Date().toISOString()
            };
            if (delta > 0) {
                updatePayload.fecha_ultima_llamada = new Date().toISOString();
            }

            let { data, error } = await (supabase as any)
                .from('llamadas')
                .update(updatePayload)
                .eq('id', id)
                .eq('empresa_id', empresaActiva.id)
                .select()
                .single();

            if (error && error.message?.includes('fecha_ultima_llamada')) {
                // Fallback si la columna aún no está creada en la base de datos
                delete updatePayload.fecha_ultima_llamada;
                const fallbackRes = await (supabase as any)
                    .from('llamadas')
                    .update(updatePayload)
                    .eq('id', id)
                    .eq('empresa_id', empresaActiva.id)
                    .select()
                    .single();
                data = fallbackRes.data;
                error = fallbackRes.error;
            }

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
            queryClient.invalidateQueries({ queryKey: ['llamadas-stats'] });
        },
        onError: (err: any) => {
            console.error('Error al actualizar cantidad de llamadas:', err);
            toast.error(err.message || 'Error al registrar llamada');
        },
    });
}

export function useDeleteLlamada() {
    const { empresaActiva } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            if (!empresaActiva?.id) throw new Error('No hay empresa activa');

            const { error } = await (supabase as any)
                .from('llamadas')
                .delete()
                .eq('id', id)
                .eq('empresa_id', empresaActiva.id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['llamadas-stats'] });
            toast.success('Ficha eliminada');
        },
        onError: (err: any) => {
            console.error('Error al eliminar llamada:', err);
            toast.error(err.message || 'Error al eliminar ficha');
        },
    });
}
