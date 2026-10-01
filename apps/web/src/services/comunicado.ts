/**
 * Protocolo II · Dar a Conocer (D-018, D-069): Comunicado semanal, Gaceta y Dossier.
 *
 *  - Cada semana, el Agente de cada titular deja un borrador de Comunicado: lo estable (ADN, capas PUBLIC y CHAPTER) y el
 *    delta (cambios del ADN, Cesiones contrastadas, actividad en la Sala). El Timonel lo aprueba con un toque y puede
 *    añadir una novedad, un Encargo o ajustar su capacidad. Todo lo que el Agente escribe sale de datos; nada inventado.
 *  - Al cierre de la semana (domingo 20:00 Madrid), lo no aprobado sale como Comunicado de continuidad (solo lo estable ya
 *    validado, marcado como no revisado). Dos de continuidad seguidos: aviso del Agente; tres: aviso de la Directiva.
 *  - El Chapter Intelligence Agent compila la Gaceta de la Sala y cada Timonel recibe su vista "relevante para ti".
 *  - Los Agentes receptores acusan recibo (agent_interactions COMMUNIQUE_ACK): la Mesa lee siempre el ADN vivo, así que el
 *    índice de capabilities está al día en cuanto el Comunicado se aprueba.
 *  - Conocimiento mutuo: proporción de titulares que consultaron la Gaceta o un Dossier en la semana (DOSSIER_VIEWED,
 *    GAZETTE_VIEWED, nunca para vigilar).
 * Idempotente: una fila por titular y semana; una Gaceta por Sala y semana.
 */
