-- ==========================================
-- DASHBOARD PERSONALIZABLE POR EMPRESA
-- ==========================================
-- INSTRUCCIONES: Ejecuta este bloque en el Editor SQL de Supabase

-- Tabla para guardar el layout personalizado de cada empresa
CREATE TABLE IF NOT EXISTS public.empresa_dashboard_layout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    layout JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id)
);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_dashboard_layout_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dashboard_layout_updated_at ON public.empresa_dashboard_layout;
CREATE TRIGGER trg_dashboard_layout_updated_at
    BEFORE UPDATE ON public.empresa_dashboard_layout
    FOR EACH ROW EXECUTE FUNCTION update_dashboard_layout_timestamp();

-- Seguridad: Solo usuarios autenticados con acceso a su empresa
ALTER TABLE public.empresa_dashboard_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresa_layout_select" ON public.empresa_dashboard_layout
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM empresa_usuario
            WHERE usuario_email = auth.email()
        )
    );

CREATE POLICY "empresa_layout_upsert" ON public.empresa_dashboard_layout
    FOR ALL USING (
        empresa_id IN (
            SELECT empresa_id FROM empresa_usuario
            WHERE usuario_email = auth.email()
        )
    );

-- Permisos
GRANT ALL ON public.empresa_dashboard_layout TO authenticated;
