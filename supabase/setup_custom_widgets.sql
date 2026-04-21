-- ==========================================
-- WIDGETS PERSONALIZADOS POR EMPRESA
-- ==========================================
-- INSTRUCCIONES: Ejecutar en el SQL Editor de Supabase
--
-- SI LA TABLA YA EXISTE, EJECUTA ESTA LINEA PARA ACTUALIZARLA CON EL SOPORTE DE TAMAÑOS:
-- ALTER TABLE public.empresa_custom_widgets ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'full' CHECK (size IN ('full', 'half', 'third'));

CREATE TABLE IF NOT EXISTS public.empresa_custom_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    icon TEXT DEFAULT '📊',
    chart_type TEXT NOT NULL CHECK (chart_type IN ('kpi', 'bar', 'pie', 'list')),
    data_source TEXT NOT NULL CHECK (data_source IN ('empresa_cliente', 'repartidores', 'consumidores', 'actividades')),
    group_by TEXT,           -- campo por el que agrupar (para bar/pie/list)
    filter_field TEXT,       -- campo de filtro (opcional)
    filter_value TEXT,       -- valor del filtro (opcional)
    color TEXT DEFAULT '#6366f1',
    size TEXT DEFAULT 'full' CHECK (size IN ('full', 'half', 'third')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sort_order INT DEFAULT 0
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_custom_widget_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_custom_widget_updated_at ON public.empresa_custom_widgets;
CREATE TRIGGER trg_custom_widget_updated_at
    BEFORE UPDATE ON public.empresa_custom_widgets
    FOR EACH ROW EXECUTE FUNCTION update_custom_widget_timestamp();

-- RLS
ALTER TABLE public.empresa_custom_widgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_widgets_select" ON public.empresa_custom_widgets
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM empresa_usuario
            WHERE usuario_email = auth.email()
        )
    );

CREATE POLICY "custom_widgets_all" ON public.empresa_custom_widgets
    FOR ALL USING (
        empresa_id IN (
            SELECT empresa_id FROM empresa_usuario
            WHERE usuario_email = auth.email()
        )
    );

GRANT ALL ON public.empresa_custom_widgets TO authenticated;
