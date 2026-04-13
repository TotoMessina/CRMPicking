CREATE TABLE IF NOT EXISTS public.crm_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    color_hex TEXT DEFAULT '#7C3AED'
);

-- Ensure uniqueness per company (or global if null)
ALTER TABLE public.crm_roles DROP CONSTRAINT IF EXISTS crm_roles_unique_nombre_empresa;
ALTER TABLE public.crm_roles ADD CONSTRAINT crm_roles_unique_nombre_empresa UNIQUE NULLS NOT DISTINCT (empresa_id, nombre);

-- Habilitar RLS
ALTER TABLE public.crm_roles ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Lectura de roles" ON public.crm_roles;
CREATE POLICY "Lectura de roles" ON public.crm_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insertar roles" ON public.crm_roles;
CREATE POLICY "Insertar roles" ON public.crm_roles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Actualizar roles" ON public.crm_roles;
CREATE POLICY "Actualizar roles" ON public.crm_roles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Eliminar roles" ON public.crm_roles;
CREATE POLICY "Eliminar roles" ON public.crm_roles FOR DELETE USING (true);

-- Insertar roles base como default (empresa_id = null)
INSERT INTO public.crm_roles (id, nombre, color_hex) VALUES 
('00000000-0000-0000-0000-000000000001', 'admin', '#ef4444'),
('00000000-0000-0000-0000-000000000002', 'supervisor', '#f59e0b'),
('00000000-0000-0000-0000-000000000003', 'activador', '#3b82f6'),
('00000000-0000-0000-0000-000000000004', 'empleado', '#10b981')
ON CONFLICT (empresa_id, nombre) DO NOTHING;
