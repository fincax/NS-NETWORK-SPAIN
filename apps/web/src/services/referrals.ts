/** Cesión: vistos buenos, Apertura, Puente, seguimiento, Veredicto y Distinción. Puertas humanas de NS-ARP §10. */
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { getProvider } from "@/agents/provider";
import { assertTransition, MAX_INFO_ROUNDS, QUESTION_STATES, TIMEOUTS, type Actor } from "@/core/state-machine";
import { computeVerdictMerit } from "@/core/merit";
import { detectsReferralFee } from "@/core/compliance";
import { ReferralVerdict, type HumanDecisionKind, type QualificationTurn, type ReferralPromise, type ReferralState, type RevealScope, type SignalEnvelope, type VerdictAxis } from "@/core/types";

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
  /** Pregunta exprés (D-065): con REQUEST_INFO (solo preguntar) o con APPROVE del cesionario ("aceptar y preguntar"). */
  question?: string;
}

/** Pregunta exprés (D-065): qué hay pendiente y cuántas preguntas quedan en una Cesión. */
export interface InfoRound {
  /** Pregunta del cesionario que el cedente aún no ha respondido (también si ya venció su plazo: puede responder tarde). */
  pending: QualificationTurn | null;
  /** La pregunta pendiente venció sin respuesta: la Cesión siguió sin ella. */
  overdue: boolean;
  /** Hasta cuándo tiene el cedente para responder. */
  dueAt: Date | null;
  /** Preguntas ya respondidas por el cedente, en orden. */
  answered: QualificationTurn[];
  roundsUsed: number;
  roundsLeft: number;
}

const isQuestion = (t: QualificationTurn) => t.asked_by === "RECEIVER";
const H = 3_600_000;

async function qualificationOf(db: Db, matchId: string) {
  const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, matchId) });
  if (!match?.qualificationId) return null;
  return (await db.query.qualifications.findFirst({ where: eq(schema.qualifications.id, match.qualificationId) })) ?? null;
}

function infoRoundFromTurns(turns: QualificationTurn[]): InfoRound {
  const questions = turns.filter(isQuestion);
  const pending = questions.find((t) => !t.answered_by) ?? null;
  const answered = questions.filter((t) => Boolean(t.answered_by));
  return { pending, overdue: Boolean(pending?.unanswered_at), dueAt: pending?.due_at ? new Date(pending.due_at) : null, answered, roundsUsed: questions.length, roundsLeft: Math.max(0, MAX_INFO_ROUNDS - questions.length) };
}

export async function infoRound(db: Db, referral: { matchId: string }): Promise<InfoRound> {
  const q = await qualificationOf(db, referral.matchId);
  return infoRoundFromTurns(q?.turns ?? []);
}

/** Estado de la pregunta al cedente para varias Cesiones (Hoy, listados). */
export async function infoRoundsFor(db: Db, referrals: { id: string; matchId: string }[]): Promise<Map<string, InfoRound>> {
  const out = new Map<string, InfoRound>();
  if (referrals.length === 0) return out;
  const matches = await db.query.matchCandidates.findMany({ where: inArray(schema.matchCandidates.id, referrals.map((r) => r.matchId)) });
  const qualIds = matches.map((m) => m.qualificationId).filter((x): x is string => Boolean(x));
  const quals = qualIds.length ? await db.query.qualifications.findMany({ where: inArray(schema.qualifications.id, qualIds) }) : [];
  const qualById = new Map(quals.map((q) => [q.id, q]));
  const matchById = new Map(matches.map((m) => [m.id, m]));
  for (const r of referrals) {
    const q = matchById.get(r.matchId)?.qualificationId;
    out.set(r.id, infoRoundFromTurns((q && qualById.get(q)?.turns) || []));
  }
  return out;
}

/** El Agente del cedente redacta un borrador de respuesta a partir del Indicio y de las notas privadas; nunca decide por el Timonel. */
async function draftAnswer(db: Db, ref: { opportunitySignalId: string }, question: string): Promise<string | undefined> {
  try {
    const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, ref.opportunitySignalId) });
    if (!os) return undefined;
    const bs = await db.query.businessSignals.findFirst({ where: eq(schema.businessSignals.id, os.businessSignalId) });
    const env = os.envelope as SignalEnvelope;
    const provider = await getProvider();
    const a = await provider.answerQualification({ kind: "FREE", question, rawContent: bs?.rawContent ?? "", privateNotes: env.private_layer?.internal_notes ?? "" });
    return a.insufficient || !a.answer ? undefined : a.answer;
  } catch {
    return undefined;
  }
}

