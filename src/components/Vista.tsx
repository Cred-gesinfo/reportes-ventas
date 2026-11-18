import Link from "next/link";
import { obtenerAcceso } from "@/lib/acceso";
import { consultar, ahoraMx, ultimaActualizacion, type Modo } from "@/lib/reporte";
import { eventoDe } from "@/lib/eventos";
import { pesos, dif, num, varPct, clase, rangoLargo, haceCuanto } from "@/lib/format";
import { cerrarSesion } from "@/app/acciones";
import { Tabla } from "./Tabla";
import { Horas } from "./Horas";

type SP = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function Vista({ sp, acumulado }: { sp: SP; acumulado: boolean }) {
  const acceso = await obtenerAcceso();
  if (!acceso || !acceso.tiendas.length) {
    return (
      <main className="login">
        <div className="tarjeta">
          <h1>Sin acceso</h1>
          <p>Tu cuenta todavía no tiene tiendas asignadas. Pide que te den de alta en el sistema.</p>
          <form action={cerrarSesion}>
            <button type="submit">Salir</button>
          </form>
        </div>
      </main>
    );
  }

  const { hoy } = ahoraMx();
  const fechaIn = uno(sp.fecha);
  const fecha = fechaIn && /^\d{4}-\d{2}-\d{2}$/.test(fechaIn) ? fechaIn : hoy;
  const evDia = eventoDe(fecha);
  const modoIn = uno(sp.modo);
  const modo: Modo = modoIn === "semana" || modoIn === "fecha" || modoIn === "evento" ? modoIn : evDia ? "evento" : "semana";
  const tiendaIn = uno(sp.tienda);
  const claves = acceso.tiendas.map((t) => t.clave);
  const seleccion = tiendaIn && claves.includes(tiendaIn) ? [tiendaIn] : null;
  // Dueño: null = todas. Gerente: siempre acotado a sus tiendas.
  const tiendas = seleccion ?? (acceso.rol === "dueno" ? null : claves);
  const hIn = Number(uno(sp.h));

  const [{ r, ev, modo: modoEf, aDesde, lDesde, lHasta, corte }, actualizado] = await Promise.all([
    consultar({ fecha, modo, acumulado, tiendas, hastaHora: Number.isFinite(hIn) && hIn > 0 ? hIn : undefined }),
    ultimaActualizacion(),
  ]);

  const rojo = modoEf === "evento";
  const ay = !acumulado && fecha === hoy ? "Hoy" : "Actual";
  const ly = "Año pasado";
  const t = r.total;
  const ticketA = t.ta ? t.a / t.ta : 0;
  const ticketL = t.tl ? t.l / t.tl : 0;
  const etiquetaModo =
    modoEf === "evento" && ev
      ? acumulado
        ? `${ev.corto}: del día 1 al día ${ev.dia} de ${ev.total}, contra los mismos días del evento anterior`
        : `${ev.corto}: día ${ev.dia} de ${ev.total} contra el mismo día del evento anterior`
    : modoEf === "fecha" ? "Misma fecha del año pasado"
    : "Mismo día de la semana del año pasado";
  const vacio = !t.a && !t.l;
  const q = (extra: Record<string, string>) => new URLSearchParams({ fecha, modo: modoEf, ...(seleccion ? { tienda: seleccion[0] } : {}), ...extra }).toString();

  return (
    <div className={rojo ? "evento" : ""}>
      <header className="top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Crediland" className="logo" />
        <nav>
          <Link href={`/?${q({})}`} className={!acumulado ? "activo" : ""}>Día</Link>
          <Link href={`/acumulado?${q({})}`} className={acumulado ? "activo" : ""}>Acumulado</Link>
        </nav>
        <div className="quien">
          <span>{acceso.nombre}</span>
          <form action={cerrarSesion}>
            <button type="submit" className="link">Salir</button>
          </form>
        </div>
      </header>

      <main className="pagina">
        <div className="titulo">
          <h1>{acumulado ? (modoEf === "evento" && ev ? `Acumulado del ${ev.corto}` : "Acumulado del mes") : rojo && ev ? `Venta del día · ${ev.corto}` : "Venta del día"}</h1>
          <p className="muted">
            {etiquetaModo}
            {corte !== null ? ` · hasta las ${String(corte).padStart(2, "0")}:00 h` : ""}
          </p>
          <p className="muted">
            {rangoLargo(aDesde, fecha)} <b>vs</b> {rangoLargo(lDesde, lHasta)}
          </p>
          <p className="muted chico">Venta con intereses y sin IVA, neta de cancelaciones.{actualizado ? ` Actualizado ${haceCuanto(actualizado)}.` : ""}</p>
        </div>

        <form method="get" className="filtros">
          <label>
            Fecha
            <input type="date" name="fecha" defaultValue={fecha} max={hoy} />
          </label>
          <label>
            Comparar contra
            <select name="modo" defaultValue={modoEf}>
              <option value="semana">Mismo día de la semana</option>
              <option value="fecha">Misma fecha</option>
              {evDia && <option value="evento">{evDia.corto} (día {evDia.dia})</option>}
            </select>
          </label>
          {acceso.tiendas.length > 1 && (
            <label>
              Tienda
              <select name="tienda" defaultValue={seleccion ? seleccion[0] : ""}>
                <option value="">{acceso.rol === "dueno" ? "Todas" : "Todas mis tiendas"}</option>
                {acceso.tiendas.map((x) => (
                  <option key={x.clave} value={x.clave}>{x.clave} {x.nombre}</option>
                ))}
              </select>
            </label>
          )}
          <button type="submit">Ver</button>
        </form>

        {vacio ? (
          <p className="vacio">Sin ventas registradas para este periodo y tienda.</p>
        ) : (
          <>
            <div className="kpis">
              <div className="kpi grande">
                <span>Venta</span>
                <b>{pesos(t.a)}</b>
                <em className={clase(t.a - t.l)}>
                  {dif(t.a - t.l)} {varPct(t.a, t.l) ? `(${varPct(t.a, t.l)})` : ""}
                </em>
                <small>Año pasado: {pesos(t.l)}</small>
              </div>
              <div className="kpi">
                <span>Unidades</span>
                <b>{num(t.ua)}</b>
                <small>Año pasado: {num(t.ul)}</small>
              </div>
              <div className="kpi">
                <span>Tickets</span>
                <b>{num(t.ta)}</b>
                <small>Año pasado: {num(t.tl)}</small>
              </div>
              <div className="kpi">
                <span>Ticket promedio</span>
                <b>{pesos(ticketA)}</b>
                <small>Año pasado: {pesos(ticketL)}</small>
              </div>
            </div>

            {!acumulado && <Horas horas={r.horas} ay={ay} ly={ly} />}
            <Tabla titulo="Por forma de pago" primera="Forma de pago" filas={r.formas} total ay={ay} ly={ly} />
            {r.tiendas.length > 1 && <Tabla titulo="Por tienda" primera="Tienda" filas={r.tiendas} total ay={ay} ly={ly} />}
            <Tabla titulo="Por vendedor" primera="Vendedor" filas={r.vendedores} ay={ay} ly={ly} />
          </>
        )}
      </main>
    </div>
  );
}
