/** Máquina de estados de la Cesión (NS-ARP §9). Toda transición se valida aquí y se audita fuera. */
import type { ReferralState } from "./types";

export type Actor = "MATCHMAKER" | "COMPANY_AGENT" | "COMPLIANCE" | "ORIGINATOR" | "RECEIVER" | "DIRECTOR" | "SYSTEM";

const TRANSITIONS: Record<string, { to: ReferralState; actors: Actor[] }[]> = {
  DETECTED: [{ to: "INVESTIGATING", actors: ["MATCHMAKER"] }, { to: "EXPIRED", actors: ["SYSTEM"] }],
  INVESTIGATING: [{ to: "AGENT_MATCHED", actors: ["MATCHMAKER"] }, { to: "EXPIRED", actors: ["SYSTEM"] }, { to: "DISQUALIFIED", actors: ["MATCHMAKER", "COMPANY_AGENT"] }],
  AGENT_MATCHED: [{ to: "QUALIFIED", actors: ["COMPANY_AGENT", "MATCHMAKER"] }, { to: "DISQUALIFIED", actors: ["COMPANY_AGENT", "MATCHMAKER"] }, { to: "EXPIRED", actors: ["SYSTEM"] }],
  QUALIFIED: [{ to: "COMPLIANCE_CHECK", actors: ["MATCHMAKER"] }, { to: "DISQUALIFIED", actors: ["MATCHMAKER"] }, { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] }],
  COMPLIANCE_CHECK: [{ to: "ORIGINATOR_PENDING", actors: ["COMPLIANCE"] }, { to: "BLOCKED", actors: ["COMPLIANCE"] }],
  ORIGINATOR_PENDING: [
    { to: "RECEIVER_PENDING", actors: ["ORIGINATOR"] },
    { to: "REJECTED_BY_MEMBER", actors: ["ORIGINATOR"] },
    { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] },
    { to: "EXPIRED", actors: ["SYSTEM"] },
  ],
  RECEIVER_PENDING: [
    { to: "APPROVED", actors: ["RECEIVER"] },
    { to: "DIRECTOR_PENDING", actors: ["RECEIVER"] },
    { to: "REJECTED_BY_MEMBER", actors: ["RECEIVER"] },
    { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] },
    { to: "EXPIRED", actors: ["SYSTEM"] },
  ],
  DIRECTOR_PENDING: [{ to: "APPROVED", actors: ["DIRECTOR", "SYSTEM"] }, { to: "REJECTED_BY_MEMBER", actors: ["DIRECTOR"] }, { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] }], // SYSTEM solo por el Reloj: excepción de criterio sin decisión en 24 h (D-068)
  APPROVED: [{ to: "INTRO_AUTHORIZED", actors: ["ORIGINATOR", "SYSTEM"] }, { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] }], // SYSTEM solo por la Apertura anticipada del cedente (D-067)
  INTRO_AUTHORIZED: [{ to: "INTRODUCED", actors: ["ORIGINATOR"] }, { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] }],
  INTRODUCED: [{ to: "MEETING", actors: ["RECEIVER"] }, { to: "COMMERCIAL_OPPORTUNITY", actors: ["RECEIVER"] }, { to: "LOST", actors: ["RECEIVER"] }, { to: "NO_DECISION", actors: ["RECEIVER"] }],
  MEETING: [{ to: "COMMERCIAL_OPPORTUNITY", actors: ["RECEIVER"] }, { to: "LOST", actors: ["RECEIVER"] }, { to: "NO_DECISION", actors: ["RECEIVER"] }, { to: "WON", actors: ["RECEIVER"] }],
  COMMERCIAL_OPPORTUNITY: [{ to: "WON", actors: ["RECEIVER"] }, { to: "LOST", actors: ["RECEIVER"] }, { to: "NO_DECISION", actors: ["RECEIVER"] }],
  WON: [{ to: "VALUE_CONFIRMED", actors: ["ORIGINATOR", "RECEIVER", "SYSTEM"] }], // SYSTEM solo por el Reloj: el cedente no cuestionó el valor en 7 días (D-074)
  LOST: [],
  NO_DECISION: [],
  VALUE_CONFIRMED: [],
  DISQUALIFIED: [],
  BLOCKED: [],
  REJECTED_BY_MEMBER: [],
  WITHDRAWN_BY_ORIGINATOR: [],
  EXPIRED: [],
};

export class TransitionError extends Error {
  constructor(public from: ReferralState, public to: ReferralState, public actor: Actor) {
    super(`Transición no permitida: ${from} → ${to} por ${actor}`);
  }
}

export function canTransition(from: ReferralState, to: ReferralState, actor: Actor): boolean {
  return (TRANSITIONS[from] ?? []).some((t) => t.to === to && t.actors.includes(actor));
}

