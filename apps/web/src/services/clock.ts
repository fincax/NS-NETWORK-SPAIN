/**
 * Reloj de la Sala (D-030): ejecuta los plazos de NS-ARP §9.1 y D-024.
 *  - Revisión: recordatorios a las 24 y 48 h; caducidad a las 72 h (vuelve al cedente con el relevo propuesto; el silencio cuenta) (D-068).
 *  - Directiva (D-068): recordatorio a las 4 h; a las 24 h, una excepción de criterio se aprueba sola y una de riesgo escala a NS.
 *  - Pregunta exprés (D-065): recordatorio al cedente a las 4 h; a las 24 h la pregunta queda sin respuesta y la Cesión sigue.
 *  - Puente: respuesta al Interesado en 48 h; si no hay hito, RESPONSE_LATE para el cesionario.
 *  - Seguimiento: el Agente pregunta cada 14 días.
 *  - Compromiso (D-042): cada semana completa, cuenta de Cesiones válidas por titular y escalera de avisos hasta la baja.
 *  - Protocolo II (D-018, D-069): borrador del Comunicado de la semana para cada titular; al cierre (domingo 20:00 Madrid),
 *    continuidad para lo no aprobado, avisos y Gaceta de la Sala.
 * Idempotente: cada acción se marca en la Cesión y no se repite. El empujón lo recibe el Timonel, nunca el Interesado.
 */
