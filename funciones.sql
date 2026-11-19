-- Consultas de la web. Una sola llamada devuelve todo el reporte como JSON.
-- A = periodo actual, L = periodo comparable (anio pasado). Solo se ejecutan desde el servidor de la web (llave de servidor).
--
--   p_a_desde / p_a_hasta   rango actual (incluidos)
--   p_l_desde / p_l_hasta   rango comparable (incluidos)
--   p_corte                 si no es NULL, el ULTIMO dia de cada rango solo cuenta horas menores a este valor
--   p_tiendas               NULL = todas; o arreglo de claves (para gerentes)
--   p_l_fin                 fin del periodo COMPLETO del anio pasado (para la cuota y la grafica). NULL = p_l_hasta
--                           Dia: el mismo dia completo. Acumulado: el ultimo dia del mes del anio pasado.
-- Las tiendas con activa = false (cerradas, ej. TC29 Cardel) se excluyen de todo.
--
-- Devuelve: total {a,l,ua,ul,ta,tl}, cuota (anio pasado COMPLETO, sin corte de hora), tiendas, formas, vendedores,
--           categorias, horas, dias (venta por dia del mes: a = este anio, l = anio pasado completo).
DROP FUNCTION IF EXISTS rpt_ventas(date, date, date, date, integer, text[]);
DROP FUNCTION IF EXISTS rpt_ventas(date, date, date, date, integer, text[], date);

CREATE OR REPLACE FUNCTION rpt_ventas(
    p_a_desde date, p_a_hasta date,
    p_l_desde date, p_l_hasta date,
    p_corte   integer DEFAULT NULL,
    p_tiendas text[]  DEFAULT NULL,
    p_l_fin   date    DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE
AS $$
WITH base AS (
    SELECT
        d.fecha,
        d.hr,
        d.clave_muebleria AS tienda,
        d.clave_vendedor  AS vend,
        COALESCE(f.forma_pago, 'Otro') AS forma,
        COALESCE(cg.grupo, g.categoria, 'SIN CATEGORIA') AS cat,
        d.venta_total,
        d.cantidad,
        CASE WHEN NOT d.es_baja THEN d.folio_venta END AS folio
    FROM ventas_detalle d
    LEFT JOIN formas_pago f       ON f.tipo_venta = d.tipo_venta
    LEFT JOIN tiendas ti          ON ti.clave = d.clave_muebleria
    LEFT JOIN genericos g         ON g.generico = d.generico
    LEFT JOIN categoria_grupos cg ON upper(cg.categoria) = upper(g.categoria)
    WHERE (d.fecha BETWEEN p_a_desde AND p_a_hasta
           OR d.fecha BETWEEN p_l_desde AND COALESCE(p_l_fin, p_l_hasta))
      AND COALESCE(ti.activa, true)
      AND (p_tiendas IS NULL OR d.clave_muebleria = ANY (p_tiendas))
), x AS (
    SELECT * FROM (
        SELECT b.*,
            CASE
                WHEN b.fecha BETWEEN p_a_desde AND p_a_hasta
                     AND (p_corte IS NULL OR b.fecha < p_a_hasta OR b.hr < p_corte) THEN 'a'
                WHEN b.fecha BETWEEN p_l_desde AND p_l_hasta
                     AND (p_corte IS NULL OR b.fecha < p_l_hasta OR b.hr < p_corte) THEN 'l'
            END AS per
        FROM base b
    ) s WHERE s.per IS NOT NULL
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
    'cuota', (
        SELECT COALESCE(sum(venta_total), 0) FROM base
        WHERE fecha BETWEEN p_l_desde AND COALESCE(p_l_fin, p_l_hasta)),
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
    'categorias', (
        SELECT COALESCE(jsonb_agg(r ORDER BY r.a DESC, r.l DESC), '[]'::jsonb) FROM (
            SELECT x.cat AS nombre,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'a'), 0) AS a,
                   COALESCE(sum(x.venta_total) FILTER (WHERE x.per = 'l'), 0) AS l,
                   COALESCE(sum(x.cantidad)    FILTER (WHERE x.per = 'a'), 0) AS ua,
                   COALESCE(sum(x.cantidad)    FILTER (WHERE x.per = 'l'), 0) AS ul
            FROM x GROUP BY x.cat) r),
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
            FROM x WHERE x.hr IS NOT NULL GROUP BY x.hr) r),
    -- Venta por dia del mes, a dias iguales: el dia N de este anio contra el dia N del anio pasado (anio pasado COMPLETO, sin corte de hora)
    'dias', (
        SELECT COALESCE(jsonb_agg(r ORDER BY r.d), '[]'::jsonb) FROM (
            SELECT EXTRACT(day FROM b.fecha)::int AS d,
                   COALESCE(sum(b.venta_total) FILTER (
                       WHERE b.fecha BETWEEN p_a_desde AND p_a_hasta
                         AND (p_corte IS NULL OR b.fecha < p_a_hasta OR b.hr < p_corte)), 0) AS a,
                   COALESCE(sum(b.venta_total) FILTER (
                       WHERE b.fecha BETWEEN p_l_desde AND COALESCE(p_l_fin, p_l_hasta)), 0) AS l
            FROM base b GROUP BY 1) r)
);
$$;

-- Solo el servidor (llave de servidor) puede ejecutarla.
REVOKE ALL ON FUNCTION rpt_ventas(date, date, date, date, integer, text[], date) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpt_ventas(date, date, date, date, integer, text[], date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION rpt_ventas(date, date, date, date, integer, text[], date) TO service_role;
