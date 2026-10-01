/**
 * Protocolo II · Dar a Conocer · NS-ADP v0.1 (D-018, construido en D-069). Funciones puras.
 *
 *  - El Comunicado tiene dos partes: lo estable (qué es la empresa, derivado del ADN en sus capas PUBLIC y CHAPTER)
 *    y el delta (qué ha cambiado esta semana). Cada afirmación del delta lleva origen: declarada por el Timonel,
 *    inferida de un cambio del ADN o verificada por el sistema (Cesión contrastada, actividad en la Sala).
 *  - El Agente lo compone sin modelo: todo lo que dice sale del ADN o de hechos registrados. Nada inventado (D-045).
 *  - La semana cierra el domingo a las 20:00 (hora de Madrid, PROPOSED): lo no aprobado sale como Comunicado de
 *    continuidad (solo lo estable ya validado) y la Gaceta se publica para que esté lista el lunes a primera hora.
 *  - Continuidad: cumple, pero dos seguidos generan aviso del Agente y tres, aviso de la Directiva (tope: dos, PROPOSED).
 */
import { z } from "zod";
import type { BusinessDNA } from "./types";
import { addWeeks } from "./compromiso";

export const ADP_VERSION = "ADP-0.1";

export const COMUNICADO = {
  tz: "Europe/Madrid",
  closeHourLocal: 20, // domingo 20:00
  continuityNoticeStreak: 2, // aviso diplomático del Agente
  continuityDirectorStreak: 3, // aviso formal de la Directiva
  continuityCap: 2, // a partir del tercero seguido, la semana no cuenta como cumplida
  meritApproved: 5,
  meritMissed: -5,
  maxRelevant: 5,
  maxHighlights: 12,
} as const;

export const CapacityNow = z.enum(["ALTA", "MEDIA", "BAJA"]);
export type CapacityNow = z.infer<typeof CapacityNow>;

export const CAPACITY_FROM_DNA: Record<BusinessDNA["offering"]["capacity"], CapacityNow> = { OPEN: "ALTA", LIMITED: "MEDIA", FULL: "BAJA" };
export const CAPACITY_TO_DNA: Record<CapacityNow, BusinessDNA["offering"]["capacity"]> = { ALTA: "OPEN", MEDIA: "LIMITED", BAJA: "FULL" };

export const CommuniqueStable = z.object({
  specialty: z.string(),
  specialty_code: z.string(),
  description: z.string(),
  offering: z.array(z.string()),
  not_offering: z.array(z.string()),
  industries: z.array(z.string()),
  geography: z.array(z.string()),
  triggers: z.array(z.string()),
  ideal_customer: z.string(),
  perfect_referral: z.string(),
  certifications: z.array(z.string()),
  locations: z.array(z.string()),
  capacity_now: CapacityNow,
});
export type CommuniqueStable = z.infer<typeof CommuniqueStable>;

export const DeltaKind = z.enum(["NEW_SERVICE", "REMOVED_SERVICE", "CAPACITY", "CERTIFICATION", "LOCATION", "ICP", "CASE_WON", "ACTIVITY", "NOTE"]);
export type DeltaKind = z.infer<typeof DeltaKind>;

export const DeltaSource = z.enum(["DECLARED_BY_MEMBER", "INFERRED_FROM_DNA", "VERIFIED"]);
export type DeltaSource = z.infer<typeof DeltaSource>;

export const CommuniqueDelta = z.object({ kind: DeltaKind, text: z.string(), source: DeltaSource });
export type CommuniqueDelta = z.infer<typeof CommuniqueDelta>;

export const CommuniqueEncargo = z.object({ id: z.string(), summary: z.string(), trigger: z.string().optional() });
export type CommuniqueEncargo = z.infer<typeof CommuniqueEncargo>;

export type CommuniqueStatus = "DRAFT" | "APPROVED" | "CONTINUITY";

export const STATUS_LABEL: Record<CommuniqueStatus, string> = { DRAFT: "Borrador · esperando tu toque", APPROVED: "Aprobado", CONTINUITY: "De continuidad · sin revisar" };

export const DELTA_LABEL: Record<DeltaKind, string> = {
  NEW_SERVICE: "Nuevo servicio",
  REMOVED_SERVICE: "Deja de ofrecer",
  CAPACITY: "Capacidad",
  CERTIFICATION: "Certificación",
  LOCATION: "Sede",
  ICP: "Cliente ideal",
  CASE_WON: "Cierre contrastado",
  ACTIVITY: "Actividad",
  NOTE: "Novedad",
};

export const SOURCE_LABEL: Record<DeltaSource, string> = { DECLARED_BY_MEMBER: "declarado por el Timonel", INFERRED_FROM_DNA: "cambio en el ADN", VERIFIED: "verificado" };

