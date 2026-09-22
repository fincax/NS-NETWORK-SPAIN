/**
 * GET /api/jobs · drena la cola de la Mesa (D-053). Lo llama el alojamiento con frecuencia (vercel.json → crons)
 * o un proceso externo. Misma protección que /api/clock: CRON_SECRET como Bearer; sin secreto, solo fuera de producción.
 */
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { runJobs } from "@/services/jobs";
import { runLatido } from "@/agents/latido";
import { repairStuckInfoRequests } from "@/services/referrals";
import { syncNscatSeats } from "@/db/seed";
import { eq } from "drizzle-orm";
import { schema } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  if (secret && (req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = await getDb();
  // Latido de la demo (D-057): un Indicio por franja y las Cesiones ficticias avanzan; apagado con cuentas reales.
  // Cesiones que quedaron en "Cualificada" con una pregunta sin dueño (antes de D-058): pasan al cedente.
  const repaired = await repairStuckInfoRequests(db);
  // Plazas nuevas de NS-CAT (D-059) en la Sala de demostración ya creada: llegan con la actualización, sin resembrar.
  const cumbre = await db.query.chapters.findFirst({ where: eq(schema.chapters.slug, "ns-cumbre") });
  const newSeats = cumbre ? await syncNscatSeats(db, cumbre.id) : [];
  const latido = await runLatido(db);
  const jobs = await runJobs(db, { max: 25 });
  return NextResponse.json({ ...jobs, latido, repaired: repaired.length, newSeats });
}
