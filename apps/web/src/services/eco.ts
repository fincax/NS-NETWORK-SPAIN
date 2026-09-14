/**
 * Protocolo IV · Dar la Palabra (D-042, NS-AEP): el Eco del Interesado y el Aval.
 *
 *  - Con el Puente nace la invitación (token único). El Agente del cesionario redacta la Petición de Eco; la persona la envía.
 *    Ningún Agente contacta con el Interesado (autonomía externa restringida en el MVP).
 *  - El Interesado responde desde una página pública sin usuario: tres ejes, una línea, consentimiento de publicación.
 *    Puede hacerlo durante la Cesión (DURANTE) y al cierre (FINAL); el FINAL sustituye al DURANTE en el Aval.
 *  - El Aval de la Cesión se recalcula con cada Veredicto y cada Eco. El Aval del titular se calcula al leerlo, con evidencia por bloque.
 *  - El Veredicto nunca llega al Interesado. El Eco solo se publica en la Sala con consentimiento; sin él, cuenta pero no se muestra.
 */
import { randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { detectsReferralFee } from "@/core/compliance";
import { BREACH_KINDS, computeEcoMerit, computeReferralAval, computeTitularAval, DESTACADO, ECO_WINDOW_DAYS, ecoScore, isDestacado, type ReferralAval, type TitularAval } from "@/core/aval";
import { EcoInput, type EcoPhase, type EcoRecord, type ReferralState } from "@/core/types";

const CLOSED: ReferralState[] = ["WON", "LOST", "NO_DECISION", "VALUE_CONFIRMED"];
const AFTER_BRIDGE: ReferralState[] = ["INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY", ...CLOSED];
const D = 86_400_000;

export function publicBaseUrl(): string {
  return process.env.NS_PUBLIC_URL ?? (process.env.NODE_ENV === "production" ? "https://networkspain.com" : "http://localhost:3000");
}

export const ecoLink = (token: string) => `${publicBaseUrl()}/eco/${token}`;

/** Nace con el Puente: una invitación por Cesión, con token único. Idempotente. */
export async function ensureEcoInvitation(db: Db, referralId: string) {
  const existing = await db.query.endorsements.findFirst({ where: eq(schema.endorsements.referralId, referralId) });
  if (existing) return existing;
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) });
  if (!ref) throw new Error("Cesión no encontrada");
  const [row] = await db.insert(schema.endorsements).values({ chapterId: ref.chapterId, referralId, token: randomBytes(24).toString("hex") }).returning();
  return row;
}

async function receiverMemberCheck(db: Db, referralId: string, memberId: string) {
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) });
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!ref || !member || member.companyId !== ref.receiverCompanyId) throw new Error("Solo el cesionario pide el Eco al Interesado");
  if (!AFTER_BRIDGE.includes(ref.state as ReferralState)) throw new Error("El Eco se pide después del Puente.");
  return ref;
}

/** El Agente del cesionario redacta la Petición de Eco. Plantilla determinista: no hay nada que inventar. */
export async function draftEcoRequest(db: Db, referralId: string, memberId: string) {
  const ref = await receiverMemberCheck(db, referralId, memberId);
  const inv = await ensureEcoInvitation(db, referralId);
  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, ref.opportunitySignalId) });
  const receiver = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.receiverCompanyId) });
  const originator = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.originatorCompanyId) });
  const person = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  const closed = CLOSED.includes(ref.state as ReferralState);
  const contact = ref.revealScope === "COMPANY_AND_CONTACT" ? os?.envelope.identity_layer?.contact_person?.name?.split(" ")[0] : undefined;
  const link = ecoLink(inv.token);
  const subject = closed ? `Tu opinión sobre ${receiver!.name}` : `¿Cómo lo estamos haciendo? · ${receiver!.name}`;
  const message = [
    `${contact ? `Hola, ${contact}` : "Hola"}:`,
    "",
    closed
      ? `Ya hemos terminado el trabajo que empezó cuando ${originator!.name} nos presentó. Antes de cerrar, me gustaría saber cómo lo has vivido.`
      : `Llevamos un tiempo trabajando juntos desde que ${originator!.name} nos presentó. Me gustaría saber, a mitad de camino, cómo lo estás viviendo.`,
    "",
    "Son tres preguntas y un minuto: si te atendimos bien, si resolvimos lo que necesitabas y si nos recomendarías. Puedes añadir una línea si quieres.",
    "",
    link,
    "",
    "Tu respuesta llega a la red NS Network, a la que pertenecemos, y sirve para que las presentaciones entre empresas sigan siendo de confianza. Solo se publica con tu nombre, y nunca con tus datos de contacto, si tú lo autorizas.",
    "",
    `Gracias,`,
    `${person?.fullName ?? ""} · ${receiver!.name}`,
  ].join("\n");
  return { subject, message, link, token: inv.token, status: inv.status };
}

