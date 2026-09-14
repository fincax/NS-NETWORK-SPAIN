/**
 * Mesa Permanente · orquestador del flujo NS-ARP S4–S9 para una Opportunity Signal publicada.
 * Company Agent (cedente y candidatos), Matchmaker, Trust & Compliance. Todo se persiste y se audita.
 * Los agentes producen estimaciones tipadas; el Match Score y las puertas son funciones puras.
 */
import { and, eq, inArray, ne } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { getProvider } from "./provider";
import { buildExplanation, computeNSMatchScore, hardGates, preliminaryFit, labelKind, type CapabilityView } from "@/core/scoring";
import { runComplianceGate } from "@/core/compliance";
import { computePromise } from "@/core/merit";
import { assertTransition, TIMEOUTS } from "@/core/state-machine";
import { NeedDraft, VALUE_BAND_RANGE, type QualificationTurn, type SignalEnvelope } from "@/core/types";
import { matchingDemand, openDemands } from "@/services/demands";

const MIN_PLAUSIBILITY = 0.4;
const MIN_PRELIMINARY_FIT = 0.35;
const MIN_SCORE = 0.55;

export interface MesaResult {
  referralIds: string[];
  discarded: { company: string; code: string; reason: string }[];
  belowThreshold: { company: string; total: number }[];
  uncovered: string[]; // especialidades sin titular en la Sala
}

const QUESTIONS: { kind: QualificationTurn["kind"]; question: string }[] = [
  { kind: "BUDGET", question: "¿Existe presupuesto aprobado y de qué orden?" },
  { kind: "TIMING", question: "¿Cuándo empieza y qué hitos hay (licencias, fechas)?" },
  { kind: "DECISION_MAKER", question: "¿Quién decide y qué relación tiene el cedente con esa persona?" },
];

