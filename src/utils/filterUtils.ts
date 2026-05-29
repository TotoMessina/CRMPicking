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
