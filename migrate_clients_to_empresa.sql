-- Migration script to populate empresa_cliente from existing clients
-- This script links all existing clients to the "PickingUp" company if they are not already linked.

DO $$
DECLARE
    v_empresa_id UUID := '302444cf-9e6b-4127-b018-6c0d1972b276'; -- PickingUp ID
BEGIN
    -- Check if company exists to avoid foreign key errors
    IF EXISTS (SELECT 1 FROM public.empresas WHERE id = v_empresa_id) THEN
        
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
        )
        SELECT 
            v_empresa_id,
            c.id,
            COALESCE(c.estado, '1 - Cliente relevado'),
            c.rubro,
            c.responsable,
            COALESCE(c.situacion, 'sin comunicacion nueva'),
            c.notas,
            c.estilo_contacto,
            c.interes,
            COALESCE(c.tipo_contacto, 'Visita Presencial'),
            COALESCE(c.venta_digital, false),
            c.venta_digital_cual,
            c.fecha_proximo_contacto::text,
            c.hora_proximo_contacto::text,
            COALESCE(c.creado_por, 'Sistema (Migración)'),
            c.activador_cierre,
            COALESCE(c.visitas, 0),
            c.ultima_actividad,
            COALESCE(c.activo, true),
            COALESCE(c.created_at, NOW()),
            COALESCE(c.updated_at, NOW())
        FROM public.clientes c
        WHERE NOT EXISTS (
            SELECT 1 
            FROM public.empresa_cliente ec 
            WHERE ec.cliente_id = c.id 
            AND ec.empresa_id = v_empresa_id
        );

        RAISE NOTICE 'Migration completed successfully.';
    ELSE
        RAISE WARNING 'Company PickingUp (302444cf-9e6b-4127-b018-6c0d1972b276) not found. Migration skipped.';
    END IF;
END $$;
