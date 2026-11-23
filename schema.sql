-- Esquema Postgres para los reportes web (Neon / Vercel Postgres / Supabase).
-- Fase 1: ventas, tiendas, vendedores, productos y accesos. Sin datos sensibles (sin cuenta de cliente, sin nomina).

-- ---------- Catalogos ----------
CREATE TABLE IF NOT EXISTS tiendas (
    clave            text PRIMARY KEY,            -- TC07, TC43...
    nombre           text NOT NULL,               -- MINATITLAN I
    plaza            text,
    estado           text,
    regional         text,
    status           text,                        -- Regular / Cerrada / Cerrada reciente
    cadena           text,                        -- Tiendas / Mayoristas
    ciudad           text,
    m2_exhibicion    numeric(10,2),
    m2_bodega        numeric(10,2),
    plantilla        integer,                     -- empleados; solo donde este capturado
    activa           boolean NOT NULL DEFAULT true,
    actualizado      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendedores (
    clave_vendedor   text PRIMARY KEY,
    nombre           text NOT NULL,
    fecha_ingreso    date,
    vigente          boolean NOT NULL DEFAULT true,
    actualizado      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS genericos (
    generico         text PRIMARY KEY,            -- linea+ramo+categoria+tipo
    linea            text,
    ramo             text,
    categoria        text,
    tipo             text,
    categoprior      smallint NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS productos (
    codigo           text PRIMARY KEY,
    generico         text REFERENCES genericos (generico),
    descripcion      text,
    marca            text,
    numero_parte     text,
    precio_map       numeric(12,2),
    id_rango         smallint
);

-- Regla unica de forma de pago (se corrige aqui, sin tocar codigo).
CREATE TABLE IF NOT EXISTS formas_pago (
    tipo_venta       text PRIMARY KEY,
    forma_pago       text NOT NULL,               -- Contado / Credito directo / Institucional / Otro
    detalle          text
);
INSERT INTO formas_pago (tipo_venta, forma_pago, detalle) VALUES
    ('0E',   'Contado',         'Contado'),
    ('0T',   'Contado',         'Contado'),
    ('0D',   'Contado',         'Contado resto'),
    ('1D',   'Credito directo', 'Credito directo'),
    ('1I',   'Institucional',   'Institucional'),
    ('U001', 'Institucional',   'Credibips')
ON CONFLICT (tipo_venta) DO NOTHING;

-- ---------- Hechos ----------
-- Una fila por folio y articulo. Las cancelaciones (es_baja) van en negativo y en la fecha de la baja.
CREATE TABLE IF NOT EXISTS ventas_detalle (
    folio_venta      text        NOT NULL,
    codigo           text        NOT NULL,
    es_baja          boolean     NOT NULL DEFAULT false,
    fecha            date        NOT NULL,
    hr               smallint,                    -- hora de la venta (0-23)
    clave_muebleria  text        NOT NULL,
    clave_vendedor   text,
    tipo_venta       text,
    generico         text,                        -- linea+ramo+categoria+tipo del articulo
    cuenta           text,                        -- clave de cuenta del cliente: solo para contar clientes distintos (no se muestra)
    cantidad         integer     NOT NULL,
    venta_total      numeric(14,2) NOT NULL,      -- CON intereses y sin IVA (la cifra oficial)
    vtaretail        numeric(14,2),
    intereses        numeric(14,2),
    costo            numeric(14,2),
    cargado          timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (folio_venta, codigo, es_baja, fecha)
);
CREATE INDEX IF NOT EXISTS ix_ventas_fecha       ON ventas_detalle (fecha);
CREATE INDEX IF NOT EXISTS ix_ventas_tienda_fec  ON ventas_detalle (clave_muebleria, fecha);
CREATE INDEX IF NOT EXISTS ix_ventas_vend_fec    ON ventas_detalle (clave_vendedor, fecha);

-- Vista que usa la web: ya trae forma de pago, tienda y vendedor.
CREATE OR REPLACE VIEW v_ventas WITH (security_invoker = true) AS
SELECT
    d.*,
    COALESCE(f.forma_pago, 'Otro')          AS forma_pago,
    f.detalle                               AS forma_pago_detalle,
    t.nombre                                AS tienda,
    t.m2_exhibicion,
    t.plantilla,
    COALESCE(v.nombre, 'SIN VENDEDOR')      AS vendedor,
    p.descripcion                           AS producto,
    g.linea, g.categoria, g.categoprior
FROM ventas_detalle d
LEFT JOIN formas_pago f ON f.tipo_venta = d.tipo_venta
LEFT JOIN tiendas     t ON t.clave = d.clave_muebleria
LEFT JOIN vendedores  v ON v.clave_vendedor = d.clave_vendedor
LEFT JOIN productos   p ON p.codigo = d.codigo
LEFT JOIN genericos   g ON g.generico = p.generico;

-- Bitacora: de aqui sale "ultima actualizacion" y el aviso si la carga se atrasa.
CREATE TABLE IF NOT EXISTS carga_log (
    id               bigserial PRIMARY KEY,
    tabla            text NOT NULL,
    desde            date,
    hasta            date,
    filas            integer,
    ok               boolean NOT NULL,
    mensaje          text,
    terminado        timestamptz NOT NULL DEFAULT now()
);

-- ---------- Accesos ----------
-- Dueno ve todo; cada gerente solo sus tiendas.
CREATE TABLE IF NOT EXISTS usuarios (
    email            text PRIMARY KEY,
    nombre           text,
    rol              text NOT NULL CHECK (rol IN ('dueno', 'gerente')),
    activo           boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS usuario_tiendas (
    email            text NOT NULL REFERENCES usuarios (email) ON DELETE CASCADE,
    clave_muebleria  text NOT NULL REFERENCES tiendas (clave),
    PRIMARY KEY (email, clave_muebleria)
);

-- ---------- Seguridad (Supabase) ----------
-- Nada de estas tablas se lee desde el navegador: la web consulta desde el servidor y filtra por tienda segun el usuario.
-- Con RLS activo y sin permisos para anon/authenticated, la llave publica no puede leer ni escribir nada.
ALTER TABLE tiendas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE genericos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE formas_pago      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas_detalle   ENABLE ROW LEVEL SECURITY;
ALTER TABLE carga_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_tiendas  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- ---------- Categorias (ver migracion_categorias.sql) ----------
CREATE TABLE IF NOT EXISTS categoria_grupos (
    categoria text PRIMARY KEY,
    grupo     text NOT NULL
);
INSERT INTO categoria_grupos (categoria, grupo) VALUES
    ('COLCHON ESTANDAR', 'COLCHONES'), ('COLCHON CON COLCHONETA', 'COLCHONES'), ('PAQUETE COLCHON', 'COLCHONES'),
    ('MINI SPLIT ESTANDAR 110V (SF)', 'MINI SPLIT'), ('MINI SPLIT ESTANDAR 220V (SF)', 'MINI SPLIT'),
    ('MINI SPLIT ESTANDAR 110V (HP) FRIO/CALOR', 'MINI SPLIT'), ('MINI SPLIT ESTANDAR 220V (HP) FRIO/CALOR', 'MINI SPLIT'),
    ('MINI SPLIT INVERTER 220V (SF)', 'MINI SPLIT'), ('MINI SPLIT INVERTER 110V (SF)', 'MINI SPLIT'),
    ('MINI SPLIT INVERTER 110V (HP) FRIO/CALOR', 'MINI SPLIT'), ('MINI SPLIT INVERTER 220V (HP) FRIO/CALOR', 'MINI SPLIT')
ON CONFLICT (categoria) DO NOTHING;
ALTER TABLE categoria_grupos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON categoria_grupos FROM anon, authenticated;
