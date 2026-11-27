import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerAcceso } from "@/lib/acceso";
import { admin } from "@/lib/supabase/admin";
import { cambiarPassword } from "./acciones";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ e?: string; ok?: string }> };

export default async function UsuariosPage({ searchParams }: Props) {
  const acceso = await obtenerAcceso();
  if (!acceso) redirect("/login");
  if (acceso.email.toLowerCase() !== "rescobedo@crediland.com.mx") redirect("/");
  const params = await searchParams;
  const db = admin();
  const { data: autorizados, error: errorUsuarios } = await db.from("usuarios")
    .select("email,nombre,rol,activo").order("email");
  if (errorUsuarios) throw new Error("No se pudo consultar el catálogo de usuarios.");
  const { data: authData, error: errorAuth } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (errorAuth) throw new Error("No se pudo consultar Supabase Auth.");
  const authPorCorreo = new Map(authData.users.map((u) => [u.email?.toLowerCase(), u]));
  const mensajes: Record<string, string> = {
    datos: "Escribe un correo y una contraseña de al menos 8 caracteres.",
    "no-encontrado": "No se encontró una cuenta de Supabase Auth con ese correo.",
    actualizar: "No fue posible actualizar la contraseña. Verifica la configuración.",
  };
  return (
    <div className="app">
      <header className="top">
        <img src="/logo.png" alt="Crediland" className="logo" />
        <nav><Link href="/">Reportes</Link><Link href="/usuarios" className="activo">Administrar usuarios</Link></nav>
        <div className="quien"><span>{acceso.nombre}</span><Link href="/">Volver</Link></div>
      </header>
      <main className="pagina">
        <div className="titulo">
          <h1>Administrar usuarios</h1>
          <p className="muted">Cambia la contraseña de las cuentas registradas en Supabase Auth.</p>
        </div>
        {params.ok && <p className="aviso">Contraseña actualizada correctamente.</p>}
        {params.e && <p className="error">{mensajes[params.e] ?? "Ocurrió un error."}</p>}
        <div className="scroll" style={{ marginTop: 16 }}>
          <table>
            <thead><tr><th>Correo</th><th>Nombre</th><th>Rol</th><th>Estado</th><th>Actualizar contraseña</th></tr></thead>
            <tbody>
              {(autorizados ?? []).map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td><td>{u.nombre ?? "—"}</td><td>{u.rol}</td><td>{u.activo ? "Activo" : "Inactivo"}</td>
                  <td>
                    {authPorCorreo.has(u.email.toLowerCase()) ? (
                      <form action={cambiarPassword} className="form-password">
                        <input type="hidden" name="email" value={u.email} />
                        <input name="password" type="password" minLength={8} required autoComplete="new-password" placeholder="Nueva contraseña" aria-label={`Nueva contraseña para ${u.email}`} />
                        <button type="submit">Guardar</button>
                      </form>
                    ) : <span className="muted chico">Sin cuenta Auth</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted chico" style={{ marginTop: 12 }}>Solo rescobedo@crediland.com.mx puede administrar contraseñas. La contraseña no se muestra ni se almacena en esta tabla.</p>
      </main>
    </div>
  );
}
