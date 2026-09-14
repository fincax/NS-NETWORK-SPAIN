/**
 * La página del Eco (D-042): lo que ve el Interesado cuando el cesionario le da la palabra.
 * Pública, sin usuario: la llave es el token. Muestra solo la capa 0 y los nombres de las dos empresas.
 * Nunca muestra el Veredicto ni nada de las capas 1–3. Lo que el Interesado escribe solo se publica con su consentimiento.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Monogram } from "@/components/brand";
import { getDb } from "@/db/client";
import { ecoPageContext } from "@/services/eco";
import { ECO_LABEL, ecoScore } from "@/core/aval";
import { submitEcoAction, withdrawEcoAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function EcoPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ ok?: string; error?: string; revisar?: string }> }) {
  const { token } = await params;
  const { ok, error, revisar } = await searchParams;
  const db = await getDb();
  const ctx = await ecoPageContext(db, token);
  if (!ctx) notFound();
  const inv = ctx.invitation;
  const received = inv.status === "RECEIVED" && inv.attention && inv.result && inv.recommend;
  const score = received ? Math.round(ecoScore({ attention: inv.attention!, result: inv.result!, recommend: inv.recommend! }) * 100) : null;
  const canRevise = Boolean(received && ctx.canSubmit);
  // Primera visita: el formulario. Después: el Eco enviado, con opción de revisarlo mientras la ventana siga abierta.
  const showForm = ctx.canSubmit && (!received || (canRevise && revisar === "1"));

  return (
    <main className="public-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px 16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 560, display: "grid", gap: 20 }}>
        <div className="brand" aria-label="NS Network Spain">
          <Monogram size={34} state="green" />
          <span><span className="wordmark">NS Network</span><br /><span className="lockup">La palabra del Interesado</span></span>
        </div>

        <div>
          <p className="eyebrow">{ctx.closed ? "Al cierre" : "Durante el trabajo"}</p>
          <h1 style={{ fontSize: 26 }}>¿Cómo lo ha hecho {ctx.receiverName}?</h1>
          <p className="lead" style={{ fontSize: 15, marginTop: 8 }}>
            <strong>{ctx.originatorName}</strong> os presentó por esta necesidad: «{ctx.needSummary.split("·")[0].trim()}». Tres preguntas y un minuto. Tu respuesta sirve para que las presentaciones entre empresas de esta red sigan siendo de confianza.
          </p>
        </div>

        {error ? <div className="notice error">{decodeURIComponent(error)}</div> : null}
        {ok === "1" && received ? (
          <div className="notice" style={{ borderColor: "var(--green)" }}>
            <strong>Gracias. Tu Eco ha llegado.</strong> {ctx.receiverName} y {ctx.originatorName} lo verán tal cual. {inv.publicConsent ? "Has autorizado publicarlo con tu nombre en la Sala y en la página pública del Aval, sin datos de contacto." : "No se publica con tu nombre: solo cuenta en el Aval."}
          </div>
        ) : null}

        {received && !showForm ? (
          <section className="card quiet" style={{ display: "grid", gap: 8 }}>
            <p className="eyebrow">Tu Eco {inv.phase === "FINAL" ? "al cierre" : "durante el trabajo"} · {score} sobre 100</p>
            <p>{ECO_LABEL.attention} {inv.attention}/5 · {ECO_LABEL.result} {inv.result}/5 · {ECO_LABEL.recommend} {inv.recommend}/5</p>
            {inv.comment ? <p>“{inv.comment}”</p> : null}
            {canRevise ? <p className="mono">Puedes revisarlo desde este mismo enlace hasta 30 días después del cierre{!ctx.closed ? " y, cuando el trabajo termine, dejar tu Eco de cierre" : ""}.</p> : null}
            <div className="actions">
              {canRevise ? <Link href={`/eco/${encodeURIComponent(token)}?revisar=1`} className="btn small">{ctx.closed && inv.phase !== "FINAL" ? "Dejar mi Eco de cierre" : "Revisar mi Eco"}</Link> : null}
              {inv.publicConsent ? (
                <form action={withdrawEcoAction}><input type="hidden" name="token" value={token} /><button className="btn small ghost" type="submit">Dejar de publicarlo con mi nombre</button></form>
              ) : null}
            </div>
          </section>
        ) : null}

        {!ctx.canSubmit && !received ? (
          <div className="notice">Este enlace ya no admite respuestas: la ventana para dejar el Eco se ha cerrado. Gracias de todos modos.</div>
        ) : null}

        {showForm ? (
          <form action={submitEcoAction} className="stack" style={{ gap: 18 }}>
            <input type="hidden" name="token" value={token} />
            <Scale name="attention" label="¿Te atendieron pronto y bien?" current={inv.attention} />
            <Scale name="result" label="¿Resolvieron lo que necesitabas?" current={inv.result} />
            <Scale name="recommend" label={`¿Recomendarías a ${ctx.receiverName}?`} current={inv.recommend} />
            <div className="field">
              <label htmlFor="comment">Una línea, si quieres (opcional)</label>
              <textarea id="comment" name="comment" maxLength={280} style={{ minHeight: 80 }} defaultValue={inv.comment ?? ""} placeholder="Por ejemplo: nos llamaron el mismo día y la obra terminó en plazo." />
            </div>
            <fieldset style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 14, display: "grid", gap: 10 }}>
              <legend className="mono" style={{ padding: "0 6px" }}>Publicación</legend>
              <label className="row" style={{ alignItems: "flex-start", gap: 10 }}>
                <input type="checkbox" name="public_consent" defaultChecked={inv.publicConsent} style={{ marginTop: 4, accentColor: "var(--amber)" }} />
                <span>Autorizo a publicar mi Eco con el nombre que indico abajo (mi nombre y apellido o el de mi empresa) en la Sala y en la página pública del Aval de {ctx.receiverName}. Solo ese nombre y mi valoración: nunca mis datos de contacto. Si no lo marco, cuenta en el Aval pero no se muestra con mi nombre. Puedo retirarlo cuando quiera desde este enlace.</span>
              </label>
              <div className="field"><label htmlFor="dn">Cómo quiero aparecer (nombre y apellido, o nombre de empresa)</label><input id="dn" name="display_name" maxLength={80} defaultValue={inv.displayName ?? ""} placeholder="Metalúrgica del Sur" /></div>
            </fieldset>
            <button className="btn amber" type="submit">{received ? "Revisar mi Eco" : "Enviar mi Eco"}</button>
            <p className="mono">Nadie de NS te llamará por esto. Tus respuestas las ven las dos empresas y la red a la que pertenecen; nunca se venden ni se usan fuera de la red.</p>
          </form>
        ) : null}

        <p className="mono"><Link href="/">NS Network Spain</Link> · un club privado de empresas donde las presentaciones se hacen de confianza.</p>
      </div>
    </main>
  );
}

function Scale({ name, label, current }: { name: string; label: string; current: number | null }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="scale" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((v) => (
          <label key={v}><input type="radio" name={name} value={v} required defaultChecked={current ? v === current : v === 5} />{v}</label>
        ))}
      </div>
      <span className="hint">1 = nada · 5 = del todo</span>
    </div>
  );
}
