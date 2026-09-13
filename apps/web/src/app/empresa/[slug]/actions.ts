"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { closeDemand, createDemand } from "@/services/demands";
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