import { and, asc, desc, eq, gte, inArray, lt, ne, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { addWeeks, weekStart } from "@/core/compromiso";
import { buildStable, CAPACITY_TO_DNA, COMUNICADO, continuityAction, continuityCounts, diffStable, isoWeekLabel, relevantFor, weekCloseAt, weekIsClosed, ADP_VERSION, type CapacityNow, type ChapterGazette, type CommuniqueDelta, type CommuniqueEncargo, type CommuniqueStable, type CommuniqueStatus, type RelevantItem } from "@/core/comunicado";
import { openDemands } from "@/services/demands";

export class ComunicadoError extends Error {}

type CommuniqueRow = typeof schema.communiques.$inferSelect;
const WEEK_MS = 7 * 86_400_000;

async function activeHolders(db: Db, chapterId: string, weekStartAt: Date) {
  const seats = await db.query.categorySeats.findMany({ where: and(eq(schema.categorySeats.chapterId, chapterId), eq(schema.categorySeats.status, "ACTIVE")) });
  const ids = [...new Set(seats.filter((s) => s.companyId && s.grantedAt && s.grantedAt < addWeeks(weekStartAt, 1)).map((s) => s.companyId as string))];
  if (ids.length === 0) return [];
  return db.query.companies.findMany({ where: and(inArray(schema.companies.id, ids), eq(schema.companies.status, "ACTIVE")), orderBy: [asc(schema.companies.name)] });
}

async function primarySpecialty(db: Db, chapterId: string, companyId: string): Promise<{ name: string; code: string }> {
  const seat = await db.select({ name: schema.specialties.name, code: schema.specialties.nscatCode }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(and(eq(schema.categorySeats.chapterId, chapterId), eq(schema.categorySeats.companyId, companyId), eq(schema.categorySeats.status, "ACTIVE"))).orderBy(asc(schema.specialties.name));
  return seat[0] ?? { name: "sin plaza", code: "" };
}

/** El último Comunicado publicado (aprobado o de continuidad) antes de una semana: base del delta y de la continuidad. */
async function lastPublished(db: Db, companyId: string, before: Date): Promise<CommuniqueRow | undefined> {
  return db.query.communiques.findFirst({ where: and(eq(schema.communiques.companyId, companyId), lt(schema.communiques.weekStart, before), ne(schema.communiques.status, "DRAFT")), orderBy: [desc(schema.communiques.weekStart)] });
}

/** Hechos verificados de la semana para una empresa: cierres contrastados (anonimizados) y Cesiones válidas cedidas. */
async function verifiedDelta(db: Db, chapterId: string, companyId: string, from: Date): Promise<CommuniqueDelta[]> {
  const to = addWeeks(from, 1);
  const rows = await db
    .select({ to: schema.referralTransitions.toState, originator: schema.referrals.originatorCompanyId, receiver: schema.referrals.receiverCompanyId, value: schema.referrals.valueVerified })
    .from(schema.referralTransitions)
    .innerJoin(schema.referrals, eq(schema.referrals.id, schema.referralTransitions.referralId))
    .where(and(eq(schema.referrals.chapterId, chapterId), inArray(schema.referralTransitions.toState, ["APPROVED", "VALUE_CONFIRMED"]), gte(schema.referralTransitions.occurredAt, from), lt(schema.referralTransitions.occurredAt, to), or(eq(schema.referrals.originatorCompanyId, companyId), eq(schema.referrals.receiverCompanyId, companyId))));
  const out: CommuniqueDelta[] = [];
  const closes = rows.filter((r) => r.to === "VALUE_CONFIRMED" && r.receiver === companyId);
  for (const c of closes) out.push({ kind: "CASE_WON", text: `Cierre contrastado con un miembro de la Sala${c.value ? `: ${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(c.value)}` : ""}`, source: "VERIFIED" });
  const given = rows.filter((r) => r.to === "APPROVED" && r.originator === companyId);
  if (given.length) {
    const seats = await db.query.categorySeats.findMany({ where: inArray(schema.categorySeats.companyId, [...new Set(given.map((g) => g.receiver))]), columns: { companyId: true, specialtyId: true } });
    const specialties = new Set(seats.map((s) => s.specialtyId));
    out.push({ kind: "ACTIVITY", text: `${given.length} ${given.length === 1 ? "Cesión válida cedida" : "Cesiones válidas cedidas"} esta semana a ${specialties.size} ${specialties.size === 1 ? "especialidad" : "especialidades"}`, source: "VERIFIED" });
  }
  return out;
}

/** Crea o refresca el borrador de un titular para una semana. Lo declarado por el Timonel se conserva; lo inferido y lo verificado se recalculan. */
export async function draftCommunique(db: Db, chapterId: string, companyId: string, weekStartAt: Date): Promise<CommuniqueRow> {
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
  if (!dnaRow) throw new ComunicadoError("Sin ADN de Empresa no hay Comunicado.");
  const specialty = await primarySpecialty(db, chapterId, companyId);
  const stable = buildStable(dnaRow.dna, specialty);
  const prev = await lastPublished(db, companyId, weekStartAt);
  const delta = [...diffStable(prev?.stable ?? null, stable), ...(await verifiedDelta(db, chapterId, companyId, weekStartAt))];
  const demands = await openDemands(db, chapterId, companyId);
  const encargos: CommuniqueEncargo[] = demands.map((d) => ({ id: d.id, summary: d.text, trigger: d.trigger ?? undefined }));
  const existing = await db.query.communiques.findFirst({ where: and(eq(schema.communiques.companyId, companyId), eq(schema.communiques.weekStart, weekStartAt)) });
  if (existing && existing.status !== "DRAFT") return existing;
  const unchanged = delta.length === 0 && (existing?.declared.length ?? 0) === 0;
  if (existing) {
    const [row] = await db.update(schema.communiques).set({ stable, delta, encargos, unchanged, dnaVersion: dnaRow.version, updatedAt: new Date() }).where(eq(schema.communiques.id, existing.id)).returning();
    return row;
  }
  const [row] = await db.insert(schema.communiques).values({ chapterId, companyId, weekStart: weekStartAt, stable, delta, encargos, unchanged, dnaVersion: dnaRow.version, protocolVersion: ADP_VERSION }).returning();
  await audit(db, { chapterId, kind: "COMMUNIQUE_DRAFTED", actor: { type: "AGENT", id: `company:${companyId}` }, subject: { type: "Communique", id: row.id }, policyApplied: "adp.weekly_draft", result: `Tu Agente ha preparado tu Comunicado de la semana${delta.length ? ` con ${delta.length} ${delta.length === 1 ? "novedad" : "novedades"}` : ", sin novedades"}. Apruébalo con un toque; sin tu toque, el domingo a las 20:00 saldrá solo lo estable.`, significant: false, companyIds: [companyId] });
  return row;
}

/** Borradores de todos los titulares activos para una semana. Devuelve cuántos se crearon. */
export async function ensureDrafts(db: Db, chapterId: string, weekStartAt: Date): Promise<number> {
  const holders = await activeHolders(db, chapterId, weekStartAt);
  if (holders.length === 0) return 0;
  const existing = await db.query.communiques.findMany({ where: and(eq(schema.communiques.chapterId, chapterId), eq(schema.communiques.weekStart, weekStartAt)), columns: { companyId: true } });
  const done = new Set(existing.map((e) => e.companyId));
  let created = 0;
  for (const c of holders) {
    if (done.has(c.id)) continue;
    try {
      await draftCommunique(db, chapterId, c.id, weekStartAt);
      created++;
    } catch {
      // sin ADN no hay borrador: el aviso llega en el cierre
    }
  }
  return created;
}

export interface ApproveInput {
  chapterId: string;
  companyId: string;
  memberId: string;
  weekStartAt?: Date;
  now?: Date;
  capacity?: CapacityNow;
  note?: string;
  ask?: string;
}

/** El Timonel aprueba el Comunicado de la semana (un toque). Puede añadir una novedad, un Sondeo y ajustar su capacidad. */
export async function approveCommunique(db: Db, input: ApproveInput) {
  const now = input.now ?? new Date();
  const week = input.weekStartAt ?? weekStart(now);
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || member.companyId !== input.companyId) throw new ComunicadoError("Solo el Timonel de la empresa aprueba su Comunicado.");
  if (weekIsClosed(week, now)) throw new ComunicadoError("Esta semana ya cerró: el Comunicado salió de continuidad. El de la semana en curso te espera.");
  let row = await db.query.communiques.findFirst({ where: and(eq(schema.communiques.companyId, input.companyId), eq(schema.communiques.weekStart, week)) });
  if (!row) row = await draftCommunique(db, input.chapterId, input.companyId, week);
  if (row.status !== "DRAFT") throw new ComunicadoError("Este Comunicado ya está aprobado.");

  const declared: CommuniqueDelta[] = [...row.declared];
  const note = input.note?.trim();
  if (note) {
    if (note.length < 8) throw new ComunicadoError("Cuenta la novedad en una frase.");
    declared.push({ kind: "NOTE", text: note.slice(0, 280), source: "DECLARED_BY_MEMBER" });
  }
  let stable: CommuniqueStable = row.stable;
  if (input.capacity && input.capacity !== row.stable.capacity_now) {
    const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, input.companyId) });
    if (dnaRow) {
      const dna = { ...dnaRow.dna, offering: { ...dnaRow.dna.offering, capacity: CAPACITY_TO_DNA[input.capacity] } };
      await db.update(schema.businessDna).set({ dna, version: dnaRow.version + 1, updatedAt: now }).where(eq(schema.businessDna.id, dnaRow.id));
    }
    declared.push({ kind: "CAPACITY", text: `Capacidad ${input.capacity} (antes ${row.stable.capacity_now})`, source: "DECLARED_BY_MEMBER" });
    stable = { ...row.stable, capacity_now: input.capacity };
  }
  const asks = [...row.asks];
  const ask = input.ask?.trim();
  if (ask) asks.push(ask.slice(0, 200));
  const delta = row.delta.filter((d) => !(d.kind === "CAPACITY" && declared.some((x) => x.kind === "CAPACITY")));
  const unchanged = delta.length === 0 && declared.length === 0;
  const [updated] = await db.update(schema.communiques).set({ status: "APPROVED", stable, delta, declared, asks, unchanged, approvedByMemberId: member.id, approvedAt: now, continuityStreak: 0, updatedAt: now }).where(eq(schema.communiques.id, row.id)).returning();

  const company = (await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId) }))!;
  const all = [...delta, ...declared];
  await db.insert(schema.trustEvents).values({ chapterId: input.chapterId, companyId: input.companyId, kind: "COMMUNIQUE_MET", weight: COMUNICADO.meritApproved, evidenceRef: `communique:${row.id}` });
  await audit(db, { chapterId: input.chapterId, kind: "COMMUNIQUE_SENT", actor: { type: "USER", id: member.id }, subject: { type: "Communique", id: row.id }, policyApplied: "adp.approved", result: `${company.name} da a conocer su Comunicado de la semana (${isoWeekLabel(week)}): ${all.length ? all.slice(0, 3).map((d) => d.text).join(" · ") : "sin novedades, lo estable sigue vigente"}.${asks.length ? ` Sondeo: «${asks[asks.length - 1]}».` : ""}`, significant: true });
  await acknowledge(db, input.chapterId, input.companyId, updated);
  return updated;
}

