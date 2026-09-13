import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { mesaTimeline } from "@/services/today";
import { time, dateTime } from "@/lib/format";
import { Empty } from "@/components/ui";

const TONE: Record<string, string> = {
  SIGNAL_PUBLISHED: "green", INTEREST_CLAIM: "green", MATCH_PROPOSED: "green", COMPLIANCE_VERDICT: "", REVIEW_REQUEST: "amber",
  NO_INTEREST: "", NEED_UNCOVERED: "amber", HUMAN_DECISION: "amber", INTRO_AUTHORIZED: "green", INTRODUCED: "green", VERDICT: "green", VALUE_CONFIRMED: "green", RECOGNITION: "green", INTERNAL_MATCH_FOUND: "amber", REFERRAL_FEE_VIOLATION: "red",
};

const LABEL: Record<string, string> = {
  SIGNAL_PUBLISHED: "Indicio", AGENT_DISCOVERY: "Discovery", INTEREST_CLAIM: "Interés", NO_INTEREST: "Descarte", QUALIFICATION_EXCHANGE: "Cualificación",
  MATCH_PROPOSED: "Pista", MATCH_BELOW_THRESHOLD: "Pista", COMPLIANCE_VERDICT: "Salvoconducto", REVIEW_REQUEST: "Visto bueno", NEED_UNCOVERED: "Plaza vacante",
  HUMAN_DECISION: "Decisión", INTRO_AUTHORIZED: "Apertura", INTRODUCED: "Puente", OPPORTUNITY_UPDATE: "Seguimiento", VERDICT: "Veredicto", VALUE_CONFIRMED: "Valor", RECOGNITION: "Distinción",
  MEMBER_ACTIVATED: "Plaza", INTERNAL_MATCH_FOUND: "Solo para ti", CLAIM_CLOSED: "Cualificación", REFERRAL_FEE_VIOLATION: "Regla inmutable",
};

export default async function MesaPage() {
  const { company, chapter } = await requireMember();
  const db = await getDb();
  const events = await mesaTimeline(db, chapter.id, company.id, 60);
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · Mesa Permanente</p>
          <h1>Los Agentes de la Sala, reunidos 24/7.</h1>
          <p className="lead">Solo eventos significativos. Los razonamientos internos no se registran; las decisiones, la evidencia y la política aplicada, sí.</p>
        </div>
      </div>
      {events.length === 0 ? (
        <Empty title="La Mesa está en silencio.">Cede un Indicio y verás a los Agentes trabajar aquí.</Empty>
      ) : (
        <ol className="timeline">
          {events.map((e) => (
            <li key={e.id}>
              <span className="t" title={dateTime(e.occurredAt)}>{time(e.occurredAt)}</span>
              <span className="mark"><span className={`dot ${TONE[e.kind] ?? ""}`} /></span>
              <div>
                <span className="kind">{LABEL[e.kind] ?? e.kind}{e.companyIds.length ? <span className="private">privado</span> : null}</span>
                <p className="txt">{e.result}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
