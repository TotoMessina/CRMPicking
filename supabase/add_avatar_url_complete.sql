-- Add avatar_url columns to all necessary tables
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.novedades ADD COLUMN IF NOT EXISTS creador_avatar_url TEXT;
ALTER TABLE public.novedades_comentarios ADD COLUMN IF NOT EXISTS usuario_avatar_url TEXT;
