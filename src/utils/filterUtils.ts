import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

export interface ClientFilters {
    estado?: string[];
    situacion?: string[];
    tipoContacto?: string[];
    responsable?: string[];
    creadoPor?: string[];
    rubro?: string[];
    interes?: string[];
    estilo?: string[];
    creadoDesde?: string;
    creadoHasta?: string;
    contactoDesde?: string;
    contactoHasta?: string;
    isAgendaHoy?: boolean;
    proximos7?: boolean;
    vencidos?: boolean;
    grupos?: string[];
    nombre?: string;
    telefono?: string;
    direccion?: string;
}

export function applyClientFilters(
    query: any,
    filters: ClientFilters
): any {
    let q = query;

    if (filters.estado && filters.estado.length > 0) q = q.in('estado', filters.estado);
    if (filters.situacion && filters.situacion.length > 0) q = q.in('situacion', filters.situacion);
    if (filters.tipoContacto && filters.tipoContacto.length > 0) q = q.in('tipo_contacto', filters.tipoContacto);
    if (filters.responsable && filters.responsable.length > 0) q = q.in('responsable', filters.responsable);
    if (filters.creadoPor && filters.creadoPor.length > 0) q = q.in('creado_por', filters.creadoPor);
    if (filters.rubro && filters.rubro.length > 0) q = q.in('rubro', filters.rubro);
    if (filters.interes && filters.interes.length > 0) q = q.in('interes', filters.interes);
    if (filters.estilo && filters.estilo.length > 0) q = q.in('estilo_contacto', filters.estilo);

    if (filters.creadoDesde) q = q.gte('created_at', `${filters.creadoDesde}T00:00:00.000Z`);
    if (filters.creadoHasta) q = q.lte('created_at', `${filters.creadoHasta}T23:59:59.999Z`);

    if (filters.contactoDesde) q = q.gte('fecha_proximo_contacto', filters.contactoDesde);
    if (filters.contactoHasta) q = q.lte('fecha_proximo_contacto', filters.contactoHasta);

    if (filters.isAgendaHoy) {
        q = q.eq('fecha_proximo_contacto', new Date().toISOString().split('T')[0]);
    }

    if (filters.proximos7) {
        const hoy = new Date();
        const en7 = new Date(hoy);
        en7.setDate(hoy.getDate() + 7);
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        q = q.gte('fecha_proximo_contacto', fmt(hoy)).lte('fecha_proximo_contacto', fmt(en7));
    }

    if (filters.vencidos) {
        const hoy = new Date().toISOString().split('T')[0];
        q = q.lt('fecha_proximo_contacto', hoy).not('fecha_proximo_contacto', 'is', null);
    }

    if (filters.grupos && filters.grupos.length > 0) {
        q = q.in('clientes.cliente_grupos.grupo_id', filters.grupos);
    }

    if (filters.nombre) q = q.ilike('clientes.nombre_local', `%${filters.nombre}%`);
    if (filters.telefono) q = q.ilike('clientes.telefono', `%${filters.telefono}%`);
    if (filters.direccion) q = q.ilike('clientes.direccion', `%${filters.direccion}%`);

    return q;
}

export interface LlamadaFilters {
    busqueda: string;
    operador: string;
    rubro: string;
    respuesta: string;
    etiqueta?: string;
    origen_contacto?: string;
    cantidad_llamadas?: string;
    fecha_modificacion?: string;
    fecha_desde?: string;
    fecha_hasta?: string;
    estado_conversion?: string;
    localidad?: string;
    provincia?: string;
}

