import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { ACCOUNT_COOKIE, authMode } from "@/lib/auth";
import { hasPassword, listSessions, MIN_PASSWORD_LENGTH, sessionIdFromToken } from "@/lib/accounts";
import { dateTime } from "@/lib/format";
import { changePasswordAction, revokeAllSessionsAction, revokeSessionAction } from "./actions";

/** Mi acceso (D-042): contraseña y sesiones abiertas. Lo que un Timonel espera de una red de confianza. */
export default async function CuentaPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { member, company } = await requireMember();
  const { ok, error } = await searchParams;
  const db = await getDb();
  const real = authMode() === "real";
  const jar = await cookies();
  const currentId = real ? await sessionIdFromToken(db, jar.get(ACCOUNT_COOKIE)?.value) : null;
  const sessions = real ? await listSessions(db, member.id) : [];
  const withPassword = await hasPassword(db, member.id);
  return (
    <div className="stack" style={{ gap: 24, maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{company.name} · Mi acceso</p>
          <h1>{member.fullName}</h1>
          <p className="lead">{member.email} · {member.isDirector ? "Directiva de la Sala" : member.isPrimary ? "Timonel" : "Timonel suplente"}</p>
        </div>
      </div>
      {ok ? <div className="notice" style={{ borderColor: "var(--green)" }}>{ok === "clave" ? "Contraseña cambiada. Las demás sesiones se han cerrado." : "Sesión cerrada."}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}
      {!real ? <div className="notice amber">La demo usa una puerta compartida y el selector de Timonel. Las cuentas personales se activan con <code>NS_AUTH_MODE=real</code> en el servidor.</div> : null}

      <section className="card">
        <p className="eyebrow">Contraseña</p>
        {withPassword ? (
          <form action={changePasswordAction} className="form-grid" style={{ marginTop: 10 }}>
            <div className="field"><label htmlFor="c0">Contraseña actual</label><input id="c0" name="current" type="password" autoComplete="current-password" required /></div>
            <div className="field"><label htmlFor="c1">Nueva (mínimo {MIN_PASSWORD_LENGTH})</label><input id="c1" name="next" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} /></div>
            <div className="field"><label htmlFor="c2">Repite la nueva</label><input id="c2" name="next2" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} /></div>
            <div className="actions" style={{ gridColumn: "1 / -1" }}><button className="btn" type="submit">Cambiar contraseña</button></div>
          </form>
        ) : (
          <p className="lead" style={{ fontSize: 14 }}>Todavía no tienes contraseña. La Directiva puede generarte un enlace de acceso desde tu Dossier.</p>
        )}
      </section>

      {real ? (
        <section className="card">
          <div className="row" style={{ justifyContent: "space-between" }}><p className="eyebrow" style={{ margin: 0 }}>Sesiones abiertas</p>{sessions.length > 1 ? <form action={revokeAllSessionsAction}><button className="btn small ghost" type="submit">Cerrar las demás</button></form> : null}</div>
          <ul className="plain" style={{ marginTop: 10 }}>
            {sessions.map((s) => (
              <li key={s.id} className="row">
                <span>{s.id === currentId ? <strong>Esta sesión</strong> : "Otra sesión"} <span className="mono">· última actividad {dateTime(s.lastSeenAt)} · caduca {dateTime(s.expiresAt)}</span></span>
                <span className="mono" style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.userAgent ?? ""}</span>
                <span className="spacer" />
                {s.id !== currentId ? <form action={revokeSessionAction}><input type="hidden" name="id" value={s.id} /><button className="btn small ghost" type="submit">Cerrar</button></form> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
