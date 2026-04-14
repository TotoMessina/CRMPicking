-- ============================================================
-- DIAGNÓSTICO: ¿Qué triggers existen en empresa_cliente y clientes?
-- Ejecutar en SQL Editor de Supabase
-- ============================================================

-- Ver todos los triggers activos en empresa_cliente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'empresa_cliente'
ORDER BY trigger_name;

-- Ver todos los triggers activos en clientes
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'clientes'
ORDER BY trigger_name;

-- Ver el código de la función auto_insert_empresa_cliente (sospechosa)
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
      'auto_insert_empresa_cliente',
      'update_updated_at_column',
      'set_updated_at',
      'process_audit_log'
  );
