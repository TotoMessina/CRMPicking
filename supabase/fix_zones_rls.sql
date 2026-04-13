-- ==========================================
-- FIX MAP ZONES (RLS & MULTI-TENANCY)
-- ==========================================

-- 1. Ensure RLS is enabled on 'zones' table
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they overlap (to avoid conflicts)
DROP POLICY IF EXISTS "Zonas visibles por empresa" ON public.zones;
DROP POLICY IF EXISTS "Inserción de zonas por empresa" ON public.zones;
DROP POLICY IF EXISTS "Eliminación de zonas por empresa" ON public.zones;
DROP POLICY IF EXISTS "Actualización de zonas por empresa" ON public.zones;

-- 3. Create granular policies based on user's authorized companies

-- Policy: SELECT (Read)
-- Users can only see zones belonging to companies they are members of
CREATE POLICY "Lectura de zonas por empresa" 
ON public.zones 
FOR SELECT 
USING (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.empresa_usuario 
        WHERE usuario_email = auth.email()
    )
);

-- Policy: INSERT (Write)
-- Users can only create zones for companies they belong to
CREATE POLICY "Inserción de zonas por empresa" 
ON public.zones 
FOR INSERT 
WITH CHECK (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.empresa_usuario 
        WHERE usuario_email = auth.email()
    )
);

-- Policy: UPDATE
CREATE POLICY "Actualización de zonas por empresa" 
ON public.zones 
FOR UPDATE 
USING (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.empresa_usuario 
        WHERE usuario_email = auth.email()
    )
);

-- Policy: DELETE
CREATE POLICY "Eliminación de zonas por empresa" 
ON public.zones 
FOR DELETE 
USING (
    empresa_id IN (
        SELECT empresa_id 
        FROM public.empresa_usuario 
        WHERE usuario_email = auth.email()
    )
);

-- 4. Verification Check
-- Ensure empresa_id is NOT NULL to prevent "global" zones that could leak
-- ALTER TABLE public.zones ALTER COLUMN empresa_id SET NOT NULL; 
-- (Commented out just in case there are legacy zones without company ID, but recommended)
