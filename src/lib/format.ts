const nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
export const pesos = (n: number) => (n < 0 ? "-$" : "$") + nf.format(Math.abs(Math.round(n)));
export const dif = (n: number) => (n > 0 ? "+$" : n < 0 ? "-$" : "$") + nf.format(Math.abs(Math.round(n)));
export const num = (n: number) => nf.format(n);
export function varPct(a: number, l: number): string | null {
  if (!l) return a ? "nuevo" : null;
  const v = ((a - l) / Math.abs(l)) * 100;
  return (v > 0 ? "+" : "") + v.toFixed(1) + "%";
}
export const clase = (n: number) => (n > 0 ? "pos" : n < 0 ? "neg" : "");
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export function fechaLarga(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${dia} ${d}/${MESES[m - 1]}/${y}`;
}
export function rangoLargo(desde: string, hasta: string) {
  return desde === hasta ? fechaLarga(hasta) : `${fechaLarga(desde)} al ${fechaLarga(hasta)}`;
}
export function haceCuanto(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h ${min % 60} min` : `hace ${Math.floor(h / 24)} d`;
}
