/**
 * Acciones de dirección (D-048): un Director/a de Sala promueve acciones entre Salas y resuelve dudas entre Timoneles.
 * Cada acción queda en la Mesa (visible para la Sala) y suma puntos de Valoración a la empresa del Director/a.
 * Solo suma: nunca resta, y el Contraste puede revisar acciones vacías.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";

export type DirectorActionKind = "INTERCHAPTER" | "QUERY";
export const DIRECTOR_ACTION_MERIT: Record<DirectorActionKind, number> = { INTERCHAPTER: 15, QUERY: 10 };

export class DireccionError extends Error {}

export async function logDirectorAction(db: Db, input: { chapterId: string; memberId: string; kind: DirectorActionKind; text: string }) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || !member.isDirector || member.chapterId !== input.chapterId) throw new DireccionError("Solo un Director/a de la Sala registra acciones de dirección.");
  const text = input.text.trim();
  if (text.length < 12) throw new DireccionError("Describe la acción en una frase: qué se hizo y con quién.");
  const kind = input.kind === "INTERCHAPTER" ? "DIRECTOR_INTERCHAPTER_ACTION" : "DIRECTOR_QUERY_RESOLVED";
  await db.insert(schema.trustEvents).values({ chapterId: input.chapterId, companyId: member.companyId, kind, weight: DIRECTOR_ACTION_MERIT[input.kind], evidenceRef: `member:${member.id}` });
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, member.companyId), columns: { name: true } });
  await audit(db, { chapterId: input.chapterId, kind: "DIRECTOR_ACTION", actor: { type: "USER", id: member.id }, subject: { type: "Company", id: member.companyId }, policyApplied: input.kind === "INTERCHAPTER" ? "direccion.interchapter" : "direccion.query", result: `${member.fullName} (${company?.name ?? "Directiva"}) · ${input.kind === "INTERCHAPTER" ? "Acción entre Salas" : "Duda resuelta"}: ${text}`, significant: true });
  return { kind, merit: DIRECTOR_ACTION_MERIT[input.kind] };
}

export async function listDirectorActions(db: Db, chapterId: string, limit = 8) {
  return db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), inArray(schema.auditEvents.kind, ["DIRECTOR_ACTION"])), orderBy: [desc(schema.auditEvents.occurredAt)], limit });
}
