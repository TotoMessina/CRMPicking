-- ============================================================
-- AUTOMACIÓN DE REPORTES 2.0 (FIJADO Y ACTUALIZADO)
-- Este script programa la tarea diaria para que la IA decida 
-- qué reportes enviar según la configuración de cada empresa.
-- ============================================================

-- 1. Asegurar extensiones (requiere permisos de superusuario en Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Limpiar tareas anteriores si existen
SELECT cron.unschedule('send-weekly-reports-friday') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-weekly-reports-friday');
SELECT cron.unschedule('weekly-crm-report') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-crm-report');

-- 3. Programar la ejecución DIARIA a las 08:00 AM ARG (11:00 UTC)
-- NOTA: REEMPLAZAR 'TU_PROJECT_REF' Y 'TU_SERVICE_ROLE_KEY'
-- El SERVICE_ROLE_KEY es necesario para bypassear RLS en la función de reporte.

SELECT cron.schedule(
    'pickup-daily-report-engine', -- nombre de la tarea
    '0 11 * * *',                 -- 11:00 UTC = 08:00 ARG
    $$
    SELECT
      net.http_post(
        url:='https://TU_PROJECT_REF.functions.supabase.co/send-weekly-report',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $$
);

-- 4. Comandos de utilidad para el administrador:

-- Ver estado de la tarea:
-- SELECT * FROM cron.job;

-- Ver si falló la última ejecución:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;

-- Forzar ejecución manual ahora mismo para probar:
-- SELECT net.http_post(url:='https://TU_PROJECT_REF.functions.supabase.co/send-weekly-report', headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb, body:='{}'::jsonb);