/** La persona envía la Petición (desde su correo, desde NS o en persona) y lo marca aquí. */
export async function markEcoRequested(db: Db, referralId: string, memberId: string, message: string) {
  const ref = await receiverMemberCheck(db, referralId, memberId);
  if (detectsReferralFee(message)) throw new Error("La Petición de Eco contiene una contraprestación. Regla inmutable D-010: nunca se paga ni se descuenta por una valoración.");
  const inv = await ensureEcoInvitation(db, referralId);
  if (inv.status !== "PENDING") return inv;
  const now = new Date();
  const [row] = await db.update(schema.endorsements).set({ status: "SENT", requestMessage: message, sentAt: now, sentByMemberId: memberId, updatedAt: now }).where(eq(schema.endorsements.id, inv.id)).returning();
  await db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId: ref.receiverCompanyId, kind: "ECO_REQUEST_SENT", weight: 5, evidenceRef: `endorsement:${row.id}` });
  const receiver = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.receiverCompanyId) });
  await audit(db, { chapterId: ref.chapterId, kind: "ECO_REQUESTED", actor: { type: "USER", id: memberId }, subject: { type: "Endorsement", id: row.id }, policyApplied: "protocol_iv.request_sent_by_person", result: `${receiver!.name} dio la palabra al Interesado: Petición de Eco enviada en persona.`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
  return row;
}

/** Lo que ve el Interesado en la página pública: capa 0 y nombres de las dos empresas. Nunca el Veredicto ni capas 1–3. */
export async function ecoPageContext(db: Db, token: string) {
  const inv = await db.query.endorsements.findFirst({ where: eq(schema.endorsements.token, token) });
  if (!inv) return null;
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, inv.referralId) });
  if (!ref) return null;
  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, ref.opportunitySignalId) });
  const receiver = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.receiverCompanyId) });
  const originator = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.originatorCompanyId) });
  const state = ref.state as ReferralState;
  const closed = CLOSED.includes(state);
  const windowOpen = !inv.windowClosedAt && (!ref.closedAt || Date.now() - ref.closedAt.getTime() <= ECO_WINDOW_DAYS * D);
  return {
    invitation: inv,
    receiverName: receiver!.name,
    originatorName: originator!.name,
    needSummary: os?.envelope.chapter_layer.need_summary ?? "",
    phase: (closed ? "FINAL" : "DURANTE") as EcoPhase,
    canSubmit: AFTER_BRIDGE.includes(state) && windowOpen && (inv.status !== "RECEIVED" || inv.phase !== "FINAL" || windowOpen),
    closed,
  };
}

