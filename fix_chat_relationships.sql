-- =========================================================================
-- Corrección de Relaciones para Chat y Multi-Empresa
-- =========================================================================

-- 1. Asegurar que empresa_usuario tenga una relación formal con la tabla usuarios
-- Esto es necesario para que PostgREST pueda hacer el JOIN que pide el Chat
ALTER TABLE public.empresa_usuario 
    ADD CONSTRAINT fk_empresa_usuario_usuarios 
    FOREIGN KEY (usuario_email) 
    REFERENCES public.usuarios(email)
    ON DELETE CASCADE;

-- 2. Asegurar que mensajes_chat tenga relaciones con la tabla usuarios
-- (Relación para el emisor)
ALTER TABLE public.mensajes_chat 
    ADD CONSTRAINT fk_mensajes_chat_de_usuario 
    FOREIGN KEY (de_usuario) 
    REFERENCES public.usuarios(email)
    ON DELETE CASCADE;

-- (Relación para el receptor)
ALTER TABLE public.mensajes_chat 
    ADD CONSTRAINT fk_mensajes_chat_para_usuario 
    FOREIGN KEY (para_usuario) 
    REFERENCES public.usuarios(email)
    ON DELETE CASCADE;

-- NOTA: Si estas constraints ya existen, el SQL Editor de Supabase te lo avisará.
-- En ese caso, la base de datos ya está bien y el problema podría ser de caché del esquema.
