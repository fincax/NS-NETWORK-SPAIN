"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { ACCOUNT_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { AccountError, redeemInvite } from "@/lib/accounts";

export async function redeemInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  if (password !== password2) redirect(`/invitacion/${encodeURIComponent(token)}?error=${encodeURIComponent("Las dos contraseñas no coinciden.")}`);
  const db = await getDb();
  let sessionToken: string;
  try {
    ({ token: sessionToken } = await redeemInvite(db, token, password, (await headers()).get("user-agent") ?? undefined));
  } catch (e) {
    redirect(`/invitacion/${encodeURIComponent(token)}?error=${encodeURIComponent(e instanceof AccountError ? e.message : "No se pudo activar el acceso.")}`);
  }
  const jar = await cookies();
  jar.set(ACCOUNT_COOKIE, sessionToken, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_DAYS * 86_400 });
  redirect("/hoy");
}
