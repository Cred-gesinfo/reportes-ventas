-- Datos de las tiendas (de catgen.xlsx): plantilla y metros cuadrados para "venta por empleado" y "venta por m2".
-- Solo actualiza los datos descriptivos; NO cambia el nombre que ya usa la web ni si la tienda esta activa o cerrada.
-- Los m2 son los de EXHIBICION (asi lo calcula el reporte de indicadores). NULL = sin dato (esa tienda mostrara "-").
-- Para cambiar la plantilla de una tienda:  UPDATE tiendas SET plantilla = 6 WHERE clave = 'TC17';
INSERT INTO tiendas (clave, nombre, plaza, estado, status, regional, m2_exhibicion, m2_bodega, cadena, ciudad, plantilla) VALUES
    ('TC07', 'MINATITLAN I', 'Coatza+Mina', 'Veracruz', 'Regular', 'Pedro Acosta Fragoso', 797.14, 0, 'Tiendas', 'Minatitlan', 5),
    ('TC09', 'COATZACOALCOS I', 'Coatza+Mina', 'Veracruz', 'Regular', 'Pedro Acosta Fragoso', 750, 224.53, 'Tiendas', 'Coatzacoalcos', 6),
    ('TC17', '20 DE NOVIEMBRE', 'Xalapa - Coatepec', 'Veracruz', 'Regular', 'Pedro Acosta Fragoso', 950, 30, 'Tiendas', 'Xalapa', 5),
    ('TC29', 'CARDEL', 'Xalapa - Coatepec', 'Veracruz', 'Cerrada reciente', 'Pedro Acosta Fragoso', 161.75, 8.15, 'Tiendas', 'Cardel', 2),
    ('TC33', 'HUATUSCO', 'Cord.+Oriz.+Huat', 'Veracruz', 'Regular', 'Pedro Acosta Fragoso', 335.82, 31.8, 'Tiendas', 'Huatusco', 4),
    ('TC42', 'LA VICTORIA', 'Xalapa - Coatepec', 'Veracruz', 'Regular', 'Pedro Acosta Fragoso', 900, 195.92, 'Tiendas', 'Xalapa', 6),
    ('TC43', 'ESTANZUELA', 'Xalapa - Coatepec', 'Veracruz', 'Regular', NULL, NULL, NULL, 'Tiendas', 'Xalapa', NULL),
    ('TC70', 'MINATITLAN II', 'Coatza+Mina', 'Veracruz', 'Regular', 'Pedro Acosta Fragoso', 700, 266.73, 'Tiendas', 'Minatitlan', 7)
ON CONFLICT (clave) DO UPDATE SET
    plaza = EXCLUDED.plaza, estado = EXCLUDED.estado, status = EXCLUDED.status, regional = EXCLUDED.regional,
    m2_exhibicion = EXCLUDED.m2_exhibicion, m2_bodega = EXCLUDED.m2_bodega, cadena = EXCLUDED.cadena,
    ciudad = EXCLUDED.ciudad, plantilla = EXCLUDED.plantilla, actualizado = now();
