/**
 * Norma 1 del fundador (N-002, D-044): al menos una Cesión válida a la semana, con escalera de cuatro semanas.
 * Se ejecuta cada mañana en la Ronda y evalúa la semana completa anterior una sola vez por titular (idempotente por semana).
 * Cuenta como Cesión válida de la semana la que el cedente ofreció (visto bueno del cedente con Salvoconducto) y que no ha sido
 * declinada, descartada, bloqueada ni caducada. Los avisos los recibe el Timonel; la suspensión la ve la Sala.
 */
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { ladder, previousWeek, suspensionNotice, type LadderStep } from "@/core/compromiso";

const INVALID = ["REJECTED_BY_MEMBER", "DISQUALIFIED", "BLOCKED", "EXPIRED", "WITHDRAWN_BY_ORIGINATOR"];

export interface CompromisoResult {
  evaluated: number;
  nudges: number;
  firstWarnings: number;
  secondWarnings: number;
  suspensions: number;
  recovered: number;
}

/** Cesiones válidas que un titular ofreció en una ventana (visto bueno del cedente dentro de la ventana; Cesión aún válida). */
export async function offeredValidCesiones(db: Db, companyId: string, start: Date, end: Date): Promise<number> {
  const offered = await db.query.referralTransitions.findMany({ where: and(eq(schema.referralTransitions.fromState, "ORIGINATOR_PENDING"), eq(schema.referralTransitions.toState, "RECEIVER_PENDING"), gte(schema.referralTransitions.occurredAt, start), lt(schema.referralTransitions.occurredAt, end)) });
  if (offered.length === 0) return 0;
  const refs = await db.query.referrals.findMany({ where: and(eq(schema.referrals.originatorCompanyId, companyId), inArray(schema.referrals.id, offered.map((t) => t.referralId))) });
  return refs.filter((r) => !INVALID.includes(r.state)).length;
}

