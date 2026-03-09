-- Migración para arreglar la fuga de datos en Calendario (Aislamiento de Eventos)

-- 1. Añadimos la columna empresa_id a la tabla eventos
ALTER TABLE public.eventos
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- Opcional: Si queremos forzar que todo nuevo evento deba tener una empresa (recomendado para seguridad),
-- descomentar la siguiente línea DESPUÉS de haber asignado las empresas a los eventos viejos:
-- ALTER TABLE public.eventos ALTER COLUMN empresa_id SET NOT NULL;

-- 2. Aseguramos que las políticas RLS (Row Level Security) estén protegiendo la tabla basándose en esta nueva columna.
-- (Asumiendo que tenés una política similar a las de otras tablas).
-- Si ya tenés RLS habilitado, esta política asegurará que solo se vean los eventos de la empresa activa.
DROP POLICY IF EXISTS "Aislamiento de empresa para eventos" ON public.eventos;
CREATE POLICY "Aislamiento de empresa para eventos" ON public.eventos
    AS PERMISSIVE FOR ALL
    TO authenticated
    USING (
        empresa_id IN (
            SELECT eu.empresa_id 
            FROM public.empresa_usuario eu 
            WHERE eu.usuario_email = auth.jwt() ->> 'email'
        )
    )
    WITH CHECK (
        empresa_id IN (
            SELECT eu.empresa_id 
            FROM public.empresa_usuario eu 
            WHERE eu.usuario_email = auth.jwt() ->> 'email'
        )
    );

-- Aseguramos que RLS está activo en la tabla
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
