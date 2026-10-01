/**
 * La Brújula (Protocolo III · NS-ATP, D-019, D-071). Privada: nunca sale de la empresa.
 * El Agente la recalcula cada vez que el Timonel abre Hoy: dónde está, por qué (evidencia real, nunca consejos genéricos),
 * qué gana (consecuencias concretas) y los Movimientos con mayor probabilidad de producir una Cesión válida esta semana,
 * cada uno ejecutable con un toque. Nada aquí es un ranking ni un juicio: es el cuadro de mando de una sola empresa.
 */
import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { MERIT } from "@/core/merit";
import { ACTION_LABEL } from "@/core/compromiso";
import { VALORACION } from "@/core/valoracion";
import { TIMEOUTS } from "@/core/state-machine";
import { weekLabel } from "@/core/comunicado";
import { balance } from "@/services/today";
import { compromisoStatus } from "@/services/compromiso";
import { valoracionActual } from "@/services/valoracion";
import { comunicadoStatus } from "@/services/comunicados";
import { openDemands } from "@/services/demands";
import { infoRoundsFor } from "@/services/referrals";
import type { SignalEnvelope } from "@/core/types";

export type MoveAction =
  | { type: "PUBLISH_SIGNAL"; signalId: string }
  | { type: "ACCEPT_REFERRAL"; referralId: string }
  | { type: "PROPOSE_REFERRAL"; referralId: string }
  | { type: "APPROVE_COMUNICADO"; comunicadoId: string }
  | { type: "LINK"; href: string };

export interface Move {
  /** Clave estable para descartar y para medir (MOVE_ACCEPTED / MOVE_DISMISSED). */
  key: string;
  kind: "CEDER" | "DECIDIR" | "RESPONDER" | "DAR_A_CONOCER" | "CERRAR" | "PROPONER";
  title: string;
  why: string;
  source: "APUNTE" | "RASTREO" | "INDICIO" | "CESION" | "COMUNICADO" | "ENCARGO" | "PUENTE" | "VEREDICTO";
  confidence: number; // 0..1
  button: string;
  action: MoveAction;
  /** Cuenta para el Compromiso de esta semana si se ejecuta. */
  countsForCompromiso: boolean;
}

export interface Brujula {
  week: string;
  donde: { compromiso: string; comunicado: string; recibes: string; das: string; valoracion: string; tone: "green" | "amber" | "red" };
  porque: string[];
  ganas: string[];
  movimientos: Move[];
  /** Movimientos propuestos esta semana: 3 en Ritmo; 5 tras una semana sin ceder (docs/14 §4.6). */
  target: number;
  escalera: string | null;
}

const DISMISS_DAYS = 7;

/** Movimientos descartados con motivo en los últimos 7 días: no se vuelven a proponer. */
async function dismissed(db: Db, companyId: string, now: Date): Promise<Set<string>> {
  const rows = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.kind, "MOVE_DISMISSED"), eq(schema.auditEvents.actorId, companyId), gte(schema.auditEvents.occurredAt, new Date(now.getTime() - DISMISS_DAYS * 86_400_000))), columns: { subjectId: true } });
  return new Set(rows.map((r) => r.subjectId));
}

