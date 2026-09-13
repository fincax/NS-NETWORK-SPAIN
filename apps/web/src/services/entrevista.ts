/**
 * Entrevista del Agente para el ADN de Empresa (D-040, CLAUDE.md §25).
 * El Agente pregunta; el Timonel responde; el ADN se construye a la vista y solo se activa cuando el Timonel lo valida.
 * Con clave de Anthropic conduce Claude; sin ella, el guion determinista. El sistema mantiene el estado; el modelo razona.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { getProvider } from "@/agents/provider";
import type { InterviewInput, InterviewTurn } from "@/agents/provider";
import { fetchWebsiteText } from "@/lib/website";
import type { FetchText } from "@/agents/feeds";
import { updateDna } from "@/services/onboarding";
import type { BusinessDNA } from "@/core/types";

export const TRIGGER_LABEL: Record<string, string> = {
  NEW_SITE: "nueva sede o planta",
  HEADCOUNT_GROWTH: "crecimiento de plantilla",
  INTERNATIONAL_EXPANSION: "expansión internacional",
  FUNDING_ROUND: "ronda o ampliación de capital",
  COMPANY_SALE: "venta o sucesión de la empresa",
  NEW_PRODUCT: "nuevo producto o línea",
  REGULATORY_CHANGE: "cambio normativo",
  SUPPLIER_CHANGE: "cambio de proveedor",
  DIGITALIZATION: "digitalización o incidente",
  FLEET_RENEWAL: "renovación de flota",
  LEADERSHIP_CHANGE: "cambio de dirección",
  OTHER: "otra señal",
};

export class InterviewError extends Error {}

export type Interview = typeof schema.dnaInterviews.$inferSelect;

export async function activeInterview(db: Db, companyId: string): Promise<Interview | undefined> {
  return db.query.dnaInterviews.findFirst({ where: and(eq(schema.dnaInterviews.companyId, companyId), inArray(schema.dnaInterviews.status, ["OPEN", "READY"])), orderBy: [desc(schema.dnaInterviews.createdAt)] });
}

async function context(db: Db, companyId: string, memberId: string) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!member || member.companyId !== companyId) throw new InterviewError("Solo el Timonel de la empresa habla con su Agente.");
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) });
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
  if (!company || !dnaRow) throw new InterviewError("Empresa sin ADN.");
  const seat = await db.select({ name: schema.specialties.name }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.categorySeats.companyId, companyId));
  return { member, company, dnaRow, specialtyName: seat[0]?.name ?? "sin plaza" };
}

function inputFor(ctx: Awaited<ReturnType<typeof context>>, dna: BusinessDNA, transcript: InterviewTurn[], websiteText: string | null): InterviewInput {
  return { companyName: ctx.company.name, specialtyName: ctx.specialtyName, timonelName: ctx.member.fullName, websiteText: websiteText ?? undefined, dna, transcript, availableTriggers: Object.entries(TRIGGER_LABEL).map(([code, label]) => ({ code, label })) };
}

/** Abre la entrevista: lee la web si la hay y el Agente hace la primera pregunta. Si ya hay una abierta, la devuelve. */
export async function startInterview(db: Db, opts: { companyId: string; memberId: string; reader?: FetchText; restart?: boolean }): Promise<Interview> {
  const ctx = await context(db, opts.companyId, opts.memberId);
  const existing = await activeInterview(db, opts.companyId);
  if (existing && !opts.restart) return existing;
  if (existing) await db.update(schema.dnaInterviews).set({ status: "ABANDONED", updatedAt: new Date() }).where(eq(schema.dnaInterviews.id, existing.id));

  const websiteText = await fetchWebsiteText(ctx.company.website, opts.reader);
  const provider = await getProvider();
  const step = await provider.interview(inputFor(ctx, ctx.dnaRow.dna, [], websiteText));
  const transcript: Interview["transcript"] = [{ role: "agent", text: step.message, topic: step.topic, learned: step.learned }];
  const [row] = await db.insert(schema.dnaInterviews).values({ chapterId: ctx.company.chapterId, companyId: ctx.company.id, memberId: ctx.member.id, status: step.topic === "DONE" ? "READY" : "OPEN", topic: step.topic, progress: Math.round(step.progress * 100), transcript, draftDna: step.dna, websiteText, provider: provider.name }).returning();
  await audit(db, { chapterId: ctx.company.chapterId, kind: "DNA_INTERVIEW_STARTED", actor: { type: "AGENT", id: "interview" }, subject: { type: "DnaInterview", id: row.id }, result: `El Agente de ${ctx.company.name} empieza la entrevista del ADN con ${ctx.member.fullName}${websiteText ? " tras leer su web" : ""}.`, significant: false, companyIds: [ctx.company.id] });
  return row;
}