/** Gaceta semanal de la Sala (Chapter Intelligence Agent). Solo agregados y hechos de Comunicados aprobados o de continuidad. */
export const GazetteHighlight = z.object({ company_id: z.string(), company_name: z.string(), kind: DeltaKind, text: z.string(), source: DeltaSource });
export const ChapterGazette = z.object({
  week: z.string(), // "2026-W40"
  week_start: z.string(),
  members: z.number(),
  communiques: z.object({ approved: z.number(), continuity: z.number(), missing: z.number() }),
  new_services: z.number(),
  capacity_changes: z.number(),
  verified_closes: z.object({ count: z.number(), value: z.number() }),
  open_encargos: z.number(),
  unchanged: z.number(),
  vacancies_claimed: z.number(),
  mutual_knowledge: z.number().nullable(),
  highlights: z.array(GazetteHighlight),
  protocol_version: z.string(),
});
export type ChapterGazette = z.infer<typeof ChapterGazette>;

const PRIVATE_MARKERS = /confidencial|margen|precio|tarifa|cliente:|clientes:/i;

/** Lo estable, desde el ADN: solo lo que la empresa dice de sí misma para la Sala. Nunca knowledge.* por debajo de CHAPTER. */
export function buildStable(dna: BusinessDNA, specialty: { name: string; code: string }): CommuniqueStable {
  const ic = dna.ideal_customer;
  const sizes = ic.company_size.length ? ` de ${ic.company_size.join(" / ")} empleados` : "";
  const where = ic.geography.length ? ` en ${ic.geography.slice(0, 4).join(", ")}` : "";
  const roles = ic.roles.length ? `; decide ${ic.roles.slice(0, 3).join(", ")}` : "";
  const idealCustomer = ic.industries.length ? `${ic.industries.join(", ")}${sizes}${where}${roles}.` : `Sin cliente ideal declarado${where}.`;
  return {
    specialty: specialty.name,
    specialty_code: specialty.code,
    description: dna.company.description,
    offering: dna.offering.services.filter((s) => !PRIVATE_MARKERS.test(s)),
    not_offering: dna.offering.exclusions,
    industries: ic.industries,
    geography: ic.geography,
    triggers: ic.triggers,
    ideal_customer: idealCustomer,
    perfect_referral: dna.referrals.perfect_referral,
    certifications: dna.company.certifications,
    locations: dna.company.locations,
    capacity_now: CAPACITY_FROM_DNA[dna.offering.capacity],
  };
}

const diffList = (a: string[], b: string[]) => b.filter((x) => !a.includes(x));

/** Delta inferido del ADN: lo que cambió respecto al último Comunicado publicado. Sin anterior, no hay delta: todo es estable. */
export function diffStable(prev: CommuniqueStable | null, next: CommuniqueStable): CommuniqueDelta[] {
  if (!prev) return [];
  const out: CommuniqueDelta[] = [];
  for (const s of diffList(prev.offering, next.offering)) out.push({ kind: "NEW_SERVICE", text: s, source: "INFERRED_FROM_DNA" });
  for (const s of diffList(next.offering, prev.offering)) out.push({ kind: "REMOVED_SERVICE", text: s, source: "INFERRED_FROM_DNA" });
  if (prev.capacity_now !== next.capacity_now) out.push({ kind: "CAPACITY", text: `Capacidad ${next.capacity_now} (antes ${prev.capacity_now})`, source: "INFERRED_FROM_DNA" });
  for (const c of diffList(prev.certifications, next.certifications)) out.push({ kind: "CERTIFICATION", text: c, source: "INFERRED_FROM_DNA" });
  for (const l of diffList(prev.locations, next.locations)) out.push({ kind: "LOCATION", text: `Nueva sede: ${l}`, source: "INFERRED_FROM_DNA" });
  const newIndustries = diffList(prev.industries, next.industries);
  if (newIndustries.length) out.push({ kind: "ICP", text: `Nuevos sectores de cliente: ${newIndustries.join(", ")}`, source: "INFERRED_FROM_DNA" });
  return out;
}

export type ContinuityAction = "NONE" | "AGENT_NOTICE" | "DIRECTOR_NOTICE";

/** Qué toca tras N Comunicados de continuidad seguidos (incluido el de esta semana). */
export function continuityAction(streak: number): ContinuityAction {
  if (streak >= COMUNICADO.continuityDirectorStreak) return "DIRECTOR_NOTICE";
  if (streak === COMUNICADO.continuityNoticeStreak) return "AGENT_NOTICE";
  return "NONE";
}

/** Un Comunicado de continuidad cumple la semana mientras no supere el tope de seguidos. */
export function continuityCounts(streak: number): boolean {
  return streak <= COMUNICADO.continuityCap;
}

// ───────────── Calendario ─────────────

function tzOffsetMinutes(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** Instante de cierre de la semana que empieza en `weekStart` (lunes 00:00 UTC): domingo a las 20:00 de Madrid. */
export function weekCloseAt(weekStart: Date): Date {
  const sunday = new Date(weekStart.getTime() + 6 * 86_400_000);
  const guess = Date.UTC(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), COMUNICADO.closeHourLocal);
  const offset = tzOffsetMinutes(new Date(guess), COMUNICADO.tz);
  return new Date(guess - offset * 60_000);
}

