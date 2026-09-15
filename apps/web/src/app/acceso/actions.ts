"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ACCOUNT_COOKIE, DEMO_COOKIE, SESSION_DAYS, authMode, sessionToken, verifyLogin } from "@/lib/auth";
import { getDb } from "@/db/client";
import { login, logout } from "@/lib/accounts";

export async function loginAction(formData: FormData) {
  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/hoy");
  const ok = await verifyLogin(user, password);
  if (!ok) redirect(`/acceso?error=1&next=${encodeURIComponent(next)}`);
  const jar = await cookies();
  jar.set(DEMO_COOKIE, await sessionToken(), { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_DAYS * 86_400 });
  redirect(next.startsWith("/") ? next : "/hoy");
}

/** Cuenta personal (D-054). */
export async function accountLoginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/hoy");
  const db = await getDb();
  const r = await login(db, email, password, (await headers()).get("user-agent") ?? undefined);
  if (!r) redirect(`/acceso?error=1&next=${encodeURIComponent(next)}`);
  const jar = await cookies();
  jar.set(ACCOUNT_COOKIE, r.token, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: SESSION_DAYS * 86_400 });
  redirect(next.startsWith("/") ? next : "/hoy");
}

export async function logoutAction() {
  const jar = await cookies();
  if (authMode() === "real") {
    const db = await getDb();
    await logout(db, jar.get(ACCOUNT_COOKIE)?.value);
    jar.delete(ACCOUNT_COOKIE);
  }
  jar.delete(DEMO_COOKIE);
  redirect("/");
}
