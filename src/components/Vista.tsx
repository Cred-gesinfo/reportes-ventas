import { Suspense } from "react";
import Link from "next/link";
import { obtenerAcceso } from "@/lib/acceso";
import { consultar, ahoraMx, ultimaActualizacion, diasDelMes, type Modo, type Reporte } from "@/lib/reporte";
import { FORMAS, etqForma } from "@/lib/formas";
import { pesos, dif, num, varPct, clase, rangoLargo } from "@/lib/format";
import { cerrarSesion } from "@/app/acciones";
import { Tabla } from "./Tabla";
import { Horas } from "./Horas";
import { Filtros } from "./Filtros";
import { GraficaDias } from "./GraficaDias";
import { Seccion } from "./Seccion";
import { ControlesForma } from "./ControlesForma";
import { AutoRefresco } from "./AutoRefresco";

type SP = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function Barra({ pct }: { pct: number | null }) {
  return (
    <div className="progreso">
      <i style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }} className={pct !== null && pct >= 100 ? "ok" : ""} />
    </div>
  );
}

function CuotaForma({ titulo, fila }: { titulo: string; fila?: Reporte["formas"][number] }) {
  const c = fila?.c ?? 0;
  const a = fila?.a ?? 0;
  const pct = c > 0 ? (a / c) * 100 : null;
  return (
    <div className="kpi">
      <span>{titulo}</span>
      <b>{pesos(c)}</b>
      <small>Venta: {pesos(a)} · Alcance: <strong className={pct !== null && pct >= 100 ? "pos" : ""}>{pct === null ? "—" : `${pct.toFixed(1)}%`}</strong></small>
      <Barra pct={pct} />
      <small>{pct === null ? "Sin cuota" : c - a > 0 ? `Faltan ${pesos(c - a)}` : `Superada por ${pesos(a - c)}`}</small>
    </div>
  );
}

