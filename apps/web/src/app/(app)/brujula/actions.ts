"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { dismissMove } from "@/services/brujula";

/** Descartar un Movimiento con motivo (D-072): entrena al Agente y no vuelve en catorce días. */
export async function dismissMoveAction(formData: FormData) {
  const { member, company, chapter } = await requireMember();
  const db = await getDb();
  try {
    await dismissMove(db, { chapterId: chapter.id, companyId: company.id, memberId: member.id, key: String(formData.get("key") ?? ""), reason: String(formData.get("reason") ?? "") });
  } catch (e) {
    redirect(`/brujula?error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo descartar.")}`);
  }
  revalidatePath("/brujula");
  revalidatePath("/hoy");
  redirect("/brujula");
}
