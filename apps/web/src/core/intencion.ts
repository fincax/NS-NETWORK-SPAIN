/**
 * Intención del Timonel (D-075): "Dile a tu Agente". El Timonel escribe o dicta como habla; el Agente lo traduce a una
 * **propuesta tipada** y nada cambia hasta que el Timonel la confirma con un toque.
 *
 * Tres destinos posibles, y solo esos tres, porque son los tres objetos que ya existen:
 *   ENCARGO   lo que buscas ahora (D-032): los Agentes de los demás lo usan para priorizar lo que te ceden.
 *   ADN       un cambio estructural de cómo trabajas (ticket, sectores, zonas, exclusiones, capacidad, objetivo):
 *             se aplica como una versión nueva del ADN validada por el Timonel, nunca en silencio.
 *   APUNTE    si lo que has dicho es un referido para la Sala (D-037), nace como Apunte en borrador.
 * Si el Agente no está seguro, lo dice (INSUFICIENTE) y pregunta, en vez de inventar (NS-ARP §12).
 */
import { z } from "zod";
import { BusinessDNA, BusinessTrigger, SizeBand, ValueBand } from "./types";

export const IntentKind = z.enum(["ENCARGO", "ADN", "APUNTE", "INSUFICIENTE"]);
export type IntentKind = z.infer<typeof IntentKind>;

export const IntentEncargo = z.object({
  text: z.string().min(4),
  trigger: BusinessTrigger.optional(),
  industry: z.string().optional(),
  value_band: ValueBand.optional(),
});
export type IntentEncargo = z.infer<typeof IntentEncargo>;

/** Parche del ADN: solo lo que el Timonel ha dicho. Las listas añaden o quitan; los escalares sustituyen. */
export const DnaPatch = z.object({
  ticket_min: z.number().optional(),
  ticket_max: z.number().optional(),
  industries_add: z.array(z.string()).default([]),
  industries_remove: z.array(z.string()).default([]),
  exclusions_add: z.array(z.string()).default([]), // ideal_customer.exclusions (sectores o situaciones que no quiere)
  geography_add: z.array(z.string()).default([]),
  company_size_add: z.array(SizeBand).default([]),
  triggers_add: z.array(BusinessTrigger).default([]),
  capacity: z.enum(["OPEN", "LIMITED", "FULL"]).optional(),
  objective_quarterly: z.string().optional(),
});
export type DnaPatch = z.infer<typeof DnaPatch>;

export const IntentApunte = z.object({
  who: z.string().min(2),
  need: z.string().min(5),
  relation: z.enum(["CLIENT", "KNOWN", "HEARD"]).default("KNOWN"),
  expects_contact: z.boolean().default(false),
});
export type IntentApunte = z.infer<typeof IntentApunte>;

export const IntentProposal = z.object({
  kind: IntentKind,
  /** Una frase en segunda persona: "He entendido que este trimestre quieres…". */
  summary: z.string(),
  /** Lo que ha entendido, línea a línea, para que el Timonel lo compruebe de un vistazo. */
  understood: z.array(z.string()).default([]),
  encargo: IntentEncargo.optional(),
  dna_patch: DnaPatch.optional(),
  apunte: IntentApunte.optional(),
  /** Solo con INSUFICIENTE: la pregunta que el Agente le hace al Timonel. */
  question: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type IntentProposal = z.infer<typeof IntentProposal>;

export const INTENT_KIND_LABEL: Record<IntentKind, string> = {
  ENCARGO: "Encargo",
  ADN: "Cambio en tu ADN",
  APUNTE: "Apunte",
  INSUFICIENTE: "Necesito un dato más",
};

export function patchIsEmpty(p: DnaPatch | undefined): boolean {
  if (!p) return true;
  return p.ticket_min === undefined && p.ticket_max === undefined && p.capacity === undefined && p.objective_quarterly === undefined && p.industries_add.length === 0 && p.industries_remove.length === 0 && p.exclusions_add.length === 0 && p.geography_add.length === 0 && p.company_size_add.length === 0 && p.triggers_add.length === 0;
}

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
const addAll = <T extends string>(base: T[], add: T[]) => uniq([...base, ...add]) as T[];
const lower = (s: string) => s.toLowerCase();

/** Aplica el parche sobre una copia del ADN. Función pura: el servicio decide si se persiste (siempre tras el toque). */
export function applyDnaPatch(dna: BusinessDNA, patch: DnaPatch): BusinessDNA {
  const next: BusinessDNA = structuredClone(dna);
  if (patch.ticket_min !== undefined) next.commercial.ticket_min = patch.ticket_min;
  if (patch.ticket_max !== undefined) next.commercial.ticket_max = patch.ticket_max;
  if (patch.capacity) next.offering.capacity = patch.capacity;
  if (patch.objective_quarterly) next.objectives.quarterly = patch.objective_quarterly;
  const removed = new Set(patch.industries_remove.map(lower));
  next.ideal_customer.industries = addAll(next.ideal_customer.industries.filter((i) => !removed.has(lower(i))), patch.industries_add);
  next.ideal_customer.exclusions = addAll(next.ideal_customer.exclusions, [...patch.exclusions_add, ...patch.industries_remove]);
  next.ideal_customer.geography = addAll(next.ideal_customer.geography, patch.geography_add);
  next.ideal_customer.company_size = addAll(next.ideal_customer.company_size, patch.company_size_add);
  next.ideal_customer.triggers = addAll(next.ideal_customer.triggers, patch.triggers_add);
  return BusinessDNA.parse(next);
}

/** Describe el parche en frases cortas para la tarjeta de confirmación. */
export function describePatch(p: DnaPatch, triggerLabel: (t: string) => string = (t) => t): string[] {
  const out: string[] = [];
  const eur = (n: number) => `${n.toLocaleString("es-ES")} €`;
  if (p.ticket_min !== undefined && p.ticket_max !== undefined) out.push(`Ticket entre ${eur(p.ticket_min)} y ${eur(p.ticket_max)}.`);
  else if (p.ticket_min !== undefined) out.push(`Ticket mínimo: ${eur(p.ticket_min)}. Lo que esté por debajo se descarta en la puerta dura.`);
  else if (p.ticket_max !== undefined) out.push(`Ticket máximo habitual: ${eur(p.ticket_max)}.`);
  if (p.industries_add.length) out.push(`Sectores que añades: ${p.industries_add.join(", ")}.`);
  if (p.industries_remove.length) out.push(`Sectores que dejas de buscar: ${p.industries_remove.join(", ")}.`);
  if (p.exclusions_add.length) out.push(`No quieres recibir: ${p.exclusions_add.join(", ")}.`);
  if (p.geography_add.length) out.push(`Zonas que añades: ${p.geography_add.join(", ")}.`);
  if (p.company_size_add.length) out.push(`Tamaño de cliente: ${p.company_size_add.join(" / ")} empleados.`);
  if (p.triggers_add.length) out.push(`Señales que te interesan: ${p.triggers_add.map(triggerLabel).join(", ")}.`);
  if (p.capacity) out.push(`Capacidad ahora: ${{ OPEN: "abierta", LIMITED: "limitada", FULL: "completa" }[p.capacity]}.`);
  if (p.objective_quarterly) out.push(`Objetivo del trimestre: ${p.objective_quarterly}`);
  return out;
}
