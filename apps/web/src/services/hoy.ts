/**
 * Hoy (D-070): el tiempo del Timonel es oro. La pantalla se compone de dos listas y nada más por encima de ellas:
 *
 *  - **Toques**: lo que espera su decisión, ordenado por urgencia, con el botón de la decisión evidente dentro de la fila
 *    (aceptar, proponer, enviar el borrador de respuesta, autorizar la Apertura, publicar el Apunte, aprobar el Comunicado).
 *    Un toque por fila; "Ver" para quien quiera leer más. La puerta humana sigue siendo humana: la pulsa la persona.
 *  - **Contratiempos**: lo que se ha torcido y tiene solución inmediata (un Interesado sin respuesta, una pregunta vencida
 *    que aún sirve, un referido caducado por silencio ajeno, un Indicio que la Mesa no pudo cualificar, semanas sin ceder).
 *    Cada uno con su salida en un toque. Nunca un aviso sin acción.
 *
 * Todo lo demás (Compromiso cumplido, Comunicado aprobado, Sala viva, copias) baja a una línea de estado o se pliega.
 */
import { and, desc, eq, gte, inArray, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { QUESTION_STATES, REVIEW_STATES, TIMEOUTS } from "@/core/state-machine";
import type { ReferralState } from "@/core/types";
import { infoRoundsFor } from "@/services/referrals";
import { compromisoStatus, type CompromisoStatus } from "@/services/compromiso";
import { comunicadoStatus, type ComunicadoStatus } from "@/services/comunicado";
import { candidacyCounts } from "@/services/antesala";
import { activeInterview } from "@/services/entrevista";
import { eurRange } from "@/lib/format";
import { needPhrase } from "@/core/headline";

export type ToqueAction = "ACCEPT" | "PROPOSE" | "ANSWER_DRAFT" | "OPEN" | "PUBLISH_SIGNAL" | "APPROVE_COMMUNIQUE" | "CONTACTED";

export interface Toque {
  key: string;
  kind: "PREGUNTA" | "CESION_RECIBIDA" | "CESION_PROPUESTA" | "APERTURA" | "PUENTE" | "CONTACTAR" | "DIRECTIVA" | "APUNTE" | "COMUNICADO" | "ANTESALA" | "ADN" | "RASTREO";
  title: string;
  detail: string;
  meta?: string; // valor, encaje
  href: string;
  hrefLabel: string;
  primary?: { label: string; action: ToqueAction; payload: Record<string, string> };
  deadline?: string; // "caduca en 31 h"
  urgency: number; // menor = antes
  tone: "amber" | "red" | "";
}

export interface Contratiempo {
  key: string;
  title: string;
  detail: string;
  href?: string;
  actionLabel: string;
  primary?: { label: string; action: ToqueAction; payload: Record<string, string> };
  tone: "red" | "amber";
}

export interface HoyBoard {
  toques: Toque[];
  contratiempos: Contratiempo[];
  waiting: { id: string; state: string; other: string; iAmReceiver: boolean; value: string }[];
  inCourse: { id: string; state: string; other: string; iAmReceiver: boolean; value: string }[];
  compromiso: CompromisoStatus;
  comunicado: ComunicadoStatus;
  dnaValidated: boolean;
}

const H = 3_600_000;
const hoursLeft = (until: Date | null | undefined, now: Date) => (until ? Math.max(0, Math.ceil((until.getTime() - now.getTime()) / H)) : null);
const left = (until: Date | null | undefined, now: Date) => {
  const h = hoursLeft(until, now);
  return h === null ? undefined : h === 0 ? "vence ahora" : `caduca en ${h} h`;
};

export async function hoyBoard(db: Db, ctx: { chapterId: string; companyId: string; member: { id: string; isDirector: boolean; isNetwork: boolean } }, now = new Date()): Promise<HoyBoard> {
  const { chapterId, companyId, member } = ctx;
  const companies = new Map((await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapterId), columns: { id: true, name: true, slug: true } })).map((c) => [c.id, c]));
  const other = (r: { originatorCompanyId: string; receiverCompanyId: string }) => companies.get(r.receiverCompanyId === companyId ? r.originatorCompanyId : r.receiverCompanyId)?.name ?? "otra empresa";

  const open = await db.query.referrals.findMany({
    where: and(eq(schema.referrals.chapterId, chapterId), inArray(schema.referrals.state, [...REVIEW_STATES, "APPROVED", "INTRO_AUTHORIZED", "INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY", "WON"]), or(eq(schema.referrals.receiverCompanyId, companyId), eq(schema.referrals.originatorCompanyId, companyId), member.isDirector ? eq(schema.referrals.state, "DIRECTOR_PENDING") : undefined)),
    orderBy: [desc(schema.referrals.updatedAt)],
  });
  const rounds = await infoRoundsFor(db, open);
  const matches = new Map((await db.query.matchCandidates.findMany({ where: inArray(schema.matchCandidates.id, open.map((r) => r.matchId).concat("00000000-0000-0000-0000-000000000000")) })).map((m) => [m.id, m]));
  const fitOf = (r: { matchId: string }) => { const m = matches.get(r.matchId); return m ? `${Math.round(m.score.total * 100)} %` : ""; };
  const needs = new Map((await db.query.needs.findMany({ where: inArray(schema.needs.id, open.map((r) => r.needId).concat("00000000-0000-0000-0000-000000000000")), columns: { id: true, description: true } })).map((n) => [n.id, n]));
  // La necesidad emparejada abre el detalle (D-077): un Indicio sirve a varios titulares y cada Cesión dice qué pide de este.
  const whyOf = (r: { matchId: string; needId: string }) => { const n = needs.get(r.needId); const why = matches.get(r.matchId)?.explanation.why[0] ?? ""; return n ? `Necesita ${needPhrase(n.description)}. ${why}`.trim() : why; };

  const toques: Toque[] = [];
  const contratiempos: Contratiempo[] = [];
  const waiting: HoyBoard["waiting"] = [];
  const inCourse: HoyBoard["inCourse"] = [];

  for (const r of open) {
    const iAmReceiver = r.receiverCompanyId === companyId;
    const iAmOriginator = r.originatorCompanyId === companyId;
    const q = rounds.get(r.id);
    const value = eurRange(r.valuePotentialMin, r.valuePotentialMax);
    const href = `/cesiones/${r.id}`;
    const row = { id: r.id, state: r.state, other: other(r), iAmReceiver, value };

    // Pregunta exprés al cedente: 24 h; vencida, aún sirve (contratiempo).
    if (iAmOriginator && q?.pending && QUESTION_STATES.has(r.state as ReferralState)) {
      const draft = q.pending.draft_answer;
      const primary = draft ? { label: "Enviar el borrador de mi Agente", action: "ANSWER_DRAFT" as const, payload: { referralId: r.id } } : undefined;
      if (q.overdue) {
        contratiempos.push({ key: `q-${r.id}`, title: `${other(r)} te preguntó y el plazo venció`, detail: `«${q.pending.question}». La Cesión siguió sin tu respuesta; si contestas ahora, ${other(r)} la verá destacada.`, href, actionLabel: "Responder", primary, tone: "amber" });
      } else {
        toques.push({ key: `q-${r.id}`, kind: "PREGUNTA", title: `${other(r)} te pregunta`, detail: `«${q.pending.question}»${draft ? ` · borrador de tu Agente: «${draft}»` : ""}`, href, hrefLabel: draft ? "Responder a mano" : "Responder", primary, deadline: q.dueAt ? `responde en ${hoursLeft(q.dueAt, now)} h` : undefined, urgency: 0, tone: "amber" });
      }
    }

    if (r.state === "RECEIVER_PENDING" && iAmReceiver) {
      toques.push({ key: r.id, kind: "CESION_RECIBIDA", title: `Cesión de ${other(r)} · ${fitOf(r)}`, detail: whyOf(r), meta: value, href, hrefLabel: "Ver antes de decidir", primary: { label: "Aceptar", action: "ACCEPT", payload: { referralId: r.id } }, deadline: left(r.expiresAt, now), urgency: 1, tone: "amber" });
    } else if (r.state === "ORIGINATOR_PENDING" && iAmOriginator) {
      toques.push({ key: r.id, kind: "CESION_PROPUESTA", title: `Tu Agente preparó una Cesión para ${other(r)} · ${fitOf(r)}`, detail: `${whyOf(r)} Si propones, ${other(r)} verá el contexto sin identidad y la Apertura quedará autorizada (solo la empresa).`, meta: value, href, hrefLabel: "Elegir alcance", primary: { label: "Proponer", action: "PROPOSE", payload: { referralId: r.id } }, deadline: left(r.expiresAt, now), urgency: 2, tone: "amber" });
    } else if (r.state === "DIRECTOR_PENDING" && member.isDirector && !iAmReceiver && !iAmOriginator) {
      toques.push({ key: r.id, kind: "DIRECTIVA", title: `Excepción pendiente de la Directiva · ${companies.get(r.originatorCompanyId)?.name} → ${companies.get(r.receiverCompanyId)?.name}`, detail: r.escalatedAt ? "Escalada a NS: no sigue sola." : `Decide en ${TIMEOUTS.directorHours} h; si la excepción es solo de valor, la Cesión seguirá sola.`, meta: value, href, hrefLabel: "Revisar", deadline: left(r.expiresAt, now), urgency: 3, tone: r.escalatedAt ? "red" : "amber" });
    } else if (r.state === "APPROVED" && iAmOriginator) {
      toques.push({ key: r.id, kind: "APERTURA", title: `${other(r)} aceptó tu Cesión · autoriza la Apertura`, detail: "Con un toque se abre solo la empresa y tu Agente redacta el Puente. Para abrir también la persona de contacto, elige el alcance.", meta: value, href, hrefLabel: "Elegir alcance", primary: { label: "Autorizar la Apertura", action: "OPEN", payload: { referralId: r.id } }, urgency: 4, tone: "amber" });
    } else if (r.state === "INTRO_AUTHORIZED" && iAmOriginator) {
      toques.push({ key: r.id, kind: "PUENTE", title: `Puente listo para ${other(r)} · envíalo hoy`, detail: "Tu Agente lo ha redactado. Revísalo, envíalo desde tu correo y márcalo como tendido: el valor de un referido cae con las horas.", meta: value, href, hrefLabel: "Ver y enviar el Puente", urgency: 5, tone: "amber" });
    } else if (REVIEW_STATES.has(r.state as ReferralState) || r.state === "APPROVED" || r.state === "INTRO_AUTHORIZED") {
      if (iAmReceiver || iAmOriginator) waiting.push(row);
    } else if (iAmReceiver && r.state === "INTRODUCED" && !r.contactedAt && !r.lateFlaggedAt) {
      // Primer contacto en un toque (D-073, F7): dentro de las 48 h es un toque; pasado el plazo, un contratiempo.
      toques.push({ key: `contact-${r.id}`, kind: "CONTACTAR", title: `Puente tendido por ${other(r)} · llama al Interesado`, detail: "Ya sabe que le vas a llamar. Cuando lo hayas hecho, un toque: el cedente lo verá y el plazo queda cumplido.", meta: value, href, hrefLabel: "Ver el contacto", primary: { label: "He contactado", action: "CONTACTED", payload: { referralId: r.id } }, deadline: r.responseDueAt ? `${hoursLeft(r.responseDueAt, now)} h para contactar` : undefined, urgency: 1.5, tone: "amber" });
      inCourse.push(row);
    } else {
      if (iAmReceiver || iAmOriginator) inCourse.push(row);
      // Interesado sin respuesta en 48 h tras el Puente (contratiempo del cesionario).
      if (iAmReceiver && r.state === "INTRODUCED" && r.lateFlaggedAt && !r.contactedAt) {
        contratiempos.push({ key: `late-${r.id}`, title: `El Interesado de ${other(r)} lleva ${Math.round((now.getTime() - (r.introducedAt?.getTime() ?? now.getTime())) / H)} h sin respuesta tuya`, detail: "El compromiso era responderle en 48 h. Llámale ahora y márcalo: el retraso ya cuenta en tu Hoja de Méritos; seguir callando cuenta más.", href, actionLabel: "Ver el contacto", primary: { label: "He contactado", action: "CONTACTED", payload: { referralId: r.id } }, tone: "red" });
      }
    }
  }

  // Apuntes y propuestas del Rastreo en borrador: publicar es un toque.
  const drafts = await db.query.opportunitySignals.findMany({ where: and(eq(schema.opportunitySignals.originatorCompanyId, companyId), eq(schema.opportunitySignals.status, "DRAFT")), orderBy: [desc(schema.opportunitySignals.createdAt)] });
  const records = await db.query.publicRecords.findMany({ where: eq(schema.publicRecords.ingestedByCompanyId, companyId) });
  const recordBySignal = new Map(records.filter((r) => r.opportunitySignalId).map((r) => [r.opportunitySignalId as string, r]));
  const sources = new Map((await db.query.businessSignals.findMany({ where: inArray(schema.businessSignals.id, drafts.map((d) => d.businessSignalId).concat("00000000-0000-0000-0000-000000000000")), columns: { id: true, source: true, rawContent: true } })).map((b) => [b.id, b]));
  for (const d of drafts) {
    if (d.visibility === "COMPANY_ONLY") continue;
    const rec = recordBySignal.get(d.id);
    const src = sources.get(d.businessSignalId);
    if (rec) {
      toques.push({ key: d.id, kind: "RASTREO", title: `Tu Agente encontró en ${rec.source === "PRENSA" ? "la prensa" : rec.source === "LICITACION" ? "una licitación" : "una fuente pública"}: ${rec.title}`, detail: d.envelope.chapter_layer.need_summary, href: `/indicio/${d.id}`, hrefLabel: "Ver", primary: { label: "Publicar en la Sala", action: "PUBLISH_SIGNAL", payload: { id: d.id } }, urgency: 9, tone: "" });
    } else if (src?.source === "APUNTE") {
      toques.push({ key: d.id, kind: "APUNTE", title: `Tu Apunte: ${d.envelope.chapter_layer.need_summary}`, detail: src.rawContent.replace(/^Apunte del Timonel\.\s*/, ""), href: `/indicio/${d.id}`, hrefLabel: "Ver lo que verá la Sala", primary: { label: "Publicar en la Sala", action: "PUBLISH_SIGNAL", payload: { id: d.id } }, urgency: 6, tone: "amber" });
    } else {
      toques.push({ key: d.id, kind: "APUNTE", title: `Tu Indicio en borrador: ${d.envelope.chapter_layer.need_summary}`, detail: "Decide si lo publicas en la Sala.", href: `/indicio/${d.id}`, hrefLabel: "Ver", primary: { label: "Publicar en la Sala", action: "PUBLISH_SIGNAL", payload: { id: d.id } }, urgency: 6, tone: "amber" });
    }
  }

  // Comunicado de la semana (Protocolo II): un toque.
  const comunicado = await comunicadoStatus(db, chapterId, companyId, now);
  if (comunicado.row?.status === "DRAFT") {
    const novelties = [...comunicado.row.delta, ...comunicado.row.declared];
    toques.push({ key: "comunicado", kind: "COMUNICADO", title: `Tu Comunicado de la semana · ${novelties.length ? `${novelties.length} ${novelties.length === 1 ? "novedad" : "novedades"}` : "sin novedades"}`, detail: novelties.length ? novelties.slice(0, 2).map((d) => d.text).join(" · ") : comunicado.continuityStreak >= 2 ? `Llevas ${comunicado.continuityStreak} semanas de continuidad: la Sala no sabe nada nuevo de ti.` : "Lo estable sigue vigente. Apruébalo tal cual o añade una novedad en una frase.", href: "/comunicado", hrefLabel: "Añadir una novedad", primary: { label: "Aprobar", action: "APPROVE_COMMUNIQUE", payload: {} }, deadline: `cierra en ${comunicado.hoursLeft} h`, urgency: comunicado.continuityStreak >= 2 ? 2.5 : 7, tone: comunicado.continuityStreak >= 2 ? "red" : "" });
  }

  // ADN sin validar: el Agente trabaja a ciegas.
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId), columns: { validatedAt: true } });
  const dnaValidated = Boolean(dnaRow?.validatedAt);
  if (dnaRow && !dnaValidated) {
    const interview = await activeInterview(db, companyId);
    toques.push({ key: "adn", kind: "ADN", title: "Tu Agente quiere conocerte", detail: interview ? `Entrevista al ${interview.progress} %: diez preguntas en total y tu ADN queda listo para la Mesa.` : "Diez preguntas y tu ADN queda listo para la Mesa. Sin él, tu Agente cede y recibe a ciegas.", href: "/entrevista", hrefLabel: interview ? "Continuar la entrevista" : "Empezar la entrevista", urgency: 8, tone: "amber" });
  }

  // Directiva: Antesala.
  if (member.isDirector) {
    const c = await candidacyCounts(db);
    if (c.pendientes > 0) toques.push({ key: "antesala", kind: "ANTESALA", title: `Antesala · ${c.nuevas} ${c.nuevas === 1 ? "candidatura nueva" : "candidaturas nuevas"}`, detail: `${c.pendientes - c.nuevas} más en conversación esperan a la Directiva.`, href: "/antesala", hrefLabel: "Despachar", urgency: 8.5, tone: c.nuevas ? "amber" : "" });
  }

  // Contratiempos desde los hechos de los últimos 14 días.
  const since = new Date(now.getTime() - 14 * 24 * H);
  const events = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), inArray(schema.auditEvents.kind, ["RELAY_PROPOSED", "MESA_NEEDS_HUMAN", "ESCALATED_TO_NS"]), gte(schema.auditEvents.occurredAt, since)), orderBy: [desc(schema.auditEvents.occurredAt)] });
  const seenRelay = new Set<string>();
  for (const e of events) {
    if (e.companyIds.length && !e.companyIds.includes(companyId)) continue;
    if (e.kind === "RELAY_PROPOSED" && !seenRelay.has(e.subjectId)) {
      seenRelay.add(e.subjectId);
      const r = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, e.subjectId), columns: { receiverCompanyId: true, originatorCompanyId: true, state: true } });
      if (r?.state === "EXPIRED") contratiempos.push({ key: `relay-${e.subjectId}`, title: `Tu Cesión a ${companies.get(r.receiverCompanyId)?.name ?? "un titular"} caducó por su silencio`, detail: "El referido no se pierde: tu Agente lo ha recuperado. Vuelve a cederlo desde un Apunte nuevo o propónlo a otra Sala como Embajada. El Interesado no debería esperar.", href: "/apunte", actionLabel: "Volver a cederlo", tone: "amber" });
    } else if (e.kind === "MESA_NEEDS_HUMAN") {
      contratiempos.push({ key: `mesa-${e.subjectId}`, title: "La Mesa no pudo cualificar un Indicio tuyo", detail: "Tras tres intentos, tu Agente lo deja en tus manos: revísalo o vuelve a publicarlo.", href: `/indicio/${e.subjectId}`, actionLabel: "Revisar el Indicio", tone: "amber" });
    } else if (e.kind === "ESCALATED_TO_NS" && member.isNetwork) {
      contratiempos.push({ key: `esc-${e.subjectId}`, title: "Excepción de riesgo escalada a NS", detail: "La Directiva no resolvió en 24 h y la Cesión no sigue sola. Decide por NS.", href: `/cesiones/${e.subjectId}`, actionLabel: "Resolver", tone: "red" });
    }
  }

  // Compromiso: semanas sin ceder.
  const compromiso = await compromisoStatus(db, chapterId, companyId, now);
  if (compromiso.missedStreak >= 1 && compromiso.thisWeek.validCount < compromiso.minimum && compromiso.lastAction !== "RELEASE_NOTICE") {
    contratiempos.push({ key: "compromiso", title: `${compromiso.missedStreak} ${compromiso.missedStreak === 1 ? "semana" : "semanas"} sin una Cesión válida`, detail: compromiso.nextStep, href: "/apunte", actionLabel: "Apuntar un referido", tone: compromiso.missedStreak >= 2 ? "red" : "amber" });
  }

  toques.sort((a, b) => a.urgency - b.urgency);
  const order = { red: 0, amber: 1 };
  contratiempos.sort((a, b) => order[a.tone] - order[b.tone]);
  return { toques, contratiempos, waiting, inCourse, compromiso, comunicado, dnaValidated };
}
