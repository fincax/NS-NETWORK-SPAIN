/**
 * Protocolo II · Dar a Conocer (NS-ADP, D-018, D-070): reglas puras del Comunicado y de la Gaceta.
 * Semana ISO con lunes 00:00 UTC (como el Compromiso). Cierre semanal: viernes a las 14:00 de Madrid; después, la Gaceta.
 */
import type { BusinessDNA, ComunicadoDelta, ComunicadoStable } from "./types";
import { weekStart } from "./compromiso";

export const PROTOCOLO_II = {
  /** Día (1 = lunes … 5 = viernes) y hora de Madrid del cierre semanal. Propuesta inicial; configurable por Sala más adelante. */
  closeWeekday: 5,
  closeHour: 14,
  /** Comunicados de continuidad seguidos que generan aviso del Agente y de la Directiva (docs/14 §7). */
  continuityAgentNotice: 2,
  continuityDirectorNotice: 3,
} as const;

const TZ = "Europe/Madrid";

function madridParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, weekday: "short", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[get("weekday")] ?? 1;
  return { weekday, hour: Number(get("hour")) };
}

/** La semana en curso ya cerró (viernes 14:00 de Madrid o después): se publica lo pendiente como continuidad y sale la Gaceta. */
export function weekClosed(now: Date): boolean {
  const { weekday, hour } = madridParts(now);
  return weekday > PROTOCOLO_II.closeWeekday || (weekday === PROTOCOLO_II.closeWeekday && hour >= PROTOCOLO_II.closeHour);
}

/** Etiqueta "2026-W40" de la semana de una fecha. */
export function weekLabel(date: Date): string {
  const start = weekStart(date);
  const thursday = new Date(start.getTime() + 3 * 86_400_000);
  const jan1 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - jan1.getTime()) / 86_400_000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const CAPACITY_LABEL: Record<BusinessDNA["offering"]["capacity"], ComunicadoStable["capacity_now"]> = { OPEN: "ALTA", LIMITED: "MEDIA", FULL: "BAJA" };

/** La parte estable del Comunicado sale del ADN: solo lo que la empresa puede decir a toda la Sala. */
export function stableFromDna(dna: BusinessDNA, specialty: string): ComunicadoStable {
  const ic = dna.ideal_customer;
  const who = [ic.industries.join(", "), ic.company_size.length ? `${ic.company_size.join("/")} empleados` : "", ic.geography.join(", ")].filter(Boolean).join(" · ");
  return {
    specialty,
    offering: [...dna.offering.services, ...dna.offering.products].slice(0, 8),
    not_offering: dna.offering.exclusions.slice(0, 5),
    ideal_customer: who || "sin perfil declarado",
    perfect_referral: dna.referrals.perfect_referral || "",
    capacity_now: CAPACITY_LABEL[dna.offering.capacity],
  };
}

/** Texto del Comunicado tal como lo lee un Timonel: concreto, corto, sin adjetivos. */
export function renderComunicado(c: { stable: ComunicadoStable; delta: ComunicadoDelta[]; encargos: string[]; note?: string | null }, companyName: string): string {
  const lines: string[] = [];
  lines.push(`${companyName} · ${c.stable.specialty} · capacidad ${c.stable.capacity_now}`);
  lines.push(`Hace: ${c.stable.offering.join(", ") || "—"}.${c.stable.not_offering.length ? ` No hace: ${c.stable.not_offering.join(", ")}.` : ""}`);
  lines.push(`Para: ${c.stable.ideal_customer}.`);
  if (c.stable.perfect_referral) lines.push(`Cesión perfecta: ${c.stable.perfect_referral}`);
  if (c.delta.length) lines.push(`Esta semana: ${c.delta.map((d) => d.text).join(" · ")}`);
  if (c.encargos.length) lines.push(`Busca ahora: ${c.encargos.join(" · ")}`);
  if (c.note) lines.push(`Añade su Timonel: ${c.note}`);
  return lines.join("\n");
}

/** Relevancia de un Comunicado para un Timonel (Gaceta "relevante para ti"): novedades y afinidad de clientela. */
export function relevanceFor(c: { stable: ComunicadoStable; delta: ComunicadoDelta[]; encargos: string[] }, mine: BusinessDNA): { score: number; why: string | null } {
  let score = 0;
  let why: string | null = null;
  const myIndustries = mine.ideal_customer.industries.map((s) => s.toLowerCase());
  const shared = myIndustries.filter((i) => c.stable.ideal_customer.toLowerCase().includes(i));
  if (shared.length) { score += 2; why = `Sirve a los mismos clientes que tú (${shared.join(", ")}).`; }
  if (c.delta.some((d) => d.kind === "CAPACITY")) { score += 1; why ??= "Cambio de capacidad: afecta a lo que puedes cederle."; }
  if (c.delta.some((d) => d.kind === "NEW_SERVICE" || d.kind === "NOTE")) { score += 2; why = c.delta.find((d) => d.kind === "NEW_SERVICE" || d.kind === "NOTE")!.text; }
  if (c.encargos.length) { score += 1; why ??= `Busca: ${c.encargos[0]}`; }
  if (c.delta.some((d) => d.kind === "CASE_WON")) { score += 1; why ??= c.delta.find((d) => d.kind === "CASE_WON")!.text; }
  return { score, why };
}
