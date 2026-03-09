-- Función para crear un cliente y su vínculo con la empresa de forma atómica
-- Esto evita fallos de RLS donde el usuario no tiene permiso de ver el registro
-- en la tabla 'clientes' hasta que esté vinculado en 'empresa_cliente'.

CREATE OR REPLACE FUNCTION crear_cliente_completo(
    p_nombre_local TEXT,
    p_nombre TEXT,
    p_direccion TEXT,
    p_telefono TEXT,
    p_mail TEXT,
    p_cuit TEXT,
    p_lat FLOAT8,
    p_lng FLOAT8,
    p_empresa_id UUID,
    p_rubro TEXT,
    p_estado TEXT,
    p_responsable TEXT,
    p_situacion TEXT,
    p_notas TEXT,
    p_tipo_contacto TEXT,
    p_creado_por TEXT
) RETURNS UUID AS $$
DECLARE
    new_cliente_id UUID;
BEGIN
    -- 1. Insertar en tabla universal
    INSERT INTO clientes (nombre_local, nombre, direccion, telefono, mail, cuit, lat, lng, creado_por)
    VALUES (p_nombre_local, p_nombre, p_direccion, p_telefono, p_mail, p_cuit, p_lat, p_lng, p_creado_por)
    RETURNING id INTO new_cliente_id;

    -- 2. Insertar en tabla de vínculo con la empresa
    INSERT INTO empresa_cliente (
        empresa_id, cliente_id, estado, rubro, responsable, 
        situacion, notas, tipo_contacto, creado_por, activo
    )
    VALUES (
        p_empresa_id, new_cliente_id, p_estado, p_rubro, p_responsable, 
        p_situacion, p_notas, p_tipo_contacto, p_creado_por, true
    );

    RETURN new_cliente_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
