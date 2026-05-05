-- ==========================================
-- MARKETING MATERIAL & INVENTORY SCHEMA
-- ==========================================

-- 1. Tabla de Materiales
CREATE TABLE IF NOT EXISTS public.marketing_material (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre          TEXT NOT NULL,
    descripcion     TEXT,
    stock_actual    INT DEFAULT 0,
    stock_minimo    INT DEFAULT 10,
    icon            TEXT DEFAULT 'Package', -- Lucide icon name
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Entregas (Logs)
CREATE TABLE IF NOT EXISTS public.material_entrega (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    cliente_id      BIGINT REFERENCES public.clientes(id) ON DELETE SET NULL,
    actividad_id    BIGINT REFERENCES public.actividades(id) ON DELETE CASCADE,
    material_id     UUID NOT NULL REFERENCES public.marketing_material(id) ON DELETE CASCADE,
    cantidad        INT NOT NULL DEFAULT 1,
    usuario_email   TEXT NOT NULL,
    fecha           TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.marketing_material ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketing_material_all" ON public.marketing_material
    FOR ALL USING (empresa_id IN (SELECT empresa_id FROM public.empresa_usuario WHERE usuario_email = auth.jwt()->>'email'));

CREATE POLICY "material_entrega_all" ON public.material_entrega
    FOR ALL USING (empresa_id IN (SELECT empresa_id FROM public.empresa_usuario WHERE usuario_email = auth.jwt()->>'email'));

-- Trigger para descontar stock
CREATE OR REPLACE FUNCTION public.fn_descontar_stock_marketing()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.marketing_material
    SET stock_actual = stock_actual - NEW.cantidad,
        updated_at = now()
    WHERE id = NEW.material_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_descontar_stock_marketing
AFTER INSERT ON public.material_entrega
FOR EACH ROW EXECUTE FUNCTION public.fn_descontar_stock_marketing();

-- Indices
CREATE INDEX IF NOT EXISTS idx_material_empresa ON public.marketing_material(empresa_id);
CREATE INDEX IF NOT EXISTS idx_entrega_cliente ON public.material_entrega(cliente_id);
CREATE INDEX IF NOT EXISTS idx_entrega_fecha ON public.material_entrega(fecha);
