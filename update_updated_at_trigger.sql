-- ============================================================
-- TRIGGER: update_empresa_cliente_updated_at
-- Asegura que el campo 'updated_at' cambie automáticamente
-- cada vez que se modifica una fila en 'empresa_cliente'.
-- ============================================================

-- 1. Crear la función de trigger (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Aplicar el trigger a la tabla empresa_cliente
DROP TRIGGER IF EXISTS tr_update_updated_at_empresa_cliente ON empresa_cliente;

CREATE TRIGGER tr_update_updated_at_empresa_cliente
BEFORE UPDATE ON empresa_cliente
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 3. Verificación: Listar triggers de la tabla
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'empresa_cliente';
