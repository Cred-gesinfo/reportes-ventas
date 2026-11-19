-- Tiendas conocidas. El catalogo completo (m2, plantilla, regional...) se carga despues desde catgen.xlsx.
-- activa = false: tienda cerrada; se excluye de los reportes (igual que TiendasExcluidas en el reporte de Telegram).
INSERT INTO tiendas (clave, nombre, activa) VALUES
    ('TC07', 'MINATITLAN',      true),
    ('TC09', 'COATZACOALCOS',   true),
    ('TC17', '20 DE NOVIEMBRE', true),
    ('TC29', 'CARDEL',          false),
    ('TC33', 'HUATUSCO',        true),
    ('TC42', 'LA VICTORIA',     true),
    ('TC43', 'ESTANZUELA',      true),
    ('TC70', 'MINATITLAN II',   true)
ON CONFLICT (clave) DO UPDATE SET nombre = EXCLUDED.nombre, activa = EXCLUDED.activa, actualizado = now();
