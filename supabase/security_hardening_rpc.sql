-- 1. Asegurar PRIVILEGIOS en update_usuario_empresa_admin
CREATE OR REPLACE FUNCTION update_usuario_empresa_admin(
    p_empresa_id UUID,
    p_target_email TEXT,
    p_target_id UUID,
    p_new_role TEXT,
    p_new_activo BOOLEAN,
    p_new_emoji TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_executor_role TEXT;
BEGIN
    -- VALIDACIÓN: ¿Quién está ejecutando esto?
    -- Buscamos el rol del usuario autenticado (vía JWT) en la empresa objetivo
    SELECT eu.role INTO v_executor_role
    FROM public.empresa_usuario eu
    WHERE eu.empresa_id = p_empresa_id
      AND eu.usuario_email = auth.jwt()->>'email';

    -- Solo permitimos si el executor es 'admin' o si es el super-admin definido en usuarios
    IF v_executor_role <> 'admin' AND (SELECT u.role FROM public.usuarios u WHERE u.email = auth.jwt()->>'email') <> 'super-admin' THEN
        RAISE EXCEPTION 'No tenés permisos de administrador en esta empresa para realizar esta acción.';
    END IF;

    -- 1. Actualizar Rol en la empresa
    UPDATE public.empresa_usuario
    SET role = p_new_role
    WHERE empresa_id = p_empresa_id
      AND usuario_email = p_target_email;

    -- 2. Actualizar Estado global y Emoji cosmético
    UPDATE public.usuarios
    SET activo = p_new_activo,
        avatar_emoji = p_new_emoji
    WHERE id = p_target_id;
END;
$$;

-- 2. Asegurar PRIVILEGIOS en get_chat_users (Prevenir fuga de datos multi-tenant)
-- Se renombran las columnas de salida para evitar ambigüedad con las columnas de las tablas base
CREATE OR REPLACE FUNCTION get_chat_users(empresa_id_param UUID)
RETURNS TABLE (
    user_email TEXT,
    user_nombre TEXT,
    user_role TEXT,
    user_avatar_url TEXT,
    user_avatar_emoji TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- VALIDACIÓN: El usuario solo puede listar gente de su propia empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.empresa_usuario eu
        WHERE eu.empresa_id = empresa_id_param
          AND eu.usuario_email = auth.jwt()->>'email'
    ) AND (SELECT u.role FROM public.usuarios u WHERE u.email = auth.jwt()->>'email') <> 'super-admin' THEN
        RAISE EXCEPTION 'Acceso denegado: No pertenecés a esta organización.';
    END IF;

    RETURN QUERY
    SELECT u.email, u.nombre, u.role, u.avatar_url, u.avatar_emoji
    FROM public.empresa_usuario eu
    JOIN public.usuarios u ON u.email = eu.usuario_email
    WHERE eu.empresa_id = empresa_id_param;
END;
$$;
