-- ============================================================
-- InsideUp CRM - CORRECCIÓN DE RLS PARA CREACIÓN DE EMPRESAS
-- ============================================================
-- Este script asegura que la tabla empresas tenga las políticas RLS
-- correctas para permitir a Super Admins y Admins crear empresas,
-- y a todos los usuarios autenticados listarlas.

-- 1. Habilitar RLS (Por seguridad, por si no estaba habilitado)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR POLÍTICAS EXISTENTES (Para evitar colisiones)
DROP POLICY IF EXISTS "Lectura de empresas para autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Permitir lectura de empresas a autenticados" ON public.empresas;
DROP POLICY IF EXISTS "Super Admins gestion total empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admins gestionan empresas" ON public.empresas;

-- 3. POLÍTICA DE LECTURA (SELECT): 
-- Todos los usuarios autenticados deben poder leer las empresas para poder vincularse o cargar configuraciones.
CREATE POLICY "Lectura de empresas para autenticados" ON public.empresas
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- 4. POLÍTICA DE GESTIÓN COMPLETA (ALL):
-- Permitir INSERT, UPDATE, DELETE a los usuarios que tengan rol 'super-admin' o 'admin' en la tabla usuarios global.
CREATE POLICY "Admins gestionan empresas" ON public.empresas
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.email = auth.jwt() ->> 'email'
            AND usuarios.role IN ('super-admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.email = auth.jwt() ->> 'email'
            AND usuarios.role IN ('super-admin', 'admin')
        )
    );

-- Comentario aclaratorio para el esquema
COMMENT ON TABLE public.empresas IS 'Almacena las entidades de empresas del sistema. Gestionable solo por Administradores globales y Super Admins.';
