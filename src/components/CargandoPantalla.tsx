"use client";
import { useEffect, useRef, useState } from "react";
import { calcularProgreso, guardarDuracion, leerEstimado, type EvCarga } from "@/lib/carga";

// Pantalla de carga: bloquea la pantalla con un engrane y el % de avance mientras se actualizan los datos.
// No aparece en cargas rapidas (menos de 0.3 s) para no parpadear.
export function CargandoPantalla() {
  const [visible, setVisible] = useState(false);
  const [pct, setPct] = useState(0);
  const activos = useRef(new Set<string>());
  const inicio = useRef(0);
  const clave = useRef("/");
  const estimado = useRef(2500);
  const tAparece = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tCierra = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const hayPantalla = useRef(false);

  useEffect(() => {
    function limpiar() {
      if (tAparece.current) clearTimeout(tAparece.current);
      if (tCierra.current) clearTimeout(tCierra.current);
      if (tick.current) clearInterval(tick.current);
      tAparece.current = tCierra.current = null;
      tick.current = null;
    }
    function empezar(c: string) {
      limpiar();
      inicio.current = Date.now();
      clave.current = c;
      estimado.current = leerEstimado(c);
      hayPantalla.current = false;
      setPct(0);
      tAparece.current = setTimeout(() => { hayPantalla.current = true; setVisible(true); }, 300);
      tick.current = setInterval(() => setPct(calcularProgreso(Date.now() - inicio.current, estimado.current)), 100);
    }
    function terminar() {
      if (tick.current) clearInterval(tick.current);
      if (tAparece.current) clearTimeout(tAparece.current);
      tick.current = tAparece.current = null;
      guardarDuracion(clave.current, Date.now() - inicio.current);
      if (hayPantalla.current) {
        setPct(100);
        tCierra.current = setTimeout(() => { setVisible(false); setPct(0); hayPantalla.current = false; }, 350);
      }
    }
    function alEvento(e: Event) {
      const { id, activo, clave: c } = (e as CustomEvent<EvCarga>).detail;
      if (activo) {
        const vacio = activos.current.size === 0;
        activos.current.add(id);
        if (vacio) empezar(c);
      } else {
        const habia = activos.current.delete(id);
        if (habia && activos.current.size === 0) terminar();
      }
    }
    window.addEventListener("carga", alEvento);
    return () => { window.removeEventListener("carga", alEvento); limpiar(); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [visible]);

  if (!visible) return null;
  const n = Math.min(100, Math.floor(pct));
  return (
    <div className="cargando-fondo" role="alert" aria-busy="true" aria-live="polite">
      <div className="cargando-tarjeta">
        <svg className="engrane" viewBox="0 0 48 48" width="64" height="64" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
            <circle cx="24" cy="24" r="9" />
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1="24" y1="4" x2="24" y2="10" transform={`rotate(${i * 45} 24 24)`} />
            ))}
          </g>
        </svg>
        <b>Cargando datos…</b>
        <div className="cargando-barra"><i style={{ width: `${n}%` }} /></div>
        <span className="cargando-pct">{n}%</span>
        <small>Avance estimado</small>
      </div>
    </div>
  );
}
