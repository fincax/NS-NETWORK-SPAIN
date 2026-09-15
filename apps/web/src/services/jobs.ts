/**
 * Cola de trabajos de los Agentes (D-053). La Mesa (extracción, discovery, cualificación entre Agentes, score,
 * compliance) puede tardar con el modelo real y no debe bloquear la pantalla del Timonel.
 *
 *  - `enqueueMesa`: un trabajo por Indicio (idempotente: la clave (kind, subject) es única).
 *  - `runJobs`: reclama trabajos QUEUED vencidos de uno en uno (UPDATE condicional: dos procesos no cogen el mismo),
 *    ejecuta la Mesa y cierra DONE; en fallo reintenta con espera creciente hasta MAX_ATTEMPTS y pasa a NEEDS_HUMAN,
 *    con aviso al cedente en Hoy. La Mesa es idempotente por Indicio, así que un reintento nunca duplica Cesiones.
 *  - Se drena tras cada publicación (after()), en cada Ronda y en GET /api/jobs.
 */
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { runMesa } from "@/agents/mesa";

export const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 60_000, 5 * 60_000];

export async function enqueueMesa(db: Db, chapterId: string, opportunitySignalId: string) {
  const [row] = await db
    .insert(schema.agentJobs)
    .values({ chapterId, kind: "MESA", subjectId: opportunitySignalId })
    .onConflictDoNothing({ target: [schema.agentJobs.kind, schema.agentJobs.subjectId] })
    .returning();
  return row ?? (await db.query.agentJobs.findFirst({ where: and(eq(schema.agentJobs.kind, "MESA"), eq(schema.agentJobs.subjectId, opportunitySignalId)) }))!;
}

export interface JobsResult {
  done: number;
  failed: number;
  needsHuman: number;
}

/** Reclama un trabajo: solo gana quien lo pasa de QUEUED a RUNNING. */
async function claim(db: Db, now: Date, chapterId?: string) {
  const candidate = await db.query.agentJobs.findFirst({
    where: and(eq(schema.agentJobs.status, "QUEUED"), lte(schema.agentJobs.runAfter, now), chapterId ? eq(schema.agentJobs.chapterId, chapterId) : undefined),
    orderBy: [asc(schema.agentJobs.runAfter), asc(schema.agentJobs.createdAt)],
  });
  if (!candidate) return null;
  const [claimed] = await db
    .update(schema.agentJobs)
    .set({ status: "RUNNING", startedAt: now, attempts: sql`${schema.agentJobs.attempts} + 1` })
    .where(and(eq(schema.agentJobs.id, candidate.id), eq(schema.agentJobs.status, "QUEUED")))
    .returning();
  return claimed ?? null;
}

export async function runJobs(db: Db, opts: { now?: Date; max?: number; chapterId?: string } = {}): Promise<JobsResult> {
  const now = opts.now ?? new Date();
  const res: JobsResult = { done: 0, failed: 0, needsHuman: 0 };
  for (let i = 0; i < (opts.max ?? 10); i++) {
    const job = await claim(db, now, opts.chapterId);
    if (!job) break;
    try {
      if (job.kind === "MESA") await runMesa(db, job.subjectId);
      else throw new Error(`Trabajo desconocido: ${job.kind}`);
      await db.update(schema.agentJobs).set({ status: "DONE", finishedAt: new Date(), lastError: null }).where(eq(schema.agentJobs.id, job.id));
      res.done++;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (job.attempts >= MAX_ATTEMPTS) {
        await db.update(schema.agentJobs).set({ status: "NEEDS_HUMAN", finishedAt: new Date(), lastError: message }).where(eq(schema.agentJobs.id, job.id));
        const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, job.subjectId), columns: { originatorCompanyId: true } });
        await audit(db, { chapterId: job.chapterId, kind: "MESA_NEEDS_HUMAN", actor: { type: "SYSTEM", id: "jobs" }, subject: { type: "OpportunitySignal", id: job.subjectId }, policyApplied: "jobs.max_attempts", result: `La Mesa no pudo cualificar este Indicio tras ${MAX_ATTEMPTS} intentos. Tu Agente lo deja en tus manos: revísalo o vuelve a publicarlo.`, significant: true, companyIds: os ? [os.originatorCompanyId] : [] });
        res.needsHuman++;
      } else {
        await db.update(schema.agentJobs).set({ status: "QUEUED", lastError: message, runAfter: new Date(now.getTime() + (BACKOFF_MS[job.attempts] ?? BACKOFF_MS[BACKOFF_MS.length - 1])) }).where(eq(schema.agentJobs.id, job.id));
        res.failed++;
      }
    }
  }
  return res;
}

/** Lo que está en la Mesa ahora mismo (para la pantalla de la Mesa y el avatar del Agente). */
export async function mesaLoad(db: Db, chapterId: string, companyId?: string) {
  const open = await db.query.agentJobs.findMany({ where: and(eq(schema.agentJobs.chapterId, chapterId), inArray(schema.agentJobs.status, ["QUEUED", "RUNNING"])) });
  if (!companyId) return { total: open.length, mine: 0, needsHuman: 0 };
  const signals = open.length ? await db.query.opportunitySignals.findMany({ where: inArray(schema.opportunitySignals.id, open.map((j) => j.subjectId)), columns: { id: true, originatorCompanyId: true } }) : [];
  const mine = signals.filter((s) => s.originatorCompanyId === companyId).length;
  const stuck = await db.query.agentJobs.findMany({ where: and(eq(schema.agentJobs.chapterId, chapterId), eq(schema.agentJobs.status, "NEEDS_HUMAN")), columns: { subjectId: true } });
  const stuckSignals = stuck.length ? await db.query.opportunitySignals.findMany({ where: inArray(schema.opportunitySignals.id, stuck.map((j) => j.subjectId)), columns: { originatorCompanyId: true } }) : [];
  return { total: open.length, mine, needsHuman: stuckSignals.filter((s) => s.originatorCompanyId === companyId).length };
}

/** Modo de la Mesa: "async" (cola, para el modelo real) o "inline" (al publicar, para demo y pruebas). */
export function mesaMode(): "async" | "inline" {
  if (process.env.NS_MESA_MODE === "async") return "async";
  if (process.env.NS_MESA_MODE === "inline") return "inline";
  return process.env.NS_LLM_PROVIDER !== "deterministic" && process.env.ANTHROPIC_API_KEY ? "async" : "inline";
}
