-- ============================================================
-- SCRIPT: fix_orphaned_clientes.sql
-- Este script toma cualquier cliente que exista en la tabla
-- maestra 'clientes' pero que NO esté en 'empresa_cliente',
-- y lo inserta en 'empresa_cliente' asignándolo a PickingUp.
-- ============================================================

INSERT INTO empresa_cliente (
    empresa_id,
    cliente_id,
    estado,
    rubro,
    situacion,
    responsable,
    notas,
    tipo_contacto,
    creado_por,
    activo,
    created_at,
    updated_at
)
SELECT 
    '302444cf-9e6b-4127-b018-6c0d1972b276'::uuid AS empresa_id, -- ID de PickingUp
    c.id,
    COALESCE(c.estado, '1 - Cliente relevado') AS estado,
    c.rubro,
    COALESCE(c.situacion, 'sin comunicacion nueva') AS situacion,
    c.creado_por AS responsable,
    c.notas,
    c.tipo_contacto,
    c.creado_por,
    true AS activo,
    COALESCE(c.created_at, NOW()) AS created_at,
    COALESCE(c.updated_at, NOW()) AS updated_at
FROM clientes c
LEFT JOIN empresa_cliente ec ON c.id = ec.cliente_id
WHERE ec.cliente_id IS NULL;
