import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Client, ClientActivity } from '../types/client';
import { formatToLocal } from '../utils/dateUtils';

export interface UseClientesParams {
    empresaId: string | null;
    page: number;
    pageSize: number;
    isAgendaHoy: boolean;
    fEstado: string[];
    fSituacion: string[];
    fTipoContacto: string[];
    fResponsable: string[];
    fCreadoPor: string[];
    fRubro: string[];
    fInteres: string[];
    fEstilo: string[];
    fProximos7: boolean;
    fVencidos: boolean;
    fNombre: string;
    fTelefono: string;
    fDireccion: string;
    fCreadoDesde: string;
    fCreadoHasta: string;
    fContactoDesde: string;
    fContactoHasta: string;
    fGrupos: string[];
    sortBy: string;
}

export function useClientes(params: UseClientesParams) {
    const {
        empresaId, page, pageSize, isAgendaHoy,
        fEstado, fSituacion, fTipoContacto, fResponsable, fCreadoPor,
        fRubro, fInteres, fEstilo, fProximos7, fVencidos,
        fNombre, fTelefono, fDireccion, fCreadoDesde, fCreadoHasta,
        fContactoDesde, fContactoHasta, fGrupos, sortBy
    } = params;

    return useQuery({
        queryKey: [
            'clientes',
            {
                empresaId, page, pageSize, isAgendaHoy,
                fEstado, fSituacion, fTipoContacto, fResponsable, fCreadoPor,
                fRubro, fInteres, fEstilo, fProximos7, fVencidos,
                fNombre, fTelefono, fDireccion, fCreadoDesde, fCreadoHasta,
                fContactoDesde, fContactoHasta, fGrupos, sortBy
            }
        ],
        queryFn: async () => {
            if (!empresaId) return { clientes: [] as Client[], total: 0, activities: {} as Record<string, ClientActivity[]> };

            let request = supabase
                .from('empresa_cliente')
                .select('*, clientes!inner(*, cliente_grupos(grupos(*)))', { count: 'exact' })
                .eq('empresa_id', empresaId)
                .eq('activo', true);

            // If filtering by groups, we must force the join to be inner to restrict results
            if (fGrupos && fGrupos.length > 0) {
                // We re-apply select to override with !inner on the groups relation
                request = request.select('*, clientes!inner(*, cliente_grupos!inner(grupos(*)))', { count: 'exact' });
                request = request.in('clientes.cliente_grupos.grupo_id', fGrupos);
            }

            // Apply sorting
            if (sortBy === 'updated') {
                request = request.order('updated_at', { ascending: false }).order('created_at', { ascending: false });
            } else if (sortBy === 'recent') {
                request = request.order('created_at', { ascending: false });
            } else if (sortBy === 'oldest') {
                request = request.order('created_at', { ascending: true });
            } else if (sortBy === 'az') {
                request = request.order('clientes(nombre_local)', { ascending: true });
            } else if (sortBy === 'za') {
                request = request.order('clientes(nombre_local)', { ascending: false });
            } else if (sortBy === 'activity_desc') {
                request = request.order('ultima_actividad', { ascending: false, nullsFirst: false }).order('updated_at', { ascending: false });
            } else if (sortBy === 'activity_asc') {
                request = request.order('ultima_actividad', { ascending: true, nullsFirst: true }).order('updated_at', { ascending: true });
            }

            request = request.range((page - 1) * pageSize, page * pageSize - 1);

            if (isAgendaHoy) {
                request = request.eq('fecha_proximo_contacto', new Date().toISOString().split('T')[0]);
            }

            if (fEstado && fEstado.length > 0) request = request.in('estado', fEstado);
            if (fSituacion && fSituacion.length > 0) request = request.in('situacion', fSituacion);
            if (fTipoContacto && fTipoContacto.length > 0) request = request.in('tipo_contacto', fTipoContacto);
            if (fResponsable && fResponsable.length > 0) request = request.in('responsable', fResponsable);
            if (fCreadoPor && fCreadoPor.length > 0) request = request.in('creado_por', fCreadoPor);
            if (fRubro && fRubro.length > 0) request = request.in('rubro', fRubro);
            if (fInteres && fInteres.length > 0) request = request.in('interes', fInteres);
            if (fEstilo && fEstilo.length > 0) request = request.in('estilo_contacto', fEstilo);


            if (fCreadoDesde) {
                request = request.gte('created_at', `${fCreadoDesde}T00:00:00.000Z`);
            }
            if (fCreadoHasta) {
                request = request.lte('created_at', `${fCreadoHasta}T23:59:59.999Z`);
            }

            if (fContactoDesde) {
                request = request.gte('fecha_proximo_contacto', fContactoDesde);
            }
            if (fContactoHasta) {
                request = request.lte('fecha_proximo_contacto', fContactoHasta);
            }

            if (fProximos7) {
                const hoy = new Date();
                const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7);
                const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                request = request.gte('fecha_proximo_contacto', fmt(hoy)).lte('fecha_proximo_contacto', fmt(en7));
            }

            if (fVencidos) {
                const hoy = new Date().toISOString().split('T')[0];
                request = request.lt('fecha_proximo_contacto', hoy).not('fecha_proximo_contacto', 'is', null);
            }

            const hasTextFilter = fNombre || fTelefono || fDireccion;
            let mapped: Client[] = [];
            let total = 0;
            let actsObj: Record<string, ClientActivity[]> = {};

            if (hasTextFilter) {
                const { data: rpcData, error: rpcError } = await supabase.rpc('buscar_clientes_empresa', {
                    p_empresa_id: empresaId,
                    p_nombre: fNombre || null,
                    p_telefono: fTelefono || null,
                    p_direccion: fDireccion || null,
                    p_estados: fEstado && fEstado.length > 0 ? fEstado : null,
                    p_situaciones: fSituacion && fSituacion.length > 0 ? fSituacion : null,
                    p_tipos_contacto: fTipoContacto && fTipoContacto.length > 0 ? fTipoContacto : null,
                    p_responsables: fResponsable && fResponsable.length > 0 ? fResponsable : null,
                    p_creados_por: fCreadoPor && fCreadoPor.length > 0 ? fCreadoPor : null,
                    p_rubros: fRubro && fRubro.length > 0 ? fRubro : null,
                    p_intereses: fInteres && fInteres.length > 0 ? fInteres : null,
                    p_estilos: fEstilo && fEstilo.length > 0 ? fEstilo : null,
                    p_creado_desde: fCreadoDesde || null,
                    p_creado_hasta: fCreadoHasta || null,
                    p_contacto_desde: fContactoDesde || null,
                    p_contacto_hasta: fContactoHasta || null,
                    p_grupos: fGrupos,
                    p_offset: (page - 1) * pageSize,
                    p_limit: pageSize,
                    p_sort_by: sortBy || 'recent'
                });

                if (rpcError) {
                    toast.error('Error al buscar clientes');
                    console.error(rpcError);
                    throw rpcError;
                }

                mapped = (rpcData || []).map((row: any) => ({
                    id: row.cliente_id,
                    nombre: row.nombre,
                    nombre_local: row.nombre_local,
                    direccion: row.direccion,
                    telefono: row.telefono,
                    mail: row.mail,
                    cuit: row.cuit,
                    lat: row.lat,
                    lng: row.lng,
                    clientes: { created_at: row.c_created_at },
                    estado: row.estado,
                    rubro: row.rubro,
                    responsable: row.responsable,
                    situacion: row.situacion,
                    notes: row.notas, // Fixed typo if occurred, but based on code it'snotas
                    notas: row.notas,
                    estilo_contacto: row.estilo_contacto,
                    interes: row.interes,
                    tipo_contacto: row.tipo_contacto,
                    venta_digital: row.venta_digital,
                    venta_digital_cual: row.venta_digital_cual,
                    fecha_proximo_contacto: row.fecha_proximo_contacto,
                    hora_proximo_contacto: row.hora_proximo_contacto,
                    activador_cierre: row.activador_cierre,
                    creado_por: row.creado_por,
                    created_at: row.ec_created_at,
                    updated_at: row.ec_updated_at,
                    ultima_actividad: row.ultima_actividad,
                    grupos: row.grupos || [] // From RPC JSONB
                }));
                total = rpcData && rpcData.length > 0 ? Number(rpcData[0].total_count) : 0;
            } else {
                const { data, count, error } = await request;

                if (error) {
                    toast.error('Error al cargar clientes');
                    console.error(error);
                    throw error;
                }

                mapped = (data || []).map(row => {
                    const c = row.clientes || {};
                    return {
                        id: c.id,
                        nombre: c.nombre,
                        nombre_local: c.nombre_local,
                        direccion: c.direccion,
                        telefono: c.telefono,
                        mail: c.mail,
                        cuit: c.cuit,
                        lat: c.lat,
                        lng: c.lng,
                        clientes: { created_at: c.created_at },
                        estado: row.estado,
                        rubro: row.rubro,
                        responsable: row.responsable,
                        situacion: row.situacion,
                        notas: row.notas,
                        estilo_contacto: row.estilo_contacto,
                        interes: row.interes,
                        tipo_contacto: row.tipo_contacto,
                        venta_digital: row.venta_digital,
                        venta_digital_cual: row.venta_digital_cual,
                        fecha_proximo_contacto: row.fecha_proximo_contacto,
                        hora_proximo_contacto: row.hora_proximo_contacto,
                        ultima_actividad: row.ultima_actividad,
                        created_at: row.created_at,
                        updated_at: row.updated_at,
                        grupos: (c.cliente_grupos || []).map((cg: any) => cg.grupos).filter(Boolean)
                    };
                });
                total = count || 0;
            }

            if (mapped.length > 0) {
                const ids = mapped.map(c => c.id).filter(Boolean);
                const { data: acts } = (await supabase
                    .from('actividades')
                    .select('*')
                    .in('cliente_id', ids)
                    .eq('empresa_id', empresaId)
                    .order('fecha', { ascending: false })) as { data: ClientActivity[] | null };

                if (acts) {
                    acts.forEach(a => {
                        const cid = (a as any).cliente_id;
                        if (!actsObj[cid]) actsObj[cid] = [];
                        actsObj[cid].push(a);
                    });
                }
            }

            return { clientes: mapped, total, activities: actsObj };
        },
        enabled: !!empresaId,
        staleTime: 0,
        gcTime: 1000 * 60 * 5,
        placeholderData: (previousData) => previousData,
    });
}

