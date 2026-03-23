-- ==============================================================================
-- PickingUp CRM - Actualización de RPC buscar_clientes_empresa
-- ==============================================================================
-- Esta actualización agrega filtros multi-select y rango de fecha de agenda.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.buscar_clientes_empresa(
    p_empresa_id UUID,
    p_nombre TEXT DEFAULT NULL,
    p_telefono TEXT DEFAULT NULL,
    p_direccion TEXT DEFAULT NULL,
    p_estado TEXT DEFAULT NULL,
    p_situacion TEXT DEFAULT NULL,
    p_tipo_contacto TEXT DEFAULT NULL,
    p_responsable TEXT DEFAULT NULL, -- Se mantiene por compatibilidad legacy
    p_responsables TEXT[] DEFAULT NULL, -- Nuevo: soporte para multi-select
    p_rubro TEXT DEFAULT NULL,
    p_interes TEXT DEFAULT NULL,
    p_estilo TEXT DEFAULT NULL,
    p_creado_desde TEXT DEFAULT NULL,
    p_creado_hasta TEXT DEFAULT NULL,
    p_contacto_desde TEXT DEFAULT NULL, -- Nuevo: rango de fecha próximo contacto (desde)
    p_contacto_hasta TEXT DEFAULT NULL, -- Nuevo: rango de fecha próximo contacto (hasta)
    p_offset INTEGER DEFAULT 0,
    p_limit INTEGER DEFAULT 50,
    p_sort_by TEXT DEFAULT 'recent'
)
RETURNS TABLE (
    ec_id UUID,
    cliente_id BIGINT,
    empresa_id UUID,
    estado TEXT,
    rubro TEXT,
    responsable TEXT,
    situacion TEXT,
    notas TEXT,
    estilo_contacto TEXT,
    interes TEXT,
    tipo_contacto TEXT,
    venta_digital BOOLEAN,
    venta_digital_cual TEXT,
    fecha_proximo_contacto TEXT,
    hora_proximo_contacto TEXT,
    creado_por TEXT,
    activador_cierre TEXT,
    visitas INTEGER,
    ultima_actividad TIMESTAMPTZ,
    activo BOOLEAN,
    ec_created_at TIMESTAMPTZ,
    ec_updated_at TIMESTAMPTZ,
    nombre TEXT,
    nombre_local TEXT,
    telefono TEXT,
    direccion TEXT,
    mail TEXT,
    cuit TEXT,
    lat FLOAT8,
    lng FLOAT8,
    c_created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id,
        ec.cliente_id,
        ec.empresa_id,
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
        ec.creado_por,
        ec.activador_cierre,
        ec.visitas,
        ec.ultima_actividad,
        ec.activo,
        ec.created_at,
        ec.updated_at,
        c.nombre,
        c.nombre_local,
        c.telefono,
        c.direccion,
        c.mail,
        c.cuit,
        c.lat,
        c.lng,
        c.created_at
    FROM public.empresa_cliente ec
    JOIN public.clientes c ON c.id = ec.cliente_id
    WHERE ec.empresa_id = p_empresa_id
      AND ec.activo = true
      AND (p_nombre IS NULL OR c.nombre ILIKE '%' || p_nombre || '%' OR c.nombre_local ILIKE '%' || p_nombre || '%')
      AND (p_telefono IS NULL OR c.telefono ILIKE '%' || p_telefono || '%')
      AND (p_direccion IS NULL OR c.direccion ILIKE '%' || p_direccion || '%')
      AND (p_estado IS NULL OR ec.estado = p_estado)
      AND (p_situacion IS NULL OR ec.situacion = p_situacion)
      AND (p_tipo_contacto IS NULL OR ec.tipo_contacto = p_tipo_contacto)
      -- Filtro de Responsable: Soporta legacy (p_responsable) y nuevo (p_responsables)
      AND (
          (p_responsable IS NULL AND p_responsables IS NULL) OR
          (p_responsable IS NOT NULL AND ec.responsable = p_responsable) OR
          (p_responsables IS NOT NULL AND ec.responsable = ANY(p_responsables))
      )
      AND (p_rubro IS NULL OR ec.rubro = p_rubro)
      AND (p_interes IS NULL OR ec.interes = p_interes)
      AND (p_estilo IS NULL OR ec.estilo_contacto = p_estilo)
      AND (p_creado_desde IS NULL OR c.created_at >= (p_creado_desde || ' 00:00:00')::TIMESTAMPTZ)
      AND (p_creado_hasta IS NULL OR c.created_at <= (p_creado_hasta || ' 23:59:59')::TIMESTAMPTZ)
      AND (p_contacto_desde IS NULL OR ec.fecha_proximo_contacto >= p_contacto_desde)
      AND (p_contacto_hasta IS NULL OR ec.fecha_proximo_contacto <= p_contacto_hasta)
    ORDER BY 
        CASE WHEN p_sort_by = 'updated' THEN ec.updated_at END DESC,
        CASE WHEN p_sort_by = 'recent' THEN ec.created_at END DESC,
        CASE WHEN p_sort_by = 'oldest' THEN ec.created_at END ASC,
        CASE WHEN p_sort_by = 'az' THEN c.nombre_local END ASC,
        CASE WHEN p_sort_by = 'za' THEN c.nombre_local END DESC,
        CASE WHEN p_sort_by = 'activity_desc' THEN ec.ultima_actividad END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'activity_asc' THEN ec.ultima_actividad END ASC NULLS FIRST,
        ec.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
