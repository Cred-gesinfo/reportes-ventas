"use client";
import { useEffect, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { avisarCarga } from "@/lib/carga";
import { FORMAS } from "@/lib/formas";

// Botones de forma de pago (junto al titulo fijo). Filtran TODO el reporte, sin recargar la pagina completa.
export function ControlesForma({ actual }: { actual: string | null }) {
  const router = useRouter();
  const ruta = usePathname();
  const sp = useSearchParams();
  const [pendiente, empezar] = useTransition();
  useEffect(() => {
    avisarCarga("forma", pendiente, ruta);
    return () => avisarCarga("forma", false, ruta);
  }, [pendiente, ruta]);

  function elegir(v: string | null) {
    const q = new URLSearchParams(sp.toString());
    if (v) q.set("forma", v); else q.delete("forma");
    empezar(() => router.replace(`${ruta}?${q.toString()}`));
  }
  return (
    <div className="formas-btn" role="group" aria-label="Filtrar por forma de pago">
      <span className="formas-et">Forma de pago:</span>
      <button type="button" className={!actual ? "on" : ""} aria-pressed={!actual} onClick={() => elegir(null)}>Todas</button>
      {FORMAS.map((f) => (
        <button key={f.v} type="button" className={actual === f.v ? "on" : ""} aria-pressed={actual === f.v} onClick={() => elegir(f.v)}>
          {f.etq}
        </button>
      ))}
    </div>
  );
}