export function useDeleteCliente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, empresaActiva }: { id: string; empresaActiva: any }) => {
            const { error } = await supabase
                .from("empresa_cliente")
                .update({ activo: false })
                .eq("cliente_id", id)
                .eq("empresa_id", empresaActiva?.id);

            if (error) {
                const isOfflineError = error.message === 'Failed to fetch' || error.message?.includes('fetch') || !navigator.onLine;
                if (isOfflineError) return { id, isOffline: true };
                throw new Error(error.message);
            }
            return { id, isOffline: false };
        },
        onSuccess: (data) => {
            if (data?.isOffline) {
                toast.success("Cliente eliminado offline. Se sincronizará.");
            } else {
                toast.success("Cliente eliminado.");
            }
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        },
        onError: () => {
            toast.error("No se pudo eliminar al cliente.");
        }
    });
}

export function useQuickDateCliente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ clienteId, daysOffset, empresaActiva, userName, user }: { clienteId: string; daysOffset: number | null; empresaActiva: any; userName: string; user: any }) => {
            let dateStr: string | null = null;
            let displayMsg = 'Fecha de contacto eliminada';

            if (daysOffset !== null) {
                const d = new Date();
                d.setDate(d.getDate() + daysOffset);
                dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                displayMsg = `Próximo contacto: ${d.toLocaleDateString('es-AR')}`;
            }

            const { error: updateError } = await supabase
                .from('empresa_cliente')
                .update({ fecha_proximo_contacto: dateStr })
                .eq('cliente_id', clienteId)
                .eq('empresa_id', empresaActiva?.id);

            if (updateError) {
                const isOfflineError = updateError.message === 'Failed to fetch' || updateError.message?.includes('fetch') || !navigator.onLine;
                if (!isOfflineError) throw new Error(updateError.message);
            }

            const desc = dateStr ? `📅 Agenda actualizada: próximo contacto el ${formatToLocal(dateStr)}` : '🗑️ Fecha de próximo contacto eliminada';

            const { error: logError } = await supabase.from('actividades').insert([{
                cliente_id: clienteId,
                descripcion: desc,
                usuario: userName || user?.email || 'Sistema',
                empresa_id: empresaActiva?.id,
                fecha: new Date().toISOString()
            }]);

            if (logError) {
                const isOfflineError = logError.message === 'Failed to fetch' || logError.message?.includes('fetch') || !navigator.onLine;
                if (!isOfflineError) throw new Error(logError.message);
                return { displayMsg, isOffline: true };
            }

            return { displayMsg, isOffline: false };
        },
        onSuccess: (data) => {
            toast.success(data?.isOffline ? `${data.displayMsg} (Offline)` : data.displayMsg);
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        },
        onError: () => {
            toast.error('Error al actualizar la fecha');
        }
    });
}

