"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { avisarCarga } from "@/lib/carga";

type Item = { href: string; etiqueta: string; activo: boolean };

// Pestanas Dia / Acumulado / Anio. Mantienen la pagina actual a la vista y muestran la pantalla de carga mientras llega la nueva.
export function NavTabs({ items }: { items: Item[] }) {
  const router = useRouter();
  const [pendiente, empezar] = useTransition();
  const [destino, setDestino] = useState("/");

  useEffect(() => {
    avisarCarga("nav", pendiente, destino);
    return () => avisarCarga("nav", false, destino);
  }, [pendiente, destino]);

  return (
    <nav>
      {items.map((i) => (
        <a
          key={i.href}
          href={i.href}
          className={i.activo ? "activo" : ""}
          aria-current={i.activo ? "page" : undefined}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // abrir en otra pestana: normal
            e.preventDefault();
            if (i.activo) return;
            setDestino(i.href.split("?")[0]);
            empezar(() => router.push(i.href));
          }}
        >
          {i.etiqueta}
        </a>
      ))}
    </nav>
  );
}
