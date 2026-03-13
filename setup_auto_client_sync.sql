-- Automatic dynamic synchronization of clients by creator's company
-- This script sets up a trigger to automatically link new/updated clients
-- to the company the creator belongs to.

-- 1. Create or replace the dynamic synchronization function
CREATE OR REPLACE FUNCTION public.auto_insert_empresa_cliente()
RETURNS TRIGGER AS $$
DECLARE
    v_empresa_id UUID;
    v_default_empresa_id UUID := '302444cf-9e6b-4127-b018-6c0d1972b276'; -- PickingUp ID
BEGIN
    -- 1. Attempt to find the company associated with the creator's email
    SELECT empresa_id INTO v_empresa_id
    FROM public.empresa_usuario
    WHERE usuario_email = NEW.creado_por
    LIMIT 1;

    -- 2. Fallback to default company if no mapping is found
    IF v_empresa_id IS NULL THEN
        v_empresa_id := v_default_empresa_id;
    END IF;

    -- 3. Safety check: ensure the target company exists
    IF NOT EXISTS (SELECT 1 FROM public.empresas WHERE id = v_empresa_id) THEN
        RETURN NEW;
    END IF;

    -- 4. Upsert into empresa_cliente to maintain sync
    INSERT INTO public.empresa_cliente (
        empresa_id,
        cliente_id,
        estado,
        rubro,
        responsable,
        situacion,
        notas,
        estilo_contacto,
        interes,
        tipo_contacto,
        venta_digital,
        venta_digital_cual,
        fecha_proximo_contacto,
        hora_proximo_contacto,
        creado_por,
        activador_cierre,
        visitas,
        ultima_actividad,
        activo,
        created_at,
        updated_at
    ) VALUES (
        v_empresa_id,
        NEW.id,
        COALESCE(NEW.estado, '1 - Cliente relevado'),
        NEW.rubro,
        NEW.responsable,
        COALESCE(NEW.situacion, 'sin comunicacion nueva'),
        NEW.notas,
        NEW.estilo_contacto,
        NEW.interes,
        COALESCE(NEW.tipo_contacto, 'Visita Presencial'),
        COALESCE(NEW.venta_digital, false),
        NEW.venta_digital_cual,
        NEW.fecha_proximo_contacto::text,
        NEW.hora_proximo_contacto::text,
        COALESCE(NEW.creado_por, 'Sistema (Auto-Sync)'),
        NEW.activador_cierre,
        COALESCE(NEW.visitas, 0),
        NEW.ultima_actividad,
        COALESCE(NEW.activo, true),
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW())
    )
    ON CONFLICT (empresa_id, cliente_id) DO UPDATE SET
        estado = EXCLUDED.estado,
        rubro = EXCLUDED.rubro,
        responsable = EXCLUDED.responsable,
        situacion = EXCLUDED.situacion,
        notas = EXCLUDED.notas,
        fecha_proximo_contacto = EXCLUDED.fecha_proximo_contacto,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach/Re-attach the trigger
DROP TRIGGER IF EXISTS tr_auto_insert_ec_legacy ON public.clientes;
CREATE TRIGGER tr_auto_insert_ec_legacy
AFTER INSERT OR UPDATE ON public.clientes
FOR EACH ROW
EXECUTE FUNCTION public.auto_insert_empresa_cliente();

-- 3. Run a one-time migration to fix existing assignments if needed
-- This part looks up the creator for each client and moves them to the right company
DO $$
DECLARE
    r RECORD;
    v_target_emp_id UUID;
    v_default UUID := '302444cf-9e6b-4127-b018-6c0d1972b276';
BEGIN
    FOR r IN SELECT id, creado_por, estado, rubro, responsable, situacion, notas, estilo_contacto, interes, tipo_contacto, venta_digital, venta_digital_cual, fecha_proximo_contacto, hora_proximo_contacto, created_at, updated_at, ultima_actividad, activador_cierre, visitas, activo FROM public.clientes LOOP
        
        -- Find company for creator
        SELECT empresa_id INTO v_target_emp_id FROM public.empresa_usuario WHERE usuario_email = r.creado_por LIMIT 1;
        
        IF v_target_emp_id IS NULL THEN
            v_target_emp_id := v_default;
        END IF;

        IF EXISTS (SELECT 1 FROM public.empresas WHERE id = v_target_emp_id) THEN
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
                COALESCE(r.creado_por, 'Sistema (Migration)'), r.activador_cierre, 
                COALESCE(r.visitas, 0), r.ultima_actividad, COALESCE(r.activo, true), 
                COALESCE(r.created_at, NOW()), COALESCE(r.updated_at, NOW())
            ) ON CONFLICT (empresa_id, cliente_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;