/** El Interesado deja su Eco. Público, sin usuario: el token es la llave. Recalcula el Aval y emite Mérito. */
export async function submitEco(db: Db, token: string, input: unknown) {
  const eco = EcoInput.parse(input);
  const ctx = await ecoPageContext(db, token);
  if (!ctx) throw new Error("Enlace no válido.");
  const inv = ctx.invitation;
  const ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, inv.referralId) }))!;
  const state = ref.state as ReferralState;
  if (!AFTER_BRIDGE.includes(state)) throw new Error("Todavía no hay Puente: el Eco se deja después de la presentación.");
  if (!ctx.canSubmit) throw new Error("La ventana para dejar el Eco de esta Cesión se ha cerrado.");
  const now = new Date();
  const phase = ctx.phase;
  const previous: EcoRecord | null = inv.status === "RECEIVED" && inv.attention && inv.result && inv.recommend && inv.phase
    ? { phase: inv.phase as EcoPhase, attention: inv.attention, result: inv.result, recommend: inv.recommend, comment: inv.comment ?? undefined, public_consent: inv.publicConsent, display_name: inv.displayName ?? undefined, submitted_at: (inv.submittedAt ?? inv.updatedAt).toISOString() }
    : null;

  // Contraste: un Eco en la primera hora tras el Puente, o con indicio de contraprestación, se marca para la Directiva.
  const tooFast = ref.introducedAt ? now.getTime() - ref.introducedAt.getTime() < 3_600_000 : false;
  const feeHint = eco.comment ? detectsReferralFee(eco.comment) : false;
  const contrastStatus = tooFast || feeHint ? "FLAGGED" : "OK";

  const [row] = await db
    .update(schema.endorsements)
    .set({
      status: "RECEIVED",
      phase,
      attention: eco.attention,
      result: eco.result,
      recommend: eco.recommend,
      comment: eco.comment?.trim() || null,
      publicConsent: eco.public_consent,
      displayName: eco.public_consent ? eco.display_name?.trim() || null : null,
      publicityWithdrawnAt: null,
      history: previous ? [...inv.history, previous] : inv.history,
      submittedAt: now,
      contrastStatus,
      updatedAt: now,
    })
    .where(eq(schema.endorsements.id, inv.id))
    .returning();

  // Mérito de Eco: la primera vez completo; en revisiones, solo la diferencia.
  const merit = computeEcoMerit(eco, { embassy: ref.embassy });
  const prevMerit = previous ? computeEcoMerit(previous, { embassy: ref.embassy }) : { receiver: 0, originator: 0 };
  const ev = (companyId: string, kind: string, weight: number) => db.insert(schema.trustEvents).values({ chapterId: ref.chapterId, companyId, kind, weight, evidenceRef: `endorsement:${row.id}` });
  if (!previous) await ev(ref.receiverCompanyId, "ECO_RECEIVED", 0);
  if (merit.receiver - prevMerit.receiver !== 0) await ev(ref.receiverCompanyId, "ECO_MERIT", merit.receiver - prevMerit.receiver);
  if (merit.originator - prevMerit.originator !== 0) await ev(ref.originatorCompanyId, "AVAL_MERIT", merit.originator - prevMerit.originator);

  const aval = await recomputeReferralAval(db, ref.id);
  const receiver = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.receiverCompanyId) });
  const originator = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.originatorCompanyId) });
  const score = Math.round(ecoScore(eco) * 100);
  await audit(db, { chapterId: ref.chapterId, kind: "ECO_RECEIVED", actor: { type: "USER", id: "interesado" }, subject: { type: "Endorsement", id: row.id }, policyApplied: contrastStatus === "FLAGGED" ? "contrast.flagged" : `protocol_iv.eco_${phase.toLowerCase()}`, result: `El Interesado dejó su Eco ${phase === "FINAL" ? "al cierre" : "durante la Cesión"} sobre ${receiver!.name}: Atención ${eco.attention}, Resultado ${eco.result}, Recomendación ${eco.recommend} (sobre 5). Aval de la Cesión: ${aval.total} (${aval.status.toLowerCase()}).`, significant: true, companyIds: [ref.originatorCompanyId, ref.receiverCompanyId] });
  if (eco.public_consent) {
    await audit(db, { chapterId: ref.chapterId, kind: "ECO_PUBLISHED", actor: { type: "USER", id: "interesado" }, subject: { type: "Endorsement", id: row.id }, policyApplied: "visibility.public_with_consent", result: `${row.displayName ?? "Un Interesado"} avala públicamente a ${receiver!.name} (${score} sobre 100) tras la presentación de ${originator!.name}${row.comment ? `: "${row.comment}"` : "."}`, significant: true });
  }
  return { endorsement: row, aval, merit, phase };
}

