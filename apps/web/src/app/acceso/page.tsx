import Link from "next/link";
import { Monogram } from "@/components/brand";
import { accountLoginAction, loginAction } from "./actions";
import { authMode } from "@/lib/auth";
import { mailEnabled } from "@/lib/mail";

export const dynamic = "force-dynamic";

export default async function AccesoPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const real = authMode() === "real";
  const target = next && next.startsWith("/") ? next : "/hoy";
  if (real) {
    return (
      <main className="public-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "48px 16px" }}>
        <div className="card" style={{ width: "100%", maxWidth: 420, display: "grid", gap: 18 }}>
          <Link href="/" className="brand" aria-label="NS Network Spain">
            <Monogram size={34} />
            <span><span className="wordmark">NS Network</span><br /><span className="lockup">Acceso de Timoneles</span></span>
          </Link>
          <div>
            <h1 style={{ fontSize: 26 }}>Entra en tu Sala.</h1>
            <p className="lead" style={{ fontSize: 14, marginTop: 6 }}>Con el correo de tu empresa y tu contraseña. Cada Timonel ve solo lo suyo.</p>
          </div>
          {error ? <div className="notice error">Correo o contraseña incorrectos.</div> : null}
          <form action={accountLoginAction} className="stack">
            <input type="hidden" name="next" value={target} />
            <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
            <div className="field"><label htmlFor="p">Contraseña</label><input id="p" name="password" type="password" autoComplete="current-password" required /></div>
            <button className="btn primary" type="submit">Entrar</button>
          </form>
          {mailEnabled() ? <p className="mono"><Link href="/acceso/recuperar">¿Has olvidado tu contraseña?</Link> ¿Sin plaza? <Link href="/#plaza">Solicítala</Link>.</p> : <p className="mono">¿Sin contraseña o la has olvidado? Pide a la Directiva de tu Sala un enlace de acceso. ¿Sin plaza? <Link href="/#plaza">Solicítala</Link>.</p>}
        </div>
      </main>
    );
  }
  return (
    <main className="public-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "48px 16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 420, display: "grid", gap: 18 }}>
        <Link href="/" className="brand" aria-label="NS Network Spain">
          <Monogram size={34} />
          <span><span className="wordmark">NS Network</span><br /><span className="lockup">Beta privada · NS Sevilla</span></span>
        </Link>
        <div>
          <h1 style={{ fontSize: 26 }}>Acceso a la demostración</h1>
          <p className="lead" style={{ fontSize: 14, marginTop: 6 }}>Entras en NS Cumbre con diez empresas ficticias y sus Agentes trabajando. Nada de lo que veas es real, salvo el producto.</p>
        </div>
        {error ? <div className="notice error">Usuario o contraseña incorrectos.</div> : null}
        <form action={loginAction} className="stack">
          <input type="hidden" name="next" value={target} />
          <div className="field"><label htmlFor="u">Usuario</label><input id="u" name="user" autoComplete="username" required /></div>
          <div className="field"><label htmlFor="p">Contraseña</label><input id="p" name="password" type="password" autoComplete="current-password" required /></div>
          <button className="btn primary" type="submit">Entrar</button>
        </form>
        <p className="mono">¿Sin acceso? <Link href="/#plaza">Solicita plaza en la beta</Link>.</p>
      </div>
    </main>
  );
}
