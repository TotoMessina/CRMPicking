-- PARCHE DEFINITIVO Y LIMPIEZA DE BÚSQUEDA UNIVERSAL
-- INSTRUCCIONES: Ejecuta TODO este bloque en el SQL Editor de Supabase.

-- 1. LIMPIEZA PROFUNDA: Borra todas las versiones duplicadas para evitar conflictos
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

-- 2. CREACIÓN REFORZADA: Con casteos explícitos para evitar errores de tipo
CREATE OR REPLACE FUNCTION public.buscar_clientes_empresa(
    p_empresa_id uuid,
    p_nombre text DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0,
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
    p_creado_desde text DEFAULT NULL, -- Recibimos como texto para evitar fallos de driver
    p_creado_hasta text DEFAULT NULL,
    p_contacto_desde text DEFAULT NULL,
    p_contacto_hasta text DEFAULT NULL,
    p_sort_by text DEFAULT 'recent'
)
RETURNS TABLE (
    ec_id uuid,
    cliente_id integer,
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
    fecha_proximo_contacto date,
    hora_proximo_contacto time,
    activador_cierre text,
    creado_por text,
    ec_created_at timestamptz,
    ec_updated_at timestamptz,
    ultima_actividad timestamptz,
    visitas integer,
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
            ec.visitas
        FROM empresa_cliente ec
        JOIN clientes c ON ec.cliente_id = c.id
        WHERE ec.empresa_id = p_empresa_id
          AND ec.activo = true
          AND (
            p_nombre IS NULL OR 
            c.nombre_local ILIKE '%' || p_nombre || '%' OR 
            c.nombre ILIKE '%' || p_nombre || '%' OR
            c.id::text = p_nombre OR -- Búsqueda exacta por ID
            c.id::text ILIKE p_nombre || '%' OR -- Búsqueda parcial por ID
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
          -- Casteos de seguridad robustos
          AND (p_creado_desde IS NULL OR ec.created_at::DATE >= p_creado_desde::DATE)
          AND (p_creado_hasta IS NULL OR ec.created_at::DATE <= p_creado_hasta::DATE)
          AND (p_contacto_desde IS NULL OR ec.fecha_proximo_contacto::DATE >= p_contacto_desde::DATE)
          AND (p_contacto_hasta IS NULL OR ec.fecha_proximo_contacto::DATE <= p_contacto_hasta::DATE)
    )
    SELECT *, COUNT(*) OVER() as total_count
    FROM filtered
    ORDER BY
        CASE WHEN p_sort_by = 'recent' THEN ec_created_at END DESC,
        CASE WHEN p_sort_by = 'oldest' THEN ec_created_at END ASC,
        CASE WHEN p_sort_by = 'updated' THEN ec_updated_at END DESC,
        CASE WHEN p_sort_by = 'az' THEN nombre_local END ASC,
        CASE WHEN p_sort_by = 'za' THEN nombre_local END DESC,
        CASE WHEN p_sort_by = 'activity_desc' THEN ultima_actividad END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'activity_asc' THEN ultima_actividad END ASC NULLS FIRST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
