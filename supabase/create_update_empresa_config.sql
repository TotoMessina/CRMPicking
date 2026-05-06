-- Ejecutar en el Editor SQL de Supabase
-- Esta función actúa como un bypass seguro de RLS para actualizar la configuración de una empresa.

CREATE OR REPLACE FUNCTION update_empresa_config(p_empresa_id UUID, p_config JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con privilegios elevados de creador para superar restricciones RLS
AS $$
BEGIN
    UPDATE empresas
    SET config = p_config
    WHERE id = p_empresa_id;
END;
$$;
