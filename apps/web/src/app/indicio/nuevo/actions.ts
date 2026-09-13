"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { createSignal, publishSignal, withdrawSignal } from "@/services/signals";
import type { LegalBasis, Visibility } from "@/core/types";

export async function createSignalAction(formData: FormData) {
  const { member, company } = await requireMember();
  const db = await getDb();
  const contactName = String(formData.get("contactName") ?? "").trim() || undefined;
  const created = await createSignal(db, {
    companyId: company.id,
    memberId: member.id,
    rawContent: String(formData.get("rawContent")),
    visibility: String(formData.get("visibility")) as Visibility,
    contactName,
    contactRole: String(formData.get("contactRole") ?? "").trim() || undefined,
    legalBasisForContact: contactName ? (String(formData.get("legalBasisForContact")) as LegalBasis) : undefined,
  });
  redirect(`/indicio/${created.opportunitySignal.id}`);
}

export async function publishSignalAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("id"));
  await publishSignal(db, id, member.id);
  revalidatePath("/", "layout");
  redirect("/mesa");
}

export async function withdrawSignalAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  await withdrawSignal(db, String(formData.get("id")), member.id);
  revalidatePath("/", "layout");
  redirect("/hoy");
}
