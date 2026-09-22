/**
 * Valoración mensual del titular (D-046). Funciones puras.
 *
 * Es un porcentaje explicable, nunca un número opaco (constitución §14): cada componente se ve con su peso,
 * su valor y su evidencia. Mide calidad y fiabilidad, nunca cantidad (D-045). Sirve para un umbral:
 *   - Embajada: al menos 80 % de Valoración durante un mes completo. (La candidatura a Director/a de Sala desapareció con D-061.)
 * Los componentes sin datos en el mes no cuentan ni a favor ni en contra: el peso se reparte entre los que sí tienen datos.
 * Sin datos en ningún componente no hay Valoración ("sin datos suficientes"), y no se cumple ningún umbral.
 */
export const VALORACION = {
  threshold: 0.8,
  directorActionsForFull: 3, // acciones de dirección en el mes que valen el 100 % del componente
} as const;

export type ValoracionKey = "calidad_cedida" | "compromiso" | "plazo_respuesta" | "comunicado" | "servicio_red";

export const VALORACION_WEIGHT: Record<ValoracionKey, number> = {
  calidad_cedida: 0.4, // Veredictos recibidos por lo que cedió: Facilidad, Negocio, Trato
  compromiso: 0.25, // semanas del mes con el Compromiso cumplido
  plazo_respuesta: 0.15, // como cesionario: respuestas al Interesado dentro de 48 h
  comunicado: 0.1, // Comunicados semanales aprobados (sin datos hasta el Protocolo II)
  servicio_red: 0.1, // Directores: acciones entre Salas y dudas resueltas (solo suma)
};

export const VALORACION_LABEL: Record<ValoracionKey, string> = {
  calidad_cedida: "Calidad de lo cedido",
  compromiso: "Compromiso semanal",
  plazo_respuesta: "Plazo de respuesta",
  comunicado: "Comunicado semanal",
  servicio_red: "Servicio a la red",
};

export interface ValoracionInput {
  verdictScores: number[]; // 0..1 por Veredicto recibido en el mes sobre Cesiones cedidas; 0 si la necesidad no era real
  weeksMet: number;
  weeksEvaluated: number;
  onTime: number;
  late: number;
  communiqueMet?: number;
  communiqueWeeks?: number;
  directorActions: number;
}

export interface ValoracionComponent {
  key: ValoracionKey;
  label: string;
  weight: number;
  value: number | null; // null = sin datos en el mes
  detail: string;
}

export interface Valoracion {
  score: number | null; // 0..1; null si no hay datos suficientes
  components: ValoracionComponent[];
  eligibleEmbajada: boolean;
}

export function verdictScore(v: { ease: number; business: number; treatment: number; need_was_real: boolean }): number {
  if (!v.need_was_real) return 0;
  return (v.ease + v.business + v.treatment) / 15;
}

export function computeValoracion(input: ValoracionInput): Valoracion {
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const c: ValoracionComponent[] = [];
  c.push({ key: "calidad_cedida", label: VALORACION_LABEL.calidad_cedida, weight: VALORACION_WEIGHT.calidad_cedida, value: input.verdictScores.length ? mean(input.verdictScores) : null, detail: input.verdictScores.length ? `${input.verdictScores.length} Veredicto(s) sobre tus Cesiones` : "sin Veredictos este mes" });
  c.push({ key: "compromiso", label: VALORACION_LABEL.compromiso, weight: VALORACION_WEIGHT.compromiso, value: input.weeksEvaluated ? input.weeksMet / input.weeksEvaluated : null, detail: input.weeksEvaluated ? `${input.weeksMet} de ${input.weeksEvaluated} semanas cumplidas` : "sin semanas evaluadas" });
  const responses = input.onTime + input.late;
  c.push({ key: "plazo_respuesta", label: VALORACION_LABEL.plazo_respuesta, weight: VALORACION_WEIGHT.plazo_respuesta, value: responses ? input.onTime / responses : null, detail: responses ? `${input.onTime} de ${responses} respuestas en 48 h` : "sin Puentes recibidos este mes" });
  c.push({ key: "comunicado", label: VALORACION_LABEL.comunicado, weight: VALORACION_WEIGHT.comunicado, value: input.communiqueWeeks ? (input.communiqueMet ?? 0) / input.communiqueWeeks : null, detail: input.communiqueWeeks ? `${input.communiqueMet ?? 0} de ${input.communiqueWeeks} Comunicados aprobados` : "sin datos hasta el Protocolo II" });
  c.push({ key: "servicio_red", label: VALORACION_LABEL.servicio_red, weight: VALORACION_WEIGHT.servicio_red, value: input.directorActions > 0 ? Math.min(1, input.directorActions / VALORACION.directorActionsForFull) : null, detail: input.directorActions > 0 ? `${input.directorActions} acción(es) de dirección` : "solo suma: acciones entre Salas y dudas resueltas" });

  const available = c.filter((x) => x.value !== null);
  const totalWeight = available.reduce((a, x) => a + x.weight, 0);
  const score = totalWeight > 0 ? available.reduce((a, x) => a + (x.value as number) * x.weight, 0) / totalWeight : null;
  const eligible = score !== null && score >= VALORACION.threshold;
  return { score, components: c, eligibleEmbajada: eligible };
}

/** Primer día (UTC) del mes al que pertenece la fecha. */
export function monthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
export function nextMonth(start: Date): Date {
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}
/** El último mes completo antes de `now`: la Valoración que decide Embajada y candidaturas. */
export function lastCompletedMonthStart(now: Date): Date {
  const s = monthStart(now);
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() - 1, 1));
}
export function monthLabel(start: Date): string {
  return start.toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" });
}
