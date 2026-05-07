-- Ejecutar en el Editor SQL de Supabase
-- Añadir columna de metadatos genérica para campos personalizados por empresa

ALTER TABLE empresa_cliente 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