export function assertTransition(from: ReferralState, to: ReferralState, actor: Actor): void {
  if (!canTransition(from, to, actor)) throw new TransitionError(from, to, actor);
}

export const TERMINAL_STATES: ReadonlySet<ReferralState> = new Set([
  "VALUE_CONFIRMED", "LOST", "NO_DECISION", "DISQUALIFIED", "BLOCKED", "REJECTED_BY_MEMBER", "WITHDRAWN_BY_ORIGINATOR", "EXPIRED",
]);

export const REVIEW_STATES: ReadonlySet<ReferralState> = new Set(["ORIGINATOR_PENDING", "RECEIVER_PENDING", "DIRECTOR_PENDING"]);

/**
 * Plazos (D-024, D-065, D-068): cada espera de revisión dura 72 h desde que la Cesión llega a la mesa de quien decide (recordatorios a las
 * 24 y 48 h); respuesta al Interesado 48 h tras el Puente. Pregunta exprés: 24 h (recordatorio a las 4 h), sin detener nada.
 * Directiva: 24 h (recordatorio a las 4 h); si la excepción es solo de valor, la Cesión sigue sola; si no, escala a NS.
 */
export const TIMEOUTS = { reminderHours: 24, secondReminderHours: 48, expiryHours: 72, responseAfterIntroHours: 48, contactReminderHours: 24, checkInDays: 14, verdictDays: 7, contrastDays: 7, questionReminderHours: 4, questionAnswerHours: 24, directorReminderHours: 4, directorHours: 24 } as const;

/** Excepciones de Compliance que el Reloj puede dar por aprobadas si la Directiva no decide en 24 h (D-068): son de criterio, no de riesgo. */
export const AUTO_APPROVABLE_EXCEPTIONS: ReadonlySet<string> = new Set(["VALUE_THRESHOLD", "TRIAL_PERIOD"]);

/** Pregunta exprés (NS-ARP §9.1, D-065): como máximo dos preguntas por Cesión, nunca dos abiertas a la vez, y ninguna detiene la Cesión. */
export const MAX_INFO_ROUNDS = 2;

/** Estados en los que una pregunta puede estar abierta o responderse (incluida una respuesta tardía): desde la revisión del cesionario hasta el cierre. */
export const QUESTION_STATES: ReadonlySet<ReferralState> = new Set(["RECEIVER_PENDING", "DIRECTOR_PENDING", "APPROVED", "INTRO_AUTHORIZED", "INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY", "WON"]);

/** Preguntas tipo del cesionario (D-065): se eligen con un toque; el cedente contesta con sí, no o una línea. */
export const QUICK_QUESTIONS = [
  { key: "DECISION_MAKER", text: "¿Quién decide y cómo llego a esa persona?" },
  { key: "EXPECTS_CONTACT", text: "¿Sabe el Interesado que le vamos a contactar?" },
  { key: "CHANNEL", text: "¿Cuál es el mejor canal y horario para contactarle?" },
  { key: "BUDGET_TIMING", text: "¿Hay presupuesto o fecha límite?" },
  { key: "INCUMBENT", text: "¿Trabaja ya con otro proveedor de lo mío?" },
  { key: "MENTION", text: "¿Puedo mencionarte al contactarle?" },
] as const;

/** Etiquetas de estado en léxico NS para la tarjeta. */
export const STATE_LABEL: Record<ReferralState, string> = {
  DETECTED: "Indicio detectado",
  INVESTIGATING: "En la Mesa",
  AGENT_MATCHED: "Pista formulada",
  QUALIFIED: "Cualificada",
  COMPLIANCE_CHECK: "Pendiente de Salvoconducto",
  ORIGINATOR_PENDING: "Nueva · esperando al cedente",
  RECEIVER_PENDING: "Nueva · esperando al cesionario",
  DIRECTOR_PENDING: "Requiere Directiva",
  APPROVED: "Aprobada · Apertura pendiente",
  INTRO_AUTHORIZED: "Aprobada · Puente listo",
  INTRODUCED: "En curso · Puente tendido",
  MEETING: "En curso · reunión",
  COMMERCIAL_OPPORTUNITY: "En curso · propuesta",
  WON: "Cierre ganado · pendiente de contraste",
  LOST: "Cierre perdido",
  NO_DECISION: "Sin decisión",
  VALUE_CONFIRMED: "Valor contrastado",
  DISQUALIFIED: "Descartada",
  BLOCKED: "Bloqueada por Compliance",
  REJECTED_BY_MEMBER: "Declinada con motivo",
  WITHDRAWN_BY_ORIGINATOR: "Retirada por el cedente",
  EXPIRED: "Caducada",
};
