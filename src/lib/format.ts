import type { DayRange, MoneyRange } from "@/domain/types";

const EN_DASH = "–";

/** €42.000 · separador de miles español, símbolo delante (tratamiento tipográfico NS). */
export function formatEuro(amount: number): string {
  return `€${Math.round(amount).toLocaleString("es-ES")}`;
}

/** €18K para miles exactos; si no es múltiplo de mil, cae a formatEuro. */
export function formatEuroCompact(amount: number): string {
  if (amount >= 1_000_000 && amount % 100_000 === 0) {
    const m = amount / 1_000_000;
    return `€${m.toLocaleString("es-ES", { maximumFractionDigits: 1 })}M`;
  }
  if (amount >= 1000 && amount % 1000 === 0) return `€${amount / 1000}K`;
  return formatEuro(amount);
}

export function formatEuroRange(range: MoneyRange, style: "full" | "compact" = "full"): string {
  const f = style === "compact" ? formatEuroCompact : formatEuro;
  return `${f(range.min)} ${EN_DASH} ${f(range.max)}`;
}

/** "30–60 días" */
export function formatDayRange(range: DayRange): string {
  return `${range.min}${EN_DASH}${range.max} días`;
}

/** 0.91 → "91%" */
export function formatPercent(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** "ayer 19:40" · "hoy 08:15" · "mar 9 sept, 19:40" */
export function formatSince(since: Date, now: Date, timeZone = "Europe/Madrid"): string {
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const time = new Intl.DateTimeFormat("es-ES", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(since);
  const today = day(now);
  const yesterday = day(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const sinceDay = day(since);
  if (sinceDay === today) return `hoy ${time}`;
  if (sinceDay === yesterday) return `ayer ${time}`;
  const date = new Intl.DateTimeFormat("es-ES", { timeZone, weekday: "short", day: "numeric", month: "short" }).format(since);
  return `${date}, ${time}`;
}

export const CONFIDENCE_LABEL = {
  HIGH: "Confianza alta",
  MEDIUM: "Confianza media",
  LOW: "Confianza baja",
} as const;

/** "Círculo 01" */
export function formatCircle(number: number): string {
  return `Círculo ${String(number).padStart(2, "0")}`;
}
