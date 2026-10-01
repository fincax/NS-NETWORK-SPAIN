/** La Brújula (Protocolo III, D-071): dónde estás, por qué (evidencia real), qué ganas y Movimientos de un toque. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { brujula, dismissMove } from "@/services/brujula";
import { createApunte } from "@/services/apunte";
import { createSignal, publishSignal } from "@/services/signals";
import { decide } from "@/services/referrals";
import { draftComunicados } from "@/services/comunicados";
import { createDemand } from "@/services/demands";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";
process.env.NS_LATIDO = "off";

let db: Db;
let chapterId: string;
let companies: Awaited<ReturnType<typeof seedChapter>>["companies"];
const TUESDAY = new Date("2026-10-06T08:00:00Z");

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
  const carlos = () => companies.hispalis;
  const lucia = () => companies.guadalquivir;
  const member = () => ({ id: carlos().memberId, isDirector: false });

  it("sin datos dice dónde estás sin juzgar, y lo que gana es concreto", async () => {
    const b = await brujula(db, chapterId, carlos().companyId, member(), TUESDAY);
    expect(b.donde.compromiso).toMatch(/0 de 1 Cesión válida/);
    expect(b.donde.tone).toBe("amber");
    expect(b.porque[0]).toMatch(/Aún no hay suficientes/);
    expect(b.ganas.some((g) => /Mérito de Promesa/.test(g))).toBe(true);
    expect(b.ganas.some((g) => /Cuota: Tramo de entrada/.test(g))).toBe(true);
    expect(b.target).toBe(3);
    expect(b.escalera).toBeNull();
  });

  it("un Apunte en borrador es el primer Movimiento cuando el Compromiso no está cumplido, y cuenta para él", async () => {
    await createApunte(db, { companyId: carlos().companyId, memberId: carlos().memberId, who: "Talleres Guadaíra", need: "Abren una segunda nave en Alcalá de Guadaíra en enero y necesitan proyecto y obra", contactName: "Pepe Guadaíra", contactRole: "gerente", notes: "Me lo contó él mismo", expectsContact: true });
    await draftComunicados(db, chapterId, TUESDAY);
    const b = await brujula(db, chapterId, carlos().companyId, member(), TUESDAY);
    expect(b.movimientos.length).toBeGreaterThanOrEqual(2);
    expect(b.movimientos[0].kind).toBe("CEDER");
    expect(b.movimientos[0].source).toBe("APUNTE");
    expect(b.movimientos[0].countsForCompromiso).toBe(true);
    expect(b.movimientos[0].action.type).toBe("PUBLISH_SIGNAL");
    expect(b.movimientos.some((m) => m.kind === "DAR_A_CONOCER" && m.action.type === "APPROVE_COMUNICADO")).toBe(true);
    expect(b.movimientos.length).toBeLessThanOrEqual(b.target);
  });

  it("una Cesión que espera tu decisión es un Movimiento «Aceptar»; descartarlo con motivo lo retira 7 días", async () => {
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: "Mi cliente Envases del Aljarafe, empresa industrial de 120 empleados, abre una nueva nave industrial en Dos Hermanas en Q2 con 70 empleados nuevos. Presupuesto de obra aprobado de 600.000 €. Decide el Director General, con el que tengo trato directo." });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
    await decide(db, { referralId: ref.id, memberId: lucia().memberId, decision: "APPROVE" });
    const b = await brujula(db, chapterId, carlos().companyId, member(), TUESDAY);
    const accept = b.movimientos.find((m) => m.key === `accept:${ref.id}`);
    expect(accept).toBeTruthy();
    expect(accept!.action).toEqual({ type: "ACCEPT_REFERRAL", referralId: ref.id });
    await dismissMove(db, { chapterId, companyId: carlos().companyId, memberId: carlos().memberId, key: `accept:${ref.id}`, reason: "No procede" });
    const after = await brujula(db, chapterId, carlos().companyId, member(), TUESDAY);
    expect(after.movimientos.some((m) => m.key === `accept:${ref.id}`)).toBe(false);
    // Para Lucía, la misma Cesión no es un Movimiento: ya hizo su parte y espera a Carlos
    const l = await brujula(db, chapterId, lucia().companyId, { id: lucia().memberId, isDirector: false });
    expect(l.movimientos.every((m) => m.key !== `accept:${ref.id}` && m.key !== `propose:${ref.id}`)).toBe(true);
  });

  it("el bloque «por qué» usa evidencia real: una Cesión declinada con motivo aparece con su motivo", async () => {
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: "Mi cliente Cerámicas Bajo Guadalquivir, empresa industrial de 90 empleados, abre una nueva nave industrial en Alcalá de Guadaíra en Q1 con 40 empleados nuevos. Presupuesto de obra aprobado de 500.000 €. Decide el gerente, con el que tengo trato directo." });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
    await decide(db, { referralId: ref.id, memberId: lucia().memberId, decision: "APPROVE" });
    await decide(db, { referralId: ref.id, memberId: carlos().memberId, decision: "REJECT", notes: "Sin decisor identificado." });
    const l = await brujula(db, chapterId, lucia().companyId, { id: lucia().memberId, isDirector: false }, TUESDAY);
    expect(l.porque.some((p) => /declinó tu última Cesión: «Sin decisor identificado\./.test(p))).toBe(true);
  });

  it("un Encargo de otro titular sobre tu clientela se propone como Movimiento «Apuntar»", async () => {
    await createDemand(db, { companyId: companies.securenet.companyId, memberId: companies.securenet.memberId, text: "Industriales que abren sede nueva en el área de Sevilla", industry: "Industrial" });
    const b = await brujula(db, chapterId, carlos().companyId, member(), TUESDAY);
    const demand = b.movimientos.find((m) => m.source === "ENCARGO");
    expect(demand).toBeTruthy();
    expect(demand!.action).toEqual({ type: "LINK", href: "/apunte" });
    expect(demand!.countsForCompromiso).toBe(true);
  });
});
