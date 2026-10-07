/** NS-CAT v0.2 (D-080): plazas base y por demanda, bloque tecnológico, orden de captación y apertura de plazas. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, syncNscatSeats } from "@/db/seed";
import { BASE_SEATS, compareSeats, MANANTIALES, NSCAT, NSCAT_VERSION, seatClassLabel, seatPriority, TECH } from "@/db/nscat";
import { createSignal, publishSignal } from "@/services/signals";
import { openSeatOnDemand } from "@/services/plazas";
import { triageCandidacy, updateCandidacy } from "@/services/antesala";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
let directorId: string;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
  directorId = r.companies["bufete-alameda"].memberId;
});
afterAll(async () => {
  await closeDb();
});

const seatOf = async (code: string) =>
  db
    .select({ status: schema.categorySeats.status, companyId: schema.categorySeats.companyId })
    .from(schema.categorySeats)
    .innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId))
    .where(and(eq(schema.specialties.nscatCode, code), eq(schema.categorySeats.chapterId, chapterId)));

describe("El catálogo NS-CAT v0.2", () => {
  it("tiene códigos únicos y solapamientos que apuntan a especialidades existentes", () => {
    expect(NSCAT_VERSION).toBe("0.2");
    const codes = NSCAT.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const s of NSCAT) for (const o of s.overlapsWith ?? []) expect(codes, `${s.code} → ${o}`).toContain(o);
  });
  it("las dieciséis especialidades de v0.1 siguen siendo plazas base", () => {
    for (const c of ["OBRA_INDUSTRIAL", "SEGUROS_EMPRESA", "PRL", "SELECCION_PERSONAL", "CIBERSEGURIDAD", "MOBILIARIO_OFICINA", "BRANDING", "ASESORIA_FISCAL", "LEGAL_MA", "VALORACION_EMPRESAS", "TELECOMUNICACIONES", "ARQUITECTURA", "FINANCIACION", "LOGISTICA", "FACILITY_MANAGEMENT", "ADMINISTRACION_FINCAS"]) expect(BASE_SEATS.has(c), c).toBe(true);
  });
  it("el bloque tecnológico está desplegado con finura (D-080): 62.02 no es una plaza", () => {
    const techBase = ["SOFTWARE_MEDIDA", "ERP_GESTION", "CIBERSEGURIDAD", "NUBE_INFRAESTRUCTURA", "DATOS_ANALITICA", "IA_AGENTES", "TELECOMUNICACIONES"];
    for (const c of techBase) {
      expect(TECH.has(c), c).toBe(true);
      expect(BASE_SEATS.has(c), c).toBe(true);
    }
    for (const c of ["CRM_AUTOMATIZACION", "AUTOMATIZACION_PROCESOS", "ECOMMERCE_PLATAFORMAS", "PRODUCTO_DIGITAL_UX", "IOT_INDUSTRIA", "SISTEMAS_GESTIONADOS", "SEO_CONTENIDO"]) {
      expect(TECH.has(c), c).toBe(true);
      expect(BASE_SEATS.has(c), c).toBe(false);
    }
    expect(NSCAT.filter((s) => s.cnae === "62.02").length).toBeGreaterThanOrEqual(4);
  });
  it("todo Manantial es plaza base y ninguno es PROVISIONAL; la implantación de ERP es Manantial tecnológico", () => {
    for (const s of NSCAT.filter((s) => s.manantial)) {
      expect(s.base, s.code).toBe(true);
      expect(s.status, s.code).not.toBe("PROVISIONAL");
    }
    expect(MANANTIALES.has("ERP_GESTION")).toBe(true);
    expect(TECH.has("ERP_GESTION")).toBe(true);
  });
  it("ordena la captación: Manantiales, tecnológicas, resto de base, por demanda; dentro de cada bloque por nombre", () => {
    expect(seatPriority("ADMINISTRACION_FINCAS")).toBe(0);
    expect(seatPriority("NUBE_INFRAESTRUCTURA")).toBe(1);
    expect(seatPriority("PRL")).toBe(2);
    expect(seatPriority("LIMPIEZA")).toBe(3);
    expect(seatPriority("NO_EXISTE")).toBe(3);
    expect(seatClassLabel("ARQUITECTURA")).toBe("Manantial");
    expect(seatClassLabel("IA_AGENTES")).toBe("Tech");
    expect(seatClassLabel("LOGISTICA")).toBe("Base");
    expect(seatClassLabel("SEO_CONTENIDO")).toBe("Por demanda");
    const ordered = [...NSCAT].sort(compareSeats).map((s) => s.code);
    expect(ordered.indexOf("ASESORIA_FISCAL")).toBeLessThan(ordered.indexOf("SOFTWARE_MEDIDA"));
    expect(ordered.indexOf("SOFTWARE_MEDIDA")).toBeLessThan(ordered.indexOf("LOGISTICA"));
    expect(ordered.indexOf("LOGISTICA")).toBeLessThan(ordered.indexOf("LIMPIEZA"));
  });
});

describe("Plazas base y por demanda en la Sala (D-080)", () => {
  it("la semilla abre una plaza por cada especialidad base y ninguna por las de demanda; el catálogo entero está en la base de datos", async () => {
    const seats = await db.query.categorySeats.findMany({ where: eq(schema.categorySeats.chapterId, chapterId) });
    expect(seats.length).toBe(BASE_SEATS.size);
    expect((await db.query.specialties.findMany()).length).toBe(NSCAT.length);
    expect(await seatOf("NUBE_INFRAESTRUCTURA")).toEqual([{ status: "VACANT", companyId: null }]);
    expect(await seatOf("ECOMMERCE_PLATAFORMAS")).toEqual([]);
    expect(await syncNscatSeats(db, chapterId)).toEqual([]);
  });
  it("una necesidad sin titular de una especialidad por demanda abre la plaza desde la Mesa, una sola vez", async () => {
    const c = companies["guadalquivir"];
    const first = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: "Mi cliente Cerámicas del Aljarafe, empresa industrial de 60 empleados, quiere montar una tienda online para vender a toda España antes de Navidad. Presupuesto de 40.000 €. Decide el gerente, con el que tengo trato directo." });
    const res = await publishSignal(db, first.opportunitySignal.id, c.memberId);
    expect(res.uncovered).toContain("Comercio electrónico y plataformas digitales");
    expect(await seatOf("ECOMMERCE_PLATAFORMAS")).toEqual([{ status: "VACANT", companyId: null }]);
    const opened = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.kind, "SEAT_OPENED_ON_DEMAND")) });
    expect(opened.length).toBe(1);
    expect(opened[0].result).toMatch(/Comercio electrónico.*abierta por demanda/);
    const second = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: "Mi cliente Bodegas del Condado, 30 empleados, quiere vender online sus vinos con una tienda online nueva. Presupuesto de 20.000 €." });
    await publishSignal(db, second.opportunitySignal.id, c.memberId);
    expect((await seatOf("ECOMMERCE_PLATAFORMAS")).length).toBe(1);
    expect((await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.kind, "SEAT_OPENED_ON_DEMAND")) })).length).toBe(1);
  });
  it("un Indicio confidencial no abre plazas (Escenario D)", async () => {
    const c = companies["guadalquivir"];
    const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: "Mi cliente Talleres Sur, 80 empleados, quiere autoconsumo con placas solares en la nave. Presupuesto de 90.000 €.", visibility: "COMPANY_ONLY" });
    await publishSignal(db, created.opportunitySignal.id, c.memberId);
    expect(await seatOf("ENERGIA_EFICIENCIA")).toEqual([]);
  });
  it("openSeatOnDemand es idempotente y nombra la especialidad", async () => {
    const sp = (await db.query.specialties.findFirst({ where: eq(schema.specialties.nscatCode, "LIMPIEZA") }))!;
    const a = await openSeatOnDemand(db, { chapterId, specialtyId: sp.id, reason: "prueba", actor: { type: "SYSTEM", id: "test" } });
    const b = await openSeatOnDemand(db, { chapterId, specialtyId: sp.id, reason: "prueba", actor: { type: "SYSTEM", id: "test" } });
    expect(a).toMatchObject({ opened: true, specialtyName: "Limpieza de instalaciones" });
    expect(b).toMatchObject({ opened: false, seatId: a.seatId });
  });
  it("una candidatura para una plaza por demanda aún no abierta se puede aprobar, y aprobarla abre la plaza", async () => {
    const [cand] = await db.insert(schema.betaRequests).values({ fullName: "Nuria Vela", companyName: "Formación Técnica Sur", email: "nuria@formaciontecnicasur.es", specialtyCode: "FORMACION_EMPRESAS", city: "Sevilla", message: "", status: "NEW" }).returning();
    const t = await triageCandidacy(db, chapterId, cand);
    expect(t.seat).toBe("VACANT");
    expect(t.canApprove).toBe(true);
    expect(t.recommendation).toMatch(/Plaza por demanda/);
    expect(await seatOf("FORMACION_EMPRESAS")).toEqual([]);
    await updateCandidacy(db, { candidacyId: cand.id, chapterId, memberId: directorId, status: "CONTACTED" });
    await updateCandidacy(db, { candidacyId: cand.id, chapterId, memberId: directorId, status: "INTERVIEW" });
    await updateCandidacy(db, { candidacyId: cand.id, chapterId, memberId: directorId, status: "APPROVED" });
    expect(await seatOf("FORMACION_EMPRESAS")).toEqual([{ status: "VACANT", companyId: null }]);
  });
  it("una especialidad que no está en NS-CAT sigue sin poder aprobarse", async () => {
    const [cand] = await db.insert(schema.betaRequests).values({ fullName: "X", companyName: "Inventada SL", email: "x@inventada.es", specialtyCode: "NO_EXISTE", city: "Sevilla", message: "", status: "NEW" }).returning();
    const t = await triageCandidacy(db, chapterId, cand);
    expect(t.seat).toBe("UNKNOWN_SPECIALTY");
    expect(t.canApprove).toBe(false);
  });
});
