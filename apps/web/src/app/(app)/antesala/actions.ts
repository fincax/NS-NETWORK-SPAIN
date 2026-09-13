"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { updateCandidacy, CandidacyTransitionError, type CandidacyStatus } from "@/services/antesala";

const STATUSES: CandidacyStatus[] = ["NEW", "CONTACTED", "INTERVIEW", "APPROVED", "WAITLISTED", "DECLINED", "ACTIVATED"];

/** Un toque de la Directiva: cambio de estado, reclasificación o nota. */
export async function candidacyAction(formData: FormData) {
  const { member, chapter } = await requireMember();
  const db = await getDb();
  const candidacyId = String(formData.get("id") ?? "");
  const view = String(formData.get("view") ?? "pendientes");
  const status = String(formData.get("status") ?? "");
  const specialty = formData.get("specialtyCode");
  const notes = formData.get("notes");
  try {
    await updateCandidacy(db, {
      chapterId: chapter.id,
      candidacyId,
      memberId: member.id,
      status: STATUSES.includes(status as CandidacyStatus) ? (status as CandidacyStatus) : undefined,
      specialtyCode: specialty === null ? undefined : String(specialty) || null,
      notes: notes === null ? undefined : String(notes),
    });
  } catch (e) {
    const msg = e instanceof CandidacyTransitionError ? e.message : "No se pudo despachar la candidatura.";
    redirect(`/antesala?vista=${view}&error=${encodeURIComponent(msg)}#c-${candidacyId}`);
  }
  revalidatePath("/antesala");
  revalidatePath("/hoy");
  redirect(`/antesala?vista=${view}#c-${candidacyId}`);
}
