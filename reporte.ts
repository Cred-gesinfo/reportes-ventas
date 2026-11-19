import "server-only";
import { admin } from "./supabase/admin";

export type Modo = "semana" | "fecha";
export type Fila = { clave?: string; nombre: string; a: number; l: number; ua?: number; ul?: number; ta?: number; tl?: number };
export type Reporte = {
  total: { a: number; l: number; ua: number; ul: number; ta: number; tl: number };
  cuota: number; // venta COMPLETA del anio pasado (dia completo o mes completo), sin corte de hora
  tiendas: Fila[];
  formas: Fila[];
  categorias: Fila[];
  vendedores: Fila[];
  horas: { hr: number; a: number; l: number }[];
  dias: { d: number; a: number; l: number }[]; // venta por dia del mes a dias iguales (l = anio pasado completo)
};

const TZ = "America/Mexico_City";
const MS = 86400000;
const aMs = (iso: string) => Date.parse(iso + "T00:00:00Z");
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const sumaDias = (iso: string, n: number) => aIso(aMs(iso) + n * MS);

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

export function fechaComparable(fecha: string, modo: Modo) {
  return modo === "fecha" ? haceUnAnio(fecha) : sumaDias(fecha, -364); // misma fecha | mismo dia de la semana
}

export function finDeMes(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export const diasDelMes = (iso: string) => Number(finDeMes(iso).slice(8));

export type Consulta = {
  fecha: string;
  modo: Modo;
  acumulado: boolean; // false = solo el dia; true = del dia 1 del mes al dia
  tiendas: string[] | null; // null = todas
  hastaHora?: number; // corte manual; por defecto la hora actual si la fecha es hoy
};

export async function consultar(c: Consulta) {
  // El acumulado SIEMPRE es a fechas iguales (1 al N del mes vs 1 al N del mes del anio pasado), nunca a dias de la semana.
  const modo: Modo = c.acumulado ? "fecha" : c.modo;
  const lyFecha = fechaComparable(c.fecha, modo);
  const aDesde = c.acumulado ? c.fecha.slice(0, 8) + "01" : c.fecha;
  const lDesde = c.acumulado ? haceUnAnio(aDesde) : lyFecha;
  // Cuota = venta COMPLETA del anio pasado: el mes completo (acumulado) o el mismo dia completo (dia)
  const lFin = c.acumulado ? finDeMes(lDesde) : lyFecha;

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
    p_l_fin: lFin,
  });
  if (error) throw new Error(error.message);
  return { r: data as Reporte, modo, aDesde, lDesde, lHasta: lyFecha, lFin, corte };
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
