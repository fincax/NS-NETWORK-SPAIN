/**
 * Mi Agente (D-075). Una sola página para que el Timonel entienda a su Agente sin leer la Mesa, y una sola caja para
 * decirle algo: "Dile a tu Agente".
 *
 *  - La vista compone lo que ya existe: ADN y huecos (entrevista), Encargos (lo que los demás buscan para ti), carga de la
 *    Mesa y última Ronda (qué hace ahora), fuentes propias (qué lee), permisos y lo que nunca comparte (qué puede y qué no),
 *    Movimientos de la Brújula (qué te propone). Nada nuevo se calcula aquí; solo se reúne.
 *  - "Dile a tu Agente" no es un chat. El Timonel escribe o dicta; el Agente devuelve UNA propuesta tipada (Encargo, cambio
 *    de ADN o Apunte) que se guarda como PROPOSED y no cambia nada hasta que el Timonel confirma con un toque. Al confirmar,
 *    cada parte pasa por el mismo servicio que usa la interfaz hoy: createDemand, updateDna (versión nueva validada por el
 *    Timonel) y createApunte (borrador). Ningún atajo.
 */
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { getProvider } from "@/agents/provider";
import { detectsReferralFee } from "@/core/compliance";
import { applyDnaPatch, describePatch, patchIsEmpty, type IntentProposal } from "@/core/intencion";
import { createDemand, openDemands } from "@/services/demands";
import { updateDna } from "@/services/onboarding";
import { createApunte } from "@/services/apunte";
import { activeInterview, dnaGaps, TRIGGER_LABEL } from "@/services/entrevista";
import { listSources } from "@/services/sources";
import { mesaLoad } from "@/services/jobs";
import { brujula, type Movimiento } from "@/services/brujula";

export class IntentError extends Error {}

export type AgentIntent = typeof schema.agentIntents.$inferSelect;

export const MAX_INTENT_LENGTH = 1200;

/** El Timonel dice algo; el Agente lo traduce y lo deja como propuesta. Nada cambia. */
export async function proposeIntent(db: Db, input: { companyId: string; memberId: string; text: string }): Promise<AgentIntent> {
  const text = input.text.replace(/\s+/g, " ").trim().slice(0, MAX_INTENT_LENGTH);
  if (text.length < 4) throw new IntentError("Dile algo a tu Agente, aunque sea en cuatro palabras.");
  if (detectsReferralFee(text)) throw new IntentError("Mencionas una contraprestación. Un referido nunca se cobra (regla inmutable D-010); tu Agente no puede trabajar con eso.");
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || member.companyId !== input.companyId) throw new IntentError("Solo el Timonel de la empresa habla con su Agente.");
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId) });
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, input.companyId) });
  if (!company || !dnaRow) throw new IntentError("Empresa sin ADN.");
  const provider = await getProvider();
  const proposal = await provider.interpretIntent({ text, companyName: company.name, dna: dnaRow.dna, triggerLabels: TRIGGER_LABEL });
  const [row] = await db.insert(schema.agentIntents).values({ chapterId: company.chapterId, companyId: company.id, memberId: member.id, text, proposal, provider: provider.name }).returning();
  await audit(db, { chapterId: company.chapterId, kind: "INTENT_PROPOSED", actor: { type: "AGENT", id: "intent" }, subject: { type: "AgentIntent", id: row.id }, policyApplied: `intent.${proposal.kind.toLowerCase()}`, result: `El Agente de ${company.name} propone ${proposal.kind === "INSUFICIENTE" ? "preguntar" : `un ${proposal.kind === "ADN" ? "cambio de ADN" : proposal.kind === "ENCARGO" ? "Encargo" : "Apunte"}`} a partir de lo que dijo ${member.fullName}. Nada cambia hasta su toque.`, significant: false, companyIds: [company.id] });
  return row;
}

export interface IntentOutcome {
  demandId?: string;
  dnaVersion?: number;
  opportunitySignalId?: string;
}

