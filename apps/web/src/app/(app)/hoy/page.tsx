import Link from "next/link";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { currentMember, requireDemo } from "@/lib/session";
import { todaySummary, balance } from "@/services/today";
import { REVIEW_STATES } from "@/core/state-machine";
import { daysAgo, eur, eurRange, firstName, greeting } from "@/lib/format";
import { Encaje, Empty, StateBadge } from "@/components/ui";
import { AgentAvatar } from "@/components/brand";
import { prepareDemo, runRastreoAction } from "../actions";
import { runClockThrottled } from "@/services/clock";
import { SOURCE_LABEL } from "@/agents/rastreo";
import { candidacyCounts } from "@/services/antesala";

export default async function HoyPage() {
  await requireDemo();
  const ctx = await currentMember();
  if (!ctx) {
    return (
      <div className="stack">
        <p className="eyebrow">Primer uso</p>
        <h1>NS Cumbre todavía no tiene titulares.</h1>
        <p className="lead">Prepara la Sala de demostración con diez empresas sevillanas, sus ADN de Empresa y los tres escenarios de referencia del protocolo.</p>
        <form action={prepareDemo}><button className="btn primary" type="submit">Preparar NS Cumbre (demo)</button></form>
      </div>
    );
  }
  const db = await getDb();
  const { member, company, chapter } = ctx;
  await runClockThrottled(db, chapter.id);
  const summary = await todaySummary(db, chapter.id, company.id, daysAgo(7));
  const bal = await balance(db, chapter.id, company.id);
  const companies = new Map((await db.query.companies.findMany()).map((c) => [c.id, c]));

  const pending = await db.query.referrals.findMany({
    where: and(eq(schema.referrals.chapterId, chapter.id), inArray(schema.referrals.state, [...REVIEW_STATES, "APPROVED", "INTRO_AUTHORIZED"]), or(eq(schema.referrals.receiverCompanyId, company.id), eq(schema.referrals.originatorCompanyId, company.id))),
    orderBy: [desc(schema.referrals.updatedAt)],
  });
  const forMe = pending.filter((r) => (r.state === "ORIGINATOR_PENDING" && r.originatorCompanyId === company.id) || (r.state === "RECEIVER_PENDING" && r.receiverCompanyId === company.id) || (r.state === "DIRECTOR_PENDING" && member.isDirector) || (["APPROVED", "INTRO_AUTHORIZED"].includes(r.state) && r.originatorCompanyId === company.id));
  const waiting = pending.filter((r) => !forMe.includes(r));
  const matches = new Map((await db.query.matchCandidates.findMany({ where: inArray(schema.matchCandidates.id, pending.map((r) => r.matchId).concat("00000000-0000-0000-0000-000000000000")) })).map((m) => [m.id, m]));
  const inCourse = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapter.id), inArray(schema.referrals.state, ["INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY", "WON"]), or(eq(schema.referrals.receiverCompanyId, company.id), eq(schema.referrals.originatorCompanyId, company.id))) });

  const drafts = await db.query.opportunitySignals.findMany({ where: and(eq(schema.opportunitySignals.originatorCompanyId, company.id), eq(schema.opportunitySignals.status, "DRAFT")), orderBy: [desc(schema.opportunitySignals.createdAt)] });
  const draftRecords = await db.query.publicRecords.findMany({ where: eq(schema.publicRecords.ingestedByCompanyId, company.id) });
  const recordBySignal = new Map(draftRecords.filter((r) => r.opportunitySignalId).map((r) => [r.opportunitySignalId as string, r]));
  const rastreoDrafts = drafts.filter((d) => recordBySignal.has(d.id));
  const draftSources = new Map((await db.query.businessSignals.findMany({ where: inArray(schema.businessSignals.id, drafts.map((d) => d.businessSignalId).concat("00000000-0000-0000-0000-000000000000")), columns: { id: true, source: true, rawContent: true } })).map((b) => [b.id, b]));
  const apuntes = drafts.filter((d) => !recordBySignal.has(d.id) && draftSources.get(d.businessSignalId)?.source === "APUNTE");
  const ownDrafts = drafts.filter((d) => !recordBySignal.has(d.id) && !apuntes.includes(d) && d.visibility !== "COMPANY_ONLY");
  const agentState = forMe.length ? "esperando" : summary.matches ? "encontrado" : "analizando";
  const candidacies = member.isDirector ? await candidacyCounts(db) : null;

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · {company.name}</p>
          <h1>{greeting()}, {firstName(member.fullName)}.</h1>
          <p className="lead">Mientras estabas fuera, tu red siguió trabajando para {company.name}.</p>
        </div>
        <AgentAvatar state={agentState} label={agentState === "esperando" ? "Tu Agente espera tu decisión" : agentState === "encontrado" ? "Tu Agente ha encontrado algo" : "Tu Agente está en la Mesa"} />
      </div>

      <div className="grid grid-3">
        <div className="card kpi"><span className="value">{summary.agentConversations}</span><span className="label">conversaciones entre Agentes (7 días)</span></div>
        <div className="card kpi"><span className="value">{summary.signals}</span><span className="label">Indicios relacionados con tu Sala</span></div>
        <div className="card kpi"><span className="value">{summary.matches}</span><span className="label">Pistas investigadas</span></div>
        <div className="card kpi"><span className={`value ${forMe.length ? "amber" : ""}`}>{forMe.length}</span><span className="label">decisiones que esperan tu toque</span></div>
        <div className="card kpi"><span className="value amber money" style={{ fontSize: 26 }}>{eurRange(summary.potential.min, summary.potential.max)}</span><span className="label">valor potencial en Cesiones abiertas</span></div>
        <div className="card kpi"><span className="value green money" style={{ fontSize: 26 }}>{eur(bal.valueReceived)}</span><span className="label">valor contrastado recibido · Mérito {bal.merit}</span></div>
      </div>

      {candidacies && candidacies.pendientes > 0 ? (
        <Link href="/antesala" className="card amber row" style={{ justifyContent: "space-between", textDecoration: "none" }}>
          <span><strong>Antesala:</strong> {candidacies.nuevas} {candidacies.nuevas === 1 ? "candidatura nueva" : "candidaturas nuevas"} y {candidacies.pendientes - candidacies.nuevas} en conversación esperan a la Directiva.</span>
          <span className="mono">Despachar →</span>
        </Link>
      ) : null}

      <section className="section">
        <h2>Para tu decisión</h2>
        {forMe.length === 0 ? (
          <Empty title="Tu Agente no tiene Cesiones para ti hoy.">Está en la Mesa. Cuando encuentre algo, lo verás aquí primero.</Empty>
        ) : (
          <div className="grid grid-2">
            {forMe.map((r) => {
              const m = matches.get(r.matchId);
              const iAmReceiver = r.receiverCompanyId === company.id;
              const other = companies.get(iAmReceiver ? r.originatorCompanyId : r.receiverCompanyId);
              return (
                <Link key={r.id} href={`/cesiones/${r.id}`} className="card amber" style={{ display: "grid", gap: 10 }}>
                  <div className="row"><StateBadge state={r.state} /><span className="spacer" /><span className="mono">{iAmReceiver ? "recibes" : "cedes"}</span></div>
                  <div className="title" style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                    {m ? <Encaje total={m.score.total} band={m.score.band} /> : null}
                    <strong>{iAmReceiver ? `Cesión de ${other?.name}` : `Cesión a ${other?.name}`}</strong>
                  </div>
                  <p className="lead" style={{ fontSize: 14 }}>{m?.explanation.why[0]}</p>
                  <p className="money" style={{ fontSize: 18 }}>{eurRange(r.valuePotentialMin, r.valuePotentialMax)}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="row" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Tus Apuntes</h2>
          <span className="spacer" />
          <Link href="/apunte" className="btn small">Apuntar un referido</Link>
        </div>
        {apuntes.length === 0 ? (
          <Empty title="Sin Apuntes pendientes.">Cuando en la calle alguien te cuente que necesita algo, apúntalo en treinta segundos. Tu Agente lo guarda y te lo deja aquí para decidir si lo publicas.</Empty>
        ) : (
          <div className="stack">
            {apuntes.map((d) => (
              <Link key={d.id} href={`/indicio/${d.id}`} className="card amber" style={{ display: "grid", gap: 6 }}>
                <div className="row"><span className="badge amber">Apunte · borrador</span><span className="mono">{new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(d.createdAt)}</span><span className="spacer" /><span className="mono">decide si publicar</span></div>
                <strong>{d.envelope.chapter_layer.need_summary}</strong>
                <p className="lead" style={{ fontSize: 14 }}>{draftSources.get(d.businessSignalId)?.rawContent.replace(/^Apunte del Timonel\.\s*/, "")}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="row" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Rastreo</h2>
          <span className="spacer" />
          <form action={runRastreoAction}><button className="btn small" type="submit">Rastrear fuentes públicas ahora</button></form>
        </div>
        {rastreoDrafts.length === 0 && ownDrafts.length === 0 ? (
          <Empty title="Tu Agente no tiene Indicios en borrador.">Cuando encuentre en el BORME, en licitaciones o en licencias de obra algo que sirva a otro titular de la Sala, te lo dejará aquí para que decidas.</Empty>
        ) : (
          <div className="stack">
            {rastreoDrafts.map((d) => {
              const rec = recordBySignal.get(d.id)!;
              const env = d.envelope;
              return (
                <Link key={d.id} href={`/indicio/${d.id}`} className="card" style={{ display: "grid", gap: 6 }}>
                  <div className="row"><span className="badge">{SOURCE_LABEL[rec.source as keyof typeof SOURCE_LABEL] ?? rec.source}</span><span className="mono">{rec.publishedAt ? new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(rec.publishedAt) : ""}</span><span className="spacer" /><span className="mono">borrador · decide si publicar</span></div>
                  <strong>{rec.title}</strong>
                  <p className="lead" style={{ fontSize: 14 }}>{env.chapter_layer.need_summary}</p>
                </Link>
              );
            })}
            {ownDrafts.map((d) => (
              <Link key={d.id} href={`/indicio/${d.id}`} className="card" style={{ display: "grid", gap: 6 }}>
                <div className="row"><span className="badge amber">Tu Indicio · borrador</span></div>
                <p className="lead" style={{ fontSize: 14 }}>{d.envelope.chapter_layer.need_summary}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {summary.internal.length > 0 ? (
        <section className="section">
          <h2>Solo para ti</h2>
          <div className="stack">
            {summary.internal.map((e) => (
              <div key={e.id} className="card">
                <p>{e.result}</p>
                <p className="mono" style={{ marginTop: 6 }}>COMPANY_ONLY · nada ha salido de tu empresa</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {waiting.length > 0 || inCourse.length > 0 ? (
        <section className="section">
          <h2>En marcha</h2>
          <div className="stack">
            {[...waiting, ...inCourse].map((r) => {
              const iAmReceiver = r.receiverCompanyId === company.id;
              const other = companies.get(iAmReceiver ? r.originatorCompanyId : r.receiverCompanyId);
              return (
                <Link key={r.id} href={`/cesiones/${r.id}`} className="card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <StateBadge state={r.state} />
                  <span>{iAmReceiver ? `De ${other?.name}` : `A ${other?.name}`}</span>
                  <span className="spacer" />
                  <span className="money">{eurRange(r.valuePotentialMin, r.valuePotentialMax)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