export function useRegistrarVisitaCliente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ clienteId, nombre, empresaActiva, userName, user }: { clienteId: string; nombre: string; empresaActiva: any; userName: string; user: any }) => {
            const now = new Date().toISOString();

            const { error: logError } = await supabase.from('actividades').insert([{
                cliente_id: clienteId,
                descripcion: 'Visita realizada',
                fecha: now,
                usuario: userName || user?.email || 'Sistema',
                empresa_id: empresaActiva?.id
            }]);

            if (logError) {
                const isOfflineError = logError.message === 'Failed to fetch' || logError.message?.includes('fetch') || !navigator.onLine;
                if (!isOfflineError) throw new Error(logError.message);
            }

            const { error: updateError } = await supabase
                .from('empresa_cliente')
                .update({ ultima_actividad: now })
                .eq('cliente_id', clienteId)
                .eq('empresa_id', empresaActiva?.id);

            if (updateError) {
                const isOfflineError = updateError.message === 'Failed to fetch' || updateError.message?.includes('fetch') || !navigator.onLine;
                if (!isOfflineError) throw new Error(updateError.message);
                return { nombre, isOffline: true };
            }

            return { nombre, isOffline: false };
        },
        onSuccess: (data) => {
            if (data?.isOffline) {
                toast.success(`Visita offline para ${data.nombre || 'cliente'}`);
            } else {
                toast.success(`Visita registrada para ${data.nombre || 'cliente'}`);
            }
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        },
        onError: () => {
            toast.error('Error al registrar visita');
        }
    });
}

