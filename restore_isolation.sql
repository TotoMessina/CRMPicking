
-- ============================================================
-- PASO 1: Poblar empresa_cliente con todos los clientes históricos
-- Todos se asignan a PickingUp (empresa original)
-- ============================================================

INSERT INTO empresa_cliente (
    empresa_id,
    cliente_id,
    estado,
    rubro,
    responsable,
    situacion,
    notas,
    estilo_contacto,
    interes,
    tipo_contacto,
    venta_digital,
    venta_digital_cual,
    fecha_proximo_contacto,
    hora_proximo_contacto,
    creado_por,
    activador_cierre,
    visitas,
    ultima_actividad,
    activo,
    created_at,
    updated_at
)
SELECT
    '302444cf-9e6b-4127-b018-6c0d1972b276'::uuid AS empresa_id,
    c.id AS cliente_id,
    c.estado,
    c.rubro,
    c.responsable,
    c.situacion,
    c.notas,
    c.estilo_contacto,
    c.interes,
    c.tipo_contacto,
    c.venta_digital,
    c.venta_digital_cual,
    c.fecha_proximo_contacto,
    c.hora_proximo_contacto,
    c.creado_por,
    c.activador_cierre,
    COALESCE(c.visitas, 0),
    c.ultima_actividad,
    COALESCE(c.activo, true),
    COALESCE(c.created_at, now()),
    COALESCE(c.updated_at, now())
FROM clientes c
ON CONFLICT (empresa_id, cliente_id) DO NOTHING;


-- ============================================================
-- PASO 2: Re-activar RLS en todas las tablas
-- ============================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_usuario ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASO 2.5: Función para verificar si el usuario es administrador
-- (SECURITY DEFINER para saltar RLS al verificar rol)
-- ============================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuarios
        WHERE email = auth.email()
        AND LOWER(role) IN ('admin', 'super-admin', 'administrador')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- PASO 3: Eliminar políticas antiguas y crear nuevas correctas
-- ============================================================

-- Políticas para empresas
DROP POLICY IF EXISTS "Acceso total temporal" ON clientes;
DROP POLICY IF EXISTS "Acceso total temporal ec" ON empresa_cliente;
DROP POLICY IF EXISTS "Usuarios ven empresas a las que pertenecen" ON empresas;
DROP POLICY IF EXISTS "Usuarios ven sus propias referencias en empresa_usuario" ON empresa_usuario;
DROP POLICY IF EXISTS "Usuarios ven clientes de su empresa" ON empresa_cliente;
DROP POLICY IF EXISTS "Acceso a clientes por empresa" ON clientes;
DROP POLICY IF EXISTS "Ver perfil propio" ON usuarios;
DROP POLICY IF EXISTS "Ver mis empresas" ON empresas;
DROP POLICY IF EXISTS "Ver empresa_cliente de mi empresa" ON empresa_cliente;
DROP POLICY IF EXISTS "Insert empresa_cliente mi empresa" ON empresa_cliente;
DROP POLICY IF EXISTS "Update empresa_cliente mi empresa" ON empresa_cliente;
DROP POLICY IF EXISTS "Clientes visibles por empresa" ON clientes;
DROP POLICY IF EXISTS "Insert clientes" ON clientes;
DROP POLICY IF EXISTS "Update clientes" ON clientes;
DROP POLICY IF EXISTS "Ver empresa_usuario de mi empresa" ON empresa_usuario;
DROP POLICY IF EXISTS "Ver mi empresa_usuario" ON empresa_usuario;
DROP POLICY IF EXISTS "Insert empresa_usuario" ON empresa_usuario;

-- EMPRESA_USUARIO: ver solo las filas donde el email coincide o si soy admin
CREATE POLICY "Ver mi empresa_usuario" ON empresa_usuario
    FOR SELECT USING (usuario_email = auth.email() OR is_admin());

-- Permite a admin insertar/actualizar empresa_usuario
CREATE POLICY "Insert empresa_usuario" ON empresa_usuario
    FOR INSERT WITH CHECK (usuario_email = auth.email() OR is_admin());

CREATE POLICY "Update empresa_usuario" ON empresa_usuario
    FOR UPDATE USING (is_admin());

CREATE POLICY "Delete empresa_usuario" ON empresa_usuario
    FOR DELETE USING (is_admin());

-- EMPRESAS: ver solo las empresas a las que pertenezco
-- Usa SECURITY DEFINER via empresa_usuario simple
CREATE POLICY "Ver mis empresas" ON empresas
    FOR SELECT USING (
        id IN (
            SELECT eu.empresa_id FROM empresa_usuario eu
            WHERE eu.usuario_email = auth.email()
        )
    );

-- EMPRESA_CLIENTE: ver solo los de las empresas donde está el usuario
CREATE POLICY "Ver empresa_cliente de mi empresa" ON empresa_cliente
    FOR SELECT USING (
        empresa_id IN (
            SELECT eu.empresa_id FROM empresa_usuario eu
            WHERE eu.usuario_email = auth.email()
        )
    );

-- INSERT en empresa_cliente: si el usuario pertenece a esa empresa
CREATE POLICY "Insert empresa_cliente mi empresa" ON empresa_cliente
    FOR INSERT WITH CHECK (
        empresa_id IN (
            SELECT eu.empresa_id FROM empresa_usuario eu
            WHERE eu.usuario_email = auth.email()
        )
    );

-- UPDATE en empresa_cliente: si el usuario pertenece a esa empresa
CREATE POLICY "Update empresa_cliente mi empresa" ON empresa_cliente
    FOR UPDATE USING (
        empresa_id IN (
            SELECT eu.empresa_id FROM empresa_usuario eu
            WHERE eu.usuario_email = auth.email()
        )
    );

-- CLIENTES: usuarios pueden ver un cliente si está en alguna empresa del usuario
CREATE POLICY "Clientes visibles por empresa" ON clientes
    FOR SELECT USING (
        id IN (
            SELECT ec.cliente_id FROM empresa_cliente ec
            WHERE ec.empresa_id IN (
                SELECT eu.empresa_id FROM empresa_usuario eu
                WHERE eu.usuario_email = auth.email()
            )
        )
    );

-- INSERT en clientes: permitido si el usuario pertenece a alguna empresa
CREATE POLICY "Insert clientes" ON clientes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM empresa_usuario eu
            WHERE eu.usuario_email = auth.email()
        )
    );

-- UPDATE en clientes
CREATE POLICY "Update clientes" ON clientes
    FOR UPDATE USING (
        id IN (
            SELECT ec.cliente_id FROM empresa_cliente ec
            WHERE ec.empresa_id IN (
                SELECT eu.empresa_id FROM empresa_usuario eu
                WHERE eu.usuario_email = auth.email()
            )
        )
    );

-- USUARIOS: cada usuario ve solo su propio perfil, o admin ve todos
CREATE POLICY "Ver todos los perfiles si soy admin" ON usuarios
    FOR SELECT USING (is_admin() OR email = auth.email());

CREATE POLICY "Update perfiles si soy admin" ON usuarios
    FOR UPDATE USING (is_admin());
