/**
 * Compromiso semanal (D-010 · D-042): el Reloj de la Sala evalúa cada semana completa a cada titular.
 *
 *  - Cuenta las Cesiones válidas cedidas (aceptadas por el cesionario, transición a APPROVED) en la semana.
 *  - Con una o más: la cuenta de semanas sin ceder vuelve a cero y el cedente suma Mérito; más si cede a varias especialidades.
 *  - Sin ninguna: sube la escalera. Semana 2, aviso diplomático del Agente. Semana 3, aviso formal de la Directiva.
 *    Semana 4, notificación de baja: la empresa queda suspendida en esa Sala (sale de la Mesa y pierde el acceso),
 *    la plaza queda bloqueada, la Directiva propone la baja y NS la confirma (D-044).
 *  - Idempotente: una fila por titular y semana. No se evalúa la semana de alta: la primera semana completa cuenta.
 */
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { ACTION_LABEL, addWeeks, COMPROMISO, ladderAction, lastCompletedWeekStart, MISSED_WEIGHT, weeklyMerit, weekStart, type CompromisoAction } from "@/core/compromiso";

export interface CompromisoResult {
  evaluated: number;
  met: number;
  notices: number; // avisos diplomáticos + formales
  releases: number; // bajas notificadas
}

export class CompromisoError extends Error {}

interface WeekCount {
  validCount: number;
  distinctSpecialties: number;
}

/** Cesiones válidas cedidas por cada empresa de la Sala en [from, to): transición a APPROVED. */
async function validGivenBetween(db: Db, chapterId: string, from: Date, to: Date): Promise<Map<string, WeekCount>> {
  const rows = await db
    .select({ originator: schema.referrals.originatorCompanyId, receiver: schema.referrals.receiverCompanyId })
    .from(schema.referralTransitions)
    .innerJoin(schema.referrals, eq(schema.referrals.id, schema.referralTransitions.referralId))
    .where(and(eq(schema.referrals.chapterId, chapterId), eq(schema.referralTransitions.toState, "APPROVED"), gte(schema.referralTransitions.occurredAt, from), lt(schema.referralTransitions.occurredAt, to)));
  const receivers = [...new Set(rows.map((r) => r.receiver))];
  const seats = receivers.length ? await db.query.categorySeats.findMany({ where: inArray(schema.categorySeats.companyId, receivers), columns: { companyId: true, specialtyId: true } }) : [];
  const specialtyOf = new Map(seats.map((s) => [s.companyId as string, s.specialtyId]));
  const out = new Map<string, { validCount: number; specialties: Set<string> }>();
  for (const r of rows) {
    const acc = out.get(r.originator) ?? { validCount: 0, specialties: new Set<string>() };
    acc.validCount++;
    acc.specialties.add(specialtyOf.get(r.receiver) ?? r.receiver);
    out.set(r.originator, acc);
  }
  return new Map([...out].map(([k, v]) => [k, { validCount: v.validCount, distinctSpecialties: v.specialties.size }]));
}

async function directorCompanyIds(db: Db, chapterId: string): Promise<string[]> {
  const rows = await db.query.members.findMany({ where: and(eq(schema.members.chapterId, chapterId), eq(schema.members.isDirector, true)), columns: { companyId: true } });
  return [...new Set(rows.map((r) => r.companyId))];
}

