export type GreetingKind = "morning" | "afternoon" | "night";

export const GREETING_TEXT: Record<GreetingKind, string> = {
  morning: "Buenos días",
  afternoon: "Buenas tardes",
  night: "Buenas noches",
};

/** Hora local (0–23) de `date` en la zona horaria dada. */
export function localHour(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("es-ES", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === "hour")?.value;
  return Number(hour ?? 0);
}

/** <13 Buenos días · <21 Buenas tardes · si no, Buenas noches. */
export function greetingKindForHour(hour: number): GreetingKind {
  if (hour < 13) return "morning";
  if (hour < 21) return "afternoon";
  return "night";
}

export function greetingFor(date: Date, timeZone = "Europe/Madrid"): string {
  return GREETING_TEXT[greetingKindForHour(localHour(date, timeZone))];
}