export async function brujula(db: Db, chapterId: string, companyId: string, member: { id: string; isDirector: boolean }, now = new Date()): Promise<Brujula> {
  const [bal, comp, val, com, demands] = await Promise.all([balance(db, chapterId, companyId), compromisoStatus(db, chapterId, companyId, now), valoracionActual(db, chapterId, companyId, now), comunicadoStatus(db, companyId, now), openDemands(db, chapterId)]);
  const companies = new Map((await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapterId) })).map((c) => [c.id, c]));
  const dna = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) }))?.dna;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── 1 · Dónde estás ──
  const met = comp.thisWeek.validCount >= comp.minimum;
  const tone: Brujula["donde"]["tone"] = comp.lastAction === "RELEASE_NOTICE" || comp.missedStreak >= 2 ? "red" : met ? "green" : "amber";
  const receivedMonth = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.receiverCompanyId, companyId), eq(schema.referrals.state, "VALUE_CONFIRMED"), gte(schema.referrals.updatedAt, monthStart)), columns: { valueVerified: true } });
  const score = val.current.score ?? val.decisive.score;
  const donde = {
    compromiso: `${ACTION_LABEL[comp.lastAction === "NONE" && !met ? "BELOW" : comp.lastAction]} · ${comp.thisWeek.validCount} de ${comp.minimum} Cesión válida esta semana${comp.thisWeek.distinctSpecialties > 1 ? ` a ${comp.thisWeek.distinctSpecialties} especialidades` : ""}${comp.missedStreak ? ` · ${comp.missedStreak} semana${comp.missedStreak > 1 ? "s" : ""} seguida${comp.missedStreak > 1 ? "s" : ""} sin ceder` : ""}`,
    comunicado: com.comunicado ? (com.comunicado.status === "DRAFT" ? "Comunicado de esta semana pendiente de tu toque" : com.comunicado.status === "APPROVED" ? "Comunicado aprobado" : "Comunicado publicado sin revisar") : "Comunicado: el lunes lo redacta tu Agente",
    recibes: `${receivedMonth.reduce((a, r) => a + (r.valueVerified ?? 0), 0).toLocaleString("es-ES")} € contrastados este mes · ${bal.received} Cesiones recibidas en total`,
    das: `${bal.valueGiven.toLocaleString("es-ES")} € contrastados generados para otros · ${bal.given} Cesiones hechas`,
    valoracion: score === null ? "Valoración: sin datos suficientes todavía" : `Valoración ${Math.round(score * 100)} %${score >= VALORACION.threshold ? " · apta para Embajada" : ` · a ${Math.round((VALORACION.threshold - score) * 100)} puntos de la Embajada`}`,
    tone,
  };

  // ── 2 · Por qué (evidencia real) ──
  const porque: string[] = [];
  const mine = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.originatorCompanyId, companyId)), columns: { id: true, state: true, receiverCompanyId: true, opportunitySignalId: true } });
  const decided = mine.filter((r) => !["DETECTED", "INVESTIGATING", "AGENT_MATCHED", "QUALIFIED", "COMPLIANCE_CHECK", "ORIGINATOR_PENDING", "RECEIVER_PENDING", "DIRECTOR_PENDING"].includes(r.state));
  const declined = decided.filter((r) => r.state === "REJECTED_BY_MEMBER");
  const accepted = decided.filter((r) => !["REJECTED_BY_MEMBER", "EXPIRED", "WITHDRAWN_BY_ORIGINATOR", "DISQUALIFIED", "BLOCKED"].includes(r.state));
  if (decided.length >= 2) porque.push(`+ Tus Cesiones se aceptan al ${Math.round((accepted.length / decided.length) * 100)} % (${accepted.length} de ${decided.length}).`);
  if (declined.length) {
    const notes = await db.query.humanDecisions.findMany({ where: and(inArray(schema.humanDecisions.referralId, declined.map((r) => r.id)), eq(schema.humanDecisions.decision, "REJECT")), columns: { notes: true, referralId: true } });
    const last = notes.at(-1);
    if (last?.notes) porque.push(`– ${companies.get(declined.find((r) => r.id === last.referralId)?.receiverCompanyId ?? "")?.name ?? "Un titular"} declinó tu última Cesión: «${last.notes.slice(0, 90)}». Tu Agente pedirá ese dato antes de proponer.`);
  }
  const verdicts = mine.length ? await db.query.verdicts.findMany({ where: and(inArray(schema.verdicts.referralId, mine.map((r) => r.id)), eq(schema.verdicts.provisional, false)) }) : [];
  if (verdicts.length) {
    const avg = (k: "ease" | "business" | "treatment") => verdicts.reduce((a, v) => a + v.verdict[k], 0) / verdicts.length;
    const axes: ("ease" | "business" | "treatment")[] = ["ease", "business", "treatment"];
    const weakest = axes.sort((a, b) => avg(a) - avg(b))[0];
    const label = { ease: "Facilidad", business: "Negocio", treatment: "Trato" }[weakest];
    porque.push(`· ${verdicts.length} Veredicto${verdicts.length > 1 ? "s" : ""} sobre tus Cesiones: Facilidad ${avg("ease").toFixed(1)} · Negocio ${avg("business").toFixed(1)} · Trato ${avg("treatment").toFixed(1)}. Donde más puedes mejorar: ${label}.`);
  }
  const won = mine.filter((r) => ["WON", "VALUE_CONFIRMED"].includes(r.state));
  if (won.length) {
    const signals = await db.query.opportunitySignals.findMany({ where: inArray(schema.opportunitySignals.id, won.map((r) => r.opportunitySignalId)), columns: { envelope: true } });
    const count = new Map<string, number>();
    for (const s of signals) for (const t of (s.envelope as SignalEnvelope).qualification_layer?.triggers ?? []) count.set(t, (count.get(t) ?? 0) + 1);
    const best = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t.toLowerCase().replaceAll("_", " "));
    if (best.length) porque.push(`+ Las señales que mejor conviertes: ${best.map((b) => `"${b}"`).join(" y ")}.`);
  }
  if (!porque.length) porque.push("· Aún no hay suficientes Cesiones tuyas resueltas para sacar conclusiones. Cada Veredicto que recibas enseñará a tu Agente qué te funciona.");

  // ── 3 · Qué ganas (consecuencias concretas) ──
  const ganas: string[] = [];
  ganas.push(`Mérito ${bal.merit} · cada Cesión aceptada te da hasta ${MERIT.promiseBase} de Mérito de Promesa en el acto, y el cierre hasta ${MERIT.verdictBase + MERIT.closeBase} más.`);
  if (score !== null && score < VALORACION.threshold) ganas.push(`Con un ${Math.round(VALORACION.threshold * 100)} % de Valoración un mes completo podrás acoger Embajadas de otras Salas (prima ×${MERIT.embassyMultiplier} para quien te cede).`);
  const vacant = await db.query.categorySeats.findMany({ where: and(eq(schema.categorySeats.chapterId, chapterId), eq(schema.categorySeats.status, "VACANT")), columns: { id: true } });
  if (vacant.length) ganas.push(`${vacant.length} plaza${vacant.length > 1 ? "s" : ""} vacante${vacant.length > 1 ? "s" : ""} en la Sala: un referido para una de ellas vale prima de Embajada ×${MERIT.embassyMultiplier}.`);
  const company = companies.get(companyId);
  ganas.push(`Cuota: Tramo ${company?.feeTier === "ENTRADA" ? "de entrada" : company?.feeTier?.toLowerCase() ?? "de entrada"} · ${bal.valueReceived.toLocaleString("es-ES")} € contrastados recibidos en el Ejercicio. Solo sube si NS te genera más negocio (D-025); te avisaré aquí antes.`);

  // ── 4 · Movimientos ──
  const skip = await dismissed(db, companyId, now);
  const moves: Move[] = [];
  const drafts = await db.query.opportunitySignals.findMany({ where: and(eq(schema.opportunitySignals.originatorCompanyId, companyId), eq(schema.opportunitySignals.status, "DRAFT")), orderBy: [desc(schema.opportunitySignals.createdAt)] });
  const records = new Map((await db.query.publicRecords.findMany({ where: eq(schema.publicRecords.ingestedByCompanyId, companyId) })).filter((r) => r.opportunitySignalId).map((r) => [r.opportunitySignalId as string, r]));
  const sources = new Map((await db.query.businessSignals.findMany({ where: drafts.length ? inArray(schema.businessSignals.id, drafts.map((d) => d.businessSignalId)) : eq(schema.businessSignals.id, "00000000-0000-0000-0000-000000000000"), columns: { id: true, source: true } })).map((b) => [b.id, b.source]));
  for (const d of drafts) {
    if (d.visibility === "COMPANY_ONLY") continue;
    const env = d.envelope as SignalEnvelope;
    const isApunte = sources.get(d.businessSignalId) === "APUNTE";
    const isRastreo = records.has(d.id);
    moves.push({
      key: `publish:${d.id}`,
      kind: "CEDER",
      title: `Ceder: ${env.chapter_layer.need_summary}`,
      why: isApunte ? "Lo apuntaste tú: es el referido más fiable que tiene tu Agente. Cuenta para tu Compromiso de esta semana." : isRastreo ? "Lo encontró tu Agente en fuentes públicas. Si conoces a la empresa, es una Cesión válida en un toque." : "Indicio tuyo en borrador. Publicarlo lo lleva a la Mesa ahora.",
      source: isApunte ? "APUNTE" : isRastreo ? "RASTREO" : "INDICIO",
      confidence: isApunte ? 0.9 : isRastreo ? 0.5 : 0.7,
      button: "Ceder ahora",
      action: { type: "PUBLISH_SIGNAL", signalId: d.id },
      countsForCompromiso: true,
    });
  }
  const pending = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), inArray(schema.referrals.state, ["ORIGINATOR_PENDING", "RECEIVER_PENDING", "APPROVED", "INTRO_AUTHORIZED", "INTRODUCED", "WON", "LOST", "NO_DECISION"]), or(eq(schema.referrals.originatorCompanyId, companyId), eq(schema.referrals.receiverCompanyId, companyId))) });
  const rounds = await infoRoundsFor(db, pending);
  for (const r of pending) {
    const other = companies.get(r.originatorCompanyId === companyId ? r.receiverCompanyId : r.originatorCompanyId)?.name ?? "otro titular";
    const q = rounds.get(r.id)?.pending;
    if (q && r.originatorCompanyId === companyId && !rounds.get(r.id)?.overdue) moves.push({ key: `answer:${r.id}`, kind: "RESPONDER", title: `Responder a ${other}: «${q.question.slice(0, 70)}»`, why: `Tiene ${TIMEOUTS.questionAnswerHours} h; tu Agente te ha dejado un borrador.`, source: "CESION", confidence: 0.95, button: "Responder", action: { type: "LINK", href: `/cesiones/${r.id}` }, countsForCompromiso: false });
    if (r.state === "ORIGINATOR_PENDING" && r.originatorCompanyId === companyId) moves.push({ key: `propose:${r.id}`, kind: "CEDER", title: `Proponer tu Cesión a ${other}`, why: "Tu Agente ya la ha preparado; con tu visto bueno la Apertura queda autorizada y cuenta para tu Compromiso.", source: "CESION", confidence: 0.9, button: "Proponer", action: { type: "PROPOSE_REFERRAL", referralId: r.id }, countsForCompromiso: true });
    if (r.state === "RECEIVER_PENDING" && r.receiverCompanyId === companyId) moves.push({ key: `accept:${r.id}`, kind: "DECIDIR", title: `Aceptar la Cesión de ${other} (${(r.valuePotentialMin ?? 0).toLocaleString("es-ES")}–${(r.valuePotentialMax ?? 0).toLocaleString("es-ES")} €)`, why: `${other} gana su Mérito de Promesa al aceptarla y tú el contacto. Caduca en ${Math.max(0, Math.ceil(((r.expiresAt?.getTime() ?? now.getTime()) - now.getTime()) / 3_600_000))} h.`, source: "CESION", confidence: 0.85, button: "Aceptar", action: { type: "ACCEPT_REFERRAL", referralId: r.id }, countsForCompromiso: false });
    if (r.state === "APPROVED" && r.originatorCompanyId === companyId) moves.push({ key: `open:${r.id}`, kind: "DECIDIR", title: `Autorizar la Apertura a ${other}`, why: "Ya ha aceptado. Un toque y el Puente queda redactado.", source: "CESION", confidence: 0.9, button: "Autorizar", action: { type: "LINK", href: `/cesiones/${r.id}` }, countsForCompromiso: false });
    if (r.state === "INTRO_AUTHORIZED" && r.originatorCompanyId === companyId) moves.push({ key: `bridge:${r.id}`, kind: "DECIDIR", title: `Enviar el Puente a ${other}`, why: "Está redactado. El valor de un referido cae con las horas.", source: "PUENTE", confidence: 0.9, button: "Enviar el Puente", action: { type: "LINK", href: `/cesiones/${r.id}` }, countsForCompromiso: false });
    if (r.state === "INTRODUCED" && r.receiverCompanyId === companyId && !r.contactedAt) moves.push({ key: `contact:${r.id}`, kind: "CERRAR", title: `Contactar al Interesado de ${other}`, why: `Compromiso de ${TIMEOUTS.responseAfterIntroHours} h desde el Puente. Un toque cuando lo hayas hecho.`, source: "PUENTE", confidence: 0.95, button: "He contactado", action: { type: "LINK", href: `/cesiones/${r.id}` }, countsForCompromiso: false });
    if (["WON", "LOST", "NO_DECISION"].includes(r.state) && r.receiverCompanyId === companyId) {
      const v = await db.query.verdicts.findFirst({ where: eq(schema.verdicts.referralId, r.id), columns: { provisional: true } });
      if (!v) moves.push({ key: `verdict:${r.id}`, kind: "CERRAR", title: `Emitir el Veredicto de la Cesión de ${other}`, why: `Tres toques. ${other} recibe su Mérito al instante; a los ${TIMEOUTS.verdictDays} días lo emitirá tu Agente por ti.`, source: "VEREDICTO", confidence: 0.9, button: "Veredicto", action: { type: "LINK", href: `/cesiones/${r.id}` }, countsForCompromiso: false });
    }
  }
  if (com.comunicado?.status === "DRAFT") moves.push({ key: `comunicado:${com.comunicado.id}`, kind: "DAR_A_CONOCER", title: "Aprobar tu Comunicado de la semana", why: "Es lo que los Agentes de la Sala usan para cederte bien. Un toque.", source: "COMUNICADO", confidence: 1, button: "Aprobar", action: { type: "APPROVE_COMUNICADO", comunicadoId: com.comunicado.id }, countsForCompromiso: false });
  // Encargos de otros titulares que tocan tu clientela: no es que tengas el referido, es que probablemente lo conoces.
  if (dna) {
    const myIndustries = dna.ideal_customer.industries.map((s) => s.toLowerCase());
    for (const d of demands.filter((d) => d.companyId !== companyId)) {
      const hit = d.industry && myIndustries.some((i) => d.industry!.toLowerCase().includes(i) || i.includes(d.industry!.toLowerCase()));
      if (!hit) continue;
      const who = companies.get(d.companyId)?.name ?? "Un titular";
      moves.push({ key: `demand:${d.id}`, kind: "PROPONER", title: `${who} busca: ${d.text}`, why: `Trabajas con ${d.industry}: si conoces a alguien así, un Apunte de 30 segundos es una Cesión válida.`, source: "ENCARGO", confidence: 0.4, button: "Apuntar un referido", action: { type: "LINK", href: "/apunte" }, countsForCompromiso: true });
    }
  }

  const target = comp.missedStreak >= 1 || (!met && comp.thisWeek.validCount === 0 && comp.lastAction !== "NONE") ? 5 : 3;
  const rank = (m: Move) => (met ? 0 : m.countsForCompromiso ? 2 : 0) + m.confidence;
  const ranked = moves.filter((m) => !skip.has(m.key)).sort((a, b) => rank(b) - rank(a));
  // Diversidad: antes de repetir un tipo (tres Indicios del Rastreo), un Movimiento de cada clase; una Cesión que espera nunca se queda fuera por ello.
  const movimientos: Move[] = [];
  const seen = new Set<Move["kind"]>();
  for (const m of ranked) if (movimientos.length < target && !seen.has(m.kind)) { movimientos.push(m); seen.add(m.kind); }
  for (const m of ranked) if (movimientos.length < target && !movimientos.includes(m)) movimientos.push(m);

  const escalera = comp.missedStreak >= 3 ? "Aviso formal de la Directiva: una semana más sin ceder y la plaza vuelve a la Antesala (D-042)." : comp.missedStreak === 2 ? "Aviso diplomático: la tercera semana trae el aviso formal de la Directiva y la cuarta, la baja (D-042)." : comp.missedStreak === 1 ? "Una semana sin ceder. Tu Agente propone cinco Movimientos en vez de tres." : null;

  void member;
  return { week: weekLabel(now), donde, porque, ganas, movimientos, target, escalera };
}

/** Descartar un Movimiento con motivo: entrena al Agente y no se vuelve a proponer en 7 días. */
export async function dismissMove(db: Db, input: { chapterId: string; companyId: string; memberId: string; key: string; reason: string }) {
  await audit(db, { chapterId: input.chapterId, kind: "MOVE_DISMISSED", actor: { type: "USER", id: input.companyId }, subject: { type: "Move", id: input.key }, policyApplied: "compass.dismiss", result: `Movimiento descartado por el Timonel (${input.memberId}): ${input.reason}`, significant: false, companyIds: [input.companyId] });
}

export async function acceptedMove(db: Db, input: { chapterId: string; companyId: string; key: string }) {
  await audit(db, { chapterId: input.chapterId, kind: "MOVE_ACCEPTED", actor: { type: "USER", id: input.companyId }, subject: { type: "Move", id: input.key }, policyApplied: "compass.accept", result: "Movimiento ejecutado con un toque desde la Brújula.", significant: false, companyIds: [input.companyId] });
}
