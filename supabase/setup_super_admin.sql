-- ==========================================
-- SETUP SUPER ADMIN: BILLING & USAGE
-- ==========================================

-- 1. Add billing fields to 'empresas' table
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS billing_plan TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS billing_price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_currency TEXT DEFAULT 'ARS',
ADD COLUMN IF NOT EXISTS billing_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS billing_due_date DATE,
ADD COLUMN IF NOT EXISTS billing_notes TEXT;

-- 2. Add 'empresa_id' to 'tickets' table for better multi-tenant support
-- (Currently tickets are global, linking them allows filtering by company)
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- 3. Function to get global system statistics for Super Admin
CREATE OR REPLACE FUNCTION get_super_admin_stats()
RETURNS JSON AS $$
DECLARE
    total_companies BIGINT;
    total_users BIGINT;
    active_tickets BIGINT;
    total_mrr DECIMAL(10,2);
BEGIN
    SELECT COUNT(*) INTO total_companies FROM empresas;
    SELECT COUNT(*) INTO total_users FROM usuarios;
    SELECT COUNT(*) INTO active_tickets FROM tickets WHERE estado != 'Cerrado';
    SELECT SUM(billing_price) INTO total_mrr FROM empresas WHERE billing_status = 'active';

    RETURN json_build_object(
        'total_companies', total_companies,
        'total_users', total_users,
        'active_tickets', active_tickets,
        'total_mrr', COALESCE(total_mrr, 0)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to get usage metrics per company
CREATE OR REPLACE FUNCTION get_company_usage_stats(p_empresa_id UUID)
RETURNS JSON AS $$
DECLARE
    client_count BIGINT;
    repartidor_count BIGINT;
    visit_count BIGINT;
BEGIN
    -- Count of clients associated with the company
    SELECT COUNT(*) INTO client_count FROM empresa_cliente WHERE empresa_id = p_empresa_id;
    
    -- Count of delivery drivers
    SELECT COUNT(*) INTO repartidor_count FROM repartidores WHERE empresa_id = p_empresa_id;
    
    -- Count of visits/activities
    SELECT COUNT(*) INTO visit_count FROM actividades_cliente ac
    JOIN empresa_cliente ec ON ac.cliente_id = ec.id
    WHERE ec.empresa_id = p_empresa_id;

    RETURN json_build_object(
        'clients', client_count,
        'deliveries', repartidor_count,
        'visits', visit_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
