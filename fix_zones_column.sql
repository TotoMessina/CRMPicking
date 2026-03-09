-- Migración para arreglar la carga de Zonas en MapaClientes (Aislamiento de Zonas)

-- 1. Añadimos la columna empresa_id a la tabla zones
ALTER TABLE public.zones
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- Opcional (Recomendado): Forzar a que las futuras zonas siempre tengan una empresa
-- ALTER TABLE public.zones ALTER COLUMN empresa_id SET NOT NULL;

-- 2. Actualizamos las políticas RLS (Row Level Security)
DROP POLICY IF EXISTS "Aislamiento de empresa para zonas" ON public.zones;
CREATE POLICY "Aislamiento de empresa para zonas" ON public.zones
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

-- Aseguramos que RLS está activo
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
