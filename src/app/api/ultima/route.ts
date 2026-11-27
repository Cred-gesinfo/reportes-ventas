import { NextResponse } from "next/server";
import { sesionSupabase } from "@/lib/supabase/server";
import { ultimaActualizacion } from "@/lib/reporte";

export const dynamic = "force-dynamic";

// Hora de la ultima carga de datos. La pagina la consulta cada minuto y se recarga sola cuando cambia.
export async function GET() {
  const s = await sesionSupabase();
  const { data } = await s.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  return NextResponse.json({ t: await ultimaActualizacion() }, { headers: { "Cache-Control": "no-store" } });
}
