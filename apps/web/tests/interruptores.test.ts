/** Interruptores (D-076): pausar un Agente o una Sala en tiempo de ejecución, y historial de versiones del ADN. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { runJobs } from "@/services/jobs";
import { runClock } from "@/services/clock";
import { runRonda } from "@/services/ronda";
import { InterruptorError, companyAgentStatus, listAgentSwitches, setAgentStatus, setChapterStatus } from "@/services/interruptores";
import { dnaHistory, updateDna } from "@/services/onboarding";
import type { PublicFeed } from "@/agents/rastreo";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";
process.env.NS_LATIDO = "off";

let db: Db;
let chapterId: string;
let c: Record<string, { companyId: string; memberId: string }>;
let networkMemberId: string;
let directorMemberId: string;

const OBRA = "Mi cliente Metalúrgica del Sur, empresa industrial de 120 empleados, abre una nueva nave industrial en Dos Hermanas en Q2 con 40 empleados nuevos. Presupuesto de obra aprobado de 400.000 €. Decide el Director General, con el que tengo trato directo.";
const emptyFeed: PublicFeed = { name: "vacío", async fetch() { return []; } } as unknown as PublicFeed;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  c = r.companies;
  chapterId = (await db.query.companies.findFirst({ where: eq(schema.companies.id, c["hispalis"].companyId) }))!.chapterId;
  networkMemberId = (await db.query.members.findFirst({ where: eq(schema.members.isNetwork, true) }))!.id;
  directorMemberId = (await db.query.members.findFirst({ where: and(eq(schema.members.isDirector, true), eq(schema.members.isNetwork, false)) }))!.id;
});
afterAll(async () => {
  await closeDb();
});

describe("Agente en pausa", () => {
  it("solo la Directiva o NS lo pausan, y siempre con motivo", async () => {
    await expect(setAgentStatus(db, { chapterId, companyId: c["hispalis"].companyId, memberId: c["hispalis"].memberId, status: "PAUSED", reason: "Me pauso yo" })).rejects.toBeInstanceOf(InterruptorError);
    await expect(setAgentStatus(db, { chapterId, companyId: c["hispalis"].companyId, memberId: directorMemberId, status: "PAUSED", reason: "x" })).rejects.toThrow(/motivo/);
    await setAgentStatus(db, { chapterId, companyId: c["hispalis"].companyId, memberId: directorMemberId, status: "PAUSED", reason: "Pistas fuera de especialidad; lo revisamos con Carlos" });
    expect(await companyAgentStatus(db, c["hispalis"].companyId)).toBe("PAUSED");
    const ev = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "AGENT_PAUSED") });
    expect(ev?.significant).toBe(true); // la Sala lo ve, con el motivo
    expect(ev?.result).toMatch(/lo revisamos con Carlos/);
    expect((await listAgentSwitches(db, chapterId)).find((s) => s.companyId === c["hispalis"].companyId)?.status).toBe("PAUSED");
  });

  it("la Mesa no lo consulta: su empresa no recibe la Pista que antes recibía", async () => {
    const created = await createSignal(db, { companyId: c["guadalquivir"].companyId, memberId: c["guadalquivir"].memberId, rawContent: OBRA, thirdPartyExpectsContact: true });
    const res = await publishSignal(db, created.opportunitySignal.id, c["guadalquivir"].memberId);
    const toHispalis = await db.query.referrals.findMany({ where: and(eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id), eq(schema.referrals.receiverCompanyId, c["hispalis"].companyId)) });
    expect(toHispalis).toHaveLength(0);
    expect(res.paused).toBeUndefined();
    const skipped = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.kind, "AGENT_PAUSED_SKIPPED"), eq(schema.auditEvents.subjectType, "Need")) });
    expect(skipped?.companyIds).toEqual([c["hispalis"].companyId]);
  });

  it("reanudado, vuelve a recibir Pistas; la Ronda no rastrea con él mientras está en pausa", async () => {
    const ronda = await runRonda(db, new Date(), emptyFeed, async () => "");
    const mine = ronda.chapters.find((ch) => ch.chapterId === chapterId)!;
    const activeAgents = (await listAgentSwitches(db, chapterId)).filter((s) => s.status === "ACTIVE" && s.company!.status === "ACTIVE").length;
    expect(mine.rastreo.agents).toBe(activeAgents); // Híspalis no cuenta
    await setAgentStatus(db, { chapterId, companyId: c["hispalis"].companyId, memberId: networkMemberId, status: "ACTIVE", reason: "Revisado con el Timonel" });
    expect(await companyAgentStatus(db, c["hispalis"].companyId)).toBe("ACTIVE");
    const created = await createSignal(db, { companyId: c["guadalquivir"].companyId, memberId: c["guadalquivir"].memberId, rawContent: OBRA.replace("Metalúrgica del Sur", "Aceros del Aljarafe"), thirdPartyExpectsContact: true });
    await publishSignal(db, created.opportunitySignal.id, c["guadalquivir"].memberId);
    const toHispalis = await db.query.referrals.findMany({ where: and(eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id), eq(schema.referrals.receiverCompanyId, c["hispalis"].companyId)) });
    expect(toHispalis.length).toBeGreaterThan(0);
  });
});

describe("Sala en pausa", () => {
  it("solo NS la pausa; una Sala en fundación no se pausa", async () => {
    await expect(setChapterStatus(db, { chapterId, memberId: directorMemberId, status: "PAUSED", reason: "Incidencia con el modelo" })).rejects.toBeInstanceOf(InterruptorError);
    await setChapterStatus(db, { chapterId, memberId: networkMemberId, status: "PAUSED", reason: "Incidencia con el proveedor del modelo" });
    expect((await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId) }))?.status).toBe("PAUSED");
    expect((await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "CHAPTER_PAUSED") }))?.significant).toBe(true);
  });

  it("publicar deja el Indicio en la cola sin cualificar; la cola no lo reclama; el Reloj y la Ronda la saltan", async () => {
    const created = await createSignal(db, { companyId: c["guadalquivir"].companyId, memberId: c["guadalquivir"].memberId, rawContent: OBRA.replace("Metalúrgica del Sur", "Forjas de Utrera"), thirdPartyExpectsContact: true });
    const res = await publishSignal(db, created.opportunitySignal.id, c["guadalquivir"].memberId);
    expect(res.paused).toBe(true);
    expect(res.referralIds).toHaveLength(0);
    const job = await db.query.agentJobs.findFirst({ where: eq(schema.agentJobs.subjectId, created.opportunitySignal.id) });
    expect(job?.status).toBe("QUEUED");
    expect((await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, created.opportunitySignal.id) }))?.status).toBe("PUBLISHED");
    const jobs = await runJobs(db, { chapterId });
    expect(jobs.done + jobs.failed + jobs.needsHuman).toBe(0);
    expect((await db.query.agentJobs.findFirst({ where: eq(schema.agentJobs.id, job!.id) }))?.attempts).toBe(0); // sin consumir intentos
    // El Reloj no corre: una Cesión en revisión desde hace cuatro días no caduca ni recuerda.
    const stale = await db.query.referrals.findFirst({ where: and(eq(schema.referrals.chapterId, chapterId), inArray(schema.referrals.state, ["ORIGINATOR_PENDING", "RECEIVER_PENDING"])) });
    expect(stale).toBeTruthy();
    const clock = await runClock(db, new Date(Date.now() + 4 * 86_400_000), chapterId);
    expect(clock.reminders + clock.expired + clock.late).toBe(0);
    expect((await db.query.referrals.findFirst({ where: eq(schema.referrals.id, stale!.id) }))?.state).toBe(stale!.state);
    const ronda = await runRonda(db, new Date(), emptyFeed, async () => "");
    expect(ronda.chapters.find((ch) => ch.chapterId === chapterId)?.paused).toBe(true);
  });

  it("reanudada, la cola cualifica lo que esperaba", async () => {
    await setChapterStatus(db, { chapterId, memberId: networkMemberId, status: "ACTIVE", reason: "Incidencia resuelta" });
    const jobs = await runJobs(db, { chapterId });
    expect(jobs.done).toBeGreaterThanOrEqual(1);
    const queued = await db.query.agentJobs.findMany({ where: and(eq(schema.agentJobs.chapterId, chapterId), eq(schema.agentJobs.status, "QUEUED")) });
    expect(queued).toHaveLength(0);
  });
});

describe("Historial del ADN (D-076)", () => {
  it("cada cambio conserva la versión anterior tal cual, con el motivo", async () => {
    const companyId = c["hispalis"].companyId;
    const before = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) }))!;
    expect(await dnaHistory(db, companyId)).toHaveLength(0);
    await updateDna(db, companyId, { ...before.dna, commercial: { ...before.dna.commercial, ticket_min: 55_000 } }, c["hispalis"].memberId, "intencion");
    const history = await dnaHistory(db, companyId);
    expect(history).toHaveLength(1);
    expect(history[0].version).toBe(before.version);
    expect(history[0].dna.commercial.ticket_min).toBe(before.dna.commercial.ticket_min);
    expect(history[0].reason).toBe("intencion");
    expect(history[0].replacedBy).toBe(c["hispalis"].memberId);
    const after = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) }))!;
    expect(after.version).toBe(before.version + 1);
    expect(after.dna.commercial.ticket_min).toBe(55_000);
  });
});
