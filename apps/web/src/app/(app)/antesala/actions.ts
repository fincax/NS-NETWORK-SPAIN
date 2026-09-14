"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { updateCandidacy, CandidacyTransitionError, type CandidacyStatus } from "@/services/antesala";
import { activateFounding, FoundingError, joinFounding, startFounding } from "@/services/fundacion";
import { CompromisoError, confirmRelease, proposeRelease } from "@/services/compromiso";

const STATUSES: CandidacyStatus[] = ["NEW", "CONTACTED", "INTERVIEW", "APPROVED", "WAITLISTED", "FOUNDING", "DECLINED", "ACTIVATED"];

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

/** Fundación de Sala (D-041): promover, sumar y fundar. */
export async function foundingAction(formData: FormData) {
  const { member, chapter } = await requireMember();
  const db = await getDb();
  const op = String(formData.get("op") ?? "");
  const view = String(formData.get("view") ?? "espera");
  const candidacyId = String(formData.get("id") ?? "");
  try {
    if (op === "start") await startFounding(db, { zoneId: chapter.zoneId, candidacyId, memberId: member.id });
    else if (op === "join") await joinFounding(db, { foundingId: String(formData.get("foundingId")), candidacyId, memberId: member.id });
    else if (op === "activate") await activateFounding(db, { foundingId: String(formData.get("foundingId")), name: String(formData.get("name") ?? ""), memberId: member.id });
  } catch (e) {
    const msg = e instanceof FoundingError ? e.message : "No se pudo gestionar la fundación.";
    redirect(`/antesala?vista=${view}&error=${encodeURIComponent(msg)}#fundacion`);
  }
  revalidatePath("/antesala");
  revalidatePath("/hoy");
  redirect(`/antesala?vista=${view}#fundacion`);
}

/** Baja de titularidad por Compromiso (D-042, D-044): la Directiva la propone y NS la confirma; la plaza vuelve a la Antesala. */
export async function releaseAction(formData: FormData) {
  const { member, chapter } = await requireMember();
  const db = await getDb();
  const view = String(formData.get("view") ?? "pendientes");
  try {
    const input = { chapterId: chapter.id, companyId: String(formData.get("companyId") ?? ""), memberId: member.id };
    if (String(formData.get("op")) === "confirm") await confirmRelease(db, input);
    else await proposeRelease(db, input);
  } catch (e) {
    const msg = e instanceof CompromisoError ? e.message : "No se pudo gestionar la baja.";
    redirect(`/antesala?vista=${view}&error=${encodeURIComponent(msg)}#bajas`);
  }
  revalidatePath("/antesala");
  revalidatePath("/sala");
  revalidatePath("/hoy");
  redirect(`/antesala?vista=${view}`);
}