/** Los Agentes de la Sala acusan recibo: un mensaje A2A por Agente receptor con la capa CHAPTER usada. */
async function acknowledge(db: Db, chapterId: string, companyId: string, row: CommuniqueRow) {
  const agents = await db.query.agents.findMany({ where: and(eq(schema.agents.chapterId, chapterId), eq(schema.agents.kind, "COMPANY"), eq(schema.agents.status, "ACTIVE")) });
  const sender = agents.find((a) => a.companyId === companyId);
  if (!sender) return;
  const payload = { communique_id: row.id, week: isoWeekLabel(row.weekStart), status: row.status, delta: [...row.delta, ...row.declared], encargos: row.encargos.length };
  await db.insert(schema.agentInteractions).values({ chapterId, fromAgentId: sender.id, toAgentId: null, messageType: "COMMUNIQUE", payload, layerUsed: 0, policyApplied: "adp.chapter_layer_only" });
  const receivers = agents.filter((a) => a.companyId !== companyId);
  if (receivers.length) await db.insert(schema.agentInteractions).values(receivers.map((a) => ({ chapterId, fromAgentId: a.id, toAgentId: sender.id, messageType: "COMMUNIQUE_ACK", payload: { communique_id: row.id, indexed: true }, layerUsed: 0, policyApplied: "adp.ack" })));
}

