-- ========================================================================================
-- NOVEDADES / CORPORATE FEED SCHEMA
-- ========================================================================================

-- 1. NOVEDADES TABLE
CREATE TABLE IF NOT EXISTS public.novedades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    creador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creador_nombre TEXT,
    creador_avatar TEXT,
    tipo VARCHAR(50) NOT NULL DEFAULT 'post',
    titulo TEXT,
    contenido TEXT,
    media_urls JSONB DEFAULT '[]'::jsonb,
    roles_permitidos JSONB DEFAULT '[]'::jsonb,
    fijado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_novedades_empresa_created ON public.novedades(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_novedades_tipo ON public.novedades(tipo);

-- 2. LIKES TABLE
CREATE TABLE IF NOT EXISTS public.novedades_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novedad_id UUID NOT NULL REFERENCES public.novedades(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(novedad_id, usuario_id)
);

-- 3. COMENTARIOS TABLE
CREATE TABLE IF NOT EXISTS public.novedades_comentarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novedad_id UUID NOT NULL REFERENCES public.novedades(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usuario_nombre TEXT,
    usuario_avatar TEXT,
    comentario TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. VISTAS (VIEWS) TABLE
CREATE TABLE IF NOT EXISTS public.novedades_vistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novedad_id UUID NOT NULL REFERENCES public.novedades(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(novedad_id, usuario_id)
);

-- ENABLE RLS
ALTER TABLE public.novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novedades_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novedades_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novedades_vistas ENABLE ROW LEVEL SECURITY;

-- ========================================================================================
-- RLS POLICIES (Idempotent)
-- ========================================================================================

-- Novedades
DROP POLICY IF EXISTS "Users can read novedades from their empresa" ON public.novedades;
CREATE POLICY "Users can read novedades from their empresa" ON public.novedades
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create novedades" ON public.novedades;
CREATE POLICY "Users can create novedades" ON public.novedades
    FOR INSERT WITH CHECK (auth.uid() = creador_id);

DROP POLICY IF EXISTS "Users can update their own novedades" ON public.novedades;
CREATE POLICY "Users can update their own novedades" ON public.novedades
    FOR UPDATE USING (auth.uid() = creador_id);

DROP POLICY IF EXISTS "Users can delete their own novedades" ON public.novedades;
CREATE POLICY "Users can delete their own novedades" ON public.novedades
    FOR DELETE USING (auth.uid() = creador_id);

-- Likes
DROP POLICY IF EXISTS "Users can read likes" ON public.novedades_likes;
CREATE POLICY "Users can read likes" ON public.novedades_likes
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can toggle their own likes" ON public.novedades_likes;
CREATE POLICY "Users can toggle their own likes" ON public.novedades_likes
    FOR ALL USING (auth.uid() = usuario_id);

-- Comentarios
DROP POLICY IF EXISTS "Users can read comentarios" ON public.novedades_comentarios;
CREATE POLICY "Users can read comentarios" ON public.novedades_comentarios
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can create comentarios" ON public.novedades_comentarios;
CREATE POLICY "Users can create comentarios" ON public.novedades_comentarios
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can delete their own comentarios" ON public.novedades_comentarios;
CREATE POLICY "Users can delete their own comentarios" ON public.novedades_comentarios
    FOR DELETE USING (auth.uid() = usuario_id);

-- Vistas
DROP POLICY IF EXISTS "Users can read vistas" ON public.novedades_vistas;
CREATE POLICY "Users can read vistas" ON public.novedades_vistas
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can log their own views" ON public.novedades_vistas;
CREATE POLICY "Users can log their own views" ON public.novedades_vistas
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- ========================================================================================
-- STORAGE BUCKET FOR MEDIA
-- ========================================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('novedades_media', 'novedades_media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'novedades_media' );

DROP POLICY IF EXISTS "Auth Users Upload" ON storage.objects;
CREATE POLICY "Auth Users Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'novedades_media' AND auth.uid() IS NOT NULL );

DROP POLICY IF EXISTS "Auth Users Update/Delete" ON storage.objects;
CREATE POLICY "Auth Users Update/Delete"
ON storage.objects FOR ALL
USING ( bucket_id = 'novedades_media' AND auth.uid() = owner );

-- Patches
ALTER TABLE public.novedades_comentarios ADD COLUMN IF NOT EXISTS usuario_nombre TEXT;
ALTER TABLE public.novedades_comentarios ADD COLUMN IF NOT EXISTS usuario_avatar TEXT;

-- Patches for social v2 (reactions)
ALTER TABLE public.novedades_likes ADD COLUMN IF NOT EXISTS reaccion TEXT DEFAULT '❤️';

-- ========================================================================================
-- ENCUESTAS SCHEMA
-- ========================================================================================
ALTER TABLE public.novedades ADD COLUMN IF NOT EXISTS encuesta JSONB DEFAULT NULL;

CREATE TABLE IF NOT EXISTS public.novedades_votos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    novedad_id UUID NOT NULL REFERENCES public.novedades(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    opcion_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(novedad_id, usuario_id) -- Un usuario solo puede votar una vez por encuesta
);

ALTER TABLE public.novedades_votos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read votos" ON public.novedades_votos;
CREATE POLICY "Users can read votos" ON public.novedades_votos
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can vote once" ON public.novedades_votos;
CREATE POLICY "Users can vote once" ON public.novedades_votos
    FOR INSERT WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can update their vote" ON public.novedades_votos;
CREATE POLICY "Users can update their vote" ON public.novedades_votos
    FOR UPDATE USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Users can delete their vote" ON public.novedades_votos;
CREATE POLICY "Users can delete their vote" ON public.novedades_votos
    FOR DELETE USING (auth.uid() = usuario_id);

-- ========================================================================================
-- SOCIAL V3 PATCH - REACCIONES EN COMENTARIOS
-- ========================================================================================
ALTER TABLE public.novedades_comentarios ADD COLUMN IF NOT EXISTS reacciones JSONB DEFAULT '[]'::jsonb;