/** El Interesado retira la publicación de su Eco. Sigue contando en el Aval; deja de mostrarse con su nombre. */
export async function withdrawEcoPublicity(db: Db, token: string) {
  const inv = await db.query.endorsements.findFirst({ where: eq(schema.endorsements.token, token) });
  if (!inv) throw new Error("Enlace no válido.");
  const now = new Date();
  const [row] = await db.update(schema.endorsements).set({ publicConsent: false, displayName: null, publicityWithdrawnAt: now, updatedAt: now }).where(eq(schema.endorsements.id, inv.id)).returning();
  await audit(db, { chapterId: inv.chapterId, kind: "ECO_PUBLICITY_WITHDRAWN", actor: { type: "USER", id: "interesado" }, subject: { type: "Endorsement", id: row.id }, policyApplied: "gdpr.consent_withdrawn", result: "El Interesado retiró la publicación de su Eco. Sigue contando en el Aval; ya no se muestra con su nombre.", significant: false, companyIds: [] });
  return row;
}

/** Aval de una Cesión: recalculado y guardado en la Cesión para consultas y agregados. */
export async function recomputeReferralAval(db: Db, referralId: string): Promise<ReferralAval> {
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) });
  if (!ref) throw new Error("Cesión no encontrada");
  const verdict = await db.query.verdicts.findFirst({ where: eq(schema.verdicts.referralId, referralId) });
  const inv = await db.query.endorsements.findFirst({ where: eq(schema.endorsements.referralId, referralId) });
  const eco = inv?.status === "RECEIVED" && inv.attention && inv.result && inv.recommend ? { attention: inv.attention, result: inv.result, recommend: inv.recommend, phase: (inv.phase ?? "FINAL") as EcoPhase } : null;
  const aval = computeReferralAval({ promise: ref.promise, verdict: verdict?.verdict, eco, ecoWindowClosed: Boolean(inv?.windowClosedAt) });
  await db.update(schema.referrals).set({ aval: aval.total, avalStatus: aval.status }).where(eq(schema.referrals.id, referralId));
  return aval;
}

export async function ecoOfReferral(db: Db, referralId: string) {
  return db.query.endorsements.findFirst({ where: eq(schema.endorsements.referralId, referralId) });
}

export interface CompanyAvalView extends TitularAval {
  publicEcos: { id: string; displayName: string | null; comment: string | null; score: number; submittedAt: Date | null; referralId: string }[];
  breaches: number; // incumplimientos del Reglamento en la ventana del Ejercicio
  destacado: boolean; // Titular Destacado (D-043): Aval firme ≥ 85 y sin incumplimientos
  destacadoWhy: string; // explicación en lenguaje de negocio
}