export interface CloseResult {
  weeks: number;
  continuity: number;
  notices: number;
  gazettes: number;
}

/** Cierra las semanas vencidas de una Sala: continuidad para lo no aprobado, avisos, y Gaceta. Idempotente por semana. */
export async function closeWeeks(db: Db, now: Date, chapterId: string): Promise<CloseResult> {
  const res: CloseResult = { weeks: 0, continuity: 0, notices: 0, gazettes: 0 };
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, chapterId) });
  if (!chapter) return res;
  const lastGazette = await db.query.gazettes.findFirst({ where: eq(schema.gazettes.chapterId, chapterId), orderBy: [desc(schema.gazettes.weekStart)], columns: { weekStart: true } });
  let week = lastGazette ? addWeeks(lastGazette.weekStart, 1) : weekStart(chapter.createdAt);
  const directors = [...new Set((await db.query.members.findMany({ where: and(eq(schema.members.chapterId, chapterId), eq(schema.members.isDirector, true)), columns: { companyId: true } })).map((m) => m.companyId))];
  for (let guard = 0; guard < 60 && weekIsClosed(week, now); guard++, week = addWeeks(week, 1)) {
    await ensureDrafts(db, chapterId, week);
    const rows = await db.query.communiques.findMany({ where: and(eq(schema.communiques.chapterId, chapterId), eq(schema.communiques.weekStart, week)) });
    if (rows.length === 0) continue; // la Sala aún no tenía titulares esa semana: sin Gaceta
    res.weeks++;
    for (const row of rows.filter((r) => r.status === "DRAFT")) {
      const prev = await lastPublished(db, row.companyId, week);
      const streak = (prev?.status === "CONTINUITY" ? prev.continuityStreak : 0) + 1;
      await db.update(schema.communiques).set({ status: "CONTINUITY", delta: [], declared: [], unchanged: true, continuityStreak: streak, closedAt: now, updatedAt: now }).where(eq(schema.communiques.id, row.id));
      res.continuity++;
      const counts = continuityCounts(streak);
      await db.insert(schema.trustEvents).values({ chapterId, companyId: row.companyId, kind: counts ? "COMMUNIQUE_MET" : "COMMUNIQUE_MISSED", weight: counts ? 0 : COMUNICADO.meritMissed, evidenceRef: `communique:${row.id}` });
      const action = continuityAction(streak);
      const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, row.companyId), columns: { name: true } });
      if (action === "AGENT_NOTICE") {
        res.notices++;
        await audit(db, { chapterId, kind: "COMMUNIQUE_CONTINUITY_NOTICE", actor: { type: "AGENT", id: `company:${row.companyId}` }, subject: { type: "Communique", id: row.id }, policyApplied: "adp.continuity.week2", result: `Aviso de tu Agente: dos semanas seguidas sin aprobar tu Comunicado. He enviado a la Sala solo lo estable, sin novedades. Un toque el domingo basta; a la tercera, aviso formal de la Directiva y la semana deja de contar como cumplida.`, significant: true, companyIds: [row.companyId] });
      } else if (action === "DIRECTOR_NOTICE") {
        res.notices++;
        await audit(db, { chapterId, kind: "COMMUNIQUE_FORMAL_NOTICE", actor: { type: "SYSTEM", id: "clock" }, subject: { type: "Communique", id: row.id }, policyApplied: "adp.continuity.week3", result: `Aviso formal de la Directiva de ${chapter.name} a ${company?.name ?? "la empresa"}: ${streak} semanas seguidas sin aprobar el Comunicado (Norma NS 4). La Sala no sabe en qué estás; la semana no cuenta como cumplida en tu Valoración. Aprueba el de esta semana.`, significant: true, companyIds: [row.companyId, ...directors] });
      } else {
        await audit(db, { chapterId, kind: "COMMUNIQUE_CONTINUITY", actor: { type: "AGENT", id: `company:${row.companyId}` }, subject: { type: "Communique", id: row.id }, policyApplied: "adp.continuity", result: `Sin tu toque antes del cierre, tu Agente envió un Comunicado de continuidad: solo lo estable, marcado como no revisado. Cumple, pero la Sala no ha sabido nada nuevo de ti.`, significant: true, companyIds: [row.companyId] });
      }
    }
    await publishGazette(db, chapterId, week, now);
    res.gazettes++;
    // El borrador de la semana siguiente queda listo en el acto: el lunes a primera hora el Timonel ya lo tiene.
    await ensureDrafts(db, chapterId, addWeeks(week, 1));
  }
  return res;
}

