/**
 * Aval (D-042): el número público que respalda una Cesión y, agregado, a cada titular.
 * La Cesión vale en tres momentos: Promesa (a priori), Veredicto (a posteriori, interno) y Eco (la voz del Interesado).
 * Funciones puras: ningún modelo decide aquí; el sistema combina datos estructurados y explica cada bloque.
 */
import type { AvalStatus, EcoInput, EcoPhase, ReferralPromise, ReferralVerdict } from "./types";

/** Pesos del Aval de una Cesión. Suman 1. Calibrables tras el piloto (D-042). */
export const AVAL_WEIGHTS = { promise: 0.25, verdict: 0.35, eco: 0.4 } as const;

/** Pesos del Aval del titular: cuatro bloques públicos y explicables. Suman 1. */
export const TITULAR_WEIGHTS = { voice: 0.4, given_quality: 0.25, response: 0.2, contribution: 0.15 } as const;

/** Mérito que genera un Eco: al cesionario por el servicio prestado; al cedente por haber traído un Interesado que quedó bien atendido. */
export const ECO_MERIT = { receiverBase: 80, originatorBase: 30 } as const;

/** Elegibilidad para acoger Embajadas (D-015 + D-042): Aval mínimo, Ecos mínimos como cesionario y voz de los Interesados mínima. */
export const EMBASSY_ELIGIBILITY = { minAval: 70, minEcos: 3, minVoice: 0.7 } as const;

/**
 * Titular Destacado (D-043, umbral 85 confirmado por el fundador el 2026-09-14): Aval firme ≥ 85 y sin incumplimientos
 * del Reglamento en el Ejercicio. Firme = al menos 3 Ecos recibidos y 3 Cesiones cedidas con Veredicto. Nunca un ranking.
 */
export const DESTACADO = { minAval: 85, minEcos: 3, minGiven: 3, breachWindowDays: 90 } as const;

/** Hechos que cuentan como incumplimiento del Reglamento. */
export const BREACH_KINDS = ["RESPONSE_LATE", "ECO_REQUEST_MISSED", "CONTRIBUTION_QUOTA_MISSED", "COMMUNIQUE_MISSED", "POLICY_VIOLATION", "REFERRAL_FEE_VIOLATION"] as const;

export function isDestacado(i: { total: number; ecosCount: number; givenCount: number; breaches: number }): boolean {
  return i.total >= DESTACADO.minAval && i.ecosCount >= DESTACADO.minEcos && i.givenCount >= DESTACADO.minGiven && i.breaches === 0;
}

/** Ventana del Interesado: días tras el cierre en los que puede dejar o revisar su Eco. Después, el Aval se cierra SIN_ECO. */
export const ECO_WINDOW_DAYS = 30;

/** Valor neutro cuando no hay histórico: ni premia ni castiga a quien acaba de entrar. */
const NEUTRAL = 0.6;

const scale = (x: number) => (x - 1) / 4; // 1..5 → 0..1
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function ecoScore(e: Pick<EcoInput, "attention" | "result" | "recommend">): number {
  return mean([scale(e.attention), scale(e.result), scale(e.recommend)]);
}

export function verdictScore(v: Pick<ReferralVerdict, "ease" | "business" | "treatment">): number {
  return mean([scale(v.ease), scale(v.business), scale(v.treatment)]);
}

export type AvalPartKey = "promise" | "verdict" | "eco";

export interface AvalPart {
  key: AvalPartKey;
  label: string;
  value: number | null; // 0..1; null si todavía no existe
  weight: number;
  evidence: string;
}

export interface ReferralAval {
  total: number; // 0..100
  status: AvalStatus;
  parts: AvalPart[];
}

export interface ReferralAvalInput {
  promise?: ReferralPromise | null;
  verdict?: ReferralVerdict | null;
  eco?: (Pick<EcoInput, "attention" | "result" | "recommend"> & { phase?: EcoPhase }) | null;
  ecoWindowClosed?: boolean; // la ventana del Interesado se cerró (30 días tras el cierre)
}

