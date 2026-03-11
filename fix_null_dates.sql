-- ============================================================
-- SCRIPT: fix_all_null_dates.sql
-- Ejecutar para reparar cualquier cliente desde el 6 de marzo 
-- que haya quedado con created_at o updated_at en NULO.
-- ============================================================

-- 1. Si la tabla maestra 'clientes' tiene created_at nulo, le ponemos un fallback
UPDATE clientes
SET created_at = NOW()
WHERE created_at IS NULL;

UPDATE clientes
SET updated_at = created_at
WHERE updated_at IS NULL;

-- 2. Reparar 'empresa_cliente'. Si created_at es nulo, usamos el de la tabla 'clientes'
UPDATE empresa_cliente ec
SET created_at = c.created_at
FROM clientes c
WHERE ec.cliente_id = c.id
  AND ec.created_at IS NULL;

-- 3. Si por algún motivo updated_at quedó nulo, lo igualamos a created_at
UPDATE empresa_cliente
SET updated_at = created_at
WHERE updated_at IS NULL;