async function publishGazette(db: Db, chapterId: string, week: Date, now: Date) {
  const rows = await db.query.communiques.findMany({ where: and(eq(schema.communiques.chapterId, chapterId), eq(schema.communiques.weekStart, week)) });
  const holders = await activeHolders(db, chapterId, week);
  const names = new Map((await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapterId), columns: { id: true, name: true } })).map((c) => [c.id, c.name]));
  const published = rows.filter((r) => r.status !== "DRAFT");
  const all = published.flatMap((r) => [...r.delta, ...r.declared].map((d) => ({ company_id: r.companyId, company_name: names.get(r.companyId) ?? "", ...d })));
  const closes = await db
    .select({ value: schema.referrals.valueVerified })
    .from(schema.referralTransitions)
    .innerJoin(schema.referrals, eq(schema.referrals.id, schema.referralTransitions.referralId))
    .where(and(eq(schema.referrals.chapterId, chapterId), eq(schema.referralTransitions.toState, "VALUE_CONFIRMED"), gte(schema.referralTransitions.occurredAt, week), lt(schema.referralTransitions.occurredAt, addWeeks(week, 1))));
  const uncovered = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.kind, "NEED_UNCOVERED"), gte(schema.auditEvents.occurredAt, week), lt(schema.auditEvents.occurredAt, addWeeks(week, 1))), columns: { id: true } });
  const demands = await openDemands(db, chapterId);
  const order: Record<string, number> = { DECLARED_BY_MEMBER: 0, VERIFIED: 1, INFERRED_FROM_DNA: 2 };
  const gazette: ChapterGazette = {
    week: isoWeekLabel(week),
    week_start: week.toISOString(),
    members: holders.length,
    communiques: { approved: published.filter((r) => r.status === "APPROVED").length, continuity: published.filter((r) => r.status === "CONTINUITY").length, missing: Math.max(0, holders.length - published.length) },
    new_services: all.filter((d) => d.kind === "NEW_SERVICE").length,
    capacity_changes: all.filter((d) => d.kind === "CAPACITY").length,
    verified_closes: { count: closes.length, value: closes.reduce((a, c) => a + (c.value ?? 0), 0) },
    open_encargos: demands.length,
    unchanged: published.filter((r) => r.unchanged).length,
    vacancies_claimed: uncovered.length,
    mutual_knowledge: await mutualKnowledge(db, chapterId, week),
    highlights: all.filter((d) => d.kind !== "ACTIVITY").sort((a, b) => order[a.source] - order[b.source]).slice(0, COMUNICADO.maxHighlights),
    protocol_version: ADP_VERSION,
  };
  await db.insert(schema.gazettes).values({ chapterId, weekStart: week, gazette, publishedAt: now }).onConflictDoNothing({ target: [schema.gazettes.chapterId, schema.gazettes.weekStart] });
  const c = gazette.communiques;
  await audit(db, { chapterId, kind: "GAZETTE_PUBLISHED", actor: { type: "AGENT", id: "chapter-intelligence" }, subject: { type: "Gazette", id: gazette.week }, policyApplied: "adp.gazette", result: `Gaceta de la semana ${gazette.week}: ${c.approved + c.continuity} Comunicados de ${gazette.members} (${c.continuity} de continuidad), ${gazette.new_services} servicio(s) nuevo(s), ${gazette.verified_closes.count} cierre(s) contrastado(s), ${gazette.open_encargos} Encargo(s) abierto(s). Tu vista "relevante para ti" te espera en Mi Sala.`, significant: true });
}

