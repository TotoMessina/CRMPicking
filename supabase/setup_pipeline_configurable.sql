-- 1. Crear la tabla de estados si no existe
CREATE TABLE IF NOT EXISTS empresa_pipeline_estados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    orden INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, label)
);

-- 2. Limpiar inicializaciones anteriores erróneas (solo si existen)
DELETE FROM empresa_pipeline_estados WHERE label NOT LIKE '% - %' AND label NOT IN (SELECT label FROM empresa_pipeline_estados WHERE label LIKE '% - %');

-- 3. Inicializar con los textos EXACTOS que ya existen en tu base de datos
INSERT INTO empresa_pipeline_estados (empresa_id, label, color, orden, is_default)
SELECT id, '1 - Cliente relevado', '#64748b', 1, true FROM empresas
ON CONFLICT DO NOTHING;

INSERT INTO empresa_pipeline_estados (empresa_id, label, color, orden, is_default)
SELECT id, '2 - Local Visitado No Activo', '#ef4444', 2, false FROM empresas
ON CONFLICT DO NOTHING;

INSERT INTO empresa_pipeline_estados (empresa_id, label, color, orden, is_default)
SELECT id, '3 - Primer Ingreso', '#f59e0b', 3, false FROM empresas
ON CONFLICT DO NOTHING;

INSERT INTO empresa_pipeline_estados (empresa_id, label, color, orden, is_default)
SELECT id, '4 - Local Creado', '#8b5cf6', 4, false FROM empresas
ON CONFLICT DO NOTHING;

INSERT INTO empresa_pipeline_estados (empresa_id, label, color, orden, is_default)
SELECT id, '5 - Local Visitado Activo', '#10b981', 5, false FROM empresas
ON CONFLICT DO NOTHING;

INSERT INTO empresa_pipeline_estados (empresa_id, label, color, orden, is_default)
SELECT id, '6 - Local No Interesado', '#ef4444', 6, false FROM empresas
ON CONFLICT DO NOTHING;

-- 4. Habilitar RLS y Políticas (asegurar que existan)
ALTER TABLE empresa_pipeline_estados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresas ven sus propios estados" ON empresa_pipeline_estados;
CREATE POLICY "Empresas ven sus propios estados" ON empresa_pipeline_estados FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins gestionan estados" ON empresa_pipeline_estados;
CREATE POLICY "Admins gestionan estados" ON empresa_pipeline_estados FOR ALL USING (
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuarios.email = auth.jwt() ->> 'email' 
        AND (usuarios.role = 'super-admin' OR usuarios.role = 'admin')
    )
);