/**
 * Aval de una Cesión: media ponderada de las partes presentes.
 * Firme cuando hay Veredicto y Eco al cierre (o un Eco durante la Cesión y la ventana ya cerrada). Sin Eco si la ventana se cerró sin voz.
 */
export function computeReferralAval(i: ReferralAvalInput): ReferralAval {
  const parts: AvalPart[] = [
    { key: "promise", label: "Promesa", value: i.promise ? clamp01(i.promise.promise_score) : null, weight: AVAL_WEIGHTS.promise, evidence: i.promise ? `Promesa ${Math.round(i.promise.promise_score * 100)} sobre 100 al aceptarse.` : "Sin Promesa todavía." },
    { key: "verdict", label: "Veredicto", value: i.verdict ? verdictScore(i.verdict) : null, weight: AVAL_WEIGHTS.verdict, evidence: i.verdict ? `Veredicto del cesionario: Facilidad ${i.verdict.ease}, Negocio ${i.verdict.business}, Trato ${i.verdict.treatment} (sobre 5). Interno a NS.` : "Sin Veredicto todavía." },
    { key: "eco", label: "Eco", value: i.eco ? ecoScore(i.eco) : null, weight: AVAL_WEIGHTS.eco, evidence: i.eco ? `Eco del Interesado: Atención ${i.eco.attention}, Resultado ${i.eco.result}, Recomendación ${i.eco.recommend} (sobre 5).` : i.ecoWindowClosed ? "El Interesado no dejó su Eco en plazo." : "Sin Eco del Interesado todavía." },
  ];
  if (i.verdict && !i.verdict.need_was_real) {
    return { total: 0, status: "NULO", parts: parts.map((p) => ({ ...p, evidence: p.key === "verdict" ? "El Veredicto demostró que el Indicio era falso: el Aval es nulo." : p.evidence })) };
  }
  const present = parts.filter((p) => p.value !== null);
  const wsum = present.reduce((a, p) => a + p.weight, 0);
  const total = wsum === 0 ? 0 : Math.round((100 * present.reduce((a, p) => a + p.weight * (p.value as number), 0)) / wsum);
  const ecoFinal = Boolean(i.eco && (i.eco.phase !== "DURANTE" || i.ecoWindowClosed));
  const status: AvalStatus = i.verdict && ecoFinal ? "FIRME" : i.verdict && !i.eco && i.ecoWindowClosed ? "SIN_ECO" : "PROVISIONAL";
  return { total, status, parts };
}

export type AvalBandKey = "ALTO" | "SOLIDO" | "EN_CONSTRUCCION" | "BAJO";

export function avalBand(total: number): { key: AvalBandKey; label: string } {
  if (total >= 85) return { key: "ALTO", label: "Aval alto" };
  if (total >= 70) return { key: "SOLIDO", label: "Aval sólido" };
  if (total >= 55) return { key: "EN_CONSTRUCCION", label: "Aval en construcción" };
  return { key: "BAJO", label: "Aval bajo" };
}

export type TitularBlockKey = keyof typeof TITULAR_WEIGHTS;

export interface TitularBlock {
  key: TitularBlockKey;
  label: string;
  value: number; // 0..1
  weight: number;
  evidence: string;
  hasData: boolean;
}

export interface TitularAvalInput {
  /** Ecos recibidos como cesionario (0..1 cada uno). Es la voz de los Interesados a los que atendió. */
  ecosReceived: number[];
  /** Aval (0..100) de las Cesiones que cedió y ya tienen Veredicto: la calidad de lo que entrega a otros. */
  givenAvals: number[];
  /** Hechos de respuesta: decisiones en plazo, respuesta al Interesado en 48 h, Petición de Eco enviada o no. */
  responses: { onTime: number; late: number; ecoSent: number; ecoMissed: number };
  /** Implicación: Cesiones válidas cedidas frente al Ritmo de la Sala en las últimas semanas, y Embajadas. */
  contribution: { validGiven: number; weeks: number; pace: number; embassies: number };
}

export interface TitularAval {
  total: number; // 0..100
  provisional: boolean; // menos de tres hechos firmes: se muestra, pero no ordena
  blocks: TitularBlock[];
  ecosCount: number;
  givenCount: number; // Cesiones cedidas con Veredicto
  embassyEligible: boolean;
}

