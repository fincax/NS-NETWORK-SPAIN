"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { closeDemand, createDemand } from "@/services/demands";
import { addSource, removeSource, runOwnSources, SourceError } from "@/services/sources";
import { addSeat } from "@/services/onboarding";
import { redirect } from "next/navigation";
import type { BusinessTrigger } from "@/core/types";

export async function createDemandAction(formData: FormData) {
  const { member, company } = await requireMember();
  const db = await getDb();
  const trigger = String(formData.get("trigger") ?? "");
  await createDemand(db, { companyId: company.id, memberId: member.id, text: String(formData.get("text")), trigger: trigger ? (trigger as BusinessTrigger) : undefined, industry: String(formData.get("industry") ?? "").trim() || undefined });
  revalidatePath(`/empresa/${String(formData.get("slug"))}`);
  revalidatePath("/sala");
}

export async function closeDemandAction(formData: FormData) {
  const { company } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("id"));
  const d = await db.query.demands.findFirst({ where: (t, { eq }) => eq(t.id, id) });
  if (!d || d.companyId !== company.id) throw new Error("Solo el titular cierra su Encargo");
  await closeDemand(db, id);
  revalidatePath(`/empresa/${String(formData.get("slug"))}`);
  revalidatePath("/sala");
}

/** Fuentes propias del Agente (D-038). */
export async function addSourceAction(formData: FormData) {
  const { member, company } = await requireMember();
  const db = await getDb();
  const slug = String(formData.get("slug"));
  try {
    await addSource(db, { companyId: company.id, memberId: member.id, label: String(formData.get("label") ?? ""), url: String(formData.get("url") ?? "") });
  } catch (e) {
    const msg = e instanceof SourceError ? e.message : "No se pudo añadir la fuente.";
    redirect(`/empresa/${slug}?fuente=${encodeURIComponent(msg)}#fuentes`);
  }
  revalidatePath(`/empresa/${slug}`);
  redirect(`/empresa/${slug}#fuentes`);
}

export async function removeSourceAction(formData: FormData) {
  const { company } = await requireMember();
  const db = await getDb();
  await removeSource(db, company.id, String(formData.get("id")));
  revalidatePath(`/empresa/${String(formData.get("slug"))}`);
}

export async function runOwnSourcesAction(formData: FormData) {
  const { company } = await requireMember();
  const db = await getDb();
  await runOwnSources(db, company.id);
  revalidatePath(`/empresa/${String(formData.get("slug"))}`);
  revalidatePath("/hoy");
}

/** D-047: otra especialidad de la misma empresa en la misma Sala. */
export async function addSeatAction(formData: FormData) {
  const { member, company, chapter } = await requireMember();
  const db = await getDb();
  const slug = String(formData.get("slug") ?? company.slug);
  try {
    await addSeat(db, { chapterId: chapter.id, companyId: company.id, specialtyCode: String(formData.get("specialtyCode") ?? ""), memberId: member.id });
  } catch (e) {
    redirect(`/empresa/${slug}?error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo ocupar la plaza.")}`);
  }
  revalidatePath(`/empresa/${slug}`);
  revalidatePath("/sala");
  redirect(`/empresa/${slug}`);
}
