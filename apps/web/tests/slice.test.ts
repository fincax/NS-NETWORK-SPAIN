/** Vertical slice de principio a fin sobre PGlite en memoria: alta → ADN → Indicio → Pista → Cesión → vistos buenos → Puente → Veredicto. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { authorizeIntro, confirmValue, decide, markIntroduced, submitVerdict, updateStage } from "@/services/referrals";
import { onboardCompany, SeatTakenError } from "@/services/onboarding";
import { balance, mesaTimeline, todaySummary } from "@/services/today";
import { SEED_COMPANIES } from "@/db/seed-data";
import { runClock } from "@/services/clock";
import { runRastreo, SampleFeed, SAMPLE_FEED } from "@/agents/rastreo";
import { createDemand } from "@/services/demands";
import type { SignalEnvelope } from "@/core/types";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
});
afterAll(async () => {
  await closeDb();
});

describe("Alta de empresa y exclusividad de plaza", () => {
  it("una segunda empresa de la misma especialidad no entra en la Sala", async () => {
    await expect(onboardCompany(db, { chapterId, name: "Obras Bética", slug: "obras-betica", specialtyCode: "OBRA_INDUSTRIAL", person: { fullName: "P", role: "CEO", email: "p@betica.es" }, dna: SEED_COMPANIES[0].dna })).rejects.toBeInstanceOf(SeatTakenError);
  });
  it("una plaza vacante se ocupa y activa un Agente", async () => {
    const r = await onboardCompany(db, { chapterId, name: "Redes Giralda", slug: "redes-giralda", specialtyCode: "TELECOMUNICACIONES", person: { fullName: "Q", role: "CEO", email: "q@giralda.es" }, dna: { ...SEED_COMPANIES[4].dna, ideal_customer: { ...SEED_COMPANIES[4].dna.ideal_customer, triggers: ["NEW_SITE"] }, commercial: { ...SEED_COMPANIES[4].dna.commercial, ticket_min: 5_000, ticket_max: 90_000 } } });
    expect(r.agent.kind).toBe("COMPANY");
    const seat = await db.query.categorySeats.findFirst({ where: eq(schema.categorySeats.companyId, r.company.id) });
    expect(seat?.status).toBe("ACTIVE");
  });
});

describe("Scenario A · oportunidad excelente", () => {
  let referralId: string;
  const lucia = () => companies.guadalquivir;
  const carlos = () => companies.hispalis;

  it("el Indicio se estructura sin identidad en la capa 0 y con la identidad en la capa 2", async () => {
    const sc = SCENARIOS.A;
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact });
    const env = created.opportunitySignal.envelope as SignalEnvelope;
    expect(env.chapter_layer.need_summary).not.toMatch(/Metalúrgica|Rafael/);
    expect(env.qualification_layer?.detailed_context).not.toMatch(/Metalúrgica/);
    expect(env.identity_layer?.third_party_company.name).toBe("Metalúrgica del Sur");
    expect(env.identity_layer?.contact_person?.legal_basis).toBe("LEGITIMATE_INTEREST");
    expect(created.needs.map((n) => n.specialty_hints[0])).toContain("OBRA_INDUSTRIAL");

    const res = await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    expect(res.referralIds.length).toBeGreaterThanOrEqual(3);
    expect(res.discarded.find((d) => d.company === "Mobiliario Delta")?.code).toBe("TICKET_MISMATCH");
    const ref = await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, carlos().companyId), eq(schema.referrals.originatorCompanyId, lucia().companyId)) });
    expect(ref?.state).toBe("ORIGINATOR_PENDING");
    referralId = ref!.id;
    const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, ref!.matchId) });
    expect(match!.score.total).toBeGreaterThanOrEqual(0.8);
    expect(match!.compliance?.verdict).toBe("PASS");
    expect(match!.explanation.why.length).toBeGreaterThan(3);
  });

  it("el cesionario no puede decidir antes que el cedente; el cedente da el visto bueno", async () => {
    await expect(decide(db, { referralId, memberId: carlos().memberId, decision: "APPROVE" })).rejects.toThrow();
    await decide(db, { referralId, memberId: lucia().memberId, decision: "APPROVE" });
    expect((await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) }))!.state).toBe("RECEIVER_PENDING");
  });

  it("el cesionario acepta y confirma la Promesa: el cedente gana Mérito de Promesa", async () => {
    await decide(db, { referralId, memberId: carlos().memberId, decision: "APPROVE", promiseAdjustment: { estimated_value_max: 90_000, note: "Obra sin instalaciones" } });
    const ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) }))!;
    expect(ref.state).toBe("APPROVED");
    expect(ref.promise?.adjusted_by_receiver).toBe(true);
    const merit = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, lucia().companyId), eq(schema.trustEvents.kind, "PROMISE_EARNED")) });
    expect(merit!.weight).toBeGreaterThan(0);
  });

  it("Apertura con empresa y contacto; el Agente redacta el Puente y lo envía la persona", async () => {
    const pkg = await authorizeIntro(db, referralId, lucia().memberId, "COMPANY_AND_CONTACT");
    expect(pkg.message).toMatch(/Carlos Ruiz/);
    expect(pkg.message).toMatch(/Rafael Montes/);
    expect(pkg.message).not.toMatch(/comisi/i);
    await expect(markIntroduced(db, referralId, lucia().memberId, "Te lo presento a cambio de una comisión")).rejects.toThrow(/D-010/);
    await markIntroduced(db, referralId, lucia().memberId, pkg.message);
    const ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) }))!;
    expect(ref.state).toBe("INTRODUCED");
    expect(ref.responseDueAt).toBeInstanceOf(Date);
  });

  it("seguimiento, Veredicto en tres ejes con Distinción y valor contrastado por ambas partes", async () => {
    await updateStage(db, referralId, carlos().memberId, "MEETING");
    await updateStage(db, referralId, carlos().memberId, "COMMERCIAL_OPPORTUNITY");
    const out = await submitVerdict(db, { referralId, memberId: carlos().memberId, verdict: { ease: 5, business: 4, treatment: 5, result: "WON", value_verified: 38_000, need_was_real: true }, recognition: { axis: "TRATO", reason: "Trato impecable con el Director General." } });
    expect(out.merit.originator.close).toBeGreaterThan(0);
    expect(out.recognition?.axis).toBe("TRATO");
    await expect(submitVerdict(db, { referralId, memberId: carlos().memberId, verdict: { ease: 3, business: 3, treatment: 3, result: "WON", need_was_real: true }, recognition: { axis: "TRATO", reason: "otra" } })).rejects.toThrow();
    await confirmValue(db, referralId, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) }))!;
    expect(ref.state).toBe("VALUE_CONFIRMED");
    const bal = await balance(db, chapterId, lucia().companyId);
    expect(bal.valueGiven).toBe(38_000);
    expect(bal.merit).toBeGreaterThan(100);
    const timeline = await mesaTimeline(db, chapterId, carlos().companyId);
    expect(timeline.some((e) => e.kind === "VALUE_CONFIRMED")).toBe(true);
  });
});

describe("Scenario C · falso positivo semántico", () => {
  it("Branding Atelier queda descartada por ticket antes de cualquier cualificación", async () => {
    const c = companies.securenet;
    const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: SCENARIOS.C.rawContent });
    const res = await publishSignal(db, created.opportunitySignal.id, c.memberId);
    expect(res.discarded.find((d) => d.company === "Branding Atelier")?.code).toBe("TICKET_MISMATCH");
    const claim = await db.query.interestClaims.findFirst({ where: and(eq(schema.interestClaims.claimantCompanyId, companies["branding-atelier"].companyId), eq(schema.interestClaims.status, "NO_INTEREST")) });
    expect(claim).toBeTruthy();
    const q = await db.query.qualifications.findMany();
    expect(q.every((x) => x.interestClaimId !== claim!.id)).toBe(true);
  });
});

describe("Scenario D · confidencialidad", () => {
  it("una señal COMPANY_ONLY no se publica, no genera Cesiones y solo informa al titular", async () => {
    const c = companies["fiscal-triana"];
    const before = (await db.query.auditEvents.findMany()).length;
    const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: SCENARIOS.D.rawContent, visibility: "COMPANY_ONLY" });
    const res = await publishSignal(db, created.opportunitySignal.id, c.memberId);
    expect(res.referralIds).toEqual([]);
    const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, created.opportunitySignal.id) });
    expect(os!.status).toBe("DRAFT");
    const events = (await db.query.auditEvents.findMany()).slice(before);
    const internal = events.filter((e) => e.kind === "INTERNAL_MATCH_FOUND");
    expect(internal.length).toBeGreaterThanOrEqual(2);
    expect(internal.every((e) => e.companyIds.length === 1 && e.companyIds[0] === c.companyId)).toBe(true);
    expect(events.some((e) => e.kind === "SIGNAL_PUBLISHED" && e.subjectId === os!.id)).toBe(false);
    // Otro titular no ve nada de esto en su Mesa ni en su Hoy
    const other = await mesaTimeline(db, chapterId, companies.hispalis.companyId);
    expect(other.some((e) => e.kind === "INTERNAL_MATCH_FOUND")).toBe(false);
    const today = await todaySummary(db, chapterId, c.companyId);
    expect(today.internal.length).toBeGreaterThanOrEqual(2);
  });
});

describe("D-030 · Reloj de la Sala", () => {
  it("recuerda a las 72 h y caduca a los 7 días con RESPONSE_LATE para quien calló", async () => {
    const c = companies.guadalquivir;
    const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: "Mi cliente Bodegas Alcor abre nueva sede en Utrera en Q1 con 30 empleados nuevos. Presupuesto aprobado. Decide el gerente." });
    const res = await publishSignal(db, created.opportunitySignal.id, c.memberId);
    expect(res.referralIds.length).toBeGreaterThan(0);
    const id = res.referralIds[0];
    const ref0 = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, id) }))!;
    const t72 = new Date(ref0.reviewRequestedAt!.getTime() + 73 * 3_600_000);
    const r1 = await runClock(db, t72, chapterId);
    expect(r1.reminders).toBeGreaterThanOrEqual(1);
    const r1b = await runClock(db, t72, chapterId);
    expect(r1b.reminders).toBe(0); // idempotente
    const t8d = new Date(ref0.reviewRequestedAt!.getTime() + 8 * 86_400_000);
    const r2 = await runClock(db, t8d, chapterId);
    expect(r2.expired).toBeGreaterThanOrEqual(1);
    const ref1 = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, id) }))!;
    expect(ref1.state).toBe("EXPIRED");
    const late = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, c.companyId), eq(schema.trustEvents.kind, "RESPONSE_LATE")) });
    expect(late).toBeTruthy(); // el cedente no dio su visto bueno a tiempo
  });
});

describe("D-031 · Rastreo público", () => {
  it("deja Indicios en borrador para el Timonel, sin publicar nada, y no repite registros", async () => {
    const c = companies.hispalis;
    const before = await db.query.opportunitySignals.findMany({ where: eq(schema.opportunitySignals.originatorCompanyId, c.companyId) });
    const r = await runRastreo(db, c.companyId, new SampleFeed(SAMPLE_FEED.slice(0, 3)));
    expect(r.ingested.length).toBeGreaterThanOrEqual(2);
    const after = await db.query.opportunitySignals.findMany({ where: eq(schema.opportunitySignals.originatorCompanyId, c.companyId) });
    const drafts = after.filter((o) => !before.some((b) => b.id === o.id));
    expect(drafts.every((d) => d.status === "DRAFT" || d.status === "WITHDRAWN")).toBe(true);
    const first = drafts.find((d) => d.status === "DRAFT")!;
    expect((first.envelope as SignalEnvelope).chapter_layer.relationship_strength).toBe("WEAK");
    expect((first.envelope as SignalEnvelope).chapter_layer.need_summary).not.toMatch(/Cerámicas|Logística Bética|Farmalab/);
    const again = await runRastreo(db, c.companyId, new SampleFeed(SAMPLE_FEED.slice(0, 3)));
    expect(again.ingested.length).toBe(0);
    expect(again.skipped).toBe(3);
    // Publicar uno de ellos crea Cesiones para otros titulares con Híspalis como cedente
    const res = await publishSignal(db, first.id, c.memberId);
    expect(res.referralIds.length + res.discarded.length + res.uncovered.length).toBeGreaterThan(0);
  });
});

describe("D-032 · Encargos", () => {
  it("un Encargo abierto se refleja en el Fundamento de la Pista", async () => {
    const talento = companies["talento-sur"];
    await createDemand(db, { companyId: talento.companyId, text: "Busco empresas que contraten más de 20 personas en Sevilla", trigger: "HEADCOUNT_GROWTH" });
    const c = companies.securenet;
    const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: "Conozco una empresa logística de 80 empleados en Sevilla que va a contratar 30 personas más en tres meses. Decide el director de RRHH." });
    const res = await publishSignal(db, created.opportunitySignal.id, c.memberId);
    const ref = await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, talento.companyId), eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id)) });
    expect(res.referralIds).toContain(ref?.id);
    const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, ref!.matchId) });
    expect(match!.explanation.why.some((w) => w.includes("Encargo"))).toBe(true);
  });
});
