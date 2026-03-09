-- ============================================================
-- RPC: buscar_clientes_empresa (v2 con Ordenamiento Dinámico)
-- Busca clientes de una empresa filtrando por texto y otros campos.
-- Permite especificar el criterio de ordenamiento.
-- ============================================================

DROP FUNCTION IF EXISTS buscar_clientes_empresa(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT);
DROP FUNCTION IF EXISTS buscar_clientes_empresa(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INT, INT, TEXT);

CREATE OR REPLACE FUNCTION buscar_clientes_empresa(
    p_empresa_id UUID,
    p_nombre TEXT DEFAULT NULL,
    p_telefono TEXT DEFAULT NULL,
    p_direccion TEXT DEFAULT NULL,
    p_estado TEXT DEFAULT NULL,
    p_situacion TEXT DEFAULT NULL,
    p_tipo_contacto TEXT DEFAULT NULL,
    p_responsable TEXT DEFAULT NULL,
    p_rubro TEXT DEFAULT NULL,
    p_interes TEXT DEFAULT NULL,
    p_estilo TEXT DEFAULT NULL,
    p_offset INT DEFAULT 0,
    p_limit INT DEFAULT 25,
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
    visitas INT,
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
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    c_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ec.id AS ec_id,
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
        ec.created_at AS ec_created_at,
        ec.updated_at AS ec_updated_at,
        c.nombre,
        c.nombre_local,
        c.telefono,
        c.direccion,
        c.mail,
        c.cuit,
        c.lat,
        c.lng,
        c.created_at AS c_created_at
    FROM empresa_cliente ec
    JOIN clientes c ON c.id = ec.cliente_id
    WHERE ec.empresa_id = p_empresa_id
      AND ec.activo = true
      AND (p_nombre IS NULL OR c.nombre ILIKE '%' || p_nombre || '%' OR c.nombre_local ILIKE '%' || p_nombre || '%')
      AND (p_telefono IS NULL OR c.telefono ILIKE '%' || p_telefono || '%')
      AND (p_direccion IS NULL OR c.direccion ILIKE '%' || p_direccion || '%')
      AND (p_estado IS NULL OR ec.estado = p_estado)
      AND (p_situacion IS NULL OR ec.situacion = p_situacion)
      AND (p_tipo_contacto IS NULL OR ec.tipo_contacto = p_tipo_contacto)
      AND (p_responsable IS NULL OR ec.responsable = p_responsable)
      AND (p_rubro IS NULL OR ec.rubro = p_rubro)
      AND (p_interes IS NULL OR ec.interes = p_interes)
      AND (p_estilo IS NULL OR ec.estilo_contacto = p_estilo)
    ORDER BY 
        CASE WHEN p_sort_by = 'updated' THEN ec.updated_at END DESC,
        CASE WHEN p_sort_by = 'recent' THEN ec.created_at END DESC,
        CASE WHEN p_sort_by = 'oldest' THEN ec.created_at END ASC,
        CASE WHEN p_sort_by = 'az' THEN c.nombre END ASC,
        CASE WHEN p_sort_by = 'za' THEN c.nombre END DESC,
        CASE WHEN p_sort_by = 'activity_desc' THEN ec.ultima_actividad END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'activity_asc' THEN ec.ultima_actividad END ASC NULLS FIRST,
        -- Fallback: siempre creacion desc si no coincide nada
        ec.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$;