/** El Timonel confirma con un toque: cada parte de la propuesta pasa por el servicio que ya existe para ese objeto. */
export async function confirmIntent(db: Db, input: { intentId: string; memberId: string }): Promise<{ intent: AgentIntent; outcome: IntentOutcome }> {
  const row = await db.query.agentIntents.findFirst({ where: eq(schema.agentIntents.id, input.intentId) });
  if (!row) throw new IntentError("Propuesta no encontrada.");
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || member.companyId !== row.companyId) throw new IntentError("Solo el Timonel de la empresa confirma las propuestas de su Agente.");
  if (row.status !== "PROPOSED") throw new IntentError("Esta propuesta ya se resolvió.");
  const p = row.proposal;
  if (p.kind === "INSUFICIENTE") throw new IntentError("Tu Agente todavía no tiene una propuesta: responde a su pregunta en la caja.");
  const outcome: IntentOutcome = {};
  const done: string[] = [];

  if (p.encargo) {
    const d = await createDemand(db, { companyId: row.companyId, memberId: member.id, text: p.encargo.text, trigger: p.encargo.trigger, industry: p.encargo.industry, valueBand: p.encargo.value_band });
    outcome.demandId = d.id;
    done.push("Encargo publicado en la Sala");
  }
  if (p.dna_patch && !patchIsEmpty(p.dna_patch)) {
    const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, row.companyId) });
    if (!dnaRow) throw new IntentError("Empresa sin ADN.");
    const next = applyDnaPatch(dnaRow.dna, p.dna_patch);
    await updateDna(db, row.companyId, next, member.id); // versión nueva, validada por el Timonel: nunca en silencio
    outcome.dnaVersion = dnaRow.version + 1;
    done.push(`ADN en versión ${dnaRow.version + 1}`);
  }
  if (p.apunte) {
    const a = await createApunte(db, { companyId: row.companyId, memberId: member.id, who: p.apunte.who, need: p.apunte.need, relation: p.apunte.relation, expectsContact: p.apunte.expects_contact });
    outcome.opportunitySignalId = a.opportunitySignal.id;
    done.push("Apunte en borrador");
  }
  if (done.length === 0) throw new IntentError("La propuesta no contiene nada que aplicar.");

  const [updated] = await db.update(schema.agentIntents).set({ status: "CONFIRMED", result: outcome, resolvedAt: new Date() }).where(eq(schema.agentIntents.id, row.id)).returning();
  await audit(db, { chapterId: row.chapterId, kind: "INTENT_CONFIRMED", actor: { type: "USER", id: member.id }, subject: { type: "AgentIntent", id: row.id }, policyApplied: "intent.human_confirmation", result: `${member.fullName} confirmó la propuesta de su Agente: ${done.join(", ")}.`, significant: false, companyIds: [row.companyId] });
  return { intent: updated, outcome };
}

export async function dismissIntent(db: Db, input: { intentId: string; memberId: string }): Promise<void> {
  const row = await db.query.agentIntents.findFirst({ where: eq(schema.agentIntents.id, input.intentId) });
  if (!row) return;
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || member.companyId !== row.companyId) throw new IntentError("Solo el Timonel de la empresa descarta las propuestas de su Agente.");
  if (row.status !== "PROPOSED") return;
  await db.update(schema.agentIntents).set({ status: "DISMISSED", resolvedAt: new Date() }).where(eq(schema.agentIntents.id, row.id));
  await audit(db, { chapterId: row.chapterId, kind: "INTENT_DISMISSED", actor: { type: "USER", id: member.id }, subject: { type: "AgentIntent", id: row.id }, policyApplied: "intent.dismiss", result: `${member.fullName} descartó la propuesta de su Agente (${row.proposal.kind}).`, significant: false, companyIds: [row.companyId] });
}

export async function pendingIntent(db: Db, companyId: string, intentId?: string): Promise<AgentIntent | undefined> {
  if (intentId) {
    const row = await db.query.agentIntents.findFirst({ where: eq(schema.agentIntents.id, intentId) });
    return row && row.companyId === companyId ? row : undefined;
  }
  return db.query.agentIntents.findFirst({ where: and(eq(schema.agentIntents.companyId, companyId), eq(schema.agentIntents.status, "PROPOSED")), orderBy: [desc(schema.agentIntents.createdAt)] });
}

export async function recentIntents(db: Db, companyId: string, limit = 5): Promise<AgentIntent[]> {
  return db.query.agentIntents.findMany({ where: and(eq(schema.agentIntents.companyId, companyId), eq(schema.agentIntents.status, "CONFIRMED")), orderBy: [desc(schema.agentIntents.createdAt)], limit });
}