/** Modifica la pregunta pendiente de una Cesión (la usa el Reloj para el recordatorio y el vencimiento). */
export async function patchPendingQuestion(db: Db, referral: { matchId: string }, patch: Partial<QualificationTurn>) {
  const qual = await qualificationOf(db, referral.matchId);
  if (!qual) return false;
  const turns = [...qual.turns];
  const i = turns.findIndex((t) => isQuestion(t) && !t.answered_by);
  if (i < 0) return false;
  turns[i] = { ...turns[i], ...patch };
  await db.update(schema.qualifications).set({ turns }).where(eq(schema.qualifications.id, qual.id));
  return true;
}

/** La pregunta queda en la cualificación de la Pista con su plazo de 24 h y el borrador del Agente del cedente, si lo hay. */
async function askQuestion(db: Db, ref: { matchId: string; opportunitySignalId: string }, question: string, now = new Date()) {
  const qual = await qualificationOf(db, ref.matchId);
  if (!qual) return;
  const draft = await draftAnswer(db, ref, question);
  const turn: QualificationTurn = { kind: "FREE", question, insufficient: true, asked_by: "RECEIVER", asked_at: now.toISOString(), due_at: new Date(now.getTime() + TIMEOUTS.questionAnswerHours * H).toISOString(), ...(draft ? { draft_answer: draft } : {}) };
  await db.update(schema.qualifications).set({ turns: [...qual.turns, turn] }).where(eq(schema.qualifications.id, qual.id));
}

/** El plazo de revisión de quien tiene que actuar vuelve a empezar (7 días, recordatorio a las 24 h). */
async function restartReviewClock(db: Db, referralId: string, now = new Date()) {
  await db.update(schema.referrals).set({ reviewRequestedAt: now, expiresAt: new Date(now.getTime() + TIMEOUTS.expiryDays * 86_400_000), reminderSentAt: null, updatedAt: now }).where(eq(schema.referrals.id, referralId));
}

