import { Suspense } from "react";
import Link from "next/link";
import { obtenerAcceso } from "@/lib/acceso";
import { consultar, ahoraMx, ultimaActualizacion, diasDelMes, type Modo, type Periodo, type Reporte } from "@/lib/reporte";
import { FORMAS, etqForma } from "@/lib/formas";
import { pesos, dif, num, varPct, clase, rangoLargo, fechaLarga } from "@/lib/format";
import { cerrarSesion } from "@/app/acciones";
import { Tabla } from "./Tabla";
import { Horas } from "./Horas";
import { Filtros } from "./Filtros";
import { GraficaDias } from "./GraficaDias";
import { GraficaMeses } from "./GraficaMeses";
import { Seccion } from "./Seccion";
import { ControlesForma } from "./ControlesForma";
import { AutoRefresco } from "./AutoRefresco";
import { CargandoPantalla } from "./CargandoPantalla";
import { NavTabs } from "./NavTabs";

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

function Kpis({ r, periodo, cuotaFecha }: { r: Reporte; periodo: Periodo; cuotaFecha: string | null }) {
  const t = r.total;
  const cuota = r.cuota;
  const alcance = cuota > 0 ? (t.a / cuota) * 100 : null;
  // Indice de venta = piezas por ticket (unidades vendidas entre tickets)
  const indice = t.ta > 0 ? t.ua / t.ta : null;
  const indiceL = t.tl > 0 ? t.ul / t.tl : null;
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
        <b className={indice !== null && indiceL !== null ? (indice >= indiceL ? "pos" : "neg") : ""}>{indice === null ? "—" : indice.toFixed(2)}</b>
        <small>Piezas por ticket · Año pasado: {indiceL === null ? "—" : indiceL.toFixed(2)}</small>
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
        <span>{periodo === "anio" ? "Cuota del año" : periodo === "mes" ? "Cuota del mes" : "Cuota del día"}</span>
        <b>{pesos(cuota)}</b>
        <small>{periodo === "anio" ? "Año completo del año pasado" : periodo === "mes" ? "Mes completo del año pasado" : `Mismo día del año pasado: ${cuotaFecha ? fechaLarga(cuotaFecha) : ""}`}</small>
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

export async function Vista({ sp, periodo }: { sp: SP; periodo: Periodo }) {
  const acumulado = periodo !== "dia"; // mes o anio: siempre a fechas iguales
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

  const actualizado = await ultimaActualizacion();
  const { r, modo: modoEf, aDesde, lDesde, lHasta, corte, cuotaFecha } = await consultar({
    fecha, modo, periodo, tiendas, formas: forma ? [forma] : null,
    hastaHora: Number.isFinite(hIn) && hIn > 0 ? hIn : undefined,
    ultimaCarga: actualizado,
  });

  const ay = !acumulado && fecha === hoy ? "Hoy" : "Actual";
  const ly = "Año pasado";
  const t = r.total;
  const etiquetaModo = modoEf === "fecha" ? "Misma fecha del año pasado" : "Mismo día de la semana del año pasado";
  const vacio = !t.a && !t.l && !r.cuota;
  const sel = seleccion ? seleccion[0] : "";
  const base = new URLSearchParams({ fecha, ...(sel ? { tienda: sel } : {}), ...(forma ? { forma } : {}) });
  const qDia = new URLSearchParams(base); qDia.set("modo", modoEf);
  const badge = forma ? `Solo ${etqForma(forma)}` : undefined;
  const totCat = r.categorias.reduce((x, f) => x + Math.abs(f.a) + Math.abs(f.l), 0);
  const sinCat = r.categorias.filter((f) => f.nombre === "SIN CATEGORIA").reduce((x, f) => x + Math.abs(f.a) + Math.abs(f.l), 0);
  const sinCategoria = totCat > 0 ? sinCat / totCat : 0;
  const formasVista = r.formas.map((f) => ({ ...f, nombre: etqForma(f.nombre) }));

  return (
    <div className={"app " + (periodo === "anio" ? "anio" : periodo === "mes" ? "acum" : "dia")}>
      <header className="top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Crediland" className="logo" />
        <NavTabs
          items={[
            { href: `/?${qDia.toString()}`, etiqueta: "Día", activo: periodo === "dia" },
            { href: `/mes?${base.toString()}`, etiqueta: "Mes", activo: periodo === "mes" },
            { href: `/anio?${base.toString()}`, etiqueta: "Año", activo: periodo === "anio" },
            { href: `/indicadores?${base.toString()}`, etiqueta: "Indicadores", activo: false },
            ...(acceso.email.toLowerCase() === "rescobedo@crediland.com.mx" ? [{ href: "/usuarios", etiqueta: "Usuarios", activo: false }] : []),
          ]}
        />
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
              {periodo === "anio" ? "Acumulado del año" : periodo === "mes" ? "Acumulado del mes" : "Venta del día"}
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

      <CargandoPantalla />
      <main className="pagina">
        <Suspense fallback={null}>
          <Filtros
            key={`${fecha}|${modoEf}|${sel}|${periodo}`}
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
            <Kpis r={r} periodo={periodo} cuotaFecha={cuotaFecha} />

            {periodo === "anio" ? (
              <Seccion id="grafica-anio" titulo="Avance del año" badge={badge}>
                <GraficaMeses meses={r.meses} mesActual={Number(fecha.slice(5, 7))} diaActual={Number(fecha.slice(8))} cuota={r.cuota} anioA={Number(fecha.slice(0, 4))} anioL={Number(lDesde.slice(0, 4))} />
              </Seccion>
            ) : periodo === "mes" ? (
              <Seccion id="grafica" titulo="Avance del mes" badge={badge}>
                <GraficaDias dias={r.dias} diasMes={diasDelMes(fecha)} diaActual={Number(fecha.slice(8))} cuota={r.cuota} mesA={fecha.slice(0, 7)} mesL={lDesde.slice(0, 7)} />
              </Seccion>
            ) : (
              <Seccion id="horas" titulo="Venta por hora" badge={badge}>
                <Horas horas={r.horas} corte={corte} ay={ay} fechaMeta={cuotaFecha} />
              </Seccion>
            )}
            <Seccion id="formas" titulo="Por forma de pago">
              <Tabla primera="Forma de pago" filas={formasVista} total ay={ay} ly={ly} resaltar={forma ? etqForma(forma) : null} />
              <p className="muted chico nota">Siempre muestra todas las formas de pago; el filtro de arriba no las oculta.</p>
            </Seccion>
            <Seccion id="categorias" titulo="Por categoría" badge={badge}>
              <Tabla primera="Categoría" filas={r.categorias} total ay={ay} ly={ly} piezas />
              {sinCategoria > 0.5 && (
                <p className="aviso">
                  {Math.round(sinCategoria * 100)}% de la venta aparece como «SIN CATEGORIA»: el catálogo de categorías o la carga de historial de ventas aún no se completó.
                </p>
              )}
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
              Venta con intereses y sin IVA, neta de cancelaciones. Clientes = cuentas distintas; tickets = ventas. Cuota = venta completa del año pasado (día, mes o año completo).
            </p>
          </>
        )}
      </main>
    </div>
  );
}
