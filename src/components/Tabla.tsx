import { pesos, dif, varPct, clase } from "@/lib/format";
import type { Fila } from "@/lib/reporte";

export function Tabla({ titulo, primera, filas, total, ay, ly }: { titulo: string; primera: string; filas: Fila[]; total?: boolean; ay: string; ly: string }) {
  if (!filas.length) return null;
  const sa = filas.reduce((s, f) => s + f.a, 0);
  const sl = filas.reduce((s, f) => s + f.l, 0);
  return (
    <section className="bloque">
      <h2>{titulo}</h2>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>{primera}</th>
              <th className="n">{ay}</th>
              <th className="n">{ly}</th>
              <th className="n">Dif. $</th>
              <th className="n">Var. %</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={(f.clave ?? "") + f.nombre}>
                <td>{f.clave && f.clave.startsWith("TC") ? `${f.clave} ${f.nombre}` : f.nombre}</td>
                <td className="n">{pesos(f.a)}</td>
                <td className="n muted">{pesos(f.l)}</td>
                <td className={"n " + clase(f.a - f.l)}>{dif(f.a - f.l)}</td>
                <td className={"n " + clase(f.a - f.l)}>{varPct(f.a, f.l) ?? "—"}</td>
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
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
