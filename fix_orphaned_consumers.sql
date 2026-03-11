-- ============================================================
-- SCRIPT: fix_orphaned_consumers.sql
-- Vincula consumidores y sus actividades a la empresa PickingUp
-- ============================================================

DO $$ 
DECLARE 
    v_empresa_id UUID := '302444cf-9e6b-4127-b018-6c0d1972b276'; -- ID de PickingUp
BEGIN
    -- 1. Actualizar consumidores que no tienen empresa_id
    UPDATE consumidores
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;
    
    RAISE NOTICE 'Consumidores vinculados a PickingUp.';

    -- 2. Actualizar actividades de consumidores que no tienen empresa_id
    -- (Asumiendo que la tabla existe y tiene el campo)
    UPDATE actividades_consumidores
    SET empresa_id = v_empresa_id
    WHERE empresa_id IS NULL;

    RAISE NOTICE 'Actividades de consumidores vinculadas a PickingUp.';
    
END $$;