export async function runCompromiso(db: Db, chapterId: string, now = new Date()): Promise<CompromisoResult> {
  const res: CompromisoResult = { evaluated: 0, nudges: 0, firstWarnings: 0, secondWarnings: 0, suspensions: 0, recovered: 0 };
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId) });
  if (!chapter) return res;
  const week = previousWeek(now);
  const companies = await db.query.companies.findMany({ where: and(eq(schema.companies.chapterId, chapterId), eq(schema.companies.status, "ACTIVE")) });
  const directors = await db.query.members.findMany({ where: and(eq(schema.members.chapterId, chapterId), eq(schema.members.isDirector, true)) });
  const directorCompanies = [...new Set(directors.map((d) => d.companyId))];

  for (const c of companies) {
    if (c.compromisoCheckedWeek === week.key) continue; // ya evaluada esta semana
    if (c.createdAt >= week.start) {
      // Sin una semana completa en la Sala todavía: no se evalúa, pero se marca para no repetir.
      await db.update(schema.companies).set({ compromisoCheckedWeek: week.key }).where(eq(schema.companies.id, c.id));
      continue;
    }
    res.evaluated++;
    const offered = await offeredValidCesiones(db, c.id, week.start, week.end);
    if (offered >= chapter.weeklyPace) {
      const hadStreak = c.compromisoWeeksWithout > 0;
      await db.update(schema.companies).set({ compromisoWeeksWithout: 0, compromisoLevel: 0, compromisoCheckedWeek: week.key }).where(eq(schema.companies.id, c.id));
      if (hadStreak) {
        res.recovered++;
        await db.insert(schema.trustEvents).values({ chapterId, companyId: c.id, kind: "CONTRIBUTION_QUOTA_MET", weight: 0, evidenceRef: `week:${week.key}` });
        await audit(db, { chapterId, kind: "COMPROMISO_MET", actor: { type: "AGENT", id: "ronda" }, subject: { type: "Company", id: c.id }, policyApplied: "reglamento.n002", result: `Vuelves a estar al día con el Reglamento: ${offered} Cesión(es) válida(s) la semana pasada. La cuenta de avisos se reinicia.`, significant: true, companyIds: [c.id] });
      }
      continue;
    }
    const weeksWithout = c.compromisoWeeksWithout + 1;
    const step: LadderStep = ladder(weeksWithout, chapter.weeklyPace);
    await db.update(schema.companies).set({ compromisoWeeksWithout: weeksWithout, compromisoLevel: step.level, compromisoCheckedWeek: week.key }).where(eq(schema.companies.id, c.id));
    const audience = step.toDirectiva ? [...new Set([c.id, ...directorCompanies])] : [c.id];
    if (step.kind === "NUDGE") {
      res.nudges++;
      await audit(db, { chapterId, kind: "COMPROMISO_NUDGE", actor: { type: "AGENT", id: "ronda" }, subject: { type: "Company", id: c.id }, policyApplied: "reglamento.n002.week1", result: step.message, significant: true, companyIds: [c.id] });
    } else if (step.kind === "FIRST_WARNING") {
      res.firstWarnings++;
      await audit(db, { chapterId, kind: "COMPROMISO_FIRST_WARNING", actor: { type: "AGENT", id: "ronda" }, subject: { type: "Company", id: c.id }, policyApplied: "reglamento.n002.week2", result: step.message, significant: true, companyIds: audience });
    } else if (step.kind === "SECOND_WARNING") {
      res.secondWarnings++;
      await audit(db, { chapterId, kind: "COMPROMISO_SECOND_WARNING", actor: { type: "AGENT", id: "ronda" }, subject: { type: "Company", id: c.id }, policyApplied: "reglamento.n002.week3", result: step.message, significant: true, companyIds: audience });
    } else if (step.kind === "SUSPENSION") {
      res.suspensions++;
      await db.update(schema.companies).set({ status: "SUSPENDED" }).where(eq(schema.companies.id, c.id));
      await db.update(schema.categorySeats).set({ status: "SUSPENDED" }).where(eq(schema.categorySeats.companyId, c.id));
      await db.update(schema.agents).set({ status: "SUSPENDED" }).where(and(eq(schema.agents.companyId, c.id), eq(schema.agents.kind, "COMPANY")));
      await db.insert(schema.trustEvents).values({ chapterId, companyId: c.id, kind: "CONTRIBUTION_QUOTA_MISSED", weight: -100, evidenceRef: `week:${week.key}` });
      const seat = await db.query.categorySeats.findFirst({ where: eq(schema.categorySeats.companyId, c.id) });
      const specialty = seat ? await db.query.specialties.findFirst({ where: eq(schema.specialties.id, seat.specialtyId) }) : undefined;
      await audit(db, { chapterId, kind: "COMPROMISO_SUSPENSION", actor: { type: "AGENT", id: "ronda" }, subject: { type: "Company", id: c.id }, policyApplied: "reglamento.n002.week4", result: step.message, significant: true, companyIds: audience });
      await audit(db, { chapterId, kind: "SEAT_SUSPENDED", actor: { type: "SYSTEM", id: "reglamento" }, subject: { type: "CategorySeat", id: seat?.id ?? c.id }, policyApplied: "reglamento.n002.week4", result: suspensionNotice(c.name, specialty?.name ?? null), significant: true });
    }
  }
  return res;
}

/** Estado del Compromiso de un titular para Hoy y la Brújula. */
export async function compromisoStatus(db: Db, companyId: string, now = new Date()) {
  const c = await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) });
  if (!c) return null;
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, c.chapterId) });
  const thisWeekStart = previousWeek(now).end;
  const offeredThisWeek = await offeredValidCesiones(db, companyId, thisWeekStart, new Date(thisWeekStart.getTime() + 7 * 86_400_000));
  const step = ladder(c.compromisoWeeksWithout, chapter?.weeklyPace ?? 1);
  return { weeksWithout: c.compromisoWeeksWithout, level: c.compromisoLevel, offeredThisWeek, pace: chapter?.weeklyPace ?? 1, suspended: c.status === "SUSPENDED", step };
}
