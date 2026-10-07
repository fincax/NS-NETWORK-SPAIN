/**
 * Plazas de una Sala (D-080): plazas base al fundar y plazas por demanda cuando la Sala las necesita.
 * Toda apertura queda en la auditoría: una plaza nueva es una señal de captación para la Antesala.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { isBaseSeat } from "@/db/nscat";

/** Crea la fila de plaza vacante de cada especialidad base que aún no la tenga en la Sala. Idempotente. Devuelve los códigos abiertos. */
export async function ensureBaseSeats(db: Db, chapterId: string): Promise<string[]> {
  const specialties = await db.query.specialties.findMany();
  const existing = new Set((await db.query.categorySeats.findMany({ where: eq(schema.categorySeats.chapterId, chapterId), columns: { specialtyId: true } })).map((s) => s.specialtyId));
  const opened: string[] = [];
  for (const sp of specialties) {
    if (!isBaseSeat(sp.nscatCode) || existing.has(sp.id)) continue;
    await db.insert(schema.categorySeats).values({ chapterId, specialtyId: sp.id, status: "VACANT" });
    opened.push(sp.nscatCode);
  }
  return opened;
}

export interface OpenSeatInput {
  chapterId: string;
  specialtyId: string;
  /** Qué la abre, en lenguaje de la Sala: "una necesidad detectada por la Mesa" o "la candidatura de X". */
  reason: string;
  actor: { type: "AGENT" | "USER" | "SYSTEM"; id: string };
}

/**
 * Abre una plaza por demanda (D-080): si la especialidad existe en NS-CAT y la Sala aún no tiene su fila de plaza, la crea
 * vacante y lo audita. Idempotente: si la plaza ya existe, no hace nada.
 */
export async function openSeatOnDemand(db: Db, input: OpenSeatInput): Promise<{ opened: boolean; seatId: string; specialtyName: string }> {
  const sp = await db.query.specialties.findFirst({ where: eq(schema.specialties.id, input.specialtyId) });
  if (!sp) throw new Error("Especialidad no encontrada en NS-CAT");
  const existing = await db.query.categorySeats.findFirst({ where: and(eq(schema.categorySeats.chapterId, input.chapterId), eq(schema.categorySeats.specialtyId, sp.id)) });
  if (existing) return { opened: false, seatId: existing.id, specialtyName: sp.name };
  const [seat] = await db.insert(schema.categorySeats).values({ chapterId: input.chapterId, specialtyId: sp.id, status: "VACANT" }).returning();
  await audit(db, {
    chapterId: input.chapterId,
    kind: "SEAT_OPENED_ON_DEMAND",
    actor: input.actor,
    subject: { type: "CategorySeat", id: seat.id },
    policyApplied: "seat.on_demand",
    result: `Plaza de ${sp.name} abierta por demanda en la Sala (D-080): ${input.reason}. La Antesala la busca desde ahora.`,
    significant: true,
  });
  return { opened: true, seatId: seat.id, specialtyName: sp.name };
}
