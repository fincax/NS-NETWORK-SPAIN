/** Mesa en directo (D-053): cola persistente, reclamación exclusiva, reintentos y NEEDS_HUMAN. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { enqueueMesa, MAX_ATTEMPTS, mesaLoad, mesaMode, runJobs } from "@/services/jobs";
import { runRonda } from "@/services/ronda";
import { SampleFeed } from "@/agents/rastreo";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
const lucia = () => companies.guadalquivir;
const carlos = () => companies.hispalis;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
});
afterAll(async () => {
  await closeDb();
});

describe("Cola de la Mesa", () => {
  it("en modo asíncrono, publicar encola y la Mesa corre después con el mismo resultado", async () => {
    const sc = SCENARIOS.A;
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact });
    const res = await publishSignal(db, created.opportunitySignal.id, lucia().memberId, { mode: "async" });
    expect(res.queued).toBe(true);
    expect((await db.query.referrals.findMany({ where: eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id) })).length).toBe(0);
    const load = await mesaLoad(db, chapterId, lucia().companyId);
    expect(load).toMatchObject({ total: 1, mine: 1 });
    const queued = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "MESA_QUEUED") });
    expect(queued?.companyIds).toEqual([lucia().companyId]);
    // Encolar dos veces el mismo Indicio no crea dos trabajos.
    const again = await enqueueMesa(db, chapterId, created.opportunitySignal.id);
    expect(again.id).toBe(res.jobId);
    const r = await runJobs(db, { chapterId });
    expect(r).toEqual({ done: 1, failed: 0, needsHuman: 0 });
    const refs = await db.query.referrals.findMany({ where: eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id) });
    expect(refs.length).toBeGreaterThanOrEqual(3);
    expect(refs.some((x) => x.receiverCompanyId === carlos().companyId)).toBe(true);
    expect((await mesaLoad(db, chapterId, lucia().companyId)).total).toBe(0);
    const job = (await db.query.agentJobs.findFirst({ where: eq(schema.agentJobs.id, res.jobId) }))!;
    expect(job.status).toBe("DONE");
    expect(job.attempts).toBe(1);
  });

  it("un trabajo que falla reintenta con espera y acaba en NEEDS_HUMAN con aviso al cedente", async () => {
    const [bs] = await db.insert(schema.businessSignals).values({ chapterId, companyId: lucia().companyId, source: "MEMBER_INPUT", rawContent: "x", permissions: [] }).returning();
    const [broken] = await db.insert(schema.opportunitySignals).values({ chapterId, businessSignalId: bs.id, originatorCompanyId: lucia().companyId, envelope: {} as never, visibility: "CHAPTER", status: "DRAFT", expiresAt: new Date(Date.now() + 86_400_000) }).returning(); // no publicada: la Mesa la rechaza
    const job = await enqueueMesa(db, chapterId, broken.id);
    const t0 = new Date();
    expect(await runJobs(db, { chapterId, now: t0 })).toEqual({ done: 0, failed: 1, needsHuman: 0 });
    let row = (await db.query.agentJobs.findFirst({ where: eq(schema.agentJobs.id, job.id) }))!;
    expect(row.status).toBe("QUEUED");
    expect(row.runAfter.getTime()).toBeGreaterThan(t0.getTime());
    // Antes de la espera no se reclama.
    expect(await runJobs(db, { chapterId, now: t0 })).toEqual({ done: 0, failed: 0, needsHuman: 0 });
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      const later = new Date(t0.getTime() + 60 * 60_000 * (i + 1));
      await runJobs(db, { chapterId, now: later });
    }
    row = (await db.query.agentJobs.findFirst({ where: eq(schema.agentJobs.id, job.id) }))!;
    expect(row.status).toBe("NEEDS_HUMAN");
    expect(row.attempts).toBe(MAX_ATTEMPTS);
    const notice = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.kind, "MESA_NEEDS_HUMAN"), eq(schema.auditEvents.subjectId, broken.id)) });
    expect(notice?.companyIds).toEqual([lucia().companyId]);
    expect((await mesaLoad(db, chapterId, lucia().companyId)).needsHuman).toBe(1);
  });

  it("la Ronda drena la cola antes del Reloj", async () => {
    const sc = SCENARIOS.A;
    const created = await createSignal(db, { companyId: carlos().companyId, memberId: carlos().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact });
    await publishSignal(db, created.opportunitySignal.id, carlos().memberId, { mode: "async" });
    const r = await runRonda(db, new Date(), new SampleFeed([]));
    expect(r.chapters.find((c) => c.chapterId === chapterId)!.jobs.done).toBe(1);
  });

  it("el modo por defecto es en línea sin clave del modelo", () => {
    expect(mesaMode()).toBe("inline");
  });
});
