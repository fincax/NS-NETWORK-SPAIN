/**
 * Puerta de la demo privada (D-033). Todo lo que no sea la portada pública, el acceso o los recursos estáticos
 * exige la cookie de sesión de la demo. La ruta programada /api/clock se protege con CRON_SECRET, no con la cookie.
 * La página del Eco (/eco/[token]) y la del Aval (/aval/[slug]) son públicas por diseño (D-042): el Interesado nunca es usuario de NS,
 * y el Aval se muestra fuera de la red con nombre y valoración, sin datos de contacto. Las Server Functions de cada página vuelven a comprobarla (requireDemo).
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
  matcher: ["/((?!acceso|eco/|aval/|api/clock|api/pending|manifest.webmanifest|_next/static|_next/image|icon.svg|icon-192.png|icon-512.png|apple-touch-icon.png|favicon.ico|$).*)"],
};
