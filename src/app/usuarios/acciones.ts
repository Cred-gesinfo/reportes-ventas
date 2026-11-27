"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerAcceso } from "@/lib/acceso";
import { admin } from "@/lib/supabase/admin";

export async function cambiarPassword(formData: FormData) {
  const acceso = await obtenerAcceso();
  if (!acceso || acceso.email.toLowerCase() !== "rescobedo@crediland.com.mx") {
    throw new Error("No tienes permisos para administrar usuarios.");
  }
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) redirect("/usuarios?e=datos");

  const db = admin();
  let usuario: { id: string; email?: string } | null = null;
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw new Error("No se pudo consultar la lista de usuarios.");
    usuario = data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
    if (usuario || data.users.length < 1000) break;
  }
  if (!usuario) redirect("/usuarios?e=no-encontrado");
  const { error } = await db.auth.admin.updateUserById(usuario.id, { password });
  if (error) redirect("/usuarios?e=actualizar");
  revalidatePath("/usuarios");
  redirect("/usuarios?ok=1");
}
