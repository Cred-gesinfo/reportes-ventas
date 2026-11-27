"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { avisarCarga } from "@/lib/carga";

type T = { clave: string; nombre: string };

// Filtros que se aplican solos: al cambiar cualquier campo se recarga el reporte (sin boton "Ver").
// Conserva los demas parametros de la direccion (por ejemplo el filtro de forma de pago).
export function Filtros({ fecha, modo, tienda, hoy, mostrarModo, tiendas, etiquetaTodas, periodo, mostrarPeriodo, corte, mes, mesesCerrados }: {
  fecha: string; modo: string; tienda: string; hoy: string; mostrarModo: boolean; tiendas: T[]; etiquetaTodas: string;
  periodo?: string; mostrarPeriodo?: boolean; // combo "Del mes / Acumulado del año" (pestana Indicadores)
  corte?: string; mes?: string; mesesCerrados?: { v: string; etq: string }[]; // "Al día que elija" o "Mes cerrado"
}) {
  const router = useRouter();
  const ruta = usePathname();
  const sp = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const [v, setV] = useState({ fecha, modo, tienda, periodo: periodo ?? "mes", corte: corte ?? "dia", mes: mes ?? "" });

  useEffect(() => {
    avisarCarga("filtros", pendiente, ruta);
    return () => avisarCarga("filtros", false, ruta);
  }, [pendiente, ruta]);

  function cambiar(k: "fecha" | "modo" | "tienda" | "periodo" | "corte" | "mes", valor: string) {
    if (k === "fecha" && !valor) return; // fecha borrada a medias: no recargar
    setV((x) => ({ ...x, [k]: valor }));
    const q = new URLSearchParams(sp.toString());
    if (valor) q.set(k, valor); else q.delete(k);
    empezar(() => router.replace(`${ruta}?${q.toString()}`));
  }

  return (
    <div className="filtros">
      {mesesCerrados && (
        <label>
          Corte
          <select value={v.corte} onChange={(e) => cambiar("corte", e.target.value)}>
            <option value="dia">Al día que elija</option>
            <option value="mes" disabled={!mesesCerrados.length}>{mesesCerrados.length ? "Mes cerrado" : "Mes cerrado (aún no hay)"}</option>
          </select>
        </label>
      )}
      {mesesCerrados && v.corte === "mes" ? (
        <label>
          Mes
          <select value={v.mes} onChange={(e) => cambiar("mes", e.target.value)}>
            {mesesCerrados.map((m) => (
              <option key={m.v} value={m.v}>{m.etq}</option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          Fecha
          <input type="date" value={v.fecha} max={hoy} onChange={(e) => cambiar("fecha", e.target.value)} />
        </label>
      )}
      {mostrarPeriodo && (
        <label>
          Periodo
          <select value={v.periodo} onChange={(e) => cambiar("periodo", e.target.value)}>
            <option value="mes">Del mes</option>
            <option value="anio">Acumulado del año</option>
          </select>
        </label>
      )}
      {mostrarModo && (
        <label>
          Comparar contra
          <select value={v.modo} onChange={(e) => cambiar("modo", e.target.value)}>
            <option value="fecha">Misma fecha</option>
            <option value="semana">Mismo día de la semana</option>
          </select>
        </label>
      )}
      {tiendas.length > 1 && (
        <label>
          Tienda
          <select value={v.tienda} onChange={(e) => cambiar("tienda", e.target.value)}>
            <option value="">{etiquetaTodas}</option>
            {tiendas.map((t) => (
              <option key={t.clave} value={t.clave}>{t.clave} {t.nombre}</option>
            ))}
          </select>
        </label>
      )}
      <span className="estado">{pendiente ? "Actualizando…" : ""}</span>
    </div>
  );
}
