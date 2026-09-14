/**
 * Prueba de Valor (D-050): siete días de Agente para un candidato, antes de la plaza.
 * El candidato recibe una empresa en estado TRIAL (sin plaza, sin voto, sin acceso): su Agente rastrea para los demás
 * en la Ronda como cualquier otro. Nunca recibe Cesiones (la Mesa solo consulta titulares activos).
 * El informe muestra lo que habría cedido y, en agregado y sin identidad, lo que la Sala ya encontró para su especialidad.
 */
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { SOURCE_LABEL } from "@/agents/rastreo";
import { VALUE_TRIAL_DAYS, type CededItem, type ValueTrialReport } from "@/core/prueba";
import type { SignalEnvelope } from "@/core/types";

export class PruebaError extends Error {}

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function startValueTrial(db: Db, input: { chapterId: string; candidacyId: string; memberId: string; websiteText?: string }) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || !member.isDirector || member.chapterId !== input.chapterId) throw new PruebaError("Solo un Director/a de la Sala inicia una Prueba de Valor.");
  const c = await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.id, input.candidacyId) });
  if (!c) throw new PruebaError("Candidatura no encontrada.");
  if (!c.specialtyCode) throw new PruebaError("Clasifica primero la especialidad de la candidatura.");
  if (["DECLINED", "ACTIVATED"].includes(c.status)) throw new PruebaError("Esta candidatura ya está cerrada.");
  const existing = await db.query.valueTrials.findFirst({ where: eq(schema.valueTrials.candidacyId, c.id) });
  if (existing) throw new PruebaError("Esta candidatura ya tiene una Prueba de Valor.");
  const specialty = await db.query.specialties.findFirst({ where: eq(schema.specialties.nscatCode, c.specialtyCode) });
  if (!specialty) throw new PruebaError("Especialidad desconocida.");

  const [company] = await db.insert(schema.companies).values({ chapterId: input.chapterId, name: c.companyName, slug: `prueba-${slugify(c.companyName)}-${randomBytes(2).toString("hex")}`, city: c.city, status: "TRIAL" }).returning();
  const description = [c.message ?? "", input.websiteText ? input.websiteText.slice(0, 1200) : ""].filter(Boolean).join(" ") || `${c.companyName}, ${specialty.name}.`;
  await db.insert(schema.businessDna).values({
    companyId: company.id,
    dna: {
      company: { description, locations: [c.city], certifications: [], credibility: [] },
      offering: { services: [specialty.name], products: [], differentiators: [], exclusions: [], capacity: "OPEN" },
      ideal_customer: { industries: [], company_size: [], geography: [c.city], roles: [], triggers: [], problems: [], exclusions: [] },
      commercial: { strategic_priority: 2, urgency: "90D" },
      referrals: { perfect_referral: "", acceptable_referral: "", poor_referral: "", disqualifiers: [], introduction_preferences: "" },
      knowledge: { public: [], chapter_only: [], match_only: [], management_only: [], never_share: [] },
      permissions: { auto_publish_chapter_signals: false, external_contact: false, human_approval_required: true },
      objectives: { monthly: "", quarterly: "", strategic: "" },
    },
  });
  await db.insert(schema.agents).values({ chapterId: input.chapterId, companyId: company.id, kind: "COMPANY", status: "TRIAL" });
  const token = randomBytes(16).toString("hex");
  const endsAt = new Date(Date.now() + VALUE_TRIAL_DAYS * 86_400_000);
  const [trial] = await db.insert(schema.valueTrials).values({ chapterId: input.chapterId, candidacyId: c.id, companyId: company.id, specialtyCode: c.specialtyCode, token, endsAt, startedBy: member.id }).returning();
  await audit(db, { chapterId: input.chapterId, kind: "VALUE_TRIAL_STARTED", actor: { type: "USER", id: member.id }, subject: { type: "Company", id: company.id }, policyApplied: "trial.seven_days", result: `Prueba de Valor iniciada para ${c.companyName} (${specialty.name}): durante ${VALUE_TRIAL_DAYS} días su Agente rastrea para los titulares de la Sala. No recibe Cesiones ni tiene plaza.`, significant: true });
  return trial;
}

