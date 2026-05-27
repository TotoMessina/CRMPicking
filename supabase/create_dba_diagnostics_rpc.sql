-- Postgres DBA Performance Telemetry and Health Cockpit
-- Author: Antigravity AI
-- Description: Secure RPC diagnostics function strictly restricted to super-admin users.

CREATE OR REPLACE FUNCTION get_dba_diagnostics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
    storage_info json;
    cache_info json;
    unused_indexes json;
    slow_queries json;
    active_sessions json;
BEGIN
    -- 🔒 STRICT SECURITY SANITY CHECK
    -- Verify that the executing user is authenticated and holds the 'super-admin' role in public.usuarios
    IF NOT EXISTS (
        SELECT 1 FROM public.usuarios 
        WHERE id = auth.uid() 
          AND role = 'super-admin'
    ) THEN
        RAISE EXCEPTION 'Access Denied: Only super-admins can execute DBA diagnostics';
    END IF;

    -- 1. Storage metrics (detailed breakdown of tables, data sizes and index sizes)
    SELECT json_agg(t) INTO storage_info FROM (
        SELECT 
            table_name,
            pg_relation_size(quote_ident(table_name)) as table_size_bytes,
            (pg_total_relation_size(quote_ident(table_name)) - pg_relation_size(quote_ident(table_name))) as index_size_bytes
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
    ) t;

    -- 2. Cache hit ratio (measures RAM vs Disk efficiency)
    SELECT json_build_object(
        'hit_ratio', COALESCE(round(sum(heap_blks_hit) * 100.0 / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2), 100.0),
        'total_reads', COALESCE(sum(heap_blks_read), 0),
        'total_hits', COALESCE(sum(heap_blks_hit), 0)
    ) INTO cache_info
    FROM pg_statio_user_tables;

    -- 3. Unused indexes (detects redundant indexes taking up disk space)
    SELECT json_agg(t) INTO unused_indexes FROM (
        SELECT 
            relname AS table_name,
            indexrelname AS index_name,
            pg_relation_size(indexrelid) AS index_size_bytes,
            idx_scan AS scans
        FROM pg_stat_user_indexes 
        WHERE idx_scan = 0 
          AND schemaname = 'public'
          AND relname NOT LIKE 'pg_%'
        ORDER BY pg_relation_size(indexrelid) DESC
        LIMIT 10
    ) t;

    -- 4. Slowest Queries (query metrics from pg_stat_statements extension with safe exception handling)
    BEGIN
        SELECT json_agg(t) INTO slow_queries FROM (
            SELECT 
                query,
                calls,
                round(total_exec_time::numeric, 2) as total_time_ms,
                round((total_exec_time / calls)::numeric, 2) as mean_time_ms
            FROM pg_stat_statements 
            ORDER BY total_exec_time DESC 
            LIMIT 8
        ) t;
    EXCEPTION WHEN OTHERS THEN
        -- Fallback if pg_stat_statements is not enabled or user lacks permissions
        slow_queries := '[]'::json;
    END;

    -- 5. Connections & Locks (system activity monitoring)
    SELECT json_build_object(
        'total_connections', count(*),
        'active_queries', count(*) FILTER (WHERE state = 'active'),
        'idle_connections', count(*) FILTER (WHERE state = 'idle')
    ) INTO active_sessions
    FROM pg_stat_activity
    WHERE backend_type = 'client backend';

    -- Combine all gathered metrics into a unified JSON structure
    result := json_build_object(
        'storage', COALESCE(storage_info, '[]'::json),
        'cache', COALESCE(cache_info, '{"hit_ratio": 100.0, "total_reads": 0, "total_hits": 0}'::json),
        'unused_indexes', COALESCE(unused_indexes, '[]'::json),
        'slow_queries', COALESCE(slow_queries, '[]'::json),
        'sessions', COALESCE(active_sessions, '{"total_connections": 1, "active_queries": 0, "idle_connections": 1}'::json)
    );

    RETURN result;
END;
$$;
