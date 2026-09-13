/** GET /api/pending · lo que espera el toque del Timonel activo (D-039). Alimenta el número del icono. */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/db/client";
import { DEMO_COOKIE, isValidSession } from "@/lib/auth";
import { currentMember } from "@/lib/session";
import { pendingDecisions } from "@/services/today";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  if (!(await isValidSession(jar.get(DEMO_COOKIE)?.value))) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  const ctx = await currentMember();
  if (!ctx) return NextResponse.json({ total: 0, referrals: 0, apuntes: 0, candidacies: 0 });
  const db = await getDb();
  const p = await pendingDecisions(db, ctx.chapter.id, ctx.company.id, ctx.member);
  return NextResponse.json(p, { headers: { "cache-control": "no-store" } });
}
