-- =========================================================================
-- Migración para Mensajes de Chat (Soporte Multi-Empresa)
-- =========================================================================

-- 1. Agregar la columna empresa_id a mensajes_chat
ALTER TABLE public.mensajes_chat ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

-- 2. Asignar todos los mensajes existentes a la primera empresa (PickingUp)
UPDATE public.mensajes_chat 
SET empresa_id = '302444cf-9e6b-4127-b018-6c0d1972b276' 
WHERE empresa_id IS NULL;

-- 3. Hacer que la columna sea requerida para futuros mensajes
ALTER TABLE public.mensajes_chat ALTER COLUMN empresa_id SET NOT NULL;
