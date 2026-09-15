/** Valoración mensual (D-046): lectura de datos verificables del mes y cálculo explicable. */
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { computeValoracion, lastCompletedMonthStart, monthLabel, monthStart, nextMonth, verdictScore, type Valoracion } from "@/core/valoracion";

export interface ValoracionMensual extends Valoracion {
  monthStart: Date;
  monthLabel: string;
}

export async function valoracionMensual(db: Db, chapterId: string, companyId: string, start: Date): Promise<ValoracionMensual> {
  const end = nextMonth(start);
  const given = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.originatorCompanyId, companyId)), columns: { id: true } });
  const verdicts = given.length ? await db.query.verdicts.findMany({ where: and(inArray(schema.verdicts.referralId, given.map((r) => r.id)), gte(schema.verdicts.createdAt, start), lt(schema.verdicts.createdAt, end)) }) : [];
  const weeks = await db.query.contributionWeeks.findMany({ where: and(eq(schema.contributionWeeks.chapterId, chapterId), eq(schema.contributionWeeks.companyId, companyId), gte(schema.contributionWeeks.weekStart, start), lt(schema.contributionWeeks.weekStart, end)) });
  const events = await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.chapterId, chapterId), eq(schema.trustEvents.companyId, companyId), gte(schema.trustEvents.createdAt, start), lt(schema.trustEvents.createdAt, end)) });
  const count = (k: string) => events.filter((e) => e.kind === k).length;
  const v = computeValoracion({
    verdictScores: verdicts.map((x) => verdictScore(x.verdict)),
    weeksMet: weeks.filter((w) => w.action === "NONE").length,
    weeksEvaluated: weeks.length,
    onTime: count("RESPONSE_ON_TIME"),
    late: count("RESPONSE_LATE"),
    directorActions: count("DIRECTOR_INTERCHAPTER_ACTION") + count("DIRECTOR_QUERY_RESOLVED"),
  });
  return { ...v, monthStart: start, monthLabel: monthLabel(start) };
}

/** La Valoración que decide: el último mes completo. Y la del mes en curso, orientativa. */
export async function valoracionActual(db: Db, chapterId: string, companyId: string, now = new Date()) {
  const decisive = await valoracionMensual(db, chapterId, companyId, lastCompletedMonthStart(now));
  const current = await valoracionMensual(db, chapterId, companyId, monthStart(now));
  return { decisive, current };
}

/** D-046: apta para Embajada (y candidata a Director/a de Sala) si el último mes completo alcanzó el 80 %. */
export async function eligibleForEmbajada(db: Db, chapterId: string, companyId: string, now = new Date()) {
  const v = await valoracionMensual(db, chapterId, companyId, lastCompletedMonthStart(now));
  return { eligible: v.eligibleEmbajada, score: v.score, month: v.monthLabel };
}