/** Aval del titular: cuatro bloques con evidencia, más los Ecos que el Interesado autorizó publicar. */
export async function avalOfCompany(db: Db, chapterId: string, companyId: string, now = new Date()): Promise<CompanyAvalView> {
  const received = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.receiverCompanyId, companyId)) });
  const given = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.originatorCompanyId, companyId)) });
  const receivedIds = received.map((r) => r.id);
  const ecos = receivedIds.length ? await db.query.endorsements.findMany({ where: and(inArray(schema.endorsements.referralId, receivedIds), eq(schema.endorsements.status, "RECEIVED")), orderBy: [desc(schema.endorsements.submittedAt)] }) : [];
  const ecosReceived = ecos.filter((e) => e.attention && e.result && e.recommend).map((e) => ecoScore({ attention: e.attention!, result: e.result!, recommend: e.recommend! }));
  const givenAvals = given.filter((r) => r.aval !== null && r.avalStatus !== "PROVISIONAL").map((r) => r.aval as number);
  const events = await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, companyId), inArray(schema.trustEvents.kind, ["RESPONSE_ON_TIME", "RESPONSE_LATE", "ECO_REQUEST_SENT", "ECO_REQUEST_MISSED"])) });
  const count = (kind: string) => events.filter((e) => e.kind === kind).length;
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) });
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId) });
  const weeks = company ? Math.min(12, Math.floor((now.getTime() - company.createdAt.getTime()) / (7 * D))) : 0;
  const invalid = ["DISQUALIFIED", "BLOCKED", "REJECTED_BY_MEMBER", "WITHDRAWN_BY_ORIGINATOR", "EXPIRED", "DETECTED", "INVESTIGATING", "AGENT_MATCHED", "QUALIFIED", "COMPLIANCE_CHECK", "ORIGINATOR_PENDING", "RECEIVER_PENDING", "DIRECTOR_PENDING"];
  const recent = given.filter((r) => !invalid.includes(r.state) && now.getTime() - r.createdAt.getTime() <= 12 * 7 * D);
  const titular = computeTitularAval({
    ecosReceived,
    givenAvals,
    responses: { onTime: count("RESPONSE_ON_TIME"), late: count("RESPONSE_LATE"), ecoSent: count("ECO_REQUEST_SENT"), ecoMissed: count("ECO_REQUEST_MISSED") },
    contribution: { validGiven: recent.length, weeks, pace: chapter?.weeklyPace ?? 1, embassies: recent.filter((r) => r.embassy).length },
  });
  const publicEcos = ecos.filter((e) => e.publicConsent && e.attention && e.result && e.recommend).map((e) => ({ id: e.id, displayName: e.displayName, comment: e.comment, score: Math.round(ecoScore({ attention: e.attention!, result: e.result!, recommend: e.recommend! }) * 100), submittedAt: e.submittedAt, referralId: e.referralId }));
  const since = new Date(now.getTime() - DESTACADO.breachWindowDays * D);
  const breachRows = await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, companyId), inArray(schema.trustEvents.kind, [...BREACH_KINDS])) });
  const breaches = breachRows.filter((e) => e.createdAt >= since).length;
  const destacado = isDestacado({ total: titular.total, ecosCount: titular.ecosCount, givenCount: titular.givenCount, breaches });
  const missing = DESTACADO.minAval - titular.total;
  const destacadoWhy = destacado
    ? `Aval firme ${titular.total} (≥ ${DESTACADO.minAval}), ${titular.ecosCount} Ecos, ${titular.givenCount} Cesiones cedidas con Veredicto y ningún incumplimiento en ${DESTACADO.breachWindowDays} días.`
    : titular.ecosCount < DESTACADO.minEcos || titular.givenCount < DESTACADO.minGiven
      ? `Aval todavía provisional: hacen falta ${DESTACADO.minEcos} Ecos (tiene ${titular.ecosCount}) y ${DESTACADO.minGiven} Cesiones cedidas con Veredicto (tiene ${titular.givenCount}).`
      : missing > 0
        ? `Le falta${missing === 1 ? "" : "n"} ${missing} punto${missing === 1 ? "" : "s"} de Aval para los ${DESTACADO.minAval} exigidos.`
        : `${breaches} incumplimiento(s) del Reglamento en los últimos ${DESTACADO.breachWindowDays} días.`;
  return { ...titular, publicEcos, breaches, destacado, destacadoWhy };
}

/** Cesiones cerradas del cesionario que todavía no han dado la palabra al Interesado: esperan el toque del Timonel. */
export async function pendingEcoRequests(db: Db, chapterId: string, companyId: string) {
  const closed = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.receiverCompanyId, companyId), inArray(schema.referrals.state, CLOSED)) });
  if (closed.length === 0) return [];
  const invs = await db.query.endorsements.findMany({ where: inArray(schema.endorsements.referralId, closed.map((r) => r.id)) });
  const byRef = new Map(invs.map((i) => [i.referralId, i]));
  return closed.filter((r) => (byRef.get(r.id)?.status ?? "PENDING") === "PENDING");
}

export interface EcoClockResult {
  nudges: number;
  missed: number;
  followUps: number;
  windowsClosed: number;
}

