/** Brújula (Protocolo III, D-072): cuatro bloques con evidencia real y Movimientos accionables con descarte por motivo. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { authorizeIntro, confirmValue, decide, markIntroduced, submitVerdict, updateStage } from "@/services/referrals";
import { createDemand } from "@/services/demands";
import { brujula, dismissMove } from "@/services/brujula";
import { addWeeks, weekStart } from "@/core/compromiso";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
const carlos = () => companies.hispalis;
const lucia = () => companies.guadalquivir;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
});
afterAll(async () => {
  await closeDb();
});

describe("Brújula", () => {
  it("sin historial, lo dice; los Movimientos salen de hechos (Encargos de la Sala que encajan con el ADN)", async () => {
    await createDemand(db, { companyId: lucia().companyId, memberId: lucia().memberId, text: "Busco empresas industriales que abran sede o planta en Sevilla", trigger: "NEW_SITE" });
    const b = await brujula(db, { chapterId, companyId: carlos().companyId });
    expect(b.porque[0].text).toMatch(/sin datos suficientes/);
    expect(b.movimientosObjetivo).toBe(3);
    const offer = b.movimientos.find((m) => m.kind === "OFRECER")!;
    expect(offer.title).toMatch(/Ofrecer a Correduría Guadalquivir/);
    expect(offer.href).toBe("/apunte");
    expect(offer.confidence).toBe("MEDIA");
    const know = b.movimientos.find((m) => m.kind === "CONOCER");
    expect(know?.title).toMatch(/nunca le has cedido/);
    expect(b.ganas.cuota.tier).toBe("ENTRADA");
    expect(b.ganas.merit).toBe(0);
  });

  it("un Apunte en borrador es el primer Movimiento, con «Publicar» en un toque", async () => {
    const created = await createSignal(db, { companyId: carlos().companyId, memberId: carlos().memberId, rawContent: "Apunte del Timonel. Metalúrgica del Sur abre planta nueva en Dos Hermanas y contrata 40 empleados.", source: "APUNTE" });
    const b = await brujula(db, { chapterId, companyId: carlos().companyId });
    expect(b.movimientos[0]).toMatchObject({ kind: "CEDER", origin: "Apunte", primary: { action: "PUBLISH_SIGNAL", payload: { id: created.opportunitySignal.id } } });
  });

  it("descartar con motivo retira el Movimiento catorce días; sin motivo, no", async () => {
    const before = await brujula(db, { chapterId, companyId: carlos().companyId });
    const offer = before.movimientos.find((m) => m.kind === "OFRECER")!;
    await expect(dismissMove(db, { chapterId, companyId: carlos().companyId, memberId: carlos().memberId, key: offer.key, reason: "" })).rejects.toThrow(/motivo/);
    await dismissMove(db, { chapterId, companyId: carlos().companyId, memberId: carlos().memberId, key: offer.key, reason: "NO_CONOZCO" });
    const after = await brujula(db, { chapterId, companyId: carlos().companyId });
    expect(after.movimientos.some((m) => m.key === offer.key)).toBe(false);
    // El descarte de Carlos no afecta a Lucía (la Brújula es COMPANY_ONLY).
    const ev = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "MOVE_DISMISSED") });
    expect(ev?.significant).toBe(false);
    expect(ev?.companyIds).toEqual([carlos().companyId]);
  });

  it("con historial, el «por qué» usa evidencia: aceptación frente a la Sala, cierres y Veredictos", async () => {
    const sc = SCENARIOS.A;
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact, thirdPartyExpectsContact: true });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.originatorCompanyId, lucia().companyId), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
    await decide(db, { referralId: ref.id, memberId: lucia().memberId, decision: "APPROVE" });
    await decide(db, { referralId: ref.id, memberId: carlos().memberId, decision: "APPROVE" });
    await authorizeIntro(db, ref.id, lucia().memberId, "COMPANY_AND_CONTACT");
    await markIntroduced(db, ref.id, lucia().memberId, "Os presento.");
    await updateStage(db, ref.id, carlos().memberId, "MEETING");
    await submitVerdict(db, { referralId: ref.id, memberId: carlos().memberId, verdict: { ease: 5, business: 4, treatment: 5, result: "WON", value_verified: 80_000, need_was_real: true } });
    // Ganada y sin contrastar: Movimiento «Contrastar» para las dos partes.
    const pending = await brujula(db, { chapterId, companyId: carlos().companyId });
    expect(pending.movimientos.some((m) => m.key === `confirm-${ref.id}`)).toBe(true);
    await confirmValue(db, ref.id, lucia().memberId);
    const l = await brujula(db, { chapterId, companyId: lucia().companyId });
    expect(l.porque.map((p) => p.text).join(" ")).toMatch(/se aceptan al 100 %/);
    expect(l.porque.map((p) => p.text).join(" ")).toMatch(/Reformas Industriales Híspalis cierran en \d+ días/);
    expect(l.porque.map((p) => p.text).join(" ")).toMatch(/Facilidad media 5\.0/);
    expect(l.porque.map((p) => p.text).join(" ")).toMatch(/nueva sede/);
    expect(l.donde.das.valueTotal).toBe(80_000);
    expect(l.ganas.merit).toBeGreaterThan(0);
    const c = await brujula(db, { chapterId, companyId: carlos().companyId });
    expect(c.donde.recibes.valueTotal).toBe(80_000);
    expect(c.ganas.cuota.valueReceivedYear).toBe(80_000);
  });

  it("tras una semana sin ceder, el Agente propone cinco Movimientos", async () => {
    await db.insert(schema.contributionWeeks).values({ chapterId, companyId: carlos().companyId, weekStart: addWeeks(weekStart(new Date()), -1), validCount: 0, distinctSpecialties: 0, missedStreak: 1, action: "MISSED" });
    const b = await brujula(db, { chapterId, companyId: carlos().companyId });
    expect(b.movimientosObjetivo).toBe(5);
  });
});
