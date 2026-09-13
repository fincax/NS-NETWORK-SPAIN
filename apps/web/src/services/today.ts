/** Hoy y Mesa Permanente: lecturas agregadas para la interfaz. Solo AuditEvents significativos y visibles para la empresa. */
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { REVIEW_STATES } from "@/core/state-machine";

export async function mesaTimeline(db: Db, chapterId: string, companyId: string, limit = 40) {
  const rows = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.significant, true)), orderBy: [desc(schema.auditEvents.occurredAt)], limit: limit * 2 });
  return rows.filter((r) => r.companyIds.length === 0 || r.companyIds.includes(companyId)).slice(0, limit);
}

export async function todaySummary(db: Db, chapterId: string, companyId: string, since?: Date) {
  const from = since ?? new Date(Date.now() - 24 * 3_600_000);
  const events = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), gte(schema.auditEvents.occurredAt, from)) });
  const visible = events.filter((r) => r.companyIds.length === 0 || r.companyIds.includes(companyId));
  const count = (kinds: string[]) => visible.filter((e) => kinds.includes(e.kind)).length;
  const agentConversations = count(["QUALIFICATION_EXCHANGE", "INTEREST_CLAIM", "AGENT_DISCOVERY", "NO_INTEREST"]);
  const signals = count(["SIGNAL_PUBLISHED", "SIGNAL_CLASSIFIED"]);
  const matches = count(["MATCH_PROPOSED", "MATCH_BELOW_THRESHOLD"]);

  const pending = await db.query.referrals.findMany({
    where: and(eq(schema.referrals.chapterId, chapterId), inArray(schema.referrals.state, [...REVIEW_STATES]), or(eq(schema.referrals.receiverCompanyId, companyId), eq(schema.referrals.originatorCompanyId, companyId))),
  });
  const mine = pending.filter((r) => (r.state === "ORIGINATOR_PENDING" && r.originatorCompanyId === companyId) || (r.state === "RECEIVER_PENDING" && r.receiverCompanyId === companyId));
  const potential = pending.reduce((a, r) => ({ min: a.min + (r.valuePotentialMin ?? 0), max: a.max + (r.valuePotentialMax ?? 0) }), { min: 0, max: 0 });
  const internal = visible.filter((e) => e.kind === "INTERNAL_MATCH_FOUND");
  return { agentConversations, signals, matches, pendingForMe: mine.length, pendingTotal: pending.length, potential, internal };
}

export async function balance(db: Db, chapterId: string, companyId: string) {
  const given = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.originatorCompanyId, companyId)) });
  const received = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.receiverCompanyId, companyId)) });
  const valid = (r: { state: string }) => !["DISQUALIFIED", "BLOCKED", "REJECTED_BY_MEMBER", "WITHDRAWN_BY_ORIGINATOR", "EXPIRED"].includes(r.state);
  const confirmed = (rs: typeof given) => rs.filter((r) => r.state === "VALUE_CONFIRMED").reduce((a, r) => a + (r.valueVerified ?? 0), 0);
  const merit = await db.select({ total: sql<number>`coalesce(sum(${schema.trustEvents.weight}), 0)` }).from(schema.trustEvents).where(eq(schema.trustEvents.companyId, companyId));
  return { given: given.filter(valid).length, received: received.filter(valid).length, valueGiven: confirmed(given), valueReceived: confirmed(received), merit: Number(merit[0]?.total ?? 0) };
}
