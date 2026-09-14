/** Cesión: vistos buenos, Apertura, Puente, seguimiento, Veredicto y Distinción. Puertas humanas de NS-ARP §10. */
import { and, desc, eq, gte } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { getProvider } from "@/agents/provider";
import { assertTransition, TIMEOUTS, type Actor } from "@/core/state-machine";
import { computeVerdictMerit } from "@/core/merit";
import { ensureEcoInvitation, recomputeReferralAval } from "@/services/eco";
import { detectsReferralFee } from "@/core/compliance";
import { ReferralVerdict, type HumanDecisionKind, type ReferralPromise, type ReferralState, type RevealScope, type SignalEnvelope, type VerdictAxis } from "@/core/types";

async function transition(db: Db, referralId: string, to: ReferralState, actor: Actor, actorId: string, reason?: string) {
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) });
  if (!ref) throw new Error("Cesión no encontrada");
  assertTransition(ref.state as ReferralState, to, actor);
  await db.insert(schema.referralTransitions).values({ referralId, fromState: ref.state, toState: to, actorType: actor === "SYSTEM" ? "SYSTEM" : ["ORIGINATOR", "RECEIVER", "DIRECTOR"].includes(actor) ? "USER" : "AGENT", actorId, reason });
  await db.update(schema.referrals).set({ state: to, updatedAt: new Date(), ...(to === "INTRODUCED" ? { introducedAt: new Date(), responseDueAt: new Date(Date.now() + TIMEOUTS.responseAfterIntroHours * 3_600_000) } : {}), ...(["WON", "LOST", "NO_DECISION"].includes(to) ? { closedAt: new Date() } : {}) }).where(eq(schema.referrals.id, referralId));
  return { ...ref, state: to };
}

async function roleOf(db: Db, referralId: string, memberId: string): Promise<"ORIGINATOR" | "RECEIVER" | "DIRECTOR" | null> {
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) });
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!ref || !member) return null;
  if (member.companyId === ref.originatorCompanyId) return "ORIGINATOR";
  if (member.companyId === ref.receiverCompanyId) return "RECEIVER";
  if (member.isDirector) return "DIRECTOR";
  return null;
}

export interface DecisionInput {
  referralId: string;
  memberId: string;
  decision: HumanDecisionKind;
  notes?: string;
  revealScope?: RevealScope; // solo cedente al aprobar
  promiseAdjustment?: { estimated_value_min?: number; estimated_value_max?: number; note?: string }; // solo cesionario al aceptar
}

