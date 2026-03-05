-- ============================================================
-- PERMISOS DE EMPRESA: Tabla de configuración de páginas por empresa
-- ============================================================

CREATE TABLE IF NOT EXISTS empresa_permisos_pagina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    pagina TEXT NOT NULL,
    habilitada BOOLEAN DEFAULT false,
    roles_permitidos TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, pagina)
);

-- RLS
ALTER TABLE empresa_permisos_pagina ENABLE ROW LEVEL SECURITY;

-- Super-admin ve todo; usuarios normales solo ven su empresa
CREATE POLICY "Ver permisos de mi empresa" ON empresa_permisos_pagina
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM empresa_usuario WHERE usuario_email = auth.email()
        )
    );

CREATE POLICY "Super-admin gestiona permisos" ON empresa_permisos_pagina
    FOR ALL USING (true)
    WITH CHECK (true);
