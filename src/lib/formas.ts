export const FORMAS = [
  { v: "Contado", etq: "Contado" },
  { v: "Credito directo", etq: "Crédito directo" },
  { v: "Institucional", etq: "Institucional" },
];
export const etqForma = (v: string) => FORMAS.find((f) => f.v === v)?.etq ?? v;
