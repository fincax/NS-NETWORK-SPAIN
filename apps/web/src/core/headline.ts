/**
 * Titular de una Cesión: lo que el Interesado necesita DE ESTE cesionario (D-077).
 * Un Indicio puede derivar varias necesidades para titulares distintos; el resumen del Indicio se encabeza con la
 * más probable, que no tiene por qué ser la emparejada. La Cesión se presenta siempre con su necesidad; el resumen
 * del Indicio queda como contexto. Funciones puras.
 */
import type { ChapterLayer } from "./types";

/** "Adecuación de la línea de producción." → "adecuación de la línea de producción" */
export function needPhrase(description: string): string {
  const d = description.trim().replace(/\.$/, "");
  return d.charAt(0).toLowerCase() + d.slice(1);
}

/** "Empresa industrial de 51–200 empleados" a partir de la capa 0 (misma regla que la extracción). */
export function subjectOf(layer0: Pick<ChapterLayer, "industry" | "company_size_band">): string {
  const industry = layer0.industry;
  const who = industry === "Industrial" ? "Empresa industrial" : industry === "Tecnología" ? "Empresa tecnológica" : `Empresa de ${industry.toLowerCase()}`;
  return `${who} de ${layer0.company_size_band.replace("-", "–")} empleados`;
}

/** "Empresa industrial de 51–200 empleados necesita adecuación de la línea de producción" */
export function cesionHeadline(need: { description: string }, layer0: Pick<ChapterLayer, "industry" | "company_size_band">): string {
  return `${subjectOf(layer0)} necesita ${needPhrase(need.description)}`;
}
