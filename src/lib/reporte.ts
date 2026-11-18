import "server-only";
import { admin } from "./supabase/admin";
import { eventoDe, aMs, aIso, sumaDias, type EventoActivo } from "./eventos";

export type Modo = "semana" | "fecha" | "evento";
export type Fila = { clave?: string; nombre: string; a: number; l: number; ua?: number; ul?: number; ta?: number; tl?: number };
export type Reporte = {
  total: { a: number; l: number; ua: number; ul: number; ta: number; tl: number };
  tiendas: Fila[];
  formas: Fila[];
  vendedores: Fila[];
  horas: { hr: number; a: number; l: number }[];
};

const TZ = "America/Mexico_City";

export function ahoraMx() {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { hoy: `${p.year}-${p.month}-${p.day}`, hora: Number(p.hour) };
}

// Mismo dia calendario del anio anterior (29 de febrero -> 28).
export function haceUnAnio(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dim = new Date(Date.UTC(y - 1, m, 0)).getUTCDate();
  return `${y - 1}-${String(m).padStart(2, "0")}-${String(Math.min(d, dim)).padStart(2, "0")}`;
}

export function fechaComparable(fecha: string, modo: Modo, ev: EventoActivo | null) {
  if (modo === "evento" && ev) return sumaDias(ev.lyInicio, ev.dia - 1);
  if (modo === "fecha") return haceUnAnio(fecha);
  return sumaDias(fecha, -364); // mismo dia de la semana
}

export type Consulta = {
  fecha: string;
  modo: Modo;
  acumulado: boolean; // false = solo el dia; true = del inicio del mes (o del evento) al dia
  tiendas: string[] | null; // null = todas
  hastaHora?: number; // corte manual; por defecto la hora actual si la fecha es hoy
};

export async function consultar(c: Consulta) {
  const ev = eventoDe(c.fecha);
  const modo: Modo = c.modo === "evento" && !ev ? "semana" : c.modo;
  const lyFecha = fechaComparable(c.fecha, modo, ev);

  let aDesde = c.fecha;
  let lDesde = lyFecha;
  if (c.acumulado) {
    if (modo === "evento" && ev) {
      aDesde = ev.inicio;
      lDesde = ev.lyInicio;
    } else {
      aDesde = c.fecha.slice(0, 8) + "01";
      const desfase = Math.round((aMs(c.fecha) - aMs(lyFecha)) / 86400000);
      lDesde = aIso(aMs(aDesde) - desfase * 86400000);
    }
  }

  const { hoy, hora } = ahoraMx();
  let corte: number | null = null;
  if (c.hastaHora && c.hastaHora >= 1 && c.hastaHora <= 24) corte = c.hastaHora;
  else if (c.fecha === hoy) corte = hora; // hoy: solo horas completas, igual que el reporte de Telegram
  if (corte === 24) corte = null;

  const { data, error } = await admin().rpc("rpt_ventas", {
    p_a_desde: aDesde,
    p_a_hasta: c.fecha,
    p_l_desde: lDesde,
    p_l_hasta: lyFecha,
    p_corte: corte,
    p_tiendas: c.tiendas,
  });
  if (error) throw new Error(error.message);
  return { r: data as Reporte, ev, modo, aDesde, lDesde, lHasta: lyFecha, corte };
}

export async function ultimaActualizacion(): Promise<string | null> {
  const { data } = await admin()
    .from("carga_log")
    .select("terminado")
    .eq("ok", true)
    .order("terminado", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.terminado as string | undefined) ?? null;
}