/** Evalúa la última semana completa antes de `now` para todos los titulares activos de la Sala. */
export async function evaluateCompromiso(db: Db, now: Date, chapterId: string): Promise<CompromisoResult> {
  const res: CompromisoResult = { evaluated: 0, met: 0, notices: 0, releases: 0 };
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId) });
  if (!chapter) return res;
  const pace = Math.max(COMPROMISO.weeklyMinimum, chapter.weeklyPace);
  const start = lastCompletedWeekStart(now);
  const end = addWeeks(start, 1);
  if (start < weekStart(chapter.createdAt)) return res; // la Sala aún no ha vivido una semana completa

  const seats = await db.query.categorySeats.findMany({ where: and(eq(schema.categorySeats.chapterId, chapterId), eq(schema.categorySeats.status, "ACTIVE")) });
  const holders = seats.filter((s) => s.companyId && s.grantedAt && s.grantedAt < start);
  if (holders.length === 0) return res;
  const companyIds = holders.map((s) => s.companyId as string);
  const companies = await db.query.companies.findMany({ where: and(inArray(schema.companies.id, companyIds), eq(schema.companies.status, "ACTIVE")) });
  const already = await db.query.contributionWeeks.findMany({ where: and(eq(schema.contributionWeeks.chapterId, chapterId), eq(schema.contributionWeeks.weekStart, start)), columns: { companyId: true } });
  const done = new Set(already.map((r) => r.companyId));
  const pending = companies.filter((c) => !done.has(c.id));
  if (pending.length === 0) return res;

  const counts = await validGivenBetween(db, chapterId, start, end);
  const previous = await db.query.contributionWeeks.findMany({ where: and(eq(schema.contributionWeeks.chapterId, chapterId), eq(schema.contributionWeeks.weekStart, addWeeks(start, -1))) });
  const prevStreak = new Map(previous.map((r) => [r.companyId, r.missedStreak]));
  const directors = await directorCompanyIds(db, chapterId);
  const specialtyName = new Map((await db.query.specialties.findMany({ columns: { id: true, name: true } })).map((s) => [s.id, s.name]));

  for (const company of pending) {
    const seat = holders.find((s) => s.companyId === company.id)!;
    const minimum = pace * holders.filter((s) => s.companyId === company.id).length; // una Cesión por semana y titularidad (D-047)
    const c = counts.get(company.id) ?? { validCount: 0, distinctSpecialties: 0 };
    const met = c.validCount >= minimum;
    // La Escalera cuenta semanas sin una sola Cesión válida; ceder algo por debajo del mínimo consta, pero no sube la Escalera.
    const streak = c.validCount > 0 ? 0 : (prevStreak.get(company.id) ?? 0) + 1;
    const action: CompromisoAction = met ? "NONE" : c.validCount > 0 ? "BELOW" : ladderAction(streak);
    await db.insert(schema.contributionWeeks).values({ chapterId, companyId: company.id, weekStart: start, validCount: c.validCount, distinctSpecialties: c.distinctSpecialties, missedStreak: streak, action });
    res.evaluated++;
    const weekLabel = `semana del ${start.toISOString().slice(0, 10)}`;
    const evidence = `week:${start.toISOString().slice(0, 10)}`;

    if (met) {
      res.met++;
      const merit = weeklyMerit(c.validCount, c.distinctSpecialties);
      await db.insert(schema.trustEvents).values({ chapterId, companyId: company.id, kind: "CONTRIBUTION_QUOTA_MET", weight: merit, evidenceRef: evidence });
      await audit(db, { chapterId, kind: "COMPROMISO_MET", actor: { type: "AGENT", id: "clock" }, subject: { type: "Company", id: company.id }, policyApplied: "compromiso.weekly", result: `Compromiso cumplido en la ${weekLabel}: ${c.validCount} Cesión(es) válida(s) a ${c.distinctSpecialties} especialidad(es). Mérito +${merit}.${c.validCount === 1 ? " Con una se cumple; para destacar, cede varias y a varias especialidades." : ""}`, significant: false, companyIds: [company.id] });
      continue;
    }

    await db.insert(schema.trustEvents).values({ chapterId, companyId: company.id, kind: "CONTRIBUTION_QUOTA_MISSED", weight: MISSED_WEIGHT[action], evidenceRef: evidence });
    const seatName = specialtyName.get(seat.specialtyId) ?? "su especialidad";
    if (action === "BELOW") {
      await audit(db, { chapterId, kind: "COMPROMISO_BELOW", actor: { type: "AGENT", id: "clock" }, subject: { type: "Company", id: company.id }, policyApplied: "compromiso.weekly", result: `Por debajo del mínimo en la ${weekLabel}: ${c.validCount} de ${minimum} Cesiones válidas (una por semana y titularidad). Tu Agente te propone Movimientos en la Brújula.`, significant: true, companyIds: [company.id] });
    } else if (action === "MISSED") {
      await audit(db, { chapterId, kind: "COMPROMISO_MISSED", actor: { type: "AGENT", id: "clock" }, subject: { type: "Company", id: company.id }, policyApplied: "compromiso.weekly", result: `Semana sin una sola Cesión válida (${weekLabel}). El Compromiso pide al menos ${minimum} por semana, sin excusas. Tu Agente te propone Movimientos en la Brújula para ceder esta semana.`, significant: true, companyIds: [company.id] });
    } else if (action === "DIPLOMATIC_NOTICE") {
      res.notices++;
      await audit(db, { chapterId, kind: "COMPROMISO_DIPLOMATIC_NOTICE", actor: { type: "AGENT", id: "clock" }, subject: { type: "Company", id: company.id }, policyApplied: "compromiso.ladder.week2", result: `Aviso diplomático de tu Agente: dos semanas seguidas sin una Cesión válida. Pertenecer a la Sala es contribuir; con una Cesión válida esta semana la cuenta vuelve a cero. Si no, la tercera semana lleva aviso formal de la Directiva y la cuarta, la baja de la titularidad.`, significant: true, companyIds: [company.id] });
    } else if (action === "FORMAL_NOTICE") {
      res.notices++;
      await audit(db, { chapterId, kind: "COMPROMISO_FORMAL_NOTICE", actor: { type: "SYSTEM", id: "clock" }, subject: { type: "Company", id: company.id }, policyApplied: "compromiso.ladder.week3", result: `Aviso formal de la Directiva de ${chapter.name} a ${company.name}: tres semanas seguidas sin una Cesión válida. Aporta una lo antes posible. Si la cuarta semana termina sin ninguna, se notificará la baja de la titularidad de ${seatName} y la plaza pasará a la Antesala.`, significant: true, companyIds: [company.id, ...directors] });
    } else {
      res.releases++;
      await db.update(schema.companies).set({ status: "SUSPENDED" }).where(eq(schema.companies.id, company.id));
      await db.update(schema.categorySeats).set({ status: "RELEASE_PENDING" }).where(eq(schema.categorySeats.id, seat.id));
      await audit(db, { chapterId, kind: "COMPROMISO_RELEASE_NOTICE", actor: { type: "SYSTEM", id: "clock" }, subject: { type: "Company", id: company.id }, policyApplied: "compromiso.ladder.week4", result: `Notificación de baja: ${company.name} lleva cuatro semanas seguidas sin una sola Cesión válida y pierde la titularidad de ${seatName} en ${chapter.name} (D-010, D-042). Desde ahora no accede a esta Sala ni a su panel. La Directiva propone la baja, NS la confirma y la plaza vuelve a la Antesala.`, significant: true, companyIds: [company.id, ...directors] });
    }
  }
  return res;
}

