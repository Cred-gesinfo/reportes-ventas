"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const hora = (iso: string) =>
  new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));

function hace(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h ${min % 60} min` : `hace ${Math.floor(h / 24)} d`;
}

// Muestra la hora de la ultima carga y recarga el reporte solo cuando se suben datos nuevos.
export function AutoRefresco({ inicial }: { inicial: string | null }) {
  const router = useRouter();
  const ultimo = useRef(inicial);
  const [t, setT] = useState(inicial);
  const [, tic] = useState(0);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    ultimo.current = inicial;
    setT(inicial);
  }, [inicial]);

  useEffect(() => {
    let vivo = true;
    async function revisar() {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/ultima", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { t?: string | null };
        if (!vivo || !j.t || j.t === ultimo.current) return;
        ultimo.current = j.t;
        setT(j.t);
        router.refresh(); // datos nuevos: vuelve a pedir el reporte con los mismos filtros
      } catch {
        /* sin conexion: se reintenta en el siguiente minuto */
      }
    }
    const a = setInterval(revisar, 60_000);
    const b = setInterval(() => tic((n) => n + 1), 30_000);
    const v = () => { if (document.visibilityState === "visible") void revisar(); };
    document.addEventListener("visibilitychange", v);
    return () => { vivo = false; clearInterval(a); clearInterval(b); document.removeEventListener("visibilitychange", v); };
  }, [router]);

  if (!t) return null;
  return (
    <span className="chico actualizado" title="Los datos se recargan solos cuando se suben al sistema">
      Datos de las {hora(t)}{montado ? ` · ${hace(t)}` : ""}
    </span>
  );
}
