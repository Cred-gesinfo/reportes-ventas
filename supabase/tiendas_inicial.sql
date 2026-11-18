-- Tiendas conocidas. El catalogo completo (m2, plantilla, regional...) se carga despues desde catgen.xlsx.
INSERT INTO tiendas (clave, nombre) VALUES
    ('TC07', 'MINATITLAN'),
    ('TC09', 'COATZACOALCOS'),
    ('TC17', '20 DE NOVIEMBRE'),
    ('TC29', 'CARDEL'),
    ('TC33', 'HUATUSCO'),
    ('TC42', 'LA VICTORIA'),
    ('TC43', 'ESTANZUELA'),
    ('TC70', 'MINATITLAN II')
ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre, actualizado = now();
