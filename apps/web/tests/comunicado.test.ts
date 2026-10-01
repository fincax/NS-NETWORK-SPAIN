/** Protocolo II · Dar a Conocer (D-018, D-069): Comunicado semanal, continuidad, Gaceta, relevancia, Dossier y conocimiento mutuo. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { SEED_COMPANIES } from "@/db/seed-data";
import { runClock } from "@/services/clock";
import { approveCommunique, communiqueHistory, communiqueMonth, comunicadoStatus, ensureDrafts, mutualKnowledge, parteComunicados, recordView, relevantForMe, weekCommuniques } from "@/services/comunicado";
import { buildStable, continuityAction, continuityCounts, diffStable, isoWeekLabel, relevantFor, weekCloseAt, weekIsClosed } from "@/core/comunicado";
import { addWeeks, weekStart } from "@/core/compromiso";
import { createDemand } from "@/services/demands";
import { valoracionMensual } from "@/services/valoracion";
import { monthStart } from "@/core/valoracion";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
const base = weekStart(new Date()); // lunes de esta semana: la Sala nace hoy
const monday = (n: number) => addWeeks(base, n);
/** Una hora después del cierre de la semana n (domingo 20:00 Madrid). */
const afterClose = (n: number) => new Date(weekCloseAt(monday(n)).getTime() + 3_600_000);
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
  it("lo estable sale del ADN y solo de sus capas PUBLIC y CHAPTER", () => {
    const dna = SEED_COMPANIES[0].dna; // Híspalis
    const s = buildStable(dna, { name: "Obra y reforma industrial", code: "OBRA_INDUSTRIAL" });
    expect(s.offering).toEqual(dna.offering.services);
    expect(s.capacity_now).toBe("ALTA");
    expect(s.ideal_customer).toMatch(/Industrial/);
    expect(JSON.stringify(s)).not.toMatch(/Márgenes|Lista de clientes/);
  });
  it("el delta inferido recoge servicios nuevos, capacidad y certificaciones; sin anterior no hay delta", () => {
    const dna = SEED_COMPANIES[1].dna;
    const prev = buildStable(dna, { name: "Seguros", code: "SEGUROS_EMPRESA" });
    expect(diffStable(null, prev)).toEqual([]);
    const next = buildStable({ ...dna, offering: { ...dna.offering, services: [...dna.offering.services, "Ciberriesgo"], capacity: "LIMITED" }, company: { ...dna.company, certifications: [...dna.company.certifications, "ISO 27001"] } }, { name: "Seguros", code: "SEGUROS_EMPRESA" });
    const delta = diffStable(prev, next);
    expect(delta.map((d) => d.kind)).toEqual(["NEW_SERVICE", "CAPACITY", "CERTIFICATION"]);
    expect(delta.every((d) => d.source === "INFERRED_FROM_DNA")).toBe(true);
    expect(delta[1].text).toBe("Capacidad MEDIA (antes ALTA)");
  });
  it("continuidad: cumple hasta dos seguidos; el segundo avisa el Agente, el tercero la Directiva", () => {
    expect(continuityAction(1)).toBe("NONE");
    expect(continuityAction(2)).toBe("AGENT_NOTICE");
    expect(continuityAction(3)).toBe("DIRECTOR_NOTICE");
    expect(continuityAction(7)).toBe("DIRECTOR_NOTICE");
    expect(continuityCounts(2)).toBe(true);
    expect(continuityCounts(3)).toBe(false);
  });
  it("la semana cierra el domingo a las 20:00 de Madrid y se etiqueta en ISO", () => {
    const w = new Date("2026-09-28T00:00:00Z"); // lunes
    expect(weekCloseAt(w).toISOString()).toBe("2026-10-04T18:00:00.000Z"); // CEST
    expect(weekCloseAt(new Date("2026-11-02T00:00:00Z")).toISOString()).toBe("2026-11-08T19:00:00.000Z"); // CET
    expect(isoWeekLabel(w)).toBe("2026-W40");
    expect(isoWeekLabel(new Date("2026-12-28T00:00:00Z"))).toBe("2026-W53");
    expect(weekIsClosed(w, new Date("2026-10-04T17:59:00Z"))).toBe(false);
    expect(weekIsClosed(w, new Date("2026-10-04T18:00:00Z"))).toBe(true);
  });
  it("relevante para ti: Encargos por señal, servicios nuevos por sector, capacidad por historial, cierres propios", () => {
    const viewer = { company_id: "me", dna: SEED_COMPANIES[0].dna, given_to: { b: { count: 2, verified_this_week: 1 } } };
    const stableA = buildStable(SEED_COMPANIES[1].dna, { name: "Seguros", code: "SEGUROS_EMPRESA" }); // Industrial, Logística…
    const items = relevantFor(viewer, [
      { company_id: "a", company_name: "A", stable: stableA, delta: [{ kind: "NEW_SERVICE", text: "Ciberriesgo", source: "INFERRED_FROM_DNA" }], encargos: [{ id: "1", summary: "Pymes con flota", trigger: "NEW_SITE" }] },
      { company_id: "b", company_name: "B", stable: { ...stableA, industries: ["Retail"] }, delta: [{ kind: "CAPACITY", text: "Capacidad ALTA (antes MEDIA)", source: "DECLARED_BY_MEMBER" }], encargos: [] },
      { company_id: "me", company_name: "Yo", stable: stableA, delta: [{ kind: "NEW_SERVICE", text: "x", source: "DECLARED_BY_MEMBER" }], encargos: [] },
    ]);
    expect(items.map((i) => i.weight)).toEqual([4, 3, 2, 2]);
    expect(items[0].text).toMatch(/B ha contrastado una Cesión tuya/);
    expect(items[1].why).toMatch(/new site/);
    expect(items.some((i) => i.company_id === "me")).toBe(false);
  });
});

