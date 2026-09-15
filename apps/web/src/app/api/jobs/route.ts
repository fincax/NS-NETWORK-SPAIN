/**
 * GET /api/jobs · drena la cola de la Mesa (D-053). Lo llama el alojamiento con frecuencia (vercel.json → crons)
 * o un proceso externo. Misma protección que /api/clock: CRON_SECRET como Bearer; sin secreto, solo fuera de producción.
 */
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { runJobs } from "@/services/jobs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV === "production") return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  if (secret && (req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = await getDb();
  return NextResponse.json(await runJobs(db, { max: 25 }));
}
