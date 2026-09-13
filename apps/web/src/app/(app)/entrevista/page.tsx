import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { AgentAvatar } from "@/components/brand";
import { activeInterview, dnaGaps, TRIGGER_LABEL } from "@/services/entrevista";
import type { BusinessDNA } from "@/core/types";
import { abandonInterviewAction, answerInterviewAction, finishInterviewAction, startInterviewAction } from "./actions";

/**
 * Entrevista del Agente (D-040). Conversación a la izquierda; a la derecha, el ADN que se va construyendo.
 * En el móvil, primero la conversación y debajo el ADN.
 */
function DnaPreview({ dna, title }: { dna: BusinessDNA; title: string }) {
  const gaps = dnaGaps(dna);
  const row = (label: string, value: string | undefined | null) => (value ? <li key={label}><span className="mono">{label}</span><span>{value}</span></li> : null);
  return (
    <aside className="card dna-preview" aria-label="ADN de Empresa">
      <p className="eyebrow">{title}</p>
      <ul className="plain dna-rows">
        {row("Qué hace", dna.company.description)}
        {row("Dónde", dna.company.locations.join(", "))}
        {row("Servicios", dna.offering.services.join(" · "))}
        {row("No hace", dna.offering.exclusions.join(" · "))}
        {row("Sectores", dna.ideal_customer.industries.join(", "))}
        {row("Tamaño", dna.ideal_customer.company_size.length ? `${dna.ideal_customer.company_size.join(" / ")} empleados` : "")}
        {row("Zonas", dna.ideal_customer.geography.join(", "))}
        {row("Decide", dna.ideal_customer.roles.join(", "))}
        {row("Señales", dna.ideal_customer.triggers.map((t) => TRIGGER_LABEL[t] ?? t).join(", "))}
        {row("Ticket", dna.commercial.ticket_min ? `${dna.commercial.ticket_min.toLocaleString("es-ES")} €${dna.commercial.ticket_max ? ` – ${dna.commercial.ticket_max.toLocaleString("es-ES")} €` : " o más"}` : "")}
        {row("Ciclo", dna.commercial.sales_cycle_days ? `${dna.commercial.sales_cycle_days} días` : "")}
        {row("Referido perfecto", dna.referrals.perfect_referral)}
        {row("Nunca", dna.referrals.disqualifiers.join(" · "))}
        {row("Presentación", dna.referrals.introduction_preferences)}
        {row("No se comparte", dna.knowledge.never_share.join(" · "))}
        {row("Objetivo", dna.objectives.quarterly || dna.objectives.monthly)}
      </ul>
      {gaps.length ? <p className="mono" style={{ marginTop: 10 }}>Falta: {gaps.join(", ")}.</p> : <p className="mono" style={{ marginTop: 10, color: "var(--green)" }}>ADN completo para trabajar en la Mesa.</p>}
    </aside>
  );
}

