import { iniciarSesion } from "../acciones";

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <main className="login">
      <form action={iniciarSesion} className="tarjeta">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Crediland" className="logo" />
        <h1>Reportes de venta</h1>
        <label>
          Correo
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        {e && <p className="error">Correo o contraseña incorrectos.</p>}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