/** Aval del titular: cuatro bloques públicos. Sin histórico, cada bloque vale lo neutro y lo dice. */
export function computeTitularAval(i: TitularAvalInput): TitularAval {
  const voice = i.ecosReceived.length ? mean(i.ecosReceived) : NEUTRAL;
  const given = i.givenAvals.length ? mean(i.givenAvals) / 100 : NEUTRAL;
  const rTotal = i.responses.onTime + i.responses.late + i.responses.ecoSent + i.responses.ecoMissed;
  const response = rTotal ? (i.responses.onTime + i.responses.ecoSent) / rTotal : NEUTRAL;
  const expected = i.contribution.pace * i.contribution.weeks;
  const contribution = expected > 0 ? clamp01((i.contribution.validGiven + 0.5 * i.contribution.embassies) / expected) : NEUTRAL;
  const blocks: TitularBlock[] = [
    { key: "voice", label: "Voz de los Interesados", value: voice, weight: TITULAR_WEIGHTS.voice, hasData: i.ecosReceived.length > 0, evidence: i.ecosReceived.length ? `${i.ecosReceived.length} Eco(s) recibidos como cesionario, media ${Math.round(voice * 100)} sobre 100.` : "Sin Ecos todavía: valor neutro." },
    { key: "given_quality", label: "Calidad de lo que cede", value: given, weight: TITULAR_WEIGHTS.given_quality, hasData: i.givenAvals.length > 0, evidence: i.givenAvals.length ? `${i.givenAvals.length} Cesión(es) cedidas con Veredicto, Aval medio ${Math.round(given * 100)}.` : "Sin Cesiones cedidas con Veredicto todavía: valor neutro." },
    { key: "response", label: "Respuesta", value: response, weight: TITULAR_WEIGHTS.response, hasData: rTotal > 0, evidence: rTotal ? `${i.responses.onTime + i.responses.ecoSent} de ${rTotal} plazos cumplidos (decisiones, respuesta al Interesado, Petición de Eco).` : "Sin plazos vencidos todavía: valor neutro." },
    { key: "contribution", label: "Contribución", value: contribution, weight: TITULAR_WEIGHTS.contribution, hasData: expected > 0, evidence: expected > 0 ? `${i.contribution.validGiven} Cesión(es) válidas cedidas${i.contribution.embassies ? ` y ${i.contribution.embassies} Embajada(s)` : ""} frente a un Ritmo de ${i.contribution.pace} por semana en ${i.contribution.weeks} semana(s).` : "Sin semanas completas en la Sala todavía: valor neutro." },
  ];
  const total = Math.round(100 * blocks.reduce((a, b) => a + b.weight * b.value, 0));
  const facts = i.ecosReceived.length + i.givenAvals.length;
  const embassyEligible = total >= EMBASSY_ELIGIBILITY.minAval && i.ecosReceived.length >= EMBASSY_ELIGIBILITY.minEcos && voice >= EMBASSY_ELIGIBILITY.minVoice;
  return { total, provisional: facts < 3, blocks, ecosCount: i.ecosReceived.length, givenCount: i.givenAvals.length, embassyEligible };
}

/** Mérito de Eco: al cesionario por lo que dice el Interesado; una parte al cedente, porque su referido acabó bien atendido. */
export function computeEcoMerit(eco: Pick<EcoInput, "attention" | "result" | "recommend">, opts: { embassy?: boolean } = {}): { receiver: number; originator: number } {
  const s = ecoScore(eco);
  const mult = opts.embassy ? 1.5 : 1;
  return { receiver: Math.round(ECO_MERIT.receiverBase * s * mult), originator: Math.round(ECO_MERIT.originatorBase * s * mult) };
}

export const ECO_LABEL: Record<"attention" | "result" | "recommend", string> = {
  attention: "Atención",
  result: "Resultado",
  recommend: "Recomendación",
};

export const AVAL_STATUS_LABEL: Record<AvalStatus, string> = {
  PROVISIONAL: "provisional",
  FIRME: "firme",
  SIN_ECO: "firme · sin Eco",
  NULO: "nulo · Indicio falso",
};
