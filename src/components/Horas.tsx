import { pesos, num } from "@/lib/format";

type H = { hr: number; a: number; l: number };

const pct1 = (n: number) => `${n.toFixed(n >= 100 ? 0 : 1)}%`;

// Venta por hora ACUMULADA contra la META acumulada (lo que se vendio el año pasado hasta esa hora, dia completo).
// Por hora muestra: meta acumulada, venta acumulada, % de alcance, monto faltante y % faltante.
export function Horas({ horas, corte, ay }: { horas: H[]; corte: number | null; ay: string }) {
  const filas = horas.filter((h) => h.a !== 0 || h.l !== 0).sort((x, y) => x.hr - y.hr);
  if (!filas.length) return <p className="muted">Sin datos para mostrar.</p>;
  const cerrada = (hr: number) => corte === null || hr < corte; // hora ya completa (con venta registrada)

  const totL = filas.reduce((s, h) => s + h.l, 0);
  const totA = filas.reduce((s, h) => s + (cerrada(h.hr) ? h.a : 0), 0);
  const escala = Math.max(totL, totA, 1);

  let cumL = 0, cumA = 0;
  const datos = filas.map((h) => {
    const ok = cerrada(h.hr);
    cumL += h.l;
    if (ok) cumA += h.a;
    // Hora cerrada: lo que falta para igualar la meta acumulada de esa hora.
    // Hora pendiente: lo que falta (con lo vendido hasta ahora) para llegar a la meta acumulada de esa hora.
    return { hr: h.hr, ok, metaAcum: cumL, ventaAcum: cumA, falta: cumL - cumA };
  });

  const alcTotal = totL > 0 ? (totA / totL) * 100 : null;
  const faltaTotal = totL - totA;
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>Hora</th>
            <th className="n">Meta acum. (año pasado)</th>
            <th>{ay} acum.</th>
            <th className="n">Alcance</th>
            <th className="n">Falta $</th>
            <th className="n">Falta %</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => {
            const al = d.ok && d.metaAcum > 0 ? (d.ventaAcum / d.metaAcum) * 100 : null;
            const superada = d.falta <= 0;
            return (
              <tr key={d.hr} className={d.ok ? "" : "pendiente"}>
                <td>{String(d.hr).padStart(2, "0")}:00</td>
                <td className="n muted">{pesos(d.metaAcum)}</td>
                <td>
                  {d.ok ? (
                    <div className="barra">
                      <span style={{ width: `${Math.max(0, (d.ventaAcum / escala) * 100)}%` }} />
                      <b>{pesos(d.ventaAcum)}</b>
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className={"n " + (al === null ? "" : al >= 100 ? "pos" : "neg")}>{al === null ? "—" : pct1(al)}</td>
                <td className="n">{superada ? <span className="pos">+{num(Math.round(-d.falta))}</span> : pesos(d.falta)}</td>
                <td className="n">{d.metaAcum > 0 ? (superada ? <span className="pos">0%</span> : pct1((d.falta / d.metaAcum) * 100)) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>DÍA</td>
            <td className="n">{pesos(totL)}</td>
            <td>{pesos(totA)}</td>
            <td className={"n " + (alcTotal !== null && alcTotal >= 100 ? "pos" : "neg")}>{alcTotal === null ? "—" : pct1(alcTotal)}</td>
            <td className="n">{faltaTotal > 0 ? pesos(faltaTotal) : <span className="pos">Meta superada</span>}</td>
            <td className="n">{totL > 0 ? (faltaTotal > 0 ? pct1((faltaTotal / totL) * 100) : "0%") : "—"}</td>
          </tr>
        </tfoot>
      </table>
      <p className="muted chico nota">
        Meta = lo vendido el año pasado hasta esa hora (día completo), acumulado. Falta = lo que resta para igualarla. En las horas en gris
        (aún sin cerrar) Falta indica cuánto hay que vender, a partir de lo que ya se lleva, para llegar a la meta acumulada de esa hora.
      </p>
    </div>
  );
}
