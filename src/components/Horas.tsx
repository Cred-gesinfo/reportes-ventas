import { pesos, dif, clase } from "@/lib/format";

export function Horas({ horas, ay, ly }: { horas: { hr: number; a: number; l: number }[]; ay: string; ly: string }) {
  if (!horas.length) return null;
  const max = Math.max(...horas.map((h) => Math.max(h.a, h.l)), 1);
  return (
    <section className="bloque">
      <h2>Venta por hora</h2>
      <div className="scroll">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>{ay}</th>
              <th className="n">{ly}</th>
              <th className="n">Dif. $</th>
            </tr>
          </thead>
          <tbody>
            {horas.map((h) => (
              <tr key={h.hr}>
                <td>{String(h.hr).padStart(2, "0")}:00</td>
                <td>
                  <div className="barra">
                    <span style={{ width: `${Math.max(0, (h.a / max) * 100)}%` }} />
                    <b>{pesos(h.a)}</b>
                  </div>
                </td>
                <td className="n muted">{pesos(h.l)}</td>
                <td className={"n " + clase(h.a - h.l)}>{dif(h.a - h.l)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
