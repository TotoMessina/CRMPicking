-- ==============================================================================
-- PickingUp CRM - Script de Migración de Historial de Estados
-- ==============================================================================
-- Este script rescata los cambios de estado guardados como "Actividades"
-- y los pasa a la nueva columna 'status_history' de forma estructurada.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
    v_history JSONB;
BEGIN
    RAISE NOTICE 'Iniciando migración de historial de estados desde Actividades...';

    -- 1. Iterar sobre todos los registros de la tabla de negocio
    FOR r IN SELECT ec.id, ec.cliente_id, ec.empresa_id FROM public.empresa_cliente ec LOOP
        
        -- 2. Buscar actividades que coincidan con el patrón de cambio de estado
        -- Usamos el patrón: '🔄 Cambio de estado (Pipeline): [de] ➔ [a]'
        SELECT jsonb_agg(
            jsonb_build_object(
                'from', regexp_replace(descripcion, '.*Pipeline\): (.+) ➔ (.+)', '\1'),
                'to', regexp_replace(descripcion, '.*Pipeline\): (.+) ➔ (.+)', '\2'),
                'at', fecha,
                'by', usuario,
                'source', 'Legacy Activity'
            ) ORDER BY fecha ASC
        )
        INTO v_history
        FROM public.actividades
        WHERE cliente_id = r.cliente_id
          AND empresa_id = r.empresa_id
          AND descripcion LIKE '🔄 Cambio de estado (Pipeline):%➔%';

        -- 3. Si encontramos historial, lo guardamos en la nueva columna
        IF v_history IS NOT NULL THEN
            UPDATE public.empresa_cliente
            SET status_history = v_history
            WHERE id = r.id;
        END IF;

    END LOOP;

    RAISE NOTICE 'Migración completada con éxito.';
END $$;
