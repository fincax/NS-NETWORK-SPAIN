import Link from "next/link";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { agenteView, pendingIntent, proposalLines } from "@/services/agente";
import { INTENT_KIND_LABEL } from "@/core/intencion";
import { AgentAvatar } from "@/components/brand";
import { DictationButton } from "@/components/dictation";
import { dateTime, eur, firstName } from "@/lib/format";
import { toqueAction } from "../hoy/actions";
import { confirmarAction, decirAction, descartarAction } from "./actions";

/**
 * Mi Agente (D-075). Una página, cinco preguntas: qué sabe de ti, qué buscan para ti, qué está haciendo, qué puede y qué no,
 * qué te propone. Y una sola caja para hablarle: "Dile a tu Agente". No es un chat: lo dicho vuelve como una propuesta
 * con un botón. Nada cambia hasta ese toque.
 */
export default async function AgentePage({ searchParams }: { searchParams: Promise<{ propuesta?: string; texto?: string; ok?: string; error?: string }> }) {
  const { member, company, chapter } = await requireMember();
  const { propuesta, texto, ok, error } = await searchParams;
  const db = await getDb();
  const v = await agenteView(db, { chapterId: chapter.id, companyId: company.id });
  const intent = await pendingIntent(db, company.id, propuesta);
  const pending = intent && intent.status === "PROPOSED" ? intent : undefined;
  const lines = pending ? proposalLines(pending.proposal) : null;
  const state = v.hace.mesaMine > 0 ? "analizando" : v.propone.length ? "encontrado" : v.sabe.validated ? "reposo" : "sin-informacion";

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{company.name} · Mi Agente</p>
          <h1>Tu Agente, {firstName(member.fullName)}.</h1>
          <p className="lead">Qué sabe de ti, qué buscan para ti, qué está haciendo, qué puede y qué te propone. Y una caja para decirle lo que quieres: él lo traduce, tú confirmas.</p>
        </div>
        <AgentAvatar state={v.estado.agente === "PAUSED" || v.estado.sala !== "ACTIVE" ? "sin-informacion" : state} label={v.estado.agente === "PAUSED" || v.estado.sala !== "ACTIVE" ? "En pausa" : state === "analizando" ? "En la Mesa con un Indicio tuyo" : state === "encontrado" ? "Tiene propuestas para ti" : state === "sin-informacion" ? "Trabaja a ciegas: valida tu ADN" : "En la Mesa, atento"} />
      </div>

      {error ? <div className="notice error" role="alert">{error}</div> : null}
      {ok ? <div className="notice" role="status" style={{ borderColor: "var(--green)" }}>Hecho. Tu Agente trabaja ya con ello.</div> : null}
      {v.estado.sala !== "ACTIVE" ? <div className="notice amber" role="status"><strong>{chapter.name} está en pausa.</strong> NS ha detenido la actividad agentic de la Sala: la Mesa no cualifica y ningún plazo corre. Lo que digas aquí queda guardado y tu Agente lo retoma al reanudar.</div> : null}
      {v.estado.agente === "PAUSED" ? <div className="notice amber" role="status"><strong>Tu Agente está en pausa.</strong> La Directiva lo ha detenido: no recibe Pistas nuevas ni rastrea hasta que lo reanude. Tus Cesiones en curso y tu Comunicado siguen siendo tuyos. El motivo está en la Mesa Permanente.</div> : null}

      <section className="card" aria-label="Dile a tu Agente" style={{ display: "grid", gap: 12 }}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 2 }}>Dile a tu Agente</p>
            <p className="lead" style={{ fontSize: 14, margin: 0 }}>Como se lo dirías a un socio: lo que quieres este trimestre, un mínimo que no bajas, un sector que no quieres, o un referido que acabas de oír.</p>
          </div>
          <DictationButton target="texto" />
        </div>
        {pending && lines ? (
          <div className={`card ${pending.proposal.kind === "INSUFICIENTE" ? "quiet" : ""}`} style={{ display: "grid", gap: 10, borderColor: pending.proposal.kind === "INSUFICIENTE" ? undefined : "var(--amber)" }} aria-live="polite">
            <p className="mono">Dijiste: «{pending.text}»</p>
            <p className="eyebrow">{INTENT_KIND_LABEL[pending.proposal.kind]} · confianza {pending.proposal.confidence >= 0.7 ? "alta" : pending.proposal.confidence >= 0.4 ? "media" : "baja"}</p>
            <strong>{pending.proposal.kind === "INSUFICIENTE" ? pending.proposal.question : pending.proposal.summary}</strong>
            {lines.understood.length ? <ul className="why">{lines.understood.map((u, i) => <li key={i}>{u}</li>)}</ul> : null}
            {lines.willDo.length ? (<><p className="eyebrow" style={{ marginTop: 4 }}>Si confirmas</p><ul className="plain">{lines.willDo.map((w, i) => <li key={i}>{w}</li>)}</ul></>) : null}
            <div className="actions">
              {pending.proposal.kind !== "INSUFICIENTE" ? (
                <form action={confirmarAction}><input type="hidden" name="id" value={pending.id} /><button className="btn primary" type="submit">Confirmar</button></form>
              ) : null}
              <form action={descartarAction}><input type="hidden" name="id" value={pending.id} /><input type="hidden" name="texto" value={pending.text} /><button className="btn ghost" type="submit">{pending.proposal.kind === "INSUFICIENTE" ? "Reformular" : "No es eso, lo reformulo"}</button></form>
              <form action={descartarAction}><input type="hidden" name="id" value={pending.id} /><button className="linkish" type="submit">Descartar</button></form>
              {pending.proposal.kind !== "APUNTE" ? <Link href="/apunte" className="mono">Era un referido: ir al Apunte →</Link> : null}
            </div>
          </div>
        ) : (
          <form action={decirAction} className="stack" style={{ gap: 10 }}>
            <textarea id="texto" name="texto" required minLength={4} maxLength={1200} defaultValue={texto ?? ""} style={{ minHeight: 88 }} placeholder="Este trimestre quiero clientes industriales grandes. Nada por debajo de 30.000 €." aria-label="Lo que quieres decirle a tu Agente" />
            <div className="actions">
              <button className="btn primary" type="submit">Decírselo</button>
              <span className="mono">Vuelve como una propuesta con un botón. Nada cambia hasta que confirmes.</span>
            </div>
          </form>
        )}
      </section>

      {v.propone.length ? (
        <section aria-label="Qué te propone">
          <div className="row" style={{ marginBottom: 12 }}><h2 style={{ margin: 0 }}>Qué te propone</h2><span className="spacer" /><Link href="/brujula" className="mono">Brújula completa →</Link></div>
          <ol className="toques">
            {v.propone.slice(0, 3).map((m) => (
              <li key={m.key} className={`toque ${m.kind === "CEDER" || m.kind === "PROPONER" ? "amber" : ""}`}>
                <div className="ctx"><span className="mono">{m.origin} · confianza {m.confidence.toLowerCase()}</span><strong>{m.title}</strong><p>{m.why}</p></div>
                <div className="act">
                  {m.primary ? (
                    <form action={toqueAction}>
                      <input type="hidden" name="action" value={m.primary.action} />
                      {Object.entries(m.primary.payload).map(([k, val]) => <input key={k} type="hidden" name={k} value={val} />)}
                      <button className="btn primary" type="submit">{m.primary.label}</button>
                    </form>
                  ) : null}
                  <Link href={m.href} className={`btn ${m.primary ? "ghost" : ""}`}>{m.hrefLabel}</Link>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))" }}>
        <section className="card" style={{ display: "grid", gap: 8, alignContent: "start" }} aria-label="Qué sabe de ti">
          <p className="eyebrow">Qué sabe de ti</p>
          <p><span className={`badge ${v.sabe.validated ? "green" : "amber"}`}>ADN v{v.sabe.version} · {v.sabe.validated ? "validado" : "sin validar"}</span>{v.sabe.previousVersions ? <span className="mono" style={{ marginLeft: 8 }}>{v.sabe.previousVersions} {v.sabe.previousVersions === 1 ? "versión anterior conservada" : "versiones anteriores conservadas"}</span> : null}</p>
          {v.sabe.description ? <p>{v.sabe.description}</p> : null}
          <ul className="plain dna-rows">
            {v.sabe.services.length ? <li><span className="mono">Haces</span><span>{v.sabe.services.join(" · ")}</span></li> : null}
            {v.sabe.industries.length ? <li><span className="mono">Para</span><span>{v.sabe.industries.join(", ")}</span></li> : null}
            {v.sabe.ticketMin ? <li><span className="mono">Ticket</span><span>{eur(v.sabe.ticketMin)}{v.sabe.ticketMax ? ` – ${eur(v.sabe.ticketMax)}` : " o más"}</span></li> : null}
            {v.sabe.triggers.length ? <li><span className="mono">Señales</span><span>{v.sabe.triggers.join(", ")}</span></li> : null}
            {v.sabe.perfectReferral ? <li><span className="mono">Perfecto</span><span>{v.sabe.perfectReferral}</span></li> : null}
          </ul>
          {v.sabe.gaps.length ? <p className="mono" style={{ color: "var(--amber)" }}>Le falta: {v.sabe.gaps.join(", ")}.</p> : <p className="mono" style={{ color: "var(--green)" }}>ADN completo para la Mesa.</p>}
          <div className="actions"><Link href="/entrevista" className="btn small">{v.sabe.interviewProgress !== null ? `Continuar la entrevista (${v.sabe.interviewProgress} %)` : v.sabe.validated ? "Ampliar con la entrevista" : "Hacer la entrevista"}</Link><Link href={`/empresa/${company.slug}`} className="btn small ghost">Mi Dossier</Link></div>
        </section>

        <section className="card" style={{ display: "grid", gap: 8, alignContent: "start" }} aria-label="Qué buscan para ti">
          <p className="eyebrow">Qué buscan para ti</p>
          <p className="lead" style={{ fontSize: 14, margin: 0 }}>Tus Encargos abiertos. Los Agentes de los demás titulares los usan para priorizar lo que te ceden (D-032). Nadie busca para sí: esto es lo que los demás buscan para ti.</p>
          {v.buscanParaTi.length === 0 ? <p className="mono">Ningún Encargo abierto. Díselo arriba: «Este trimestre quiero…».</p> : (
            <ul className="plain">{v.buscanParaTi.map((d) => <li key={d.id} className="row"><span>{d.text}</span>{d.trigger ? <span className="badge">{d.trigger.toLowerCase().replaceAll("_", " ")}</span> : null}{d.industry ? <span className="badge">{d.industry}</span> : null}</li>)}</ul>
          )}
        </section>

        <section className="card" style={{ display: "grid", gap: 8, alignContent: "start" }} aria-label="Qué está haciendo">
          <p className="eyebrow">Qué está haciendo ahora</p>
          <p>{v.hace.mesaMine ? `${v.hace.mesaMine} Indicio(s) tuyo(s) en cualificación en la Mesa` : v.hace.mesaTotal ? `En la Mesa hay ${v.hace.mesaTotal} Indicio(s) de otros titulares; ninguno tuyo pendiente` : "La Mesa está al día"}{v.hace.needsHuman ? ` · ${v.hace.needsHuman} esperan tu revisión` : ""}.</p>
          <p className="mono">{v.hace.drafts ? `${v.hace.drafts} borrador(es) en tu memoria esperando que decidas publicarlos.` : "Ningún borrador pendiente."}</p>
          <p className="mono">{v.hace.lastRonda ? `Última Ronda ${dateTime(v.hace.lastRonda.at)}: ${v.hace.lastRonda.result}` : "Aún sin Ronda registrada en esta Sala."}</p>
          {v.hace.sources.length ? <ul className="plain">{v.hace.sources.map((s) => <li key={s.label} className="row"><span>{s.label}</span><span className="mono">{s.lastStatus ?? "sin leer todavía"}{s.lastFetchedAt ? ` · ${dateTime(s.lastFetchedAt)}` : ""}</span></li>)}</ul> : <p className="mono">Lee las fuentes públicas de NS; no tiene fuentes propias.</p>}
          <div className="actions"><Link href="/mesa" className="btn small ghost">Ver la Mesa Permanente</Link><Link href={`/empresa/${company.slug}#fuentes`} className="btn small ghost">Sus fuentes</Link></div>
        </section>

        <section className="card" style={{ display: "grid", gap: 8, alignContent: "start" }} aria-label="Qué puede y qué no">
          <p className="eyebrow">Qué puede y qué no</p>
          <ul className="plain">
            <li>{v.puede.humanApproval ? "Nunca decide por ti: cada Cesión, Apertura y Puente llevan tu toque." : "Puede avanzar sin tu toque dentro de la política."}</li>
            <li>{v.puede.autoPublish ? "Publica solo en la Sala los Indicios que detecta." : "No publica nada en la Sala sin que tú lo pulses."}</li>
            <li>{v.puede.externalContact ? "Puede contactar fuera de NS en tu nombre." : "No contacta con nadie fuera de NS; el Puente lo envías tú o NS con base jurídica."}</li>
            <li>Nunca comparte: {v.puede.neverShare.length ? v.puede.neverShare.join(", ") : "nada declarado todavía"}.</li>
            {v.puede.chapterOnly.length ? <li>Solo dentro de la Sala: {v.puede.chapterOnly.join(", ")}.</li> : null}
          </ul>
          <p className="mono">Conocer un dato no es permiso para usarlo. Los permisos se cambian en la entrevista, nunca desde una frase suelta sin confirmar.</p>
        </section>
      </div>

      {v.reciente.length ? (
        <details className="plegable">
          <summary>Lo que le has dicho últimamente · {v.reciente.length}</summary>
          <ul className="plain" style={{ marginTop: 12 }}>{v.reciente.map((i) => <li key={i.id} className="row"><span className="mono">{dateTime(i.createdAt)}</span><span>«{i.text}»</span><span className="badge green">{INTENT_KIND_LABEL[i.proposal.kind]}</span></li>)}</ul>
        </details>
      ) : null}
    </div>
  );
}
