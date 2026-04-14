-- ============================================================
-- FIX: Corrección del trigger de sincronización inversa
-- Si el trigger audit_clientes_changes o alguno similar
-- está reescribiendo empresa_cliente.estado al actualizar clientes,
-- este script lo corrige.
-- 
-- INSTRUCCIONES: Ejecutar en SQL Editor de Supabase
-- ============================================================

-- 1. Verificar si hay triggers UPDATE en 'clientes' que toquen empresa_cliente
-- (Solo informativo - revisa el output manualmente)
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.action_timing,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_body
FROM information_schema.triggers t
JOIN pg_trigger pt ON pt.tgname = t.trigger_name
JOIN pg_proc p ON p.oid = pt.tgfoid
WHERE t.event_object_table = 'clientes'
  AND t.event_manipulation = 'UPDATE';

-- 2. FIX DIRECTO: Reemplazar la función auto_insert_empresa_cliente
-- para que SOLO actúe en INSERT y nunca sobreescriba datos existentes
CREATE OR REPLACE FUNCTION public.auto_insert_empresa_cliente()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Solo actúa en INSERT, nunca en UPDATE
    IF TG_OP = 'INSERT' THEN
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
            '302444cf-9e6b-4127-b018-6c0d1972b276'::uuid,
            NEW.id,
            COALESCE(NEW.estado::text, '1 - Cliente relevado'),
            'sin comunicacion nueva',
            COALESCE(NEW.creado_por, 'Sistema'),
            'Visita Presencial',
            COALESCE(NEW.creado_por, 'Sistema'),
            true,
            COALESCE(NEW.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (empresa_id, cliente_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Verificar que el trigger solo se ejecuta en INSERT (no UPDATE)
-- Este trigger DEBE ser AFTER INSERT ONLY para no causar el bug
DROP TRIGGER IF EXISTS tr_auto_insert_ec_legacy ON public.clientes;

CREATE TRIGGER tr_auto_insert_ec_legacy
    AFTER INSERT ON public.clientes
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_insert_empresa_cliente();

SELECT 'Trigger corregido exitosamente. El trigger de auto-insert ya no interferirá con updates.' AS resultado;
