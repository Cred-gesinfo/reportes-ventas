import { pesos, num } from "@/lib/format";

type H = { hr: number; a: number; l: number };

// Venta por hora contra la META de esa hora (lo que se vendio el año pasado en esa misma hora, dia completo).
// Muestra alcance por hora, lo que falta y el alcance acumulado del dia.
export function Horas({ horas, corte, ay }: { horas: H[]; corte: number | null; ay: string }) {
  const filas = horas.filter((h) => h.a !== 0 || h.l !== 0).sort((x, y) => x.hr - y.hr);
  if (!filas.length) return <p className="muted">Sin datos para mostrar.</p>;
  const max = Math.max(...filas.map((h) => Math.max(h.a, h.l)), 1);
  const cerrada = (hr: number) => corte === null || hr < corte; // hora ya completa (con venta registrada)
  let cumA = 0, cumL = 0;
  const totA = filas.reduce((s, h) => s + (cerrada(h.hr) ? h.a : 0), 0);
  const totL = filas.reduce((s, h) => s + h.l, 0);
  const pct = (a: number, l: number) => (l > 0 ? (a / l) * 100 : null);
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>Hora</th>
            <th className="n">Meta (año pasado)</th>
            <th>{ay}</th>
            <th className="n">Alcance</th>
            <th className="n">Falta</th>
            <th className="n">Alcance acum.</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((h) => {
            const ok = cerrada(h.hr);
            if (ok) { cumA += h.a; }
            cumL += h.l;
            const al = ok ? pct(h.a, h.l) : null;
            const ac = ok ? pct(cumA, cumL) : null;
            const falta = h.l - h.a;
            return (
              <tr key={h.hr} className={ok ? "" : "pendiente"}>
                <td>{String(h.hr).padStart(2, "0")}:00</td>
                <td className="n muted">{pesos(h.l)}</td>
                <td>
                  {ok ? (
                    <div className="barra">
                      <span style={{ width: `${Math.max(0, (h.a / max) * 100)}%` }} />
                      <b>{pesos(h.a)}</b>
                    </div>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td className={"n " + (al === null ? "" : al >= 100 ? "pos" : "neg")}>{al === null ? "—" : `${al.toFixed(0)}%`}</td>
                <td className="n">{!ok ? pesos(h.l) : falta > 0 ? pesos(falta) : <span className="pos">+{num(Math.round(-falta))}</span>}</td>
                <td className={"n " + (ac === null ? "" : ac >= 100 ? "pos" : "neg")}>{ac === null ? "—" : `${ac.toFixed(0)}%`}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>DÍA</td>
            <td className="n">{pesos(totL)}</td>
            <td>{pesos(totA)}</td>
            <td className={"n " + (pct(totA, totL) !== null && (pct(totA, totL) as number) >= 100 ? "pos" : "neg")}>{pct(totA, totL) === null ? "—" : `${(pct(totA, totL) as number).toFixed(1)}%`}</td>
            <td className="n">{totL - totA > 0 ? pesos(totL - totA) : <span className="pos">Meta superada</span>}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <p className="muted chico nota">Meta = lo vendido el año pasado en esa hora (día completo). &quot;Falta&quot; es lo que resta para igualarla. Las horas en gris aún no se cierran.</p>
    </div>
  );
}
