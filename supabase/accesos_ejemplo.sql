-- Accesos. Primero crea al usuario en Supabase: Authentication > Users > Add user (correo + contrasena, marca "Auto Confirm User").
-- Despues autorizalo aqui. Cambia los correos por los reales.

-- Dueno: ve todas las tiendas
INSERT INTO usuarios (email, nombre, rol) VALUES ('TU-CORREO@ejemplo.com', 'Tu nombre', 'dueno')
ON CONFLICT (email) DO UPDATE SET rol = EXCLUDED.rol, activo = true;

-- Gerente: solo ve sus tiendas
INSERT INTO usuarios (email, nombre, rol) VALUES ('gerente.tc42@ejemplo.com', 'Gerente La Victoria', 'gerente')
ON CONFLICT (email) DO UPDATE SET rol = EXCLUDED.rol, activo = true;
INSERT INTO usuario_tiendas (email, clave_muebleria) VALUES ('gerente.tc42@ejemplo.com', 'TC42')
ON CONFLICT DO NOTHING;
