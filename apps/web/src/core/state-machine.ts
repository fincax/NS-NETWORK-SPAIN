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
    { to: "ORIGINATOR_PENDING", actors: ["RECEIVER"] }, // REQUEST_INFO (D-058): la pregunta va al cedente y vuelve con la respuesta
    { to: "EXPIRED", actors: ["SYSTEM"] },
  ],
  DIRECTOR_PENDING: [{ to: "APPROVED", actors: ["DIRECTOR"] }, { to: "REJECTED_BY_MEMBER", actors: ["DIRECTOR"] }, { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] }],
  APPROVED: [{ to: "INTRO_AUTHORIZED", actors: ["ORIGINATOR"] }, { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] }],
  INTRO_AUTHORIZED: [{ to: "INTRODUCED", actors: ["ORIGINATOR"] }, { to: "WITHDRAWN_BY_ORIGINATOR", actors: ["ORIGINATOR"] }],
  INTRODUCED: [{ to: "MEETING", actors: ["RECEIVER"] }, { to: "COMMERCIAL_OPPORTUNITY", actors: ["RECEIVER"] }, { to: "LOST", actors: ["RECEIVER"] }, { to: "NO_DECISION", actors: ["RECEIVER"] }],
  MEETING: [{ to: "COMMERCIAL_OPPORTUNITY", actors: ["RECEIVER"] }, { to: "LOST", actors: ["RECEIVER"] }, { to: "NO_DECISION", actors: ["RECEIVER"] }, { to: "WON", actors: ["RECEIVER"] }],
  COMMERCIAL_OPPORTUNITY: [{ to: "WON", actors: ["RECEIVER"] }, { to: "LOST", actors: ["RECEIVER"] }, { to: "NO_DECISION", actors: ["RECEIVER"] }],
  WON: [{ to: "VALUE_CONFIRMED", actors: ["ORIGINATOR", "RECEIVER"] }],
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

/** Plazos (D-024): recordatorio 72 h, caducidad 7 d, respuesta al Interesado 48 h tras el Puente. */
export const TIMEOUTS = { reminderHours: 72, expiryDays: 7, responseAfterIntroHours: 48, checkInDays: 14 } as const;

/** Pregunta al cedente (NS-ARP §9.1, D-058): el cesionario puede pedir información como máximo dos veces por Cesión. */
export const MAX_INFO_ROUNDS = 2;

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
