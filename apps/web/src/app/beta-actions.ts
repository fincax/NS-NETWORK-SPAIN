"use server";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db/client";
import { NSCAT } from "@/db/nscat";

/** Solicitud de plaza en la beta (D-033). Se guarda para que la Directiva la revise; no crea cuentas ni Agentes. */
export async function betaRequestAction(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const specialtyCode = String(formData.get("specialtyCode") ?? "").trim();
  const city = String(formData.get("city") ?? "Sevilla").trim() || "Sevilla";
  const message = String(formData.get("message") ?? "").trim();
  if (!fullName || !companyName || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect("/?error=1#plaza");
  const validSpecialty = NSCAT.some((s) => s.code === specialtyCode) ? specialtyCode : null;
  const db = await getDb();
  await db.insert(schema.betaRequests).values({ fullName, companyName, email, specialtyCode: validSpecialty, city, message: message || null });
  redirect("/?ok=1#plaza");
}
