-- ============================================================
-- FIX: LIMPIEZA AUTOMÁTICA DE GPS (7 DÍAS)
-- Ejecutar este script en el SQL Editor de Supabase
-- ============================================================

-- 1. Asegurar que la extensión de cron esté activa
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Limpieza manual inmediata (Borrar todo lo anterior a 7 días)
-- Esto eliminará los registros del 8 de abril que mencionaste.
DELETE FROM public.historial_ubicaciones
WHERE fecha < NOW() - INTERVAL '7 days';

-- 3. Programar la limpieza automática diaria
-- Primero intentamos eliminar si ya existe para evitar duplicados
SELECT cron.unschedule('limpiar-gps-semanal');

-- Programamos para que corra todos los días a las 00:00 UTC
SELECT cron.schedule(
    'limpiar-gps-semanal',
    '0 0 * * *',
    'SELECT limpiar_historial_ubicaciones_antiguo();'
);

-- 4. Verificación inmediata
-- Ejecutá esto para confirmar que el "job" quedó guardado:
-- SELECT * FROM cron.job WHERE jobname = 'limpiar-gps-semanal';
