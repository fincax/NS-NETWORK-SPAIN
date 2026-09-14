/**
 * Acceso a la demo privada (D-033): un usuario y una contraseña compartidos, definidos por variables de entorno.
 * No es la autenticación de producción (esa llega con usuarios por Timonel y permisos por Sala); es la puerta
 * que impide que la demo sea pública. Usa Web Crypto para funcionar tanto en el proxy como en el servidor.
 */
export const DEMO_COOKIE = "ns_demo";
export const SESSION_DAYS = 30;
/** Cookie de la sesión personal (D-042). */
export const ACCOUNT_COOKIE = "ns_session";

export type AuthMode = "demo" | "real";
/** demo: puerta compartida + selector de Timonel (local por defecto). real: cuentas con contraseña (producción por defecto). */
export function authMode(): AuthMode {
  const v = process.env.NS_AUTH_MODE;
  if (v === "demo" || v === "real") return v;
  return process.env.NODE_ENV === "production" ? "real" : "demo";
}

function env(name: string, fallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (process.env.NODE_ENV !== "production" && fallback !== undefined) return fallback;
  throw new Error(`Falta la variable de entorno ${name}`);
}

export function demoCredentials() {
  return { user: env("DEMO_USER", "demo"), password: env("DEMO_PASSWORD", "nscumbre") };
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** El token depende del secreto y de la contraseña vigente: cambiar la contraseña invalida todas las sesiones. */
export async function sessionToken(): Promise<string> {
  const { user, password } = demoCredentials();
  const secret = env("DEMO_SESSION_SECRET", "ns-demo-secret-dev");
  return hmac(secret, `demo:v1:${user}:${password}`);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function verifyLogin(user: string, password: string): Promise<boolean> {
  const c = demoCredentials();
  return timingSafeEqual(user.trim().toLowerCase(), c.user.toLowerCase()) && timingSafeEqual(password, c.password);
}

export async function isValidSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  try {
    return timingSafeEqual(cookieValue, await sessionToken());
  } catch {
    return false;
  }
}
