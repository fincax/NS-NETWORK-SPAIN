/** Latido de la Sala de demostración (D-057): un Indicio por franja, Cesiones ficticias que avanzan, el Timonel manda. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { currentSlot, LATIDO_DELAYS_H, LATIDO_INDICIOS, latidoEnabled, latidoStatus, protagonistSlug, runLatido } from "@/agents/latido";
import { createSignal, publishSignal } from "@/services/signals";
import { onboardCompany } from "@/services/onboarding";
import { acceptAllNormas } from "@/core/normas";
import { getProvider } from "@/agents/provider";
import { GET as jobsRoute } from "@/app/api/jobs/route";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
const env = process.env as Record<string, string | undefined>;

// Un momento fijo: martes 15 de septiembre de 2026, 13:30 hora de Madrid (11:30 UTC).
const T0 = new Date("2026-09-15T11:30:00Z");
const hours = (h: number) => new Date(T0.getTime() + h * 3_600_000);
/** Pasadas sucesivas del Latido en el mismo instante hasta que ninguna Cesión ficticia tenga nada que avanzar (máx. 4 por pasada). */
async function settle(now: Date) {
  let total = 0;
  for (let i = 0; i < 60; i++) {
    const r = await runLatido(db, { now });
    total += r.advanced.length;
    if (r.advanced.length === 0) break;
  }
  return total;
}

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
  env.NS_LATIDO = "on";
});
afterAll(async () => {
  delete env.NS_LATIDO;
  await closeDb();
});

describe("Interruptor", () => {
  it("apagado en las pruebas y con cuentas reales, salvo NS_LATIDO=on; NS_LATIDO=off manda siempre", () => {
    const saved = { latido: env.NS_LATIDO, auth: env.NS_AUTH_MODE };
    delete env.NS_LATIDO;
    expect(latidoEnabled()).toBe(false); // NODE_ENV=test
    env.NS_LATIDO = "on";
    expect(latidoEnabled()).toBe(true);
    env.NS_AUTH_MODE = "real";
    expect(latidoEnabled()).toBe(true); // pedido expresamente
    env.NS_LATIDO = "off";
    expect(latidoEnabled()).toBe(false);
    env.NS_LATIDO = saved.latido;
    if (saved.auth === undefined) delete env.NS_AUTH_MODE; else env.NS_AUTH_MODE = saved.auth;
  });
  it("sin Latido, la pasada no toca nada", async () => {
    env.NS_LATIDO = "off";
    const r = await runLatido(db, { now: T0 });
    expect(r).toEqual({ enabled: false, slot: null, indicio: null, advanced: [] });
    env.NS_LATIDO = "on";
  });
});

describe("Franjas", () => {
  it("las franjas siguen la hora de Madrid y antes de las 9:00 no hay franja", () => {
    expect(currentSlot(new Date("2026-09-15T11:30:00Z"))).toBe("2026-09-15T13");
    expect(currentSlot(new Date("2026-09-15T07:05:00Z"))).toBe("2026-09-15T09");
    expect(currentSlot(new Date("2026-09-15T16:00:00Z"))).toBe("2026-09-15T18");
    expect(currentSlot(new Date("2026-09-15T22:30:00Z"))).toBeNull(); // 00:30 Madrid del día 16: noche, sin franja
    expect(currentSlot(new Date("2026-09-15T05:00:00Z"))).toBeNull(); // 07:00 Madrid
  });
});

