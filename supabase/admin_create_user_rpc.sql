-- ==============================================================================
-- RPC: admin_create_user (VERSIÓN MAESTRA INVENCIBLE)
-- Crea usuarios en auth.users y auth.identities de forma segura y dinámica.
-- Ventaja: 100% Inmune a límites de tasa de API (Error 429), ideal para Excel masivo.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_role TEXT,
  p_empresa_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con altos privilegios
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id UUID;
  v_executor_role TEXT;
  v_executor_global_role TEXT;
  v_sql TEXT;
  v_cols TEXT[];
  v_has_col BOOLEAN;
BEGIN
  -- 1. VALIDACIÓN DE PERMISOS
  SELECT eu.role INTO v_executor_role 
  FROM public.empresa_usuario eu 
  WHERE eu.empresa_id = p_empresa_id 
    AND eu.usuario_email = auth.jwt()->>'email';

  SELECT u.role INTO v_executor_global_role 
  FROM public.usuarios u 
  WHERE u.email = auth.jwt()->>'email';

  IF COALESCE(v_executor_role, '') <> 'admin' AND COALESCE(v_executor_global_role, '') <> 'super-admin' THEN
      RAISE EXCEPTION 'No tenés permisos administrativos para esta acción.';
  END IF;

  -- 2. VERIFICAR SI EL USUARIO YA EXISTE EN AUTH.USERS
  SELECT id INTO new_user_id FROM auth.users WHERE email = p_email;

  -- Si el usuario ya existe pero no está confirmado, forzamos su confirmación ahora
  IF new_user_id IS NOT NULL THEN
      UPDATE auth.users
      SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now(),
          raw_app_meta_data = raw_app_meta_data || '{"email_verified": true}'::jsonb
      WHERE id = new_user_id;
  END IF;

  -- 3. CREAR EN AUTH.USERS SI NO EXISTE (DINÁMICAMENTE)
  IF new_user_id IS NULL THEN
      new_user_id := gen_random_uuid();

      -- Columnas core estables en todas las versiones de Supabase
      v_cols := ARRAY['id', 'aud', 'role', 'email', 'encrypted_password', 'email_confirmed_at', 'raw_app_meta_data', 'raw_user_meta_data', 'created_at', 'updated_at'];
      
      -- Auditar dinámicamente la existencia de columnas extras en esta versión de Postgres
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'instance_id') INTO v_has_col;
      IF v_has_col THEN v_cols := array_append(v_cols, 'instance_id'); END IF;

      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_sso_user') INTO v_has_col;
      IF v_has_col THEN v_cols := array_append(v_cols, 'is_sso_user'); END IF;

      -- Construcción segura del SQL de inserción (Con email_verified: true)
      v_sql := 'INSERT INTO auth.users (' || array_to_string(v_cols, ', ') || ') VALUES (';
      v_sql := v_sql || '$1, ''authenticated'', ''authenticated'', $2, crypt($3, gen_salt(''bf'')), now(), ' ||
               '''{"provider": "email", "providers": ["email"], "email_verified": true}''::jsonb, jsonb_build_object(''display_name'', $4), now(), now()';
      
      -- Inyectar parámetros extras condicionales
      IF 'instance_id' = ANY(v_cols) THEN v_sql := v_sql || ', ''00000000-0000-0000-0000-000000000000'''; END IF;
      IF 'is_sso_user' = ANY(v_cols) THEN v_sql := v_sql || ', false'; END IF;
      
      v_sql := v_sql || ')';
      
      -- Ejecución dinámica
      EXECUTE v_sql USING new_user_id, p_email, p_password, p_nombre;

      -- 4. CREAR EN AUTH.IDENTITIES DE FORMA DINÁMICA (PREVIENE ERROR 500 EN LOGIN)
      v_cols := ARRAY['id', 'user_id', 'identity_data', 'provider', 'last_sign_in_at', 'created_at', 'updated_at'];
      
      -- Verificar si la columna opcional "email" existe en identities
      SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'email') INTO v_has_col;
      
      IF v_has_col THEN
          v_sql := 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, email) ' ||
                   'VALUES ($1, $2, $3, ''email'', NULL, now(), now(), $4)';
          EXECUTE v_sql USING new_user_id::text, new_user_id, jsonb_build_object('sub', new_user_id::text, 'email', p_email, 'email_verified', true), p_email;
      ELSE
          v_sql := 'INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) ' ||
                   'VALUES ($1, $2, $3, ''email'', NULL, now(), now())';
          EXECUTE v_sql USING new_user_id::text, new_user_id, jsonb_build_object('sub', new_user_id::text, 'email', p_email, 'email_verified', true);
      END IF;

      -- 5. GARANTIZAR SINCRONÍA EN PERFIL DE USUARIO PÚBLICO
      INSERT INTO public.usuarios (id, email, nombre, role, activo)
      VALUES (new_user_id, p_email, p_nombre, 'user', true)
      ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, nombre = EXCLUDED.nombre;
  END IF;

  -- 6. VINCULAR ACCESO A LA EMPRESA SELECCIONADA (Sin columna "activo")
  INSERT INTO public.empresa_usuario (empresa_id, usuario_email, role)
  VALUES (p_empresa_id, p_email, COALESCE(p_role, 'empleado'))
  ON CONFLICT (empresa_id, usuario_email) 
  DO UPDATE SET role = EXCLUDED.role;

  RETURN new_user_id;
END;
$$;
