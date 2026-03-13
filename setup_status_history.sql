-- ==============================================================================
-- PickingUp CRM - Script de Historial de Estados (status_history)
-- ==============================================================================
-- Este script activa el seguimiento automático de cambios de estado en
-- la tabla empresa_cliente, registrando quién, cuándo y qué cambió.
-- ==============================================================================

-- 1. AGREGAR COLUMNA DE HISTORIAL A empresa_cliente
-- Si ya existe en 'clientes', no importa, la manejaremos a nivel empresa_id.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresa_cliente' AND column_name = 'status_history') THEN
        ALTER TABLE public.empresa_cliente ADD COLUMN status_history JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 2. FUNCIÓN DE TRIGGER PARA REGISTRAR CAMBIOS
CREATE OR REPLACE FUNCTION public.log_status_history()
RETURNS TRIGGER AS $$
DECLARE
    v_user_email TEXT;
    v_history_entry JSONB;
BEGIN
    -- Solo actuar si el estado cambió o es una inserción nueva
    IF (TG_OP = 'INSERT') OR (OLD.estado IS DISTINCT FROM NEW.estado) THEN
        
        -- Obtener el email del usuario actual desde el JWT de Supabase
        v_user_email := auth.jwt() ->> 'email';
        
        -- Si no hay usuario en el contexto (ej. script manual), usar 'Sistema'
        IF v_user_email IS NULL THEN
            v_user_email := 'Sistema';
        END IF;

        -- Crear la entrada del historial
        v_history_entry := jsonb_build_object(
            'from', COALESCE(OLD.estado, 'Nuevo'),
            'to', NEW.estado,
            'at', NOW(),
            'by', v_user_email,
            'userName', COALESCE(NEW.creado_por, NEW.activador_cierre, 'Desconocido')
        );

        -- Append al array existente (asegurando que sea un array)
        NEW.status_history := COALESCE(OLD.status_history, '[]'::jsonb) || v_history_entry;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ASOCIAR EL TRIGGER
DROP TRIGGER IF EXISTS trg_log_status_history ON public.empresa_cliente;
CREATE TRIGGER trg_log_status_history
BEFORE INSERT OR UPDATE ON public.empresa_cliente
FOR EACH ROW EXECUTE FUNCTION public.log_status_history();

-- ==============================================================================
-- NOTA: Este trigger es "BEFORE" para poder modificar NEW.status_history 
-- directamente antes de que se guarde en el disco.
-- ==============================================================================
