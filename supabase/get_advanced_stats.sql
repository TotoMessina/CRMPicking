-- ==========================================
-- STATISTICS 2.0: SERVER-SIDE AGGREGATION + PREDICTIVES (V2)
-- ==========================================

-- Limpieza total: Borrar todas las versiones anteriores de la función (independientemente de sus parámetros)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as prog FROM pg_proc WHERE proname = 'get_advanced_stats') LOOP
        EXECUTE 'DROP FUNCTION ' || r.prog;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION get_advanced_stats(
    p_empresa_id UUID,
    p_date_from TEXT,
    p_date_to TEXT,
    p_filter_activator TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_iso_from TIMESTAMPTZ;
    v_iso_to TIMESTAMPTZ;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Force timestamps for consistent filtering
    v_iso_from := NULLIF(trim(p_date_from::text), '')::DATE::TIMESTAMPTZ;
    v_iso_to := (NULLIF(trim(p_date_to::text), '')::DATE + INTERVAL '1 day')::TIMESTAMPTZ;

    WITH 
    -- 1. Base Clients Data with Activator Filter
    base_clients AS (
        SELECT 
            ec.*,
            c.lat,
            c.lng,
            c.nombre_local,
            c.telefono,
            c.mail,
            COALESCE(
                NULLIF(trim(ec.ultima_actividad::text), '')::TIMESTAMPTZ, 
                ec.updated_at::TIMESTAMPTZ
            ) as last_interaction,
            NULLIF(trim(ec.created_at::text), '')::TIMESTAMPTZ as created_at_tz
        FROM empresa_cliente ec
        JOIN clientes c ON ec.cliente_id = c.id
        WHERE ec.empresa_id = p_empresa_id 
          AND ec.activo = true
          AND (NULLIF(trim(p_filter_activator), '') IS NULL OR ec.creado_por = p_filter_activator)
    ),
    
    -- 2. KPIs
    kpis AS (
        SELECT 
            COUNT(*) as total_clientes_activos,
            COUNT(*) FILTER (WHERE (NULLIF(trim(fecha_proximo_contacto::text), '')::DATE) IS NOT NULL) as con_fecha,
            COUNT(*) FILTER (WHERE (NULLIF(trim(fecha_proximo_contacto::text), '')::DATE) IS NULL) as sin_fecha,
            COUNT(*) FILTER (WHERE (NULLIF(trim(fecha_proximo_contacto::text), '')::DATE) < v_today) as vencidos,
            COUNT(*) FILTER (WHERE (NULLIF(trim(fecha_proximo_contacto::text), '')::DATE) = v_today) as prox_hoy,
            COUNT(*) FILTER (WHERE (NULLIF(trim(fecha_proximo_contacto::text), '')::DATE) > v_today AND (NULLIF(trim(fecha_proximo_contacto::text), '')::DATE) <= (v_today + INTERVAL '7 days')::DATE) as prox_7,
            COUNT(*) FILTER (WHERE last_interaction >= v_iso_from AND last_interaction < v_iso_to) as activos_rango,
            COUNT(*) FILTER (WHERE last_interaction < (v_today - INTERVAL '30 days')::DATE OR last_interaction IS NULL) as dormidos
        FROM base_clients
    ),

    -- 3. Distributions
    dist_rubros AS (
        SELECT COALESCE(rubro, 'Sin rubro') as rubro, COUNT(*) as count 
        FROM base_clients 
        GROUP BY rubro ORDER BY count DESC
    ),
    
    dist_estados AS (
        SELECT COALESCE(estado, 'Sin estado') as estado, COUNT(*) as count 
        FROM base_clients 
        GROUP BY estado ORDER BY count DESC
    ),

    -- 4. Daily Series (Creations)
    daily_creations AS (
        SELECT 
            created_at_tz::DATE as day,
            COUNT(*) as count
        FROM base_clients
        WHERE created_at_tz >= v_iso_from AND created_at_tz < v_iso_to
        GROUP BY 1
    ),

    -- 5. Data Integrity Audit & Quality Score
    integrity AS (
        SELECT 
            COUNT(*) FILTER (WHERE lat IS NULL OR lng IS NULL OR lat = 0) as missing_coords,
            COUNT(*) FILTER (WHERE (telefono IS NULL OR telefono = '') AND (mail IS NULL OR mail = '')) as missing_contact,
            COUNT(*) FILTER (WHERE rubro IS NULL OR rubro = 'Sin rubro' OR rubro = '') as missing_rubro,
            COUNT(*) as total_count
        FROM base_clients
    ),

    -- 6. Predictives & Insights
    predictives AS (
        SELECT
            ROUND((k.dormidos::float / NULLIF(k.total_clientes_activos, 0)) * 100) as churn_rate,
            ROUND(100 - (
                (COALESCE(i.missing_coords, 0)::float + COALESCE(i.missing_contact, 0)::float + COALESCE(i.missing_rubro, 0)::float) / 
                NULLIF(i.total_count * 3, 0) * 100
            )) as health_score,
            (
                SELECT COUNT(*) 
                FROM base_clients 
                WHERE created_at_tz >= (v_today - INTERVAL '30 days')::DATE
            ) as mtd_growth,
            ROUND(COALESCE((
                (SELECT COUNT(*) FROM base_clients WHERE created_at_tz >= (v_today - INTERVAL '30 days')::DATE)::float / 
                NULLIF((SELECT COUNT(*) FROM base_clients WHERE created_at_tz < (v_today - INTERVAL '30 days')::DATE AND created_at_tz >= (v_today - INTERVAL '60 days')::DATE), 0) - 1
            ) * 100, 0)) as growth_trend_pct
        FROM kpis k, integrity i
        LIMIT 1
    ),

    -- 7. Heatmap Data
    geo_points AS (
        SELECT lat, lng, estado, situacion
        FROM base_clients
        WHERE lat IS NOT NULL AND lng IS NOT NULL
        LIMIT 2000
    ),

    -- 8. Creadores (Altas por Activador)
    dist_creadores AS (
        SELECT COALESCE(NULLIF(trim(creado_por), ''), 'Desconocido') as creador, COUNT(*) as count 
        FROM base_clients 
        GROUP BY 1 ORDER BY count DESC
    ),

    -- 9. Situacion Locales Activos (Only Estado 5)
    dist_situacion AS (
        SELECT COALESCE(NULLIF(trim(situacion), ''), 'sin comunicacion nueva') as situacion, COUNT(*) as count
        FROM base_clients
        WHERE estado = '5 - Local Visitado Activo'
        GROUP BY 1 ORDER BY count DESC
    ),

    -- 10. Clientes Estado 5 (Minimal for RubrosSituacionChart)
    estado5_clientes AS (
        SELECT rubro, situacion
        FROM base_clients
        WHERE estado = '5 - Local Visitado Activo'
    ),

    -- 11. Repartidores Daily
    repartidores_daily AS (
        SELECT created_at::DATE as day, COUNT(*) as count
        FROM repartidores
        WHERE empresa_id = p_empresa_id AND created_at >= v_iso_from AND created_at < v_iso_to
        GROUP BY 1
    ),

    -- 12. Consumidores Daily
    consumidores_daily AS (
        SELECT created_at::DATE as day, COUNT(*) as count
        FROM consumidores
        WHERE empresa_id = p_empresa_id AND created_at >= v_iso_from AND created_at < v_iso_to
        GROUP BY 1
    )

    SELECT json_build_object(
        'kpis', (SELECT row_to_json(kpis) FROM kpis),
        'rubros', (SELECT json_agg(dist_rubros) FROM dist_rubros),
        'estados', (SELECT json_agg(dist_estados) FROM dist_estados),
        'creations', (SELECT json_agg(daily_creations) FROM daily_creations),
        'integrity', (SELECT row_to_json(integrity) FROM integrity),
        'predictives', (SELECT row_to_json(predictives) FROM predictives),
        'geo', (SELECT json_agg(geo_points) FROM geo_points),
        'creadores', (SELECT json_agg(dist_creadores) FROM dist_creadores),
        'situacion', (SELECT json_agg(dist_situacion) FROM dist_situacion),
        'estado5_raw', (SELECT json_agg(estado5_clientes) FROM estado5_clientes),
        'repartidores', (SELECT json_agg(repartidores_daily) FROM repartidores_daily),
        'consumidores', (SELECT json_agg(consumidores_daily) FROM consumidores_daily)
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION get_advanced_stats TO authenticated, anon, service_role;
