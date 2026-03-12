-- ==============================================================================
-- PickingUp CRM - Audit Logs Migration Script
-- ==============================================================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    table_name TEXT NOT NULL,         -- e.g., 'clientes', 'empresa_cliente'
    record_id TEXT NOT NULL,          -- Flexible formatting to hold UUID or BIGINT String
    action_type TEXT NOT NULL,        -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,                   -- Record state before the change
    new_data JSONB,                   -- Record state after the change
    changed_by UUID DEFAULT auth.uid(), -- Supabase automatically captures the auth.uid() if executed via REST API
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS so only authenticated admins/users can read
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all logs. (Simplified policy, adjust based on your role needs)
CREATE POLICY "Admins can view audit logs"
    ON public.audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE email = auth.jwt() ->> 'email' 
            AND rol IN ('Administrador', 'admin')
        )
    );

-- 2. Create the Generic Audit Trigger Function
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_record_id TEXT;
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        IF NEW ? 'id' THEN
            v_record_id := NEW.id::TEXT;
        ELSIF NEW ? 'cliente_id' THEN
            v_record_id := NEW.cliente_id::TEXT;
        ELSE
            v_record_id := 'UNKNOWN';
        END IF;

        INSERT INTO public.audit_logs (table_name, record_id, action_type, old_data, new_data)
        VALUES (TG_TABLE_NAME::TEXT, v_record_id, TG_OP, v_old_data, v_new_data);
        
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        v_old_data := to_jsonb(OLD);
        
        IF OLD ? 'id' THEN
            v_record_id := OLD.id::TEXT;
        ELSIF OLD ? 'cliente_id' THEN
            v_record_id := OLD.cliente_id::TEXT;
        ELSE
            v_record_id := 'UNKNOWN';
        END IF;

        INSERT INTO public.audit_logs (table_name, record_id, action_type, old_data, new_data)
        VALUES (TG_TABLE_NAME::TEXT, v_record_id, TG_OP, v_old_data, NULL);
        
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        v_new_data := to_jsonb(NEW);
        
        IF NEW ? 'id' THEN
            v_record_id := NEW.id::TEXT;
        ELSIF NEW ? 'cliente_id' THEN
            v_record_id := NEW.cliente_id::TEXT;
        ELSE
            v_record_id := 'UNKNOWN';
        END IF;

        INSERT INTO public.audit_logs (table_name, record_id, action_type, old_data, new_data)
        VALUES (TG_TABLE_NAME::TEXT, v_record_id, TG_OP, NULL, v_new_data);
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Attach the Triggers to key tables

-- Table: clientes
DROP TRIGGER IF EXISTS audit_clientes_changes ON public.clientes;
CREATE TRIGGER audit_clientes_changes
AFTER INSERT OR UPDATE OR DELETE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Table: empresa_cliente
DROP TRIGGER IF EXISTS audit_empresa_cliente_changes ON public.empresa_cliente;
CREATE TRIGGER audit_empresa_cliente_changes
AFTER INSERT OR UPDATE OR DELETE ON public.empresa_cliente
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Table: repartidores
DROP TRIGGER IF EXISTS audit_repartidores_changes ON public.repartidores;
CREATE TRIGGER audit_repartidores_changes
AFTER INSERT OR UPDATE OR DELETE ON public.repartidores
FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
