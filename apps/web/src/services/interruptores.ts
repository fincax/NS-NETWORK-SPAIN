/**
 * Interruptores (D-076): pausar y reanudar, en tiempo de ejecución y sin desplegar, un Agente de empresa o una Sala entera.
 *
 * Las columnas `agents.status` y `chapters.status` existían desde el principio pero ningún servicio las leía: un Agente
 * "desactivado" en base de datos seguía cualificando. Desde D-076 significan algo:
 *
 *  AGENTE EN PAUSA   La Mesa no lo consulta como candidato (su empresa no recibe Pistas nuevas), no rastrea fuentes públicas
 *                    ni propias, y el Latido no publica en su nombre. Lo que ya está en curso (Cesiones, plazos, Comunicado)
 *                    sigue: son obligaciones de la empresa, no del Agente. Lo pausa y lo reanuda la Directiva de su Sala o NS.
 *  SALA EN PAUSA     Nada agentic ocurre en esa Sala: la Mesa no cualifica (lo publicado espera en la cola), el Reloj no corre
 *                    (nadie es penalizado por una pausa), la Ronda y el Latido la saltan. Solo NS pausa y reanuda una Sala.
 *
 * Cada cambio queda en la Mesa Permanente, con motivo: una pausa no es un secreto para la Sala.
 */
import { and, eq, ne } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";

export type SwitchStatus = "ACTIVE" | "PAUSED";

export class InterruptorError extends Error {}

/** Solo una Sala ACTIVE opera. FORMING (en fundación) y PAUSED no. */
export async function isChapterActive(db: Db, chapterId: string): Promise<boolean> {
  const c = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId), columns: { status: true } });
  return c?.status === "ACTIVE";
}

export async function activeChapterIds(db: Db): Promise<string[]> {
  return (await db.query.chapters.findMany({ where: eq(schema.chapters.status, "ACTIVE"), columns: { id: true } })).map((c) => c.id);
}

export async function inactiveChapterIds(db: Db): Promise<string[]> {
  return (await db.query.chapters.findMany({ where: ne(schema.chapters.status, "ACTIVE"), columns: { id: true } })).map((c) => c.id);
}

export async function companyAgentStatus(db: Db, companyId: string): Promise<SwitchStatus | null> {
  const a = await db.query.agents.findFirst({ where: and(eq(schema.agents.companyId, companyId), eq(schema.agents.kind, "COMPANY")), columns: { status: true } });
  return a ? (a.status === "PAUSED" ? "PAUSED" : "ACTIVE") : null; // TRIAL (D-050) cuenta como activo
}

async function actor(db: Db, memberId: string) {
  const m = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!m) throw new InterruptorError("Persona no encontrada.");
  return m;
}

/** La Directiva de la Sala (o NS) pausa o reanuda el Agente de una empresa de su Sala. */
export async function setAgentStatus(db: Db, input: { chapterId: string; companyId: string; memberId: string; status: SwitchStatus; reason: string }) {
  const m = await actor(db, input.memberId);
  if (!m.isNetwork && !(m.isDirector && m.chapterId === input.chapterId)) throw new InterruptorError("Solo la Directiva de la Sala o NS pausan un Agente.");
  const reason = input.reason.trim();
  if (reason.length < 6) throw new InterruptorError("Di el motivo en una frase: la Sala lo verá.");
  const agent = await db.query.agents.findFirst({ where: and(eq(schema.agents.companyId, input.companyId), eq(schema.agents.kind, "COMPANY"), eq(schema.agents.chapterId, input.chapterId)) });
  if (!agent) throw new InterruptorError("Esa empresa no tiene Agente en esta Sala.");
  if (agent.status === input.status) return agent;
  // Reanudar devuelve al estado que tenía la empresa: TRIAL si está en Prueba de Valor (D-050), ACTIVE si es titular.
  const resumeTo = (await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId), columns: { status: true } }))?.status === "TRIAL" ? "TRIAL" : "ACTIVE";
  if (input.status === "ACTIVE" && agent.status === resumeTo) return agent;
  const [updated] = await db.update(schema.agents).set({ status: input.status === "ACTIVE" ? resumeTo : "PAUSED" }).where(eq(schema.agents.id, agent.id)).returning();
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId), columns: { name: true } });
  await audit(db, { chapterId: input.chapterId, kind: input.status === "PAUSED" ? "AGENT_PAUSED" : "AGENT_RESUMED", actor: { type: "USER", id: m.id }, subject: { type: "Agent", id: agent.id }, policyApplied: `switch.agent.${input.status.toLowerCase()}`, result: input.status === "PAUSED" ? `${m.fullName} pausó el Agente de ${company?.name ?? "una empresa"}: ${reason}. No recibirá Pistas nuevas ni rastreará hasta que se reanude; lo que está en curso sigue.` : `${m.fullName} reanudó el Agente de ${company?.name ?? "una empresa"}: ${reason}.`, significant: true });
  return updated;
}

/** Solo NS pausa o reanuda una Sala entera. */
export async function setChapterStatus(db: Db, input: { chapterId: string; memberId: string; status: SwitchStatus; reason: string }) {
  const m = await actor(db, input.memberId);
  if (!m.isNetwork) throw new InterruptorError("Solo NS pausa o reanuda una Sala.");
  const reason = input.reason.trim();
  if (reason.length < 6) throw new InterruptorError("Di el motivo en una frase: la Sala lo verá.");
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, input.chapterId) });
  if (!chapter) throw new InterruptorError("Sala no encontrada.");
  if (chapter.status === "FORMING") throw new InterruptorError("Una Sala en fundación no se pausa: aún no opera.");
  if (chapter.status === input.status) return chapter;
  const [updated] = await db.update(schema.chapters).set({ status: input.status }).where(eq(schema.chapters.id, chapter.id)).returning();
  await audit(db, { chapterId: chapter.id, kind: input.status === "PAUSED" ? "CHAPTER_PAUSED" : "CHAPTER_RESUMED", actor: { type: "USER", id: m.id }, subject: { type: "Chapter", id: chapter.id }, policyApplied: `switch.chapter.${input.status.toLowerCase()}`, result: input.status === "PAUSED" ? `NS pausó ${chapter.name}: ${reason}. La Mesa no cualifica y el Reloj no corre hasta que se reanude; ningún plazo cuenta durante la pausa.` : `NS reanudó ${chapter.name}: ${reason}. La Mesa retoma lo que esperaba en la cola.`, significant: true });
  return updated;
}

/** Para la Directiva: el estado de cada Agente de empresa de la Sala. */
export async function listAgentSwitches(db: Db, chapterId: string) {
  const agents = await db.query.agents.findMany({ where: and(eq(schema.agents.chapterId, chapterId), eq(schema.agents.kind, "COMPANY")) });
  const companies = new Map((await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapterId), columns: { id: true, name: true, slug: true, status: true } })).map((c) => [c.id, c]));
  return agents
    .map((a) => ({ agentId: a.id, companyId: a.companyId as string, company: companies.get(a.companyId as string), status: (a.status === "PAUSED" ? "PAUSED" : "ACTIVE") as SwitchStatus }))
    .filter((x) => x.company && x.company.status !== "RELEASED")
    .sort((a, b) => (a.company!.name > b.company!.name ? 1 : -1));
}
