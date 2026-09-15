/** Indicio: S0 (Business Signal) → S1 extracción → S2 clasificación → S3 previsualización y publicación. */
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { getProvider } from "@/agents/provider";
import { enqueueMesa } from "@/services/jobs";
import { runMesa, type MesaResult } from "@/agents/mesa";
import type { PermissionVerb, SignalEnvelope, Visibility } from "@/core/types";

export interface CreateSignalInput {
  companyId: string;
  memberId?: string;
  rawContent: string;
  visibility?: Visibility; // CHAPTER por defecto; COMPANY_ONLY para Scenario D
  source?: "MEMBER_INPUT" | "APUNTE" | "AGENT_CHECKIN" | "WEBSITE" | "INTEGRATION" | "PUBLIC_RECORD";
  legalBasisForContact?: "CONSENT" | "LEGITIMATE_INTEREST" | "CONTRACT" | "NONE";
  contactName?: string;
  contactRole?: string;
  thirdPartyExpectsContact?: boolean; // D-029
}

const PERSON_IN_TEXT = /\b(don|doña|sr\.|sra\.)\s+[A-ZÁÉÍÓÚ]/;

export async function createSignal(db: Db, input: CreateSignalInput) {
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId) });
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, input.companyId) });
  const agent = await db.query.agents.findFirst({ where: eq(schema.agents.companyId, input.companyId) });
  if (!company || !dnaRow || !agent) throw new Error("Empresa sin ADN o sin Agente");
  const visibility: Visibility = input.visibility ?? "CHAPTER";
  const permissions: PermissionVerb[] = visibility === "COMPANY_ONLY" ? ["READ", "INFER", "STORE"] : ["READ", "INFER", "STORE", "SHARE", ...(input.legalBasisForContact && input.legalBasisForContact !== "NONE" ? (["REVEAL_IDENTITY"] as PermissionVerb[]) : [])];

  // S0
  const [bs] = await db.insert(schema.businessSignals).values({ chapterId: company.chapterId, companyId: company.id, source: input.source ?? "MEMBER_INPUT", rawContent: input.rawContent, visibility, permissions, createdByMemberId: input.memberId }).returning();
  await audit(db, { chapterId: company.chapterId, kind: "BUSINESS_SIGNAL_RECEIVED", actor: { type: "USER", id: input.memberId ?? "member" }, subject: { type: "BusinessSignal", id: bs.id }, policyApplied: `permissions:${permissions.join("+")}`, result: `${company.name} entregó un Indicio a su Agente.`, significant: false, companyIds: [company.id] });

  // S1 · extracción por el Agente de la empresa originadora
  const provider = await getProvider();
  const specialties = await db.query.specialties.findMany();
  const extraction = await provider.extractSignal({ rawContent: input.rawContent, originatorDna: dnaRow.dna, availableSpecialties: specialties.map((s) => ({ code: s.nscatCode, name: s.name, description: s.description })), defaultCity: company.city });

  // S2 · clasificación de privacidad: personas físicas nunca en capa 0/1; la más restrictiva gana
  const leak = PERSON_IN_TEXT.test(extraction.chapter_layer.need_summary) || PERSON_IN_TEXT.test(extraction.qualification_layer.detailed_context);
  if (leak) {
    extraction.qualification_layer.detailed_context = extraction.qualification_layer.detailed_context.replace(/\b(don|doña|sr\.|sra\.)\s+[A-ZÁÉÍÓÚ][^\s,.]*(\s+[A-ZÁÉÍÓÚ][^\s,.]*)?/g, "[persona]");
  }
  if (input.thirdPartyExpectsContact) extraction.chapter_layer.third_party_expects_contact = true;
  const envelope: SignalEnvelope = {
    chapter_layer: extraction.chapter_layer,
    qualification_layer: extraction.qualification_layer,
    identity_layer: extraction.identity_layer
      ? { ...extraction.identity_layer, contact_person: input.contactName ? { name: input.contactName, role: input.contactRole, legal_basis: input.legalBasisForContact ?? "NONE" } : undefined }
      : input.contactName
        ? { third_party_company: { name: "Sin nombre" }, contact_person: { name: input.contactName, role: input.contactRole, legal_basis: input.legalBasisForContact ?? "NONE" } }
        : undefined,
    private_layer: { source_material_refs: [bs.id], internal_notes: input.rawContent },
  };
  const now = new Date();
  const [os] = await db.insert(schema.opportunitySignals).values({ chapterId: company.chapterId, businessSignalId: bs.id, originatorCompanyId: company.id, envelope, visibility, status: "DRAFT", expiresAt: new Date(now.getTime() + 90 * 86_400_000) }).returning();
  for (const n of extraction.needs) {
    await db.insert(schema.needs).values({ chapterId: company.chapterId, opportunitySignalId: os.id, specialtyHints: n.specialty_hints, description: n.description, plausibility: n.plausibility.toFixed(3), evidence: n.evidence, unknowns: n.unknowns, status: n.plausibility >= 0.4 ? "ACTIVE" : "LATENT" });
  }
  await audit(db, { chapterId: company.chapterId, kind: "SIGNAL_CLASSIFIED", actor: { type: "AGENT", id: agent.id }, subject: { type: "OpportunitySignal", id: os.id }, inputsUsed: [{ type: "BusinessSignal", id: bs.id, layer: 3 }], policyApplied: leak ? "privacy.person_redacted" : `privacy.${visibility.toLowerCase()}`, result: `Tu Agente estructuró el Indicio: ${extraction.needs.length} necesidad(es) candidata(s). ${leak ? "Se redactaron datos personales de las capas 0 y 1." : "Capa 0 sin identidad."}`, significant: false, companyIds: [company.id] });
  return { businessSignal: bs, opportunitySignal: os, needs: extraction.needs, provider: provider.name };
}

