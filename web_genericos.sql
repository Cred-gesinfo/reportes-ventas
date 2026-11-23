-- Catalogo de categorias (genericos) para la web: una fila por linea+ramo+categoria+tipo, con sus descripciones.
-- Misma logica que 09_generico.sql, pero SIN limitarse a articulos con inventario/pedidos recientes
-- (asi tambien salen articulos que ya no se surten pero se vendieron). Todo como texto por el driver ODBC.
SELECT
    CAST(CONCAT(res.linea_cod, res.ramo_cod, res.cat_cod, res.tipo_cod) AS CHAR) AS generico,
    CAST(res.desc_linea AS CHAR)     AS linea,
    CAST(res.desc_ramo AS CHAR)      AS ramo,
    CAST(res.desc_categoria AS CHAR) AS categoria,
    CAST(res.desc_tipo AS CHAR)      AS tipo,
    CAST(CASE
        WHEN res.desc_categoria IN (
            'ANTECOMEDORES DE MADERA', 'ESTUFAS', 'REFRIGERADOR DE UNA Y DOS PUERTAS',
            'LAVADORAS AUTOMATICAS', 'LAVADORAS COMPACTAS Y SEMI-AUTOMATICAS',
            'SALAS', 'RECAMARAS', 'PANTALLA LED', 'AUDIO CASA',
            'ANTECOMEDORES TUBULARES', 'MUEBLES MULTIUSO', 'MUEBLES DE RECAMARA',
            'CAMAS', 'LITERAS', 'COCINAS INTEGRALES'
        ) THEN 1
        WHEN res.desc_categoria LIKE '%colchon%' THEN 1
        WHEN res.desc_categoria LIKE '%comput%' THEN 1
        WHEN res.desc_categoria LIKE '%celu%' THEN 1
        ELSE 0
    END AS CHAR) AS categoprior
FROM (
    SELECT
        a.linea AS linea_cod,
        a.ramo AS ramo_cod,
        a.categoria AS cat_cod,
        a.tipo AS tipo_cod,
        MAX(CASE WHEN o.ramo = '00' AND o.categoria = '00' AND o.tipo = '00' THEN o.descripcion END) AS desc_linea,
        MAX(CASE WHEN o.ramo = a.ramo AND o.categoria = '00' AND o.tipo = '00' THEN o.descripcion END) AS desc_ramo,
        MAX(CASE WHEN o.ramo = a.ramo AND o.categoria = a.categoria AND o.tipo = '00' THEN o.descripcion END) AS desc_categoria,
        MAX(CASE WHEN o.ramo = a.ramo AND o.categoria = a.categoria AND o.tipo = a.tipo THEN o.descripcion END) AS desc_tipo
    FROM articulos a
    LEFT JOIN orden_generico o ON o.linea = a.linea
    GROUP BY a.linea, a.ramo, a.categoria, a.tipo
) res