function Kpis({ r, acumulado }: { r: Reporte; acumulado: boolean }) {
  const t = r.total;
  const cuota = r.cuota;
  const alcance = cuota > 0 ? (t.a / cuota) * 100 : null;
  const indice = t.l > 0 ? (t.a / t.l) * 100 : null;
  const ticketA = t.ta ? t.a / t.ta : 0;
  const ticketL = t.tl ? t.l / t.tl : 0;
  const contado = r.formas.find((f) => f.nombre === "Contado");
  const inst = r.formas.find((f) => f.nombre === "Institucional");
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
        <span>Índice de venta</span>
        <b className={indice !== null && indice >= 100 ? "pos" : indice !== null ? "neg" : ""}>{indice === null ? "—" : indice.toFixed(1)}</b>
        <small>Venta ÷ año pasado × 100 (100 = igual)</small>
      </div>
      <div className="kpi">
        <span>Clientes</span>
        <b>{num(t.ca)}</b>
        <small>Año pasado: {num(t.cl)}</small>
      </div>
      <div className="kpi">
        <span>Tickets</span>
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
        <Barra pct={alcance} />
        <small>{alcance === null ? "Sin cuota" : cuota - t.a > 0 ? `Faltan ${pesos(cuota - t.a)}` : `Cuota superada por ${pesos(t.a - cuota)}`}</small>
      </div>
      <CuotaForma titulo="Cuota contado" fila={contado} />
      <CuotaForma titulo="Cuota institucional" fila={inst} />
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
  const modo: Modo = uno(sp.modo) === "semana" ? "semana" : "fecha";
  const tiendaIn = uno(sp.tienda);
  const claves = acceso.tiendas.map((t) => t.clave);
  const seleccion = tiendaIn && claves.includes(tiendaIn) ? [tiendaIn] : null;
  // Dueño: null = todas. Gerente: siempre acotado a sus tiendas.
  const tiendas = seleccion ?? (acceso.rol === "dueno" ? null : claves);
  const formaIn = uno(sp.forma);
  const forma = FORMAS.find((f) => f.v === formaIn)?.v ?? null;
  const hIn = Number(uno(sp.h));

  const [{ r, modo: modoEf, aDesde, lDesde, lHasta, corte }, actualizado] = await Promise.all([
    consultar({ fecha, modo, acumulado, tiendas, formas: forma ? [forma] : null, hastaHora: Number.isFinite(hIn) && hIn > 0 ? hIn : undefined }),
    ultimaActualizacion(),
  ]);

  const ay = !acumulado && fecha === hoy ? "Hoy" : "Actual";
  const ly = "Año pasado";
  const t = r.total;
  const etiquetaModo = modoEf === "fecha" ? "Misma fecha del año pasado" : "Mismo día de la semana del año pasado";
  const vacio = !t.a && !t.l && !r.cuota;
  const sel = seleccion ? seleccion[0] : "";
  const base = new URLSearchParams({ fecha, ...(sel ? { tienda: sel } : {}), ...(forma ? { forma } : {}) });
  const qDia = new URLSearchParams(base); qDia.set("modo", modoEf);
  const badge = forma ? `Solo ${etqForma(forma)}` : undefined;
  const formasVista = r.formas.map((f) => ({ ...f, nombre: etqForma(f.nombre) }));

  return (
    <div>
      <header className="top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Crediland" className="logo" />
        <nav>
          <Link href={`/?${qDia.toString()}`} className={!acumulado ? "activo" : ""}>Día</Link>
          <Link href={`/acumulado?${base.toString()}`} className={acumulado ? "activo" : ""}>Acumulado</Link>
        </nav>
        <div className="quien">
          <AutoRefresco inicial={actualizado} />
          <span>{acceso.nombre}</span>
          <form action={cerrarSesion}>
            <button type="submit" className="link">Salir</button>
          </form>
        </div>
      </header>

      <div className="fijo">
        <div className="contenedor barra-titulo">
          <div className="titulo">
            <h1>
              {acumulado ? "Acumulado del mes" : "Venta del día"}
              {badge && <span className="filtro-badge grande">Filtro activo: {badge}</span>}
            </h1>
            <p className="muted">
              {etiquetaModo}
              {corte !== null ? ` · hasta las ${String(corte).padStart(2, "0")}:00 h` : ""} · {rangoLargo(aDesde, fecha)} <b>vs</b> {rangoLargo(lDesde, lHasta)}
            </p>
          </div>
          <Suspense fallback={null}>
            <ControlesForma actual={forma} />
          </Suspense>
        </div>
      </div>

      <main className="pagina">
        <Suspense fallback={null}>
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
        </Suspense>

        {vacio ? (
          <p className="vacio">Sin ventas registradas para este periodo{forma ? ` con forma de pago ${etqForma(forma)}` : ""} y tienda.</p>
        ) : (
          <>
            <Kpis r={r} acumulado={acumulado} />

            {acumulado ? (
              <Seccion id="grafica" titulo="Avance del mes" badge={badge}>
                <GraficaDias dias={r.dias} diasMes={diasDelMes(fecha)} diaActual={Number(fecha.slice(8))} cuota={r.cuota} mesA={fecha.slice(0, 7)} mesL={lDesde.slice(0, 7)} />
              </Seccion>
            ) : (
              <Seccion id="horas" titulo="Venta por hora" badge={badge}>
                <Horas horas={r.horas} corte={corte} ay={ay} />
              </Seccion>
            )}
            <Seccion id="formas" titulo="Por forma de pago">
              <Tabla primera="Forma de pago" filas={formasVista} total ay={ay} ly={ly} resaltar={forma ? etqForma(forma) : null} />
              <p className="muted chico nota">Siempre muestra todas las formas de pago; el filtro de arriba no las oculta.</p>
            </Seccion>
            <Seccion id="categorias" titulo="Por categoría" badge={badge}>
              <Tabla primera="Categoría" filas={r.categorias} total ay={ay} ly={ly} piezas />
            </Seccion>
            {r.tiendas.length > 1 && (
              <Seccion id="tiendas" titulo="Por tienda" badge={badge}>
                <Tabla primera="Tienda" filas={r.tiendas} total ay={ay} ly={ly} />
              </Seccion>
            )}
            <Seccion id="vendedores" titulo="Por vendedor" badge={badge}>
              <Tabla primera="Vendedor" filas={r.vendedores} ay={ay} ly={ly} />
            </Seccion>
            <p className="muted chico">
              Venta con intereses y sin IVA, neta de cancelaciones. Clientes = cuentas distintas; tickets = ventas. Cuota = venta completa del año pasado (día o mes completo).
            </p>
          </>
        )}
      </main>
    </div>
  );
}
