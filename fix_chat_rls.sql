-- =========================================================================
-- Corrección de Visibilidad (RLS) para Chat Interno
-- =========================================================================

-- 1. Usuarios: Permitir ver perfiles de otros miembros de la misma empresa
-- Borramos la anterior que era muy restrictiva
DROP POLICY IF EXISTS "Ver perfil propio" ON public.usuarios;

CREATE POLICY "Ver miembros de mi empresa" ON public.usuarios
    FOR SELECT USING (
        email IN (
            SELECT eu.usuario_email 
            FROM public.empresa_usuario eu
            WHERE eu.empresa_id IN (
                SELECT sub_eu.empresa_id 
                FROM public.empresa_usuario sub_eu 
                WHERE sub_eu.usuario_email = auth.email()
            )
        )
    );

-- 2. Empresa_Usuario: Permitir ver quién más está en la empresa
-- Borramos la anterior que era muy restrictiva
DROP POLICY IF EXISTS "Ver mi empresa_usuario" ON public.empresa_usuario;

CREATE POLICY "Ver empresa_usuario de mi empresa" ON public.empresa_usuario
    FOR SELECT USING (
        empresa_id IN (
            SELECT eu.empresa_id 
            FROM public.empresa_usuario eu
            WHERE eu.usuario_email = auth.email()
        )
    );

-- 3. Mensajes Chat: Asegurar que el remitente y receptor puedan ver los mensajes
-- (Esto ya debería estar bien, pero lo reforzamos con empresa_id)
DROP POLICY IF EXISTS "Acceso a mensajes de chat" ON public.mensajes_chat;
CREATE POLICY "Acceso a mensajes de mi empresa" ON public.mensajes_chat
    FOR ALL USING (
        empresa_id IN (
            SELECT eu.empresa_id 
            FROM public.empresa_usuario eu
            WHERE eu.usuario_email = auth.email()
        )
    );
