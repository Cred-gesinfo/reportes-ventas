"use client";
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

type T = { clave: string; nombre: string };

// Filtros que se aplican solos: al cambiar cualquier campo se recarga el reporte (sin boton "Ver").
export function Filtros({ fecha, modo, tienda, hoy, mostrarModo, tiendas, etiquetaTodas }: {
  fecha: string; modo: string; tienda: string; hoy: string; mostrarModo: boolean; tiendas: T[]; etiquetaTodas: string;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const [pendiente, empezar] = useTransition();
  const [v, setV] = useState({ fecha, modo, tienda });

  useEffect(() => {
    document.body.classList.toggle("cargando", pendiente);
    return () => document.body.classList.remove("cargando");
  }, [pendiente]);

  function cambiar(parcial: Partial<typeof v>) {
    const n = { ...v, ...parcial };
    if (!n.fecha) return; // fecha borrada a medias: no recargar
    setV(n);
    const q = new URLSearchParams({ fecha: n.fecha });
    if (mostrarModo) q.set("modo", n.modo);
    if (n.tienda) q.set("tienda", n.tienda);
    empezar(() => router.replace(`${ruta}?${q.toString()}`));
  }

  return (
    <div className="filtros">
      <label>
        Fecha
        <input type="date" value={v.fecha} max={hoy} onChange={(e) => cambiar({ fecha: e.target.value })} />
      </label>
      {mostrarModo && (
        <label>
          Comparar contra
          <select value={v.modo} onChange={(e) => cambiar({ modo: e.target.value })}>
            <option value="semana">Mismo día de la semana</option>
            <option value="fecha">Misma fecha</option>
          </select>
        </label>
      )}
      {tiendas.length > 1 && (
        <label>
          Tienda
          <select value={v.tienda} onChange={(e) => cambiar({ tienda: e.target.value })}>
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
