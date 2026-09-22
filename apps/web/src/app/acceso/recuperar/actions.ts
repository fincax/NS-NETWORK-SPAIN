"use server";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requestPasswordRecovery } from "@/services/correo";

/** Recuperación de contraseña (D-060). Siempre la misma respuesta: no revela si el correo es de un Timonel. */
export async function recoverAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().slice(0, 200);
  if (email) {
    const db = await getDb();
    await requestPasswordRecovery(db, email);
  }
  redirect("/acceso/recuperar?enviado=1");
}
