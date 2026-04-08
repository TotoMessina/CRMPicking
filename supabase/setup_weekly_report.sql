-- ============================================================
-- REPORTE SEMANAL AUTOMÁTICO — Setup SQL
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ── 1. Tabla de destinatarios del reporte ────────────────────
CREATE TABLE IF NOT EXISTS public.report_recipients (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id  UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    activo      BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (empresa_id, email)
);

-- RLS: Solo usuarios de la empresa pueden gestionar destinatarios
ALTER TABLE public.report_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_recipients_select" ON public.report_recipients
    FOR SELECT USING (
        empresa_id IN (
            SELECT empresa_id FROM public.empresa_usuario
            WHERE usuario_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "report_recipients_insert" ON public.report_recipients
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT empresa_id FROM public.empresa_usuario
            WHERE usuario_email = auth.jwt()->>'email'
        )
    );

CREATE POLICY "report_recipients_delete" ON public.report_recipients
    FOR DELETE USING (
        empresa_id IN (
            SELECT empresa_id FROM public.empresa_usuario
            WHERE usuario_email = auth.jwt()->>'email'
        )
    );

-- ── 2. Activar extensiones necesarias ────────────────────────
-- Solo si no están activadas (verificar en Dashboard > Database > Extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 3. Cron Job: Enviar reporte cada lunes a las 08:00 AM (UTC-3 = 11:00 UTC) ──
-- NOTA: Cambiar YOUR_PROJECT_REF y YOUR_ANON_KEY con los valores de tu proyecto.
-- Los encontras en: Dashboard > Settings > API

SELECT cron.schedule(
    'weekly-crm-report',                          -- Nombre único del job
    '0 11 * * 1',                                 -- Cada lunes a las 11:00 UTC (= 08:00 ARG)
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

-- ── 4. (Opcional) Configurar el secret en la base de datos ───
-- Genera un string aleatorio seguro y guárdalo también en
-- Supabase Dashboard > Edge Functions > send-weekly-report > Secrets > REPORT_SECRET
-- ALTER DATABASE postgres SET "app.report_secret" = 'tu-secreto-aqui';

-- ── 5. (Verificación) Ver jobs programados ───────────────────
-- SELECT * FROM cron.job;

-- ── 6. (Verificación) Ver historial de ejecuciones ───────────
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- ── 7. (Opcional) Eliminar el job si necesitás cambiarlo ─────
-- SELECT cron.unschedule('weekly-crm-report');
