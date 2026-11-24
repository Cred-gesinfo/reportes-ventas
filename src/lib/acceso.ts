import "server-only";
import { redirect } from "next/navigation";
import { sesionSupabase } from "./supabase/server";
import { admin } from "./supabase/admin";

export type Tienda = { clave: string; nombre: string };
export type Acceso = {
  email: string;
  nombre: string;
  rol: "dueno" | "gerente";
  tiendas: Tienda[]; // tiendas que puede ver (el dueno ve todas)
};

// Quien es el usuario y que tiendas puede ver. Sin registro en "usuarios" = sin acceso.
export async function obtenerAcceso(): Promise<Acceso | null> {
  const s = await sesionSupabase();
  const { data } = await s.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const db = admin();
  const { data: u } = await db.from("usuarios").select("email,nombre,rol,activo").ilike("email", email).maybeSingle();
  if (!u || !u.activo) return null;

  let tiendas: Tienda[] = [];
  if (u.rol === "dueno") {
    const { data: t } = await db.from("tiendas").select("clave,nombre").eq("activa", true).order("clave");
    tiendas = (t ?? []) as Tienda[];
  } else {
    const { data: ut } = await db.from("usuario_tiendas").select("clave_muebleria").ilike("email", email);
    const claves = (ut ?? []).map((r) => r.clave_muebleria as string);
    if (claves.length) {
      const { data: t } = await db.from("tiendas").select("clave,nombre").in("clave", claves).order("clave");
      tiendas = (t ?? []) as Tienda[];
    }
  }
  return { email, nombre: u.nombre ?? email, rol: u.rol, tiendas };
}
