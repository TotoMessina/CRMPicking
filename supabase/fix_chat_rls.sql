-- Soluciona el problema de visibilidad de usuarios para no-superadmins en el Chat
-- Al usar SECURITY DEFINER, permite que los usuarios vean a sus compañeros de la misma empresa sin romper el RLS general de las tablas.

CREATE OR REPLACE FUNCTION get_chat_users(empresa_id_param UUID)
RETURNS TABLE (
    email TEXT,
    nombre TEXT,
    role TEXT,
    avatar_url TEXT,
    avatar_emoji TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT u.email, u.nombre, u.role, u.avatar_url, u.avatar_emoji
    FROM empresa_usuario eu
    JOIN usuarios u ON u.email = eu.usuario_email
    WHERE eu.empresa_id = empresa_id_param;
END;
$$;
