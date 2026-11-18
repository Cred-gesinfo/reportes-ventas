-- Consultas de la web. Una sola llamada devuelve todo el reporte (total, por tienda, forma de pago, vendedor y hora) como JSON.
-- A = periodo actual, L = periodo comparable (anio pasado). Solo se ejecutan desde el servidor de la web (llave de servidor).
--
--   p_a_desde / p_a_hasta   rango actual (incluidos)
--   p_l_desde / p_l_hasta   rango comparable (incluidos)
--   p_corte                 si no es NULL, el ULTIMO dia de cada rango solo cuenta horas menores a este valor (igual que el reporte de Telegram)
--   p_tiendas               NULL = todas; o arreglo de claves (para gerentes)
CREATE OR REPLACE FUNCTION rpt_ventas(
    p_a_desde date, p_a_hasta date,
    p_l_desde date, p_l_hasta date,
    p_corte   integer DEFAULT NULL,
    p_tiendas text[]  DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE
AS $$
WITH x AS (
    SELECT * FROM (
        SELECT
            CASE
                WHEN d.fecha BETWEEN p_a_desde AND p_a_hasta
                     AND (p_corte IS NULL OR d.fecha < p_a_hasta OR d.hr < p_corte) THEN 'a'
                WHEN d.fecha BETWEEN p_l_desde AND p_l_hasta
                     AND (p_corte IS NULL OR d.fecha < p_l_hasta OR d.hr < p_corte) THEN 'l'
            END AS per,
            d.clave_muebleria AS tienda,
            d.clave_vendedor  AS vend,
            d.hr,
            COALESCE(f.forma_pago, 'Otro') AS forma,
            d.venta_total,
            d.cantidad,
            CASE WHEN NOT d.es_baja THEN d.folio_venta END AS folio
        FROM ventas_detalle d
        LEFT JOIN formas_pago f ON f.tipo_venta = d.tipo_venta
        WHERE (d.fecha BETWEEN p_a_desde AND p_a_hasta OR d.fecha BETWEEN p_l_desde AND p_l_hasta)
          AND (p_tiendas IS NULL OR d.clave_muebleria = ANY (p_tiendas))
    ) s
    WHERE s.per IS NOT NULL
)
SELECT jsonb_build_object(
    'total', (
        SELECT jsonb_build_object(
            'a',  COALESCE(sum(venta_total) FILTER (WHERE per = 'a'), 0),
            'l',  COALESCE(sum(venta_total) FILTER (WHERE per = 'l'), 0),
            'ua', COALESCE(sum(cantidad)    FILTER (WHERE per = 'a'), 0),
            'ul', COALESCE(sum(cantidad)    FILTER (WHERE per = 'l'), 0),
            'ta', count(DISTINCT folio)     FILTER (WHERE per = 'a'),
            'tl', count(DISTINCT folio)     FILTER (WHERE per = 'l'))
        FROM x),
    'tiendas', (
        SELECT COALESCE(jsonb_agg(r ORDER BY r.a DESC, r.l DESC), '[]'::jsonb) FROM (
            SELECT x.tienda AS clave, COALESCE(t.nombre, x.tienda) AS nombre,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'a'), 0) AS a,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'l'), 0) AS l,
                   COALESCE(sum(x.cantidad)    FILTER (WHERE x.per = 'a'), 0) AS ua,
                   COALESCE(sum(x.cantidad)    FILTER (WHERE x.per = 'l'), 0) AS ul,
                   count(DISTINCT x.folio)     FILTER (WHERE x.per = 'a') AS ta,
                   count(DISTINCT x.folio)     FILTER (WHERE x.per = 'l') AS tl
            FROM x LEFT JOIN tiendas t ON t.clave = x.tienda
            GROUP BY x.tienda, t.nombre) r),
    'formas', (
        SELECT COALESCE(jsonb_agg(r ORDER BY r.a DESC, r.l DESC), '[]'::jsonb) FROM (
            SELECT x.forma AS nombre,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'a'), 0) AS a,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'l'), 0) AS l,
                   COALESCE(sum(x.cantidad)    FILTER (WHERE x.per = 'a'), 0) AS ua,
                   COALESCE(sum(x.cantidad)    FILTER (WHERE x.per = 'l'), 0) AS ul
            FROM x GROUP BY x.forma) r),
    'vendedores', (
        SELECT COALESCE(jsonb_agg(r ORDER BY r.a DESC, r.l DESC), '[]'::jsonb) FROM (
            SELECT COALESCE(x.vend, '') AS clave,
                   COALESCE(v.nombre, CASE WHEN x.vend IS NULL THEN 'SIN VENDEDOR' ELSE 'Vendedor ' || x.vend END) AS nombre,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'a'), 0) AS a,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'l'), 0) AS l,
                   COALESCE(sum(x.cantidad)    FILTER (WHERE x.per = 'a'), 0) AS ua,
                   COALESCE(sum(x.cantidad)    FILTER (WHERE x.per = 'l'), 0) AS ul,
                   count(DISTINCT x.folio)     FILTER (WHERE x.per = 'a') AS ta
            FROM x LEFT JOIN vendedores v ON v.clave_vendedor = x.vend
            GROUP BY x.vend, v.nombre) r),
    'horas', (
        SELECT COALESCE(jsonb_agg(r ORDER BY r.hr), '[]'::jsonb) FROM (
            SELECT x.hr,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'a'), 0) AS a,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'l'), 0) AS l
            FROM x WHERE x.hr IS NOT NULL GROUP BY x.hr) r)
);
$$;

-- Solo el servidor (llave de servidor) puede ejecutarla.
REVOKE ALL ON FUNCTION rpt_ventas(date, date, date, date, integer, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpt_ventas(date, date, date, date, integer, text[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION rpt_ventas(date, date, date, date, integer, text[]) TO service_role;