export function applyLlamadasFilters(
    query: any,
    filters: Partial<LlamadaFilters> = {},
    sortBy?: string
): any {
    let q = query;

    // Ordenamiento
    if (sortBy) {
        switch (sortBy) {
            case 'updated_desc':
                q = q.order('updated_at', { ascending: false, nullsFirst: false });
                break;
            case 'updated_asc':
                q = q.order('updated_at', { ascending: true, nullsFirst: false });
                break;
            case 'llamadas_desc':
                q = q.order('cantidad_llamadas', { ascending: false, nullsFirst: false });
                break;
            case 'llamadas_asc':
                q = q.order('cantidad_llamadas', { ascending: true, nullsFirst: false });
                break;
            case 'created_asc':
                q = q.order('created_at', { ascending: true });
                break;
            case 'nombre_asc':
                q = q.order('nombre', { ascending: true, nullsFirst: false }).order('apellido', { ascending: true, nullsFirst: false });
                break;
            case 'nombre_desc':
                q = q.order('nombre', { ascending: false, nullsFirst: false }).order('apellido', { ascending: false, nullsFirst: false });
                break;
            case 'comercio_asc':
                q = q.order('nombre_comercio', { ascending: true, nullsFirst: false });
                break;
            case 'comercio_desc':
                q = q.order('nombre_comercio', { ascending: false, nullsFirst: false });
                break;
            case 'operador_asc':
                q = q.order('nombre_operador', { ascending: true, nullsFirst: false });
                break;
            case 'fecha_llamada_desc':
                q = q.order('fecha_ultima_llamada', { ascending: false, nullsLast: true });
                break;
            case 'fecha_llamada_asc':
                q = q.order('fecha_ultima_llamada', { ascending: true, nullsLast: true });
                break;
            case 'created_desc':
            default:
                q = q.order('created_at', { ascending: false });
                break;
        }
    }

    if (filters.busqueda && filters.busqueda.trim()) {
        const tokens = filters.busqueda.trim().split(/\s+/).filter(Boolean);
        tokens.forEach((token: string) => {
            const cleanToken = token.replace(/"/g, '');
            if (cleanToken) {
                const safeTerm = `"%${cleanToken}%"`;
                q = q.or(
                    `nombre.ilike.${safeTerm},apellido.ilike.${safeTerm},telefono.ilike.${safeTerm},nombre_comercio.ilike.${safeTerm},direccion.ilike.${safeTerm},localidad.ilike.${safeTerm},provincia.ilike.${safeTerm},mail.ilike.${safeTerm},nombre_operador.ilike.${safeTerm}`
                );
            }
        });
    }

    if (filters.operador && filters.operador.trim()) {
        q = q.ilike('nombre_operador', `%${filters.operador.trim()}%`);
    }

    if (filters.rubro && filters.rubro.trim()) {
        q = q.eq('rubro', filters.rubro.trim());
    }

    if (filters.respuesta && filters.respuesta.trim()) {
        q = q.eq('respuesta_llamado', filters.respuesta.trim());
    }

    if (filters.etiqueta && filters.etiqueta.trim()) {
        q = q.eq('etiqueta', filters.etiqueta.trim());
    }

    if (filters.origen_contacto && filters.origen_contacto.trim()) {
        q = q.ilike('origen_contacto', `%${filters.origen_contacto.trim()}%`);
    }

    if (filters.localidad && filters.localidad.trim()) {
        q = q.ilike('localidad', `%${filters.localidad.trim()}%`);
    }

    if (filters.provincia && filters.provincia.trim()) {
        q = q.ilike('provincia', `%${filters.provincia.trim()}%`);
    }

    // Filtro por cantidad de llamadas
    if (filters.cantidad_llamadas) {
        switch (filters.cantidad_llamadas) {
            case '0':
                q = q.or('cantidad_llamadas.is.null,cantidad_llamadas.eq.0');
                break;
            case '1':
                q = q.eq('cantidad_llamadas', 1);
                break;
            case '1+':
                q = q.gte('cantidad_llamadas', 1);
                break;
            case '2+':
                q = q.gte('cantidad_llamadas', 2);
                break;
            case '3+':
                q = q.gte('cantidad_llamadas', 3);
                break;
            case '5+':
                q = q.gte('cantidad_llamadas', 5);
                break;
        }
    }

    // Filtro por fecha de última modificación
    if (filters.fecha_modificacion) {
        const now = new Date();
        if (filters.fecha_modificacion === 'hoy') {
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            q = q.gte('updated_at', today);
        } else if (filters.fecha_modificacion === '7d') {
            const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            q = q.gte('updated_at', d7);
        } else if (filters.fecha_modificacion === '30d') {
            const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            q = q.gte('updated_at', d30);
        } else if (filters.fecha_modificacion === 'custom') {
            if (filters.fecha_desde) {
                q = q.gte('updated_at', new Date(filters.fecha_desde + 'T00:00:00').toISOString());
            }
            if (filters.fecha_hasta) {
                q = q.lte('updated_at', new Date(filters.fecha_hasta + 'T23:59:59.999').toISOString());
            }
        }
    }

    // Filtro por estado de conversión
    if (filters.estado_conversion) {
        switch (filters.estado_conversion) {
            case 'whatsapp':
                q = q.eq('envio_whatsapp', true);
                break;
            case 'formulario':
                q = q.eq('completo_formulario', true);
                break;
            case 'listo':
                q = q.eq('envio_listo', true);
                break;
            case 'redes':
                q = q.not('siguio_redes', 'is', null).neq('siguio_redes', 'no');
                break;
            case 'video':
                q = q.or('envio_catalogo_video.eq.true,respuesta_llamado.eq.catalogo_video_enviado,video_url.not.is.null');
                break;
            case 'solicito_video':
                q = q.eq('solicito_video', true);
                break;
        }
    }

    return q;
}
