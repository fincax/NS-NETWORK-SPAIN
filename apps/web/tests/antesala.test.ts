/** Antesala (D-035): veredicto de plaza, despacho de la Directiva y alta desde una candidatura aprobada. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { SEED_COMPANIES } from "@/db/seed-data";
import { acceptAllNormas } from "@/core/normas";
import { onboardCompany } from "@/services/onboarding";
import { activateCandidacy, candidacyCounts, CandidacyTransitionError, listCandidacies, triageCandidacy, updateCandidacy } from "@/services/antesala";
import { MANANTIALES, NSCAT } from "@/db/nscat";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let directorId: string;
let timonelId: string;

const byCompany = async (name: string) => (await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.companyName, name) }))!;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  directorId = r.companies["bufete-alameda"].memberId;
  timonelId = r.companies["hispalis"].memberId;
});
afterAll(async () => {
  await closeDb();
});

describe("Veredicto de plaza", () => {
  it("plaza vacante y sin conflictos: se puede aprobar", async () => {
    const t = await triageCandidacy(db, chapterId, await byCompany("Mantenimiento Integral Guadaíra"));
    expect(t.seat).toBe("VACANT");
    expect(t.overlaps).toEqual([]);
    expect(t.canApprove).toBe(true);
  });
  it("plaza vacante solapada por el lado inverso (Telecomunicaciones ↔ Ciberseguridad)", async () => {
    const t = await triageCandidacy(db, chapterId, await byCompany("Redes del Sur Telecom"));
    expect(t.seat).toBe("VACANT");
    expect(t.overlaps.map((o) => o.specialtyName)).toEqual(["Ciberseguridad"]);
    expect(t.canApprove).toBe(true);
  });
  it("Manantial (D-059): Administración de fincas es plaza vacante de la Sala, con las mismas reglas que cualquier otra", async () => {
    expect(MANANTIALES.has("ADMINISTRACION_FINCAS")).toBe(true);
    expect(NSCAT.filter((s) => s.manantial).every((s) => s.status !== "PROVISIONAL")).toBe(true);
    const seat = await db.select({ status: schema.categorySeats.status, companyId: schema.categorySeats.companyId }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.specialties.nscatCode, "ADMINISTRACION_FINCAS"));
    expect(seat).toEqual([{ status: "VACANT", companyId: null }]);
    const t = await triageCandidacy(db, chapterId, { ...(await byCompany("Mantenimiento Integral Guadaíra")), specialtyCode: "ADMINISTRACION_FINCAS" });
    expect(t.seat).toBe("VACANT");
    expect(t.canApprove).toBe(true);
  });
  it("plaza ocupada: nombra al titular y no se puede aprobar", async () => {
    const t = await triageCandidacy(db, chapterId, await byCompany("Correduría Giralda"));
    expect(t.seat).toBe("TAKEN");
    expect(t.holderName).toBe(SEED_COMPANIES.find((c) => c.specialty === "SEGUROS_EMPRESA")!.name);
    expect(t.canApprove).toBe(false);
  });
  it("plaza vacante pero solapada con un titular (Escenario E): avisa y pide confirmar", async () => {
    const t = await triageCandidacy(db, chapterId, await byCompany("Estudio Vidal Arquitectos"));
    expect(t.seat).toBe("VACANT");
    expect(t.overlaps.map((o) => o.specialtyName)).toContain("Obra y reforma industrial");
    expect(t.recommendation).toMatch(/solapa/i);
  });
  it("sin especialidad: pide clasificar", async () => {
    const t = await triageCandidacy(db, chapterId, await byCompany("Beltrán Consultores"));
    expect(t.seat).toBe("UNCLASSIFIED");
    expect(t.canApprove).toBe(false);
  });
  it("fuera de la zona y duplicados se señalan", async () => {
    const cordoba = await triageCandidacy(db, chapterId, await byCompany("Logística Bética"));
    expect(cordoba.outsideZone).toBe(true);
    const [dup] = await db.insert(schema.betaRequests).values({ fullName: "Otra", companyName: "Redes del Sur Telecom", email: "otra@example.com", specialtyCode: "TELECOMUNICACIONES" }).returning();
    const t = await triageCandidacy(db, chapterId, dup);
    expect(t.duplicateOf?.kind).toBe("CANDIDACY");
    await db.delete(schema.betaRequests).where(eq(schema.betaRequests.id, dup.id));
    const existing = await triageCandidacy(db, chapterId, { ...dup, companyName: SEED_COMPANIES[0].name, specialtyCode: "LOGISTICA" });
    expect(existing.duplicateOf?.kind).toBe("MEMBER");
  });
});

describe("Despacho de la Directiva", () => {
  it("un Timonel que no es Directiva no despacha", async () => {
    const c = await byCompany("Redes del Sur Telecom");
    await expect(updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: timonelId, status: "CONTACTED" })).rejects.toBeInstanceOf(CandidacyTransitionError);
  });
  it("no se aprueba una plaza ocupada ni se salta el orden de estados", async () => {
    const [c] = await db.insert(schema.betaRequests).values({ fullName: "Sara Tena", companyName: "Seguros Bética", email: "sara@segurosbetica.es", specialtyCode: "SEGUROS_EMPRESA" }).returning();
    await expect(updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: directorId, status: "APPROVED" })).rejects.toThrow(/No se puede pasar/);
    await updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: directorId, status: "INTERVIEW" });
    await expect(updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: directorId, status: "APPROVED" })).rejects.toThrow(/ocupada/);
    const waited = await updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: directorId, status: "WAITLISTED", notes: "Espera a que quede libre Seguros." });
    expect(waited.status).toBe("WAITLISTED");
    expect(waited.decidedAt).not.toBeNull();
  });
  it("clasificar, aprobar y dar de alta deja rastro y cierra la candidatura", async () => {
    const c = await byCompany("Beltrán Consultores");
    await updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: directorId, specialtyCode: "LOGISTICA", status: "INTERVIEW" });
    const approved = await updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: directorId, status: "APPROVED" });
    expect(approved.status).toBe("APPROVED");
    expect(approved.specialtyCode).toBe("LOGISTICA");
    const events = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.subjectId, c.id) });
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some((e) => e.significant && e.policyApplied === "seat.exclusivity")).toBe(true);

    const r = await onboardCompany(db, { chapterId, name: c.companyName, slug: "beltran-consultores", specialtyCode: "LOGISTICA", person: { fullName: c.fullName, role: "Socio", email: c.email }, dna: SEED_COMPANIES[0].dna, acceptance: acceptAllNormas() });
    const activated = await activateCandidacy(db, c.id, r.company.id);
    expect(activated?.status).toBe("ACTIVATED");
    expect(activated?.companyId).toBe(r.company.id);
    await expect(updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: directorId, status: "DECLINED" })).rejects.toThrow(/No se puede pasar/);
  });
  it("las vistas y los recuentos cuadran", async () => {
    const counts = await candidacyCounts(db);
    expect(counts.todas).toBe(10);
    expect(counts.espera).toBe(5); // 2 en la Antesala + 3 en fundación
    expect(counts.aprobadas).toBe(1);
    expect((await listCandidacies(db, "pendientes")).every((c) => ["NEW", "CONTACTED", "INTERVIEW"].includes(c.status))).toBe(true);
    expect((await listCandidacies(db, "todas")).length).toBe(10);
  });
});
