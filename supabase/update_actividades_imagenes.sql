-- 1. Agregar columna para la URL de la foto en actividades
ALTER TABLE public.actividades ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- 2. Crear el bucket en Storage para las fotos de actividades
-- Nota: Esto asume que el usuario tiene permisos para manejar el esquema de storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('actividades_fotos', 'actividades_fotos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de seguridad para el bucket de fotos
-- Permitir que cualquier usuario autenticado suba fotos
CREATE POLICY "Permitir subida de fotos a usuarios autenticados"
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'actividades_fotos');

-- Permitir que cualquier usuario autenticado vea las fotos
CREATE POLICY "Permitir ver fotos a usuarios autenticados"
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'actividades_fotos');

-- Permitir que el dueño borre su foto (opcional, basado en el owner que es el user_id de auth)
CREATE POLICY "Permitir borrar sus propias fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'actividades_fotos' AND owner = auth.uid());
