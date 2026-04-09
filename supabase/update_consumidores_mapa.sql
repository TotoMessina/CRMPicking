-- Añadir soporte para coordenadas geográficas en la tabla consumidores
ALTER TABLE public.consumidores 
ADD COLUMN IF NOT EXISTS lat float8,
ADD COLUMN IF NOT EXISTS lng float8;

-- Comentario informativo
COMMENT ON COLUMN public.consumidores.lat IS 'Latitud para geolocalización en el mapa';
COMMENT ON COLUMN public.consumidores.lng IS 'Longitud para geolocalización en el mapa';
