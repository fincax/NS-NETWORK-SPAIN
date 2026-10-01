import Link from "next/link";
import { getDb } from "@/db/client";
import { Monogram } from "@/components/brand";
import { Encaje, StateBadge } from "@/components/ui";
import { eurRange } from "@/lib/format";
import { TIMEOUTS } from "@/core/state-machine";
import { PROMISE_LABEL } from "@/core/merit";
import { actionContext, ACTION_LABEL } from "@/services/accion";
import type { LinkAction } from "@/services/avisos";
import { executeActionLink } from "./actions";

export const dynamic = "force-dynamic";

/**
 * Enlace de acción (D-067): la tarjeta ya preparada y un solo botón. La persona confirma con un toque y entra en NS.
 * Un GET nunca ejecuta nada (los lectores de correo abren enlaces); la acción es el POST del botón.
 */
export default async function AccionPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const db = await getDb();
  const ctx = await actionContext(db, token);
  const action = ctx?.link.action as LinkAction | undefined;
  const first = ctx?.member.fullName.split(" ")[0];
  const otherPerson = ctx?.otherPerson?.fullName.split(" ")[0] ?? ctx?.other?.name ?? "la otra empresa";

  return (
    <main className="public-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "48px 16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 560, display: "grid", gap: 18 }}>
        <Link href="/" className="brand" aria-label="NS Network Spain">
          <Monogram size={34} />
          <span><span className="wordmark">NS Network</span><br /><span className="lockup">Un toque desde tu correo</span></span>
        </Link>
        {!ctx || !action ? (
          <div className="stack">
            <h1 style={{ fontSize: 24 }}>Este enlace ya no sirve.</h1>
            <p className="lead" style={{ fontSize: 14 }}>Los enlaces de acción son de un solo uso y caducan a las {72} horas. Entra en NS Network: verás la misma Cesión en Hoy.</p>
            <Link href="/acceso" className="btn">Ir al acceso</Link>
          </div>
        ) : (
          <>
            <div className="row"><StateBadge state={ctx.referral.state} />{ctx.match ? <Encaje total={ctx.match.score.total} band={ctx.match.score.band} /> : null}</div>
            <div>
              <h1 style={{ fontSize: 24 }}>Hola, {first}.</h1>
              <p className="lead" style={{ fontSize: 15, marginTop: 6 }}>
                {action === "PROPOSE" ? `Tu Agente ha preparado esta Cesión para ${otherPerson}. ${ctx.applies ? "Con un toque la propones y, si acepta, la Apertura queda autorizada y el Puente redactado." : "Ya no espera tu visto bueno."}`
                : action === "ACCEPT" ? `${otherPerson} te cede este referido. ${ctx.applies ? "Acepta con un toque y confirma la Promesa." : "Ya no espera tu decisión."}`
                : action === "OPEN" ? `${otherPerson} ha aceptado y confirmado la Promesa. ${ctx.applies ? "Autoriza la Apertura: tu Agente redacta el Puente y solo te queda enviarlo." : "La Apertura ya está hecha."}`
                : action === "ANSWER" ? `${otherPerson} te ha hecho una pregunta. ${ctx.applies ? `Responde en ${TIMEOUTS.questionAnswerHours} h; sí, no o una línea bastan.` : "Ya no hay ninguna pregunta pendiente."}`
                : "Entra y mira la Cesión."}
              </p>
            </div>
            <div className="notice">
              <p className="money" style={{ fontSize: 20, margin: 0 }}>{eurRange(ctx.referral.valuePotentialMin, ctx.referral.valuePotentialMax)}</p>
              {ctx.match ? <ul className="plain" style={{ marginTop: 8 }}>{ctx.match.explanation.why.slice(0, 3).map((w, i) => <li key={i}>+ {w}</li>)}</ul> : null}
              {ctx.referral.promise ? <p className="mono" style={{ marginTop: 8 }}>{ctx.referral.promise.components.map((c) => `${PROMISE_LABEL[c.key] ?? c.key}: ${c.status === "GREEN" ? "✓" : c.status === "AMBER" ? "~" : "✗"}`).join(" · ")}</p> : null}
            </div>
            {error ? <div className="notice error">{error}</div> : null}
            <form action={executeActionLink} className="stack">
              <input type="hidden" name="token" value={token} />
              {action === "ANSWER" && ctx.applies ? (
                <div className="field">
                  <p><strong>{otherPerson} pregunta:</strong> {ctx.question}</p>
                  <label htmlFor="answer">Tu respuesta{ctx.draftAnswer ? " · borrador de tu Agente; corrígelo si hace falta" : ""}</label>
                  <textarea id="answer" name="answer" required defaultValue={ctx.draftAnswer ?? ""} placeholder="Solo lo que puedas compartir." />
                </div>
              ) : null}
              {(action === "PROPOSE" || action === "OPEN") && ctx.applies ? (
                <div className="radio-row">
                  <label><input type="radio" name="reveal_scope" value="COMPANY_AND_CONTACT" defaultChecked={ctx.hasContact && !ctx.blockedContact} disabled={!ctx.hasContact || ctx.blockedContact} /> Empresa y persona de contacto</label>
                  <label><input type="radio" name="reveal_scope" value="COMPANY_ONLY" defaultChecked={!ctx.hasContact || ctx.blockedContact} /> Solo la empresa</label>
                </div>
              ) : null}
              <div className="actions">
                <button className="btn amber" type="submit" style={{ fontSize: 16, padding: "14px 22px" }}>{ctx.applies ? ACTION_LABEL[action] : "Entrar y ver la Cesión"}</button>
              </div>
            </form>
            <p className="mono">Al pulsar entras en NS Network con tu identidad. Si prefieres decidir con calma, entra por el acceso normal: la Cesión te espera en Hoy.</p>
          </>
        )}
      </div>
    </main>
  );
}
