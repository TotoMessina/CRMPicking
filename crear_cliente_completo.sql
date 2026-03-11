-- =============================================
-- FUNCIÓN: crear_cliente_v5_final
-- Sincronizada con los tipos reales de la tabla:
-- id/cliente_id son BIGINT (integer)
-- empresa_id es UUID
-- =============================================

DROP FUNCTION IF EXISTS crear_cliente_v5_final(p_payload jsonb);

CREATE OR REPLACE FUNCTION crear_cliente_v5_final(p_payload JSONB) 
RETURNS BIGINT AS $$
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

    -- 2. Insertar en tabla maestra 'clientes' (id es BIGINT)
    INSERT INTO clientes (
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

    -- 3. Insertar en tabla de negocio 'empresa_cliente' (cliente_id es BIGINT)
    -- Lo convertimos en UPSERT (ON CONFLICT) para que si el Trigger
    -- "auto_insert" para apps viejas ya lo creó 1 milisegundo antes, 
    -- lo sobreescribimos pacificamente con los datos ricos de esta RPC.
    INSERT INTO empresa_cliente (
        empresa_id, cliente_id, estado, rubro, responsable, 
        situacion, notas, tipo_contacto, creado_por, activo,
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
        activo = EXCLUDED.activo,
        updated_at = EXCLUDED.updated_at;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Forzar recarga de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación final
SELECT routine_name, data_type 
FROM information_schema.routines 
WHERE routine_name = 'crear_cliente_v5_final';
