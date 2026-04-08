import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { saveClientsLocally, getLocalClients } from '../lib/offlineManager';


export function useClientesMapa(empresaId, filters = {}) {
    const {
        nombre, telefono, direccion, estado, situacion, responsable, creadoPor,
        rubro, interes, estilo, tipoContacto, proximos7, vencidos,
        creadoDesde, creadoHasta, contactoDesde, contactoHasta
    } = filters;

    // Helper for "Next 7 Days" filter
    let cDesde = contactoDesde;
    let cHasta = contactoHasta;
    if (proximos7) {
        const hoy = new Date();
        const en7 = new Date(hoy); en7.setDate(hoy.getDate() + 7);
        const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        cDesde = fmt(hoy);
        cHasta = fmt(en7);
    } else if (vencidos) {
        cDesde = null;
        cHasta = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
    }

    return useQuery({
        // The query key uniquely identifies this piece of cached data
        queryKey: ['clientesMapa', { empresaId, filters }],
        queryFn: async () => {
            if (!empresaId) return [];

            const { data, error } = await supabase.rpc('buscar_clientes_empresa', {
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
                p_offset: 0,
                p_limit: 5000,
                p_sort_by: 'recent'
            });

            if (error) {
                console.warn("useClientesMapa: network error, trying local cache...", error);
                // Fallback: read from IndexedDB snapshot
                if (!navigator.onLine) {
                    const localData = await getLocalClients(empresaId);
                    if (localData.length > 0) {
                        toast('📶 Usando datos en caché (sin conexión)', { id: 'offline-cache', icon: '💾', duration: 4000 });
                        return localData;
                    }
                }
                toast.error("Error al cargar clientes del mapa");
                console.error("useClientesMapa error:", error);
                throw error;
            }

            const mapped = (data || []).map(row => ({
                id: row.cliente_id,
                // universal
                nombre: row.nombre,
                nombre_local: row.nombre_local,
                direccion: row.direccion,
                telefono: row.telefono,
                mail: row.mail,
                cuit: row.cuit,
                lat: Number(row.lat),
                lng: Number(row.lng),
                clientes: { created_at: row.c_created_at },
                // company specific
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
                empresa_id: empresaId, // needed for IndexedDB index
            })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));

            // Persist snapshot to IndexedDB for offline use
            // Only save the full unfiltered dataset
            const isUnfiltered = !nombre && !telefono && !estado?.length;
            if (isUnfiltered && mapped.length > 0) {
                saveClientsLocally(mapped); // Fire and forget
            }

            return mapped;
        },
        enabled: !!empresaId, // Only execute if we have a valid empresaId
    });
}
