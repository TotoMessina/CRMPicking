-- Actualización para Sistema de Roadmap e Ideas en Proveedores
-- Se añade Prioridad y control de Dependencia (Pelota de nuestro lado o del proveedor)

ALTER TABLE public.eventos_proveedores
ADD COLUMN IF NOT EXISTS prioridad text DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
ADD COLUMN IF NOT EXISTS depende_de_nosotros boolean DEFAULT true;

-- Asegurar que los datos existentes se comporten bien 
UPDATE public.eventos_proveedores
SET prioridad = 'media', depende_de_nosotros = true
WHERE prioridad IS NULL;
