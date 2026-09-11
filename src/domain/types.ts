/**
 * Tipos de dominio de la app de miembro.
 * Alineados con NS-ARP v0.1 (docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md).
 * Estos tipos describen lo que la pantalla necesita, no la persistencia completa.
 */

export type CompanyId = string;
export type ReferralId = string;

/** Estado visible del NS Business Agent (README del handoff · "Estados del avatar"). */
export type AgentStatus = "idle" | "analyzing" | "found" | "waiting";

/** NS-ARP §7.5 */
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

/** NS-ARP §9 · máquina de estados del Referral. */
export type ReferralState =
  | "DETECTED"
  | "INVESTIGATING"
  | "AGENT_MATCHED"
  | "QUALIFIED"
  | "COMPLIANCE_CHECK"
  | "MEMBER_REVIEW"
  | "APPROVED"
  | "INTRO_AUTHORIZED"
  | "INTRODUCED"
  | "MEETING"
  | "COMMERCIAL_OPPORTUNITY"
  | "WON"
  | "LOST"
  | "NO_DECISION"
  | "VALUE_CONFIRMED"
  | "DISQUALIFIED"
  | "BLOCKED"
  | "REJECTED_BY_MEMBER"
  | "WITHDRAWN_BY_ORIGINATOR"
  | "EXPIRED";

/** Subestado de MEMBER_REVIEW (NS-ARP §9). */
export type ReviewPending = "ORIGINATOR_PENDING" | "RECEIVER_PENDING" | "DIRECTOR_PENDING";

export interface MoneyRange {
  min: number;
  max: number;
  currency: "EUR";
}

export interface DayRange {
  min: number;
  max: number;
}

/** NS-ARP §7.5 · `Explanation`, reducido a lo que la card muestra. */
export interface ExplanationSummary {
  /** Frases afirmativas ordenadas por contribución al score. */
  why: string[];
  /** Qué falta por confirmar. */
  unknowns: string[];
  nextAction: string;
}

export interface Circle {
  city: string;
  number: number;
  seats: { total: number; occupied: number };
  activeSignals: number;
}

export interface MemberContext {
  firstName: string;
  company: { id: CompanyId; shortName: string };
  circle: Circle;
  /** El agente está trabajando ahora mismo. */
  agentLive: boolean;
}

/** "Mientras estabas fuera": la síntesis de la noche. */
export interface TodayDigest {
  since: Date;
  conversations: number;
  signals: number;
  matches: number;
  referralsPending: number;
  valuePotential: MoneyRange | null;
}

export interface ReferralSummary {
  id: ReferralId;
  state: ReferralState;
  pending: ReviewPending;
  title: string;
  /** NS Match Score total, 0..1. */
  matchScore: number;
  confidence: Confidence;
  origin: string;
  trigger: string;
  valuePotential: MoneyRange;
  timing: DayRange;
  explanation: ExplanationSummary;
  /** Siempre false antes de INTRO_AUTHORIZED: "Nada se ha compartido todavía." */
  sharedWithThirdParties: boolean;
}

export interface TodayView {
  member: MemberContext;
  digest: TodayDigest;
  referrals: ReferralSummary[];
  agentStatus: AgentStatus;
}
