-- 1. Crear la tabla de Sprints
CREATE TABLE IF NOT EXISTS public.proveedor_sprints (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
    nombre text NOT NULL,
    orden integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.proveedor_sprints ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS (basadas en el patrón del proyecto: empresa_usuario)
DROP POLICY IF EXISTS "Permitir lectura de sprints por empresa" ON public.proveedor_sprints;
CREATE POLICY "Permitir lectura de sprints por empresa" ON public.proveedor_sprints
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.empresa_usuario
            WHERE usuario_email = auth.jwt()->>'email'
        )
    );

DROP POLICY IF EXISTS "Permitir inserción de sprints por empresa" ON public.proveedor_sprints;
CREATE POLICY "Permitir inserción de sprints por empresa" ON public.proveedor_sprints
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.empresa_usuario
            WHERE usuario_email = auth.jwt()->>'email'
        )
    );

DROP POLICY IF EXISTS "Permitir actualización de sprints por empresa" ON public.proveedor_sprints;
CREATE POLICY "Permitir actualización de sprints por empresa" ON public.proveedor_sprints
    FOR UPDATE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.empresa_usuario
            WHERE usuario_email = auth.jwt()->>'email'
        )
    );

DROP POLICY IF EXISTS "Permitir borrado de sprints por empresa" ON public.proveedor_sprints;
CREATE POLICY "Permitir borrado de sprints por empresa" ON public.proveedor_sprints
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.empresa_usuario
            WHERE usuario_email = auth.jwt()->>'email'
        )
    );

-- 2. Añadir columna sprint_id a eventos_proveedores
ALTER TABLE public.eventos_proveedores 
ADD COLUMN IF NOT EXISTS sprint_id uuid REFERENCES public.proveedor_sprints(id) ON DELETE SET NULL;

-- 3. Migración de datos existentes
DO $$
DECLARE
    rec RECORD;
    new_sprint_id uuid;
BEGIN
    -- Para cada sección única en eventos_proveedores que no esté en blanco
    FOR rec IN (
        SELECT DISTINCT seccion, empresa_id 
        FROM public.eventos_proveedores 
        WHERE seccion IS NOT NULL AND seccion <> ''
    ) LOOP
        -- Crear el sprint si no existe uno con ese nombre para esa empresa
        INSERT INTO public.proveedor_sprints (empresa_id, nombre, orden)
        VALUES (rec.empresa_id, rec.seccion, 0)
        ON CONFLICT DO NOTHING
        RETURNING id INTO new_sprint_id;
        
        -- Si no se insertó porque ya existía, buscarlo
        IF new_sprint_id IS NULL THEN
            SELECT id INTO new_sprint_id 
            FROM public.proveedor_sprints 
            WHERE empresa_id = rec.empresa_id AND nombre = rec.seccion;
        END IF;

        -- Actualizar los eventos que tenían ese nombre
        UPDATE public.eventos_proveedores
        SET sprint_id = new_sprint_id
        WHERE empresa_id = rec.empresa_id AND seccion = rec.seccion;
    END LOOP;
END $$;