/** La Directiva de la Sala propone a NS la baja notificada (D-044). La plaza sigue bloqueada. */
export async function proposeRelease(db: Db, input: { chapterId: string; companyId: string; memberId: string }) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || !member.isDirector || member.chapterId !== input.chapterId) throw new CompromisoError("Solo la Directiva de la Sala propone una baja.");
  const seat = await db.query.categorySeats.findFirst({ where: and(eq(schema.categorySeats.chapterId, input.chapterId), eq(schema.categorySeats.companyId, input.companyId)) });
  if (!seat || seat.status !== "RELEASE_PENDING") throw new CompromisoError("Esta empresa no tiene una baja notificada por Compromiso pendiente de proponer.");
  const company = (await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId) }))!;
  const specialty = await db.query.specialties.findFirst({ where: eq(schema.specialties.id, seat.specialtyId) });
  await db.update(schema.categorySeats).set({ status: "RELEASE_PROPOSED" }).where(eq(schema.categorySeats.id, seat.id));
  const directors = await directorCompanyIds(db, input.chapterId);
  await audit(db, { chapterId: input.chapterId, kind: "RELEASE_PROPOSED", actor: { type: "USER", id: member.id }, subject: { type: "CategorySeat", id: seat.id }, policyApplied: "compromiso.release.propose", result: `La Directiva propone a NS la baja de ${company.name} como titular de ${specialty?.name ?? "la especialidad"} por incumplir el Compromiso. La plaza sigue bloqueada hasta que NS confirme.`, significant: true, companyIds: [company.id, ...directors] });
  return { seatId: seat.id, specialtyName: specialty?.name ?? "" };
}

/** NS confirma la baja propuesta por la Directiva (D-044): la plaza queda vacante y vuelve a la Antesala; la empresa sale de esa Sala. */
export async function confirmRelease(db: Db, input: { chapterId: string; companyId: string; memberId: string }) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || !member.isNetwork) throw new CompromisoError("Solo NS confirma una baja propuesta por la Directiva.");
  const seat = await db.query.categorySeats.findFirst({ where: and(eq(schema.categorySeats.chapterId, input.chapterId), eq(schema.categorySeats.companyId, input.companyId)) });
  if (!seat || seat.status !== "RELEASE_PROPOSED") throw new CompromisoError("Esta empresa no tiene una baja propuesta por la Directiva.");
  const company = (await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId) }))!;
  const specialty = await db.query.specialties.findFirst({ where: eq(schema.specialties.id, seat.specialtyId) });
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, input.chapterId) });
  await db.update(schema.categorySeats).set({ status: "VACANT", companyId: null, grantedAt: null }).where(eq(schema.categorySeats.id, seat.id));
  await db.update(schema.companies).set({ status: "RELEASED" }).where(eq(schema.companies.id, company.id));
  await db.update(schema.agents).set({ status: "INACTIVE" }).where(and(eq(schema.agents.companyId, company.id), eq(schema.agents.kind, "COMPANY")));
  await db.insert(schema.trustEvents).values({ chapterId: input.chapterId, companyId: company.id, kind: "POLICY_VIOLATION", weight: 0, evidenceRef: `seat:${seat.id}:released` });
  await audit(db, { chapterId: input.chapterId, kind: "SEAT_RELEASED", actor: { type: "USER", id: member.id }, subject: { type: "CategorySeat", id: seat.id }, policyApplied: "compromiso.release.confirm", result: `NS confirma la baja. La plaza de ${specialty?.name ?? "la especialidad"} queda vacante y pasa a la Antesala. ${company.name} deja de ser titular en ${chapter?.name ?? "la Sala"} por incumplir el Compromiso.`, significant: true });
  return { seatId: seat.id, specialtyName: specialty?.name ?? "" };
}

