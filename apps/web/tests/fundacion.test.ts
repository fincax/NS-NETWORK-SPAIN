/** Fundación de Sala (D-041): Promotora, fundadoras, mínimo, nombre no territorial y gratificación. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { activateFounding, FoundingError, foundingProgress, joinFounding, listFoundings, startFounding, validateChapterName } from "@/services/fundacion";
import { CANDIDACY_TRANSITIONS, triageCandidacy, updateCandidacy } from "@/services/antesala";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let zoneId: string;
let chapterId: string;
let directorId: string;
let timonelId: string;

const cand = (companyName: string, specialtyCode: string | null, status = "NEW") => db.insert(schema.betaRequests).values({ fullName: "T", companyName, email: `${companyName.toLowerCase().replace(/\W+/g, "")}@example.com`, specialtyCode, status }).returning().then((r) => r[0]);

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  zoneId = r.zone.id;
  chapterId = r.chapter.id;
  directorId = r.companies["bufete-alameda"].memberId;
  timonelId = r.companies["hispalis"].memberId;
});
afterAll(async () => {
  await closeDb();
});

describe("Nombre de la Sala (D-014)", () => {
  it("exige prefijo NS y rechaza nombres territoriales", () => {
    expect(validateChapterName("  NS   Ágora ")).toBe("NS Ágora");
    expect(() => validateChapterName("Ágora")).toThrow(FoundingError);
    expect(() => validateChapterName("NS Sevilla")).toThrow(/territorial/);
    expect(() => validateChapterName("NS Triana")).toThrow(/territorial/);
    expect(() => validateChapterName("NS Dos Hermanas")).toThrow(/territorial/);
    expect(() => validateChapterName("NS Andalucía Norte")).toThrow(/territorial/);
  });
});

describe("Fundación", () => {
  it("la demo arranca con una Sala en fundación promovida por una candidatura con plaza ocupada", async () => {
    const list = await listFoundings(db, zoneId);
    expect(list.length).toBe(1);
    expect(list[0].promoter?.companyName).toBe("Correduría Giralda");
    expect(list[0].count).toBeGreaterThanOrEqual(3);
    expect(list[0].ready).toBe(false);
    const promoter = list[0].promoter!;
    expect(promoter.status).toBe("FOUNDING");
    expect((await triageCandidacy(db, chapterId, promoter)).seat).toBe("TAKEN");
  });
  it("solo la Directiva promueve; una candidatura no entra dos veces ni dos de la misma especialidad", async () => {
    const [f] = await listFoundings(db, zoneId);
    const extra = await cand("Seguros Bética", "SEGUROS_EMPRESA");
    await expect(startFounding(db, { zoneId, candidacyId: extra.id, memberId: timonelId })).rejects.toBeInstanceOf(FoundingError);
    await expect(joinFounding(db, { foundingId: f.founding.id, candidacyId: extra.id, memberId: directorId })).rejects.toThrow(/una plaza por especialidad/);
    await expect(joinFounding(db, { foundingId: f.founding.id, candidacyId: f.promoter!.id, memberId: directorId })).rejects.toThrow(/ya forma parte/);
  });
  it("no se funda sin el mínimo; al alcanzarlo pasa a lista y la Directiva la funda con nombre propio", async () => {
    const [f] = await listFoundings(db, zoneId);
    await expect(activateFounding(db, { foundingId: f.founding.id, name: "NS Ágora", memberId: directorId })).rejects.toThrow(/Faltan/);
    const codes = ["OBRA_INDUSTRIAL", "PRL", "CIBERSEGURIDAD", "MOBILIARIO_OFICINA", "BRANDING", "LEGAL_MA", "VALORACION_EMPRESAS", "TELECOMUNICACIONES", "ARQUITECTURA", "FINANCIACION", "LOGISTICA", "FACILITY_MANAGEMENT"];
    let progress = await foundingProgress(db, f.founding);
    for (const code of codes) {
      if (progress.ready) break;
      if (progress.specialties.includes(code)) continue;
      const c = await cand(`Fundadora ${code}`, code);
      progress = await joinFounding(db, { foundingId: f.founding.id, candidacyId: c.id, memberId: directorId });
    }
    expect(progress.ready).toBe(true);
    expect((await db.query.chapterFoundings.findFirst({ where: eq(schema.chapterFoundings.id, f.founding.id) }))?.status).toBe("READY");
    await expect(activateFounding(db, { foundingId: f.founding.id, name: "NS Sevilla Este", memberId: directorId })).rejects.toThrow(/territorial/);
    await expect(activateFounding(db, { foundingId: f.founding.id, name: "NS Cumbre", memberId: directorId })).rejects.toThrow(/único/);
    const { chapter } = await activateFounding(db, { foundingId: f.founding.id, name: "NS Ágora", memberId: directorId });
    expect(chapter.slug).toBe("ns-agora");
    expect(chapter.nameStatus).toBe("PROPOSED");
    const seats = await db.query.categorySeats.findMany({ where: eq(schema.categorySeats.chapterId, chapter.id) });
    expect(seats.length).toBeGreaterThanOrEqual(15);
    const approved = await db.query.betaRequests.findMany({ where: and(eq(schema.betaRequests.foundingId, f.founding.id), eq(schema.betaRequests.status, "APPROVED")) });
    expect(approved.length).toBe(progress.count);
    const reward = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "FOUNDING_REWARD") });
    expect(reward?.result).toMatch(/Correduría Giralda/);
    expect(reward?.result).toMatch(/cuota gratis/);
    await expect(activateFounding(db, { foundingId: f.founding.id, name: "NS Otra", memberId: directorId })).rejects.toThrow(/ya está fundada/);
  });
  it("el estado En fundación existe en la Antesala y solo sale hacia declinada", async () => {
    expect(CANDIDACY_TRANSITIONS.FOUNDING).toEqual(["DECLINED"]);
    const c = await cand("Otra Promotora", "PRL");
    const f = await startFounding(db, { zoneId, candidacyId: c.id, memberId: directorId });
    expect(f.status).toBe("OPEN");
    await expect(updateCandidacy(db, { chapterId, candidacyId: c.id, memberId: directorId, status: "APPROVED" })).rejects.toThrow(/No se puede pasar/);
  });
});
