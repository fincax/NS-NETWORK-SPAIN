"use server";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { submitEco, withdrawEcoPublicity } from "@/services/eco";

/** El Interesado no es usuario de NS: no hay sesión que comprobar. La llave es el token; el servicio valida estado y ventana. */
export async function submitEcoAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const db = await getDb();
  try {
    await submitEco(db, token, {
      attention: Number(formData.get("attention")),
      result: Number(formData.get("result")),
      recommend: Number(formData.get("recommend")),
      comment: String(formData.get("comment") ?? "").trim() || undefined,
      public_consent: formData.get("public_consent") === "on",
      display_name: String(formData.get("display_name") ?? "").trim() || undefined,
    });
  } catch (e) {
    redirect(`/eco/${encodeURIComponent(token)}?error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo guardar tu Eco.")}`);
  }
  redirect(`/eco/${encodeURIComponent(token)}?ok=1`);
}

export async function withdrawEcoAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const db = await getDb();
  await withdrawEcoPublicity(db, token);
  redirect(`/eco/${encodeURIComponent(token)}`);
}
