"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { approveCommunique, ComunicadoError } from "@/services/comunicado";
import { CapacityNow } from "@/core/comunicado";

/** El Timonel aprueba su Comunicado de la semana (un toque). Puede añadir una novedad, un Sondeo y ajustar su capacidad. */
export async function approveCommuniqueAction(formData: FormData) {
  const { member, company, chapter } = await requireMember();
  const db = await getDb();
  const capacityRaw = String(formData.get("capacity") ?? "");
  const capacity = CapacityNow.safeParse(capacityRaw);
  const back = String(formData.get("back") ?? "/comunicado");
  try {
    await approveCommunique(db, { chapterId: chapter.id, companyId: company.id, memberId: member.id, note: String(formData.get("note") ?? ""), ask: String(formData.get("ask") ?? ""), capacity: capacity.success ? capacity.data : undefined });
  } catch (e) {
    const msg = e instanceof ComunicadoError ? e.message : "No se pudo aprobar el Comunicado.";
    redirect(`/comunicado?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/comunicado");
  revalidatePath("/hoy");
  revalidatePath("/sala");
  revalidatePath("/gaceta");
  revalidatePath("/mesa");
  redirect(back === "/hoy" ? "/hoy" : "/comunicado?ok=1");
}
