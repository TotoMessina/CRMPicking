-- 1. Añadir columna activo a empresa_usuario
ALTER TABLE empresa_usuario ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 2. Crear tabla de logs de seguridad
CREATE TABLE IF NOT EXISTS security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    usuario_email TEXT NOT NULL,
    empresa_id UUID REFERENCES empresas(id),
    accion TEXT NOT NULL, -- 'export_excel', 'export_pdf', 'bulk_view', 'suspicious_activity'
    detalles JSONB,
    nivel_riesgo TEXT DEFAULT 'bajo', -- 'bajo', 'medio', 'alto'
    ip_address TEXT,
    user_agent TEXT
);

-- 3. Habilitar RLS para security_logs (solo inserción por usuarios autenticados)
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden insertar sus propios logs" ON security_logs
    FOR INSERT WITH CHECK (auth.email() = usuario_email);

CREATE POLICY "Super admins pueden ver todos los logs" ON security_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM usuarios 
            WHERE email = auth.email() AND role = 'super-admin'
        )
    );

-- 4. Asegurar que empresa_usuario tenga habilitado Realtime
-- (Esto se suele configurar en el dashboard de Supabase, pero lo mencionamos aquí)
-- ALTER PUBLICATION supabase_realtime ADD TABLE empresa_usuario;
