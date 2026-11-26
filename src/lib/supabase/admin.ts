import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente de SERVIDOR con la llave secreta: lee las tablas bloqueadas. Nunca importar desde componentes de navegador.
// Las consultas nunca se guardan en cache: cada visita ve los datos mas recientes.
export function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) },
  });
}
