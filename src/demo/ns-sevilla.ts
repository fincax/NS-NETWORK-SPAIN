/**
 * Datos demo · NS Sevilla · Círculo 01.
 * Persona: Carlos, CEO de Reformas Industriales Híspalis.
 * Escenario A de NS-ARP §14: un cliente de Correduría Guadalquivir abre planta
 * en Dos Hermanas; Híspalis alcanza 0.91.
 * Nunca "Empresa A" ni lorem ipsum (CLAUDE.md · A.7).
 */
import type { Circle, MemberContext, ReferralSummary, TodayDigest } from "@/domain/types";

export const CIRCLE_01: Circle = {
  city: "Sevilla",
  number: 1,
  seats: { total: 30, occupied: 30 },
  activeSignals: 3,
};

export const CARLOS: MemberContext = {
  firstName: "Carlos",
  company: { id: "co_hispalis", shortName: "Híspalis" },
  circle: CIRCLE_01,
  agentLive: true,
};

/** Ayer a las 19:40 (hora de Sevilla) respecto a `now`. */
export function yesterdayAt(now: Date, hour: number, minute: number): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "01";
  // Offset fijo de verano/invierno no importa para la demo: se formatea de vuelta en Europe/Madrid.
  const local = new Date(`${get("year")}-${get("month")}-${get("day")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+02:00`);
  return local;
}

export function digestScenarioA(now: Date): TodayDigest {
  return {
    since: yesterdayAt(now, 19, 40),
    conversations: 12,
    signals: 3,
    matches: 2,
    referralsPending: 1,
    valuePotential: { min: 42_000, max: 67_000, currency: "EUR" },
  };
}

export const REFERRAL_DOS_HERMANAS: ReferralSummary = {
  id: "ref_a_dos_hermanas",
  state: "MEMBER_REVIEW",
  pending: "RECEIVER_PENDING",
  title: "Nueva planta industrial en Dos Hermanas",
  matchScore: 0.91,
  confidence: "HIGH",
  origin: "miembro de confianza, relación directa con Dirección",
  trigger: "apertura de planta + crecimiento de plantilla",
  valuePotential: { min: 18_000, max: 30_000, currency: "EUR" },
  timing: { min: 30, max: 60 },
  explanation: {
    why: [
      "El trigger “nueva planta” está en tu lista de señales prioritarias.",
      "Empresa industrial de 51–200 empleados: tu ICP exacto.",
      "Dos Hermanas, dentro de tu zona de servicio.",
    ],
    unknowns: ["Presupuesto aprobado: sin confirmar."],
    nextAction: "Revisar referido",
  },
  sharedWithThirdParties: false,
};

/** Estado sin referidos: cero rojo en pantalla. */
export function digestQuietNight(now: Date): TodayDigest {
  return {
    since: yesterdayAt(now, 21, 5),
    conversations: 7,
    signals: 1,
    matches: 0,
    referralsPending: 0,
    valuePotential: null,
  };
}
