import { pesos, dif, varPct, clase, num } from "@/lib/format";
import type { Fila } from "@/lib/reporte";

export function Tabla({ primera, filas, total, ay, ly, piezas, resaltar }: {
  primera: string; filas: Fila[]; total?: boolean; ay: string; ly: string; piezas?: boolean; resaltar?: string | null;
}) {
  if (!filas.length) return <p className="muted">Sin datos para mostrar.</p>;
  const sa = filas.reduce((s, f) => s + f.a, 0);
  const sl = filas.reduce((s, f) => s + f.l, 0);
  const pa = filas.reduce((s, f) => s + (f.ua ?? 0), 0);
  const pl = filas.reduce((s, f) => s + (f.ul ?? 0), 0);
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>{primera}</th>
            <th className="n">{ay}</th>
            <th className="n">{ly}</th>
            <th className="n">Dif. $</th>
            <th className="n">Var. %</th>
            {piezas && <th className="n">Pzas {ay.toLowerCase()}</th>}
            {piezas && <th className="n">Pzas {ly.toLowerCase()}</th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={(f.clave ?? "") + f.nombre} className={resaltar && f.nombre === resaltar ? "activa" : ""}>
              <td>{f.clave && f.clave.startsWith("TC") ? `${f.clave} ${f.nombre}` : f.nombre}</td>
              <td className="n">{pesos(f.a)}</td>
              <td className="n muted">{pesos(f.l)}</td>
              <td className={"n " + clase(f.a - f.l)}>{dif(f.a - f.l)}</td>
              <td className={"n " + clase(f.a - f.l)}>{varPct(f.a, f.l) ?? "—"}</td>
              {piezas && <td className="n">{num(f.ua ?? 0)}</td>}
              {piezas && <td className="n muted">{num(f.ul ?? 0)}</td>}
            </tr>
          ))}
        </tbody>
        {total && (
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td className="n">{pesos(sa)}</td>
              <td className="n">{pesos(sl)}</td>
              <td className={"n " + clase(sa - sl)}>{dif(sa - sl)}</td>
              <td className={"n " + clase(sa - sl)}>{varPct(sa, sl) ?? "—"}</td>
              {piezas && <td className="n">{num(pa)}</td>}
              {piezas && <td className="n">{num(pl)}</td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
