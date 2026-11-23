"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type T = { clave: string; nombre: string };

// Filtros que se aplican solos: al cambiar cualquier campo se recarga el reporte (sin boton "Ver").
// Conserva los demas parametros de la direccion (por ejemplo el filtro de forma de pago).
export function Filtros({ fecha, modo, tienda, hoy, mostrarModo, tiendas, etiquetaTodas }: {
  fecha: string; modo: string; tienda: string; hoy: string; mostrarModo: boolean; tiendas: T[]; etiquetaTodas: string;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const sp = useSearchParams();
  const [pendiente, empezar] = useTransition();
  const [v, setV] = useState({ fecha, modo, tienda });

  useEffect(() => {
    document.body.classList.toggle("cargando", pendiente);
    return () => document.body.classList.remove("cargando");
  }, [pendiente]);

  function cambiar(k: "fecha" | "modo" | "tienda", valor: string) {
    if (k === "fecha" && !valor) return; // fecha borrada a medias: no recargar
    setV((x) => ({ ...x, [k]: valor }));
    const q = new URLSearchParams(sp.toString());
    if (valor) q.set(k, valor); else q.delete(k);
    empezar(() => router.replace(`${ruta}?${q.toString()}`));
  }

  return (
    <div className="filtros">
      <label>
        Fecha
        <input type="date" value={v.fecha} max={hoy} onChange={(e) => cambiar("fecha", e.target.value)} />
      </label>
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
