-- Script para limpiar restricciones en la columna "situacion"
-- Ejecutar en el SQL Editor de Supabase

-- 1. Eliminar cualquier restricción de CHECK en la tabla empresa_cliente
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.empresa_cliente'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%situacion%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.empresa_cliente DROP CONSTRAINT ' || constraint_name;
    END LOOP;
END $$;

-- 2. Asegurarnos que la tabla clientes tampoco bloquee accidentalmente si un trigger la sincroniza
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.clientes'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) ILIKE '%situacion%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.clientes DROP CONSTRAINT ' || constraint_name;
    END LOOP;
END $$;

-- Mensaje de éxito (si corrió hasta acá, todo está limpio)
SELECT 'Restricciones de situación limpiadas correctamente.';
