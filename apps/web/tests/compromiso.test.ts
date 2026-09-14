/** Compromiso semanal (D-010 · D-042): mínimo de 1 Cesión válida por semana y escalera de cuatro semanas hasta la baja. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { SEED_COMPANIES } from "@/db/seed-data";
import { createSignal, publishSignal } from "@/services/signals";
import { decide } from "@/services/referrals";
import { acceptAllNormas } from "@/core/normas";
import { onboardCompany } from "@/services/onboarding";
import { runClock } from "@/services/clock";
import { compromisoStatus, confirmRelease, pendingReleases, proposeRelease } from "@/services/compromiso";
import { onboardCompany as onboard, SeatTakenError } from "@/services/onboarding";
import { addWeeks, ladderAction, lastCompletedWeekStart, weeklyMerit, weekStart } from "@/core/compromiso";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
const base = weekStart(new Date()); // lunes de esta semana: la Sala y sus plazas nacen hoy
const monday = (n: number) => addWeeks(base, n);
const lucia = () => companies.guadalquivir;
const carlos = () => companies.hispalis;
const director = () => companies["bufete-alameda"];

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
});
afterAll(async () => {
  await closeDb();
});

describe("Reglas puras", () => {
  it("la escalera: semana 1 constancia, 2 aviso diplomático, 3 aviso formal, 4 baja", () => {
    expect(ladderAction(0)).toBe("NONE");
    expect(ladderAction(1)).toBe("MISSED");
    expect(ladderAction(2)).toBe("DIPLOMATIC_NOTICE");
    expect(ladderAction(3)).toBe("FORMAL_NOTICE");
    expect(ladderAction(4)).toBe("RELEASE_NOTICE");
    expect(ladderAction(9)).toBe("RELEASE_NOTICE");
  });
  it("con una se cumple; con varias especialidades se destaca", () => {
    expect(weeklyMerit(0, 0)).toBe(0);
    expect(weeklyMerit(1, 1)).toBe(10);
    expect(weeklyMerit(3, 1)).toBe(10);
    expect(weeklyMerit(3, 3)).toBe(20);
  });
  it("las semanas empiezan en lunes y se evalúa la última completa", () => {
    const wed = new Date(Date.UTC(2026, 8, 16, 10)); // miércoles 16-09-2026
    expect(weekStart(wed).toISOString()).toBe("2026-09-14T00:00:00.000Z");
    expect(lastCompletedWeekStart(wed).toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });
});

describe("Escalera semana a semana", () => {
  it("la semana de alta no cuenta; la primera semana completa sin ceder queda en constancia", async () => {
    const r0 = await runClock(db, monday(1), chapterId);
    expect(r0.compromiso.evaluated).toBe(0);
    const r1 = await runClock(db, monday(2), chapterId);
    expect(r1.compromiso).toEqual({ evaluated: 10, met: 0, notices: 0, releases: 0 });
    const rows = await db.query.contributionWeeks.findMany({ where: eq(schema.contributionWeeks.chapterId, chapterId) });
    expect(rows).toHaveLength(10);
    expect(rows.every((r) => r.action === "MISSED" && r.missedStreak === 1)).toBe(true);
    const again = await runClock(db, monday(2), chapterId);
    expect(again.compromiso.evaluated).toBe(0);
  });

  it("una Cesión válida pone la cuenta a cero; los demás reciben el aviso diplomático", async () => {
    const sc = SCENARIOS.A;
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, carlos().companyId), eq(schema.referrals.originatorCompanyId, lucia().companyId)) }))!;
    await decide(db, { referralId: ref.id, memberId: lucia().memberId, decision: "APPROVE" });
    await decide(db, { referralId: ref.id, memberId: carlos().memberId, decision: "APPROVE" });
    // La aceptación ocurre en la semana 2 (el reloj de la prueba va por delante del reloj real).
    await db.update(schema.referralTransitions).set({ occurredAt: new Date(monday(2).getTime() + 86_400_000) }).where(and(eq(schema.referralTransitions.referralId, ref.id), eq(schema.referralTransitions.toState, "APPROVED")));

    const r = await runClock(db, monday(3), chapterId);
    expect(r.compromiso.evaluated).toBe(10);
    expect(r.compromiso.met).toBe(1);
    expect(r.compromiso.notices).toBe(9);
    const mine = await db.query.contributionWeeks.findFirst({ where: and(eq(schema.contributionWeeks.companyId, lucia().companyId), eq(schema.contributionWeeks.weekStart, monday(2))) });
    expect(mine).toMatchObject({ validCount: 1, distinctSpecialties: 1, missedStreak: 0, action: "NONE" });
    const met = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, lucia().companyId), eq(schema.trustEvents.kind, "CONTRIBUTION_QUOTA_MET")) });
    expect(met?.weight).toBe(10);
    const notice = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "COMPROMISO_DIPLOMATIC_NOTICE") });
    expect(notice?.companyIds).toHaveLength(1);
    expect(notice?.result).toMatch(/dos semanas seguidas/);
  });

  it("la tercera semana trae el aviso formal, visible para la empresa y la Directiva", async () => {
    const r = await runClock(db, monday(4), chapterId);
    expect(r.compromiso.notices).toBe(9);
    expect(r.compromiso.releases).toBe(0);
    const formal = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.kind, "COMPROMISO_FORMAL_NOTICE") });
    expect(formal).toHaveLength(9);
    expect(formal[0].companyIds).toContain(director().companyId);
    expect(formal[0].result).toMatch(/lo antes posible/);
    const luciaWeek = await db.query.contributionWeeks.findFirst({ where: and(eq(schema.contributionWeeks.companyId, lucia().companyId), eq(schema.contributionWeeks.weekStart, monday(3))) });
    expect(luciaWeek).toMatchObject({ missedStreak: 1, action: "MISSED" });
  });

  it("una empresa dada de alta a mitad de camino no se evalúa hasta su primera semana completa", async () => {
    const r = await onboardCompany(db, { chapterId, name: "Redes Giralda", slug: "redes-giralda", specialtyCode: "TELECOMUNICACIONES", person: { fullName: "Q", role: "CEO", email: "q@giralda.es" }, dna: SEED_COMPANIES[4].dna, acceptance: acceptAllNormas() });
    const rows = await db.query.contributionWeeks.findMany({ where: eq(schema.contributionWeeks.companyId, r.company.id) });
    expect(rows).toHaveLength(0);
  });

  it("la cuarta semana notifica la baja: empresa suspendida y plaza pendiente de la Directiva", async () => {
    const r = await runClock(db, monday(5), chapterId);
    expect(r.compromiso.releases).toBe(9);
    const hispalis = (await db.query.companies.findFirst({ where: eq(schema.companies.id, carlos().companyId) }))!;
    expect(hispalis.status).toBe("SUSPENDED");
    const seat = (await db.query.categorySeats.findFirst({ where: eq(schema.categorySeats.companyId, carlos().companyId) }))!;
    expect(seat.status).toBe("RELEASE_PENDING");
    const guadalquivir = (await db.query.companies.findFirst({ where: eq(schema.companies.id, lucia().companyId) }))!;
    expect(guadalquivir.status).toBe("ACTIVE");
    const notice = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.kind, "COMPROMISO_RELEASE_NOTICE"), eq(schema.auditEvents.subjectId, carlos().companyId)) });
    expect(notice?.result).toMatch(/cuatro semanas seguidas/);
    expect((await pendingReleases(db, chapterId)).map((p) => p.company.id)).toContain(carlos().companyId);
    // Ya notificada, la baja no se repite ni la escalera sigue subiendo para esa empresa.
    const r2 = await runClock(db, monday(6), chapterId);
    expect(r2.compromiso.releases).toBe(0);
  });

  it("la Brújula lee el estado en vivo", async () => {
    const s = await compromisoStatus(db, chapterId, lucia().companyId, new Date(monday(6).getTime() + 3 * 86_400_000));
    expect(s.minimum).toBe(1);
    expect(s.thisWeek.validCount).toBe(0);
    expect(s.missedStreak).toBe(3);
    expect(s.lastAction).toBe("FORMAL_NOTICE");
    expect(s.label).toMatch(/Aviso formal · 3 semanas/);
    expect(s.nextStep).toMatch(/se notifica la baja/);
    const released = await compromisoStatus(db, chapterId, carlos().companyId, monday(6));
    expect(released.label).toBe("Baja notificada");
  });

  it("la plaza expedientada no puede ocuparla otra empresa hasta la baja efectiva", async () => {
    await expect(onboard(db, { chapterId, name: "Obras Bética", slug: "obras-betica-2", specialtyCode: "OBRA_INDUSTRIAL", person: { fullName: "P", role: "CEO", email: "p2@betica.es" }, dna: SEED_COMPANIES[0].dna, acceptance: acceptAllNormas() })).rejects.toThrow(/expediente de baja/);
    await expect(onboard(db, { chapterId, name: "Obras Bética", slug: "obras-betica-2", specialtyCode: "OBRA_INDUSTRIAL", person: { fullName: "P", role: "CEO", email: "p2@betica.es" }, dna: SEED_COMPANIES[0].dna, acceptance: acceptAllNormas() })).rejects.toBeInstanceOf(SeatTakenError);
  });

  it("la Directiva propone la baja y NS la confirma; la plaza vuelve a la Antesala", async () => {
    await expect(proposeRelease(db, { chapterId, companyId: carlos().companyId, memberId: lucia().memberId })).rejects.toThrow(/Directiva/);
    await expect(confirmRelease(db, { chapterId, companyId: carlos().companyId, memberId: director().memberId })).rejects.toThrow(/propuesta/);
    await proposeRelease(db, { chapterId, companyId: carlos().companyId, memberId: director().memberId });
    expect((await pendingReleases(db, chapterId)).find((p) => p.company.id === carlos().companyId)?.stage).toBe("RELEASE_PROPOSED");
    await expect(proposeRelease(db, { chapterId, companyId: carlos().companyId, memberId: director().memberId })).rejects.toThrow(/pendiente de proponer/);
    await expect(confirmRelease(db, { chapterId, companyId: carlos().companyId, memberId: lucia().memberId })).rejects.toThrow(/NS/);
    const r = await confirmRelease(db, { chapterId, companyId: carlos().companyId, memberId: director().memberId });
    expect(r.specialtyName).toBeTruthy();
    const seat = (await db.query.categorySeats.findFirst({ where: eq(schema.categorySeats.id, r.seatId) }))!;
    expect(seat).toMatchObject({ status: "VACANT", companyId: null });
    expect((await db.query.companies.findFirst({ where: eq(schema.companies.id, carlos().companyId) }))!.status).toBe("RELEASED");
    const ev = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "SEAT_RELEASED") });
    expect(ev?.companyIds).toEqual([]);
    await expect(confirmRelease(db, { chapterId, companyId: carlos().companyId, memberId: director().memberId })).rejects.toThrow(/no tiene una baja/);
    // Ya libre, la plaza vuelve a poder ocuparse.
    const again = await onboard(db, { chapterId, name: "Obras Bética", slug: "obras-betica-3", specialtyCode: "OBRA_INDUSTRIAL", person: { fullName: "P", role: "CEO", email: "p3@betica.es" }, dna: SEED_COMPANIES[0].dna, acceptance: acceptAllNormas() });
    expect(again.company.status).toBe("ACTIVE");
  });
});