/** La semana está cerrada (ya pasó su domingo a las 20:00) en el instante `now`. */
export function weekIsClosed(weekStart: Date, now: Date): boolean {
  return now.getTime() >= weekCloseAt(weekStart).getTime();
}

/** Etiqueta ISO de la semana ("2026-W40") a partir de su lunes. */
export function isoWeekLabel(weekStart: Date): string {
  const thursday = new Date(weekStart.getTime() + 3 * 86_400_000);
  const year = thursday.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Dow = (jan4.getUTCDay() + 6) % 7;
  const week1Monday = new Date(jan4.getTime() - jan4Dow * 86_400_000);
  const week = Math.floor((weekStart.getTime() - week1Monday.getTime()) / (7 * 86_400_000)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function weekRangeLabel(weekStart: Date): string {
  const f = (d: Date) => new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
  return `${f(weekStart)} – ${f(new Date(addWeeks(weekStart, 1).getTime() - 86_400_000))}`;
}

// ───────────── Relevante para ti ─────────────

export interface RelevanceCommunique {
  company_id: string;
  company_name: string;
  stable: CommuniqueStable;
  delta: CommuniqueDelta[];
  encargos: CommuniqueEncargo[];
}

export interface RelevanceViewer {
  company_id: string;
  dna: BusinessDNA;
  /** Cesiones que el lector ha cedido a cada empresa (histórico) y las contrastadas esta semana. */
  given_to: Record<string, { count: number; verified_this_week: number }>;
}

export interface RelevantItem {
  company_id: string;
  company_name: string;
  text: string;
  why: string;
  weight: number;
}

const human = (t: string) => t.toLowerCase().replaceAll("_", " ");

/**
 * Lo que de la Gaceta importa a un Timonel concreto. Reglas explícitas con evidencia, nunca "podría interesarte":
 *  - un Encargo de otra empresa que coincide con las señales o los sectores de tus clientes;
 *  - un servicio nuevo o una certificación de una empresa que sirve a tus mismos sectores;
 *  - la capacidad de una empresa a la que ya has cedido;
 *  - un cierre contrastado de una Cesión tuya.
 */
export function relevantFor(viewer: RelevanceViewer, communiques: RelevanceCommunique[]): RelevantItem[] {
  const myIndustries = new Set(viewer.dna.ideal_customer.industries.map((s) => s.toLowerCase()));
  const myTriggers = new Set(viewer.dna.ideal_customer.triggers);
  const items: RelevantItem[] = [];
  for (const c of communiques) {
    if (c.company_id === viewer.company_id) continue;
    const shared = c.stable.industries.filter((i) => myIndustries.has(i.toLowerCase()));
    const given = viewer.given_to[c.company_id];
    if (given?.verified_this_week) items.push({ company_id: c.company_id, company_name: c.company_name, text: `${c.company_name} ha contrastado ${given.verified_this_week === 1 ? "una Cesión tuya" : `${given.verified_this_week} Cesiones tuyas`} esta semana.`, why: "Tu Mérito de Cierre ya consta en tu Hoja de Méritos.", weight: 4 });
    for (const e of c.encargos) {
      const byTrigger = e.trigger && myTriggers.has(e.trigger);
      if (byTrigger || shared.length) items.push({ company_id: c.company_id, company_name: c.company_name, text: `Encargo abierto de ${c.company_name}: «${e.summary}».`, why: byTrigger ? `Tus clientes viven la señal "${human(e.trigger!)}": tu Agente la busca para ellos.` : `Sirves a los mismos sectores (${shared.slice(0, 2).join(", ")}).`, weight: 3 });
    }
    for (const d of c.delta) {
      if (d.kind === "NEW_SERVICE" || d.kind === "CERTIFICATION") {
        if (shared.length) items.push({ company_id: c.company_id, company_name: c.company_name, text: `${c.company_name} ahora ${d.kind === "NEW_SERVICE" ? "lleva" : "acredita"} «${d.text}».`, why: `Encaja con tus clientes de ${shared.slice(0, 2).join(" y ")}.`, weight: 2 });
      } else if (d.kind === "CAPACITY") {
        if (given?.count) items.push({ company_id: c.company_id, company_name: c.company_name, text: `${c.company_name}: ${d.text.toLowerCase()}.`, why: `Le has cedido ${given.count} ${given.count === 1 ? "Cesión" : "Cesiones"}: cuenta con ello antes de la próxima.`, weight: 2 });
        else if (shared.length) items.push({ company_id: c.company_id, company_name: c.company_name, text: `${c.company_name}: ${d.text.toLowerCase()}.`, why: `Sirve a tus mismos sectores (${shared[0]}).`, weight: 1 });
      } else if (d.kind === "NOTE" && (shared.length || given?.count)) {
        items.push({ company_id: c.company_id, company_name: c.company_name, text: `${c.company_name}: ${d.text}`, why: given?.count ? "Ya habéis trabajado juntos." : `Sirve a tus mismos sectores (${shared[0]}).`, weight: 1 });
      }
    }
  }
  return items.sort((a, b) => b.weight - a.weight || a.company_name.localeCompare(b.company_name)).slice(0, COMUNICADO.maxRelevant);
}
