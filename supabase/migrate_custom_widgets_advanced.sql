-- ==========================================
-- MIGRACIÓN: Widgets Avanzados (Excel-like)
-- ==========================================
-- Ejecutar en el SQL Editor de Supabase
--
-- Este script extiende la tabla empresa_custom_widgets con:
-- 1. Nuevos tipos de gráfico (bar_horizontal, line, area, doughnut, radar)
-- 2. Columnas para opciones avanzadas (metric, metric_field, time_group, top_n, sort_dir)
-- ==========================================


-- ── 1. Ampliar el CHECK constraint de chart_type ─────────────────────────────
-- Supabase/Postgres no permite modificar un CHECK inline en ALTER COLUMN,
-- así que lo eliminamos y recreamos.

ALTER TABLE public.empresa_custom_widgets
    DROP CONSTRAINT IF EXISTS empresa_custom_widgets_chart_type_check;

ALTER TABLE public.empresa_custom_widgets
    ADD CONSTRAINT empresa_custom_widgets_chart_type_check
    CHECK (chart_type IN (
        'kpi', 'bar', 'bar_horizontal', 'line', 'area',
        'pie', 'doughnut', 'radar', 'list'
    ));


-- ── 2. Agregar columnas nuevas (IF NOT EXISTS para idempotencia) ──────────────

-- Métrica de agregación: contar, sumar o promediar
ALTER TABLE public.empresa_custom_widgets
    ADD COLUMN IF NOT EXISTS metric TEXT DEFAULT 'count'
    CHECK (metric IN ('count', 'sum', 'avg'));

-- Campo numérico para suma o promedio
ALTER TABLE public.empresa_custom_widgets
    ADD COLUMN IF NOT EXISTS metric_field TEXT;

-- Agrupación temporal para gráficos de línea/área/barra
ALTER TABLE public.empresa_custom_widgets
    ADD COLUMN IF NOT EXISTS time_group TEXT
    CHECK (time_group IN ('day', 'week', 'month'));

-- Límite de resultados (Top N)
ALTER TABLE public.empresa_custom_widgets
    ADD COLUMN IF NOT EXISTS top_n INT DEFAULT 10;

-- Dirección de ordenamiento
ALTER TABLE public.empresa_custom_widgets
    ADD COLUMN IF NOT EXISTS sort_dir TEXT DEFAULT 'desc'
    CHECK (sort_dir IN ('asc', 'desc'));


-- ── 3. Verificación ──────────────────────────────────────────────────────────
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'empresa_custom_widgets'
ORDER BY ordinal_position;