/** Frases de la tarjeta de confirmación: qué entendió y qué hará, en lenguaje del Timonel. */
export function proposalLines(p: IntentProposal): { understood: string[]; willDo: string[] } {
  const willDo: string[] = [];
  if (p.encargo) willDo.push(`Publicar el Encargo «${p.encargo.text}»${p.encargo.trigger ? ` · señal: ${TRIGGER_LABEL[p.encargo.trigger] ?? p.encargo.trigger}` : ""}${p.encargo.industry ? ` · sector: ${p.encargo.industry}` : ""}. Los Agentes de la Sala lo usarán para priorizar lo que te ceden; caduca a los 90 días.`);
  if (p.dna_patch && !patchIsEmpty(p.dna_patch)) willDo.push(`Guardar una versión nueva de tu ADN, validada por ti: ${describePatch(p.dna_patch, (t) => TRIGGER_LABEL[t] ?? t).join(" ")}`);
  if (p.apunte) willDo.push(`Guardar el Apunte «${p.apunte.who}: ${p.apunte.need}» en borrador. Lo verás en Hoy para publicarlo en la Sala.`);
  return { understood: p.understood, willDo };
}

// ───────────────────────── La vista ─────────────────────────

export interface AgenteView {
  sabe: { validated: boolean; version: number; gaps: string[]; interviewProgress: number | null; description: string; services: string[]; industries: string[]; ticketMin?: number; ticketMax?: number; perfectReferral: string; triggers: string[] };
  buscanParaTi: { id: string; text: string; trigger: string | null; industry: string | null; activeUntil: Date | null }[];
  hace: { mesaMine: number; mesaTotal: number; needsHuman: number; drafts: number; lastRonda: { at: Date; result: string } | null; sources: { label: string; lastStatus: string | null; lastFetchedAt: Date | null }[] };
  puede: { autoPublish: boolean; externalContact: boolean; humanApproval: boolean; neverShare: string[]; chapterOnly: string[] };
  propone: Movimiento[];
  reciente: AgentIntent[];
}

export async function agenteView(db: Db, ctx: { chapterId: string; companyId: string }): Promise<AgenteView> {
  const { chapterId, companyId } = ctx;
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
  if (!dnaRow) throw new IntentError("Empresa sin ADN.");
  const dna = dnaRow.dna;
  const interview = await activeInterview(db, companyId);
  const demands = await openDemands(db, chapterId, companyId);
  const load = await mesaLoad(db, chapterId, companyId);
  const drafts = await db.query.opportunitySignals.findMany({ where: and(eq(schema.opportunitySignals.originatorCompanyId, companyId), eq(schema.opportunitySignals.status, "DRAFT")), columns: { id: true } });
  const ronda = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.kind, "RONDA")), orderBy: [desc(schema.auditEvents.occurredAt)] });
  const sources = await listSources(db, companyId);
  const compass = await brujula(db, { chapterId, companyId });
  const reciente = await recentIntents(db, companyId);
  return {
    sabe: { validated: Boolean(dnaRow.validatedAt), version: dnaRow.version, gaps: dnaGaps(dna), interviewProgress: interview ? interview.progress : null, description: dna.company.description, services: dna.offering.services, industries: dna.ideal_customer.industries, ticketMin: dna.commercial.ticket_min, ticketMax: dna.commercial.ticket_max, perfectReferral: dna.referrals.perfect_referral, triggers: dna.ideal_customer.triggers.map((t) => TRIGGER_LABEL[t] ?? t) },
    buscanParaTi: demands.map((d) => ({ id: d.id, text: d.text, trigger: d.trigger, industry: d.industry, activeUntil: d.activeUntil })),
    hace: { mesaMine: load.mine, mesaTotal: load.total, needsHuman: load.needsHuman, drafts: drafts.length, lastRonda: ronda ? { at: ronda.occurredAt, result: ronda.result } : null, sources: sources.map((s) => ({ label: s.label, lastStatus: s.lastStatus, lastFetchedAt: s.lastFetchedAt })) },
    puede: { autoPublish: dna.permissions.auto_publish_chapter_signals, externalContact: dna.permissions.external_contact, humanApproval: dna.permissions.human_approval_required, neverShare: dna.knowledge.never_share, chapterOnly: dna.knowledge.chapter_only },
    propone: compass.movimientos,
    reciente,
  };
}
