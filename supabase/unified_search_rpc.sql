-- ==============================================================================
-- RPC UNIFICADA: buscar_clientes_empresa (VERSIÓN DEFINITIVA)
-- ==============================================================================
-- Esta versión combina:
-- 1. Búsqueda por texto (nombre, local, dirección, teléfono, cuit, id)
-- 2. Filtros de Auditoría (p_missing_coords, p_missing_contact, p_missing_rubro)
-- 3. Filtros de Grupos (p_grupos)
-- 4. Filtros Avanzados (estados, rubros, responsables, fechas, etc.)
-- ==============================================================================

-- 1. LIMPIEZA PREVIA DE TODAS LAS VERSIONES
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure as name 
        FROM pg_proc 
        WHERE proname = 'buscar_clientes_empresa' 
        AND pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || r.name;
    END LOOP;
END $$;

-- 2. CREACIÓN DE LA VERSIÓN UNIFICADA
CREATE OR REPLACE FUNCTION public.buscar_clientes_empresa(
    p_empresa_id uuid,
    p_nombre text DEFAULT NULL,
    p_telefono text DEFAULT NULL,
    p_direccion text DEFAULT NULL,
    p_estados text[] DEFAULT NULL,
    p_situaciones text[] DEFAULT NULL,
    p_tipos_contacto text[] DEFAULT NULL,
    p_responsables text[] DEFAULT NULL,
    p_creados_por text[] DEFAULT NULL,
    p_rubros text[] DEFAULT NULL,
    p_intereses text[] DEFAULT NULL,
    p_estilos text[] DEFAULT NULL,
    p_creado_desde text DEFAULT NULL,
    p_creado_hasta text DEFAULT NULL,
    p_contacto_desde text DEFAULT NULL,
    p_contacto_hasta text DEFAULT NULL,
    p_grupos bigint[] DEFAULT NULL,
    p_missing_coords boolean DEFAULT NULL,
    p_missing_contact boolean DEFAULT NULL,
    p_missing_rubro boolean DEFAULT NULL,
    p_offset integer DEFAULT 0,
    p_limit integer DEFAULT 50,
    p_sort_by text DEFAULT 'updated'
)
RETURNS TABLE (
    ec_id uuid,
    cliente_id bigint,
    nombre text,
    nombre_local text,
    direccion text,
    telefono text,
    mail text,
    cuit text,
    lat double precision,
    lng double precision,
    c_created_at timestamptz,
    estado text,
    rubro text,
    responsable text,
    situacion text,
    notas text,
    estilo_contacto text,
    interes text,
    tipo_contacto text,
    venta_digital boolean,
    venta_digital_cual text,
    fecha_proximo_contacto text,
    hora_proximo_contacto text,
    activador_cierre text,
    creado_por text,
    ec_created_at timestamptz,
    ec_updated_at timestamptz,
    ultima_actividad timestamptz,
    visitas integer,
    grupos jsonb,
    total_count bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered AS (
        SELECT 
            ec.id as ec_id,
            ec.cliente_id,
            c.nombre,
            c.nombre_local,
            c.direccion,
            c.telefono,
            c.mail,
            c.cuit,
            c.lat,
            c.lng,
            c.created_at as c_created_at,
            ec.estado,
            ec.rubro,
            ec.responsable,
            ec.situacion,
            ec.notas,
            ec.estilo_contacto,
            ec.interes,
            ec.tipo_contacto,
            ec.venta_digital,
            ec.venta_digital_cual,
            ec.fecha_proximo_contacto,
            ec.hora_proximo_contacto,
            ec.activador_cierre,
            ec.creado_por,
            ec.created_at as ec_created_at,
            ec.updated_at as ec_updated_at,
            ec.ultima_actividad,
            ec.visitas,
            (
                SELECT jsonb_agg(jsonb_build_object('id', g.id, 'nombre', g.nombre, 'color', g.color))
                FROM public.cliente_grupos cg 
                JOIN public.grupos g ON cg.grupo_id = g.id
                WHERE cg.cliente_id = c.id
            ) as grupos_json
        FROM empresa_cliente ec
        JOIN clientes c ON ec.cliente_id = c.id
        WHERE ec.empresa_id = p_empresa_id
          AND ec.activo = true
          AND (
            p_nombre IS NULL OR 
            c.nombre_local ILIKE '%' || p_nombre || '%' OR 
            c.nombre ILIKE '%' || p_nombre || '%' OR
            c.id::text = p_nombre OR 
            c.id::text ILIKE p_nombre || '%' OR
            c.telefono ILIKE '%' || p_nombre || '%' OR
            c.cuit ILIKE p_nombre || '%' OR
            c.direccion ILIKE '%' || p_nombre || '%'
          )
          AND (p_telefono IS NULL OR c.telefono ILIKE '%' || p_telefono || '%')
          AND (p_direccion IS NULL OR c.direccion ILIKE '%' || p_direccion || '%')
          AND (p_estados IS NULL OR ec.estado = ANY(p_estados))
          AND (p_situaciones IS NULL OR ec.situacion = ANY(p_situaciones))
          AND (p_tipos_contacto IS NULL OR ec.tipo_contacto = ANY(p_tipos_contacto))
          AND (p_responsables IS NULL OR ec.responsable = ANY(p_responsables))
          AND (p_creados_por IS NULL OR ec.creado_por = ANY(p_creados_por))
          AND (p_rubros IS NULL OR ec.rubro = ANY(p_rubros))
          AND (p_intereses IS NULL OR ec.interes = ANY(p_intereses))
          AND (p_estilos IS NULL OR ec.estilo_contacto = ANY(p_estilos))
          AND (p_creado_desde IS NULL OR ec.created_at::DATE >= p_creado_desde::DATE)
          AND (p_creado_hasta IS NULL OR ec.created_at::DATE <= p_creado_hasta::DATE)
          AND (p_contacto_desde IS NULL OR (NULLIF(ec.fecha_proximo_contacto::text, '')::DATE) >= p_contacto_desde::DATE)
          AND (p_contacto_hasta IS NULL OR (NULLIF(ec.fecha_proximo_contacto::text, '')::DATE) <= p_contacto_hasta::DATE)
          AND (p_missing_coords IS NULL OR p_missing_coords = false OR (c.lat IS NULL OR c.lng IS NULL OR c.lat = 0))
          AND (p_missing_contact IS NULL OR p_missing_contact = false OR ((c.telefono IS NULL OR c.telefono = '') AND (c.mail IS NULL OR c.mail = '')))
          AND (p_missing_rubro IS NULL OR p_missing_rubro = false OR (ec.rubro IS NULL OR ec.rubro = 'Sin rubro' OR ec.rubro = ''))
          AND (p_grupos IS NULL OR EXISTS (
              SELECT 1 FROM public.cliente_grupos cg 
              WHERE cg.cliente_id = c.id 
                AND cg.grupo_id = ANY(p_grupos)
          ))
    )
    SELECT 
        f.ec_id, f.cliente_id, f.nombre, f.nombre_local, f.direccion, 
        f.telefono, f.mail, f.cuit, f.lat, f.lng, f.c_created_at, 
        f.estado, f.rubro, f.responsable, f.situacion, f.notas, 
        f.estilo_contacto, f.interes, f.tipo_contacto, f.venta_digital, 
        f.venta_digital_cual, f.fecha_proximo_contacto, f.hora_proximo_contacto, 
        f.activador_cierre, f.creado_por, f.ec_created_at, f.ec_updated_at, 
        f.ultima_actividad, f.visitas, f.grupos_json,
        COUNT(*) OVER() as total_count
    FROM filtered f
    ORDER BY
        CASE WHEN p_sort_by = 'recent' THEN f.ec_created_at END DESC,
        CASE WHEN p_sort_by = 'oldest' THEN f.ec_created_at END ASC,
        CASE WHEN p_sort_by = 'updated' THEN f.ec_updated_at END DESC,
        CASE WHEN p_sort_by = 'az' THEN f.nombre_local END ASC,
        CASE WHEN p_sort_by = 'za' THEN f.nombre_local END DESC,
        CASE WHEN p_sort_by = 'activity_desc' THEN f.ultima_actividad END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'activity_asc' THEN f.ultima_actividad END ASC NULLS FIRST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
