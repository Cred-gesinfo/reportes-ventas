import Link from "next/link";
import { obtenerAcceso } from "@/lib/acceso";
import { consultar, ahoraMx, ultimaActualizacion, diasDelMes, type Modo, type Reporte } from "@/lib/reporte";
import { pesos, dif, num, varPct, clase, rangoLargo, haceCuanto } from "@/lib/format";
import { cerrarSesion } from "@/app/acciones";
import { Tabla } from "./Tabla";
import { Horas } from "./Horas";
import { Filtros } from "./Filtros";
import { GraficaDias } from "./GraficaDias";

type SP = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function Kpis({ t, cuota, acumulado }: { t: Reporte["total"]; cuota: number; acumulado: boolean }) {
  const alcance = cuota > 0 ? (t.a / cuota) * 100 : null;
  const ticketA = t.ta ? t.a / t.ta : 0;
  const ticketL = t.tl ? t.l / t.tl : 0;
  const faltan = cuota - t.a;
  return (
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
        <span>Clientes</span>
        <b>{num(t.ta)}</b>
        <small>Año pasado: {num(t.tl)}</small>
      </div>
      <div className="kpi">
        <span>Unidades</span>
        <b>{num(t.ua)}</b>
        <small>Año pasado: {num(t.ul)}</small>
      </div>
      <div className="kpi">
        <span>Ticket prom.</span>
        <b>{pesos(ticketA)}</b>
        <small>Año pasado: {pesos(ticketL)}</small>
      </div>
      <div className="kpi">
        <span>{acumulado ? "Cuota del mes" : "Cuota del día"}</span>
        <b>{pesos(cuota)}</b>
        <small>{acumulado ? "Mes completo del año pasado" : "Día completo del año pasado"}</small>
      </div>
      <div className="kpi alcance">
        <span>Alcance</span>
        <b className={alcance !== null && alcance >= 100 ? "pos" : ""}>{alcance === null ? "—" : `${alcance.toFixed(1)}%`}</b>
        <div className="progreso">
          <i style={{ width: `${Math.min(100, Math.max(0, alcance ?? 0))}%` }} className={alcance !== null && alcance >= 100 ? "ok" : ""} />
        </div>
        <small>{alcance === null ? "Sin cuota" : faltan > 0 ? `Faltan ${pesos(faltan)}` : `Cuota superada por ${pesos(-faltan)}`}</small>
      </div>
    </div>
  );
}

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
  const modo: Modo = uno(sp.modo) === "fecha" ? "fecha" : "semana";
  const tiendaIn = uno(sp.tienda);
  const claves = acceso.tiendas.map((t) => t.clave);
  const seleccion = tiendaIn && claves.includes(tiendaIn) ? [tiendaIn] : null;
  // Dueño: null = todas. Gerente: siempre acotado a sus tiendas.
  const tiendas = seleccion ?? (acceso.rol === "dueno" ? null : claves);
  const hIn = Number(uno(sp.h));

  const [{ r, modo: modoEf, aDesde, lDesde, lHasta, corte }, actualizado] = await Promise.all([
    consultar({ fecha, modo, acumulado, tiendas, hastaHora: Number.isFinite(hIn) && hIn > 0 ? hIn : undefined }),
    ultimaActualizacion(),
  ]);

  const ay = !acumulado && fecha === hoy ? "Hoy" : "Actual";
  const ly = "Año pasado";
  const t = r.total;
  const etiquetaModo = modoEf === "fecha" ? "Misma fecha del año pasado" : "Mismo día de la semana del año pasado";
  const vacio = !t.a && !t.l;
  const sel = seleccion ? seleccion[0] : "";
  const q = new URLSearchParams({ fecha, ...(!acumulado ? { modo: modoEf } : {}), ...(sel ? { tienda: sel } : {}) }).toString();
  const qDia = new URLSearchParams({ fecha, modo: modoEf, ...(sel ? { tienda: sel } : {}) }).toString();
  const qAcum = new URLSearchParams({ fecha, ...(sel ? { tienda: sel } : {}) }).toString();
  void q;

  const titulo = (
    <div className="titulo">
      <h1>{acumulado ? "Acumulado del mes" : "Venta del día"}</h1>
      <p className="muted">
        {etiquetaModo}
        {corte !== null ? ` · hasta las ${String(corte).padStart(2, "0")}:00 h` : ""} · {rangoLargo(aDesde, fecha)} <b>vs</b> {rangoLargo(lDesde, lHasta)}
      </p>
    </div>
  );
  const kpis = vacio ? <p className="vacio">Sin ventas registradas para este periodo y tienda.</p> : <Kpis t={t} cuota={r.cuota} acumulado={acumulado} />;

  return (
    <div>
      <div className="fijo">
        <header className="top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Crediland" className="logo" />
          <nav>
            <Link href={`/?${qDia}`} className={!acumulado ? "activo" : ""}>Día</Link>
            <Link href={`/acumulado?${qAcum}`} className={acumulado ? "activo" : ""}>Acumulado</Link>
          </nav>
          <div className="quien">
            {actualizado && <span className="chico">Actualizado {haceCuanto(actualizado)}</span>}
            <span>{acceso.nombre}</span>
            <form action={cerrarSesion}>
              <button type="submit" className="link">Salir</button>
            </form>
          </div>
        </header>
        <div className="solo-pc contenedor">{titulo}</div>
        <div className="contenedor">
          <Filtros
            key={`${fecha}|${modoEf}|${sel}|${acumulado}`}
            fecha={fecha}
            modo={modoEf}
            tienda={sel}
            hoy={hoy}
            mostrarModo={!acumulado}
            tiendas={acceso.tiendas}
            etiquetaTodas={acceso.rol === "dueno" ? "Todas" : "Todas mis tiendas"}
          />
        </div>
        <div className="solo-pc contenedor">{kpis}</div>
      </div>

      <main className="pagina">
        <div className="solo-movil">{titulo}</div>
        <div className="solo-movil">{kpis}</div>

        {!vacio && (
          <>
            {acumulado && (
              <GraficaDias dias={r.dias} diasMes={diasDelMes(fecha)} diaActual={Number(fecha.slice(8))} cuota={r.cuota} />
            )}
            {!acumulado && <Horas horas={r.horas} ay={ay} ly={ly} />}
            <Tabla titulo="Por forma de pago" primera="Forma de pago" filas={r.formas} total ay={ay} ly={ly} />
            <Tabla titulo="Por categoría" primera="Categoría" filas={r.categorias} total ay={ay} ly={ly} />
            {r.tiendas.length > 1 && <Tabla titulo="Por tienda" primera="Tienda" filas={r.tiendas} total ay={ay} ly={ly} />}
            <Tabla titulo="Por vendedor" primera="Vendedor" filas={r.vendedores} ay={ay} ly={ly} />
            <p className="muted chico">Venta con intereses y sin IVA, neta de cancelaciones. Clientes = tickets (ventas) del periodo. Cuota = venta completa del año pasado.</p>
          </>
        )}
      </main>
    </div>
  );
}