/**
 * Reloj del Protocolo IV (se ejecuta dentro del Reloj de la Sala):
 *  - 3 días tras el cierre sin Petición → empujón al cesionario.
 *  - 14 días tras el cierre sin Petición → ECO_REQUEST_MISSED (incumplimiento del Protocolo IV).
 *  - 14 días tras la Petición sin Eco → el Agente pide al Timonel que recuerde al Interesado (nunca contacta él).
 *  - 30 días tras el cierre sin Eco → ventana cerrada; el Aval queda SIN_ECO.
 */
export async function runEcoClock(db: Db, now = new Date(), chapterId?: string): Promise<EcoClockResult> {
  const res: EcoClockResult = { nudges: 0, missed: 0, followUps: 0, windowsClosed: 0 };
  const scope = chapterId ? eq(schema.referrals.chapterId, chapterId) : undefined;
  const closed = await db.query.referrals.findMany({ where: and(scope, inArray(schema.referrals.state, CLOSED)) });
  for (const r of closed) {
    if (!r.closedAt) continue;
    const inv = await ensureEcoInvitation(db, r.id);
    const sinceClose = now.getTime() - r.closedAt.getTime();
    if (inv.status === "PENDING" && !inv.nudgeSentAt && sinceClose >= 3 * D) {
      await db.update(schema.endorsements).set({ nudgeSentAt: now, updatedAt: now }).where(eq(schema.endorsements.id, inv.id));
      await audit(db, { chapterId: r.chapterId, kind: "ECO_NUDGE", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "protocol_iv.nudge_3d", result: "Esta Cesión está cerrada y el Interesado todavía no tiene la palabra. Tu Agente ha redactado la Petición de Eco: envíala tú en un toque. Cuenta en tu Aval.", significant: true, companyIds: [r.receiverCompanyId] });
      res.nudges++;
    }
    if (inv.status === "PENDING" && !inv.missedFlaggedAt && sinceClose >= 14 * D) {
      await db.update(schema.endorsements).set({ missedFlaggedAt: now, updatedAt: now }).where(eq(schema.endorsements.id, inv.id));
      await db.insert(schema.trustEvents).values({ chapterId: r.chapterId, companyId: r.receiverCompanyId, kind: "ECO_REQUEST_MISSED", weight: -15, evidenceRef: `endorsement:${inv.id}` });
      await audit(db, { chapterId: r.chapterId, kind: "ECO_REQUEST_MISSED", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "protocol_iv.missed_14d", result: "Han pasado 14 días desde el cierre sin dar la palabra al Interesado. El Protocolo IV es obligatorio: cuenta en tu Aval y en tu Hoja de Méritos.", significant: true, companyIds: [r.receiverCompanyId] });
      res.missed++;
    }
    if (inv.status === "SENT" && inv.sentAt && !inv.followUpSentAt && now.getTime() - inv.sentAt.getTime() >= 14 * D) {
      await db.update(schema.endorsements).set({ followUpSentAt: now, updatedAt: now }).where(eq(schema.endorsements.id, inv.id));
      await audit(db, { chapterId: r.chapterId, kind: "ECO_FOLLOW_UP", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "protocol_iv.follow_up_14d", result: "El Interesado no ha dejado su Eco en dos semanas. Si lo ves oportuno, recuérdaselo tú: tu Agente no le escribirá.", significant: true, companyIds: [r.receiverCompanyId] });
      res.followUps++;
    }
    if ((inv.status !== "RECEIVED" || inv.phase === "DURANTE") && !inv.windowClosedAt && sinceClose >= ECO_WINDOW_DAYS * D) {
      await db.update(schema.endorsements).set({ windowClosedAt: now, updatedAt: now }).where(eq(schema.endorsements.id, inv.id));
      await recomputeReferralAval(db, r.id);
      res.windowsClosed++;
    }
  }
  return res;
}

