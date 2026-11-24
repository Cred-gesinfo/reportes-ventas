"use client";
import { useMemo, useState } from "react";

type Dia = { d: number; a: number; l: number };

const W = 760, H = 300, ML = 64, MR = 26, MT = 16, MB = 34;
const pw = W - ML - MR, ph = H - MT - MB;
const pesos = (n: number) => "$" + new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(Math.round(n));
const corto = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);

function paso(max: number) {
  const bruto = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto || 1)));
  const f = bruto / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

// Venta del mes a dias iguales: el dia N de este anio contra el dia N del anio pasado (anio pasado COMPLETO).
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// "vie 14/nov/2026" a partir del mes ("2026-11") y el dia
function fmt(mes: string, d: number) {
  const [y, m] = mes.split("-").map(Number);
  return `${DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}/${MESES[m - 1]}/${y}`;
}

export function GraficaDias({ dias, diasMes, diaActual, cuota, mesA, mesL }: { dias: Dia[]; diasMes: number; diaActual: number; cuota: number; mesA: string; mesL: string }) {
  const [modo, setModo] = useState<"acum" | "dia">("acum");
  const [hover, setHover] = useState<number | null>(null);

  const { a, l } = useMemo(() => {
    const a: number[] = Array(diasMes + 1).fill(0);
    const l: number[] = Array(diasMes + 1).fill(0);
    for (const x of dias) if (x.d >= 1 && x.d <= diasMes) { a[x.d] = x.a; l[x.d] = x.l; }
    return { a, l };
  }, [dias, diasMes]);

  const serie = useMemo(() => {
    if (modo === "dia") return { a, l };
    const ca = [0], cl = [0];
    for (let d = 1; d <= diasMes; d++) { ca[d] = ca[d - 1] + a[d]; cl[d] = cl[d - 1] + l[d]; }
    return { a: ca, l: cl };
  }, [modo, a, l, diasMes]);

  const maxV = Math.max(1, ...serie.l.slice(1), ...serie.a.slice(1, diaActual + 1));
  const st = paso(maxV * 1.05);
  const yMax = Math.ceil((maxV * 1.05) / st) * st;
  const y = (v: number) => MT + ph - (v / yMax) * ph;
  const lin = (d: number) => ML + (diasMes > 1 ? ((d - 1) / (diasMes - 1)) * pw : 0);
  const slot = pw / diasMes;
  const barX = (d: number) => ML + (d - 1) * slot + slot / 2;
  const x = modo === "dia" ? barX : lin;

  const ticks: number[] = [];
  for (let v = 0; v <= yMax + 1e-6; v += st) ticks.push(v);
  const diasX = Array.from({ length: diasMes }, (_, i) => i + 1).filter((d) => d === 1 || d === diasMes || d % 5 === 0);

  const ruta = (arr: number[], hasta: number) =>
    Array.from({ length: hasta }, (_, i) => `${i ? "L" : "M"}${lin(i + 1).toFixed(1)},${y(arr[i + 1]).toFixed(1)}`).join(" ");

  const h = hover ?? diaActual;
  const valA = h <= diaActual ? serie.a[h] : null;
  const valL = serie.l[h];

  function mover(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const xv = ((e.clientX - r.left) * W) / r.width;
    const d = modo === "dia" ? Math.floor((xv - ML) / slot) + 1 : Math.round(1 + ((xv - ML) / pw) * (diasMes - 1));
    setHover(Math.min(diasMes, Math.max(1, d)));
  }

  return (
    <div>
      <div className="grafica-cab">
        <p className="muted chico">Este año contra el año pasado completo, a fechas iguales.</p>
        <div className="seg">
          <button type="button" className={modo === "acum" ? "on" : ""} onClick={() => setModo("acum")}>Acumulada</button>
          <button type="button" className={modo === "dia" ? "on" : ""} onClick={() => setModo("dia")}>Por día</button>
        </div>
      </div>
      <div className="scroll grafica">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Venta por día del mes, este año contra el año pasado" onMouseMove={mover} onMouseLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={ML} x2={W - MR} y1={y(v)} y2={y(v)} className="rej" />
              <text x={ML - 8} y={y(v) + 4} textAnchor="end" className="eje">{corto(v)}</text>
            </g>
          ))}
          {diasX.map((d) => (
            <text key={d} x={x(d)} y={H - 12} textAnchor="middle" className="eje">{d}</text>
          ))}
          {/* marca de hoy */}
          <line x1={x(diaActual)} x2={x(diaActual)} y1={MT} y2={MT + ph} className="hoy" />
          {modo === "acum" ? (
            <>
              <path d={ruta(serie.l, diasMes)} className="l-l" />
              <path d={ruta(serie.a, diaActual)} className="l-a" />
              <circle cx={lin(diasMes)} cy={y(serie.l[diasMes])} r={4} className="p-l" />
              <text x={lin(diasMes)} y={y(serie.l[diasMes]) - 9} textAnchor="end" className="etq">Cuota {corto(cuota)}</text>
              <circle cx={lin(diaActual)} cy={y(serie.l[diaActual])} r={3.5} className="p-l" />
              <circle cx={lin(diaActual)} cy={y(serie.a[diaActual])} r={4.5} className="p-a" />
            </>
          ) : (
            Array.from({ length: diasMes }, (_, i) => i + 1).map((d) => (
              <g key={d}>
                <rect x={barX(d) - slot * 0.4} width={slot * 0.38} y={y(serie.l[d])} height={Math.max(0, MT + ph - y(serie.l[d]))} className="b-l" />
                {d <= diaActual && (
                  <rect x={barX(d) + slot * 0.02} width={slot * 0.38} y={y(serie.a[d])} height={Math.max(0, MT + ph - y(serie.a[d]))} className="b-a" />
                )}
              </g>
            ))
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={MT} y2={MT + ph} className="guia" />}
        </svg>
      </div>
      <p className="lectura">
        <span className="k-a"><b>{fmt(mesA, h)}</b>: {valA === null ? "—" : pesos(valA)}</span> ·{" "}
        <span className="k-l"><b>{fmt(mesL, h)}</b>{modo === "acum" ? " (acumulado)" : ""}: {pesos(valL)}</span>
        {modo === "acum" && valA !== null && valL > 0 && <> · <b className={valA >= valL ? "pos" : "neg"}>{((valA / valL - 1) * 100).toFixed(1)}%</b> vs mismo día</>}
      </p>
      <p className="muted chico">El día {diaActual} de este año se compara con el día {diaActual} del año pasado (pueden caer en distinto día de la semana). La línea del año pasado llega al cierre del mes: la cuota.</p>
    </div>
  );
}