export function useRegistrarLlamadaCliente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ clienteId, nombre, empresaActiva, userName, user }: { clienteId: string; nombre: string; empresaActiva: any; userName: string; user: any }) => {
            const now = new Date().toISOString();

            const { error: logError } = await supabase.from('actividades').insert([{
                cliente_id: clienteId,
                descripcion: 'Llamada realizada',
                fecha: now,
                usuario: userName || user?.email || 'Sistema',
                empresa_id: empresaActiva?.id
            }]);

            if (logError) {
                const isOfflineError = logError.message === 'Failed to fetch' || logError.message?.includes('fetch') || !navigator.onLine;
                if (!isOfflineError) throw new Error(logError.message);
            }

            const { error: updateError } = await supabase
                .from('empresa_cliente')
                .update({ ultima_actividad: now })
                .eq('cliente_id', clienteId)
                .eq('empresa_id', empresaActiva?.id);

            if (updateError) {
                const isOfflineError = updateError.message === 'Failed to fetch' || updateError.message?.includes('fetch') || !navigator.onLine;
                if (!isOfflineError) throw new Error(updateError.message);
                return { nombre, isOffline: true };
            }

            return { nombre, isOffline: false };
        },
        onSuccess: (data) => {
            if (data?.isOffline) {
                toast.success(`Llamada offline para ${data.nombre || 'cliente'}`);
            } else {
                toast.success(`Llamada registrada para ${data.nombre || 'cliente'}`);
            }
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
        },
        onError: () => {
            toast.error('Error al registrar llamada');
        }
    });
}
