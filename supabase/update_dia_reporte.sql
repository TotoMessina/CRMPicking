-- 1. Agregamos la columna dia_reporte a la tabla de empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS dia_reporte INT DEFAULT 1;

-- 2. Modificamos el trabajo Cron para que se ejecute TODOS LOS DÍAS a las 08:00 AM ARG
-- Usamos cron.unschedule y volvemos a programar
SELECT cron.unschedule('weekly-crm-report');

SELECT cron.schedule(
    'weekly-crm-report',                          
    '0 11 * * *',  -- TODOS los días a las 11:00 UTC (= 08:00 ARG)
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-weekly-report',
        headers := jsonb_build_object(
            'Content-Type',        'application/json',
            'x-report-secret',     current_setting('app.report_secret', true)
        ),
        body := '{"source": "cron"}'::jsonb
    ) AS request_id;
    $$
);

-- 3. Creamos una función RPC segura para configurar este día desde el CRM
CREATE OR REPLACE FUNCTION update_dia_reporte(p_empresa_id UUID, p_dia INT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validar que el día esté entre 0 y 6
    IF p_dia < 0 OR p_dia > 6 THEN
        RAISE EXCEPTION 'día inválido. debe ser entre 0 y 6.';
    END IF;

    -- Validar que el usuario que llama, sea parte de la empresa
    IF NOT EXISTS (
        SELECT 1 FROM public.empresa_usuario 
        WHERE empresa_id = p_empresa_id 
        AND usuario_email = auth.jwt()->>'email'
    ) THEN
        RAISE EXCEPTION 'acceso denegado';
    END IF;

    -- Hacer el update
    UPDATE public.empresas 
    SET dia_reporte = p_dia 
    WHERE id = p_empresa_id;
END;
$$;