describe("Un Indicio por franja", () => {
  it("la primera pasada de la franja publica un Indicio del banco y la segunda no repite", async () => {
    const before = await db.query.opportunitySignals.findMany({ where: eq(schema.opportunitySignals.chapterId, chapterId) });
    const r1 = await runLatido(db, { now: T0 });
    expect(r1.enabled).toBe(true);
    expect(r1.slot).toBe("2026-09-15T13");
    expect(r1.indicio?.key).toBe(LATIDO_INDICIOS[0].key);
    expect(r1.indicio?.queued).toBe(false);
    expect(r1.indicio!.referrals).toBeGreaterThan(0);
    const r2 = await runLatido(db, { now: hours(0.5) });
    expect(r2.indicio).toBeNull();
    const after = await db.query.opportunitySignals.findMany({ where: eq(schema.opportunitySignals.chapterId, chapterId) });
    expect(after.length - before.length).toBe(1);
    const published = after.find((o) => !before.some((b) => b.id === o.id))!;
    expect(published.status).toBe("PUBLISHED");
    expect(published.originatorCompanyId).not.toBe(companies[protagonistSlug()].companyId);
  });
  it("la franja siguiente toma el siguiente Indicio del banco; la Mesa lo anuncia con el nombre de la empresa ficticia", async () => {
    const r = await runLatido(db, { now: hours(5) }); // 18:30 Madrid
    expect(r.slot).toBe("2026-09-15T18");
    expect(r.indicio?.key).toBe(LATIDO_INDICIOS[1].key);
    const events = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.kind, "SIGNAL_PUBLISHED")) });
    expect(events.some((e) => e.result.includes(r.indicio!.originator))).toBe(true);
    const latidos = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.kind, "LATIDO") });
    expect(latidos.every((e) => e.significant === false)).toBe(true); // no ensucia la Mesa
  });
  it("«Latir ahora» fuerza un Indicio fuera de franja", async () => {
    const r = await runLatido(db, { now: hours(5.1), force: true });
    expect(r.slot).toMatch(/^manual:/);
    expect(r.indicio?.key).toBe(LATIDO_INDICIOS[2].key);
  });
  it("la protagonista recibe Cesiones del Latido y nadie decide por ella", async () => {
    // El primer Indicio (traslado de planta) es para la protagonista, entre otros.
    const mine = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.receiverCompanyId, companies[protagonistSlug()].companyId)) });
    expect(mine.length).toBeGreaterThan(0);
    // Pasan días: las demás avanzan; las suyas siguen esperando a su Timonel (hasta que el Reloj las caduque).
    expect(await settle(hours(24 * 10))).toBeGreaterThan(0);
    const mineAfter = await db.query.referrals.findMany({ where: inArray(schema.referrals.id, mine.map((m) => m.id)) });
    expect(mineAfter.every((m) => ["ORIGINATOR_PENDING", "RECEIVER_PENDING"].includes(m.state))).toBe(true);
    const decisions = await db.query.humanDecisions.findMany({ where: inArray(schema.humanDecisions.referralId, mine.map((m) => m.id)) });
    expect(decisions.every((d) => d.memberId !== companies[protagonistSlug()].memberId)).toBe(true);
  });
});

describe("Las Cesiones ficticias avanzan con plazos", () => {
  it("nada avanza antes de su plazo; después, un paso por pasada, con eventos humanos de los Timoneles ficticios", async () => {
    const others = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), inArray(schema.referrals.state, ["VALUE_CONFIRMED", "WON", "LOST", "NO_DECISION", "INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY"])) });
    expect(others.length).toBeGreaterThan(0);
    // Ninguna Cesión avanzada es de la protagonista
    const p = companies[protagonistSlug()].companyId;
    expect(others.every((r) => r.receiverCompanyId !== p && r.originatorCompanyId !== p)).toBe(true);
    // Todas las transiciones humanas las firmó una persona real de la semilla, nunca el sistema
    const transitions = await db.query.referralTransitions.findMany({ where: inArray(schema.referralTransitions.referralId, others.map((r) => r.id)) });
    const human = transitions.filter((t) => ["RECEIVER_PENDING", "APPROVED", "INTRO_AUTHORIZED", "INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY", "WON", "VALUE_CONFIRMED"].includes(t.toState));
    expect(human.length).toBeGreaterThan(0);
    expect(human.every((t) => t.actorType === "USER")).toBe(true);
  });
  it("un Indicio recién publicado no avanza en la misma pasada aunque haya franja", async () => {
    const r = await runLatido(db, { now: hours(24 * 30), force: true });
    const fresh = r.indicio ? await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.state, "ORIGINATOR_PENDING")) }) : [];
    expect(r.advanced.every((a) => !fresh.some((f) => f.id === a.referralId))).toBe(true);
    expect(LATIDO_DELAYS_H.ORIGINATOR_PENDING).toBeGreaterThanOrEqual(1);
  });
  it("con el tiempo, la Balanza de la Sala tiene valor contrastado y Distinciones sin tocar la protagonista", async () => {
    await settle(hours(24 * 40));
    const confirmed = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.state, "VALUE_CONFIRMED")) });
    expect(confirmed.length).toBeGreaterThan(0);
    expect(confirmed.every((r) => (r.valueVerified ?? 0) > 0)).toBe(true);
    const recognitions = await db.query.recognitions.findMany({ where: eq(schema.recognitions.chapterId, chapterId) });
    expect(recognitions.length).toBeGreaterThanOrEqual(1);
  });
  it("nunca decide por una empresa ajena a la semilla (una empresa de prueba dada de alta por el fundador)", async () => {
    const securenet = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companies.securenet.companyId) }))!.dna;
    const r = await onboardCompany(db, { chapterId, name: "Redes de Prueba", slug: "redes-de-prueba", specialtyCode: "TELECOMUNICACIONES", person: { fullName: "Ana Prueba", role: "CEO", email: "ana@redesdeprueba.es" }, dna: { ...securenet, commercial: { ...securenet.commercial, ticket_min: 2_000 } }, acceptance: acceptAllNormas() });
    const c = companies.guadalquivir;
    const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: "Mi cliente Cristalerías Alcores abre una nueva sede en Sevilla en marzo con 60 empleados. Presupuesto aprobado, cifra por cerrar. Decide el gerente, con el que tengo trato directo." });
    const res = await publishSignal(db, created.opportunitySignal.id, c.memberId);
    const toNew = (await db.query.referrals.findMany({ where: eq(schema.referrals.receiverCompanyId, r.company.id) }));
    expect(toNew.length).toBe(1);
    expect(res.referralIds).toContain(toNew[0].id);
    await settle(hours(24 * 60));
    const after = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, toNew[0].id) }))!;
    expect(after.state).toBe("RECEIVER_PENDING"); // el cedente ficticio dio el visto bueno; la empresa de prueba decide ella
    const decisions = await db.query.humanDecisions.findMany({ where: eq(schema.humanDecisions.referralId, toNew[0].id) });
    expect(decisions.every((d) => d.memberId !== r.member.id)).toBe(true);
  });
});

