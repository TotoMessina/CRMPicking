-- Consolidation script for clientes to empresa_cliente (with Audit Report)
-- This script ensures no information is lost and provides a summary of actions taken.

DO $$
DECLARE
    r RECORD;
    v_target_emp_id UUID;
    v_default_emp_id UUID := '302444cf-9e6b-4127-b018-6c0d1972b276'; -- PickingUp ID
    v_inserted_count INT := 0;
    v_updated_count INT := 0;
    v_skipped_count INT := 0;
    v_already_exists BOOLEAN;
    v_has_changes BOOLEAN;
BEGIN
    FOR r IN (
        SELECT * FROM public.clientes
    ) LOOP
        -- 1. Determine target company (Creator's company or Default)
        SELECT empresa_id INTO v_target_emp_id 
        FROM public.empresa_usuario 
        WHERE usuario_email = r.creado_por 
        LIMIT 1;

        IF v_target_emp_id IS NULL THEN
            v_target_emp_id := v_default_emp_id;
        END IF;

        -- 2. Check if the mapping already exists
        SELECT EXISTS (
            SELECT 1 FROM public.empresa_cliente 
            WHERE empresa_id = v_target_emp_id AND cliente_id = r.id
        ) INTO v_already_exists;

        IF v_already_exists THEN
            -- Check if there are differences to justify an update
            SELECT EXISTS (
                SELECT 1 FROM public.empresa_cliente ec
                WHERE ec.empresa_id = v_target_emp_id 
                  AND ec.cliente_id = r.id
                  AND (
                      ec.estado IS DISTINCT FROM r.estado OR
                      ec.rubro IS DISTINCT FROM r.rubro OR
                      ec.responsable IS DISTINCT FROM r.responsable OR
                      ec.situacion IS DISTINCT FROM r.situacion OR
                      ec.notas IS DISTINCT FROM r.notas OR
                      ec.fecha_proximo_contacto IS DISTINCT FROM r.fecha_proximo_contacto::text OR
                      ec.activador_cierre IS DISTINCT FROM r.activador_cierre
                  )
            ) INTO v_has_changes;

            IF v_has_changes THEN
                UPDATE public.empresa_cliente SET
                    estado = COALESCE(r.estado, estado),
                    rubro = COALESCE(r.rubro, rubro),
                    responsable = COALESCE(r.responsable, responsable),
                    situacion = COALESCE(r.situacion, situacion),
                    notas = COALESCE(r.notas, notas),
                    estilo_contacto = COALESCE(r.estilo_contacto, estilo_contacto),
                    interes = COALESCE(r.interes, interes),
                    tipo_contacto = COALESCE(r.tipo_contacto, tipo_contacto),
                    venta_digital = COALESCE(r.venta_digital, venta_digital),
                    venta_digital_cual = COALESCE(r.venta_digital_cual, venta_digital_cual),
                    fecha_proximo_contacto = COALESCE(r.fecha_proximo_contacto::text, fecha_proximo_contacto),
                    hora_proximo_contacto = COALESCE(r.hora_proximo_contacto::text, hora_proximo_contacto),
                    activador_cierre = COALESCE(r.activador_cierre, activador_cierre),
                    visitas = COALESCE(r.visitas, visitas),
                    ultima_actividad = COALESCE(r.ultima_actividad, ultima_actividad),
                    activo = COALESCE(r.activo, activo),
                    updated_at = NOW()
                WHERE empresa_id = v_target_emp_id AND cliente_id = r.id;
                
                v_updated_count := v_updated_count + 1;
            ELSE
                v_skipped_count := v_skipped_count + 1;
            END IF;
        ELSE
            -- Insert new record
            INSERT INTO public.empresa_cliente (
                empresa_id, cliente_id, estado, rubro, responsable, situacion,
                notas, estilo_contacto, interes, tipo_contacto, venta_digital,
                venta_digital_cual, fecha_proximo_contacto, hora_proximo_contacto,
                creado_por, activador_cierre, visitas, ultima_actividad, activo,
                created_at, updated_at
            ) VALUES (
                v_target_emp_id, r.id, COALESCE(r.estado, '1 - Cliente relevado'), r.rubro, r.responsable, 
                COALESCE(r.situacion, 'sin comunicacion nueva'), r.notas, r.estilo_contacto, 
                r.interes, COALESCE(r.tipo_contacto, 'Visita Presencial'), 
                COALESCE(r.venta_digital, false), r.venta_digital_cual, 
                r.fecha_proximo_contacto::text, r.hora_proximo_contacto::text,
                COALESCE(r.creado_por, 'Sistema (Audit-Sync)'), r.activador_cierre, 
                COALESCE(r.visitas, 0), r.ultima_actividad, COALESCE(r.activo, true), 
                COALESCE(r.created_at, NOW()), COALESCE(r.updated_at, NOW())
            );
            
            v_inserted_count := v_inserted_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE 'REPORTE DE CONSOLIDACIÓN DE CLIENTES';
    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE 'Clientes insertados (nuevas vinculaciones): %', v_inserted_count;
    RAISE NOTICE 'Clientes actualizados (datos sincronizados): %', v_updated_count;
    RAISE NOTICE 'Clientes ya sincronizados (sin cambios): %', v_skipped_count;
    RAISE NOTICE '--------------------------------------------------';
END $$;