/** Expedientes de baja abiertos: notificados (la Directiva propone) y propuestos (NS confirma). */
export async function pendingReleases(db: Db, chapterId: string) {
  const seats = await db.query.categorySeats.findMany({ where: and(eq(schema.categorySeats.chapterId, chapterId), inArray(schema.categorySeats.status, ["RELEASE_PENDING", "RELEASE_PROPOSED"])) });
  if (seats.length === 0) return [];
  const companies = await db.query.companies.findMany({ where: inArray(schema.companies.id, seats.map((s) => s.companyId as string)) });
  const specialties = await db.query.specialties.findMany({ where: inArray(schema.specialties.id, seats.map((s) => s.specialtyId)) });
  return seats.map((s) => ({ seatId: s.id, stage: s.status as "RELEASE_PENDING" | "RELEASE_PROPOSED", company: companies.find((c) => c.id === s.companyId)!, specialtyName: specialties.find((x) => x.id === s.specialtyId)?.name ?? "" }));
}

export interface CompromisoStatus {
  minimum: number;
  thisWeek: WeekCount; // en curso, en vivo
  missedStreak: number; // semanas completas seguidas sin ceder
  lastAction: CompromisoAction;
  label: string;
  nextStep: string;
}

/** Estado del Compromiso de un titular para la Brújula (privado) y la Balanza (público). */
export async function compromisoStatus(db: Db, chapterId: string, companyId: string, now = new Date()): Promise<CompromisoStatus> {
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId) });
  const seats = await db.query.categorySeats.findMany({ where: and(eq(schema.categorySeats.chapterId, chapterId), eq(schema.categorySeats.companyId, companyId), eq(schema.categorySeats.status, "ACTIVE")), columns: { id: true } });
  const minimum = Math.max(COMPROMISO.weeklyMinimum, chapter?.weeklyPace ?? 1) * Math.max(1, seats.length);
  const start = weekStart(now);
  const live = (await validGivenBetween(db, chapterId, start, addWeeks(start, 1))).get(companyId) ?? { validCount: 0, distinctSpecialties: 0 };
  const last = await db.query.contributionWeeks.findFirst({ where: and(eq(schema.contributionWeeks.companyId, companyId), lt(schema.contributionWeeks.weekStart, start)), orderBy: [desc(schema.contributionWeeks.weekStart)] });
  const streak = last?.missedStreak ?? 0;
  const lastAction = (last?.action ?? "NONE") as CompromisoAction;
  const metNow = live.validCount >= minimum;
  const label = lastAction === "RELEASE_NOTICE" ? ACTION_LABEL.RELEASE_NOTICE : metNow ? (live.distinctSpecialties > 1 ? "Por encima" : "En Ritmo") : live.validCount > 0 ? `Por debajo del mínimo · ${live.validCount} de ${minimum}` : streak === 0 ? "Pendiente esta semana" : `${ACTION_LABEL[lastAction]} · ${streak} ${streak === 1 ? "semana" : "semanas"} sin ceder`;
  const nextStep =
    lastAction === "RELEASE_NOTICE" ? "La Directiva propone la baja y NS la confirma." :
    metNow ? (live.distinctSpecialties > 1 ? "Semana cumplida con varias especialidades: así se destaca." : "Semana cumplida. Para destacar, cede otra a una especialidad distinta.") :
    streak >= COMPROMISO.formalNoticeWeek ? "Sin una Cesión válida esta semana se notifica la baja." :
    streak === COMPROMISO.diplomaticNoticeWeek ? "Sin una Cesión válida esta semana llega el aviso formal de la Directiva." :
    streak === 1 ? "Una Cesión válida esta semana pone la cuenta a cero; si no, aviso diplomático." :
    `Cede al menos ${minimum} Cesión válida antes del domingo.`;
  return { minimum, thisWeek: live, missedStreak: streak, lastAction, label, nextStep };
}

/** Historial evaluado de un titular, de la semana más reciente a la más antigua. */
export async function compromisoHistory(db: Db, companyId: string, limit = 12) {
  return db.query.contributionWeeks.findMany({ where: eq(schema.contributionWeeks.companyId, companyId), orderBy: [desc(schema.contributionWeeks.weekStart)], limit });
}

