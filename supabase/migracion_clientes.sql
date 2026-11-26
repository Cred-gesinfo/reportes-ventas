-- Migracion: clientes unicos (por clave de cuenta). Correr UNA vez en Supabase > SQL Editor (antes de funciones.sql). Es seguro repetirla.
-- La cuenta solo se usa para CONTAR clientes distintos; la web nunca la muestra.
ALTER TABLE ventas_detalle ADD COLUMN IF NOT EXISTS cuenta text;
