/**
 * GET /api/clock · lanza la Ronda (D-036): Reloj de la Sala + Rastreo para todas las Salas.
 * La llama el alojamiento cada mañana (vercel.json → crons). Protegida con CRON_SECRET (Vercel lo envía
 * como `Authorization: Bearer <secreto>`). Sin secreto configurado solo se permite fuera de producción.
 */
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";
import { runRonda } from "@/services/ronda";

export const dynamic = "force-dynamic";

function authorized(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return { ok: false, status: 503, error: "CRON_SECRET no configurado" };
    return { ok: true };
  }
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return { ok: true };
  return { ok: false, status: 401, error: "No autorizado" };
}

export async function GET(req: Request) {
  const auth = authorized(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const db = await getDb();
  const result = await runRonda(db);
  return NextResponse.json(result);
}
