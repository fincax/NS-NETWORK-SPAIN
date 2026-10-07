/**
 * Titular de una Cesión: lo que el Interesado necesita DE ESTE cesionario (D-077).
 * Un Indicio puede derivar varias necesidades para titulares distintos; el resumen del Indicio se encabeza con la
 * más probable, que no tiene por qué ser la emparejada. La Cesión se presenta siempre con su necesidad; el resumen
 * del Indicio queda como contexto. El sujeto depende de quién es el Interesado (D-079). Funciones puras.
 */
import type { ChapterLayer } from "./types";

type Subject = Pick<ChapterLayer, "industry" | "company_size_band"> & { interesado_kind?: ChapterLayer["interesado_kind"] };

/** "Adecuación de la línea de producción." → "adecuación de la línea de producción" */
export function needPhrase(description: string): string {
  const d = description.trim().replace(/\.$/, "");
  return d.charAt(0).toLowerCase() + d.slice(1);
}

/** "Empresa industrial de 51–200 empleados" · "Profesional autónomo de salud" · "Particular" (misma regla que la extracción). */
export function subjectOf(layer0: Subject): string {
  const kind = layer0.interesado_kind ?? "EMPRESA";
  const industry = layer0.industry;
  const generic = !industry || /^(servicios|particular)$/i.test(industry);
  if (kind === "PARTICULAR") return "Particular";
  if (kind === "PROFESIONAL") return generic ? "Profesional autónomo" : `Profesional autónomo de ${industry.toLowerCase()}`;
  const who = industry === "Industrial" ? "Empresa industrial" : industry === "Tecnología" ? "Empresa tecnológica" : `Empresa de ${industry.toLowerCase()}`;
  return layer0.company_size_band ? `${who} de ${layer0.company_size_band.replace("-", "–")} empleados` : who;
}

/** "Empresa industrial de 51–200 empleados necesita adecuación de la línea de producción" */
export function cesionHeadline(need: { description: string }, layer0: Subject): string {
  return `${subjectOf(layer0)} necesita ${needPhrase(need.description)}`;
}

/** Línea corta de ficha: "Industrial · 51–200 empleados · Sevilla" / "Particular · Sevilla". */
export function subjectLine(layer0: Subject & { geography: ChapterLayer["geography"] }): string {
  const kind = layer0.interesado_kind ?? "EMPRESA";
  const place = layer0.geography.city ?? layer0.geography.region ?? layer0.geography.country;
  if (kind === "PARTICULAR") return ["Particular", place].filter(Boolean).join(" · ");
  if (kind === "PROFESIONAL") return ["Profesional o autónomo", /^(servicios|particular)$/i.test(layer0.industry) ? "" : layer0.industry, place].filter(Boolean).join(" · ");
  return [layer0.industry, layer0.company_size_band ? `${layer0.company_size_band.replace("-", "–")} empleados` : "", place].filter(Boolean).join(" · ");
}
