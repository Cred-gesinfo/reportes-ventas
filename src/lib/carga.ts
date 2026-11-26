// Pantalla de carga: avisos entre componentes y calculo del avance estimado.
// El servidor no informa un % real mientras calcula, asi que el avance se ESTIMA con lo que suele tardar esa pantalla
// en este navegador (se aprende solo) y llega a 100% cuando la carga termina de verdad.

export type EvCarga = { id: string; activo: boolean; clave: string };

export function avisarCarga(id: string, activo: boolean, clave: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<EvCarga>("carga", { detail: { id, activo, clave } }));
}

const DEFECTO: Record<string, number> = { "/": 2000, "/acumulado": 2800, "/anio": 5000 };
export const estimadoPorDefecto = (ruta: string) => DEFECTO[ruta] ?? 2500;

export function leerEstimado(ruta: string): number {
  try {
    const v = Number(localStorage.getItem("carga:" + ruta));
    return v >= 300 ? v : estimadoPorDefecto(ruta);
  } catch {
    return estimadoPorDefecto(ruta);
  }
}

export function guardarDuracion(ruta: string, ms: number) {
  if (ms < 150) return;
  try {
    const previo = Number(localStorage.getItem("carga:" + ruta));
    const nuevo = previo >= 300 ? previo * 0.6 + ms * 0.4 : ms;
    localStorage.setItem("carga:" + ruta, String(Math.round(Math.min(nuevo, 60_000))));
  } catch {
    /* sin almacenamiento */
  }
}

// 0 a 90% durante el tiempo estimado (rapido al inicio); despues se acerca despacio a 99% sin llegar hasta que termine.
export function calcularProgreso(ms: number, estimado: number): number {
  const t = ms / Math.max(estimado, 400);
  if (t <= 1) return 90 * (1 - Math.pow(1 - t, 2));
  return 90 + 9 * (1 - Math.exp(-(t - 1) * 1.2));
}
