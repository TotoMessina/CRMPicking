-- =============================================
-- FUNCIÓN: crear_cliente_v4_json
-- Usamos un nombre totalmente nuevo para evitar
-- conflictos con versiones anteriores mal mapeadas.
-- =============================================

DROP FUNCTION IF EXISTS crear_cliente_v4_json(jsonb);

CREATE OR REPLACE FUNCTION crear_cliente_v4_json(p_payload JSONB) 
RETURNS UUID AS $$
DECLARE
    new_id UUID;
    v_emp_id UUID;
    v_creador TEXT;
BEGIN
    -- 1. Extraer y validar ID de empresa
    BEGIN
        v_emp_id := (p_payload->>'p_empresa_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'ID de empresa inválido: %. JSON recibido: %', p_payload->>'p_empresa_id', p_payload;
    END;

    v_creador := p_payload->>'p_creado_por';

    -- 2. Insertar en tabla maestra 'clientes'
    INSERT INTO clientes (
        nombre_local, nombre, direccion, telefono, 
        mail, cuit, lat, lng, creado_por
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
        v_creador
    )
    RETURNING id INTO new_id;

    -- 3. Insertar en tabla de negocio 'empresa_cliente'
    INSERT INTO empresa_cliente (
        empresa_id, cliente_id, estado, rubro, responsable, 
        situacion, notas, tipo_contacto, creado_por, activo
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
        true
    );

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Forzar recarga de PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'crear_cliente_v4_json';
