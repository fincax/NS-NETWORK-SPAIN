/** Protocolo II · Dar a Conocer (D-018, D-070): borrador del Agente, un toque, cierre del viernes con continuidad, Gaceta y Dossier. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { outbox } from "@/lib/mail";
import { approveComunicado, closeWeek, comunicadoHistory, comunicadoStatus, draftComunicados, gaceta, runProtocoloII } from "@/services/comunicados";
import { weekClosed, weekLabel, renderComunicado, relevanceFor } from "@/core/comunicado";
import { weekStart } from "@/core/compromiso";
import { comunicadoActionContext, executeComunicadoAction } from "@/services/accion";
import { createDemand } from "@/services/demands";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";
process.env.NS_PUBLIC_URL = "https://networkspain.com";
process.env.NS_LATIDO = "off";

let db: Db;
let chapterId: string;
let companies: Awaited<ReturnType<typeof seedChapter>>["companies"];
/** Martes 10:00 de Madrid (08:00Z en verano): la semana está abierta. */
const TUESDAY = new Date("2026-10-06T08:00:00Z");
/** Viernes 14:30 de Madrid de la misma semana: cerrada. */
const FRIDAY_CLOSE = new Date("2026-10-09T12:30:00Z");
const tokenFrom = (text: string) => text.match(/\/accion\/([A-Za-z0-9_-]+)/)![1];

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
});
beforeEach(() => {
  delete process.env.NS_MAIL_TRANSPORT;
  delete process.env.NS_AUTH_MODE;
  outbox.length = 0;
});
afterAll(async () => {
  delete process.env.NS_MAIL_TRANSPORT;
  delete process.env.NS_AUTH_MODE;
  await closeDb();
});

describe("Reglas puras", () => {
  it("la semana cierra el viernes a las 14:00 de Madrid", () => {
    expect(weekClosed(TUESDAY)).toBe(false);
    expect(weekClosed(new Date("2026-10-09T11:30:00Z"))).toBe(false); // viernes 13:30 Madrid
    expect(weekClosed(FRIDAY_CLOSE)).toBe(true);
    expect(weekClosed(new Date("2026-10-11T20:00:00Z"))).toBe(true); // domingo
    expect(weekLabel(TUESDAY)).toBe("2026-W41");
  });
  it("el Comunicado se lee en cinco líneas y la relevancia prefiere novedades y clientela compartida", () => {
    const stable = { specialty: "Obra industrial", offering: ["Naves"], not_offering: ["Vivienda"], ideal_customer: "Industrial · 51-200 empleados · Sevilla", perfect_referral: "Una nave nueva", capacity_now: "ALTA" as const };
    const text = renderComunicado({ stable, delta: [{ kind: "NEW_SERVICE", text: "Nuevo: licencias", source: "DECLARED_BY_MEMBER" }], encargos: ["Pymes con flota"] }, "Híspalis");
    expect(text.split("\n")).toHaveLength(6);
    expect(text).toContain("No hace: Vivienda");
    const mine = { ideal_customer: { industries: ["Industrial"] } } as unknown as Parameters<typeof relevanceFor>[1];
    const rel = relevanceFor({ stable, delta: [{ kind: "NEW_SERVICE", text: "Nuevo: licencias", source: "DECLARED_BY_MEMBER" }], encargos: [] }, mine);
    expect(rel.score).toBeGreaterThanOrEqual(4);
    expect(rel.why).toMatch(/licencias/);
    expect(relevanceFor({ stable: { ...stable, ideal_customer: "Hostelería" }, delta: [], encargos: [] }, mine).score).toBe(0);
  });
});

