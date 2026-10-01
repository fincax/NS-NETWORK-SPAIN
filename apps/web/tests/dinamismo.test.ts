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
