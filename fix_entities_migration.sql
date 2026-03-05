-- Fix missing multi-company isolation for Consumers, Distributors and Providers

-- 1. Repartidores (Exists but missing column)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repartidores' AND column_name='empresa_id') THEN
        ALTER TABLE repartidores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    END IF;
END $$;

UPDATE repartidores SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE repartidores ALTER COLUMN empresa_id SET NOT NULL;

-- 2. Actividades Repartidores
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades_repartidores' AND column_name='empresa_id') THEN
        ALTER TABLE actividades_repartidores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    END IF;
END $$;

UPDATE actividades_repartidores SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' WHERE empresa_id IS NULL;
ALTER TABLE actividades_repartidores ALTER COLUMN empresa_id SET NOT NULL;

-- 3. Consumidores (Exists and empty, checking columns)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consumidores' AND column_name='empresa_id') THEN
        ALTER TABLE consumidores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    END IF;
END $$;

-- 4. Actividades Consumidores
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='actividades_consumidores' AND column_name='empresa_id') THEN
        ALTER TABLE actividades_consumidores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    END IF;
END $$;

-- 5. Proveedores
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proveedores' AND column_name='empresa_id') THEN
        ALTER TABLE proveedores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    END IF;
END $$;

-- 6. Eventos Proveedores
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_proveedores' AND column_name='empresa_id') THEN
        ALTER TABLE eventos_proveedores ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    END IF;
END $$;

-- 7. Eventos Historial
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='eventos_historial' AND column_name='empresa_id') THEN
        ALTER TABLE eventos_historial ADD COLUMN empresa_id UUID REFERENCES empresas(id);
    END IF;
END $$;