/** S3 · el cedente publica la capa 0 (o, si es COMPANY_ONLY, solo autoriza la búsqueda interna). */
export type PublishResult = MesaResult | { queued: true; jobId: string };

/** Publica el Indicio y convoca la Mesa: en línea (demo, pruebas) o en cola (modelo real, D-053). */
export async function publishSignal(db: Db, opportunitySignalId: string, memberId?: string, opts?: { mode?: "inline" }): Promise<MesaResult>;
export async function publishSignal(db: Db, opportunitySignalId: string, memberId: string | undefined, opts: { mode: "async" }): Promise<{ queued: true; jobId: string }>;
export async function publishSignal(db: Db, opportunitySignalId: string, memberId: string | undefined, opts: { mode: "inline" | "async" }): Promise<PublishResult>;
export async function publishSignal(db: Db, opportunitySignalId: string, memberId?: string, opts: { mode?: "inline" | "async" } = {}): Promise<PublishResult> {
  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, opportunitySignalId) });
  if (!os) throw new Error("Señal no encontrada");
  const internal = os.visibility === "COMPANY_ONLY";
  if (!internal) {
    await db.update(schema.opportunitySignals).set({ status: "PUBLISHED", publishedAt: new Date() }).where(eq(schema.opportunitySignals.id, os.id));
    await audit(db, { chapterId: os.chapterId, kind: "HUMAN_DECISION", actor: { type: "USER", id: memberId ?? "member" }, subject: { type: "OpportunitySignal", id: os.id }, policyApplied: "human_gate.publish", result: "El cedente revisó la capa 0 y publicó el Indicio en la Sala.", significant: false, companyIds: [os.originatorCompanyId] });
  } else {
    await audit(db, { chapterId: os.chapterId, kind: "INTERNAL_SEARCH_AUTHORIZED", actor: { type: "USER", id: memberId ?? "member" }, subject: { type: "OpportunitySignal", id: os.id }, policyApplied: "visibility.company_only", result: "El titular autorizó a su Agente a buscar internamente sin publicar nada.", significant: false, companyIds: [os.originatorCompanyId] });
  }
  if ((opts.mode ?? "inline") === "async") {
    const job = await enqueueMesa(db, os.chapterId, os.id);
    await audit(db, { chapterId: os.chapterId, kind: "MESA_QUEUED", actor: { type: "AGENT", id: "jobs" }, subject: { type: "OpportunitySignal", id: os.id }, policyApplied: "jobs.async", result: "Tu Agente ha llevado el Indicio a la Mesa. Los Agentes de la Sala lo cualifican ahora en segundo plano; te avisará en Hoy.", significant: true, companyIds: [os.originatorCompanyId] });
    return { queued: true, jobId: job.id };
  }
  return runMesa(db, os.id);
}

export async function withdrawSignal(db: Db, opportunitySignalId: string, memberId?: string) {
  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, opportunitySignalId) });
  if (!os) throw new Error("Señal no encontrada");
  await db.update(schema.opportunitySignals).set({ status: "WITHDRAWN" }).where(eq(schema.opportunitySignals.id, os.id));
  await audit(db, { chapterId: os.chapterId, kind: "SIGNAL_WITHDRAWN", actor: { type: "USER", id: memberId ?? "member" }, subject: { type: "OpportunitySignal", id: os.id }, result: "El cedente retiró el Indicio.", significant: false, companyIds: [os.originatorCompanyId] });
}
