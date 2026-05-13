-- =============================================
-- 1. Crear el bucket 'logos' en Supabase Storage
-- =============================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 2. Habilitar políticas de Row Level Security (RLS)
-- =============================================

-- Habilitar la visualización pública (Cualquier usuario, incluso no autenticado, puede ver logos corporativos)
CREATE POLICY "Visualizacion Publica de Logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos' );

-- Permitir a usuarios autenticados subir logos
CREATE POLICY "Usuarios Autenticados pueden subir logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( 
  bucket_id = 'logos' 
);

-- Permitir a usuarios autenticados actualizar y borrar logos
CREATE POLICY "Usuarios Autenticados pueden modificar logos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'logos' );

CREATE POLICY "Usuarios Autenticados pueden borrar logos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'logos' );
