// Eventos comerciales (Buen Fin...). Para agregar otro anio o evento, solo agrega un periodo aqui.
export type Periodo = { anio: number; inicio: string; fin: string };
export type Evento = { nombre: string; corto: string; periodos: Periodo[] };

export const EVENTOS: Evento[] = [
  {
    nombre: "El Buen Fin",
    corto: "Buen Fin",
    periodos: [
      { anio: 2025, inicio: "2025-11-13", fin: "2025-11-17" },
      { anio: 2026, inicio: "2026-11-13", fin: "2026-11-17" },
    ],
  },
];

export type EventoActivo = {
  nombre: string;
  corto: string;
  dia: number; // dia N del evento
  total: number; // dias que dura
  inicio: string;
  lyInicio: string; // inicio del evento anterior
};

const MS = 86400000;
export const aMs = (iso: string) => Date.parse(iso + "T00:00:00Z");
export const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const sumaDias = (iso: string, n: number) => aIso(aMs(iso) + n * MS);

// Evento en el que cae la fecha (si hay periodo anterior para comparar).
export function eventoDe(fecha: string): EventoActivo | null {
  for (const e of EVENTOS) {
    const p = e.periodos.find((x) => fecha >= x.inicio && fecha <= x.fin);
    if (!p) continue;
    const prev = e.periodos.filter((x) => x.anio < p.anio).sort((a, b) => b.anio - a.anio)[0];
    if (!prev) return null;
    const dia = Math.round((aMs(fecha) - aMs(p.inicio)) / MS) + 1;
    const total = Math.round((aMs(p.fin) - aMs(p.inicio)) / MS) + 1;
    return { nombre: e.nombre, corto: e.corto, dia, total, inicio: p.inicio, lyInicio: prev.inicio };
  }
  return null;
}
