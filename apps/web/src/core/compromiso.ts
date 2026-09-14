/**
 * Norma 1 del fundador (Reglamento N-002, D-044): al menos una Cesión válida a la semana.
 * Escalera de cuatro semanas: 1.ª sin ceder, el Agente empuja; 2.ª, primer aviso con diplomacia; 3.ª, segundo aviso tajante
 * con copia a la Directiva; 4.ª, suspensión de la titularidad en NS Network. La cuenta se reinicia con la primera Cesión válida.
 * Funciones puras: el servicio cuenta; aquí se decide el peldaño y las palabras.
 */

const D = 86_400_000;

/** Lunes 00:00 UTC de la semana que contiene la fecha. */
export function weekStart(d: Date): Date {
  const day = (d.getUTCDay() + 6) % 7; // lunes = 0
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
}

/** La semana completa anterior a `now`: [lunes, lunes siguiente). Es la que se evalúa cada mañana. */
export function previousWeek(now: Date): { start: Date; end: Date; key: string } {
  const end = weekStart(now);
  const start = new Date(end.getTime() - 7 * D);
  return { start, end, key: end.toISOString().slice(0, 10) };
}

export type LadderLevel = 0 | 1 | 2 | 3;

export interface LadderStep {
  level: LadderLevel; // 0 sin aviso · 1 primer aviso · 2 segundo aviso · 3 suspensión
  kind: "NONE" | "NUDGE" | "FIRST_WARNING" | "SECOND_WARNING" | "SUSPENSION";
  toDirectiva: boolean;
  message: string;
}

/** Peldaño de la escalera según semanas seguidas sin ceder una Cesión válida. */
export function ladder(weeksWithout: number, pace: number): LadderStep {
  const need = pace === 1 ? "al menos una Cesión válida" : `al menos ${pace} Cesiones válidas`;
  if (weeksWithout <= 0) return { level: 0, kind: "NONE", toDirectiva: false, message: "" };
  if (weeksWithout === 1) {
    return { level: 0, kind: "NUDGE", toDirectiva: false, message: `La semana pasada no cediste ninguna Cesión. El Reglamento pide ${need} a la semana. Tu Agente tiene Movimientos preparados en la Brújula: alguno de tus clientes o contactos necesita a otro titular de la Sala.` };
  }
  if (weeksWithout === 2) {
    return { level: 1, kind: "FIRST_WARNING", toDirectiva: false, message: `Primer aviso, con toda la consideración: llevas dos semanas sin ceder ninguna Cesión y el Reglamento pide ${need} a la semana. Pertenecer a NS es contribuir, y la Sala cuenta contigo. Tu Agente te propone hoy tres Movimientos concretos; con uno basta para volver a estar al día.` };
  }
  if (weeksWithout === 3) {
    return { level: 2, kind: "SECOND_WARNING", toDirectiva: true, message: `Segundo aviso, y este es tajante: tres semanas seguidas sin ceder ninguna Cesión. Si la semana que viene termina sin ${need}, la titularidad de tu plaza en NS Network quedará suspendida. La Directiva ya lo sabe. Tu Agente está a tu disposición para preparar la Cesión contigo hoy mismo.` };
  }
  return { level: 3, kind: "SUSPENSION", toDirectiva: true, message: `Cuarta semana seguida sin ceder ninguna Cesión válida. Conforme al Reglamento, la titularidad de tu plaza en NS Network queda suspendida desde hoy. El protocolo de reincorporación lo fijará NS; hasta entonces tu Agente deja la Mesa y tu plaza consta como suspendida en la Sala.` };
}

/** Texto que ve la Sala cuando una plaza queda suspendida. Sobrio: el hecho y la norma, sin más. */
export function suspensionNotice(companyName: string, specialtyName: string | null): string {
  return `${companyName} deja la Sala: titularidad suspendida por el Reglamento (cuatro semanas sin ceder ninguna Cesión válida). La plaza de ${specialtyName ?? "su especialidad"} queda suspendida hasta que NS resuelva.`;
}
