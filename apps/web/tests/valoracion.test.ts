/** Valoración mensual (D-046), titularidades múltiples y Mérito de Red (D-047), acciones de dirección (D-048). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { SEED_COMPANIES } from "@/db/seed-data";
import { acceptAllNormas } from "@/core/normas";
import { createSignal, publishSignal } from "@/services/signals";
import { authorizeIntro, decide, markIntroduced, submitVerdict, updateStage } from "@/services/referrals";
import { addSeat, onboardCompany, SeatTakenError } from "@/services/onboarding";
import { compromisoStatus } from "@/services/compromiso";
import { eligibleForEmbajada, valoracionMensual } from "@/services/valoracion";
import { logDirectorAction } from "@/services/direccion";
import { computeValoracion, lastCompletedMonthStart, monthStart, VALORACION } from "@/core/valoracion";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let zoneId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
const lucia = () => companies.guadalquivir;
const carlos = () => companies.hispalis;
const director = () => companies["bufete-alameda"];

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  zoneId = r.zone.id;
  companies = r.companies;
});
afterAll(async () => {
  await closeDb();
});

describe("Valoración · reglas puras", () => {
  it("es un porcentaje explicable: pesos repartidos entre los componentes con datos", () => {
    const v = computeValoracion({ verdictScores: [1, 0.8], weeksMet: 3, weeksEvaluated: 4, onTime: 0, late: 0, directorActions: 0 });
    expect(v.components.filter((c) => c.value !== null).map((c) => c.key)).toEqual(["calidad_cedida", "compromiso"]);
    expect(v.score).toBeCloseTo((0.9 * 0.4 + 0.75 * 0.25) / 0.65, 5);
    expect(v.eligibleEmbajada).toBe(true);
  });
  it("sin datos no hay Valoración ni Embajada", () => {
    const v = computeValoracion({ verdictScores: [], weeksMet: 0, weeksEvaluated: 0, onTime: 0, late: 0, directorActions: 0 });
    expect(v.score).toBeNull();
    expect(v.eligibleEmbajada).toBe(false);
  });
  it("una necesidad falsa vale cero; las acciones de dirección solo suman", () => {
    const bad = computeValoracion({ verdictScores: [0], weeksMet: 4, weeksEvaluated: 4, onTime: 0, late: 0, directorActions: 0 });
    expect(bad.score).toBeCloseTo(0.25 / 0.65, 5);
    const withDir = computeValoracion({ verdictScores: [0.7], weeksMet: 4, weeksEvaluated: 4, onTime: 0, late: 0, directorActions: 3 });
    expect(withDir.score).toBeGreaterThan(computeValoracion({ verdictScores: [0.7], weeksMet: 4, weeksEvaluated: 4, onTime: 0, late: 0, directorActions: 0 }).score!);
    expect(VALORACION.threshold).toBe(0.8);
  });
  it("el mes que decide es el último completo", () => {
    expect(lastCompletedMonthStart(new Date(Date.UTC(2026, 8, 14))).toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(monthStart(new Date(Date.UTC(2026, 8, 14))).toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });
});

describe("Valoración · con datos reales de la Sala", () => {
  it("un Veredicto alto sobre una Cesión cedida entra en la Valoración del mes en curso", async () => {
    const sc = SCENARIOS.A;
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, carlos().companyId), eq(schema.referrals.originatorCompanyId, lucia().companyId)) }))!;
    await decide(db, { referralId: ref.id, memberId: lucia().memberId, decision: "APPROVE" });
    await decide(db, { referralId: ref.id, memberId: carlos().memberId, decision: "APPROVE" });
    const pkg = await authorizeIntro(db, ref.id, lucia().memberId, "COMPANY_AND_CONTACT");
    await markIntroduced(db, ref.id, lucia().memberId, pkg.message);
    await updateStage(db, ref.id, carlos().memberId, "MEETING");
    await updateStage(db, ref.id, carlos().memberId, "WON");
    await submitVerdict(db, { referralId: ref.id, memberId: carlos().memberId, verdict: { ease: 5, business: 4, treatment: 5, result: "WON", value_verified: 60_000, need_was_real: true } });
    const v = await valoracionMensual(db, chapterId, lucia().companyId, monthStart(new Date()));
    const calidad = v.components.find((c) => c.key === "calidad_cedida")!;
    expect(calidad.value).toBeCloseTo(14 / 15, 5);
    expect(v.score).not.toBeNull();
    // El mes que decide (el anterior) no tiene datos: sin Embajada todavía.
    expect((await eligibleForEmbajada(db, chapterId, lucia().companyId)).eligible).toBe(false);
  });

  it("una acción de dirección suma puntos de Valoración solo a un Director/a", async () => {
    await expect(logDirectorAction(db, { chapterId, memberId: lucia().memberId, kind: "INTERCHAPTER", text: "Encuentro con NS Ágora para cruzar plazas vacantes" })).rejects.toThrow(/Director/);
    await expect(logDirectorAction(db, { chapterId, memberId: director().memberId, kind: "QUERY", text: "corto" })).rejects.toThrow(/frase/);
    const r = await logDirectorAction(db, { chapterId, memberId: director().memberId, kind: "INTERCHAPTER", text: "Encuentro con NS Ágora para cruzar plazas vacantes de obra e instalaciones" });
    expect(r.kind).toBe("DIRECTOR_INTERCHAPTER_ACTION");
    const v = await valoracionMensual(db, chapterId, director().companyId, monthStart(new Date()));
    expect(v.components.find((c) => c.key === "servicio_red")!.value).toBeCloseTo(1 / 3, 5);
  });
});

describe("Titularidades múltiples y Mérito de Red (D-047)", () => {
  it("una empresa ocupa otra plaza en la misma Sala y su Compromiso se multiplica", async () => {
    await expect(addSeat(db, { chapterId, companyId: lucia().companyId, specialtyCode: "OBRA_INDUSTRIAL", memberId: lucia().memberId })).rejects.toBeInstanceOf(SeatTakenError);
    await expect(addSeat(db, { chapterId, companyId: lucia().companyId, specialtyCode: "TELECOMUNICACIONES", memberId: carlos().memberId })).rejects.toThrow(/Timonel/);
    const r = await addSeat(db, { chapterId, companyId: lucia().companyId, specialtyCode: "TELECOMUNICACIONES", memberId: lucia().memberId });
    expect(r.seats).toBe(2);
    const seats = await db.query.categorySeats.findMany({ where: and(eq(schema.categorySeats.companyId, lucia().companyId), eq(schema.categorySeats.status, "ACTIVE")) });
    expect(seats).toHaveLength(2);
    const s = await compromisoStatus(db, chapterId, lucia().companyId);
    expect(s.minimum).toBe(2);
    expect(s.label).toMatch(/Por debajo del mínimo · 1 de 2/);
  });

  it("la misma empresa (mismo CIF) en otra Sala de la zona recibe Mérito de Red", async () => {
    await db.update(schema.companies).set({ legalId: "B41000001" }).where(eq(schema.companies.id, lucia().companyId));
    const [agora] = await db.insert(schema.chapters).values({ zoneId, name: "NS Ágora", slug: "ns-agora" }).returning();
    const r = await onboardCompany(db, { chapterId: agora.id, name: "Guadalquivir Norte", slug: "guadalquivir-norte", legalId: "b41000001", specialtyCode: "LOGISTICA", person: { fullName: "Lucía", role: "CEO", email: "lucia@guadalquivir-norte.es" }, dna: SEED_COMPANIES[0].dna, acceptance: acceptAllNormas() });
    expect(r.networkBonus).toBe(true);
    const ev = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, r.company.id), eq(schema.trustEvents.kind, "NETWORK_SEAT_BONUS")) });
    expect(ev?.weight).toBe(50);
    const none = await onboardCompany(db, { chapterId: agora.id, name: "Otra SL", slug: "otra-sl", legalId: "B99999999", specialtyCode: "TELECOMUNICACIONES", person: { fullName: "O", role: "CEO", email: "o@otra.es" }, dna: SEED_COMPANIES[4].dna, acceptance: acceptAllNormas() });
    expect(none.networkBonus).toBe(false);
  });
});
