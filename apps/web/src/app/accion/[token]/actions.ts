"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { ACCOUNT_COOKIE, SESSION_DAYS, authMode } from "@/lib/auth";
import { createSession } from "@/lib/accounts";
import { MEMBER_COOKIE } from "@/lib/session";
import { executeAction, executeComunicadoAction } from "@/services/accion";
import { actionLinkFromToken } from "@/services/avisos";
import type { RevealScope } from "@/core/types";

/** Un toque desde el correo (D-067): ejecuta la acción del enlace, deja a la persona dentro y la lleva a la tarjeta. */
export async function executeActionLink(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const answer = String(formData.get("answer") ?? "").trim() || undefined;
  const scopeRaw = String(formData.get("reveal_scope") ?? "");
  const revealScope = scopeRaw === "COMPANY_ONLY" || scopeRaw === "COMPANY_AND_CONTACT" ? (scopeRaw as RevealScope) : undefined;
  const db = await getDb();
  let result: { referralId?: string; memberId: string; done: boolean };
  try {
    const link = await actionLinkFromToken(db, token);
    result = link?.comunicadoId ? await executeComunicadoAction(db, token, { note: String(formData.get("note") ?? "").trim() || undefined }) : await executeAction(db, token, { answer, revealScope });
  } catch (e) {
    redirect(`/accion/${encodeURIComponent(token)}?error=${encodeURIComponent(e instanceof Error ? e.message : "No se pudo completar la acción.")}`);
  }
  const jar = await cookies();
  if (authMode() === "real") {
    // El enlace prueba la identidad: la persona entra sin contraseña, como con un enlace de acceso (D-054).
    const { token: sessionToken } = await createSession(db, result.memberId, (await headers()).get("user-agent") ?? undefined);
    jar.set(ACCOUNT_COOKIE, sessionToken, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_DAYS * 86_400 });
  } else {
    jar.set(MEMBER_COOKIE, result.memberId, { path: "/", sameSite: "lax" });
  }
  redirect(result.referralId ? `/cesiones/${result.referralId}${result.done ? "?hecho=1" : ""}` : "/hoy");
}