describe("Comunicado semanal", () => {
  it("el Reloj deja un borrador por titular; el Agente lo compone sin novedades la primera semana", async () => {
    await createDemand(db, { companyId: lucia().companyId, memberId: lucia().memberId, text: "Busco empresas industriales que abran sede o planta en la provincia de Sevilla", trigger: "NEW_SITE" });
    const r = await runClock(db, new Date(base.getTime() + 36 * 3_600_000), chapterId);
    expect(r.comunicado.drafted).toBe(10);
    expect(r.comunicado.gazettes).toBe(0);
    const rows = await weekCommuniques(db, chapterId, monday(0));
    expect(rows).toHaveLength(10);
    expect(rows.every((x) => x.status === "DRAFT" && x.unchanged)).toBe(true);
    const mine = rows.find((x) => x.companyId === lucia().companyId)!;
    expect(mine.stable.specialty).toBe("Seguros de empresa");
    expect(mine.encargos).toHaveLength(1);
    const again = await runClock(db, new Date(base.getTime() + 40 * 3_600_000), chapterId);
    expect(again.comunicado.drafted).toBe(0);
  });

  it("el Timonel lo aprueba con un toque, añade una novedad y ajusta su capacidad; la Sala y los Agentes lo reciben", async () => {
    await expect(approveCommunique(db, { chapterId, companyId: lucia().companyId, memberId: carlos().memberId, now: new Date(base.getTime() + 48 * 3_600_000) })).rejects.toThrow(/Timonel de la empresa/);
    const row = await approveCommunique(db, { chapterId, companyId: lucia().companyId, memberId: lucia().memberId, now: new Date(base.getTime() + 48 * 3_600_000), note: "Programa de ciberriesgo para pymes industriales desde octubre", capacity: "MEDIA", ask: "¿Alguien conoce al director financiero de Conservas Aljarafe?" });
    expect(row.status).toBe("APPROVED");
    expect(row.unchanged).toBe(false);
    expect(row.declared.map((d) => d.kind)).toEqual(["NOTE", "CAPACITY"]);
    expect(row.declared.every((d) => d.source === "DECLARED_BY_MEMBER")).toBe(true);
    expect(row.stable.capacity_now).toBe("MEDIA");
    expect(row.asks).toHaveLength(1);
    const dna = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, lucia().companyId) }))!;
    expect(dna.dna.offering.capacity).toBe("LIMITED");
    const merit = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, lucia().companyId), eq(schema.trustEvents.kind, "COMMUNIQUE_MET")) });
    expect(merit?.weight).toBe(5);
    const sent = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "COMMUNIQUE_SENT") });
    expect(sent?.significant).toBe(true);
    expect(sent?.companyIds).toEqual([]);
    expect(sent?.result).toMatch(/Correduría Guadalquivir da a conocer/);
    const acks = await db.query.agentInteractions.findMany({ where: and(eq(schema.agentInteractions.chapterId, chapterId), eq(schema.agentInteractions.messageType, "COMMUNIQUE_ACK")) });
    expect(acks).toHaveLength(9);
    await expect(approveCommunique(db, { chapterId, companyId: lucia().companyId, memberId: lucia().memberId, now: new Date(base.getTime() + 49 * 3_600_000) })).rejects.toThrow(/ya está aprobado/);
    const status = await comunicadoStatus(db, chapterId, lucia().companyId, new Date(base.getTime() + 50 * 3_600_000));
    expect(status.label).toBe("Aprobado");
    expect(status.row?.status).toBe("APPROVED");
  });

  it("la vista «relevante para ti» lee los Comunicados aprobados con el ADN del lector", async () => {
    const items = await relevantForMe(db, chapterId, carlos().companyId, monday(0));
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].text).toMatch(/Encargo abierto de Correduría Guadalquivir/);
    expect(items[0].why).toMatch(/new site/);
    const own = await relevantForMe(db, chapterId, lucia().companyId, monday(0));
    expect(own).toEqual([]);
  });

  it("al cierre, lo no aprobado sale de continuidad y la Gaceta se publica para la Sala", async () => {
    const r = await runClock(db, afterClose(0), chapterId);
    expect(r.comunicado).toMatchObject({ weeks: 1, continuity: 9, notices: 0, gazettes: 1 });
    const rows = await weekCommuniques(db, chapterId, monday(0));
    expect(rows.filter((x) => x.status === "CONTINUITY")).toHaveLength(9);
    expect(rows.filter((x) => x.status === "CONTINUITY").every((x) => x.continuityStreak === 1 && x.unchanged && x.delta.length === 0)).toBe(true);
    const gazette = (await db.query.gazettes.findFirst({ where: and(eq(schema.gazettes.chapterId, chapterId), eq(schema.gazettes.weekStart, monday(0))) }))!;
    expect(gazette.gazette.communiques).toEqual({ approved: 1, continuity: 9, missing: 0 });
    expect(gazette.gazette.members).toBe(10);
    expect(gazette.gazette.open_encargos).toBe(1);
    expect(gazette.gazette.highlights.map((h) => h.kind)).toEqual(["NOTE", "CAPACITY"]);
    const published = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "GAZETTE_PUBLISHED") });
    expect(published?.significant).toBe(true);
    expect(published?.result).toMatch(/10 Comunicados de 10 \(9 de continuidad\)/);
    // Idempotente y con los borradores de la semana siguiente listos.
    const again = await runClock(db, new Date(afterClose(0).getTime() + 3_600_000), chapterId);
    expect(again.comunicado).toMatchObject({ weeks: 0, gazettes: 0, drafted: 0 });
    expect(await weekCommuniques(db, chapterId, monday(1))).toHaveLength(10);
    // Aprobar una semana cerrada no procede.
    await expect(approveCommunique(db, { chapterId, companyId: carlos().companyId, memberId: carlos().memberId, weekStartAt: monday(0), now: afterClose(0) })).rejects.toThrow(/ya cerró/);
  });

  it("dos de continuidad seguidos avisa el Agente; tres, la Directiva y la semana deja de contar", async () => {
    const r2 = await runClock(db, afterClose(1), chapterId);
    expect(r2.comunicado).toMatchObject({ continuity: 10, notices: 9, gazettes: 1 });
    const agentNotices = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.kind, "COMMUNIQUE_CONTINUITY_NOTICE") });
    expect(agentNotices).toHaveLength(9);
    expect(agentNotices[0].companyIds).toHaveLength(1);
    const luciaW1 = (await db.query.communiques.findFirst({ where: and(eq(schema.communiques.companyId, lucia().companyId), eq(schema.communiques.weekStart, monday(1))) }))!;
    expect(luciaW1).toMatchObject({ status: "CONTINUITY", continuityStreak: 1 });
    const status = await comunicadoStatus(db, chapterId, carlos().companyId, new Date(monday(2).getTime() + 3_600_000));
    expect(status.continuityStreak).toBe(2);
    expect(status.label).toBe("Borrador sin novedades");
    expect(status.nextStep).toMatch(/2 semanas de continuidad.*aviso formal/);

    const r3 = await runClock(db, afterClose(2), chapterId);
    expect(r3.comunicado).toMatchObject({ continuity: 10, notices: 10 }); // 9 formales y el aviso del Agente a Lucía (segundo de continuidad)
    const formal = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.kind, "COMMUNIQUE_FORMAL_NOTICE") });
    expect(formal).toHaveLength(9);
    expect(formal[0].companyIds).toContain(director().companyId);
    const missed = await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, carlos().companyId), eq(schema.trustEvents.kind, "COMMUNIQUE_MISSED")) });
    expect(missed).toHaveLength(1);
    expect(missed[0].weight).toBe(-5);
    // Una aprobación pone la cuenta a cero.
    const ok = await approveCommunique(db, { chapterId, companyId: carlos().companyId, memberId: carlos().memberId, weekStartAt: monday(3), now: new Date(monday(3).getTime() + 3_600_000) });
    expect(ok.continuityStreak).toBe(0);
    const history = await communiqueHistory(db, carlos().companyId);
    expect(history.map((h) => h.status)).toEqual(["APPROVED", "CONTINUITY", "CONTINUITY", "CONTINUITY"]);
  });

  it("un cambio en el ADN refresca el borrador y aparece como delta inferido", async () => {
    const dna = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, lucia().companyId) }))!;
    await db.update(schema.businessDna).set({ dna: { ...dna.dna, offering: { ...dna.dna.offering, services: [...dna.dna.offering.services, "Seguro de ciberriesgo"] } }, version: dna.version + 1 }).where(eq(schema.businessDna.id, dna.id));
    const status = await comunicadoStatus(db, chapterId, lucia().companyId, new Date(monday(3).getTime() + 2 * 3_600_000));
    expect(status.row?.delta).toEqual([{ kind: "NEW_SERVICE", text: "Seguro de ciberriesgo", source: "INFERRED_FROM_DNA" }]);
    expect(status.label).toBe("Borrador con 1 novedad");
  });

  it("el Dossier y la Gaceta registran consultas sin duplicar, y el conocimiento mutuo se mide por semana", async () => {
    expect(await recordView(db, { chapterId, companyId: carlos().companyId, memberId: carlos().memberId, kind: "DOSSIER_VIEWED", subjectId: lucia().companyId })).toBe(true);
    expect(await recordView(db, { chapterId, companyId: carlos().companyId, memberId: carlos().memberId, kind: "DOSSIER_VIEWED", subjectId: lucia().companyId })).toBe(false);
    const views = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.kind, "DOSSIER_VIEWED") });
    expect(views).toHaveLength(1);
    expect(views[0].significant).toBe(false);
    expect(await mutualKnowledge(db, chapterId, weekStart(new Date()))).toBeCloseTo(0.1);
    const parte = await parteComunicados(db, chapterId, monday(2));
    expect(parte.members).toHaveLength(10);
    expect(parte.members.every((m) => m.status === "CONTINUITY")).toBe(true);
  });

  it("la Valoración cuenta los Comunicados del mes: aprobados y de continuidad dentro del tope", async () => {
    const m = await communiqueMonth(db, chapterId, carlos().companyId, monday(0), monday(4));
    expect(m).toEqual({ weeks: 4, met: 3 }); // 2 de continuidad cuentan, el tercero no, el aprobado sí
    const v = await valoracionMensual(db, chapterId, carlos().companyId, monthStart(monday(0)));
    const c = v.components.find((x) => x.key === "comunicado")!;
    expect(c.value).not.toBeNull();
    expect(c.detail).toMatch(/Comunicados aprobados/);
  });

  it("una empresa nueva recibe su borrador en la semana de alta", async () => {
    const created = await ensureDrafts(db, chapterId, monday(3));
    expect(created).toBe(0);
    const rows = await weekCommuniques(db, chapterId, monday(3));
    expect(rows).toHaveLength(10);
  });
});