/** El Timonel responde; el Agente actualiza el ADN y pregunta lo siguiente (o cierra). */
export async function answerInterview(db: Db, opts: { interviewId: string; memberId: string; text: string }): Promise<Interview> {
  const row = await db.query.dnaInterviews.findFirst({ where: eq(schema.dnaInterviews.id, opts.interviewId) });
  if (!row) throw new InterviewError("Entrevista no encontrada.");
  if (row.status !== "OPEN") throw new InterviewError("Esta entrevista ya ha terminado. Valida el ADN o empieza otra.");
  const ctx = await context(db, row.companyId, opts.memberId);
  const text = opts.text.trim().slice(0, 2000);
  if (!text) throw new InterviewError("Escribe una respuesta, aunque sea corta. Si no lo sabes, di “paso”.");
  const transcript: Interview["transcript"] = [...row.transcript, { role: "timonel", text }];
  const provider = await getProvider();
  const step = await provider.interview(inputFor(ctx, row.draftDna, transcript as InterviewTurn[], row.websiteText));
  transcript.push({ role: "agent", text: step.message, topic: step.topic, learned: step.learned });
  const [updated] = await db.update(schema.dnaInterviews).set({ transcript, draftDna: step.dna, topic: step.topic, progress: Math.round(step.progress * 100), status: step.topic === "DONE" ? "READY" : "OPEN", updatedAt: new Date() }).where(eq(schema.dnaInterviews.id, row.id)).returning();
  return updated;
}

/** El Timonel valida: el ADN pasa a ser el de la empresa (nueva versión, validado) y el Agente trabaja con él. */
export async function finishInterview(db: Db, opts: { interviewId: string; memberId: string }) {
  const row = await db.query.dnaInterviews.findFirst({ where: eq(schema.dnaInterviews.id, opts.interviewId) });
  if (!row) throw new InterviewError("Entrevista no encontrada.");
  if (row.status === "DONE") return row;
  const ctx = await context(db, row.companyId, opts.memberId);
  await updateDna(db, row.companyId, row.draftDna, ctx.member.id);
  const [done] = await db.update(schema.dnaInterviews).set({ status: "DONE", updatedAt: new Date() }).where(eq(schema.dnaInterviews.id, row.id)).returning();
  const answered = row.transcript.filter((t) => t.role === "timonel").length;
  await audit(db, { chapterId: ctx.company.chapterId, kind: "DNA_VALIDATED", actor: { type: "USER", id: ctx.member.id }, subject: { type: "BusinessDNA", id: row.companyId }, policyApplied: "dna.human_validation", result: `${ctx.member.fullName} validó el ADN de ${ctx.company.name} tras la entrevista con su Agente (${answered} respuestas). El Agente trabaja ya con él en la Mesa.`, significant: true, companyIds: [ctx.company.id] });
  return done;
}

export async function abandonInterview(db: Db, opts: { interviewId: string; memberId: string }) {
  const row = await db.query.dnaInterviews.findFirst({ where: eq(schema.dnaInterviews.id, opts.interviewId) });
  if (!row) return;
  await context(db, row.companyId, opts.memberId);
  await db.update(schema.dnaInterviews).set({ status: "ABANDONED", updatedAt: new Date() }).where(eq(schema.dnaInterviews.id, row.id));
}

/** Qué le falta al ADN para ser útil en la Mesa: guía para el Dossier y Hoy. */
export function dnaGaps(dna: BusinessDNA): string[] {
  const gaps: string[] = [];
  if (!dna.company.description || dna.company.description.length < 20) gaps.push("qué hace la empresa");
  if (dna.offering.services.length === 0) gaps.push("servicios");
  if (dna.ideal_customer.industries.length === 0 && dna.ideal_customer.problems.length === 0) gaps.push("cliente ideal");
  if (dna.ideal_customer.triggers.length === 0) gaps.push("señales que anticipan una oportunidad");
  if (!dna.commercial.ticket_min) gaps.push("ticket mínimo");
  if (!dna.referrals.perfect_referral) gaps.push("el referido perfecto");
  return gaps;
}