/** Visto bueno (cara A del cesionario, cara B del cedente, Directiva por excepción). */
export async function decide(db: Db, input: DecisionInput) {
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, input.referralId) });
  const role = await roleOf(db, input.referralId, input.memberId);
  if (!ref || !role) throw new Error("Sin permiso para decidir sobre esta Cesión");
  if (input.notes && detectsReferralFee(input.notes)) {
    await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: role === "ORIGINATOR" ? ref.originatorCompanyId : ref.receiverCompanyId, kind: "REFERRAL_FEE_VIOLATION", weight: -1000, evidenceRef: `referral:${ref.id}` });
    await audit(db, { chapterId: ref.chapterId, kind: "REFERRAL_FEE_VIOLATION", actor: { type: "USER", id: input.memberId }, subject: { type: "Referral", id: ref.id }, policyApplied: "immutable.no_fee", result: "Indicio de contraprestación por un referido. Expediente abierto ante la Directiva.", significant: true, companyIds: [] });
    throw new Error("Las notas contienen una contraprestación condicionada al referido. Regla inmutable D-010.");
  }
  const seenLayers = role === "ORIGINATOR" ? [0, 1, 2] : role === "RECEIVER" ? [0, 1] : [0, 1];
  await db.insert(schema.humanDecisions).values({ referralId: ref.id, memberId: input.memberId, role, decision: input.decision, revealScope: input.revealScope, notes: input.notes, seenLayers });
  const state = ref.state as ReferralState;
  let next: ReferralState | null = null;

  if (input.decision === "REJECT") {
    next = "REJECTED_BY_MEMBER";
    await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: role === "ORIGINATOR" ? ref.originatorCompanyId : ref.receiverCompanyId, kind: "REFERRAL_DECLINED_WITH_REASON", weight: 0, evidenceRef: `referral:${ref.id}` });
  } else if (input.decision === "REQUEST_INFO") {
    next = "QUALIFIED";
  } else if (input.decision === "APPROVE") {
    if (role === "ORIGINATOR" && state === "ORIGINATOR_PENDING") next = "RECEIVER_PENDING";
    else if (role === "RECEIVER" && state === "RECEIVER_PENDING") {
      const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, ref.matchId) });
      next = match?.compliance?.required_reviewers.includes("DIRECTOR") ? "DIRECTOR_PENDING" : "APPROVED";
    } else if (role === "DIRECTOR" && state === "DIRECTOR_PENDING") next = "APPROVED";
    else throw new Error(`Esta Cesión no espera tu decisión ahora (${state}).`);
  } else {
    // DEFER: sin transición
    await audit(db, { chapterId: ref.chapterId, kind: "HUMAN_DECISION", actor: { type: "USER", id: input.memberId }, subject: { type: "Referral", id: ref.id }, result: `${role} aplaza la decisión.`, significant: false, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
    return ref;
  }

  const actor: Actor = role;
  const updated = await transition(db, ref.id, next, actor, input.memberId, input.notes);

  // Promesa (D-021): al aceptar el cesionario, se confirma o ajusta y el cedente gana Mérito de Promesa
  if (role === "RECEIVER" && input.decision === "APPROVE" && ref.promise) {
    const promise: ReferralPromise = { ...ref.promise };
    if (input.promiseAdjustment) {
      promise.adjusted_by_receiver = true;
      promise.receiver_adjustment_note = input.promiseAdjustment.note;
      if (input.promiseAdjustment.estimated_value_min !== undefined) promise.estimated_value_min = input.promiseAdjustment.estimated_value_min;
      if (input.promiseAdjustment.estimated_value_max !== undefined) promise.estimated_value_max = input.promiseAdjustment.estimated_value_max;
    }
    await db.update(schema.referrals).set({ promise, valuePotentialMin: promise.estimated_value_min, valuePotentialMax: promise.estimated_value_max }).where(eq(schema.referrals.id, ref.id));
    await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: ref.originatorCompanyId, kind: "PROMISE_EARNED", weight: promise.merit_promise, evidenceRef: `referral:${ref.id}` });
    await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: ref.receiverCompanyId, kind: "REFERRAL_ACCEPTED", weight: 0, evidenceRef: `referral:${ref.id}` });
    const hours = ref.reviewRequestedAt ? (Date.now() - ref.reviewRequestedAt.getTime()) / 3_600_000 : 0;
    await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: ref.receiverCompanyId, kind: hours <= TIMEOUTS.reminderHours ? "RESPONSE_ON_TIME" : "RESPONSE_LATE", weight: 0, evidenceRef: `referral:${ref.id}` });
  }

  const labels: Record<string, string> = { ORIGINATOR: "El cedente", RECEIVER: "El cesionario", DIRECTOR: "La Directiva" };
  const verb = input.decision === "APPROVE" ? (role === "ORIGINATOR" ? "dio el visto bueno" : role === "RECEIVER" ? "aceptó la Cesión y confirmó la Promesa" : "aprobó la excepción") : input.decision === "REJECT" ? "declinó con motivo" : "pidió más información";
  await audit(db, { chapterId: ref.chapterId, kind: "HUMAN_DECISION", actor: { type: "USER", id: input.memberId }, subject: { type: "Referral", id: ref.id }, policyApplied: `human_gate.${role.toLowerCase()}`, result: `${labels[role]} ${verb}.`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
  return updated;
}

/** Apertura (cara B): el cedente fija el alcance de revelación y el Agente redacta el Puente. */
export async function authorizeIntro(db: Db, referralId: string, memberId: string, revealScope: RevealScope) {
  const role = await roleOf(db, referralId, memberId);
  if (role !== "ORIGINATOR") throw new Error("Solo el cedente autoriza la Apertura");
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) });
  if (!ref) throw new Error("Cesión no encontrada");
  const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, ref.matchId) });
  const blocked = match?.compliance?.blocked_fields ?? [];
  const effectiveScope: RevealScope = blocked.includes("identity_layer.contact_person") ? "COMPANY_ONLY" : revealScope;
  await db.update(schema.referrals).set({ revealScope: effectiveScope }).where(eq(schema.referrals.id, referralId));
  await transition(db, referralId, "INTRO_AUTHORIZED", "ORIGINATOR", memberId);

  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, ref.opportunitySignalId) });
  const envelope = os!.envelope as SignalEnvelope;
  const originator = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.originatorCompanyId) });
  const receiver = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.receiverCompanyId) });
  const originatorPerson = await db.query.members.findFirst({ where: and(eq(schema.members.companyId, ref.originatorCompanyId), eq(schema.members.isPrimary, true)) });
  const receiverPerson = await db.query.members.findFirst({ where: and(eq(schema.members.companyId, ref.receiverCompanyId), eq(schema.members.isPrimary, true)) });
  const receiverDna = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, ref.receiverCompanyId) });
  const provider = await getProvider();
  const pkg = await provider.draftIntro({
    originatorCompany: originator!.name,
    originatorPerson: originatorPerson!.fullName,
    receiverCompany: receiver!.name,
    receiverPerson: receiverPerson!.fullName,
    receiverServices: receiverDna!.dna.offering.services,
    thirdPartyCompany: envelope.identity_layer?.third_party_company.name ?? "vuestra empresa",
    contactName: effectiveScope === "COMPANY_AND_CONTACT" ? envelope.identity_layer?.contact_person?.name : undefined,
    needSummary: envelope.chapter_layer.need_summary,
    detailedContext: envelope.qualification_layer?.detailed_context ?? "",
    introductionPreferences: receiverDna!.dna.referrals.introduction_preferences,
  });
  if (detectsReferralFee(pkg.message)) throw new Error("El Puente contiene una contraprestación. Bloqueado por la regla inmutable D-010.");
  await db.insert(schema.introductions).values({ referralId, preparedByAgent: pkg }).onConflictDoNothing();
  const agent = await db.query.agents.findFirst({ where: eq(schema.agents.companyId, ref.originatorCompanyId) });
  await audit(db, { chapterId: ref.chapterId, kind: "INTRO_AUTHORIZED", actor: { type: "USER", id: memberId }, subject: { type: "Referral", id: referralId }, policyApplied: `reveal_scope.${effectiveScope.toLowerCase()}`, result: `Apertura autorizada: ${receiver!.name} ve ahora ${effectiveScope === "COMPANY_AND_CONTACT" ? "la empresa y el contacto" : "solo la empresa"}. El Agente de ${originator!.name} ha redactado el Puente.`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
  await audit(db, { chapterId: ref.chapterId, kind: "INTRO_PACKAGE_READY", actor: { type: "AGENT", id: agent!.id }, subject: { type: "Introduction", id: referralId }, result: "Puente redactado y listo para que la persona lo envíe.", significant: false, companyIds: [ref.originatorCompanyId] });
  return pkg;
}

/** El Puente lo envía siempre una persona (MVP). Aquí se marca como enviado. */
export async function markIntroduced(db: Db, referralId: string, memberId: string, finalMessage: string, channel: "NS_MESSAGE" | "EMAIL_BY_MEMBER" | "MEETING" | "PHONE_BY_MEMBER" = "EMAIL_BY_MEMBER") {
  const role = await roleOf(db, referralId, memberId);
  if (role !== "ORIGINATOR") throw new Error("Solo el cedente tiende el Puente");
  if (detectsReferralFee(finalMessage)) throw new Error("El mensaje contiene una contraprestación. Regla inmutable D-010.");
  await db.update(schema.introductions).set({ finalMessage, channel, sentAt: new Date(), sentByMemberId: memberId }).where(eq(schema.introductions.referralId, referralId));
  const ref = await transition(db, referralId, "INTRODUCED", "ORIGINATOR", memberId);
  await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: ref.originatorCompanyId, kind: "INTRO_COMPLETED", weight: 10, evidenceRef: `referral:${referralId}` });
  await ensureEcoInvitation(db, referralId); // Protocolo IV (D-042): con el Puente nace la invitación al Eco del Interesado
  await audit(db, { chapterId: ref.chapterId, kind: "INTRODUCED", actor: { type: "USER", id: memberId }, subject: { type: "Referral", id: referralId }, result: "El cedente tendió el Puente. El cesionario se compromete a responder al Interesado en 48 h.", significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
}

/** Seguimiento por hitos (el Agente pregunta cada 14 días). */
export async function updateStage(db: Db, referralId: string, memberId: string, stage: "MEETING" | "COMMERCIAL_OPPORTUNITY" | "WON" | "LOST" | "NO_DECISION", notes?: string) {
  const role = await roleOf(db, referralId, memberId);
  if (role !== "RECEIVER") throw new Error("Solo el cesionario actualiza el seguimiento");
  const ref = await transition(db, referralId, stage, "RECEIVER", memberId, notes);
  const label = { MEETING: "reunión celebrada", COMMERCIAL_OPPORTUNITY: "propuesta en curso", WON: "cierre ganado", LOST: "cierre perdido", NO_DECISION: "sin decisión" }[stage];
  await audit(db, { chapterId: ref.chapterId, kind: "OPPORTUNITY_UPDATE", actor: { type: "USER", id: memberId }, subject: { type: "Referral", id: referralId }, result: `Seguimiento: ${label}.`, significant: stage === "WON", companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
}

export interface VerdictInput {
  referralId: string;
  memberId: string;
  verdict: unknown; // ReferralVerdict
  recognition?: { axis: VerdictAxis; reason: string };
}

/** Veredicto (D-020) en tres ejes + Distinción opcional (máx. una por titular y mes). Emite Mérito y valor contrastado. */
export async function submitVerdict(db: Db, input: VerdictInput) {
  const v = ReferralVerdict.parse(input.verdict);
  const role = await roleOf(db, input.referralId, input.memberId);
  if (role !== "RECEIVER") throw new Error("Solo el cesionario emite el Veredicto");
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, input.referralId) });
  if (!ref || !ref.promise) throw new Error("Cesión no encontrada o sin Promesa");
  if (v.notes && detectsReferralFee(v.notes)) throw new Error("Las notas contienen una contraprestación. Regla inmutable D-010.");
  const state = ref.state as ReferralState;
  if (!["INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY", "WON", "LOST", "NO_DECISION"].includes(state)) throw new Error("El Veredicto se emite tras el Puente.");
  if (!["WON", "LOST", "NO_DECISION"].includes(state)) await transition(db, ref.id, v.result, "RECEIVER", input.memberId);

  const merit = computeVerdictMerit(v, ref.promise, { embassy: ref.embassy });
  const [row] = await db.insert(schema.verdicts).values({ referralId: ref.id, receiverMemberId: input.memberId, verdict: v, meritOriginator: merit.originator.verdict + merit.originator.close, meritReceiver: merit.receiver.closedLoop, contrastStatus: "PENDING" }).returning();
  const ev = (companyId: string, kind: string, weight: number) => db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId, kind, weight, evidenceRef: `verdict:${row.id}` });
  if (merit.originator.promiseRevoked) await ev(ref.originatorCompanyId, "PROMISE_REVOKED", -ref.promise.merit_promise);
  if (merit.originator.verdict) await ev(ref.originatorCompanyId, "VERDICT_MERIT", merit.originator.verdict);
  if (merit.originator.close) await ev(ref.originatorCompanyId, "CLOSE_MERIT", merit.originator.close);
  await ev(ref.receiverCompanyId, "RECEIVER_MERIT", merit.receiver.closedLoop);
  await ev(ref.receiverCompanyId, "OUTCOME_REPORTED", 0);
  if (v.result === "WON" && v.value_verified) {
    // El cedente confirma después; en el MVP el valor pasa a "pendiente de contraste" y el estado a VALUE_CONFIRMED cuando ambos confirman.
    await db.update(schema.referrals).set({ valueVerified: v.value_verified }).where(eq(schema.referrals.id, ref.id));
  }

  let recognition: typeof schema.recognitions.$inferSelect | undefined;
  if (input.recognition) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const given = await db.query.recognitions.findFirst({ where: and(eq(schema.recognitions.fromCompanyId, ref.receiverCompanyId), gte(schema.recognitions.createdAt, monthStart)) });
    if (given) throw new Error("Ya has otorgado tu Distinción de este mes. Es un acto escaso: una por titular y mes.");
    [recognition] = await db.insert(schema.recognitions).values({ chapterId: ref.chapterId, referralId: ref.id, fromCompanyId: ref.receiverCompanyId, toCompanyId: ref.originatorCompanyId, axis: input.recognition.axis, reason: input.recognition.reason }).returning();
    await ev(ref.originatorCompanyId, "RECOGNITION_GIVEN", 50);
    const originator = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.originatorCompanyId) });
    const receiver = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.receiverCompanyId) });
    await audit(db, { chapterId: ref.chapterId, kind: "RECOGNITION", actor: { type: "USER", id: input.memberId }, subject: { type: "Recognition", id: recognition.id }, result: `${receiver!.name} distingue a ${originator!.name} por ${input.recognition.axis.toLowerCase()}: "${input.recognition.reason}".`, significant: true });
  }
  const aval = await recomputeReferralAval(db, ref.id); // Aval de la Cesión (D-042): provisional hasta que el Interesado deje su Eco
  const resultLabel = { WON: "ganada", LOST: "perdida", NO_DECISION: "sin decisión" }[v.result];
  await audit(db, { chapterId: ref.chapterId, kind: "VERDICT", actor: { type: "USER", id: input.memberId }, subject: { type: "Verdict", id: row.id }, policyApplied: merit.originator.promiseRevoked ? "promise.revoked" : "merit.three_moments", result: `Veredicto emitido (Facilidad ${v.ease}/5 · Negocio ${v.business}/5 · Trato ${v.treatment}/5): Cesión ${resultLabel}${v.value_verified ? `, ${v.value_verified.toLocaleString("es-ES")} € pendientes de contraste` : ""}. Aval ${aval.total} (${aval.status.toLowerCase()}): falta la voz del Interesado.`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
  return { verdict: row, merit, recognition, aval };
}

/** El cedente confirma el valor: VALUE_CONFIRMED → Libro de Valor y Balanza. */
export async function confirmValue(db: Db, referralId: string, memberId: string) {
  const role = await roleOf(db, referralId, memberId);
  if (role !== "ORIGINATOR") throw new Error("Solo el cedente confirma el valor contrastado");
  const ref = await transition(db, referralId, "VALUE_CONFIRMED", "ORIGINATOR", memberId);
  await db.update(schema.verdicts).set({ contrastStatus: "OK" }).where(eq(schema.verdicts.referralId, referralId));
  await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: ref.originatorCompanyId, kind: "VALUE_VERIFIED", weight: 0, evidenceRef: `referral:${referralId}` });
  await audit(db, { chapterId: ref.chapterId, kind: "VALUE_CONFIRMED", actor: { type: "USER", id: memberId }, subject: { type: "Referral", id: referralId }, policyApplied: "contrast.both_parties", result: `Valor contrastado por ambas partes: ${ref.valueVerified?.toLocaleString("es-ES")} € al Libro de Valor.`, significant: true });
}

export async function listTransitions(db: Db, referralId: string) {
  return db.query.referralTransitions.findMany({ where: eq(schema.referralTransitions.referralId, referralId), orderBy: [desc(schema.referralTransitions.occurredAt)] });
}
