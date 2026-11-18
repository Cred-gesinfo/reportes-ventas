# Reportes de venta (Crediland)

Web de reportes de venta con inicio de sesion: el dueno ve todas las tiendas y cada gerente solo las suyas.
Muestra venta del dia (con hora), acumulado del mes o del Buen Fin, por tienda, forma de pago y vendedor, contra el anio pasado.
Venta = **con intereses y sin IVA**, neta de cancelaciones (la misma cifra que el Flash).

```
MySQL (oficina) --subir_ventas.ps1--> Supabase (Postgres + login) <--- Next.js en Vercel (esta web)
```

La base de MySQL nunca se expone a internet: la computadora de la oficina sube cifras por HTTPS.

## Carpetas
- `src/`        la web (Next.js)
- `supabase/`   SQL de la base: `schema.sql`, `funciones.sql`, `tiendas_inicial.sql`, `accesos_ejemplo.sql`
- `cargador/`   scripts de la computadora de la oficina (PowerShell). **No** se publican llaves: `web_config.json` esta en `.gitignore`

## 1. Base de datos (Supabase > SQL Editor, en este orden)
1. `supabase/schema.sql` (si ya lo corriste, omitelo)
2. `supabase/funciones.sql`
3. `supabase/tiendas_inicial.sql`

## 2. Usuarios
1. Supabase > Authentication > Users > **Add user** (correo + contrasena, marca *Auto Confirm User*).
2. Autorizalo en SQL Editor siguiendo `supabase/accesos_ejemplo.sql` (rol `dueno` o `gerente` + sus tiendas).
   Un usuario que inicia sesion pero no esta en `usuarios` ve "Sin acceso".

## 3. Publicar en Vercel
1. Sube este contenido al repositorio de GitHub.
2. En Vercel: **Add New > Project**, elige el repositorio (framework: Next.js, sin cambiar nada).
3. En **Environment Variables** agrega (ver `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  (llave publica: Publishable o anon)
   - `SUPABASE_SERVICE_KEY`  (llave de servidor: Secret o service_role; nunca con prefijo `NEXT_PUBLIC`)
4. **Deploy**. Cada vez que subas cambios a GitHub, Vercel republica solo.

Importante: las variables `NEXT_PUBLIC_*` se incorporan al compilar; si las cambias, hay que volver a desplegar.

## 4. Cargador (computadora de la oficina)
Copia `cargador/` a `C:\vtahora\` y crea ahi `web_config.json` (ver `subir_ventas.ps1`). Orden:
1. `subir_ventas.ps1 -CargaInicial` (una sola vez)
2. `subir_catalogos.ps1` (nombres de vendedores)
3. `instalar_tareas_web.ps1` (tareas: cada hora, cada dia el mes completo, cada dia catalogos)

## Reglas de negocio (donde cambiarlas)
- Forma de pago por tipo de venta: tabla `formas_pago` (SQL). Ej. mover U001 (Credibips) a otra categoria.
- Periodos de eventos (Buen Fin): `src/lib/eventos.ts`.
- Comparativos: *mismo dia de la semana* (364 dias antes), *misma fecha* (un anio antes) y *evento* (dia N contra dia N del evento anterior).
- Para el dia de hoy solo cuentan las horas completas (igual que el reporte de Telegram).
