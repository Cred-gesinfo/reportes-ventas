import type { IndFila } from "@/lib/reporte";

const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const ent = (n: number) => nf.format(Math.round(n));
const pct = (a: number, b: number) => (b ? `${Math.round((a / b - 1) * 100)}%` : "");
const neg = (n: number) => (n < 0 ? "neg" : "");
const vacioCero = (n: number, txt: string) => (n === 0 ? "" : txt);

type Fila = IndFila & { ac?: number; ai?: number };

// Una fila del reporte: ventas, unidades, forma de pago, ticket promedio, venta por empleado, indice de venta y venta por m2.
function Celdas({ f, plantilla, m2, total }: { f: Fila; plantilla: number | null; m2: number | null; total?: boolean }) {
  const dv = f.a - f.l;
  const t26 = f.ta ? f.a / f.ta : null;
  const t25 = f.tl ? f.l / f.tl : null;
  const i26 = f.ta ? f.ua / f.ta : null;
  const i25 = f.tl ? f.ul / f.tl : null;
  const e26 = plantilla ? f.a / plantilla : null;
  const e25 = plantilla ? f.l / plantilla : null;
  const m26 = m2 ? f.a / m2 : null;
  const m25 = m2 ? f.l / m2 : null;
  const du = f.ua - f.ul;
  const ac = f.ac ?? 0;
  const ai = f.ai ?? 0;
  const par = (x: number) => (f.a ? `${Math.round((x / f.a) * 100)}%` : "");
  const v = (x: number | null, fmt: (n: number) => string) => (x === null || x === 0 ? "" : fmt(x));
  const dec1 = (n: number) => n.toFixed(1);
  const varp = (x: number | null, y: number | null) => (x !== null && y !== null && y !== 0 ? `${Math.round((x / y - 1) * 100)}%` : "");
  const cn = (x: number | null, y: number | null) => (x !== null && y !== null && y !== 0 && x < y ? "neg" : "");
  void total;
  return (
    <>
      {/* VENTAS TOTALES */}
      <td className="n">{vacioCero(f.a, ent(f.a))}</td>
      <td className="n">{ent(f.l)}</td>
      <td className={"n " + neg(dv)}>{dv === 0 ? "" : ent(dv)}</td>
      <td className={"n " + neg(dv)}>{pct(f.a, f.l)}</td>
      {/* UNIDADES */}
      <td className="n bl">{vacioCero(f.ua, ent(f.ua))}</td>
      <td className="n">{vacioCero(f.ul, ent(f.ul))}</td>
      <td className={"n " + neg(du)}>{du === 0 ? "" : ent(du)}</td>
      <td className={"n " + neg(du)}>{pct(f.ua, f.ul)}</td>
      {/* FORMA DE PAGO 2026 */}
      <td className="n bl">{vacioCero(ac, ent(ac))}</td>
      <td className="n">{ac ? par(ac) : ""}</td>
      <td className="n">{vacioCero(ai, ent(ai))}</td>
      <td className="n">{ai ? par(ai) : ""}</td>
      {/* TICKET PROMEDIO */}
      <td className="n bl">{v(t26, ent)}</td>
      <td className="n">{v(t25, ent)}</td>
      <td className={"n " + cn(t26, t25)}>{varp(t26, t25)}</td>
      {/* VENTA POR EMPLEADO */}
      <td className="n bl">{v(e26, ent)}</td>
      <td className="n">{v(e25, ent)}</td>
      <td className={"n " + neg(dv)}>{pct(f.a, f.l)}</td>
      {/* INDICE DE VENTA (piezas por ticket) */}
      <td className="n bl">{v(i26, dec1)}</td>
      <td className="n">{v(i25, dec1)}</td>
      <td className={"n " + cn(i26, i25)}>{varp(i26, i25)}</td>
      {/* VENTA POR M2 */}
      <td className="n bl">{v(m26, ent)}</td>
      <td className="n">{v(m25, ent)}</td>
      <td className={"n " + neg(dv)}>{pct(f.a, f.l)}</td>
    </>
  );
}

export function TablaIndicadores({ primera, filas, total, plantilla, m2, anioA, anioL, porForma }: {
  primera: string; filas: Fila[]; total: Fila; plantilla: number | null; m2: number | null; anioA: number; anioL: number; porForma?: boolean;
}) {
  // En la tabla por forma de pago, la venta de cada fila cuenta como Contado o Institucional segun su propio nombre.
  const adaptar = (f: Fila): Fila =>
    porForma ? { ...f, ac: f.nombre === "Contado" ? f.a : 0, ai: f.nombre === "Institucional" ? f.a : 0 } : f;
  const nombreForma = (n: string) => (n === "Credito directo" ? "Crédito directo" : n);
  return (
    <div className="ind-wrap scroll">
      <table className="ind">
        <thead>
          <tr>
            <th className="primera" rowSpan={2}>{primera}</th>
            <th colSpan={4} className="g1">VENTAS TOTALES</th>
            <th colSpan={4} className="g2">UNIDADES</th>
            <th colSpan={4} className="g1">FORMA DE PAGO {anioA}</th>
            <th colSpan={3} className="g2">TICKET PROMEDIO</th>
            <th colSpan={3} className="g1">VTA X EMPLEADO</th>
            <th colSpan={3} className="g2">ÍNDICE DE VENTA</th>
            <th colSpan={3} className="g1">VENTA M²</th>
          </tr>
          <tr>
            <th className="g1 n">{anioA}</th><th className="g1 n">Total {anioL}</th><th className="g1 n">Var</th><th className="g1 n">Var %</th>
            <th className="g2 n">{anioA}</th><th className="g2 n">{anioL}</th><th className="g2 n">Var</th><th className="g2 n">Var %</th>
            <th className="g1 n">Contado</th><th className="g1 n">% part</th><th className="g1 n">Inst</th><th className="g1 n">% part</th>
            <th className="g2 n">{anioA}</th><th className="g2 n">{anioL}</th><th className="g2 n">Var %</th>
            <th className="g1 n">{anioA}</th><th className="g1 n">{anioL}</th><th className="g1 n">Var %</th>
            <th className="g2 n">{anioA}</th><th className="g2 n">{anioL}</th><th className="g2 n">Var %</th>
            <th className="g1 n">{anioA}</th><th className="g1 n">{anioL}</th><th className="g1 n">Var %</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={(f.clave ?? "") + f.nombre}>
              <td className="primera">{porForma ? nombreForma(f.nombre) : f.nombre}</td>
              <Celdas f={adaptar(f)} plantilla={plantilla} m2={m2} />
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="primera">Total general</td>
            <Celdas f={total} plantilla={plantilla} m2={m2} total />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
