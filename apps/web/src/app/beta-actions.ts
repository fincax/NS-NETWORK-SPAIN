"use server";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { parseCandidatura, submitCandidatura } from "@/services/candidatura";

/** Solicitud de plaza en la beta (D-033) con consentimiento de privacidad (D-055). No crea cuentas ni Agentes. */
export async function betaRequestAction(formData: FormData) {
  const db = await getDb();
  const result = await submitCandidatura(db, parseCandidatura(formData));
  if (!result.ok) redirect(result.error === "PRIVACIDAD" ? "/?error=privacidad#plaza" : "/?error=1#plaza");
  redirect("/?ok=1#plaza");
}