export async function runMesa(db: Db, opportunitySignalId: string): Promise<MesaResult> {
  const provider = await getProvider();
  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, opportunitySignalId) });
  if (!os) throw new Error("Opportunity signal no encontrada");
  if (os.status !== "PUBLISHED" && os.visibility !== "COMPANY_ONLY") throw new Error("La señal no está publicada");
  const chapterId = os.chapterId;
  const envelope = os.envelope as SignalEnvelope;
  const bs = await db.query.businessSignals.findFirst({ where: eq(schema.businessSignals.id, os.businessSignalId) });
  const originator = await db.query.companies.findFirst({ where: eq(schema.companies.id, os.originatorCompanyId) });
  const originatorDna = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, os.originatorCompanyId) });
  const originatorAgent = await db.query.agents.findFirst({ where: and(eq(schema.agents.companyId, os.originatorCompanyId), eq(schema.agents.kind, "COMPANY")) });
  const matchmaker = await db.query.agents.findFirst({ where: and(eq(schema.agents.chapterId, chapterId), eq(schema.agents.kind, "MATCHMAKER")) });
  const compliance = await db.query.agents.findFirst({ where: and(eq(schema.agents.chapterId, chapterId), eq(schema.agents.kind, "COMPLIANCE")) });
  if (!bs || !originator || !originatorDna || !originatorAgent || !matchmaker || !compliance) throw new Error("Faltan agentes o datos de la Sala");
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId) });
  if (!chapter) throw new Error("Sala no encontrada");

  const isInternal = os.visibility === "COMPANY_ONLY";
  const result: MesaResult = { referralIds: [], discarded: [], belowThreshold: [], uncovered: [] };

  const needRows = await db.query.needs.findMany({ where: eq(schema.needs.opportunitySignalId, os.id) });
  const specialtyRows = await db.query.specialties.findMany();
  const specialtyByCode = new Map(specialtyRows.map((s) => [s.nscatCode, s]));
  const specialtyById = new Map(specialtyRows.map((s) => [s.id, s]));

  if (!isInternal) {
    await audit(db, { chapterId, kind: "SIGNAL_PUBLISHED", actor: { type: "AGENT", id: originatorAgent.id }, subject: { type: "OpportunitySignal", id: os.id }, inputsUsed: [{ type: "OpportunitySignal", id: os.id, layer: 0 }], policyApplied: "visibility.chapter", result: `El Agente de ${originator.name} publicó un Indicio en la Mesa: "${envelope.chapter_layer.need_summary}".`, significant: true });
  }

  for (const needRow of needRows) {
    const plaus = Number(needRow.plausibility);
    if (plaus < MIN_PLAUSIBILITY) {
      await db.update(schema.needs).set({ status: "LATENT" }).where(eq(schema.needs.id, needRow.id));
      continue;
    }
    const need = NeedDraft.parse({ specialty_hints: needRow.specialtyHints, description: needRow.description, plausibility: plaus, evidence: needRow.evidence, unknowns: needRow.unknowns });

    // S4 · Discovery sobre el índice estructurado de capabilities de la Sala (≤ 8)
    const specialtyIds = need.specialty_hints.map((c) => specialtyByCode.get(c)?.id).filter((x): x is string => Boolean(x));
    const capsAll = specialtyIds.length
      ? await db.query.capabilities.findMany({ where: and(eq(schema.capabilities.chapterId, chapterId), inArray(schema.capabilities.specialtyId, specialtyIds), ne(schema.capabilities.companyId, os.originatorCompanyId)), limit: 8 })
      : [];
    // Una empresa suspendida o dada de baja sale de la Mesa de esa Sala (D-044): no recibe Cesiones ni cualifica.
    const activeIds = new Set((await db.query.companies.findMany({ where: and(eq(schema.companies.chapterId, chapterId), eq(schema.companies.status, "ACTIVE")), columns: { id: true } })).map((c) => c.id));
    const caps = capsAll.filter((c) => activeIds.has(c.companyId));
    if (caps.length === 0) {
      // Si la única titular de la especialidad es la propia empresa originadora, no es una plaza vacante.
      const ownSeat = specialtyIds.length
        ? await db.query.capabilities.findFirst({ where: and(eq(schema.capabilities.chapterId, chapterId), inArray(schema.capabilities.specialtyId, specialtyIds), eq(schema.capabilities.companyId, os.originatorCompanyId)) })
        : undefined;
      if (ownSeat) {
        await db.update(schema.needs).set({ status: "SELF" }).where(eq(schema.needs.id, needRow.id));
        continue;
      }
      const names = need.specialty_hints.map((c) => specialtyByCode.get(c)?.name ?? c);
      result.uncovered.push(...names);
      await db.update(schema.needs).set({ status: "UNCOVERED" }).where(eq(schema.needs.id, needRow.id));
      await audit(db, { chapterId, kind: "NEED_UNCOVERED", actor: { type: "AGENT", id: matchmaker.id }, subject: { type: "Need", id: needRow.id }, policyApplied: "routing.chapter_first", result: `Sin titular en la Sala para ${names.join(", ")}: plaza vacante. Candidata a Embajada.`, significant: !isInternal, companyIds: isInternal ? [os.originatorCompanyId] : [] });
      continue;
    }
    if (!isInternal) {
      await audit(db, { chapterId, kind: "AGENT_DISCOVERY", actor: { type: "AGENT", id: matchmaker.id }, subject: { type: "Need", id: needRow.id }, inputsUsed: [{ type: "Need", id: needRow.id, layer: 0 }], result: `${caps.length} Agente(s) consultado(s) para "${need.description}".`, significant: caps.length > 1 });
    }

    // Prioridad de plaza (D-001): titulares antes que capabilities secundarias
    const ordered = [...caps].sort((a, b) => Number(b.isPrimarySeat) - Number(a.isPrimarySeat));

    for (const cap of ordered) {
      const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, cap.companyId) });
      const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, cap.companyId) });
      const companyAgent = await db.query.agents.findFirst({ where: and(eq(schema.agents.companyId, cap.companyId), eq(schema.agents.kind, "COMPANY")) });
      const specialty = specialtyById.get(cap.specialtyId);
      if (!company || !dnaRow || !companyAgent || !specialty) continue;
      const demandsOfReceiver = await openDemands(db, chapterId, company.id);
      const openDemand = matchingDemand(demandsOfReceiver, envelope.qualification_layer?.triggers ?? [], envelope.chapter_layer.industry);
      const capView: CapabilityView = { companyId: company.id, companyName: company.name, specialtyCode: specialty.nscatCode, isPrimarySeat: cap.isPrimarySeat, dna: dnaRow.dna, openDemand };

      if (isInternal) {
        // Scenario D: descubrimiento interno sin emitir ningún mensaje. Solo se informa al cedente.
        const gate = hardGates(need, envelope.chapter_layer, capView, { signalVisibility: "COMPANY_ONLY", originatorAllowsInternalMatching: true });
        if (gate.pass) {
          await audit(db, { chapterId, kind: "INTERNAL_MATCH_FOUND", actor: { type: "AGENT", id: originatorAgent.id }, subject: { type: "Need", id: needRow.id }, inputsUsed: [{ type: "OpportunitySignal", id: os.id, layer: 3 }], policyApplied: "visibility.company_only", result: `Tu Agente ha identificado que ${company.name} (${specialty.name}) podría ayudar a un cliente tuyo en una operación confidencial. Nada se ha compartido.`, significant: true, companyIds: [os.originatorCompanyId] });
        }
        continue;
      }

      // S5 · puertas duras y fit preliminar (capa 0)
      const dup = await db.query.referrals.findFirst({ where: and(eq(schema.referrals.opportunitySignalId, os.id), eq(schema.referrals.receiverCompanyId, company.id)) });
      const gate = hardGates(need, envelope.chapter_layer, capView, { signalVisibility: os.visibility, duplicateWithin90d: Boolean(dup) });
      if (!gate.pass) {
        await db.insert(schema.interestClaims).values({ chapterId, needId: needRow.id, claimantCompanyId: company.id, capabilityId: cap.id, preliminaryFit: "0", rationale: gate.reason ?? "", status: "NO_INTEREST", declineCode: gate.code });
        result.discarded.push({ company: company.name, code: gate.code!, reason: gate.reason! });
        await audit(db, { chapterId, kind: "NO_INTEREST", actor: { type: "AGENT", id: companyAgent.id }, subject: { type: "Need", id: needRow.id }, inputsUsed: [{ type: "Need", id: needRow.id, layer: 0 }], policyApplied: `hard_gate.${gate.code}`, result: `${company.name} descartada: ${gate.reason}`, significant: true });
        continue;
      }
      const fit = preliminaryFit(need, envelope.chapter_layer, capView);
      const [claim] = await db.insert(schema.interestClaims).values({ chapterId, needId: needRow.id, claimantCompanyId: company.id, capabilityId: cap.id, preliminaryFit: fit.toFixed(3), rationale: `Fit preliminar ${(fit * 100).toFixed(0)} % con la capa 0.`, status: fit >= MIN_PRELIMINARY_FIT ? "ACCEPTED" : "DECLINED" }).returning();
      if (fit < MIN_PRELIMINARY_FIT) {
        result.belowThreshold.push({ company: company.name, total: fit });
        await audit(db, { chapterId, kind: "CLAIM_DECLINED", actor: { type: "AGENT", id: matchmaker.id }, subject: { type: "InterestClaim", id: claim.id }, result: `${company.name}: fit preliminar ${(fit * 100).toFixed(0)} %, por debajo del mínimo.`, significant: false });
        continue;
      }
      await audit(db, { chapterId, kind: "INTEREST_CLAIM", actor: { type: "AGENT", id: companyAgent.id }, subject: { type: "InterestClaim", id: claim.id }, inputsUsed: [{ type: "Need", id: needRow.id, layer: 0 }], result: `El Agente de ${company.name} declara interés (${(fit * 100).toFixed(0)} % preliminar).`, significant: true });

      // S6 · cualificación agente-a-agente (capa 1), máx. 6 turnos por parte
      const turns: QualificationTurn[] = [];
      for (const q of QUESTIONS) {
        const a = await provider.answerQualification({ kind: q.kind, question: q.question, rawContent: bs.rawContent, privateNotes: envelope.private_layer?.internal_notes ?? "" });
        turns.push({ kind: q.kind, question: q.question, answer: a.insufficient ? undefined : a.answer, confidence: a.confidence, insufficient: a.insufficient });
      }
      const answered = turns.filter((t) => !t.insufficient).length;
      const outcome = answered >= 2 ? "QUALIFIED" : answered === 1 ? "QUALIFIED" : "INSUFFICIENT_INFORMATION";
      const [qual] = await db.insert(schema.qualifications).values({ chapterId, interestClaimId: claim.id, turns, outcome }).returning();
      await db.insert(schema.agentInteractions).values({ chapterId, fromAgentId: companyAgent.id, toAgentId: originatorAgent.id, messageType: "QUALIFICATION_QUESTION", payload: { qualification_id: qual.id, questions: QUESTIONS.map((q) => q.kind) }, layerUsed: 1, policyApplied: "layer.1.claim_accepted" });
      await db.insert(schema.agentInteractions).values({ chapterId, fromAgentId: originatorAgent.id, toAgentId: companyAgent.id, messageType: "QUALIFICATION_ANSWER", payload: { qualification_id: qual.id, answers: turns.map((t) => ({ kind: t.kind, insufficient: t.insufficient, confidence: t.confidence })) }, layerUsed: 1, policyApplied: "layer.1.claim_accepted" });
      await audit(db, { chapterId, kind: "QUALIFICATION_EXCHANGE", actor: { type: "AGENT", id: originatorAgent.id }, subject: { type: "Qualification", id: qual.id }, inputsUsed: [{ type: "OpportunitySignal", id: os.id, layer: 1 }], result: `Cualificación ${company.name} ↔ ${originator.name}: ${turns.map((t) => `${labelKind(t.kind)} ${t.insufficient ? "sin datos" : "✓"}`).join(" · ")}.`, significant: true });
      if (outcome === "INSUFFICIENT_INFORMATION") {
        await audit(db, { chapterId, kind: "CLAIM_CLOSED", actor: { type: "AGENT", id: matchmaker.id }, subject: { type: "Qualification", id: qual.id }, result: `${company.name}: información insuficiente para cualificar. Tu Agente pedirá dos datos al cedente.`, significant: true });
        continue;
      }

      // S7 · scoring explicable (función pura)
      // Conflicto de plaza (D-001): solo si otra empresa de la Sala ocupa una plaza adyacente que también cubre esta necesidad.
      const overlapIds = (specialty.overlapsWith ?? []).map((code) => specialtyByCode.get(code)?.id).filter((x): x is string => Boolean(x));
      const adjacentHolders = overlapIds.length
        ? await db.query.capabilities.findMany({ where: and(eq(schema.capabilities.chapterId, chapterId), inArray(schema.capabilities.specialtyId, overlapIds), ne(schema.capabilities.companyId, company.id), ne(schema.capabilities.companyId, os.originatorCompanyId)) })
        : [];
      const adjacent = adjacentHolders.length > 0 && need.specialty_hints.some((code) => (specialty.overlapsWith ?? []).includes(code));
      const score = computeNSMatchScore(need, envelope.chapter_layer, envelope.qualification_layer, turns, capView, { adjacentSeatOverlap: false });
      const explanation = buildExplanation(score, need, turns);
      const [match] = await db.insert(schema.matchCandidates).values({ chapterId, needId: needRow.id, originatorCompanyId: originator.id, receiverCompanyId: company.id, qualificationId: qual.id, score, explanation, status: score.total >= MIN_SCORE ? "PROPOSED" : "BELOW_THRESHOLD" }).returning();
      if (score.total < MIN_SCORE) {
        result.belowThreshold.push({ company: company.name, total: score.total });
        await audit(db, { chapterId, kind: "MATCH_BELOW_THRESHOLD", actor: { type: "AGENT", id: matchmaker.id }, subject: { type: "MatchCandidate", id: match.id }, result: `${company.name}: Encaje ${(score.total * 100).toFixed(0)} %, por debajo del umbral.`, significant: true });
        continue;
      }
      await audit(db, { chapterId, kind: "MATCH_PROPOSED", actor: { type: "AGENT", id: matchmaker.id }, subject: { type: "MatchCandidate", id: match.id }, inputsUsed: [{ type: "Qualification", id: qual.id, layer: 1 }], result: `${company.name} alcanza ${(score.total * 100).toFixed(0)} % de Encaje (${score.band}).`, significant: true });

      // S8 · Salvoconducto
      const range = envelope.chapter_layer.value_band ? VALUE_BAND_RANGE[envelope.chapter_layer.value_band] : { min: 0, max: 0 };
      const completed = await db.query.referrals.findMany({ where: and(eq(schema.referrals.receiverCompanyId, company.id), inArray(schema.referrals.state, ["VALUE_CONFIRMED", "WON", "LOST", "NO_DECISION"])) });
      const verdict = runComplianceGate({
        envelope,
        permissions: bs.permissions as never,
        score,
        receiverSpecialtyRegulated: specialty.regulated,
        adjacentSeatOverlap: adjacent,
        receiverCompletedReferrals: completed.length,
        chapterValueThreshold: chapter.valueThresholdEur,
        estimatedValueMax: range.max,
        recentPolicyViolation: false,
        freeTexts: [bs.rawContent, envelope.private_layer?.internal_notes ?? "", ...turns.map((t) => t.answer ?? "")],
      });
      await db.update(schema.matchCandidates).set({ compliance: verdict }).where(eq(schema.matchCandidates.id, match.id));
      await audit(db, { chapterId, kind: "COMPLIANCE_VERDICT", actor: { type: "AGENT", id: compliance.id }, subject: { type: "MatchCandidate", id: match.id }, policyApplied: verdict.exceptions.length ? `exceptions:${verdict.exceptions.join(",")}` : "compliance.pass", result: verdict.verdict === "BLOCK" ? `Compliance bloquea la Pista con ${company.name}: ${verdict.checks.filter((c) => c.result === "FAIL").map((c) => c.detail).join(" ")}` : verdict.verdict === "PASS" ? `Compliance verificó permisos: Salvoconducto para ${company.name}.` : `Salvoconducto con excepciones para ${company.name}: ${verdict.exceptions.join(", ")}. Requiere Directiva.`, significant: true });

      // S9 · nace la Cesión y se pide revisión al cedente
      const now = new Date();
      const [ref] = await db.insert(schema.referrals).values({
        chapterId, matchId: match.id, needId: needRow.id, opportunitySignalId: os.id,
        originatorCompanyId: originator.id, receiverCompanyId: company.id,
        state: "DETECTED", valuePotentialMin: range.min, valuePotentialMax: range.max,
      }).returning();
      const path: [string, string, "MATCHMAKER" | "COMPANY_AGENT" | "COMPLIANCE"][] = verdict.verdict === "BLOCK"
        ? [["DETECTED", "INVESTIGATING", "MATCHMAKER"], ["INVESTIGATING", "AGENT_MATCHED", "MATCHMAKER"], ["AGENT_MATCHED", "QUALIFIED", "COMPANY_AGENT"], ["QUALIFIED", "COMPLIANCE_CHECK", "MATCHMAKER"], ["COMPLIANCE_CHECK", "BLOCKED", "COMPLIANCE"]]
        : [["DETECTED", "INVESTIGATING", "MATCHMAKER"], ["INVESTIGATING", "AGENT_MATCHED", "MATCHMAKER"], ["AGENT_MATCHED", "QUALIFIED", "COMPANY_AGENT"], ["QUALIFIED", "COMPLIANCE_CHECK", "MATCHMAKER"], ["COMPLIANCE_CHECK", "ORIGINATOR_PENDING", "COMPLIANCE"]];
      for (const [from, to, actor] of path) {
        assertTransition(from as never, to as never, actor);
        await db.insert(schema.referralTransitions).values({ referralId: ref.id, fromState: from, toState: to, actorType: "AGENT", actorId: actor === "MATCHMAKER" ? matchmaker.id : actor === "COMPLIANCE" ? compliance.id : companyAgent.id });
      }
      const finalState = path[path.length - 1][1];
      const promise = computePromise(envelope.chapter_layer, score, turns);
      await db.update(schema.referrals).set({ state: finalState, promise, reviewRequestedAt: now, expiresAt: new Date(now.getTime() + TIMEOUTS.expiryDays * 86_400_000), updatedAt: now }).where(eq(schema.referrals.id, ref.id));
      if (finalState === "ORIGINATOR_PENDING") {
        result.referralIds.push(ref.id);
        await audit(db, { chapterId, kind: "REVIEW_REQUEST", actor: { type: "AGENT", id: matchmaker.id }, subject: { type: "Referral", id: ref.id }, result: `Cesión preparada para el visto bueno de ${originator.name} (cesionario propuesto: ${company.name}).`, significant: true });
      }
    }
  }
  return result;
}
