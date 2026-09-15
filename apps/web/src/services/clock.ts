/**
 * Reloj de la Sala (D-030): ejecuta los plazos de NS-ARP §9.1 y D-024.
 *  - Revisión: recordatorio a las 72 h; caducidad a los 7 días (vuelve al cedente; el silencio cuenta).
 *  - Puente: respuesta al Interesado en 48 h; si no hay hito, RESPONSE_LATE para el cesionario.
 *  - Seguimiento: el Agente pregunta cada 14 días.
 *  - Compromiso (D-042): cada semana completa, cuenta de Cesiones válidas por titular y escalera de avisos hasta la baja.
 * Idempotente: cada acción se marca en la Cesión y no se repite. El empujón lo recibe el Timonel, nunca el Interesado.
 */
import { and, eq, inArray, lt, isNull, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { TIMEOUTS } from "@/core/state-machine";
import { evaluateCompromiso, type CompromisoResult } from "@/services/compromiso";

export interface ClockResult {
  reminders: number;
  expired: number;
  late: number;
  nudges: number;
  compromiso: CompromisoResult;
}

const H = 3_600_000;
const D = 86_400_000;

export async function runClock(db: Db, now = new Date(), chapterId?: string): Promise<ClockResult> {
  const res: ClockResult = { reminders: 0, expired: 0, late: 0, nudges: 0, compromiso: { evaluated: 0, met: 0, notices: 0, releases: 0 } };
  const scope = chapterId ? eq(schema.referrals.chapterId, chapterId) : undefined;

  // 1 · Recordatorio a las 72 h en revisión
  const toRemind = await db.query.referrals.findMany({
    where: and(scope, inArray(schema.referrals.state, ["ORIGINATOR_PENDING", "RECEIVER_PENDING"]), isNull(schema.referrals.reminderSentAt), lt(schema.referrals.reviewRequestedAt, new Date(now.getTime() - TIMEOUTS.reminderHours * H))),
  });
  for (const r of toRemind) {
    const waitingOn = r.state === "ORIGINATOR_PENDING" ? r.originatorCompanyId : r.receiverCompanyId;
    await db.update(schema.referrals).set({ reminderSentAt: now }).where(eq(schema.referrals.id, r.id));
    await audit(db, { chapterId: r.chapterId, kind: "REMINDER", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "timeouts.reminder_72h", result: `Tu Agente te recuerda una Cesión que espera tu decisión desde hace 3 días. Caduca en ${Math.max(0, Math.ceil(((r.expiresAt?.getTime() ?? now.getTime()) - now.getTime()) / D))} días.`, significant: true, companyIds: [waitingOn] });
    res.reminders++;
  }

  // 2 · Caducidad a los 7 días
  const toExpire = await db.query.referrals.findMany({
    where: and(scope, inArray(schema.referrals.state, ["ORIGINATOR_PENDING", "RECEIVER_PENDING", "DIRECTOR_PENDING"]), lt(schema.referrals.expiresAt, now)),
  });
  for (const r of toExpire) {
    const silent = r.state === "ORIGINATOR_PENDING" ? r.originatorCompanyId : r.state === "RECEIVER_PENDING" ? r.receiverCompanyId : null;
    await db.insert(schema.referralTransitions).values({ referralId: r.id, fromState: r.state, toState: "EXPIRED", actorType: "SYSTEM", actorId: "clock", reason: "Caducada por silencio (7 días)" });
    await db.update(schema.referrals).set({ state: "EXPIRED", updatedAt: now }).where(eq(schema.referrals.id, r.id));
    if (silent) await db.insert(schema.trustEvents).values({ chapterId: r.chapterId, companyId: silent, kind: "RESPONSE_LATE", weight: -20, evidenceRef: `referral:${r.id}` });
    await audit(db, { chapterId: r.chapterId, kind: "EXPIRED", actor: { type: "SYSTEM", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "timeouts.expiry_7d", result: silent === r.receiverCompanyId ? "Cesión caducada: el cesionario no respondió en 7 días. Vuelve al cedente, que puede proponerla a otra Sala. El silencio cuenta en la Hoja de Méritos." : "Cesión caducada por silencio en la revisión.", significant: true, companyIds: [r.originatorCompanyId, r.receiverCompanyId] });
    res.expired++;
  }

  // 3 · Respuesta al Interesado en 48 h tras el Puente
  const toFlag = await db.query.referrals.findMany({
    where: and(scope, eq(schema.referrals.state, "INTRODUCED"), isNull(schema.referrals.lateFlaggedAt), lt(schema.referrals.responseDueAt, now)),
  });
  for (const r of toFlag) {
    await db.update(schema.referrals).set({ lateFlaggedAt: now }).where(eq(schema.referrals.id, r.id));
    await db.insert(schema.trustEvents).values({ chapterId: r.chapterId, companyId: r.receiverCompanyId, kind: "RESPONSE_LATE", weight: -10, evidenceRef: `referral:${r.id}` });
    await audit(db, { chapterId: r.chapterId, kind: "RESPONSE_LATE", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "timeouts.response_48h", result: "Han pasado 48 h desde el Puente sin un hito. Responde al Interesado y actualiza el seguimiento: el plazo de respuesta de 48 h cuenta en tu Hoja de Méritos.", significant: true, companyIds: [r.receiverCompanyId] });
    res.late++;
  }

  // 4 · Check-in cada 14 días en curso
  const stale = new Date(now.getTime() - TIMEOUTS.checkInDays * D);
  const toNudge = await db.query.referrals.findMany({
    where: and(scope, inArray(schema.referrals.state, ["INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY"]), lt(schema.referrals.updatedAt, stale), or(isNull(schema.referrals.lastNudgeAt), lt(schema.referrals.lastNudgeAt, stale))),
  });
  for (const r of toNudge) {
    await db.update(schema.referrals).set({ lastNudgeAt: now }).where(eq(schema.referrals.id, r.id));
    await audit(db, { chapterId: r.chapterId, kind: "CHECK_IN", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "timeouts.checkin_14d", result: "Tu Agente pregunta: ¿cómo va esta Cesión? Actualiza el hito o cierra con el Veredicto. Al cedente también le gustará saberlo.", significant: true, companyIds: [r.receiverCompanyId] });
    res.nudges++;
  }

  // 5 · Compromiso semanal (D-042): última semana completa, una vez por titular
  if (chapterId) {
    res.compromiso = await evaluateCompromiso(db, now, chapterId);
  } else {
    const chapters = await db.query.chapters.findMany({ columns: { id: true } });
    for (const c of chapters) {
      const r = await evaluateCompromiso(db, now, c.id);
      res.compromiso = { evaluated: res.compromiso.evaluated + r.evaluated, met: res.compromiso.met + r.met, notices: res.compromiso.notices + r.notices, releases: res.compromiso.releases + r.releases };
    }
  }
  return res;
}

/** En la interfaz el Reloj se ejecuta al cargar Hoy, como máximo una vez cada 10 minutos por proceso. */
const g = globalThis as unknown as { __nsClockAt?: number };
export async function runClockThrottled(db: Db, chapterId: string): Promise<ClockResult | null> {
  const now = Date.now();
  if (g.__nsClockAt && now - g.__nsClockAt < 10 * 60_000) return null;
  g.__nsClockAt = now;
  return runClock(db, new Date(now), chapterId);
}
