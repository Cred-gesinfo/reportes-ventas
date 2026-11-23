"use client";
import { useMemo, useState } from "react";

type Mes = { m: number; a: number; l: number; lc: number };

const W = 760, H = 300, ML = 64, MR = 26, MT = 16, MB = 34;
const pw = W - ML - MR, ph = H - MT - MB;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const pesos = (n: number) => "$" + new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(Math.round(n));
const corto = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);

function paso(max: number) {
  const bruto = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(bruto || 1)));
  const f = bruto / mag;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mag;
}

// Venta del año por MES: este año (hasta la fecha) contra el año pasado completo.
export function GraficaMeses({ meses, mesActual, diaActual, cuota, anioA, anioL }: {
  meses: Mes[]; mesActual: number; diaActual: number; cuota: number; anioA: number; anioL: number;
}) {
  const [modo, setModo] = useState<"acum" | "mes">("acum");
  const [hover, setHover] = useState<number | null>(null);

  const { a, l, lc } = useMemo(() => {
    const a = Array(13).fill(0), l = Array(13).fill(0), lc = Array(13).fill(0);
    for (const x of meses) if (x.m >= 1 && x.m <= 12) { a[x.m] = x.a; l[x.m] = x.l; lc[x.m] = x.lc; }
    return { a, l, lc };
  }, [meses]);

  const serie = useMemo(() => {
    if (modo === "mes") return { a, l, lc };
    const ca = [0], cl = [0], cc = [0];
    for (let m = 1; m <= 12; m++) { ca[m] = ca[m - 1] + a[m]; cl[m] = cl[m - 1] + l[m]; cc[m] = cc[m - 1] + lc[m]; }
    return { a: ca, l: cl, lc: cc };
  }, [modo, a, l, lc]);

  const maxV = Math.max(1, ...serie.l.slice(1), ...serie.a.slice(1, mesActual + 1));
  const st = paso(maxV * 1.05);
  const yMax = Math.ceil((maxV * 1.05) / st) * st;
  const y = (v: number) => MT + ph - (v / yMax) * ph;
  const slot = pw / 12;
  const xc = (m: number) => ML + (m - 1) * slot + slot / 2; // centro de cada mes
  const ticks: number[] = [];
  for (let v = 0; v <= yMax + 1e-6; v += st) ticks.push(v);

  const ruta = (arr: number[], hasta: number) =>
    Array.from({ length: hasta }, (_, i) => `${i ? "L" : "M"}${xc(i + 1).toFixed(1)},${y(arr[i + 1]).toFixed(1)}`).join(" ");

  const h = hover ?? mesActual;
  const valA = h <= mesActual ? serie.a[h] : null;
  const valL = serie.l[h];
  const valLC = h <= mesActual ? serie.lc[h] : null;

  function mover(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const xv = ((e.clientX - r.left) * W) / r.width;
    setHover(Math.min(12, Math.max(1, Math.floor((xv - ML) / slot) + 1)));
  }

  return (
    <div>
      <div className="grafica-cab">
        <p className="muted chico">Este año contra el año pasado completo, mes a mes.</p>
        <div className="seg">
          <button type="button" className={modo === "acum" ? "on" : ""} onClick={() => setModo("acum")}>Acumulada</button>
          <button type="button" className={modo === "mes" ? "on" : ""} onClick={() => setModo("mes")}>Por mes</button>
        </div>
      </div>
      <div className="scroll grafica">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Venta por mes, este año contra el año pasado" onMouseMove={mover} onMouseLeave={() => setHover(null)}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={ML} x2={W - MR} y1={y(v)} y2={y(v)} className="rej" />
              <text x={ML - 8} y={y(v) + 4} textAnchor="end" className="eje">{corto(v)}</text>
            </g>
          ))}
          {MESES.map((nom, i) => (
            <text key={nom} x={xc(i + 1)} y={H - 12} textAnchor="middle" className="eje">{nom}</text>
          ))}
          <line x1={xc(mesActual)} x2={xc(mesActual)} y1={MT} y2={MT + ph} className="hoy" />
          {modo === "acum" ? (
            <>
              <path d={ruta(serie.l, 12)} className="l-l" />
              <path d={ruta(serie.a, mesActual)} className="l-a" />
              <circle cx={xc(12)} cy={y(serie.l[12])} r={4} className="p-l" />
              <text x={xc(12)} y={y(serie.l[12]) - 9} textAnchor="end" className="etq">Cuota {corto(cuota)}</text>
              <circle cx={xc(mesActual)} cy={y(serie.lc[mesActual])} r={3.5} className="p-l" />
              <circle cx={xc(mesActual)} cy={y(serie.a[mesActual])} r={4.5} className="p-a" />
            </>
          ) : (
            Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <g key={m}>
                <rect x={xc(m) - slot * 0.4} width={slot * 0.38} y={y(serie.l[m])} height={Math.max(0, MT + ph - y(serie.l[m]))} className="b-l" />
                {m <= mesActual && (
                  <rect x={xc(m) + slot * 0.02} width={slot * 0.38} y={y(serie.a[m])} height={Math.max(0, MT + ph - y(serie.a[m]))} className="b-a" />
                )}
              </g>
            ))
          )}
          {hover !== null && <line x1={xc(hover)} x2={xc(hover)} y1={MT} y2={MT + ph} className="guia" />}
        </svg>
      </div>
      <p className="lectura">
        <span className="k-a"><b>{MESES[h - 1]} {anioA}</b>{modo === "acum" ? " (acumulado)" : ""}: {valA === null ? "—" : pesos(valA)}</span> ·{" "}
        <span className="k-l"><b>{MESES[h - 1]} {anioL}</b>{modo === "acum" ? " (acumulado, completo)" : " (mes completo)"}: {pesos(valL)}</span>
        {h === mesActual && valLC !== null && (
          <> · <span className="k-l">año pasado a la misma fecha: <b>{pesos(valLC)}</b></span></>
        )}
        {modo === "acum" && h <= mesActual && valA !== null && valLC !== null && valLC > 0 && (
          <> · <b className={valA >= valLC ? "pos" : "neg"}>{((valA / valLC - 1) * 100).toFixed(1)}%</b> vs misma fecha</>
        )}
      </p>
      <p className="muted chico">
        {MESES[mesActual - 1]} {anioA} va al día {diaActual}; se compara con el {MESES[mesActual - 1]} {anioL} hasta ese mismo día (el mes completo del año pasado es parte de la cuota anual).
      </p>
    </div>
  );
}
