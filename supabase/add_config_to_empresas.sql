-- Ejecutar en el Editor SQL de Supabase
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{
  "app": { "name": "InsideUp CRM", "shortName": "InsideUp", "logoUrl": "/inside-logo.png" },
  "ai": { "name": "CoqueBot", "role": "tu copiloto de ventas" },
  "theme": {
    "colors": {
      "primary": "#8b5cf6",
      "primaryLight": "#a78bfa",
      "primaryDark": "#7c3aed",
      "accent": "#d946ef"
    }
  }
}'::jsonb;
