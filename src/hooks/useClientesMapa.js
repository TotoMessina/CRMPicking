import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useClientesMapa(empresaId) {
    return useQuery({
        // The query key uniquely identifies this piece of cached data
        queryKey: ['clientesMapa', empresaId],
        queryFn: async () => {
            if (!empresaId) return [];

            const { data, error } = await supabase.rpc('buscar_clientes_empresa', {
                p_empresa_id: empresaId,
                p_offset: 0,
                p_limit: 5000,
                p_sort_by: 'recent'
            });

            if (error) {
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
            })).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));

            return mapped;
        },
        enabled: !!empresaId, // Only execute if we have a valid empresaId
    });
}