// ───────────── Lecturas ─────────────

export interface ComunicadoStatus {
  row: CommuniqueRow | null;
  weekStart: Date;
  weekLabel: string;
  closesAt: Date;
  hoursLeft: number;
  continuityStreak: number; // de continuidad seguidos antes de esta semana
  approvedStreak: number; // aprobados seguidos antes de esta semana
  label: string;
  nextStep: string;
}

/** Estado del Comunicado de la semana en curso para la Brújula de un titular. Crea el borrador si falta. */
export async function comunicadoStatus(db: Db, chapterId: string, companyId: string, now = new Date()): Promise<ComunicadoStatus> {
  const week = weekStart(now);
  let row = await db.query.communiques.findFirst({ where: and(eq(schema.communiques.companyId, companyId), eq(schema.communiques.weekStart, week)) });
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId), columns: { version: true } });
  if (dnaRow && (!row || (row.status === "DRAFT" && row.dnaVersion < dnaRow.version))) {
    try {
      row = await draftCommunique(db, chapterId, companyId, week);
    } catch {
      row = row ?? undefined;
    }
  }
  const history = await db.query.communiques.findMany({ where: and(eq(schema.communiques.companyId, companyId), lt(schema.communiques.weekStart, week), ne(schema.communiques.status, "DRAFT")), orderBy: [desc(schema.communiques.weekStart)], limit: 12 });
  let approvedStreak = 0;
  for (const h of history) {
    if (h.status !== "APPROVED") break;
    approvedStreak++;
  }
  const continuityStreak = history[0]?.status === "CONTINUITY" ? history[0].continuityStreak : 0;
  const closesAt = weekCloseAt(week);
  const hoursLeft = Math.max(0, Math.ceil((closesAt.getTime() - now.getTime()) / 3_600_000));
  const novelties = row ? row.delta.length + row.declared.length : 0;
  const label = !row ? "Sin borrador · falta el ADN" : row.status === "APPROVED" ? `Aprobado${approvedStreak ? ` · ${approvedStreak + 1} semanas seguidas` : ""}` : row.status === "CONTINUITY" ? "De continuidad · la semana cerró sin tu toque" : novelties ? `Borrador con ${novelties} ${novelties === 1 ? "novedad" : "novedades"}` : "Borrador sin novedades";
  const nextStep = !row
    ? "Haz la entrevista del Agente: sin ADN no hay Comunicado."
    : row.status === "APPROVED"
      ? "La Sala ya sabe en qué estás. El domingo sale en la Gaceta."
      : row.status === "CONTINUITY"
        ? "Esta semana salió solo lo estable. El borrador de la próxima te espera el lunes."
        : continuityStreak >= COMUNICADO.continuityDirectorStreak - 1
          ? `Llevas ${continuityStreak} semanas de continuidad: sin tu toque antes del domingo a las 20:00 (${hoursLeft} h) llega el aviso formal de la Directiva y la semana no cuenta.`
          : continuityStreak >= 1
            ? `Llevas ${continuityStreak} ${continuityStreak === 1 ? "semana" : "semanas"} de continuidad: la Sala no sabe nada nuevo de ti. Un toque antes del domingo a las 20:00 (${hoursLeft} h).`
            : `Un toque antes del domingo a las 20:00 (${hoursLeft} h): si no, saldrá solo lo estable.`;
  return { row: row ?? null, weekStart: week, weekLabel: isoWeekLabel(week), closesAt, hoursLeft, continuityStreak, approvedStreak, label, nextStep };
}

