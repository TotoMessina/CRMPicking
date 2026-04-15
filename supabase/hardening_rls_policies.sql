-- ============================================================
-- PickingUp CRM - BLINDAJE MULTI-TENANT (RLS)
-- ============================================================
-- Este script activa Row Level Security (RLS) en las tablas
-- críticas para asegurar que ninguna empresa vea datos de otra.
-- ============================================================

-- 1. HABILITAR RLS EN TABLAS CRÍTICAS
ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_consumidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actividades_repartidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repartidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresa_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tareas_tablero ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. POLÍTICA UNIVERSAL DE AISLAMIENTO POR EMPRESA
-- El usuario solo puede ver/tocar filas donde el empresa_id coincida
-- con una empresa de la que es miembro según 'empresa_usuario'.

-- Función helper para no repetir la lógica de pertenencia (Opcional pero recomendado para performance)
CREATE OR REPLACE FUNCTION public.check_user_belongs_to_company(p_emp_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.empresa_usuario
        WHERE empresa_id = p_emp_id
          AND usuario_email = auth.jwt()->>'email'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper para detectar usuarios en modo DEMO
CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE email = auth.jwt()->>'email'
          AND role = 'demo'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. APLICAR POLÍTICAS A LAS TABLAS

-- TABLAS OPERATIVAS (Permiten SELECT e INSERT para Demo, pero bloquean UPDATE/DELETE)
-- Tablas: actividades, consumidores, repartidores, tareas_tablero, eventos, mensajes_chat, historial_ubicaciones, proveedores, grupos

DO $$ 
DECLARE 
    t TEXT;
    tables TEXT[] := ARRAY['actividades', 'consumidores', 'repartidores', 'tareas_tablero', 'eventos', 'mensajes_chat', 'historial_ubicaciones', 'proveedores', 'grupos', 'eventos_proveedores', 'eventos_historial', 'calificaciones'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS tenant_%I_select ON public.%I', t, t);
        EXECUTE format('CREATE POLICY tenant_%I_select ON public.%I FOR SELECT USING (check_user_belongs_to_company(empresa_id))', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS tenant_%I_insert ON public.%I', t, t);
        EXECUTE format('CREATE POLICY tenant_%I_insert ON public.%I FOR INSERT WITH CHECK (check_user_belongs_to_company(empresa_id))', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS tenant_%I_modify ON public.%I', t, t);
        EXECUTE format('CREATE POLICY tenant_%I_modify ON public.%I FOR ALL USING (check_user_belongs_to_company(empresa_id) AND NOT is_demo_user()) WITH CHECK (NOT is_demo_user())', t, t);
    END LOOP;
END $$;

-- TABLAS DE CONFIGURACIÓN (BLOQUEADO INSERT/UPDATE/DELETE PARA DEMO)
-- Tablas: empresa_usuario, empresa_permisos_pagina, empresas, crm_roles

DROP POLICY IF EXISTS tenant_empresa_cliente_policy ON public.empresa_cliente;
CREATE POLICY tenant_empresa_cliente_select ON public.empresa_cliente FOR SELECT USING (check_user_belongs_to_company(empresa_id));
CREATE POLICY tenant_empresa_cliente_modify ON public.empresa_cliente FOR ALL USING (check_user_belongs_to_company(empresa_id) AND NOT is_demo_user()) WITH CHECK (NOT is_demo_user());

-- 4. CASO ESPECIAL: TABLA MAESTRA 'CLIENTES'
-- No tiene empresa_id. Se protege verificando que exista en empresa_cliente para el usuario.
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_clientes_master_select ON public.clientes;
CREATE POLICY tenant_clientes_master_select ON public.clientes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.empresa_cliente ec
            WHERE ec.cliente_id = public.clientes.id
              AND check_user_belongs_to_company(ec.empresa_id)
        )
    );

DROP POLICY IF EXISTS tenant_clientes_master_insert ON public.clientes;
CREATE POLICY tenant_clientes_master_insert ON public.clientes
    FOR INSERT WITH CHECK (true); -- La validación de empresa se hace vía RPC o trigger en empresa_cliente

DROP POLICY IF EXISTS tenant_clientes_master_modify ON public.clientes;
CREATE POLICY tenant_clientes_master_modify ON public.clientes
    FOR ALL USING (
        NOT is_demo_user() AND EXISTS (
            SELECT 1 FROM public.empresa_cliente ec
            WHERE ec.cliente_id = public.clientes.id
              AND check_user_belongs_to_company(ec.empresa_id)
        )
    ) WITH CHECK (NOT is_demo_user());

-- 5. CASO ESPECIAL: AUDIT LOGS
-- Solo permitir ver logs de registros que el usuario puede ver en sus tablas originales
DROP POLICY IF EXISTS tenant_audit_logs_policy ON public.audit_logs;
CREATE POLICY tenant_audit_logs_policy ON public.audit_logs
    FOR SELECT USING (
        (table_name = 'clientes' AND EXISTS (
            SELECT 1 FROM public.empresa_cliente ec 
            WHERE ec.cliente_id::text = public.audit_logs.record_id 
              AND check_user_belongs_to_company(ec.empresa_id)
        ))
        OR (table_name = 'empresa_cliente' AND EXISTS (
            SELECT 1 FROM public.empresa_cliente ec 
            WHERE ec.id::text = public.audit_logs.record_id 
              AND check_user_belongs_to_company(ec.empresa_id)
        ))
    );

-- 6. CASO ESPECIAL: TABLA 'USUARIOS'
-- Los usuarios normales solo pueden ver a otros usuarios que compartan alguna empresa con ellos.
-- Esto protege las columnas 'lat' y 'lng' evitando que se filtren posiciones fuera de la organización.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_usuarios_visibility_policy ON public.usuarios;
CREATE POLICY tenant_usuarios_visibility_policy ON public.usuarios
    FOR SELECT USING (
        email = auth.jwt()->>'email' -- Ver mi propio perfil
        OR EXISTS (
            SELECT 1 FROM public.empresa_usuario eu1
            JOIN public.empresa_usuario eu2 ON eu1.empresa_id = eu2.empresa_id
            WHERE eu1.usuario_email = auth.jwt()->>'email'
              AND eu2.usuario_email = public.usuarios.email
        )
    );

-- Solo el propio usuario (no demo) puede editar su perfil/avatar
DROP POLICY IF EXISTS tenant_usuarios_self_modify ON public.usuarios;
CREATE POLICY tenant_usuarios_self_modify ON public.usuarios
    FOR UPDATE USING (email = auth.jwt()->>'email' AND NOT is_demo_user())
    WITH CHECK (email = auth.jwt()->>'email' AND NOT is_demo_user());

SELECT 'Blindaje RLS aplicado exitosamente.' AS resultado;
