import Link from "next/link";
import { Monogram } from "@/components/brand";
import { authMode } from "@/lib/auth";
import { mailEnabled } from "@/lib/mail";
import { recoverAction } from "./actions";

export const dynamic = "force-dynamic";

/** "He olvidado mi contraseña" (D-060): llega un enlace de un solo uso al correo del Timonel. */
export default async function RecuperarPage({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const { enviado } = await searchParams;
  const available = authMode() === "real" && mailEnabled();
  return (
    <main className="public-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "48px 16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 420, display: "grid", gap: 18 }}>
        <Link href="/" className="brand" aria-label="NS Network Spain">
          <Monogram size={34} />
          <span><span className="wordmark">NS Network</span><br /><span className="lockup">Acceso de Timoneles</span></span>
        </Link>
        {!available ? (
          <div className="stack">
            <h1 style={{ fontSize: 24 }}>Pide un enlace a tu Directiva.</h1>
            <p className="lead" style={{ fontSize: 14 }}>Ahora mismo NS no envía correos. La Directiva de tu Sala puede generarte un enlace de acceso desde tu Dossier.</p>
            <Link href="/acceso" className="btn">Volver al acceso</Link>
          </div>
        ) : enviado ? (
          <div className="stack" role="status">
            <h1 style={{ fontSize: 24 }}>Revisa tu correo.</h1>
            <p className="lead" style={{ fontSize: 14 }}>Si ese correo es el de un Timonel de NS, en unos minutos recibirás un enlace para elegir una contraseña nueva. Es de un solo uso y caduca en 24 horas. Si no llega, mira en la carpeta de correo no deseado.</p>
            <Link href="/acceso" className="btn">Volver al acceso</Link>
          </div>
        ) : (
          <>
            <div>
              <h1 style={{ fontSize: 24 }}>¿Has olvidado tu contraseña?</h1>
              <p className="lead" style={{ fontSize: 14, marginTop: 6 }}>Escribe el correo con el que entras en NS y te enviaremos un enlace para elegir una nueva.</p>
            </div>
            <form action={recoverAction} className="stack">
              <div className="field"><label htmlFor="email">Correo</label><input id="email" name="email" type="email" autoComplete="username" required /></div>
              <button className="btn primary" type="submit">Enviarme el enlace</button>
            </form>
            <p className="mono"><Link href="/acceso">Volver al acceso</Link></p>
          </>
        )}
      </div>
    </main>
  );
}
