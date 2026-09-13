/** Encargos (D-032): lo que una empresa busca ahora, visible en la Sala y usado por los Agentes para priorizar. */
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import type { BusinessTrigger } from "@/core/types";

export async function createDemand(db: Db, input: { companyId: string; memberId?: string; text: string; trigger?: BusinessTrigger; industry?: string; valueBand?: string; activeUntil?: Date }) {
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId) });
  if (!company) throw new Error("Empresa no encontrada");
  const [row] = await db.insert(schema.demands).values({ chapterId: company.chapterId, companyId: company.id, text: input.text.trim(), trigger: input.trigger, industry: input.industry, valueBand: input.valueBand, activeUntil: input.activeUntil ?? new Date(Date.now() + 90 * 86_400_000) }).returning();
  await audit(db, { chapterId: company.chapterId, kind: "DEMAND_POSTED", actor: { type: "USER", id: input.memberId ?? "member" }, subject: { type: "Demand", id: row.id }, result: `${company.name} publica un Encargo: "${row.text}".`, significant: true });
  return row;
}

export async function closeDemand(db: Db, demandId: string, status: "FULFILLED" | "CLOSED" = "CLOSED") {
  await db.update(schema.demands).set({ status }).where(eq(schema.demands.id, demandId));
}

export async function openDemands(db: Db, chapterId: string, companyId?: string) {
  const rows = await db.query.demands.findMany({ where: and(eq(schema.demands.chapterId, chapterId), eq(schema.demands.status, "OPEN"), companyId ? eq(schema.demands.companyId, companyId) : undefined), orderBy: [desc(schema.demands.createdAt)] });
  const now = Date.now();
  return rows.filter((d) => !d.activeUntil || d.activeUntil.getTime() >= now);
}

/** Encargo abierto de la empresa receptora que coincide con los triggers del Indicio (o sin trigger declarado). */
export function matchingDemand(demands: { text: string; trigger: string | null; industry: string | null }[], triggers: string[], industry: string): string | undefined {
  const hit = demands.find((d) => (!d.trigger || triggers.includes(d.trigger)) && (!d.industry || d.industry.toLowerCase() === industry.toLowerCase()));
  return hit?.text;
}
