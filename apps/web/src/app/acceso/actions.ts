"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, SESSION_DAYS, sessionToken, verifyLogin } from "@/lib/auth";

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

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  redirect("/");
}
