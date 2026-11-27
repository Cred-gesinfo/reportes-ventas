import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";

// La pestana "Acumulado" ahora se llama "Mes" (/mes). Esta ruta solo conserva los enlaces viejos.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) q.set(k, val);
  }
  const s = q.toString();
  redirect(s ? `/mes?${s}` : "/mes");
}
