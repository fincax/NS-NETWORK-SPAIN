import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import type { AuditEventInput } from "@/core/types";

/** Registra un AuditEvent (NS-ARP §11). Nunca razonamientos internos: decisiones, evidencia, política, resultado. */
export async function audit(db: Db, e: AuditEventInput) {
  const [row] = await db
    .insert(schema.auditEvents)
    .values({
      chapterId: e.chapterId,
      kind: e.kind,
      actorType: e.actor.type,
      actorId: e.actor.id,
      subjectType: e.subject.type,
      subjectId: e.subject.id,
      inputsUsed: e.inputsUsed ?? [],
      policyApplied: e.policyApplied,
      result: e.result,
      significant: e.significant ?? false,
      companyIds: e.companyIds ?? [],
    })
    .returning();
  return row;
}
