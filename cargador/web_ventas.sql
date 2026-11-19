-- Extraccion de ventas para la web (reportes interactivos).
-- Una fila por folio y articulo. Incluye el dia de hoy (hora de la venta) y las cancelaciones (bajas) en negativo.
-- venta_total = venta CON intereses y sin IVA = ROUND(total / 1.16, 2): es la definicion que ya cuadra con el Flash.
-- vtaretail e intereses se conservan solo para analisis (misma logica que 01_ventas.sql).
-- generico = linea+ramo+categoria+tipo del articulo (para la venta por categoria).
-- NO incluye datos sensibles: sin clave_cuenta (cliente), sin nomina, sin saldos ni enganche.
-- Solo lectura. Compatible con MySQL antiguo (sin CTE ni funciones de ventana).
--
-- Marcadores que reemplaza el cargador (para probar en Navicat, cambialos a mano):
--   {{DESDE}}   primer dia a cargar (incluido)         ej. 2026-11-01
--   {{HASTA1}}  dia siguiente al ultimo dia a cargar   ej. 2026-11-14   (para incluir hoy 13, poner manana)
-- Todas las columnas salen como TEXTO (CAST ... AS CHAR): el driver ODBC desborda con HOUR()/DECIMAL dentro de un UNION
-- (es el mismo problema que ya se corrigio en venta_por_hora.sql). El cargador convierte a numero.
SELECT
    CAST(t.folio_venta AS CHAR)     AS folio_venta,
    CAST(t.codigo AS CHAR)          AS codigo,
    CAST(t.es_baja AS CHAR)         AS es_baja,
    CAST(t.fecha AS CHAR)           AS fecha,
    CAST(t.hr AS CHAR)              AS hr,
    CAST(t.clave_muebleria AS CHAR) AS clave_muebleria,
    CAST(t.clave_vendedor AS CHAR)  AS clave_vendedor,
    CAST(t.tipo_venta AS CHAR)      AS tipo_venta,
    CAST(t.generico AS CHAR)        AS generico,
    CAST(t.cantidad AS CHAR)        AS cantidad,
    CAST(t.venta_total AS CHAR)     AS venta_total,
    CAST(t.vtaretail AS CHAR)       AS vtaretail,
    CAST(t.intereses AS CHAR)       AS intereses,
    CAST(t.costo AS CHAR)           AS costo
FROM (
SELECT
    m.folio_venta,
    m.codigo,
    0 AS es_baja,
    v.fecha_venta AS fecha,
    HOUR(v.hora) AS hr,
    v.clave_muebleria,
    v.clave_vendedor,
    IF(d.responsable_cuenta = 'U001', 'U001', v.tipo_venta) AS tipo_venta,
    CONCAT(a.linea, a.ramo, a.categoria, a.tipo) AS generico,
    CAST(m.cantidad AS SIGNED) AS cantidad,
    ROUND(m.total / 1.16, 2) AS venta_total,
    CASE
        WHEN v.valor_venta - (SELECT SUM(me.total) FROM mercancia_venta me WHERE me.folio_venta = m.folio_venta) BETWEEN -100 AND 100 AND m.interes > 0
            THEN ROUND((m.total - m.interes) / 1.16, 2)
        WHEN v.valor_venta - (SELECT SUM(me.total) FROM mercancia_venta me WHERE me.folio_venta = m.folio_venta) BETWEEN -100 AND 100 AND d.interes_venta > 0
            THEN ROUND((m.total - (m.total / (v.valor_venta - d.interes_venta) * d.interes_venta)) / 1.16, 2)
        ELSE ROUND(m.total / 1.16, 2)
    END AS vtaretail,
    CASE
        WHEN m.interes > 0 THEN ROUND(m.interes / 1.16, 2)
        ELSE ROUND((m.total / (v.valor_venta - d.interes_venta) * d.interes_venta) / 1.16, 2)
    END AS intereses,
    ROUND(m.cantidad * (IFNULL((SELECT MAX(ca.costo_facturacion) FROM costos ca WHERE ca.codigo = m.codigo AND ca.fecha_corte <= v.fecha_venta), a.costo_neto)) / 1.16, 2) AS costo
FROM mercancia_venta AS m
INNER JOIN ventas AS v ON m.folio_venta = v.folio_venta
LEFT JOIN articulos AS a ON a.codigo = m.codigo
LEFT JOIN credito AS d ON d.folio_venta = v.folio_venta
WHERE v.fecha_venta >= '{{DESDE}}' AND v.fecha_venta < '{{HASTA1}}'
  AND v.valor_venta > 0
GROUP BY m.codigo, m.folio_venta

UNION ALL

-- Cancelaciones (bajas): restan en la fecha de la baja, igual que el Flash.
-- La tabla baja no trae hora aqui, asi que la cancelacion se acomoda en la hora de la venta original.
SELECT
    g.folio_venta,
    g.codigo,
    1 AS es_baja,
    baja.fecha AS fecha,
    HOUR(x.hora) AS hr,
    x.clave_muebleria,
    x.clave_vendedor,
    IF(p.responsable_cuenta = 'U001', 'U001', x.tipo_venta) AS tipo_venta,
    CONCAT(tt.linea, tt.ramo, tt.categoria, tt.tipo) AS generico,
    CAST(g.cantidad AS SIGNED) * -1 AS cantidad,
    ROUND(g.total / 1.16, 2) * -1 AS venta_total,
    ROUND(IF(x.tipo_venta = '1I' AND p.responsable_cuenta <> 'U001', (g.total - g.interes) / 1.16, (g.total) / 1.16), 2) * -1 AS vtaretail,
    CASE
        WHEN x.tipo_venta = '1I' AND x.clave_muebleria NOT LIKE 'TCI%' THEN ROUND(g.interes / 1.16, 2) * -1
        ELSE ROUND((g.total / (x.valor_venta - p.interes_venta) * p.interes_venta) / 1.16, 2) * -1
    END AS intereses,
    ROUND(g.cantidad * (IFNULL((SELECT MAX(cz.costo_facturacion) FROM costos cz WHERE cz.codigo = g.codigo AND cz.fecha_corte <= x.fecha_venta), tt.costo_neto)) / 1.16, 2) * -1 AS costo
FROM mercancia_venta AS g
INNER JOIN ventas AS x ON g.folio_venta = x.folio_venta
INNER JOIN baja ON baja.folio_venta = x.folio_venta
LEFT JOIN articulos AS tt ON tt.codigo = g.codigo
LEFT JOIN credito AS p ON p.folio_venta = x.folio_venta
WHERE baja.fecha >= '{{DESDE}}' AND baja.fecha < '{{HASTA1}}'
  AND x.clave_situacion = 'B'
  AND x.valor_venta > 0
GROUP BY g.codigo, g.folio_venta
) AS t
ORDER BY t.fecha, t.clave_muebleria, t.folio_venta, t.codigo