/** Comunicados de una semana con el nombre de la empresa, ordenados por nombre. */
export async function weekCommuniques(db: Db, chapterId: string, week: Date) {
  const rows = await db.query.communiques.findMany({ where: and(eq(schema.communiques.chapterId, chapterId), eq(schema.communiques.weekStart, week)) });
  const companies = new Map((await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapterId) })).map((c) => [c.id, c]));
  return rows.map((r) => ({ ...r, company: companies.get(r.companyId)! })).filter((r) => r.company).sort((a, b) => a.company.name.localeCompare(b.company.name));
}

export async function latestGazette(db: Db, chapterId: string) {
  return db.query.gazettes.findFirst({ where: eq(schema.gazettes.chapterId, chapterId), orderBy: [desc(schema.gazettes.weekStart)] });
}

export async function gazetteByWeek(db: Db, chapterId: string, week: Date) {
  return db.query.gazettes.findFirst({ where: and(eq(schema.gazettes.chapterId, chapterId), eq(schema.gazettes.weekStart, week)) });
}

export async function listGazettes(db: Db, chapterId: string, limit = 12) {
  return db.query.gazettes.findMany({ where: eq(schema.gazettes.chapterId, chapterId), orderBy: [desc(schema.gazettes.weekStart)], limit });
}

/** La vista "relevante para ti" de una semana: los Comunicados publicados (o aprobados hasta ahora, si la semana sigue abierta) leídos con el ADN del lector. */
export async function relevantForMe(db: Db, chapterId: string, companyId: string, week: Date): Promise<RelevantItem[]> {
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
  if (!dnaRow) return [];
  const rows = (await weekCommuniques(db, chapterId, week)).filter((r) => r.status !== "DRAFT");
  const given = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.originatorCompanyId, companyId)), columns: { receiverCompanyId: true, state: true, closedAt: true, updatedAt: true } });
  const givenTo: Record<string, { count: number; verified_this_week: number }> = {};
  const to = addWeeks(week, 1);
  for (const g of given) {
    const acc = (givenTo[g.receiverCompanyId] ??= { count: 0, verified_this_week: 0 });
    if (!["DISQUALIFIED", "BLOCKED", "REJECTED_BY_MEMBER", "WITHDRAWN_BY_ORIGINATOR", "EXPIRED"].includes(g.state)) acc.count++;
    if (g.state === "VALUE_CONFIRMED" && g.updatedAt >= week && g.updatedAt < to) acc.verified_this_week++;
  }
  return relevantFor({ company_id: companyId, dna: dnaRow.dna, given_to: givenTo }, rows.map((r) => ({ company_id: r.companyId, company_name: r.company.name, stable: r.stable, delta: [...r.delta, ...r.declared], encargos: r.encargos })));
}

/** Histórico de Comunicados de un titular (Dossier), del más reciente al más antiguo. */
export async function communiqueHistory(db: Db, companyId: string, limit = 12) {
  return db.query.communiques.findMany({ where: and(eq(schema.communiques.companyId, companyId), ne(schema.communiques.status, "DRAFT")), orderBy: [desc(schema.communiques.weekStart)], limit });
}

const VIEW_DEDUPE_MS = 6 * 3_600_000;

