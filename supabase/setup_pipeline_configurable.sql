-- 1. Asegurar que la tabla existe
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

-- 2. Reforzar RLS con Políticas multinivel
ALTER TABLE empresa_pipeline_estados ENABLE ROW LEVEL SECURITY;

-- Lectura: Cualquiera autenticado puede leer (para que el pipeline funcione para todos)
DROP POLICY IF EXISTS "Lectura publica autenticada" ON empresa_pipeline_estados;
CREATE POLICY "Lectura publica autenticada" ON empresa_pipeline_estados
    FOR SELECT USING (auth.role() = 'authenticated');

-- Escritura: Solo Super-Admins o Admins de la Empresa específica
DROP POLICY IF EXISTS "Admins gestionan estados" ON empresa_pipeline_estados;
CREATE POLICY "Admins gestionan estados" ON empresa_pipeline_estados
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.email = auth.jwt() ->> 'email' 
            AND usuarios.role = 'super-admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM empresa_usuario 
            WHERE empresa_usuario.usuario_email = auth.jwt() ->> 'email' 
            AND empresa_usuario.empresa_id = empresa_pipeline_estados.empresa_id
            AND empresa_usuario.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE usuarios.email = auth.jwt() ->> 'email' 
            AND usuarios.role = 'super-admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM empresa_usuario 
            WHERE empresa_usuario.usuario_email = auth.jwt() ->> 'email' 
            AND empresa_usuario.empresa_id = empresa_pipeline_estados.empresa_id
            AND empresa_usuario.role = 'admin'
        )
    );
