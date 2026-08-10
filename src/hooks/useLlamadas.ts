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
    provincia: string | null;
    nombre_comercio: string | null;
    rol_contacto: string | null;
    instagram: string | null;
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

                if (ecMatches && ecMatches.length > 0) {
                    ecData = ecMatches;
                } else {
                    const c = cData[0];
                    const rawNombre = (c.nombre || '').trim();
                    let nombre = rawNombre;
                    let apellido = '';
                    if (rawNombre.includes(' ')) {
                        const parts = rawNombre.split(' ');
                        nombre = parts[0];
                        apellido = parts.slice(1).join(' ');
                    }
                    return {
                        nombre,
                        apellido,
                        telefono: c.telefono || clean,
                        mail: c.mail || '',
                        direccion: c.direccion || '',
                        localidad: c.localidad || '',
                        provincia: c.provincia || '',
                        nombre_comercio: c.nombre_local || '',
                        rubro: c.rubro || '',
                    };
                }
            }
        }

        if (ecData && ecData.length > 0) {
            const m = ecData[0];
            const c = m.clientes || {};
            const rawNombre = (m.nombre || c.nombre || '').trim();
            let nombre = rawNombre;
            let apellido = '';

            if (rawNombre.includes(' ')) {
                const parts = rawNombre.split(' ');
                nombre = parts[0];
                apellido = parts.slice(1).join(' ');
            }

            return {
                nombre,
                apellido,
                telefono: m.telefono || c.telefono || clean,
                mail: m.mail || c.mail || '',
                direccion: m.direccion || c.direccion || '',
                localidad: m.localidad || c.localidad || '',
                provincia: m.provincia || c.provincia || '',
                nombre_comercio: m.nombre_local || c.nombre_local || '',
                rubro: m.rubro || c.rubro || '',
            };
        }
    } catch (err) {
        console.error('Error buscando cliente por teléfono:', err);
    }
    return null;
}

/**
 * Si existe un cliente en la BD con el mismo teléfono, actualiza sus datos
 * para mantener sincronizada la lista de clientes con la ficha de llamada.
 * NO crea un cliente nuevo si no existe.
 */
async function syncClientWithLlamada(empresaId: string, data: Partial<Llamada>) {
    if (!empresaId || !data.telefono || !data.telefono.trim()) return;
    const rawPhone = data.telefono.trim();
    const digitsOnly = rawPhone.replace(/\D/g, '');

    try {
        let { data: matches } = await (supabase as any)
            .from('empresa_cliente')
            .select('id, cliente_id')
            .eq('empresa_id', empresaId)
            .ilike('telefono', `%${rawPhone}%`);

        if ((!matches || matches.length === 0) && digitsOnly.length >= 6) {
            const { data: mDigits } = await (supabase as any)
                .from('empresa_cliente')
                .select('id, cliente_id')
                .eq('empresa_id', empresaId)
                .ilike('telefono', `%${digitsOnly}%`);
            if (mDigits && mDigits.length > 0) matches = mDigits;
        }

        if (!matches || matches.length === 0) {
            const { data: cMatches } = await (supabase as any)
                .from('clientes')
                .select('id')
                .ilike('telefono', `%${digitsOnly || rawPhone}%`);

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

export function useLlamadas({ empresaId, page, pageSize, filters, sortBy = 'created_desc' }: UseLlamadasParams) {
    return useQuery({
        queryKey: ['llamadas', { empresaId, page, pageSize, filters, sortBy }],
        queryFn: async () => {
            if (!empresaId) return { llamadas: [] as Llamada[], total: 0 };

            let query = (supabase as any)
                .from('llamadas')
                .select('*', { count: 'exact' })
                .eq('empresa_id', empresaId);

            switch (sortBy) {
                case 'updated_desc':
                    query = query.order('updated_at', { ascending: false, nullsFirst: false });
                    break;
                case 'created_asc':
                    query = query.order('created_at', { ascending: true });
                    break;
                case 'nombre_asc':
                    query = query.order('nombre', { ascending: true, nullsFirst: false }).order('apellido', { ascending: true, nullsFirst: false });
                    break;
                case 'nombre_desc':
                    query = query.order('nombre', { ascending: false, nullsFirst: false }).order('apellido', { ascending: false, nullsFirst: false });
                    break;
                case 'comercio_asc':
                    query = query.order('nombre_comercio', { ascending: true, nullsFirst: false });
                    break;
                case 'comercio_desc':
                    query = query.order('nombre_comercio', { ascending: false, nullsFirst: false });
                    break;
                case 'operador_asc':
                    query = query.order('nombre_operador', { ascending: true, nullsFirst: false });
                    break;
                case 'created_desc':
                default:
                    query = query.order('created_at', { ascending: false });
                    break;
            }

            if (filters.busqueda && filters.busqueda.trim()) {
                const rawTerm = filters.busqueda.trim().replace(/"/g, '');
                const safeTerm = `"%${rawTerm}%"`;
                query = query.or(
                    `nombre.ilike.${safeTerm},apellido.ilike.${safeTerm},telefono.ilike.${safeTerm},nombre_comercio.ilike.${safeTerm},direccion.ilike.${safeTerm},localidad.ilike.${safeTerm},provincia.ilike.${safeTerm},mail.ilike.${safeTerm},nombre_operador.ilike.${safeTerm}`
                );
            }
            if (filters.operador) {
                query = query.ilike('nombre_operador', `%${filters.operador.trim()}%`);
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

            let result: any;
            if (existing) {
                // Actualizar ficha existente
                const { data: updated, error: updateErr } = await (supabase as any)
                    .from('llamadas')
                    .update({ ...data, updated_at: new Date().toISOString() })
                    .eq('id', existing.id)
                    .select()
                    .single();
                if (updateErr) throw updateErr;
                result = updated;
                toast.success('Ficha existente actualizada por teléfono');
            } else {
                // Crear nueva ficha
                const { data: inserted, error: insertErr } = await (supabase as any)
                    .from('llamadas')
                    .insert({ ...data, empresa_id: empresaActiva.id })
                    .select()
                    .single();
                if (insertErr) throw insertErr;
                result = inserted;
                toast.success('Ficha de llamada creada');
            }

            // Sincronizar con la lista de clientes (solo si el cliente ya existe por teléfono)
            await syncClientWithLlamada(empresaActiva.id, data);

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        },
        onError: (err: any) => toast.error(`Error al guardar: ${err.message}`),
    });
}

export function useUpdateLlamada() {
    const { empresaActiva } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<Llamada> }) => {
            const { error } = await (supabase as any)
                .from('llamadas')
                .update(data)
                .eq('id', id);
            if (error) throw error;

            // Sincronizar con la lista de clientes (solo si el cliente ya existe por teléfono)
            if (empresaActiva?.id) {
                await syncClientWithLlamada(empresaActiva.id, data);
            }
        },
        onSuccess: () => {
            toast.success('Ficha actualizada');
            queryClient.invalidateQueries({ queryKey: ['llamadas'] });
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
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
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        },
        onError: (err: any) => toast.error(`Error al eliminar: ${err.message}`),
    });
}
