"use client";
import { useEffect, useState } from "react";

// Bloque que se puede contraer. Recuerda (en este navegador) cuales dejaste cerrados.
export function Seccion({ id, titulo, badge, children }: { id: string; titulo: string; badge?: string; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState(true);
  useEffect(() => {
    try { if (localStorage.getItem("sec:" + id) === "0") setAbierta(false); } catch { /* sin almacenamiento */ }
  }, [id]);
  function alternar() {
    setAbierta((a) => {
      const n = !a;
      try { localStorage.setItem("sec:" + id, n ? "1" : "0"); } catch { /* sin almacenamiento */ }
      return n;
    });
  }
  return (
    <section className="bloque seccion">
      <button type="button" className="sec-cab" onClick={alternar} aria-expanded={abierta}>
        <span className="chev">{abierta ? "▾" : "▸"}</span>
        <h2>{titulo}</h2>
        {badge && <span className="filtro-badge">{badge}</span>}
        <span className="sec-ayuda">{abierta ? "Contraer" : "Mostrar"}</span>
      </button>
      {abierta && <div className="sec-cuerpo">{children}</div>}
    </section>
  );
}
