-- Hardening de funciones de Super Admin

-- 1. Asegurar get_super_admin_stats
CREATE OR REPLACE FUNCTION get_super_admin_stats()
RETURNS JSON AS $$
DECLARE
    total_companies BIGINT;
    total_users BIGINT;
    active_tickets BIGINT;
    total_mrr DECIMAL(10,2);
BEGIN
    -- VALIDACIÓN: Solo el super-admin real puede ver estadísticas globales
    IF (SELECT role FROM public.usuarios WHERE email = auth.jwt()->>'email') <> 'super-admin' THEN
        RAISE EXCEPTION 'Acceso denegado: Se requieren privilegios de Super Admin.';
    END IF;

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

-- 2. Asegurar get_company_usage_stats
CREATE OR REPLACE FUNCTION get_company_usage_stats(p_empresa_id UUID)
RETURNS JSON AS $$
DECLARE
    client_count BIGINT;
    repartidor_count BIGINT;
    visit_count BIGINT;
BEGIN
    -- VALIDACIÓN: Solo el super-admin o un Admin de ESA empresa puede ver sus estadísticas
    IF NOT EXISTS (
        SELECT 1 FROM public.empresa_usuario
        WHERE empresa_id = p_empresa_id
          AND usuario_email = auth.jwt()->>'email'
          AND role = 'admin'
    ) AND (SELECT role FROM public.usuarios WHERE email = auth.jwt()->>'email') <> 'super-admin' THEN
        RAISE EXCEPTION 'Acceso denegado: No tenés permiso para ver estadísticas de esta empresa.';
    END IF;

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
