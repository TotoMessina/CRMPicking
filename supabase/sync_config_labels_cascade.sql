-- ============================================================
-- PickingUp CRM - SINCRONIZACIÓN EN CASCADA DE NOMBRES
-- ============================================================

-- 1. FUNCIÓN DE SINCRONIZACIÓN PARA ETAPAS (ESTADOS)
CREATE OR REPLACE FUNCTION public.fn_sync_estado_label_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actuamos si el label cambió y no es nulo
    IF (OLD.label <> NEW.label) THEN
        UPDATE public.empresa_cliente
        SET estado = NEW.label
        WHERE empresa_id = NEW.empresa_id 
          AND estado = OLD.label;
          
        RAISE NOTICE 'Sincronizados clientes de la empresa %: % -> %', NEW.empresa_id, OLD.label, NEW.label;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER PARA ETAPAS
DROP TRIGGER IF EXISTS tr_sync_estado_name_change ON public.empresa_pipeline_estados;
CREATE TRIGGER tr_sync_estado_name_change
    AFTER UPDATE OF label ON public.empresa_pipeline_estados
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_estado_label_change();


-- 2. FUNCIÓN DE SINCRONIZACIÓN PARA SITUACIONES
CREATE OR REPLACE FUNCTION public.fn_sync_situacion_label_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actuamos si el label cambió y no es nulo
    IF (OLD.label <> NEW.label) THEN
        UPDATE public.empresa_cliente
        SET situacion = NEW.label
        WHERE empresa_id = NEW.empresa_id 
          AND situacion = OLD.label;
          
        RAISE NOTICE 'Sincronizadas situaciones de la empresa %: % -> %', NEW.empresa_id, OLD.label, NEW.label;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER PARA SITUACIONES
DROP TRIGGER IF EXISTS tr_sync_situacion_name_change ON public.empresa_pipeline_situaciones;
CREATE TRIGGER tr_sync_situacion_name_change
    AFTER UPDATE OF label ON public.empresa_pipeline_situaciones
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_situacion_label_change();

COMMENT ON FUNCTION public.fn_sync_estado_label_change() IS 'Actualiza automáticamente el estado de los clientes cuando se renombra una etapa en la configuración.';
COMMENT ON FUNCTION public.fn_sync_situacion_label_change() IS 'Actualiza automáticamente la situación de los clientes cuando se renombra un tag/situación en la configuración.';
