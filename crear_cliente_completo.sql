-- ===================================================================
-- NUCLEAR DROP: Eliminar TODAS las versiones previas de la función
-- para evitar conflictos de sobrecarga (overloading)
-- ===================================================================
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as proc_name FROM pg_proc WHERE proname = 'crear_cliente_completo') LOOP
        EXECUTE 'DROP FUNCTION ' || r.proc_name;
    END LOOP;
END $$;

-- También borramos la v3 por si acaso
DROP FUNCTION IF EXISTS crear_cliente_v3(jsonb);

-- ===================================================================
-- FUNCIÓN: crear_cliente_v3 (Versión Definitiva JSONB)
-- ===================================================================
CREATE OR REPLACE FUNCTION crear_cliente_v3(p_data JSONB) 
RETURNS UUID AS $$
DECLARE
    new_id UUID;
    v_emp_id UUID;
    v_creador TEXT;
BEGIN
    -- 1. Validaciones y extracción segura de IDs
    v_emp_id := (p_data->>'p_empresa_id')::UUID;
    v_creador := p_data->>'p_creado_por';

    -- 2. Insertar en tabla maestra 'clientes'
    INSERT INTO clientes (
        nombre_local, nombre, direccion, telefono, 
        mail, cuit, lat, lng, creado_por
    )
    VALUES (
        p_data->>'p_nombre_local', 
        p_data->>'p_nombre', 
        p_data->>'p_direccion', 
        p_data->>'p_telefono', 
        p_data->>'p_mail', 
        p_data->>'p_cuit', 
        (p_data->>'p_lat')::FLOAT8, 
        (p_data->>'p_lng')::FLOAT8, 
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
        p_data->>'p_estado', 
        p_data->>'p_rubro', 
        p_data->>'p_responsable', 
        p_data->>'p_situacion', 
        p_data->>'p_notas', 
        p_data->>'p_tipo_contacto', 
        v_creador, 
        true
    );

    RETURN new_id;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en crear_cliente_v3: %. Detalles: %', SQLERRM, SQLSTATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
