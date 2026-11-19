import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente con la sesion del usuario (solo sirve para saber quien es).
export async function sesionSupabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (lista) => {
          try {
            lista.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            // En paginas (solo lectura) se ignora; el middleware ya refresca la sesion.
          }
        },
      },
    }
  );
}
