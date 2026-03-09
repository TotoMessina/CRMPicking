-- 1. LIMPIEZA NUCLEAR: Borramos ABSOLUTAMENTE TODAS las funciones con estos nombres
-- Esto elimina cualquier conflicto de "overloading" de parámetros.
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT oid::regprocedure as proc_name 
        FROM pg_proc 
        WHERE proname IN ('crear_cliente_completo', 'crear_cliente_v3', 'crear_cliente_final')
    ) LOOP
        EXECUTE 'DROP FUNCTION ' || r.proc_name;
    END LOOP;
END $$;

-- 2. CREACIÓN: Función definitiva con un nombre único y UN solo parámetro JSONB
-- Usamos 'datos' para que sea genérico y no choque con nombres de columnas.
CREATE OR REPLACE FUNCTION crear_cliente_final(datos JSONB) 
RETURNS UUID AS $$
DECLARE
    new_id UUID;
    v_emp_id UUID;
BEGIN
    -- Verificación de seguridad: ¿Viene el ID de empresa?
    IF datos->>'p_empresa_id' IS NULL THEN
        RAISE EXCEPTION 'ID de empresa faltante (p_empresa_id). JSON recibido: %', datos;
    END IF;

    -- Intentar convertir el ID de empresa, si falla daremos un error claro
    BEGIN
        v_emp_id := (datos->>'p_empresa_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'El ID de empresa no es un UUID válido: "%". JSON: %', datos->>'p_empresa_id', datos;
    END;

    -- A. Insertar en tabla clientes
    INSERT INTO clientes (
        nombre_local, nombre, direccion, telefono, 
        mail, cuit, lat, lng, creado_por
    )
    VALUES (
        datos->>'p_nombre_local', 
        datos->>'p_nombre', 
        datos->>'p_direccion', 
        datos->>'p_telefono', 
        datos->>'p_mail', 
        datos->>'p_cuit', 
        (datos->>'p_lat')::FLOAT8, 
        (datos->>'p_lng')::FLOAT8, 
        datos->>'p_creado_por'
    )
    RETURNING id INTO new_id;

    -- B. Insertar en empresa_cliente
    INSERT INTO empresa_cliente (
        empresa_id, cliente_id, estado, rubro, responsable, 
        situacion, notas, tipo_contacto, creado_por, activo
    )
    VALUES (
        v_emp_id, 
        new_id, 
        datos->>'p_estado', 
        datos->>'p_rubro', 
        datos->>'p_responsable', 
        datos->>'p_situacion', 
        datos->>'p_notas', 
        datos->>'p_tipo_contacto', 
        datos->>'p_creado_por', 
        true
    );

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FORZAR RECARGA DE CACHÉ DE SCHEMAS
NOTIFY pgrst, 'reload schema';

-- 4. VERIFICACIÓN FINAL: Debería salir una sola fila con 'crear_cliente_final'
SELECT routine_name, data_type 
FROM information_schema.routines 
WHERE routine_name = 'crear_cliente_final';
