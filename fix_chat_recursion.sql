-- =========================================================================
-- Solución para Error 500 (Recursión Infinita en RLS)
-- =========================================================================

-- 1. Crear una función auxiliar con SECURITY DEFINER
-- Esto evita la recursión infinita porque la función corre con permisos de sistema,
-- sin disparar las políticas de RLS de la tabla empresa_usuario.
CREATE OR REPLACE FUNCTION public.get_mis_empresas() 
RETURNS TABLE (emp_id UUID) AS $$
BEGIN
    RETURN QUERY 
    SELECT empresa_id 
    FROM public.empresa_usuario 
    WHERE usuario_email = (SELECT auth.jwt() ->> 'email');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Limpiar políticas que causan recursión
DROP POLICY IF EXISTS "Ver miembros de mi empresa" ON public.usuarios;
DROP POLICY IF EXISTS "Ver empresa_usuario de mi empresa" ON public.empresa_usuario;
DROP POLICY IF EXISTS "Ver mi empresa_usuario" ON public.empresa_usuario;
DROP POLICY IF EXISTS "Acceso a mensajes de mi empresa" ON public.mensajes_chat;

-- 3. Aplicar políticas nuevas usando la función (SIN RECURSIÓN)

-- Usuarios: Ver perfiles si comparten alguna empresa conmigo
CREATE POLICY "Ver miembros de mi empresa" ON public.usuarios
    FOR SELECT USING (
        email IN (
            SELECT usuario_email 
            FROM public.empresa_usuario 
            WHERE empresa_id IN (SELECT emp_id FROM public.get_mis_empresas())
        )
    );

-- Empresa_Usuario: Ver registros de mi misma empresa
CREATE POLICY "Ver empresa_usuario de mi empresa" ON public.empresa_usuario
    FOR SELECT USING (
        empresa_id IN (SELECT emp_id FROM public.get_mis_empresas())
    );

-- Mensajes Chat: Ver mensajes de mi misma empresa
CREATE POLICY "Acceso a mensajes de mi empresa" ON public.mensajes_chat
    FOR ALL USING (
        empresa_id IN (SELECT emp_id FROM public.get_mis_empresas())
    );

-- 4. Asegurar que el usuario pueda ver su propio perfil siempre
-- (Esto refuerza si no tiene empresa asignada aún)
DROP POLICY IF EXISTS "Ver perfil propio" ON public.usuarios;
CREATE POLICY "Ver perfil propio" ON public.usuarios
    FOR SELECT USING (email = (SELECT auth.jwt() ->> 'email'));
