import "server-only";
import { admin } from "./supabase/admin";

export type Modo = "semana" | "fecha";
export type Periodo = "dia" | "mes" | "anio";
export type Fila = { clave?: string; nombre: string; a: number; l: number; c?: number; ua?: number; ul?: number; ta?: number; tl?: number };
export type Reporte = {
  total: { a: number; l: number; ua: number; ul: number; ta: number; tl: number; ca: number; cl: number };
  cuota: number; // venta COMPLETA del anio pasado (dia completo o mes completo), sin corte de hora
  tiendas: Fila[];
  formas: Fila[];
  categorias: Fila[];
  vendedores: Fila[];
  horas: { hr: number; a: number; l: number }[]; // l = anio pasado de ese dia COMPLETO (meta de la hora)
  dias: { d: number; a: number; l: number }[]; // venta por dia del mes a dias iguales (l = anio pasado completo)
  meses: { m: number; a: number; l: number; lc: number }[]; // venta por mes: l = mes completo del anio pasado; lc = anio pasado a la misma fecha
};

const TZ = "America/Mexico_City";
const MS = 86400000;
const aMs = (iso: string) => Date.parse(iso + "T00:00:00Z");
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const sumaDias = (iso: string, n: number) => aIso(aMs(iso) + n * MS);

export function ahoraMx(cuando: Date = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });
  const p = Object.fromEntries(f.formatToParts(cuando).map((x) => [x.type, x.value]));
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
  periodo: Periodo; // dia = solo el dia; mes = del dia 1 del mes al dia; anio = del 1 de enero al dia
  tiendas: string[] | null; // null = todas
  formas?: string[] | null; // filtro de forma de pago (null = todas)
  hastaHora?: number; // corte manual (ej. ?h=12); si no, para HOY se usa la hora de la ultima carga de datos
  ultimaCarga?: string | null; // hora (ISO) de la ultima carga correcta de datos
};

export async function consultar(c: Consulta) {
  // Los acumulados (mes y anio) SIEMPRE son a fechas iguales (1 al N vs 1 al N del anio pasado), nunca a dias de la semana.
  const modo: Modo = c.periodo !== "dia" ? "fecha" : c.modo;
  const lyFecha = fechaComparable(c.fecha, modo);
  const aDesde = c.periodo === "dia" ? c.fecha : c.periodo === "mes" ? c.fecha.slice(0, 8) + "01" : c.fecha.slice(0, 4) + "-01-01";
  const lDesde = c.periodo === "dia" ? lyFecha : haceUnAnio(aDesde);
  // Cuota = venta COMPLETA del anio pasado: el mismo dia completo, el mes completo o el anio completo
  const lFin = c.periodo === "dia" ? lyFecha : c.periodo === "mes" ? finDeMes(lDesde) : lDesde.slice(0, 4) + "-12-31";
  // En la pestana Dia la CUOTA (y la meta por hora) es SIEMPRE el mismo dia de la semana del anio pasado (364 dias antes),
  // se compare "a fechas" o "a dias": asi no cambia al mover ese selector.
  const cuotaFecha = c.periodo === "dia" ? sumaDias(c.fecha, -364) : null;

  const { hoy, hora } = ahoraMx();
  let corte: number | null = null;
  if (c.hastaHora && c.hastaHora >= 1 && c.hastaHora <= 24) corte = c.hastaHora;
  else if (c.fecha === hoy) {
    // Hoy solo cuentan las horas COMPLETAS que ya estan en el sistema. La referencia es la hora de la ultima carga
    // (no el reloj): si los datos llegan hasta las 12:32, el corte es 12:00 (la hora 12 aun esta incompleta).
    if (c.ultimaCarga) {
      const u = ahoraMx(new Date(c.ultimaCarga));
      corte = u.hoy === hoy ? Math.min(hora, u.hora) : 0; // ultima carga de un dia anterior: aun no hay horas completas de hoy
    } else corte = hora;
  }
  if (corte === 24) corte = null;

  const { data, error } = await admin().rpc("rpt_ventas", {
    p_a_desde: aDesde,
    p_a_hasta: c.fecha,
    p_l_desde: lDesde,
    p_l_hasta: lyFecha,
    p_corte: corte,
    p_tiendas: c.tiendas,
    p_l_fin: lFin,
    p_formas: c.formas ?? null,
    p_c_desde: cuotaFecha,
    p_c_hasta: cuotaFecha,
  });
  if (error) throw new Error(error.message);
  return { r: data as Reporte, modo, aDesde, lDesde, lHasta: lyFecha, lFin, corte, cuotaFecha };
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

// ---------- Indicadores operativos (pestana "Indicadores") ----------
export type IndFila = { clave?: string; nombre: string; a: number; l: number; ua: number; ul: number; ta: number; tl: number; ac?: number; ai?: number };
export type Indicadores = {
  plantilla: number | null; // empleados de las tiendas elegidas
  m2: number | null; // m2 de exhibicion de las tiendas elegidas
  tiendas: { clave: string; nombre: string }[];
  total: IndFila & { ac: number; ai: number };
  formas: IndFila[];
  vendedores: (IndFila & { ac: number; ai: number })[];
};

// "mes": del dia 1 del mes al dia elegido contra el MES COMPLETO del anio pasado ("Total 2025"), como el reporte mensual de las tiendas.
// "anio": del 1 de enero al dia elegido contra el 1 de enero a la MISMA FECHA del anio pasado.
export async function consultarIndicadores(fecha: string, tiendas: string[] | null, periodo: "mes" | "anio" = "mes") {
  const aDesde = periodo === "anio" ? fecha.slice(0, 4) + "-01-01" : fecha.slice(0, 8) + "01";
  const lDesde = haceUnAnio(aDesde);
  const lHasta = periodo === "anio" ? haceUnAnio(fecha) : finDeMes(lDesde);
  const { data, error } = await admin().rpc("rpt_indicadores", {
    p_desde: aDesde,
    p_hasta: fecha,
    p_l_desde: lDesde,
    p_l_hasta: lHasta,
    p_tiendas: tiendas,
  });
  if (error) throw new Error(error.message);
  return { r: data as Indicadores, aDesde, lDesde, lHasta };
}
