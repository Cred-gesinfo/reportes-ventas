# Reportes de venta (Crediland)

Web de reportes de venta con inicio de sesion: el dueno ve todas las tiendas y cada gerente solo las suyas.
Muestra venta del dia (con hora) y acumulado del mes, por tienda, forma de pago, categoria y vendedor, contra el anio pasado.
Incluye clientes, cuota (venta completa del anio pasado: dia o mes) y alcance, y una grafica del avance del mes a dias iguales.
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
Instalacion nueva:
1. `supabase/schema.sql`
2. `supabase/funciones.sql`
3. `supabase/tiendas_inicial.sql`

Si ya tenias la base (version anterior), corre solo:
1. `supabase/migracion_categorias.sql` (agrega el generico a las ventas y la agrupacion de categorias)
2. `supabase/migracion_clientes.sql` (agrega la cuenta del cliente, solo para contar clientes distintos)
3. `supabase/funciones.sql` (cuota, filtro por forma de pago, meta por hora, categorias, clientes)

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
1. `subir_catalogos.ps1` (nombres de vendedores y catalogo de categorias)
2. `subir_ventas.ps1 -CargaInicial` (una sola vez; si ya la habias corrido, repitela una vez para llenar la categoria de cada venta)
3. `instalar_tareas_web.ps1` (tareas: cada hora, cada dia el mes completo, cada dia catalogos)

## Reglas de negocio (donde cambiarlas)
- Forma de pago por tipo de venta: tabla `formas_pago` (SQL). Ej. mover U001 (Credibips) a otra categoria.
- Comparativos de la vista *Dia*: *mismo dia de la semana* (364 dias antes) o *misma fecha* (un anio antes). El *Acumulado* siempre es a fechas iguales (1 al N del mes vs 1 al N del mes del anio pasado).
- Tiendas cerradas: `UPDATE tiendas SET activa = false WHERE clave = 'TC__';` (se excluyen de los reportes, como en Telegram).
- Cuota: venta COMPLETA del anio pasado (el mismo dia completo, o el mes completo en el acumulado), con los mismos filtros. Alcance = venta / cuota.
- Clientes = cuentas distintas (clave_cuenta; nunca se muestra, solo se cuenta). Tickets = ventas.
- Indice de venta = piezas por ticket (unidades / tickets).
- Venta por hora: tabla ACUMULADA (meta acumulada del anio pasado, venta acumulada, % de alcance, monto y % faltante).
- Pestanas: Dia, Acumulado (mes) y Anio (1 de enero a la fecha). Los acumulados son siempre a fechas iguales. La cuota del anio es el anio pasado completo; la grafica del anio es por mes.
- Pantalla de carga (engrane + % estimado): aparece al cambiar filtros, botones de forma de pago o pestana, si tarda mas de 0.3 s. El % se estima con lo que suele tardar cada pantalla en ese navegador (`src/lib/carga.ts`).
- Pestana Indicadores: el reporte mensual de las tiendas (ventas, unidades, forma de pago, ticket promedio, venta por empleado, indice de venta y venta por m2), al cierre de ayer, contra el mes COMPLETO del anio pasado. Boton Imprimir / PDF. La plantilla y los m2 salen de `tiendas` (`supabase/tiendas_catalogo.sql`).
- Colores por pestana: Dia (azul/verde Crediland), Acumulado (violeta) y Anio (naranja) en `src/app/globals.css` (clases `.acum` y `.anio`).
- Venta por hora: la meta de cada hora es lo vendido el anio pasado en esa hora (dia completo).
- La pagina se recarga sola cuando se suben datos nuevos (consulta cada minuto la hora de la ultima carga).
- Categorias agrupadas (COLCHONES, MINI SPLIT...): tabla `categoria_grupos` (SQL).
- Para el dia de hoy solo cuentan las horas completas (igual que el reporte de Telegram).
