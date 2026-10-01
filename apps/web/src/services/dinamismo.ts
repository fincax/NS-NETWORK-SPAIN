/**
 * Dinamismo visible (D-073, F9 y F10): el principio "nada espera a nadie" (D-066) se mide y se muestra.
 *
 *  - Del Apunte a la llamada: horas desde que el Timonel anotó el Indicio hasta que el cesionario marcó "He contactado".
 *  - Del Apunte a la Mesa: minutos desde que se anotó el Indicio hasta que la Mesa dejó la primera Cesión en la mesa
 *    de un cesionario. Objetivo interno: menos de diez minutos.
 * Siempre medias sobre hechos registrados, nunca un ranking de personas. Sin datos, no se muestra nada.
 */
import { and, eq, gte, isNotNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";

export const MESA_TARGET_MINUTES = 10;

export interface Tiempos {
  contact: { hours: number; n: number } | null;
  mesa: { minutes: number; n: number } | null;
}

/** Tiempos medios desde `since`, de una Sala o de toda la red (sin chapterId). */
export async function tiemposDinamismo(db: Db, opts: { chapterId?: string; since: Date }): Promise<Tiempos> {
  const scope = opts.chapterId ? eq(schema.referrals.chapterId, opts.chapterId) : undefined;
  const contacted = await db.query.referrals.findMany({ where: and(scope, isNotNull(schema.referrals.contactedAt), gte(schema.referrals.contactedAt, opts.since)), columns: { opportunitySignalId: true, contactedAt: true } });
  const created = await db.query.referrals.findMany({ where: and(scope, gte(schema.referrals.createdAt, opts.since)), columns: { opportunitySignalId: true, createdAt: true } });
  const signalIds = [...new Set([...contacted, ...created].map((r) => r.opportunitySignalId))];
  if (signalIds.length === 0) return { contact: null, mesa: null };
  const signals = await db.query.opportunitySignals.findMany({ where: (t, { inArray }) => inArray(t.id, signalIds), columns: { id: true, createdAt: true } });
  const signalAt = new Map(signals.map((s) => [s.id, s.createdAt.getTime()]));

  const contactHours = contacted.map((r) => (r.contactedAt!.getTime() - (signalAt.get(r.opportunitySignalId) ?? r.contactedAt!.getTime())) / 3_600_000).filter((h) => h >= 0);
  // Del Apunte a la Mesa: la primera Cesión de cada Indicio.
  const firstBySignal = new Map<string, number>();
  for (const r of created) {
    const t = r.createdAt.getTime();
    const prev = firstBySignal.get(r.opportunitySignalId);
    if (prev === undefined || t < prev) firstBySignal.set(r.opportunitySignalId, t);
  }
  const mesaMinutes = [...firstBySignal].map(([id, t]) => (t - (signalAt.get(id) ?? t)) / 60_000).filter((m) => m >= 0);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  return {
    contact: contactHours.length ? { hours: Math.round(avg(contactHours)), n: contactHours.length } : null,
    mesa: mesaMinutes.length ? { minutes: Math.round(avg(mesaMinutes) * 10) / 10, n: mesaMinutes.length } : null,
  };
}

export const monthAgo = () => new Date(Date.now() - 30 * 86_400_000);