/** Registra que un Timonel consultó un Dossier o la Gaceta (conocimiento mutuo). Una constancia por persona, objeto y seis horas. */
export async function recordView(db: Db, input: { chapterId: string; companyId: string; memberId: string; kind: "DOSSIER_VIEWED" | "GAZETTE_VIEWED"; subjectId: string }) {
  const recent = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.chapterId, input.chapterId), eq(schema.auditEvents.kind, input.kind), eq(schema.auditEvents.actorId, input.memberId), eq(schema.auditEvents.subjectId, input.subjectId), gte(schema.auditEvents.occurredAt, new Date(Date.now() - VIEW_DEDUPE_MS))), columns: { id: true } });
  if (recent) return false;
  await audit(db, { chapterId: input.chapterId, kind: input.kind, actor: { type: "USER", id: input.memberId }, subject: { type: input.kind === "DOSSIER_VIEWED" ? "Company" : "Gazette", id: input.subjectId }, policyApplied: "adp.mutual_knowledge", result: input.kind === "DOSSIER_VIEWED" ? "Dossier consultado." : "Gaceta consultada.", significant: false, companyIds: [input.companyId] });
  return true;
}

/** Conocimiento mutuo de una semana: proporción de titulares activos que consultaron la Gaceta o algún Dossier. */
export async function mutualKnowledge(db: Db, chapterId: string, week: Date): Promise<number | null> {
  const holders = await activeHolders(db, chapterId, week);
  if (holders.length === 0) return null;
  const views = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), inArray(schema.auditEvents.kind, ["DOSSIER_VIEWED", "GAZETTE_VIEWED"]), gte(schema.auditEvents.occurredAt, week), lt(schema.auditEvents.occurredAt, addWeeks(week, 1))), columns: { companyIds: true } });
  const seen = new Set(views.flatMap((v) => v.companyIds));
  return holders.filter((h) => seen.has(h.id)).length / holders.length;
}

/** Parte de la Directiva: cumplimiento del Comunicado por titular en una semana y conocimiento mutuo. */
export async function parteComunicados(db: Db, chapterId: string, week: Date) {
  const holders = await activeHolders(db, chapterId, week);
  const rows = await db.query.communiques.findMany({ where: and(eq(schema.communiques.chapterId, chapterId), eq(schema.communiques.weekStart, week)) });
  const byCompany = new Map(rows.map((r) => [r.companyId, r]));
  const dnas = await db.query.businessDna.findMany({ where: inArray(schema.businessDna.companyId, holders.map((h) => h.id).concat("00000000-0000-0000-0000-000000000000")), columns: { companyId: true, validatedAt: true } });
  const validated = new Set(dnas.filter((d) => d.validatedAt).map((d) => d.companyId));
  return {
    members: holders.map((h) => {
      const r = byCompany.get(h.id);
      return { company: h, status: (r?.status ?? "MISSING") as CommuniqueStatus | "MISSING", continuityStreak: r?.continuityStreak ?? 0, novelties: r ? r.delta.length + r.declared.length : 0, dnaValidated: validated.has(h.id) };
    }),
    mutualKnowledge: await mutualKnowledge(db, chapterId, week),
  };
}

/** Semanas del mes para la Valoración (D-046): Comunicados publicados y cuántos cuentan como cumplidos. */
export async function communiqueMonth(db: Db, chapterId: string, companyId: string, from: Date, to: Date) {
  const rows = await db.query.communiques.findMany({ where: and(eq(schema.communiques.chapterId, chapterId), eq(schema.communiques.companyId, companyId), gte(schema.communiques.weekStart, from), lt(schema.communiques.weekStart, to), ne(schema.communiques.status, "DRAFT")) });
  const weeks = rows.length;
  const met = rows.filter((r) => r.status === "APPROVED" || continuityCounts(r.continuityStreak)).length;
  return { weeks, met };
}

/** Lo que el Reloj ejecuta en cada pasada: borradores de la semana en curso y cierre de las vencidas. */
export async function evaluateComunicados(db: Db, now: Date, chapterId: string): Promise<CloseResult & { drafted: number }> {
  const closed = await closeWeeks(db, now, chapterId);
  const drafted = await ensureDrafts(db, chapterId, weekStart(now));
  return { ...closed, drafted };
}

export { weekCloseAt, isoWeekLabel, WEEK_MS };