function countBy<T>(xs: T[], key: (x: T) => string | undefined): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const x of xs) {
    const k = key(x);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export async function generateValueTrialReport(db: Db, trialId: string, now = new Date()): Promise<ValueTrialReport> {
  const trial = await db.query.valueTrials.findFirst({ where: eq(schema.valueTrials.id, trialId) });
  if (!trial) throw new PruebaError("Prueba no encontrada.");
  const chapter = (await db.query.chapters.findFirst({ where: eq(schema.chapters.id, trial.chapterId) }))!;
  const company = (await db.query.companies.findFirst({ where: eq(schema.companies.id, trial.companyId) }))!;
  const specialty = (await db.query.specialties.findFirst({ where: eq(schema.specialties.nscatCode, trial.specialtyCode) }))!;
  const specialties = await db.query.specialties.findMany({ columns: { id: true, nscatCode: true, name: true } });
  const nameOfCode = new Map(specialties.map((s) => [s.nscatCode, s.name]));
  const seats = await db.query.categorySeats.findMany({ where: and(eq(schema.categorySeats.chapterId, trial.chapterId), eq(schema.categorySeats.status, "ACTIVE")) });
  const holders = await db.query.companies.findMany({ where: and(eq(schema.companies.chapterId, trial.chapterId), eq(schema.companies.status, "ACTIVE")) });
  const holderBySpecialtyId = new Map<string, string[]>();
  for (const s of seats) {
    const h = holders.find((c) => c.id === s.companyId);
    if (h) holderBySpecialtyId.set(s.specialtyId, [...(holderBySpecialtyId.get(s.specialtyId) ?? []), h.name]);
  }
  const idOfCode = new Map(specialties.map((s) => [s.nscatCode, s.id]));

  // Cara 1 · lo que su Agente habría cedido (borradores propios, necesidades para otros titulares)
  const drafts = await db.query.opportunitySignals.findMany({ where: and(eq(schema.opportunitySignals.originatorCompanyId, company.id), gte(schema.opportunitySignals.createdAt, trial.startedAt)), orderBy: [desc(schema.opportunitySignals.createdAt)] });
  const records = drafts.length ? await db.query.publicRecords.findMany({ where: inArray(schema.publicRecords.opportunitySignalId, drafts.map((d) => d.id)) }) : [];
  const needsAll = drafts.length ? await db.query.needs.findMany({ where: inArray(schema.needs.opportunitySignalId, drafts.map((d) => d.id)) }) : [];
  const items: CededItem[] = [];
  const receiverSet = new Set<string>();
  for (const d of drafts) {
    const rec = records.find((r) => r.opportunitySignalId === d.id);
    const needs = needsAll.filter((n) => n.opportunitySignalId === d.id && n.status !== "LATENT").map((n) => {
      const codes = n.specialtyHints.filter((code) => code !== trial.specialtyCode); // D-049: nunca para sí
      const receivers = [...new Set(codes.flatMap((code) => holderBySpecialtyId.get(idOfCode.get(code) ?? "") ?? []))];
      receivers.forEach((r) => receiverSet.add(r));
      return { description: n.description, specialties: codes.map((code) => nameOfCode.get(code) ?? code), receivers };
    }).filter((n) => n.specialties.length > 0);
    if (needs.length === 0) continue;
    items.push({ title: rec?.title ?? "Indicio", source: rec ? SOURCE_LABEL[rec.source as keyof typeof SOURCE_LABEL] ?? rec.source : "Apunte", publishedAt: (rec?.publishedAt ?? d.createdAt).toISOString().slice(0, 10), needs });
  }

  // Cara 2 · lo que la Sala ya encontró para su especialidad (agregado, sin identidad)
  const published = await db.query.opportunitySignals.findMany({ where: and(eq(schema.opportunitySignals.chapterId, trial.chapterId), eq(schema.opportunitySignals.status, "PUBLISHED"), gte(schema.opportunitySignals.createdAt, new Date(trial.startedAt.getTime() - 30 * 86_400_000))) });
  const others = published.filter((p) => p.originatorCompanyId !== company.id);
  const theirNeeds = others.length ? await db.query.needs.findMany({ where: inArray(schema.needs.opportunitySignalId, others.map((p) => p.id)) }) : [];
  const mine = theirNeeds.filter((n) => n.specialtyHints.includes(trial.specialtyCode) && n.status !== "LATENT");
  const signalsOfMine = others.filter((p) => mine.some((n) => n.opportunitySignalId === p.id));
  const env = (p: (typeof others)[number]) => p.envelope as SignalEnvelope;
  const forYou = {
    count: mine.length,
    fromAgents: new Set(signalsOfMine.map((p) => p.originatorCompanyId)).size,
    uncovered: mine.filter((n) => n.status === "UNCOVERED").length,
    industries: countBy(signalsOfMine, (p) => env(p).chapter_layer.industry),
    valueBands: countBy(signalsOfMine, (p) => env(p).chapter_layer.value_band).map((x) => ({ band: x.name, count: x.count })),
    timings: countBy(signalsOfMine, (p) => env(p).chapter_layer.timing).map((x) => ({ timing: x.name, count: x.count })),
  };

  const days = Math.max(1, Math.min(VALUE_TRIAL_DAYS, Math.ceil((now.getTime() - trial.startedAt.getTime()) / 86_400_000)));
  const summary = `En ${days} día(s), el Agente de ${company.name} habría cedido ${items.length} Indicio(s) a ${receiverSet.size} titular(es) de ${chapter.name}. Los Agentes de la Sala detectaron ${forYou.count} necesidad(es) de ${specialty.name}${forYou.uncovered ? `, ${forYou.uncovered} sin titular que las atendiera` : ""}. Nadie en NS busca para sí: lo que recibirías lo buscan los demás para ti.`;
  const report: ValueTrialReport = { generatedAt: now.toISOString(), days, candidate: { companyName: company.name, specialtyName: specialty.name, chapterName: chapter.name }, ceded: { count: items.length, receivers: receiverSet.size, items }, forYou, summary };
  await db.update(schema.valueTrials).set({ report, reportGeneratedAt: now }).where(eq(schema.valueTrials.id, trial.id));
  await audit(db, { chapterId: trial.chapterId, kind: "VALUE_TRIAL_REPORT", actor: { type: "SYSTEM", id: "prueba" }, subject: { type: "Company", id: company.id }, policyApplied: "trial.report", result: summary, significant: false });
  return report;
}

export async function getTrialByToken(db: Db, token: string) {
  return db.query.valueTrials.findFirst({ where: eq(schema.valueTrials.token, token) });
}

export async function listTrials(db: Db, chapterId: string, now = new Date()) {
  const trials = await db.query.valueTrials.findMany({ where: eq(schema.valueTrials.chapterId, chapterId) });
  const out = new Map<string, (typeof trials)[number] & { drafts: number; day: number }>();
  for (const t of trials) {
    const drafts = await db.query.opportunitySignals.findMany({ where: and(eq(schema.opportunitySignals.originatorCompanyId, t.companyId), gte(schema.opportunitySignals.createdAt, t.startedAt)), columns: { id: true } });
    const day = Math.min(VALUE_TRIAL_DAYS, Math.max(1, Math.ceil((now.getTime() - t.startedAt.getTime()) / 86_400_000)));
    out.set(t.candidacyId, { ...t, drafts: drafts.length, day });
  }
  return out;
}

