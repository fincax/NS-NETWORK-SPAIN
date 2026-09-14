"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { ACCOUNT_COOKIE } from "@/lib/auth";
import { AccountError, changePassword, revokeOtherSessions, revokeSession } from "@/lib/accounts";

export async function changePasswordAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const next = String(formData.get("next") ?? "");
  if (next !== String(formData.get("next2") ?? "")) redirect(`/cuenta?error=${encodeURIComponent("Las dos contraseñas nuevas no coinciden.")}`);
  const jar = await cookies();
  try {
    await changePassword(db, member.id, String(formData.get("current") ?? ""), next, jar.get(ACCOUNT_COOKIE)?.value);
  } catch (e) {
    redirect(`/cuenta?error=${encodeURIComponent(e instanceof AccountError ? e.message : "No se pudo cambiar la contraseña.")}`);
  }
  revalidatePath("/cuenta");
  redirect("/cuenta?ok=clave");
}

export async function revokeSessionAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  try {
    await revokeSession(db, member.id, String(formData.get("id") ?? ""));
  } catch (e) {
    redirect(`/cuenta?error=${encodeURIComponent(e instanceof AccountError ? e.message : "No se pudo cerrar la sesión.")}`);
  }
  revalidatePath("/cuenta");
  redirect("/cuenta?ok=sesion");
}

export async function revokeAllSessionsAction() {
  const { member } = await requireMember();
  const db = await getDb();
  const jar = await cookies();
  await revokeOtherSessions(db, member.id, jar.get(ACCOUNT_COOKIE)?.value);
  revalidatePath("/cuenta");
  redirect("/cuenta?ok=sesion");
}
