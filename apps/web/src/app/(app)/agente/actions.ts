"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { confirmIntent, dismissIntent, IntentError, proposeIntent } from "@/services/agente";

const fail = (e: unknown, fallback: string) => redirect(`/agente?error=${encodeURIComponent(e instanceof IntentError || e instanceof Error ? e.message : fallback)}`);

/** "Dile a tu Agente" (D-075): lo dicho se convierte en una propuesta. Nada cambia hasta confirmar. */
export async function decirAction(formData: FormData) {
  const { member, company } = await requireMember();
  const db = await getDb();
  let id: string;
  try {
    id = (await proposeIntent(db, { companyId: company.id, memberId: member.id, text: String(formData.get("texto") ?? "") })).id;
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    fail(e, "Tu Agente no ha podido leer eso.");
    return;
  }
  revalidatePath("/agente");
  redirect(`/agente?propuesta=${id}`);
}

/** Confirmar con un toque: cada parte pasa por el servicio que ya existe (Encargo, ADN como versión nueva, Apunte en borrador). */
export async function confirmarAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  let signalId: string | undefined;
  try {
    const { outcome } = await confirmIntent(db, { intentId: String(formData.get("id") ?? ""), memberId: member.id });
    signalId = outcome.opportunitySignalId;
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    fail(e, "No se pudo confirmar la propuesta.");
    return;
  }
  revalidatePath("/", "layout");
  if (signalId) redirect(`/apunte?ok=${signalId}`);
  redirect("/agente?ok=1");
}

export async function descartarAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const texto = String(formData.get("texto") ?? "");
  try {
    await dismissIntent(db, { intentId: String(formData.get("id") ?? ""), memberId: member.id });
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    fail(e, "No se pudo descartar la propuesta.");
    return;
  }
  revalidatePath("/agente");
  // Reformular: el texto vuelve a la caja para corregirlo, no para escribirlo de nuevo.
  redirect(texto ? `/agente?texto=${encodeURIComponent(texto)}` : "/agente");
}
