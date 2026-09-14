/** Protocolo IV · Dar la Palabra (D-042): Eco del Interesado y Aval, de principio a fin sobre PGlite en memoria. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { authorizeIntro, decide, markIntroduced, submitVerdict, updateStage } from "@/services/referrals";
import { avalOfCompany, draftEcoRequest, ecoOfReferral, ecoPageContext, markEcoRequested, pendingEcoRequests, publicAvalPage, submitEco, withdrawEcoPublicity } from "@/services/eco";
import { runClock } from "@/services/clock";
import { pendingDecisions, mesaTimeline } from "@/services/today";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Awaited<ReturnType<typeof seedChapter>>["companies"];
let referralId: string;
let token: string;
const D = 86_400_000;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
  const lucia = companies.guadalquivir;
  const carlos = companies.hispalis;
  const sc = SCENARIOS.A;
  const created = await createSignal(db, { companyId: lucia.companyId, memberId: lucia.memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact, thirdPartyExpectsContact: true });
  await publishSignal(db, created.opportunitySignal.id, lucia.memberId);
  const ref = await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, carlos.companyId), eq(schema.referrals.originatorCompanyId, lucia.companyId)) });
  referralId = ref!.id;
  await decide(db, { referralId, memberId: lucia.memberId, decision: "APPROVE" });
  await decide(db, { referralId, memberId: carlos.memberId, decision: "APPROVE" });
});
afterAll(async () => {
  await closeDb();
});

describe("Eco: la voz del Interesado", () => {
  it("antes del Puente no existe invitación y nadie puede pedir el Eco", async () => {
    expect(await ecoOfReferral(db, referralId)).toBeUndefined();
    await expect(draftEcoRequest(db, referralId, companies.hispalis.memberId)).rejects.toThrow(/después del Puente/);
    await expect(submitEco(db, "no-existe", { attention: 5, result: 5, recommend: 5 })).rejects.toThrow(/no válido/);
  });

  it("con el Puente nace la invitación; solo el cesionario redacta la Petición y no puede contener contraprestación", async () => {
    const pkg = await authorizeIntro(db, referralId, companies.guadalquivir.memberId, "COMPANY_AND_CONTACT");
    await markIntroduced(db, referralId, companies.guadalquivir.memberId, pkg.message);
    const inv = await ecoOfReferral(db, referralId);
    expect(inv?.status).toBe("PENDING");
    expect(inv?.token).toHaveLength(48);
    token = inv!.token;
    await expect(draftEcoRequest(db, referralId, companies.guadalquivir.memberId)).rejects.toThrow(/Solo el cesionario/);
    const draft = await draftEcoRequest(db, referralId, companies.hispalis.memberId);
    expect(draft.message).toContain(`/eco/${token}`);
    expect(draft.message).toMatch(/Rafael/); // Apertura con contacto: el Agente saluda por el nombre
    expect(draft.message).not.toMatch(/comisi/i);
    await expect(markEcoRequested(db, referralId, companies.hispalis.memberId, "Si nos valoras bien te hago un descuento si me recomiendas")).rejects.toThrow(/D-010/);
    const sent = await markEcoRequested(db, referralId, companies.hispalis.memberId, draft.message);
    expect(sent.status).toBe("SENT");
    const ev = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, companies.hispalis.companyId), eq(schema.trustEvents.kind, "ECO_REQUEST_SENT")) });
    expect(ev).toBeTruthy();
  });

  it("la página pública solo muestra la capa 0 y los nombres; el Interesado deja un Eco DURANTE sin ver el Veredicto", async () => {
    const ctx = await ecoPageContext(db, token);
    expect(ctx?.receiverName).toBe("Reformas Industriales Híspalis");
    expect(ctx?.originatorName).toBe("Correduría Guadalquivir");
    expect(ctx?.needSummary).not.toMatch(/Metalúrgica|Rafael/);
    expect(ctx?.phase).toBe("DURANTE");
    expect(Object.keys(ctx!)).not.toContain("verdict");
    const out = await submitEco(db, token, { attention: 4, result: 3, recommend: 4, comment: "Nos llamaron el mismo día.", public_consent: false });
    expect(out.phase).toBe("DURANTE");
    expect(out.aval.status).toBe("PROVISIONAL");
    expect(out.aval.parts.find((p) => p.key === "eco")?.value).toBeCloseTo((0.75 + 0.5 + 0.75) / 3, 5);
    expect(out.merit.receiver).toBeGreaterThan(0);
    expect(out.merit.originator).toBeGreaterThan(0);
    const ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) }))!;
    expect(ref.avalStatus).toBe("PROVISIONAL");
    // Sin consentimiento no hay evento público en la Crónica
    const timeline = await mesaTimeline(db, chapterId, companies["prl-andaluza"].companyId);
    expect(timeline.some((e) => e.kind === "ECO_PUBLISHED")).toBe(false);
    expect(timeline.some((e) => e.kind === "ECO_RECEIVED")).toBe(false); // privado para las dos partes
  });

  it("tras el Veredicto el Aval es provisional; el Eco FINAL con consentimiento lo deja firme y llega a la Crónica", async () => {
    await updateStage(db, referralId, companies.hispalis.memberId, "MEETING");
    const v = await submitVerdict(db, { referralId, memberId: companies.hispalis.memberId, verdict: { ease: 5, business: 4, treatment: 5, result: "WON", value_verified: 38_000, need_was_real: true } });
    expect(v.aval.status).toBe("PROVISIONAL"); // el Eco DURANTE no cierra el Aval: falta la palabra final
    const ctx = await ecoPageContext(db, token);
    expect(ctx?.phase).toBe("FINAL");
    const before = (await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, companies.hispalis.companyId), eq(schema.trustEvents.kind, "ECO_MERIT")) })).reduce((a, e) => a + e.weight, 0);
    const out = await submitEco(db, token, { attention: 5, result: 5, recommend: 5, comment: "La obra terminó en plazo y sin parar la producción.", public_consent: true, display_name: "Metalúrgica del Sur" });
    expect(out.phase).toBe("FINAL");
    expect(out.aval.status).toBe("FIRME");
    expect(out.aval.total).toBeGreaterThanOrEqual(85);
    const after = (await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, companies.hispalis.companyId), eq(schema.trustEvents.kind, "ECO_MERIT")) })).reduce((a, e) => a + e.weight, 0);
    expect(after).toBeGreaterThan(before); // la revisión suma solo la diferencia
    const inv = (await ecoOfReferral(db, referralId))!;
    expect(inv.history).toHaveLength(1);
    expect(inv.history[0].phase).toBe("DURANTE");
    const timeline = await mesaTimeline(db, chapterId, companies["prl-andaluza"].companyId);
    const pub = timeline.find((e) => e.kind === "ECO_PUBLISHED");
    expect(pub?.result).toMatch(/Metalúrgica del Sur avala públicamente a Reformas Industriales Híspalis/);
  });

  it("el Aval del titular explica sus cuatro bloques y muestra el Eco público; retirar el consentimiento lo oculta sin borrarlo", async () => {
    const aval = await avalOfCompany(db, chapterId, companies.hispalis.companyId);
    expect(aval.blocks).toHaveLength(4);
    expect(aval.blocks.find((b) => b.key === "voice")?.hasData).toBe(true);
    expect(aval.ecosCount).toBe(1);
    expect(aval.publicEcos).toHaveLength(1);
    expect(aval.publicEcos[0].displayName).toBe("Metalúrgica del Sur");
    expect(aval.provisional).toBe(true); // un solo hecho firme
    // Página pública del Aval (matiz del fundador): nombre y valoración, sin datos de contacto de nadie
    const pub = (await publicAvalPage(db, "hispalis"))!;
    expect(pub.companyName).toBe("Reformas Industriales Híspalis");
    expect(pub.total).toBe(aval.total);
    expect(pub.ecos).toEqual([expect.objectContaining({ displayName: "Metalúrgica del Sur", score: 100 })]);
    const flat = JSON.stringify(pub);
    expect(flat).not.toMatch(/@|https?:\/\/|Carlos Ruiz|Rafael|referralId|token|\bid\b/);
    expect(await publicAvalPage(db, "no-existe")).toBeNull();
    const cedente = await avalOfCompany(db, chapterId, companies.guadalquivir.companyId);
    expect(cedente.blocks.find((b) => b.key === "given_quality")?.hasData).toBe(true);
    await withdrawEcoPublicity(db, token);
    const again = await avalOfCompany(db, chapterId, companies.hispalis.companyId);
    expect(again.publicEcos).toHaveLength(0);
    expect(again.ecosCount).toBe(1);
  });
});

describe("Reloj del Protocolo IV y número pendiente", () => {
  let closedId: string;
  it("una Cesión cerrada sin Petición de Eco espera el toque del cesionario y cuenta en el icono", async () => {
    const lucia = companies.guadalquivir;
    const created = await createSignal(db, { companyId: lucia.companyId, memberId: lucia.memberId, rawContent: "Mi cliente Bodegas Alcor abre nueva sede en Utrera en Q1 con 30 empleados nuevos. Presupuesto aprobado. Decide el gerente." });
    const res = await publishSignal(db, created.opportunitySignal.id, lucia.memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, companies.hispalis.companyId), eq(schema.referrals.id, res.referralIds[0])) })) ?? (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, companies.hispalis.companyId), eq(schema.referrals.state, "ORIGINATOR_PENDING")) }));
    closedId = ref!.id;
    await decide(db, { referralId: closedId, memberId: lucia.memberId, decision: "APPROVE" });
    await decide(db, { referralId: closedId, memberId: companies.hispalis.memberId, decision: "APPROVE" });
    const pkg = await authorizeIntro(db, closedId, lucia.memberId, "COMPANY_ONLY");
    await markIntroduced(db, closedId, lucia.memberId, pkg.message);
    await updateStage(db, closedId, companies.hispalis.memberId, "MEETING");
    await updateStage(db, closedId, companies.hispalis.memberId, "LOST");
    const pend = await pendingEcoRequests(db, chapterId, companies.hispalis.companyId);
    expect(pend.map((r) => r.id)).toContain(closedId);
    const p = await pendingDecisions(db, chapterId, companies.hispalis.companyId, { isDirector: false });
    expect(p.ecos).toBeGreaterThanOrEqual(1);
    expect(p.total).toBe(p.referrals + p.apuntes + p.ecos + p.candidacies);
  });

  it("empuja a los 3 días, marca incumplimiento a los 14 y cierra la ventana a los 30 sin que ningún Agente escriba al Interesado", async () => {
    const ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, closedId) }))!;
    const t3 = new Date(ref.closedAt!.getTime() + 3 * D + 1000);
    const r1 = await runClock(db, t3, chapterId);
    expect(r1.eco.nudges).toBe(1);
    expect((await runClock(db, t3, chapterId)).eco.nudges).toBe(0); // idempotente
    const t14 = new Date(ref.closedAt!.getTime() + 14 * D + 1000);
    const r2 = await runClock(db, t14, chapterId);
    expect(r2.eco.missed).toBe(1);
    const missed = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, companies.hispalis.companyId), eq(schema.trustEvents.kind, "ECO_REQUEST_MISSED")) });
    expect(missed?.weight).toBeLessThan(0);
    const t30 = new Date(ref.closedAt!.getTime() + 31 * D);
    const r3 = await runClock(db, t30, chapterId);
    expect(r3.eco.windowsClosed).toBeGreaterThanOrEqual(1);
    const inv = (await ecoOfReferral(db, closedId))!;
    expect(inv.windowClosedAt).toBeInstanceOf(Date);
    await expect(submitEco(db, inv.token, { attention: 5, result: 5, recommend: 5 })).rejects.toThrow(/ventana/);
    const events = (await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.subjectId, closedId) })).filter((e) => ["ECO_NUDGE", "ECO_REQUEST_MISSED", "ECO_FOLLOW_UP"].includes(e.kind));
    expect(events.length).toBe(2);
    expect(events.every((e) => e.companyIds.length === 1 && e.companyIds[0] === companies.hispalis.companyId)).toBe(true); // el empujón lo recibe el Timonel cesionario, nadie más
  });
});
