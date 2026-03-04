-- Final multi-company migration for remaining entities

-- 1. Consumidores
ALTER TABLE consumidores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
UPDATE consumidores SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE consumidores ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE actividades_consumidores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
UPDATE actividades_consumidores SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE actividades_consumidores ALTER COLUMN empresa_id SET NOT NULL;

-- 2. Repartidores
ALTER TABLE repartidores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
UPDATE repartidores SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE repartidores ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE actividades_repartidores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
UPDATE actividades_repartidores SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE actividades_repartidores ALTER COLUMN empresa_id SET NOT NULL;

-- 3. Proveedores
ALTER TABLE proveedores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
UPDATE proveedores SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE proveedores ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE eventos_proveedores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
UPDATE eventos_proveedores SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE eventos_proveedores ALTER COLUMN empresa_id SET NOT NULL;

ALTER TABLE eventos_historial ADD COLUMN empresa_id UUID REFERENCES empresas(id);
UPDATE eventos_historial SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE eventos_historial ALTER COLUMN empresa_id SET NOT NULL;
