"use server";
import { redirect } from "next/navigation";
import { sesionSupabase } from "@/lib/supabase/server";

export async function iniciarSesion(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const s = await sesionSupabase();
  const { error } = await s.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?e=1");
  redirect("/");
}

export async function cerrarSesion() {
  const s = await sesionSupabase();
  await s.auth.signOut();
  redirect("/login");
}
