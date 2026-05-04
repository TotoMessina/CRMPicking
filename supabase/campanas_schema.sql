-- Tabla principal de campañas
CREATE TABLE IF NOT EXISTS campanas (
    id BIGSERIAL PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN (
        'Campañas Redes Sociales',
        'Marketing de video',
        'Medios masivos',
        'Publicidad exterior',
        'Campañas presenciales',
        'Patrocinio'
    )),
    nombre TEXT NOT NULL,
    objetivo TEXT,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    horario_inicio TIME,
    horario_fin TIME,
    zona TEXT,
    calles TEXT,
    regalo TEXT,
    costo NUMERIC(12, 2),
    percepcion_resultado TEXT CHECK (percepcion_resultado IN ('Muy buena', 'Buena', 'Regular', 'Mala', 'Muy mala')),
    justificacion TEXT,
    descargas_obtenidas INTEGER DEFAULT 0,
    cuentas_creadas INTEGER DEFAULT 0,
    participantes TEXT,
    -- Campos específicos por tipo
    -- Redes sociales / Video / Medios masivos
    plataformas TEXT[],          -- ['Instagram', 'TikTok', 'YouTube', etc]
    alcance_estimado INTEGER,    -- impresiones estimadas
    alcance_real INTEGER,        -- impresiones reales (post-campaña)
    costo_por_resultado NUMERIC(10,2), -- CPR calculado
    clicks INTEGER,
    reproducciones INTEGER,
    likes INTEGER,
    compartidos INTEGER,
    -- Publicidad exterior
    tipo_soporte TEXT,           -- 'Cartel', 'Pantalla digital', 'Vía pública', etc
    ubicacion_soporte TEXT,
    duracion_dias INTEGER,
    -- Campañas presenciales / Patrocinio
    evento TEXT,
    lugar_evento TEXT,
    cantidad_personas_alcanzadas INTEGER,
    materiales_usados TEXT,      -- 'Flyers, remeras, etc'
    nombre_patrocinado TEXT,     -- Para Patrocinio: a quién/qué se patrocinó
    -- Aprendizaje IA
    etiquetas TEXT[],            -- tags libres para la IA
    notas_ai TEXT,               -- espacio para que la IA anote observaciones futuras
    -- Metadata
    creado_por TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE campanas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campanas_empresa_isolation" ON campanas
    USING (empresa_id = (
        SELECT empresa_id FROM usuarios WHERE email = auth.email() LIMIT 1
    ));

-- Índices
CREATE INDEX IF NOT EXISTS idx_campanas_empresa ON campanas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_campanas_tipo ON campanas(tipo);
CREATE INDEX IF NOT EXISTS idx_campanas_fecha ON campanas(fecha_inicio);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_campanas_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campanas_updated_at
    BEFORE UPDATE ON campanas
    FOR EACH ROW EXECUTE FUNCTION update_campanas_updated_at();
