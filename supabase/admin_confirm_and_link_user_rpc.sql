-- ==============================================================================
-- RPC: admin_confirm_and_link_user
-- Confirma instantáneamente el email de un usuario creado y lo asocia a la empresa.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.admin_confirm_and_link_user(
  p_email TEXT,
  p_empresa_id UUID,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con privilegios elevados
SET search_path = public, auth
AS $$
DECLARE
  v_executor_role TEXT;
  v_executor_global_role TEXT;
BEGIN
  -- 1. VALIDACIÓN DE PERMISOS (Solo admin o super-admin)
  SELECT eu.role INTO v_executor_role
  FROM public.empresa_usuario eu
  WHERE eu.empresa_id = p_empresa_id
    AND eu.usuario_email = auth.jwt()->>'email';

  SELECT u.role INTO v_executor_global_role
  FROM public.usuarios u
  WHERE u.email = auth.jwt()->>'email';

  IF COALESCE(v_executor_role, '') <> 'admin' AND COALESCE(v_executor_global_role, '') <> 'super-admin' THEN
      RAISE EXCEPTION 'No tenés permisos administrativos para vincular usuarios en esta empresa.';
  END IF;

  -- 2. CONFIRMAR EMAIL EN AUTH.USERS
  -- Esto le permite al usuario ingresar sin tener que abrir correos de confirmación.
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
      confirmed_at = COALESCE(confirmed_at, now()),
      updated_at = now()
  WHERE email = p_email;

  -- 3. VINCULAR A LA EMPRESA
  INSERT INTO public.empresa_usuario (empresa_id, usuario_email, role)
  VALUES (p_empresa_id, p_email, COALESCE(p_role, 'empleado'))
  ON CONFLICT (empresa_id, usuario_email) 
  DO UPDATE SET role = EXCLUDED.role;

END;
$$;
