-- Catalogo de vendedores para la web. NO incluye nomina ni datos personales (solo clave, nombre, ingreso y vigencia).
-- Todas las columnas como texto (CAST ... AS CHAR) por el mismo motivo que web_ventas.sql.
SELECT
    CAST(clave_vendedor AS CHAR) AS clave_vendedor,
    CAST(CONCAT_WS(' ', nombre, paterno, materno) AS CHAR) AS nombre,
    CAST(fecha_ingreso AS CHAR) AS fecha_ingreso,
    CAST(vigente AS CHAR) AS vigente
FROM vendedores
WHERE fecha_ingreso > '2010-01-01'
   OR vigente = 1
