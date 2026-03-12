-- ==============================================================================
-- PickingUp CRM - Script de Optimización de Base de Datos (v1.2)
-- ==============================================================================
-- Este script aplica mejoras de rendimiento e integridad de forma SEGURA.
-- NO elimina datos, solo optimiza la estructura de índices, triggers y funciones.
-- ==============================================================================

-- 1. Optimización Multi-empresa (Multi-tenancy)
-- Agregamos índices en empresa_id para que los filtros por empresa sean instantáneos.

CREATE INDEX IF NOT EXISTS idx_consumidores_empresa_id ON public.consumidores (empresa_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_empresa_id ON public.proveedores (empresa_id);
CREATE INDEX IF NOT EXISTS idx_turnos_empresa_id ON public.turnos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_eventos_empresa_id ON public.eventos (empresa_id);
CREATE INDEX IF NOT EXISTS idx_tareas_tablero_empresa_id ON public.tareas_tablero (empresa_id);
CREATE INDEX IF NOT EXISTS idx_zones_empresa_id ON public.zones (empresa_id);
CREATE INDEX IF NOT EXISTS idx_actividades_empresa_id ON public.actividades (empresa_id);
CREATE INDEX IF NOT EXISTS idx_actividades_consumidores_empresa_id ON public.actividades_consumidores (empresa_id);

-- 2. Limpieza de Índices Redundantes
DROP INDEX IF EXISTS public.clientes_telefono_unique;
DROP INDEX IF EXISTS public.clientes_mail_unique;
DROP INDEX IF EXISTS public.clientes_telefono_idx;

-- 3. Consolidación de Triggers de "ultima_actividad"
CREATE OR REPLACE FUNCTION public.unified_refresh_ultima_actividad()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.clientes
        SET ultima_actividad = NOW()
        WHERE id = NEW.cliente_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.clientes
        SET ultima_actividad = (
            SELECT MAX(fecha) FROM public.actividades WHERE cliente_id = OLD.cliente_id
        )
        WHERE id = OLD.cliente_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_actividades_ultima_actividad_ins ON public.actividades;
DROP TRIGGER IF EXISTS trg_actividades_ultima_actividad_del ON public.actividades;
DROP TRIGGER IF EXISTS trg_bump_ultima_actividad_cliente ON public.actividades;

CREATE TRIGGER trg_actividades_ultima_actividad_unified
AFTER INSERT OR UPDATE OR DELETE ON public.actividades
FOR EACH ROW EXECUTE FUNCTION public.unified_refresh_ultima_actividad();

-- 4. Estándar de Función "updated_at"
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. RPC: crear_cliente_v5_final (Versión Corregida y Extendida)
-- Esta función asegura que todos los campos del Modal se guarden correctamente.

CREATE OR REPLACE FUNCTION public.crear_cliente_v5_final(p_payload jsonb)
RETURNS bigint AS $$
DECLARE
    new_id BIGINT;
    v_emp_id UUID;
    v_creador TEXT;
BEGIN
    -- 1. Validar y convertir ID de empresa
    BEGIN
        v_emp_id := (p_payload->>'p_empresa_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'ID de empresa inválido: %. JSON: %', p_payload->>'p_empresa_id', p_payload;
    END;

    v_creador := p_payload->>'p_creado_por';

    -- 2. Insertar en tabla maestra 'clientes'
    INSERT INTO clientes (
        nombre_local, nombre, direccion, telefono, 
        mail, cuit, lat, lng, creado_por,
        created_at, updated_at
    )
    VALUES (
        p_payload->>'p_nombre_local', 
        p_payload->>'p_nombre', 
        p_payload->>'p_direccion', 
        p_payload->>'p_telefono', 
        p_payload->>'p_mail', 
        p_payload->>'p_cuit', 
        (p_payload->>'p_lat')::FLOAT8, 
        (p_payload->>'p_lng')::FLOAT8, 
        v_creador,
        NOW(),
        NOW()
    )
    RETURNING id INTO new_id;

    -- 3. Insertar en tabla de negocio 'empresa_cliente' con TODOS los campos
    INSERT INTO empresa_cliente (
        empresa_id, cliente_id, estado, rubro, responsable, 
        situacion, notas, tipo_contacto, creado_por, activo,
        interes, estilo_contacto, venta_digital, venta_digital_cual,
        fecha_proximo_contacto, hora_proximo_contacto,
        created_at, updated_at
    )
    VALUES (
        v_emp_id, 
        new_id, 
        p_payload->>'p_estado', 
        p_payload->>'p_rubro', 
        p_payload->>'p_responsable', 
        p_payload->>'p_situacion', 
        p_payload->>'p_notas', 
        p_payload->>'p_tipo_contacto', 
        v_creador, 
        true,
        p_payload->>'p_interes',
        p_payload->>'p_estilo_contacto',
        (p_payload->>'p_venta_digital')::BOOLEAN,
        p_payload->>'p_venta_digital_cual',
        p_payload->>'p_fecha_proximo_contacto',
        p_payload->>'p_hora_proximo_contacto',
        NOW(),
        NOW()
    )
    ON CONFLICT (empresa_id, cliente_id) DO UPDATE SET
        estado = EXCLUDED.estado,
        rubro = EXCLUDED.rubro,
        responsable = EXCLUDED.responsable,
        situacion = EXCLUDED.situacion,
        notas = EXCLUDED.notas,
        tipo_contacto = EXCLUDED.tipo_contacto,
        creado_por = EXCLUDED.creado_por,
        interes = EXCLUDED.interes,
        estilo_contacto = EXCLUDED.estilo_contacto,
        venta_digital = EXCLUDED.venta_digital,
        venta_digital_cual = EXCLUDED.venta_digital_cual,
        fecha_proximo_contacto = EXCLUDED.fecha_proximo_contacto,
        hora_proximo_contacto = EXCLUDED.hora_proximo_contacto,
        activo = EXCLUDED.activo,
        updated_at = EXCLUDED.updated_at;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Mejora de Integridad en Turnos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_turnos_usuarios_email') THEN
        ALTER TABLE public.turnos 
        ADD CONSTRAINT fk_turnos_usuarios_email 
        FOREIGN KEY (usuario_email) REFERENCES public.usuarios(email) ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Optimización de Búsqueda de Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_complex_search ON public.clientes (activo, responsable, rubro, estado);

-- ==============================================================================
-- FIN DEL SCRIPT v1.2
-- ==============================================================================
