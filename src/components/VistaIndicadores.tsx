import { Suspense } from "react";
import { obtenerAcceso } from "@/lib/acceso";
import { consultarIndicadores, ahoraMx, ultimaActualizacion, sumaDias } from "@/lib/reporte";
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
  const tiendaIn = uno(sp.tienda);
  const claves = acceso.tiendas.map((t) => t.clave);
  const seleccion = tiendaIn && claves.includes(tiendaIn) ? [tiendaIn] : null;
  const tiendas = seleccion ?? (acceso.rol === "dueno" ? null : claves);
  const sel = seleccion ? seleccion[0] : "";

  const actualizado = await ultimaActualizacion();
  const { r, aDesde } = await consultarIndicadores(fecha, tiendas);

  const anioA = Number(fecha.slice(0, 4));
  const mes = new Date(aDesde + "T00:00:00Z").toLocaleDateString("es-MX", { month: "long", timeZone: "UTC" }).toUpperCase();
  const tienda = seleccion ? acceso.tiendas.find((t) => t.clave === seleccion[0]) : null;
  const nombre = tienda ? `${tienda.clave} - ${tienda.nombre}` : acceso.rol === "dueno" ? "TODAS LAS TIENDAS" : acceso.tiendas.length > 1 ? "MIS TIENDAS" : `${acceso.tiendas[0].clave} - ${acceso.tiendas[0].nombre}`;
  const base = new URLSearchParams({ fecha, ...(sel ? { tienda: sel } : {}) });
  const sinDato = !r.plantilla || !r.m2;

  return (
    <div className="app indic">
      <header className="top no-print">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Crediland" className="logo" />
        <NavTabs
          items={[
            { href: `/?${base.toString()}`, etiqueta: "Día", activo: false },
            { href: `/acumulado?${base.toString()}`, etiqueta: "Acumulado", activo: false },
            { href: `/anio?${base.toString()}`, etiqueta: "Año", activo: false },
            { href: `/indicadores?${base.toString()}`, etiqueta: "Indicadores", activo: true },
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
              DEL MES DE {mes} DEL {anioA} · al cierre de <b>{fechaLarga(fecha)}</b> · “Total {anioA - 1}” es el mes completo del año pasado
            </p>
          </div>
          <BotonImprimir />
        </div>
      </div>

      <main className="pagina">
        <div className="no-print">
          <Suspense fallback={null}>
            <Filtros
              key={`${fecha}|${sel}`}
              fecha={fecha}
              modo="fecha"
              tienda={sel}
              hoy={ayer}
              mostrarModo={false}
              tiendas={acceso.tiendas}
              etiquetaTodas={acceso.rol === "dueno" ? "Todas" : "Todas mis tiendas"}
            />
          </Suspense>
        </div>

        <Seccion id="ind-formas" titulo="Por forma de pago">
          <TablaIndicadores primera="Tienda" filas={r.formas} total={r.total} plantilla={r.plantilla} m2={r.m2} anioA={anioA} anioL={anioA - 1} porForma />
        </Seccion>
        <Seccion id="ind-vendedores" titulo="Por vendedor">
          <TablaIndicadores primera="Vendedor" filas={r.vendedores} total={r.total} plantilla={r.plantilla} m2={r.m2} anioA={anioA} anioL={anioA - 1} />
        </Seccion>

        <p className="muted chico nota-ind">
          Venta con intereses y sin IVA, neta de cancelaciones. Ticket promedio = venta ÷ tickets. Índice de venta = piezas por ticket (unidades ÷ tickets).
          Venta por empleado = venta ÷ plantilla ({r.plantilla ?? "sin dato"}). Venta por m² = venta ÷ m² de exhibición ({r.m2 ?? "sin dato"}).
          {sinDato ? " Hay tiendas sin plantilla o m² capturados: sus indicadores por empleado y por m² no se calculan." : ""}
        </p>
      </main>
      <CargandoPantalla />
    </div>
  );
}
