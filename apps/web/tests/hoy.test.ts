/** Hoy (D-070): la pila de toques con el botón dentro y los contratiempos con solución. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { decide } from "@/services/referrals";
import { runClock } from "@/services/clock";
import { hoyBoard } from "@/services/hoy";
import { addWeeks, weekStart } from "@/core/compromiso";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
const H = 3_600_000;
const carlos = () => companies.hispalis;
const lucia = () => companies.guadalquivir;
const member = (c: { memberId: string }, isDirector = false) => ({ id: c.memberId, isDirector, isNetwork: false });

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
  const sc = SCENARIOS.A;
  const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact, thirdPartyExpectsContact: true });
  await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
});
afterAll(async () => {
  await closeDb();
});

describe("Toques", () => {
  it("el cedente ve «Proponer» con el botón dentro y el Comunicado de la semana; el orden es por urgencia", async () => {
    const b = await hoyBoard(db, { chapterId, companyId: lucia().companyId, member: member(lucia()) });
    const kinds = b.toques.map((t) => t.kind);
    expect(kinds[0]).toBe("CESION_PROPUESTA");
    expect(kinds).toContain("COMUNICADO");
    const propose = b.toques.find((t) => t.kind === "CESION_PROPUESTA")!;
    expect(propose.primary).toMatchObject({ label: "Proponer", action: "PROPOSE" });
    expect(propose.deadline).toMatch(/caduca en \d+ h/);
    expect(b.contratiempos).toEqual([]);
  });

  it("al proponer, el cesionario ve «Aceptar»; el cedente lo ve en marcha, no como toque", async () => {
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.originatorCompanyId, lucia().companyId), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
    await decide(db, { referralId: ref.id, memberId: lucia().memberId, decision: "APPROVE", revealScope: "COMPANY_ONLY" });
    const c = await hoyBoard(db, { chapterId, companyId: carlos().companyId, member: member(carlos()) });
    const accept = c.toques.find((t) => t.key === ref.id)!;
    expect(accept.kind).toBe("CESION_RECIBIDA");
    expect(accept.primary).toMatchObject({ label: "Aceptar", action: "ACCEPT", payload: { referralId: ref.id } });
    expect(accept.title).toMatch(/Cesión de Correduría Guadalquivir · \d+ %/);
    const l = await hoyBoard(db, { chapterId, companyId: lucia().companyId, member: member(lucia()) });
    expect(l.toques.some((t) => t.key === ref.id)).toBe(false);
    expect(l.waiting.some((w) => w.id === ref.id)).toBe(true);
  });

  it("una pregunta exprés es el toque más urgente; vencida, pasa a contratiempo y aún se puede responder", async () => {
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.originatorCompanyId, lucia().companyId), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
    await decide(db, { referralId: ref.id, memberId: carlos().memberId, decision: "APPROVE", question: "¿Sabe el Interesado que le vamos a contactar?" });
    const l = await hoyBoard(db, { chapterId, companyId: lucia().companyId, member: member(lucia()) });
    expect(l.toques[0].kind).toBe("PREGUNTA");
    expect(l.toques[0].deadline).toMatch(/responde en \d+ h/);
    // El Reloj vence la pregunta a las 24 h: deja de ser toque y pasa a contratiempo.
    await runClock(db, new Date(Date.now() + 25 * H), chapterId);
    const after = await hoyBoard(db, { chapterId, companyId: lucia().companyId, member: member(lucia()) }, new Date(Date.now() + 25 * H));
    expect(after.toques.some((t) => t.kind === "PREGUNTA")).toBe(false);
    const c = after.contratiempos.find((x) => x.key === `q-${ref.id}`)!;
    expect(c.title).toMatch(/plazo venció/);
    expect(c.actionLabel).toBe("Responder");
  });

  it("semanas sin ceder y un referido caducado por silencio ajeno son contratiempos con salida", async () => {
    const last = addWeeks(weekStart(new Date()), -1);
    await db.insert(schema.contributionWeeks).values({ chapterId, companyId: carlos().companyId, weekStart: last, validCount: 0, distinctSpecialties: 0, missedStreak: 2, action: "DIPLOMATIC_NOTICE" });
    const [ref] = await db.query.referrals.findMany({ where: eq(schema.referrals.originatorCompanyId, lucia().companyId), limit: 1 });
    await db.update(schema.referrals).set({ state: "EXPIRED" }).where(eq(schema.referrals.id, ref.id));
    await db.insert(schema.auditEvents).values({ chapterId, kind: "RELAY_PROPOSED", actorType: "AGENT", actorId: "clock", subjectType: "Referral", subjectId: ref.id, result: "relevo", significant: true, companyIds: [lucia().companyId] });
    const c = await hoyBoard(db, { chapterId, companyId: carlos().companyId, member: member(carlos()) });
    const compromiso = c.contratiempos.find((x) => x.key === "compromiso")!;
    expect(compromiso.title).toMatch(/2 semanas sin una Cesión válida/);
    expect(compromiso.href).toBe("/apunte");
    expect(compromiso.tone).toBe("red");
    const l = await hoyBoard(db, { chapterId, companyId: lucia().companyId, member: member(lucia()) });
    const relay = l.contratiempos.find((x) => x.key === `relay-${ref.id}`)!;
    expect(relay.actionLabel).toBe("Volver a cederlo");
    // Carlos no ve el contratiempo de Lucía.
    expect(c.contratiempos.some((x) => x.key.startsWith("relay-"))).toBe(false);
  });

  it("un Apunte en borrador es un toque con «Publicar en la Sala»", async () => {
    const created = await createSignal(db, { companyId: carlos().companyId, memberId: carlos().memberId, rawContent: "Apunte del Timonel. Metalúrgica del Sur abre planta nueva en Dos Hermanas y contrata 40 empleados.", source: "APUNTE" });
    const c = await hoyBoard(db, { chapterId, companyId: carlos().companyId, member: member(carlos()) });
    const t = c.toques.find((x) => x.key === created.opportunitySignal.id)!;
    expect(t.kind).toBe("APUNTE");
    expect(t.primary).toMatchObject({ action: "PUBLISH_SIGNAL", payload: { id: created.opportunitySignal.id } });
  });
});
