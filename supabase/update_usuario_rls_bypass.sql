-- RPC para forzar actualización de parámetros de empleados (By-pass RLS)
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
BEGIN
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
