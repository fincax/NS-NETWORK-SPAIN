import Link from "next/link";
import { getDb } from "@/db/client";
import { Monogram } from "@/components/brand";
import { inviteFromToken, MIN_PASSWORD_LENGTH } from "@/lib/accounts";
import { redeemInviteAction } from "./actions";

export const dynamic = "force-dynamic";

/** Enlace de acceso (D-054): la persona fija su contraseña y entra. Un solo uso, siete días. */
export default async function InvitacionPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const db = await getDb();
  const found = await inviteFromToken(db, token);
  return (
    <main className="public-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "48px 16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, display: "grid", gap: 18 }}>
        <Link href="/" className="brand" aria-label="NS Network Spain">
          <Monogram size={34} />
          <span><span className="wordmark">NS Network</span><br /><span className="lockup">Acceso personal</span></span>
        </Link>
        {!found ? (
          <div className="stack">
            <h1 style={{ fontSize: 24 }}>Este enlace ya no sirve.</h1>
            <p className="lead" style={{ fontSize: 14 }}>Los enlaces de acceso son de un solo uso y caducan a los siete días. Pide otro a la Directiva de tu Sala.</p>
            <Link href="/acceso" className="btn">Ir al acceso</Link>
          </div>
        ) : (
          <>
            <div>
              <h1 style={{ fontSize: 24 }}>Hola, {found.member.fullName.split(" ")[0]}.</h1>
              <p className="lead" style={{ fontSize: 14, marginTop: 6 }}>Elige tu contraseña para entrar en NS como Timonel. Tu correo de acceso es <strong>{found.member.email}</strong>.</p>
            </div>
            {error ? <div className="notice error">{error}</div> : null}
            <form action={redeemInviteAction} className="stack">
              <input type="hidden" name="token" value={token} />
              <div className="field"><label htmlFor="p1">Contraseña (mínimo {MIN_PASSWORD_LENGTH} caracteres)</label><input id="p1" name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} /></div>
              <div className="field"><label htmlFor="p2">Repítela</label><input id="p2" name="password2" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} /></div>
              <button className="btn primary" type="submit">Activar mi acceso</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