/**
 * Página pública del Aval (D-042, matiz del fundador): lo que ve cualquiera fuera de la red.
 * Solo el nombre de la empresa, su especialidad y Sala, el Aval con sus bloques, y de cada Eco publicado con consentimiento
 * el nombre que el Interesado eligió, su valoración y su línea. Nunca datos de contacto: ni correo, ni teléfono, ni web,
 * ni el nombre del Timonel, ni identificadores internos.
 */
export interface PublicAvalPage {
  companyName: string;
  specialtyName: string | null;
  chapterName: string;
  zoneName: string;
  total: number;
  provisional: boolean;
  ecosCount: number;
  embassyEligible: boolean;
  destacado: boolean;
  blocks: { key: string; label: string; value: number; weight: number; evidence: string; hasData: boolean }[];
  ecos: { displayName: string; score: number; comment: string | null; submittedAt: Date | null }[];
}

export async function publicAvalPage(db: Db, slug: string): Promise<PublicAvalPage | null> {
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.slug, slug) });
  if (!company || company.status !== "ACTIVE") return null;
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, company.chapterId) });
  const zone = chapter ? await db.query.zones.findFirst({ where: eq(schema.zones.id, chapter.zoneId) }) : undefined;
  const seat = await db.query.categorySeats.findFirst({ where: eq(schema.categorySeats.companyId, company.id) });
  const specialty = seat ? await db.query.specialties.findFirst({ where: eq(schema.specialties.id, seat.specialtyId) }) : undefined;
  const aval = await avalOfCompany(db, company.chapterId, company.id);
  return {
    companyName: company.name,
    specialtyName: specialty?.name ?? null,
    chapterName: chapter?.name ?? "",
    zoneName: zone?.name ?? "",
    total: aval.total,
    provisional: aval.provisional,
    ecosCount: aval.ecosCount,
    embassyEligible: aval.embassyEligible,
    destacado: aval.destacado,
    blocks: aval.blocks.map((b) => ({ key: b.key, label: b.label, value: b.value, weight: b.weight, evidence: b.evidence, hasData: b.hasData })),
    ecos: aval.publicEcos.map((e) => ({ displayName: e.displayName ?? "Interesado", score: e.score, comment: e.comment, submittedAt: e.submittedAt })),
  };
}

/**
 * Pasada de Destacados (D-043): cada mañana, en la Ronda, se recalcula quién es Titular Destacado. Al alcanzarlo, la Crónica lo
 * anuncia a la Sala; al perderlo, solo lo sabe el titular. Idempotente: compara con destacado_since.
 */
export async function runDestacados(db: Db, chapterId: string, now = new Date()): Promise<{ gained: number; lost: number; total: number }> {
  const res = { gained: 0, lost: 0, total: 0 };
  const companies = await db.query.companies.findMany({ where: and(eq(schema.companies.chapterId, chapterId), eq(schema.companies.status, "ACTIVE")) });
  for (const c of companies) {
    const aval = await avalOfCompany(db, chapterId, c.id, now);
    if (aval.destacado) res.total++;
    if (aval.destacado && !c.destacadoSince) {
      await db.update(schema.companies).set({ destacadoSince: now }).where(eq(schema.companies.id, c.id));
      await audit(db, { chapterId, kind: "DESTACADO_GAINED", actor: { type: "AGENT", id: "ronda" }, subject: { type: "Company", id: c.id }, policyApplied: "reglamento.destacado_85", result: `${c.name} pasa a Titular Destacado: ${aval.destacadoWhy}`, significant: true });
      res.gained++;
    } else if (!aval.destacado && c.destacadoSince) {
      await db.update(schema.companies).set({ destacadoSince: null }).where(eq(schema.companies.id, c.id));
      await audit(db, { chapterId, kind: "DESTACADO_LOST", actor: { type: "AGENT", id: "ronda" }, subject: { type: "Company", id: c.id }, policyApplied: "reglamento.destacado_85", result: `Tu empresa deja de ser Titular Destacado. ${aval.destacadoWhy} Tu Agente te propondrá Movimientos para recuperarlo.`, significant: true, companyIds: [c.id] });
      res.lost++;
    }
  }
  return res;
}
