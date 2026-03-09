import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useClientes(params) {
    const {
        empresaId, page, pageSize, isAgendaHoy,
        fEstado, fSituacion, fTipoContacto, fResponsable,
        fRubro, fInteres, fEstilo, fProximos7, fVencidos,
        fNombre, fTelefono, fDireccion, sortBy
    } = params;

    return useQuery({
        // The query key uniquely identifies this piece of cached data
        // Array includes all dependencies that should trigger a refetch
        queryKey: [
            'clientes',
            {
                empresaId, page, pageSize, isAgendaHoy,
                fEstado, fSituacion, fTipoContacto, fResponsable,
                fRubro, fInteres, fEstilo, fProximos7, fVencidos,
                fNombre, fTelefono, fDireccion, sortBy
            }
        ],
        queryFn: async () => {
            if (!empresaId) return { clientes: [], total: 0, activities: {} };

            let request = supabase
                .from('empresa_cliente')
                .select('*, clientes(*)', { count: 'exact' })
                .eq('empresa_id', empresaId)
                .eq('activo', true);

            // Apply sorting
            if (sortBy === 'recent') {
                request = request.order('created_at', { ascending: false }).order('ultima_actividad', { ascending: false, nullsFirst: false });
            } else if (sortBy === 'oldest') {
                request = request.order('created_at', { ascending: true }).order('ultima_actividad', { ascending: true, nullsFirst: false });
            } else if (sortBy === 'az') {
                request = request.order('updated_at', { ascending: false });
            } else if (sortBy === 'activity_desc') {
                request = request.order('ultima_actividad', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
            } else if (sortBy === 'activity_asc') {
                request = request.order('ultima_actividad', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true });
            }

            request = request.range((page - 1) * pageSize, page * pageSize - 1);

            if (isAgendaHoy) {
                request = request.eq('fecha_proximo_contacto', new Date().toISOString().split('T')[0]);
            }

            if (fEstado !== 'Todos') request = request.eq('estado', fEstado);
            if (fSituacion !== 'Todos') request = request.eq('situacion', fSituacion);
            if (fTipoContacto !== 'Todos') request = request.eq('tipo_contacto', fTipoContacto);
            if (fResponsable) request = request.eq('responsable', fResponsable);
            if (fRubro) request = request.eq('rubro', fRubro);
            if (fInteres) request = request.eq('interes', fInteres);
            if (fEstilo) request = request.eq('estilo_contacto', fEstilo);

            if (fProximos7) {
                const hoy = new Date();
                const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7);
                const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                request = request.gte('fecha_proximo_contacto', fmt(hoy)).lte('fecha_proximo_contacto', fmt(en7));
            }

            if (fVencidos) {
                const hoy = new Date().toISOString().split('T')[0];
                request = request.lt('fecha_proximo_contacto', hoy).not('fecha_proximo_contacto', 'is', null);
            }

            const hasTextFilter = fNombre || fTelefono || fDireccion;
            let mapped = [];
            let total = 0;
            let actsObj = {};

            if (hasTextFilter) {
                const { data: rpcData, error: rpcError } = await supabase.rpc('buscar_clientes_empresa', {
                    p_empresa_id: empresaId,
                    p_nombre: fNombre || null,
                    p_telefono: fTelefono || null,
                    p_direccion: fDireccion || null,
                    p_estado: fEstado !== 'Todos' ? fEstado : null,
                    p_situacion: fSituacion !== 'Todos' ? fSituacion : null,
                    p_tipo_contacto: fTipoContacto !== 'Todos' ? fTipoContacto : null,
                    p_responsable: fResponsable || null,
                    p_rubro: fRubro || null,
                    p_interes: fInteres || null,
                    p_estilo: fEstilo || null,
                    p_offset: (page - 1) * pageSize,
                    p_limit: pageSize,
                });

                if (rpcError) {
                    toast.error('Error al buscar clientes');
                    console.error(rpcError);
                    throw rpcError;
                }

                mapped = (rpcData || []).map(row => ({
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
                }));
                // Si la cantidad de items devueltos es menor a pageSize, sabemos que es la última página
                total = rpcData?.length === pageSize ? (page * pageSize) + 1 : (page - 1) * pageSize + (rpcData?.length || 0);
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
                        activador_cierre: row.activador_cierre,
                        creado_por: row.creado_por,
                        created_at: row.created_at,
                    };
                });
                total = count || 0;
            }

            // Mapeo extra para traer historial de contacto "Actividades" de esos IDs devueltos
            if (mapped.length > 0) {
                const ids = mapped.map(c => c.id).filter(Boolean);
                const { data: acts } = await supabase
                    .from('actividades')
                    .select('*')
                    .in('cliente_id', ids)
                    .eq('empresa_id', empresaId)
                    .order('fecha', { ascending: false });

                if (acts) {
                    acts.forEach(a => {
                        if (!actsObj[a.cliente_id]) actsObj[a.cliente_id] = [];
                        actsObj[a.cliente_id].push(a);
                    });
                }
            }

            return { clientes: mapped, total, activities: actsObj };
        },
        enabled: !!empresaId, // No ejecutar hasta que tengamos la empresa activa
        // Mantiene en caché por 5 minutos
        staleTime: 1000 * 60 * 5,
        // Si el usuario scrollea, cambia de página y no queremos que haga pantalla en blanco, usamos:
        placeholderData: (previousData) => previousData,
    });
}
