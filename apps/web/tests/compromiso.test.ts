/** Norma 1 del fundador (N-002, D-044): una Cesión válida a la semana y escalera de cuatro semanas. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { decide } from "@/services/referrals";
import { compromisoStatus, runCompromiso } from "@/services/compromiso";
import { ladder, previousWeek, weekStart } from "@/core/compromiso";
import { mesaTimeline } from "@/services/today";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Awaited<ReturnType<typeof seedChapter>>["companies"];
const D = 86_400_000;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
  // Lucía y Carlos llevan cinco semanas en la Sala: a ellos los evalúa la Norma desde la primera semana.
  // El resto entró hoy: no se evalúa hasta completar su primera semana, y así sigue en la Mesa cuando Carlos queda suspendido.
  await db.update(schema.companies).set({ createdAt: new Date(Date.now() - 35 * D) }).where(eq(schema.companies.id, companies.guadalquivir.companyId));
  await db.update(schema.companies).set({ createdAt: new Date(Date.now() - 35 * D) }).where(eq(schema.companies.id, companies.hispalis.companyId));
});
afterAll(async () => {
  await closeDb();
});

describe("Escalera (funciones puras)", () => {
  it("semana 1 empuja, 2 avisa con diplomacia, 3 avisa tajante con la Directiva, 4 suspende", () => {
    expect(ladder(0, 1).kind).toBe("NONE");
    expect(ladder(1, 1)).toMatchObject({ level: 0, kind: "NUDGE", toDirectiva: false });
    expect(ladder(2, 1)).toMatchObject({ level: 1, kind: "FIRST_WARNING", toDirectiva: false });
    expect(ladder(2, 1).message).toMatch(/consideración/);
    expect(ladder(3, 1)).toMatchObject({ level: 2, kind: "SECOND_WARNING", toDirectiva: true });
    expect(ladder(3, 1).message).toMatch(/tajante|suspendida/);
    expect(ladder(4, 1)).toMatchObject({ level: 3, kind: "SUSPENSION", toDirectiva: true });
    expect(ladder(9, 1).kind).toBe("SUSPENSION");
  });
  it("la semana evaluada es la completa anterior, de lunes a lunes", () => {
    const w = previousWeek(new Date("2026-09-16T08:00:00Z")); // miércoles
    expect(w.start.toISOString()).toBe("2026-09-07T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-09-14T00:00:00.000Z");
    expect(weekStart(new Date("2026-09-14T00:00:00Z")).toISOString()).toBe("2026-09-14T00:00:00.000Z");
  });
});

describe("Cuatro semanas sin ceder", () => {
  it("quien cede está al día; quien no, sube la escalera semana a semana hasta la suspensión, y la Mesa lo excluye", async () => {
    const lucia = companies.guadalquivir;
    const carlos = companies.hispalis;
    const monday = weekStart(new Date());
    // Lucía cede esta semana (visto bueno del cedente con Salvoconducto)
    const created = await createSignal(db, { companyId: lucia.companyId, memberId: lucia.memberId, rawContent: SCENARIOS.A.rawContent, contactName: SCENARIOS.A.contactName, contactRole: SCENARIOS.A.contactRole, legalBasisForContact: SCENARIOS.A.legalBasisForContact });
    const res = await publishSignal(db, created.opportunitySignal.id, lucia.memberId);
    await decide(db, { referralId: res.referralIds[0], memberId: lucia.memberId, decision: "APPROVE" });
    const st = await compromisoStatus(db, lucia.companyId, new Date());
    expect(st?.offeredThisWeek).toBeGreaterThanOrEqual(1);

    const nextMonday = (n: number) => new Date(monday.getTime() + n * 7 * D + 9 * 3_600_000); // lunes siguiente, 09:00
    // Semana 1 evaluada: Lucía cumplió; Carlos no cedió
    const r1 = await runCompromiso(db, chapterId, nextMonday(1));
    expect(r1.evaluated).toBe(2); // solo quienes ya llevan una semana completa en la Sala
    expect(r1.nudges).toBe(1);
    expect((await runCompromiso(db, chapterId, nextMonday(1))).evaluated).toBe(0); // idempotente por semana
    const l1 = (await db.query.companies.findFirst({ where: eq(schema.companies.id, lucia.companyId) }))!;
    expect(l1.compromisoWeeksWithout).toBe(0);
    const c1 = (await db.query.companies.findFirst({ where: eq(schema.companies.id, carlos.companyId) }))!;
    expect(c1.compromisoWeeksWithout).toBe(1);
    expect(c1.compromisoLevel).toBe(0);
    // Semana 2: primer aviso, solo para Carlos
    await runCompromiso(db, chapterId, nextMonday(2));
    const c2 = (await db.query.companies.findFirst({ where: eq(schema.companies.id, carlos.companyId) }))!;
    expect(c2.compromisoLevel).toBe(1);
    const warn1 = (await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.kind, "COMPROMISO_FIRST_WARNING"), eq(schema.auditEvents.subjectId, carlos.companyId)) }))[0];
    expect(warn1.companyIds).toEqual([carlos.companyId]);
    // Semana 3: segundo aviso, con la Directiva
    const r3 = await runCompromiso(db, chapterId, nextMonday(3));
    expect(r3.secondWarnings).toBeGreaterThan(0);
    const warn2 = (await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.kind, "COMPROMISO_SECOND_WARNING"), eq(schema.auditEvents.subjectId, carlos.companyId)) }))[0];
    expect(warn2.companyIds.length).toBeGreaterThan(1);
    expect((await db.query.companies.findFirst({ where: eq(schema.companies.id, carlos.companyId) }))!.status).toBe("ACTIVE");
    // Semana 4: suspensión de la titularidad
    const r4 = await runCompromiso(db, chapterId, nextMonday(4));
    expect(r4.suspensions).toBeGreaterThan(0);
    const c4 = (await db.query.companies.findFirst({ where: eq(schema.companies.id, carlos.companyId) }))!;
    expect(c4.status).toBe("SUSPENDED");
    expect(c4.compromisoLevel).toBe(3);
    const seat = await db.query.categorySeats.findFirst({ where: eq(schema.categorySeats.companyId, carlos.companyId) });
    expect(seat?.status).toBe("SUSPENDED");
    const missed = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, carlos.companyId), eq(schema.trustEvents.kind, "CONTRIBUTION_QUOTA_MISSED")) });
    expect(missed?.weight).toBeLessThan(0);
    const sala = await mesaTimeline(db, chapterId, companies["prl-andaluza"].companyId);
    expect(sala.some((e) => e.kind === "SEAT_SUSPENDED" && e.result.includes("Híspalis"))).toBe(true);
    const suspendedStatus = await compromisoStatus(db, carlos.companyId);
    expect(suspendedStatus?.suspended).toBe(true);
    // Un Indicio nuevo de nueva sede ya no genera Cesión para la plaza suspendida de Híspalis
    const again = await createSignal(db, { companyId: lucia.companyId, memberId: lucia.memberId, rawContent: "Mi cliente Bodegas Alcor abre nueva sede en Utrera en Q1 con 30 empleados nuevos. Presupuesto aprobado. Decide el gerente." });
    const out = await publishSignal(db, again.opportunitySignal.id, lucia.memberId);
    const refs = await db.query.referrals.findMany({ where: eq(schema.referrals.opportunitySignalId, again.opportunitySignal.id) });
    expect(out.referralIds.length + out.discarded.length).toBeGreaterThan(0);
    expect(refs.some((r) => r.receiverCompanyId === carlos.companyId)).toBe(false);
  });
  it("una Cesión válida reinicia la cuenta de avisos", async () => {
    const monday = weekStart(new Date());
    const prl = companies["prl-andaluza"];
    await db.update(schema.companies).set({ createdAt: new Date(Date.now() - 35 * D), compromisoWeeksWithout: 2, compromisoLevel: 1, compromisoCheckedWeek: null }).where(eq(schema.companies.id, prl.companyId));
    const created = await createSignal(db, { companyId: prl.companyId, memberId: prl.memberId, rawContent: "Mi cliente Cerámicas del Sur va a contratar 25 personas en su planta de Alcalá en los próximos tres meses. Decide el director de RRHH." });
    const res = await publishSignal(db, created.opportunitySignal.id, prl.memberId);
    expect(res.referralIds.length).toBeGreaterThan(0);
    await decide(db, { referralId: res.referralIds[0], memberId: prl.memberId, decision: "APPROVE" });
    const r = await runCompromiso(db, chapterId, new Date(monday.getTime() + 7 * D + 9 * 3_600_000));
    expect(r.recovered).toBeGreaterThanOrEqual(1);
    const c = (await db.query.companies.findFirst({ where: eq(schema.companies.id, prl.companyId) }))!;
    expect(c.compromisoWeeksWithout).toBe(0);
    expect(c.compromisoLevel).toBe(0);
  });
});
