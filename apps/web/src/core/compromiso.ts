/**
 * Compromiso (D-010, parámetros fijados en D-042). Funciones puras.
 *
 *  - Mínimo: 1 Cesión válida por semana y titular (Ritmo de NS; la Sala puede fijar uno mayor).
 *    Con el mínimo se cumple; para destacar hay que ceder varias y a varias especialidades.
 *  - Escalera, sin excusas, por semanas seguidas sin una sola Cesión válida:
 *      1 → constancia en la Brújula y en la Balanza.
 *      2 → aviso diplomático del Agente.
 *      3 → aviso formal de la Directiva: aportar lo antes posible.
 *      4 → notificación de baja de la titularidad. La Directiva la ejecuta y la plaza vuelve a la Antesala.
 *  - Una Cesión válida (aceptada por el cesionario) pone la cuenta a cero.
 *  - Principio del núcleo (D-045): la calidad del negocio cedido vale más que la cantidad, siempre. Por eso el
 *    Mérito semanal no crece con el número de Cesiones, solo con la amplitud (especialidades distintas), y el
 *    Mérito grande viene de la Promesa, el Veredicto y el Cierre de cada Cesión.
 */
export const COMPROMISO = {
  weeklyMinimum: 1,
  diplomaticNoticeWeek: 2,
  formalNoticeWeek: 3,
  releaseWeek: 4,
} as const;

export type CompromisoAction = "NONE" | "BELOW" | "MISSED" | "DIPLOMATIC_NOTICE" | "FORMAL_NOTICE" | "RELEASE_NOTICE";
// BELOW: cedió algo pero menos que el mínimo (varias titularidades en la Sala, D-047). No sube la Escalera: hubo Cesión válida.

/** Qué toca en una semana sin Cesión válida, según las semanas seguidas (incluida esta) sin ceder. */
export function ladderAction(missedStreak: number): CompromisoAction {
  if (missedStreak >= COMPROMISO.releaseWeek) return "RELEASE_NOTICE";
  if (missedStreak === COMPROMISO.formalNoticeWeek) return "FORMAL_NOTICE";
  if (missedStreak === COMPROMISO.diplomaticNoticeWeek) return "DIPLOMATIC_NOTICE";
  if (missedStreak >= 1) return "MISSED";
  return "NONE";
}

/** Peso en la Hoja de Méritos de cada peldaño. La baja no resta más: la plaza ya se pierde. */
export const MISSED_WEIGHT: Record<CompromisoAction, number> = { NONE: 0, BELOW: -5, MISSED: -5, DIPLOMATIC_NOTICE: -10, FORMAL_NOTICE: -20, RELEASE_NOTICE: -20 };

/** Mérito por cumplir la semana: base por cumplir y un plus por cada especialidad distinta más allá de la primera. */
export function weeklyMerit(validCount: number, distinctSpecialties: number): number {
  if (validCount <= 0) return 0;
  return 10 + Math.min(4, Math.max(0, distinctSpecialties - 1)) * 5;
}

const WEEK_MS = 7 * 86_400_000;

/** Lunes 00:00 UTC de la semana a la que pertenece la fecha. */
export function weekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

/** Lunes de la última semana completa antes de `now`. */
export function lastCompletedWeekStart(now: Date): Date {
  return new Date(weekStart(now).getTime() - WEEK_MS);
}

export function addWeeks(start: Date, n: number): Date {
  return new Date(start.getTime() + n * WEEK_MS);
}

export const ACTION_LABEL: Record<CompromisoAction, string> = {
  NONE: "En Ritmo",
  BELOW: "Por debajo del mínimo",
  MISSED: "Semana sin ceder",
  DIPLOMATIC_NOTICE: "Aviso diplomático",
  FORMAL_NOTICE: "Aviso formal",
  RELEASE_NOTICE: "Baja notificada",
};
