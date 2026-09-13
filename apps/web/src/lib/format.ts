export const eur = (n: number | null | undefined) => (n === null || n === undefined ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n));
export const eurRange = (min?: number | null, max?: number | null) => (min === undefined || max === undefined || min === null || max === null || (min === 0 && max === 0) ? "por confirmar" : `${eur(min)} – ${eur(max)}`);
export const pct = (x: number) => `${Math.round(x * 100)} %`;
export const time = (d: Date) => new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(d);
export const dateTime = (d: Date) => new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
export const greeting = () => {
  const h = new Date().getHours();
  return h < 13 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches";
};
export const firstName = (full: string) => full.split(" ")[0];
export const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
export const daysUntil = (d: Date | null | undefined) => (d ? Math.max(0, Math.round((d.getTime() - Date.now()) / 86_400_000)) : null);
