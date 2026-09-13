"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { ApunteError, createApunte, type ApunteRelation } from "@/services/apunte";

const RELATIONS: ApunteRelation[] = ["CLIENT", "KNOWN", "HEARD"];

/** Guarda el Apunte en la memoria del Agente (Indicio en borrador) y vuelve con la confirmación. */
export async function apunteAction(formData: FormData) {
  const { member, company } = await requireMember();
  const db = await getDb();
  const relation = String(formData.get("relation") ?? "KNOWN");
  let id: string;
  try {
    const created = await createApunte(db, {
      companyId: company.id,
      memberId: member.id,
      who: String(formData.get("who") ?? ""),
      need: String(formData.get("need") ?? ""),
      contactName: String(formData.get("contactName") ?? ""),
      contactRole: String(formData.get("contactRole") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      relation: RELATIONS.includes(relation as ApunteRelation) ? (relation as ApunteRelation) : "KNOWN",
      expectsContact: formData.get("expectsContact") === "1",
    });
    id = created.opportunitySignal.id;
  } catch (e) {
    const msg = e instanceof ApunteError || e instanceof Error ? e.message : "No se pudo guardar el Apunte.";
    redirect(`/apunte?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/hoy");
  redirect(`/apunte?ok=${id}`);
}
