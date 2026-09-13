import Link from "next/link";
import { Monogram } from "@/components/brand";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AccesoPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
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
          <input type="hidden" name="next" value={next && next.startsWith("/") ? next : "/hoy"} />
          <div className="field"><label htmlFor="u">Usuario</label><input id="u" name="user" autoComplete="username" required /></div>
          <div className="field"><label htmlFor="p">Contraseña</label><input id="p" name="password" type="password" autoComplete="current-password" required /></div>
          <button className="btn primary" type="submit">Entrar</button>
        </form>
        <p className="mono">¿Sin acceso? <Link href="/#plaza">Solicita plaza en la beta</Link>.</p>
      </div>
    </main>
  );
}
