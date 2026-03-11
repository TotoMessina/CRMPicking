-- Actualizar estados de repartidores
UPDATE repartidores
SET estado = 'Cuenta confirmada y repartiendo'
WHERE estado = 'Cuenta confirmada'
  AND empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276'; -- PickingUp
