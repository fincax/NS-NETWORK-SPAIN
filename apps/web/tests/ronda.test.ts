/** Ronda (D-036): la pasada de cada mañana (Reloj + Rastreo) y la ruta programada /api/clock. */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { runRonda } from "@/services/ronda";
import { SAMPLE_FEED, SampleFeed } from "@/agents/rastreo";
import { GET } from "@/app/api/clock/route";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;

beforeAll(async () => {
  db = await getDb();
  chapterId = (await seedChapter(db)).chapter.id;
});
afterAll(async () => {
  await closeDb();
});

describe("Ronda de la mañana", () => {
  it("rastrea con todos los Agentes de la Sala, reparte los registros y deja un evento en la Mesa", async () => {
    const r = await runRonda(db, new Date(), new SampleFeed(SAMPLE_FEED));
    const cumbre = r.chapters.find((c) => c.chapterId === chapterId)!;
    expect(cumbre.rastreo.agents).toBe(10);
    expect(cumbre.rastreo.drafts).toBeGreaterThan(0);
    const records = await db.query.publicRecords.findMany({ where: eq(schema.publicRecords.chapterId, chapterId) });
    expect(records.length).toBe(SAMPLE_FEED.length);
    const events = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.kind, "RONDA") });
    expect(events.length).toBe(1);
    expect(events[0].significant).toBe(true);
    expect(events[0].companyIds).toEqual([]);
    expect(events[0].result).toMatch(/Indicio\(s\) en borrador/);
  });
  it("es idempotente: la segunda pasada del día no repite trabajo ni eventos", async () => {
    const r = await runRonda(db, new Date(), new SampleFeed(SAMPLE_FEED));
    const cumbre = r.chapters.find((c) => c.chapterId === chapterId)!;
    expect(cumbre.rastreo.drafts).toBe(0);
    expect(cumbre.clock).toEqual({ reminders: 0, expired: 0, late: 0, nudges: 0 });
    const events = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.kind, "RONDA") });
    expect(events.length).toBe(1);
  });
  it("el reparto empieza por el Agente que menos ha rastreado", async () => {
    const records = await db.query.publicRecords.findMany({ where: eq(schema.publicRecords.chapterId, chapterId) });
    const first = records[0].ingestedByCompanyId;
    expect(records.every((x) => x.ingestedByCompanyId === first)).toBe(true);
    const extra = new SampleFeed([{ ...SAMPLE_FEED[0], external_ref: "PRENSA:2026-09-13:ronda-test", title: "Una empresa abre nueva sede logística en Dos Hermanas", summary: "Nueva nave de 4.000 m2 y 25 contrataciones previstas." }]);
    await runRonda(db, new Date(), extra);
    const after = await db.query.publicRecords.findFirst({ where: eq(schema.publicRecords.externalRef, "PRENSA:2026-09-13:ronda-test") });
    expect(after).toBeDefined();
    expect(after!.ingestedByCompanyId).not.toBe(first);
  });
});

describe("GET /api/clock", () => {
  const env = process.env as Record<string, string | undefined>;
  const original = { secret: env.CRON_SECRET, env: env.NODE_ENV };
  afterEach(() => {
    env.CRON_SECRET = original.secret;
    env.NODE_ENV = original.env;
  });
  it("con CRON_SECRET, rechaza sin cabecera y acepta con ella", async () => {
    process.env.CRON_SECRET = "secreto-de-prueba";
    const denied = await GET(new Request("http://ns.test/api/clock"));
    expect(denied.status).toBe(401);
    const wrong = await GET(new Request("http://ns.test/api/clock", { headers: { authorization: "Bearer otra" } }));
    expect(wrong.status).toBe(401);
    const ok = await GET(new Request("http://ns.test/api/clock", { headers: { authorization: "Bearer secreto-de-prueba" } }));
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { ranAt: string; chapters: { chapterName: string }[] };
    expect(body.chapters.map((c) => c.chapterName)).toContain("NS Cumbre");
  });
  it("sin CRON_SECRET, en producción no se ejecuta", async () => {
    delete env.CRON_SECRET;
    env.NODE_ENV = "production";
    const res = await GET(new Request("http://ns.test/api/clock"));
    expect(res.status).toBe(503);
  });
});
