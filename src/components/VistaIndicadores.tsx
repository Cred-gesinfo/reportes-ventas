import { Suspense } from "react";
import { obtenerAcceso } from "@/lib/acceso";
import { consultarIndicadores, ahoraMx, ultimaActualizacion, sumaDias, finDeMes } from "@/lib/reporte";
import { fechaLarga } from "@/lib/format";
import { cerrarSesion } from "@/app/acciones";
import { Filtros } from "./Filtros";
import { Seccion } from "./Seccion";
import { AutoRefresco } from "./AutoRefresco";
import { CargandoPantalla } from "./CargandoPantalla";
import { NavTabs } from "./NavTabs";
import { TablaIndicadores } from "./TablaIndicadores";
import { BotonImprimir } from "./BotonImprimir";

type SP = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// Indicadores operativos por tienda: el reporte mensual que se manda a las tiendas, ahora en la web (al cierre de ayer).
export async function VistaIndicadores({ sp }: { sp: SP }) {
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
  const ayer = sumaDias(hoy, -1);
  const fechaIn = uno(sp.fecha);
  let fecha = fechaIn && /^\d{4}-\d{2}-\d{2}$/.test(fechaIn) ? fechaIn : ayer;
  if (fecha > ayer) fecha = ayer; // el reporte es al cierre de ayer: el dia de hoy aun no esta completo

  // Meses cerrados del anio en curso (su ultimo dia ya paso), del mas reciente al mas antiguo
  const anioHoy = hoy.slice(0, 4);
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const mesesCerrados: { v: string; etq: string }[] = [];
  for (let m = 12; m >= 1; m--) {
    const v = `${anioHoy}-${String(m).padStart(2, "0")}`;
    if (finDeMes(v + "-01") <= ayer) mesesCerrados.push({ v, etq: `${MESES[m - 1]} ${anioHoy}` });
  }
  const mesIn = uno(sp.mes);
  const corte: "dia" | "mes" = uno(sp.corte) === "mes" && mesesCerrados.length ? "mes" : "dia";
  const mesSel = corte === "mes" ? (mesesCerrados.find((m) => m.v === mesIn)?.v ?? mesesCerrados[0].v) : "";
  if (corte === "mes") fecha = finDeMes(mesSel + "-01"); // mes cerrado: se ve completo, hasta su ultimo dia
  const tiendaIn = uno(sp.tienda);
  const claves = acceso.tiendas.map((t) => t.clave);
  const seleccion = tiendaIn && claves.includes(tiendaIn) ? [tiendaIn] : null;
  const tiendas = seleccion ?? (acceso.rol === "dueno" ? null : claves);
  const sel = seleccion ? seleccion[0] : "";
  const periodo: "mes" | "anio" = uno(sp.periodo) === "anio" ? "anio" : "mes";

  const actualizado = await ultimaActualizacion();
  const { r, aDesde } = await consultarIndicadores(fecha, tiendas, periodo);

  const anioA = Number(fecha.slice(0, 4));
  const mes = MESES[Number(fecha.slice(5, 7)) - 1].toUpperCase();
  void aDesde;
  const tienda = seleccion ? acceso.tiendas.find((t) => t.clave === seleccion[0]) : null;
  const nombre = tienda ? `${tienda.clave} - ${tienda.nombre}` : acceso.rol === "dueno" ? "TODAS LAS TIENDAS" : acceso.tiendas.length > 1 ? "MIS TIENDAS" : `${acceso.tiendas[0].clave} - ${acceso.tiendas[0].nombre}`;
  const base = new URLSearchParams({ fecha, ...(sel ? { tienda: sel } : {}) });
  const sinDato = !r.plantilla || !r.m2;
  const etiquetaL = periodo === "anio" ? `${anioA - 1}` : `Total ${anioA - 1}`;

  return (
    <div className="app indic">
      <header className="top no-print">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Crediland" className="logo" />
        <NavTabs
          items={[
            { href: `/?${base.toString()}`, etiqueta: "Día", activo: false },
            { href: `/mes?${base.toString()}`, etiqueta: "Mes", activo: false },
            { href: `/anio?${base.toString()}`, etiqueta: "Año", activo: false },
            { href: `/indicadores?${base.toString()}`, etiqueta: "Indicadores", activo: true },
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
            <h1>INDICADORES OPERATIVOS {nombre.toUpperCase()}</h1>
            <p className="muted">
              {periodo === "anio" ? `ACUMULADO DEL AÑO ${anioA} (ENERO A ${mes})` : `DEL MES DE ${mes} DEL ${anioA}`} ·{" "}
              {corte === "mes" ? <b>MES CERRADO</b> : <>al cierre de <b>{fechaLarga(fecha)}</b></>} ·{" "}
              {periodo === "anio" ? `${anioA - 1} es del 1 de enero a la misma fecha del año pasado` : `“Total ${anioA - 1}” es el mes completo del año pasado`}
            </p>
          </div>
          <BotonImprimir />
        </div>
      </div>

      <main className="pagina">
        <div className="no-print">
          <Suspense fallback={null}>
            <Filtros
              key={`${fecha}|${sel}|${periodo}|${corte}|${mesSel}`}
              fecha={fecha}
              modo="fecha"
              tienda={sel}
              hoy={ayer}
              mostrarModo={false}
              tiendas={acceso.tiendas}
              etiquetaTodas={acceso.rol === "dueno" ? "Todas" : "Todas mis tiendas"}
              periodo={periodo}
              mostrarPeriodo
              corte={corte}
              mes={mesSel}
              mesesCerrados={mesesCerrados}
            />
          </Suspense>
        </div>

        <Seccion id="ind-formas" titulo="Por forma de pago">
          <TablaIndicadores primera="Tienda" filas={r.formas} total={r.total} plantilla={r.plantilla} m2={r.m2} anioA={anioA} anioL={anioA - 1} etiquetaL={etiquetaL} porForma />
        </Seccion>
        <Seccion id="ind-vendedores" titulo="Por vendedor">
          <TablaIndicadores primera="Vendedor" filas={r.vendedores} total={r.total} plantilla={r.plantilla} m2={r.m2} anioA={anioA} anioL={anioA - 1} etiquetaL={etiquetaL} />
        </Seccion>

        <p className="muted chico nota-ind">
          Venta con intereses y sin IVA, neta de cancelaciones. Ticket promedio = venta ÷ tickets. Índice de venta = piezas por ticket (unidades ÷ tickets).
          Venta por empleado = venta ÷ plantilla ({r.plantilla ?? "sin dato"}). Venta por m² = venta ÷ m² de exhibición ({r.m2 ?? "sin dato"}).
          {periodo === "anio" ? " En el acumulado, venta por empleado y por m² son del periodo completo (de enero a la fecha), no por mes." : ""}
          {sinDato ? " Hay tiendas sin plantilla o m² capturados: sus indicadores por empleado y por m² no se calculan." : ""}
        </p>
      </main>
      <CargandoPantalla />
    </div>
  );
}
