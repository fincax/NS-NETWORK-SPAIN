/**
 * Puerta de la demo privada (D-033). Todo lo que no sea la portada pública, el acceso o los recursos estáticos
 * exige la cookie de sesión de la demo. La ruta programada /api/clock se protege con CRON_SECRET, no con la cookie. Las Server Functions de cada página vuelven a comprobarla (requireDemo).
 */
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, isValidSession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const ok = await isValidSession(request.cookies.get(DEMO_COOKIE)?.value);
  if (ok) return NextResponse.next();
  const url = new URL("/acceso", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!acceso|api/clock|manifest.webmanifest|_next/static|_next/image|icon.svg|favicon.ico|$).*)"],
};
