-- Migracion: venta por categoria. Correr UNA vez en Supabase > SQL Editor (antes de funciones.sql). Es seguro repetirla.

-- 1) Cada linea de venta guarda su generico (linea+ramo+categoria+tipo del articulo)
ALTER TABLE ventas_detalle ADD COLUMN IF NOT EXISTS generico text;
CREATE INDEX IF NOT EXISTS ix_ventas_generico ON ventas_detalle (generico);

-- 2) Agrupacion de categorias (las mismas sustituciones de tu Power Query). Para agregar otra: INSERT en esta tabla.
CREATE TABLE IF NOT EXISTS categoria_grupos (
    categoria text PRIMARY KEY,      -- nombre tal como viene en el catalogo (se compara sin importar mayusculas)
    grupo     text NOT NULL          -- nombre con el que se muestra
);
INSERT INTO categoria_grupos (categoria, grupo) VALUES
    ('COLCHON ESTANDAR',                          'COLCHONES'),
    ('COLCHON CON COLCHONETA',                    'COLCHONES'),
    ('PAQUETE COLCHON',                           'COLCHONES'),
    ('MINI SPLIT ESTANDAR 110V (SF)',             'MINI SPLIT'),
    ('MINI SPLIT ESTANDAR 220V (SF)',             'MINI SPLIT'),
    ('MINI SPLIT ESTANDAR 110V (HP) FRIO/CALOR',  'MINI SPLIT'),
    ('MINI SPLIT ESTANDAR 220V (HP) FRIO/CALOR',  'MINI SPLIT'),
    ('MINI SPLIT INVERTER 220V (SF)',             'MINI SPLIT'),
    ('MINI SPLIT INVERTER 110V (SF)',             'MINI SPLIT'),
    ('MINI SPLIT INVERTER 110V (HP) FRIO/CALOR',  'MINI SPLIT'),
    ('MINI SPLIT INVERTER 220V (HP) FRIO/CALOR',  'MINI SPLIT')
ON CONFLICT (categoria) DO NOTHING;

-- 3) Seguridad: igual que las demas tablas
ALTER TABLE categoria_grupos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON categoria_grupos FROM anon, authenticated;
