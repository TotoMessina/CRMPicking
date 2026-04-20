-- ============================================================
-- PickingUp CRM - CONFIGURACIÓN DE SITUACIONES DINÁMICAS
-- ============================================================

-- 1. Crear la tabla de situaciones
CREATE TABLE IF NOT EXISTS public.empresa_pipeline_situaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    orden INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    estados_visibles TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(empresa_id, label)
);

-- 2. Habilitar RLS
ALTER TABLE public.empresa_pipeline_situaciones ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Acceso
DROP POLICY IF EXISTS "Lectura situaciones" ON public.empresa_pipeline_situaciones;
CREATE POLICY "Lectura situaciones" ON public.empresa_pipeline_situaciones
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin gestiona situaciones" ON public.empresa_pipeline_situaciones;
CREATE POLICY "Admin gestiona situaciones" ON public.empresa_pipeline_situaciones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE usuarios.email = auth.jwt() ->> 'email' 
            AND usuarios.role = 'super-admin'
        )
        OR
        EXISTS (
            SELECT 1 FROM public.empresa_usuario 
            WHERE empresa_usuario.usuario_email = auth.jwt() ->> 'email' 
            AND empresa_usuario.empresa_id = public.empresa_pipeline_situaciones.empresa_id
            AND empresa_usuario.role = 'admin'
        )
    );

-- 4. Semilla inicial: Migrar situaciones estándar para todas las empresas actuales
-- Esto asegura que ninguna empresa se quede "en blanco" al activar esta feature.
DO $$
DECLARE
    r_emp RECORD;
BEGIN
    FOR r_emp IN SELECT id FROM public.empresas LOOP
        -- Sin comunicación nueva (Default)
        INSERT INTO public.empresa_pipeline_situaciones (empresa_id, label, color, orden, is_default)
        VALUES (r_emp.id, 'sin comunicacion nueva', '#94a3b8', 1, true)
        ON CONFLICT (empresa_id, label) DO NOTHING;

        -- En proceso
        INSERT INTO public.empresa_pipeline_situaciones (empresa_id, label, color, orden, is_default)
        VALUES (r_emp.id, 'en proceso', '#f59e0b', 2, false)
        ON CONFLICT (empresa_id, label) DO NOTHING;

        -- En funcionamiento
        INSERT INTO public.empresa_pipeline_situaciones (empresa_id, label, color, orden, is_default)
        VALUES (r_emp.id, 'en funcionamiento', '#10b981', 3, false)
        ON CONFLICT (empresa_id, label) DO NOTHING;
    END LOOP;
END $$;

COMMENT ON TABLE public.empresa_pipeline_situaciones IS 'Almacena las sub-etapas o situaciones configurables por empresa para el pipeline.';
