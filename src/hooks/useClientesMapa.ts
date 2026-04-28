import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { saveClientsLocally, getLocalClients } from '../lib/offlineManager';

export interface MapFilters {
    nombre?: string;
    telefono?: string;
    direccion?: string;
    estado?: string[];
    situacion?: string[];
    responsable?: string[];
    creadoPor?: string[];
    rubro?: string[];
    interes?: string[];
    estilo?: string[];
    tipoContacto?: string[];
    proximos7?: boolean;
    vencidos?: boolean;
    creadoDesde?: string;
    creadoHasta?: string;
    contactoDesde?: string;
    contactoHasta?: string;
    grupos?: string[];
    fMissingCoords?: boolean;
    fMissingContact?: boolean;
    fMissingRubro?: boolean;
}

export function useClientesMapa(empresaId: string | undefined, filters: MapFilters = {}) {
    const {
        nombre, telefono, direccion, estado, situacion, responsable, creadoPor,
        rubro, interes, estilo, tipoContacto, proximos7, vencidos,
        creadoDesde, creadoHasta, contactoDesde, contactoHasta, grupos,
        fMissingCoords, fMissingContact, fMissingRubro
    } = filters;

    // Helper for "Next 7 Days" filter
    let cDesde = contactoDesde;
    let cHasta = contactoHasta;
    if (proximos7) {
        const hoy = new Date();
        const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7);
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        cDesde = fmt(hoy);
        cHasta = fmt(en7);
    } else if (vencidos) {
        cDesde = undefined;
        cHasta = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
    }

    return useQuery({
        queryKey: ['clientesMapa', { empresaId, filters }],
        queryFn: async () => {
            if (!empresaId) return [];

            const { data, error } = await supabase.rpc('buscar_clientes_empresa' as any, {
                p_empresa_id: empresaId,
                p_nombre: nombre || null,
                p_telefono: telefono || null,
                p_direccion: direccion || null,
                p_estados: (estado && estado.length > 0) ? estado : null,
                p_situaciones: (situacion && situacion.length > 0) ? situacion : null,
                p_tipos_contacto: (tipoContacto && tipoContacto.length > 0) ? tipoContacto : null,
                p_responsables: (responsable && responsable.length > 0) ? responsable : null,
                p_creados_por: (creadoPor && creadoPor.length > 0) ? creadoPor : null,
                p_rubros: (rubro && rubro.length > 0) ? rubro : null,
                p_intereses: (interes && interes.length > 0) ? interes : null,
                p_estilos: (estilo && estilo.length > 0) ? estilo : null,
                p_creado_desde: creadoDesde || null,
                p_creado_hasta: creadoHasta || null,
                p_contacto_desde: cDesde || null,
                p_contacto_hasta: cHasta || null,
                p_grupos: (grupos && grupos.length > 0) ? grupos : null,
                p_missing_coords: fMissingCoords || null,
                p_missing_contact: fMissingContact || null,
                p_missing_rubro: fMissingRubro || null,
                p_offset: 0,
                p_limit: 5000,
                p_sort_by: 'recent'
            } as any);

            if (error) {
                console.warn("useClientesMapa: network error, trying local cache...", error);
                if (!navigator.onLine) {
                    const localData = await getLocalClients(empresaId);
                    if (localData.length > 0) {
                        toast('📶 Usando datos en caché (sin conexión)', { id: 'offline-cache', icon: '💾', duration: 4000 });
                        return localData;
                    }
                }
                toast.error("Error al cargar clientes del mapa");
                throw error;
            }

            const mapped = (data || []).map((row: any) => ({
                id: row.cliente_id,
                nombre: row.nombre,
                nombre_local: row.nombre_local,
                direccion: row.direccion,
                telefono: row.telefono,
                mail: row.mail,
                cuit: row.cuit,
                lat: Number(row.lat),
                lng: Number(row.lng),
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
                updated_at: row.updated_at,
                ultima_actividad: row.ultima_actividad,
                empresa_id: empresaId,
            })).filter((r: any) => Number.isFinite(r.lat) && Number.isFinite(r.lng));

            const isUnfiltered = !nombre && !telefono && !estado?.length;
            if (isUnfiltered && mapped.length > 0) {
                saveClientsLocally(mapped);
            }

            return mapped;
        },
        enabled: !!empresaId,
    });
}
