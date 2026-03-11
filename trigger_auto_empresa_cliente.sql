-- ============================================================
-- SCRIPT: trigger_auto_empresa_cliente.sql
-- Este trigger se asegura de que NUNCA vuelva a quedar un 
-- cliente huérfano. Si la aplicación móvil vieja (en caché) 
-- guarda un cliente directo en la tabla 'clientes', este 
-- trigger lo enlaza automáticamente a PickingUp enseguida.
-- ============================================================

CREATE OR REPLACE FUNCTION auto_insert_empresa_cliente()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO empresa_cliente (
        empresa_id,
        cliente_id,
        estado,
        situacion,
        responsable,
        tipo_contacto,
        creado_por,
        activo,
        created_at,
        updated_at
    ) VALUES (
        '302444cf-9e6b-4127-b018-6c0d1972b276'::uuid, -- ID de PickingUp
        NEW.id,
        COALESCE(NEW.estado, '1 - Cliente relevado'),
        'sin comunicacion nueva',
        COALESCE(NEW.creado_por, 'Sistema'),
        'Visita Presencial',
        COALESCE(NEW.creado_por, 'Sistema'),
        true,
        COALESCE(NEW.created_at, NOW()),
        COALESCE(NEW.updated_at, NOW())
    )
    ON CONFLICT (empresa_id, cliente_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_insert_ec_legacy ON clientes;

CREATE TRIGGER tr_auto_insert_ec_legacy
AFTER INSERT ON clientes
FOR EACH ROW
EXECUTE FUNCTION auto_insert_empresa_cliente();
