/** Dinamismo visible (D-073): primer contacto en un toque (F7) y tiempos del Apunte a la Mesa y a la llamada (F9, F10). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { authorizeIntro, decide, markContacted, markIntroduced } from "@/services/referrals";
import { runClock } from "@/services/clock";
import { hoyBoard } from "@/services/hoy";
import { tiemposDinamismo } from "@/services/dinamismo";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
let refId: string;
const H = 3_600_000;
const carlos = () => companies.hispalis;
const lucia = () => companies.guadalquivir;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
  const sc = SCENARIOS.A;
  const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact, thirdPartyExpectsContact: true });
  await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
  const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.originatorCompanyId, lucia().companyId), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
  refId = ref.id;
  await decide(db, { referralId: refId, memberId: lucia().memberId, decision: "APPROVE" });
  await decide(db, { referralId: refId, memberId: carlos().memberId, decision: "APPROVE" });
  await authorizeIntro(db, refId, lucia().memberId, "COMPANY_AND_CONTACT");
  await markIntroduced(db, refId, lucia().memberId, "Os presento.");
});
afterAll(async () => {
  await closeDb();
});

describe("Primer contacto en un toque (F7)", () => {
  it("tras el Puente, el cesionario ve el toque «He contactado» con las horas que le quedan", async () => {
    const b = await hoyBoard(db, { chapterId, companyId: carlos().companyId, member: { id: carlos().memberId, isDirector: false, isNetwork: false } });
    const t = b.toques.find((x) => x.kind === "CONTACTAR")!;
    expect(t.primary).toMatchObject({ label: "He contactado", action: "CONTACTED", payload: { referralId: refId } });
    expect(t.deadline).toMatch(/48 h para contactar/);
  });
  it("a las 24 h sin contacto, el Agente recuerda; a las 48 h, resta; con contacto, ni lo uno ni lo otro", async () => {
    const ref0 = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, refId) }))!;
    const t0 = ref0.introducedAt!.getTime();
    const r24 = await runClock(db, new Date(t0 + 25 * H), chapterId);
    expect(r24.contactReminders).toBe(1);
    expect((await runClock(db, new Date(t0 + 26 * H), chapterId)).contactReminders).toBe(0); // idempotente
    const reminder = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.subjectId, refId), eq(schema.auditEvents.policyApplied, "contact.reminder_24h")) });
    expect(reminder?.companyIds).toEqual([carlos().companyId]);
    await expect(markContacted(db, refId, lucia().memberId)).rejects.toThrow(/cesionario/);
    await markContacted(db, refId, carlos().memberId);
    const ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, refId) }))!;
    expect(ref.contactedAt).toBeInstanceOf(Date);
    const onTime = await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, carlos().companyId), eq(schema.trustEvents.kind, "RESPONSE_ON_TIME")) });
    expect(onTime.some((e) => e.weight === 5 && e.evidenceRef === `referral:${refId}`)).toBe(true);
    const r49 = await runClock(db, new Date(t0 + 49 * H), chapterId);
    expect(r49.late).toBe(0); // contactó: no hay RESPONSE_LATE
    const late = await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, carlos().companyId), eq(schema.trustEvents.kind, "RESPONSE_LATE")) });
    expect(late).toHaveLength(0);
    const b = await hoyBoard(db, { chapterId, companyId: carlos().companyId, member: { id: carlos().memberId, isDirector: false, isNetwork: false } }, new Date(t0 + 49 * H));
    expect(b.toques.some((x) => x.kind === "CONTACTAR")).toBe(false);
    expect(b.contratiempos.some((x) => x.key.startsWith("late-"))).toBe(false);
  });
});

describe("Tiempos visibles (F9, F10)", () => {
  it("mide del Apunte a la llamada y del Apunte a la Mesa; sin datos, null", async () => {
    const t = await tiemposDinamismo(db, { chapterId, since: new Date(Date.now() - 86_400_000) });
    expect(t.contact).toMatchObject({ n: 1 });
    expect(t.contact!.hours).toBeGreaterThanOrEqual(0);
    expect(t.mesa).not.toBeNull();
    expect(t.mesa!.minutes).toBeLessThan(10); // objetivo interno: menos de diez minutos
    const none = await tiemposDinamismo(db, { chapterId, since: new Date(Date.now() + 86_400_000) });
    expect(none).toEqual({ contact: null, mesa: null });
    const red = await tiemposDinamismo(db, { since: new Date(Date.now() - 86_400_000) });
    expect(red.contact?.n).toBe(1);
  });
});

describe("Ceder directo desde el Apunte (F3)", () => {
  it("un Apunte con Interesado avisado y decisor identificado nace en la mesa del cesionario con la Apertura autorizada", async () => {
    const { createApunte } = await import("@/services/apunte");
    const created = await createApunte(db, { companyId: carlos().companyId, memberId: carlos().memberId, who: "Transportes La Campana", need: "renovar la flota de 40 camiones en noviembre y revisar todo su programa de seguros, presupuesto aprobado", contactName: "Julián Roldán", contactRole: "Gerente", relation: "CLIENT", expectsContact: true, notes: "Decide el gerente, con el que tengo trato directo" });
    await publishSignal(db, created.opportunitySignal.id, carlos().memberId);
    const refs = await db.query.referrals.findMany({ where: eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id) });
    const toLucia = refs.find((r) => r.receiverCompanyId === lucia().companyId)!;
    expect(toLucia.state).toBe("RECEIVER_PENDING");
    expect(toLucia.preauthorizedScope).toBe("COMPANY_ONLY");
    expect(toLucia.preauthorizedByMemberId).toBe(carlos().memberId);
    const direct = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.kind, "DIRECT_FROM_APUNTE"), eq(schema.auditEvents.subjectId, toLucia.id)) });
    expect(direct?.result).toMatch(/puede retirarla hasta la Apertura/);
    const decision = await db.query.humanDecisions.findFirst({ where: eq(schema.humanDecisions.referralId, toLucia.id) });
    expect(decision).toMatchObject({ role: "ORIGINATOR", decision: "APPROVE", memberId: carlos().memberId });
    // Sin Interesado avisado, el camino normal: visto bueno del cedente.
    const plain = await createApunte(db, { companyId: carlos().companyId, memberId: carlos().memberId, who: "Frío Andaluz", need: "abrir una nave logística en Huelva, presupuesto de obra aprobado", relation: "CLIENT", expectsContact: false, notes: "Decide el Director General, con el que tengo trato directo" });
    await publishSignal(db, plain.opportunitySignal.id, carlos().memberId);
    const plainRefs = await db.query.referrals.findMany({ where: eq(schema.referrals.opportunitySignalId, plain.opportunitySignal.id) });
    expect(plainRefs.length).toBeGreaterThan(0);
    expect(plainRefs.every((r) => r.state === "ORIGINATOR_PENDING")).toBe(true);
  });
});

describe("Puente desde NS (F4)", () => {
  it("con correo del contacto, base jurídica e Interesado avisado, NS envía el Puente en nombre del cedente con copia a los dos", async () => {
    const { outbox } = await import("@/lib/mail");
    const { canSendIntroFromNS, sendIntroFromNS } = await import("@/services/referrals");
    process.env.NS_MAIL_TRANSPORT = "memory";
    outbox.length = 0;
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: "Mi cliente Metales Alcalá abre una nueva planta en Dos Hermanas en el segundo semestre. 130 empleados. Presupuesto de obra aprobado de 700.000 €. Decide el Director de Operaciones, con el que tengo trato directo.", contactName: "Marta Salguero", contactRole: "Directora de Operaciones", contactEmail: "marta@metalesalcala.example", legalBasisForContact: "LEGITIMATE_INTEREST", thirdPartyExpectsContact: true });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
    const os = (await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, created.opportunitySignal.id) }))!;
    expect(canSendIntroFromNS(os.envelope).ok).toBe(true);
    await expect(sendIntroFromNS(db, ref.id, lucia().memberId, "Hola Marta")).rejects.toThrow(/Apertura autorizada/);
    await decide(db, { referralId: ref.id, memberId: lucia().memberId, decision: "APPROVE", revealScope: "COMPANY_AND_CONTACT" });
    await decide(db, { referralId: ref.id, memberId: carlos().memberId, decision: "APPROVE" });
    // Valor por encima del umbral de la Sala: la Directiva aprueba la excepción y la Apertura anticipada deja el Puente listo.
    if ((await db.query.referrals.findFirst({ where: eq(schema.referrals.id, ref.id) }))!.state === "DIRECTOR_PENDING") await decide(db, { referralId: ref.id, memberId: companies["bufete-alameda"].memberId, decision: "APPROVE" });
    expect((await db.query.referrals.findFirst({ where: eq(schema.referrals.id, ref.id) }))!.state).toBe("INTRO_AUTHORIZED");
    await expect(sendIntroFromNS(db, ref.id, carlos().memberId, "Hola Marta")).rejects.toThrow(/cedente/);
    const r = await sendIntroFromNS(db, ref.id, lucia().memberId, "Hola Marta, te presento a Carlos Ruiz, de Reformas Industriales Híspalis.\n\nUn abrazo, Lucía");
    expect(r.to).toBe("marta@metalesalcala.example");
    expect(r.cc).toContain("carlos@hispalis-industrial.es");
    const mail = outbox.find((m) => m.to === "marta@metalesalcala.example")!;
    expect(mail.replyTo).toBe("lucia@correduriaguadalquivir.es");
    expect(mail.text).toMatch(/Enviado desde NS Network en nombre de Lucía Márquez/);
    expect(mail.text).not.toMatch(/comisi/i);
    const after = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, ref.id) }))!;
    expect(after.state).toBe("INTRODUCED");
    const intro = (await db.query.introductions.findFirst({ where: eq(schema.introductions.referralId, ref.id) }))!;
    expect(intro.channel).toBe("NS_MESSAGE");
    delete process.env.NS_MAIL_TRANSPORT;
    // Sin correo del contacto no se puede: la tarjeta lo dice.
    const other = (await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, refId) }))!.opportunitySignalId) }))!;
    expect(canSendIntroFromNS(other.envelope)).toMatchObject({ ok: false, reason: expect.stringMatching(/sin correo/) });
  });
});

describe("Veredicto exprés (F8)", () => {
  it("un cierre sin Veredicto en 7 días recibe uno provisional del Agente; el cesionario lo matiza y el suyo lo sustituye", async () => {
    const { provisionalVerdict, submitVerdict, updateStage } = await import("@/services/referrals");
    // refId: Carlos contactó; reunión y cierre ganado sin Veredicto.
    await updateStage(db, refId, carlos().memberId, "MEETING");
    await updateStage(db, refId, carlos().memberId, "WON");
    const ref0 = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, refId) }))!;
    const t0 = ref0.closedAt!.getTime();
    expect((await runClock(db, new Date(t0 + 6 * 24 * H), chapterId)).provisionalVerdicts).toBe(0);
    const r = await runClock(db, new Date(t0 + 8 * 24 * H), chapterId);
    expect(r.provisionalVerdicts).toBe(1);
    const v = (await db.query.verdicts.findFirst({ where: eq(schema.verdicts.referralId, refId) }))!;
    expect(v.verdict.provisional).toBe(true);
    expect(v.verdict.result).toBe("WON");
    expect(v.meritOriginator).toBeGreaterThan(0);
    const meritBefore = (await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, lucia().companyId), eq(schema.trustEvents.evidenceRef, `verdict:${v.id}`)) })).length;
    expect(meritBefore).toBeGreaterThan(0);
    expect((await runClock(db, new Date(t0 + 9 * 24 * H), chapterId)).provisionalVerdicts).toBe(0); // idempotente
    await expect(provisionalVerdict(db, refId)).resolves.toMatchObject({ id: v.id });
    // El cesionario matiza: su Veredicto sustituye al provisional y su Mérito.
    await submitVerdict(db, { referralId: refId, memberId: carlos().memberId, verdict: { ease: 5, business: 5, treatment: 5, result: "WON", value_verified: 90_000, need_was_real: true } });
    const final = (await db.query.verdicts.findFirst({ where: eq(schema.verdicts.referralId, refId) }))!;
    expect(final.id).not.toBe(v.id);
    expect(final.verdict.provisional).toBeUndefined();
    expect(await db.query.trustEvents.findMany({ where: eq(schema.trustEvents.evidenceRef, `verdict:${v.id}`) })).toHaveLength(0);
    await expect(submitVerdict(db, { referralId: refId, memberId: carlos().memberId, verdict: { ease: 5, business: 5, treatment: 5, result: "WON", value_verified: 90_000, need_was_real: true } })).rejects.toThrow(/ya tiene Veredicto/);
  });
  it("el valor declarado que el cedente no cuestiona en 7 días queda contrastado por silencio", async () => {
    const v = (await db.query.verdicts.findFirst({ where: eq(schema.verdicts.referralId, refId) }))!;
    const t = v.createdAt.getTime();
    expect((await runClock(db, new Date(t + 6 * 24 * H), chapterId)).valuesBySilence).toBe(0);
    const r = await runClock(db, new Date(t + 8 * 24 * H), chapterId);
    expect(r.valuesBySilence).toBe(1);
    const ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, refId) }))!;
    expect(ref.state).toBe("VALUE_CONFIRMED");
    expect(ref.valueVerified).toBe(90_000);
    const ev = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.kind, "VALUE_CONFIRMED"), eq(schema.auditEvents.subjectId, refId)) });
    expect(ev?.policyApplied).toBe("contrast.silence_7d");
    expect((await runClock(db, new Date(t + 9 * 24 * H), chapterId)).valuesBySilence).toBe(0);
  });
});