describe("Banco de Indicios", () => {
  it("cada Indicio del banco produce al menos una necesidad para otra especialidad, y la protagonista nunca cede", async () => {
    const provider = await getProvider();
    const specialties = (await db.query.specialties.findMany()).map((s) => ({ code: s.nscatCode, name: s.name, description: s.description }));
    const keys = new Set<string>();
    for (const i of LATIDO_INDICIOS) {
      expect(keys.has(i.key)).toBe(false);
      keys.add(i.key);
      expect(i.originator).not.toBe(protagonistSlug());
      expect(companies[i.originator]).toBeDefined();
      const dna = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companies[i.originator].companyId) }))!.dna;
      const out = await provider.extractSignal({ rawContent: i.rawContent, originatorDna: dna, availableSpecialties: specialties, defaultCity: "Sevilla" });
      expect(out.needs.length, i.key).toBeGreaterThan(0);
      expect(out.chapter_layer.need_summary, i.key).not.toMatch(/Conservas|Marisma|Cárnicas|Guadaíra S|Bodegas|Talleres|Aeroestructuras|Clínica Nervión|Frío Andaluz|Panificadora|Envases|Transportes La|Aceites|Hormigones|Laboratorios|Ingeniería Sur|Meridional|Muebles Sevillanos|Metales Alcalá|Cooperativa|Cervezas/);
    }
  });
  it("la mayoría de los Indicios del banco generan Cesiones; los flojos, no", async () => {
    let withReferrals = 0;
    for (const i of LATIDO_INDICIOS.filter((x) => !x.visibility)) {
      const c = companies[i.originator];
      const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: i.rawContent, contactName: i.contactName, contactRole: i.contactRole, legalBasisForContact: i.legalBasisForContact, thirdPartyExpectsContact: i.thirdPartyExpectsContact ?? false });
      const res = await publishSignal(db, created.opportunitySignal.id, c.memberId);
      if (res.referralIds.length > 0) withReferrals++;
      if (i.key === "autonomo-marca-antivirus") expect(res.referralIds.length).toBe(0);
      if (i.key === "asesoria-segunda-oficina") expect(res.discarded.find((d) => d.company === "Mobiliario Delta")?.code).toBe("TICKET_MISMATCH");
    }
    expect(withReferrals).toBeGreaterThanOrEqual(Math.floor(LATIDO_INDICIOS.length * 0.75));
  });
});

describe("GET /api/jobs", () => {
  it("devuelve el Latido junto al drenaje de la cola", async () => {
    const saved = env.CRON_SECRET;
    delete env.CRON_SECRET;
    const res = await jobsRoute(new Request("http://ns.test/api/jobs"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { done: number; latido: { enabled: boolean } };
    expect(body.latido.enabled).toBe(true);
    env.CRON_SECRET = saved;
    const st = await latidoStatus(db);
    expect(st.lastAt).toBeInstanceOf(Date);
    expect(st.protagonistName).toBe("Reformas Industriales Híspalis");
  });
});