describe("Semana del Comunicado", () => {
  it("el lunes el Agente redacta un borrador por empresa activa con ADN, una sola vez, y avisa por correo en modo real", async () => {
    process.env.NS_MAIL_TRANSPORT = "memory";
    process.env.NS_AUTH_MODE = "real";
    const n = await draftComunicados(db, chapterId, TUESDAY);
    expect(n).toBeGreaterThanOrEqual(8);
    expect(await draftComunicados(db, chapterId, TUESDAY)).toBe(0); // idempotente
    const carlos = await comunicadoStatus(db, companies.hispalis.companyId, TUESDAY);
    expect(carlos.comunicado?.status).toBe("DRAFT");
    expect(carlos.text).toContain("Reformas Industriales Híspalis");
    expect(carlos.text).toContain("capacidad");
    const mail = outbox.find((m) => m.to === "carlos@hispalis-industrial.es")!;
    expect(mail.html).toContain("Aprobar el Comunicado");
    const ctx = (await comunicadoActionContext(db, tokenFrom(mail.text)))!;
    expect(ctx.applies).toBe(true);
    expect(ctx.text).toBe(carlos.text);
  });

  it("el Timonel aprueba con un toque desde el correo y su línea queda como declarada por él", async () => {
    process.env.NS_MAIL_TRANSPORT = "memory";
    process.env.NS_AUTH_MODE = "real";
    const link = (await db.query.actionLinks.findFirst({ where: and(eq(schema.actionLinks.memberId, companies.hispalis.memberId), eq(schema.actionLinks.action, "APPROVE_COMUNICADO")) }))!;
    // El token no se guarda: reconstruimos el flujo con un enlace nuevo.
    const { createActionLink } = await import("@/services/avisos");
    const url = await createActionLink(db, { memberId: companies.hispalis.memberId, comunicadoId: link.comunicadoId!, action: "APPROVE_COMUNICADO" });
    const r = await executeComunicadoAction(db, tokenFrom(url), { note: "Desde octubre también hacemos licencias de actividad." });
    expect(r.done).toBe(true);
    const c = (await db.query.comunicados.findFirst({ where: eq(schema.comunicados.id, link.comunicadoId!) }))!;
    expect(c.status).toBe("APPROVED");
    expect(c.note).toMatch(/licencias/);
    expect(c.delta.at(-1)).toMatchObject({ kind: "NOTE", source: "DECLARED_BY_MEMBER" });
    expect(c.publishedAt).not.toBeNull();
    await expect(executeComunicadoAction(db, tokenFrom(url))).rejects.toThrow(/ya no sirve/);
    const met = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, companies.hispalis.companyId), eq(schema.trustEvents.kind, "COMMUNIQUE_MET")) });
    expect(met).toBeTruthy();
  });

  it("solo el Timonel de la empresa aprueba; aprobar dos veces no hace nada", async () => {
    const lucia = (await db.query.comunicados.findFirst({ where: and(eq(schema.comunicados.companyId, companies.guadalquivir.companyId), eq(schema.comunicados.weekStart, weekStart(TUESDAY))) }))!;
    await expect(approveComunicado(db, { comunicadoId: lucia.id, memberId: companies.hispalis.memberId })).rejects.toThrow(/Solo el Timonel/);
    await approveComunicado(db, { comunicadoId: lucia.id, memberId: companies.guadalquivir.memberId });
    const again = await approveComunicado(db, { comunicadoId: lucia.id, memberId: companies.guadalquivir.memberId });
    expect(again.status).toBe("APPROVED");
  });

  it("antes del viernes a las 14:00 no hay Gaceta; al cerrar, lo no aprobado sale como continuidad y la Gaceta se publica una vez", async () => {
    await createDemand(db, { companyId: companies.securenet.companyId, memberId: companies.securenet.memberId, text: "Pymes industriales con sede nueva" });
    expect(await closeWeek(db, chapterId, TUESDAY)).toEqual({ continuity: 0, gazette: false });
    const open = await gaceta(db, chapterId, companies.hispalis.companyId, TUESDAY);
    expect(open.published).toBe(false);
    expect(open.week).toBe("2026-W41"); // sin Gaceta previa, se anuncia la semana en curso
    const r = await runProtocoloII(db, chapterId, FRIDAY_CLOSE);
    expect(r.drafted).toBe(0); // cerrada: el siguiente borrador sale el lunes
    expect(r.gazette).toBe(true);
    expect(r.continuity).toBeGreaterThanOrEqual(6);
    expect(await closeWeek(db, chapterId, FRIDAY_CLOSE)).toEqual({ continuity: 0, gazette: false }); // idempotente
    const javier = (await db.query.comunicados.findFirst({ where: and(eq(schema.comunicados.companyId, companies.securenet.companyId), eq(schema.comunicados.weekStart, weekStart(TUESDAY))) }))!;
    expect(javier.status).toBe("CONTINUITY");
    const cont = await db.query.trustEvents.findFirst({ where: and(eq(schema.trustEvents.companyId, companies.securenet.companyId), eq(schema.trustEvents.kind, "COMMUNIQUE_CONTINUITY")) });
    expect(cont).toBeTruthy();
    const g = await gaceta(db, chapterId, companies.hispalis.companyId, FRIDAY_CLOSE);
    expect(g.published).toBe(true);
    expect(g.week).toBe("2026-W41");
    expect(g.totals.approved).toBe(2);
    expect(g.totals.continuity).toBe(r.continuity);
    expect(g.all.every((e) => e.companyName.length > 0)).toBe(true);
    expect(g.all.some((e) => e.comunicado.companyId === companies.hispalis.companyId)).toBe(true);
    const published = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.kind, "GAZETTE_PUBLISHED")) });
    expect(published).toHaveLength(1);
    expect(published[0].result).toMatch(/Gaceta · semana 2026-W41/);
  });

  it("la Gaceta destaca para cada Timonel lo que le afecta: la línea nueva de Híspalis es relevante para quien sirve a los mismos clientes", async () => {
    const forLucia = await gaceta(db, chapterId, companies.guadalquivir.companyId, FRIDAY_CLOSE);
    const hisp = forLucia.all.find((e) => e.comunicado.companyId === companies.hispalis.companyId)!;
    expect(hisp.why).toMatch(/licencias/);
    expect(forLucia.relevant.map((e) => e.companyName)).toContain("Reformas Industriales Híspalis");
    expect(forLucia.relevant.every((e) => e.comunicado.companyId !== companies.guadalquivir.companyId)).toBe(true); // nunca la propia
  });

  it("la semana siguiente nace un borrador nuevo y el Dossier guarda el histórico", async () => {
    const NEXT_TUESDAY = new Date("2026-10-13T08:00:00Z");
    const r = await runProtocoloII(db, chapterId, NEXT_TUESDAY);
    expect(r.drafted).toBeGreaterThanOrEqual(8);
    expect(r.gazette).toBe(false);
    const st = await comunicadoStatus(db, companies.hispalis.companyId, NEXT_TUESDAY);
    expect(st.comunicado?.status).toBe("DRAFT");
    expect(st.week).toBe("2026-W42");
    const history = await comunicadoHistory(db, companies.hispalis.companyId);
    expect(history).toHaveLength(1); // solo los publicados
    expect(history[0].week).toBe("2026-W41");
    expect(history[0].text).toContain("licencias de actividad");
  });

  it("en la demo no se envían correos y el Reloj no rompe nada", async () => {
    process.env.NS_MAIL_TRANSPORT = "memory";
    process.env.NS_AUTH_MODE = "demo";
    const { runClock } = await import("@/services/clock");
    const r = await runClock(db, new Date("2026-10-20T08:00:00Z"), chapterId);
    expect(r.comunicados.drafted).toBeGreaterThanOrEqual(8);
    expect(outbox).toHaveLength(0);
  });
});