export default async function EntrevistaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { member, company } = await requireMember();
  const { error } = await searchParams;
  const db = await getDb();
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, company.id) });
  const interview = await activeInterview(db, company.id);
  const validated = !!dnaRow?.validatedAt;

  if (!interview) {
    const gaps = dnaRow ? dnaGaps(dnaRow.dna) : [];
    return (
      <div className="stack" style={{ gap: 24, maxWidth: 760 }}>
        <div className="page-head">
          <div>
            <p className="eyebrow">{company.name} · Mi Agente</p>
            <h1>{validated ? "Amplía lo que tu Agente sabe de ti." : "Tu Agente quiere conocerte."}</h1>
            <p className="lead">{validated ? "Tu ADN está validado. Una nueva entrevista parte de lo que ya sabe y te pregunta solo lo que falta o ha cambiado. Al terminar, validas la nueva versión." : "Diez preguntas, como las haría un buen director comercial el primer día. Lo que no sepas, lo saltas. Al final ves el ADN completo y lo validas: desde ese momento tu Agente trabaja con él en la Mesa."}</p>
          </div>
          <AgentAvatar state="analizando" label="Listo para escuchar" />
        </div>
        {error ? <div className="notice error">{error}</div> : null}
        {gaps.length ? <div className="notice amber">A tu ADN le falta: {gaps.join(", ")}. La entrevista lo cubre.</div> : null}
        {company.website ? <p className="mono">Antes de preguntar, tu Agente leerá {company.website}.</p> : <p className="mono">Sin web en la ficha: el Agente preguntará desde cero.</p>}
        <form action={startInterviewAction} className="actions">
          <button className="btn primary" type="submit">Empezar la entrevista</button>
          <Link href={`/empresa/${company.slug}`} className="btn ghost">Ahora no</Link>
        </form>
      </div>
    );
  }

  const turns = interview.transcript;
  const lastAgent = [...turns].reverse().find((t) => t.role === "agent");
  const ready = interview.status === "READY";

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{company.name} · Entrevista del Agente</p>
          <h1 style={{ fontSize: 28 }}>{ready ? "Ya te conozco." : "Cuéntame tu empresa."}</h1>
        </div>
        <div className="row" style={{ gap: 14 }}>
          <div className="progress" role="progressbar" aria-valuenow={interview.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progreso de la entrevista"><span style={{ width: `${interview.progress}%` }} /></div>
          <span className="mono">{interview.progress} %</span>
        </div>
      </div>
      {error ? <div className="notice error">{error}</div> : null}
      <div className="interview">
        <section className="chat" aria-label="Conversación con tu Agente">
          {turns.map((t, i) => (
            <div key={i} className={`bubble ${t.role}`}>
              {t.role === "agent" ? <span className="who">Tu Agente</span> : <span className="who">{member.fullName.split(" ")[0]}</span>}
              <p>{t.text}</p>
              {t.role === "agent" && t.learned?.length && i > 0 ? <ul className="why learned">{t.learned.map((l) => <li key={l}>{l}</li>)}</ul> : null}
            </div>
          ))}
          <div id="turno" />
          {ready ? (
            <div className="card green" style={{ display: "grid", gap: 12 }}>
              <strong>Revisa el ADN y valídalo.</strong>
              <p className="lead" style={{ fontSize: 14 }}>Al validar, tu Agente empieza a trabajar con esta versión. Podrás ampliarla cuando quieras desde tu Dossier.</p>
              <div className="actions">
                <form action={finishInterviewAction}><input type="hidden" name="id" value={interview.id} /><button className="btn primary" type="submit">Validar mi ADN y activar</button></form>
                <form action={startInterviewAction}><input type="hidden" name="restart" value="1" /><button className="btn ghost" type="submit">Empezar de nuevo</button></form>
              </div>
            </div>
          ) : (
            <form action={answerInterviewAction} className="stack answer">
              <input type="hidden" name="id" value={interview.id} />
              <label htmlFor="ans" className="mono">Tu respuesta · {lastAgent?.topic ? `tema ${interview.progress} %` : ""}</label>
              <textarea id="ans" name="text" autoFocus required minLength={1} placeholder="Responde como se lo contarías a un socio. Sin formularios." style={{ minHeight: 110 }} />
              <div className="actions">
                <button className="btn primary" type="submit">Responder</button>
                <button className="btn ghost" type="submit" name="skip" value="1" formNoValidate>No lo sé, siguiente</button>
              </div>
            </form>
          )}
          {!ready ? <form action={abandonInterviewAction} style={{ marginTop: 8 }}><input type="hidden" name="id" value={interview.id} /><button className="linkish" type="submit">Dejarlo para otro día</button></form> : null}
        </section>
        <DnaPreview dna={interview.draftDna} title={ready ? "ADN de Empresa · versión para validar" : "Lo que tu Agente sabe ya"} />
      </div>
    </div>
  );
}
