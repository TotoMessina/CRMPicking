-- Paso 1: Crear tabla de historial
CREATE TABLE IF NOT EXISTS public.historial_ubicaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paso 2: Crear índices para optimizar búsquedas por mapa
-- Este índice acelera las consultas para buscar el recorrido de un activador específico en un día
CREATE INDEX IF NOT EXISTS idx_historial_usuario_fecha 
ON public.historial_ubicaciones (usuario_id, fecha);

CREATE INDEX IF NOT EXISTS idx_historial_empresa_fecha 
ON public.historial_ubicaciones (empresa_id, fecha);

-- Paso 3: Configurar Row Level Security (RLS)
ALTER TABLE public.historial_ubicaciones ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver el historial de los usuarios de sus mismas empresas
CREATE POLICY "Lectura de historial para miembros de empresa"
ON public.historial_ubicaciones
FOR SELECT
USING (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.empresa_usuario 
        WHERE usuario_email = auth.email()
    )
    OR
    usuario_id IN (
        SELECT id
        FROM public.usuarios
        WHERE email = auth.email()
    )
);

-- Política: Los usuarios pueden insertar su propio historial
CREATE POLICY "Inserción de historial propia"
ON public.historial_ubicaciones
FOR INSERT
WITH CHECK (
    usuario_id IN (
        SELECT id
        FROM public.usuarios
        WHERE email = auth.email()
    )
);

-- Política para administradores o acceso total si se necesita
CREATE POLICY "Acceso total para admins"
ON public.historial_ubicaciones
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM public.empresa_usuario
        WHERE usuario_email = auth.email() AND role = 'admin'
    )
);

-- Paso 4: Crear función de limpieza automática (Roll-over de 7 días a 1 mes, lo dejamos en 7 días)
CREATE OR REPLACE FUNCTION limpiar_historial_ubicaciones_antiguo()
RETURNS void AS $$
BEGIN
    DELETE FROM public.historial_ubicaciones
    WHERE fecha < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Opcional: Ejecutar un test de borrado (borra todo lo anterior a 7 días manualmente ahora mismo)
SELECT limpiar_historial_ubicaciones_antiguo();
