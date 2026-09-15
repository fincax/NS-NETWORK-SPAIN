/**
 * Prueba de Valor (D-050): tipos del informe. Dos caras, las dos hacia los demás (D-049):
 *  - "Lo que tu Agente habría cedido": Indicios en borrador que el Agente del candidato encontró para otros titulares.
 *  - "Lo que la Sala ya ha encontrado para tu especialidad": necesidades detectadas por los Agentes de los titulares,
 *    en agregado y sin identidad (el candidato aún no es miembro: nunca ve capa 0 ni nombres de terceros).
 */
export interface CededItem {
  title: string;
  source: string; // etiqueta legible de la fuente
  publishedAt: string;
  needs: { description: string; specialties: string[]; receivers: string[] }[];
}

export interface ValueTrialReport {
  generatedAt: string;
  days: number;
  candidate: { companyName: string; specialtyName: string; chapterName: string };
  ceded: { count: number; receivers: number; items: CededItem[] };
  forYou: {
    count: number; // necesidades de su especialidad detectadas por los Agentes de la Sala en el periodo
    fromAgents: number; // cuántos Agentes distintos las encontraron
    uncovered: number; // sin titular: se perdieron
    industries: { name: string; count: number }[];
    valueBands: { band: string; count: number }[];
    timings: { timing: string; count: number }[];
  };
  summary: string;
}

export const VALUE_TRIAL_DAYS = 7;