/** Visto bueno (cara A del cesionario, cara B del cedente, Directiva por excepción), pregunta al cedente y su respuesta (D-058). */
export async function decide(db: Db, input: DecisionInput) {
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, input.referralId) });
  const role = await roleOf(db, input.referralId, input.memberId);
  if (!ref || !role) throw new Error("Sin permiso para decidir sobre esta Cesión");
  if (input.notes && detectsReferralFee(input.notes)) {
    await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: role === "ORIGINATOR" ? ref.originatorCompanyId : ref.receiverCompanyId, kind: "REFERRAL_FEE_VIOLATION", weight: -1000, evidenceRef: `referral:${ref.id}` });
    await audit(db, { chapterId: ref.chapterId, kind: "REFERRAL_FEE_VIOLATION", actor: { type: "USER", id: input.memberId }, subject: { type: "Referral", id: ref.id }, policyApplied: "immutable.no_fee", result: "Indicio de contraprestación por un referido. Expediente abierto ante la Directiva.", significant: true, companyIds: [] });
    throw new Error("Las notas contienen una contraprestación condicionada al referido. Regla inmutable D-010.");
  }
  const state = ref.state as ReferralState;
  const now = new Date();
  // Pregunta exprés (D-065): con REQUEST_INFO la pregunta puede venir en `question` o en `notes`; con APPROVE del cesionario, solo en `question`.
  const question = (input.question ?? (input.decision === "REQUEST_INFO" ? input.notes : undefined))?.trim() || undefined;
  const answer = input.decision === "ANSWER" ? input.notes?.trim() : undefined;

  // Se valida antes de registrar nada, para que una petición inválida no cuente como pregunta ni como decisión.
  let round: InfoRound | null = null;
  const asksQuestion = input.decision === "REQUEST_INFO" || (input.decision === "APPROVE" && role === "RECEIVER" && Boolean(question));
  if (asksQuestion) {
    if (role !== "RECEIVER" || state !== "RECEIVER_PENDING") throw new Error("Solo el cesionario pregunta al cedente, y solo mientras la Cesión espera su decisión.");
    if (!question) throw new Error("Escribe la pregunta concreta para el cedente.");
    round = await infoRound(db, ref);
    if (round.pending) throw new Error("Ya hay una pregunta esperando al cedente. Decide con lo que consta o espera su respuesta.");
    if (round.roundsLeft <= 0) throw new Error(`Ya has preguntado ${MAX_INFO_ROUNDS} veces en esta Cesión: acepta o declina con lo que consta.`);
  } else if (input.decision === "ANSWER") {
    if (role !== "ORIGINATOR") throw new Error("Solo el cedente responde a la pregunta del cesionario.");
    if (!QUESTION_STATES.has(state)) throw new Error("Esta Cesión ya no admite respuestas.");
    round = await infoRound(db, ref);
    if (!round.pending) throw new Error("Esta Cesión no tiene ninguna pregunta pendiente.");
    if (!answer) throw new Error("Escribe la respuesta para el cesionario.");
  }

  const seenLayers = role === "ORIGINATOR" ? [0, 1, 2] : role === "RECEIVER" ? [0, 1] : [0, 1];
  const record = () => db.insert(schema.humanDecisions).values({ referralId: ref.id, memberId: input.memberId, role, decision: input.decision, revealScope: input.revealScope, notes: input.notes, seenLayers });
  let next: ReferralState | null = null;

  const labels: Record<string, string> = { ORIGINATOR: "El cedente", RECEIVER: "El cesionario", DIRECTOR: "La Directiva" };
  const quote = (text: string) => ` «${text.length > 140 ? `${text.slice(0, 137)}…` : text}»`;

  if (input.decision === "REJECT") {
    next = "REJECTED_BY_MEMBER";
    await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: role === "ORIGINATOR" ? ref.originatorCompanyId : ref.receiverCompanyId, kind: "REFERRAL_DECLINED_WITH_REASON", weight: 0, evidenceRef: `referral:${ref.id}` });
  } else if (input.decision === "REQUEST_INFO" && question) {
    // Solo preguntar (D-065): la Cesión no se mueve; sigue en la mesa del cesionario, que puede decidir cuando quiera.
    await record();
    await askQuestion(db, ref, question, now);
    await audit(db, { chapterId: ref.chapterId, kind: "QUESTION", actor: { type: "USER", id: input.memberId }, subject: { type: "Referral", id: ref.id }, policyApplied: "question.express_24h", result: `El cesionario pregunta al cedente (${(round?.roundsUsed ?? 0) + 1} de ${MAX_INFO_ROUNDS}):${quote(question)} La Cesión sigue en su mesa; el cedente tiene ${TIMEOUTS.questionAnswerHours} h para responder.`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
    return ref;
  } else if (input.decision === "ANSWER" && answer && round?.pending) {
    // La respuesta se incorpora como evidencia, a tiempo o tarde; la Cesión no cambia de estado.
    const late = Boolean(round.pending.unanswered_at) || (round.dueAt ? now > round.dueAt : false);
    await record();
    await patchPendingQuestion(db, ref, { answer, confidence: 0.9, insufficient: false, answered_by: "ORIGINATOR", answered_at: now.toISOString(), answered_late: late });
    if (!late) await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: ref.originatorCompanyId, kind: "RESPONSE_ON_TIME", weight: 0, evidenceRef: `referral:${ref.id}` });
    await audit(db, { chapterId: ref.chapterId, kind: "HUMAN_DECISION", actor: { type: "USER", id: input.memberId }, subject: { type: "Referral", id: ref.id }, policyApplied: late ? "question.answered_late" : "question.answered", result: `El cedente respondió${late ? " con retraso" : ""} a la pregunta del cesionario:${quote(answer)}${late ? " La Cesión había seguido sin la respuesta; el cesionario la ve ahora destacada." : ""}`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
    return ref;
  } else if (input.decision === "APPROVE") {
    if (role === "ORIGINATOR" && state === "ORIGINATOR_PENDING") {
      next = "RECEIVER_PENDING";
    } else if (role === "RECEIVER" && state === "RECEIVER_PENDING") {
      const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, ref.matchId) });
      next = match?.compliance?.required_reviewers.includes("DIRECTOR") ? "DIRECTOR_PENDING" : "APPROVED";
    } else if (role === "DIRECTOR" && state === "DIRECTOR_PENDING") next = "APPROVED";
    else throw new Error(`Esta Cesión no espera tu decisión ahora (${state}).`);
  } else {
    // DEFER: sin transición
    await record();
    await audit(db, { chapterId: ref.chapterId, kind: "HUMAN_DECISION", actor: { type: "USER", id: input.memberId }, subject: { type: "Referral", id: ref.id }, result: `${role} aplaza la decisión.`, significant: false, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
    return ref;
  }

  // Solo una decisión válida queda registrada: un intento fuera de turno no deja rastro como decisión humana.
  await record();
  const actor: Actor = role;
  const updated = await transition(db, ref.id, next, actor, input.memberId, input.notes);

  // Aceptar y preguntar (D-065): la Cesión avanza y la pregunta viaja con ella; el cedente la ve junto a la Apertura.
  if (asksQuestion && question) await askQuestion(db, ref, question, now);

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

  const verb =
    input.decision === "APPROVE" ? (role === "ORIGINATOR" ? "dio el visto bueno" : role === "RECEIVER" ? (question ? `aceptó la Cesión, confirmó la Promesa y pregunta al cedente:${quote(question)} El cedente tiene ${TIMEOUTS.questionAnswerHours} h para responder; la Cesión no espera` : "aceptó la Cesión y confirmó la Promesa") : "aprobó la excepción")
    : "declinó con motivo";
  await audit(db, { chapterId: ref.chapterId, kind: "HUMAN_DECISION", actor: { type: "USER", id: input.memberId }, subject: { type: "Referral", id: ref.id }, policyApplied: `human_gate.${role.toLowerCase()}`, result: `${labels[role]} ${verb}.`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
  return updated;
}

/**
 * Reparación (D-058, D-065): una pregunta del cesionario nunca detiene la Cesión. Las Cesiones que una versión anterior dejó
 * paradas por una pregunta (en "Cualificada", antes de D-058; o esperando al cedente, con D-058) vuelven a la mesa del
 * cesionario con la pregunta registrada y su plazo de 24 h contando desde ahora. Idempotente.
 */
export async function repairStuckInfoRequests(db: Db, now = new Date()): Promise<string[]> {
  const candidates = await db.query.referrals.findMany({ where: inArray(schema.referrals.state, ["QUALIFIED", "ORIGINATOR_PENDING"]) });
  const repaired: string[] = [];
  for (const ref of candidates) {
    const qual = await qualificationOf(db, ref.matchId);
    const open = qual?.turns.find((t) => isQuestion(t) && !t.answered_by);
    if (ref.state === "QUALIFIED") {
      const last = await db.query.referralTransitions.findFirst({ where: eq(schema.referralTransitions.referralId, ref.id), orderBy: [desc(schema.referralTransitions.occurredAt)] });
      if (!last || last.toState !== "QUALIFIED" || !["ORIGINATOR_PENDING", "RECEIVER_PENDING"].includes(last.fromState) || last.actorType !== "USER") continue;
    } else if (!open) continue; // esperando al cedente por su visto bueno, no por una pregunta: nada que reparar
    const request = await db.query.humanDecisions.findFirst({ where: and(eq(schema.humanDecisions.referralId, ref.id), eq(schema.humanDecisions.decision, "REQUEST_INFO")), orderBy: [desc(schema.humanDecisions.occurredAt)] });
    const question = open?.question || request?.notes?.trim() || "El cesionario pidió más información antes de decidir, sin concretar la pregunta. Cuéntale lo que sepas del Interesado que no esté ya en el Indicio.";
    if (qual && !open) await askQuestion(db, ref, question, now);
    else if (open && !open.due_at) await patchPendingQuestion(db, ref, { asked_at: open.asked_at ?? now.toISOString(), due_at: new Date(now.getTime() + TIMEOUTS.questionAnswerHours * H).toISOString() });
    await db.insert(schema.referralTransitions).values({ referralId: ref.id, fromState: ref.state, toState: "RECEIVER_PENDING", actorType: "SYSTEM", actorId: "reparacion", reason: "Una pregunta nunca detiene la Cesión: vuelve a la mesa del cesionario con la pregunta en curso (D-065)" });
    await db.update(schema.referrals).set({ state: "RECEIVER_PENDING", updatedAt: now }).where(eq(schema.referrals.id, ref.id));
    await restartReviewClock(db, ref.id, now);
    await audit(db, { chapterId: ref.chapterId, kind: "REVIEW_REQUEST", actor: { type: "SYSTEM", id: "reparacion" }, subject: { type: "Referral", id: ref.id }, policyApplied: "question.repair", result: `La Cesión vuelve a la mesa del cesionario: su pregunta sigue en curso y el cedente tiene ${TIMEOUTS.questionAnswerHours} h para responder.`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
    repaired.push(ref.id);
  }
  return repaired;
}

/** Apertura (cara B): el cedente fija el alcance de revelación y el Agente redacta el Puente. */
export async function authorizeIntro(db: Db, referralId: string, memberId: string, revealScope: RevealScope, opts: { answer?: string } = {}) {
  const role = await roleOf(db, referralId, memberId);
  if (role !== "ORIGINATOR") throw new Error("Solo el cedente autoriza la Apertura");
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) });
  if (!ref) throw new Error("Cesión no encontrada");
  // Responder y abrir en un solo acto (D-065): si el cesionario preguntó al aceptar, la respuesta va con la Apertura.
  if (opts.answer?.trim() && (await infoRound(db, ref)).pending) await decide(db, { referralId, memberId, decision: "ANSWER", notes: opts.answer.trim() });
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
  const resultLabel = { WON: "ganada", LOST: "perdida", NO_DECISION: "sin decisión" }[v.result];
  await audit(db, { chapterId: ref.chapterId, kind: "VERDICT", actor: { type: "USER", id: input.memberId }, subject: { type: "Verdict", id: row.id }, policyApplied: merit.originator.promiseRevoked ? "promise.revoked" : "merit.three_moments", result: `Veredicto emitido (Facilidad ${v.ease}/5 · Negocio ${v.business}/5 · Trato ${v.treatment}/5): Cesión ${resultLabel}${v.value_verified ? `, ${v.value_verified.toLocaleString("es-ES")} € pendientes de contraste` : ""}.`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
  return { verdict: row, merit, recognition };
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