import { and, eq, inArray, lt, isNull, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { AUTO_APPROVABLE_EXCEPTIONS, QUESTION_STATES, TIMEOUTS } from "@/core/state-machine";
import { evaluateCompromiso, type CompromisoResult } from "@/services/compromiso";
import { evaluateComunicados, type CloseResult } from "@/services/comunicado";
import { approveByClock, infoRoundsFor, patchPendingQuestion } from "@/services/referrals";

export interface ClockResult {
  reminders: number;
  expired: number;
  late: number;
  nudges: number;
  questionReminders: number;
  questionsUnanswered: number;
  secondReminders: number;
  directorReminders: number;
  directorApproved: number;
  escalated: number;
  compromiso: CompromisoResult;
  comunicado: CloseResult & { drafted: number };
}

const H = 3_600_000;
const D = 86_400_000;
const hoursLeft = (until: Date | null | undefined, now: Date) => Math.max(0, Math.ceil(((until?.getTime() ?? now.getTime()) - now.getTime()) / H));

export async function runClock(db: Db, now = new Date(), chapterId?: string): Promise<ClockResult> {
  const res: ClockResult = { reminders: 0, expired: 0, late: 0, nudges: 0, questionReminders: 0, questionsUnanswered: 0, secondReminders: 0, directorReminders: 0, directorApproved: 0, escalated: 0, compromiso: { evaluated: 0, met: 0, notices: 0, releases: 0 }, comunicado: { weeks: 0, continuity: 0, notices: 0, gazettes: 0, drafted: 0 } };
  const scope = chapterId ? eq(schema.referrals.chapterId, chapterId) : undefined;

  // 1 · Recordatorio a las 24 h en revisión
  const toRemind = await db.query.referrals.findMany({
    where: and(scope, inArray(schema.referrals.state, ["ORIGINATOR_PENDING", "RECEIVER_PENDING"]), isNull(schema.referrals.reminderSentAt), lt(schema.referrals.reviewRequestedAt, new Date(now.getTime() - TIMEOUTS.reminderHours * H))),
  });
  for (const r of toRemind) {
    const waitingOn = r.state === "ORIGINATOR_PENDING" ? r.originatorCompanyId : r.receiverCompanyId;
    await db.update(schema.referrals).set({ reminderSentAt: now }).where(eq(schema.referrals.id, r.id));
    await audit(db, { chapterId: r.chapterId, kind: "REMINDER", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "timeouts.reminder_24h", result: `Tu Agente te recuerda una Cesión que espera tu decisión desde ayer. Caduca en ${hoursLeft(r.expiresAt, now)} h.`, significant: true, companyIds: [waitingOn] });
    res.reminders++;
  }

  // 1a · Segundo aviso a las 48 h (D-068): queda un día
  const toRemindAgain = await db.query.referrals.findMany({
    where: and(scope, inArray(schema.referrals.state, ["ORIGINATOR_PENDING", "RECEIVER_PENDING"]), isNull(schema.referrals.secondReminderSentAt), lt(schema.referrals.reviewRequestedAt, new Date(now.getTime() - TIMEOUTS.secondReminderHours * H))),
  });
  for (const r of toRemindAgain) {
    const waitingOn = r.state === "ORIGINATOR_PENDING" ? r.originatorCompanyId : r.receiverCompanyId;
    await db.update(schema.referrals).set({ secondReminderSentAt: now, reminderSentAt: r.reminderSentAt ?? now }).where(eq(schema.referrals.id, r.id));
    await audit(db, { chapterId: r.chapterId, kind: "REMINDER", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "timeouts.reminder_48h", result: `Última llamada: esta Cesión caduca en ${hoursLeft(r.expiresAt, now)} h. ${r.state === "RECEIVER_PENDING" ? "Si no decides, vuelve al cedente y el silencio cuenta en tu Hoja de Méritos." : "Si no das el visto bueno, se pierde el referido."} Un toque basta.`, significant: true, companyIds: [waitingOn] });
    res.secondReminders++;
  }

  // 1c · Directiva en 24 h (D-068): recordatorio a las 4 h; a las 24 h, la excepción de criterio se aprueba sola y la de riesgo escala a NS
  const directorPending = await db.query.referrals.findMany({ where: and(scope, eq(schema.referrals.state, "DIRECTOR_PENDING"), isNull(schema.referrals.escalatedAt)) });
  for (const r of directorPending) {
    const since = r.reviewRequestedAt ?? r.updatedAt;
    const age = (now.getTime() - since.getTime()) / H;
    const directors = await db.query.members.findMany({ where: and(eq(schema.members.chapterId, r.chapterId), eq(schema.members.isDirector, true)), columns: { companyId: true } });
    const directorCompanies = [...new Set(directors.map((d) => d.companyId))];
    if (age >= TIMEOUTS.directorHours) {
      const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, r.matchId) });
      const exceptions = match?.compliance?.exceptions ?? [];
      const onlyCriteria = exceptions.length > 0 && exceptions.every((e) => AUTO_APPROVABLE_EXCEPTIONS.has(e));
      if (onlyCriteria) {
        await approveByClock(db, r.id, `La Directiva no decidió en ${TIMEOUTS.directorHours} h; excepción de criterio (${exceptions.join(", ")}) registrada. La Cesión sigue (D-068).`);
        await audit(db, { chapterId: r.chapterId, kind: "DIRECTOR_TIMEOUT", actor: { type: "SYSTEM", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "director.auto_approve_24h", result: `La Directiva no revisó esta excepción (${exceptions.join(", ")}) en ${TIMEOUTS.directorHours} h: la Cesión sigue con la excepción registrada. Nada espera a nadie.`, significant: true, companyIds: [...directorCompanies, r.originatorCompanyId, r.receiverCompanyId] });
        res.directorApproved++;
      } else {
        const network = await db.query.members.findMany({ where: eq(schema.members.isNetwork, true), columns: { companyId: true } });
        await db.update(schema.referrals).set({ escalatedAt: now }).where(eq(schema.referrals.id, r.id));
        await audit(db, { chapterId: r.chapterId, kind: "ESCALATED_TO_NS", actor: { type: "SYSTEM", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "director.escalate_24h", result: `La Directiva no resolvió en ${TIMEOUTS.directorHours} h una excepción de riesgo (${exceptions.join(", ") || "sin detalle"}). Escalada a NS; la Cesión no sigue sola.`, significant: true, companyIds: [...new Set([...directorCompanies, ...network.map((m) => m.companyId)])] });
        res.escalated++;
      }
    } else if (!r.reminderSentAt && age >= TIMEOUTS.directorReminderHours) {
      await db.update(schema.referrals).set({ reminderSentAt: now }).where(eq(schema.referrals.id, r.id));
      await audit(db, { chapterId: r.chapterId, kind: "REMINDER", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "director.reminder_4h", result: `Una Cesión con excepción espera a la Directiva desde hace ${TIMEOUTS.directorReminderHours} h. Quedan ${Math.max(1, Math.round(TIMEOUTS.directorHours - age))} h: después, si la excepción es solo de valor, seguirá sola.`, significant: true, companyIds: directorCompanies });
      res.directorReminders++;
    }
  }

  // 1b · Pregunta exprés (D-065): el cedente tiene 24 h; a las 4 h se le recuerda; vencido el plazo, la pregunta queda sin respuesta y la Cesión sigue.
  const withQuestions = await db.query.referrals.findMany({ where: and(scope, inArray(schema.referrals.state, [...QUESTION_STATES])) });
  const rounds = await infoRoundsFor(db, withQuestions);
  for (const r of withQuestions) {
    const q = rounds.get(r.id)?.pending;
    if (!q?.asked_at) continue;
    const askedAt = new Date(q.asked_at).getTime();
    const dueAt = q.due_at ? new Date(q.due_at).getTime() : askedAt + TIMEOUTS.questionAnswerHours * H;
    if (!q.unanswered_at && now.getTime() >= dueAt) {
      await patchPendingQuestion(db, r, { unanswered_at: now.toISOString() });
      await db.insert(schema.trustEvents).values({ chapterId: r.chapterId, companyId: r.originatorCompanyId, kind: "RESPONSE_LATE", weight: -5, evidenceRef: `referral:${r.id}` });
      await audit(db, { chapterId: r.chapterId, kind: "QUESTION_UNANSWERED", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "question.unanswered_24h", result: `El cedente no respondió en ${TIMEOUTS.questionAnswerHours} h. La Cesión sigue con lo que consta; si responde después, el cesionario verá la respuesta destacada. El retraso cuenta en el plazo de respuesta del cedente.`, significant: true, companyIds: [r.originatorCompanyId, r.receiverCompanyId] });
      res.questionsUnanswered++;
    } else if (!q.unanswered_at && !q.reminded_at && now.getTime() >= askedAt + TIMEOUTS.questionReminderHours * H) {
      await patchPendingQuestion(db, r, { reminded_at: now.toISOString() });
      const left = Math.max(1, Math.round((dueAt - now.getTime()) / H));
      await audit(db, { chapterId: r.chapterId, kind: "REMINDER", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "question.reminder_4h", result: `El cesionario te hizo una pregunta hace ${TIMEOUTS.questionReminderHours} h. Te quedan ${left} h; tu Agente te ha dejado un borrador. La Cesión no espera: si no respondes, sigue sin tu respuesta.`, significant: true, companyIds: [r.originatorCompanyId] });
      res.questionReminders++;
    }
  }

  // 2 · Caducidad a las 72 h (D-068) con relevo: la Directiva no caduca, escala (1c)
  const toExpire = await db.query.referrals.findMany({
    where: and(scope, inArray(schema.referrals.state, ["ORIGINATOR_PENDING", "RECEIVER_PENDING"]), lt(schema.referrals.expiresAt, now)),
  });
  for (const r of toExpire) {
    const silent = r.state === "ORIGINATOR_PENDING" ? r.originatorCompanyId : r.receiverCompanyId;
    await db.insert(schema.referralTransitions).values({ referralId: r.id, fromState: r.state, toState: "EXPIRED", actorType: "SYSTEM", actorId: "clock", reason: `Caducada por silencio (${TIMEOUTS.expiryHours} h)` });
    await db.update(schema.referrals).set({ state: "EXPIRED", updatedAt: now }).where(eq(schema.referrals.id, r.id));
    await db.insert(schema.trustEvents).values({ chapterId: r.chapterId, companyId: silent, kind: "RESPONSE_LATE", weight: -20, evidenceRef: `referral:${r.id}` });
    const receiverSilent = silent === r.receiverCompanyId;
    await audit(db, { chapterId: r.chapterId, kind: "EXPIRED", actor: { type: "SYSTEM", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "timeouts.expiry_72h", result: receiverSilent ? `Cesión caducada: el cesionario no respondió en ${TIMEOUTS.expiryHours} h. El silencio cuenta en su Hoja de Méritos.` : `Cesión caducada: el cedente no dio el visto bueno en ${TIMEOUTS.expiryHours} h. El referido se pierde para la Sala.`, significant: true, companyIds: [r.originatorCompanyId, r.receiverCompanyId] });
    if (receiverSilent) {
      // Relevo (D-068): el referido no se pierde. El Agente del cedente lo recupera y propone el siguiente paso.
      await audit(db, { chapterId: r.chapterId, kind: "RELAY_PROPOSED", actor: { type: "AGENT", id: "clock" }, subject: { type: "Referral", id: r.id }, policyApplied: "relay.after_expiry", result: "Tu Agente recupera este referido. Puedes volver a cederlo desde un Apunte nuevo o, si la plaza queda sin titular que responda, proponerlo a otra Sala como Embajada (D-015). El Interesado no debería esperar.", significant: true, companyIds: [r.originatorCompanyId] });
    }
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
  // 6 · Comunicado semanal (Protocolo II): borradores de la semana en curso y cierre de las vencidas con Gaceta
  const chapterIds = chapterId ? [chapterId] : (await db.query.chapters.findMany({ columns: { id: true } })).map((c) => c.id);
  for (const id of chapterIds) {
    const r = await evaluateCompromiso(db, now, id);
    res.compromiso = { evaluated: res.compromiso.evaluated + r.evaluated, met: res.compromiso.met + r.met, notices: res.compromiso.notices + r.notices, releases: res.compromiso.releases + r.releases };
    const c = await evaluateComunicados(db, now, id);
    res.comunicado = { weeks: res.comunicado.weeks + c.weeks, continuity: res.comunicado.continuity + c.continuity, notices: res.comunicado.notices + c.notices, gazettes: res.comunicado.gazettes + c.gazettes, drafted: res.comunicado.drafted + c.drafted };
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
