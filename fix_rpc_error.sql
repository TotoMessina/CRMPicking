-- ==============================================================================
-- PickingUp CRM - Script de Rescate (Corrección de Error de Duplicidad)
-- ==============================================================================
-- Este script soluciona el error 23505 (duplicate key) al crear clientes.
-- El problema era un Trigger "Legacy" que insertaba el cliente antes que el RPC.
-- ==============================================================================

-- 1. ELIMINAR EL TRIGGER CONFLICTIVO
-- Este trigger es el que causa el error "already exists" porque se dispara
-- automáticamente y usa un ID de empresa hardcodeado. ¡Es peligroso!
DROP TRIGGER IF EXISTS tr_auto_insert_ec_legacy ON public.clientes;

-- 2. ASEGURAR QUE EL RPC TENGA EL MANEJO DE CONFLICTOS (UPSERT)
-- Al usar 'ON CONFLICT', si el registro ya existe (por cualquier motivo),
-- el sistema lo actualizará en lugar de dar error.

CREATE OR REPLACE FUNCTION public.crear_cliente_v5_final(p_payload jsonb)
RETURNS bigint AS $$
DECLARE
    new_id BIGINT;
    v_emp_id UUID;
    v_creador TEXT;
BEGIN
    -- 1. Validar y convertir ID de empresa
    BEGIN
        v_emp_id := (p_payload->>'p_empresa_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'ID de empresa inválido: %. JSON: %', p_payload->>'p_empresa_id', p_payload;
    END;

    v_creador := p_payload->>'p_creado_por';

    -- 2. Insertar en tabla maestra 'clientes'
    INSERT INTO public.clientes (
        nombre_local, nombre, direccion, telefono, 
        mail, cuit, lat, lng, creado_por,
        created_at, updated_at
    )
    VALUES (
        p_payload->>'p_nombre_local', 
        p_payload->>'p_nombre', 
        p_payload->>'p_direccion', 
        p_payload->>'p_telefono', 
        p_payload->>'p_mail', 
        p_payload->>'p_cuit', 
        (p_payload->>'p_lat')::FLOAT8, 
        (p_payload->>'p_lng')::FLOAT8, 
        v_creador,
        NOW(),
        NOW()
    )
    RETURNING id INTO new_id;

    -- 3. Insertar o Actualizar en tabla de negocio 'empresa_cliente'
    INSERT INTO public.empresa_cliente (
        empresa_id, cliente_id, estado, rubro, responsable, 
        situacion, notas, tipo_contacto, creado_por, activo,
        interes, estilo_contacto, venta_digital, venta_digital_cual,
        fecha_proximo_contacto, hora_proximo_contacto,
        created_at, updated_at
    )
    VALUES (
        v_emp_id, 
        new_id, 
        p_payload->>'p_estado', 
        p_payload->>'p_rubro', 
        p_payload->>'p_responsable', 
        p_payload->>'p_situacion', 
        p_payload->>'p_notas', 
        p_payload->>'p_tipo_contacto', 
        v_creador, 
        true,
        p_payload->>'p_interes',
        p_payload->>'p_estilo_contacto',
        (p_payload->>'p_venta_digital')::BOOLEAN,
        p_payload->>'p_venta_digital_cual',
        p_payload->>'p_fecha_proximo_contacto',
        p_payload->>'p_hora_proximo_contacto',
        NOW(),
        NOW()
    )
    ON CONFLICT (empresa_id, cliente_id) DO UPDATE SET
        estado = EXCLUDED.estado,
        rubro = EXCLUDED.rubro,
        responsable = EXCLUDED.responsable,
        situacion = EXCLUDED.situacion,
        notas = EXCLUDED.notas,
        tipo_contacto = EXCLUDED.tipo_contacto,
        creado_por = EXCLUDED.creado_por,
        interes = EXCLUDED.interes,
        estilo_contacto = EXCLUDED.estilo_contacto,
        venta_digital = EXCLUDED.venta_digital,
        venta_digital_cual = EXCLUDED.venta_digital_cual,
        fecha_proximo_contacto = EXCLUDED.fecha_proximo_contacto,
        hora_proximo_contacto = EXCLUDED.hora_proximo_contacto,
        activo = EXCLUDED.activo,
        updated_at = EXCLUDED.updated_at;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. LIMPIEZA ADICIONAL (Opcional pero recomendada)
-- Si por algún error quedaron clientes huérfanos sin empresa_id,
-- podemos forzar que se cree su entrada en empresa_cliente.
-- Pero para el error actual, con los pasos 1 y 2 es suficiente.

-- ==============================================================================
-- FIN DEL SCRIPT DE RESCATE
-- ==============================================================================
