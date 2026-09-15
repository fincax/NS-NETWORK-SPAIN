/**
 * Sesión de demo: el Timonel activo se guarda en una cookie (sin autenticación en el vertical slice).
 * En producción esto lo sustituye la autenticación real y el RBAC por Sala/empresa.
 */
import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db/client";
import { ACCOUNT_COOKIE, DEMO_COOKIE, authMode, isValidSession } from "@/lib/auth";
import { memberFromSessionToken } from "@/lib/accounts";

export const MEMBER_COOKIE = "ns_member";

export async function listMembers() {
  const db = await getDb();
  const rows = await db.select({ id: schema.members.id, fullName: schema.members.fullName, role: schema.members.role, companyId: schema.members.companyId, companyName: schema.companies.name, isDirector: schema.members.isDirector }).from(schema.members).innerJoin(schema.companies, eq(schema.companies.id, schema.members.companyId)).orderBy(asc(schema.companies.name));
  return rows;
}

export async function currentMember() {
  const db = await getDb();
  const jar = await cookies();
  let member: typeof schema.members.$inferSelect | undefined;
  if (authMode() === "real") {
    // Cuenta personal (D-054): la sesión decide quién eres; nunca el selector.
    member = (await memberFromSessionToken(db, jar.get(ACCOUNT_COOKIE)?.value)) ?? undefined;
  } else {
    const id = jar.get(MEMBER_COOKIE)?.value;
    member = id ? await db.query.members.findFirst({ where: eq(schema.members.id, id) }) : undefined;
    if (!member) {
      member = await db.query.members.findFirst({ where: eq(schema.members.email, "carlos@hispalis-industrial.es") }) ?? (await db.query.members.findFirst());
    }
  }
  if (!member) return null;
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, member.companyId) });
  const chapter = company ? await db.query.chapters.findFirst({ where: eq(schema.chapters.id, company.chapterId) }) : undefined;
  if (!company || !chapter) return null;
  return { member, company, chapter };
}

/** Comprueba el acceso (D-033 demo / D-054 cuentas). El proxy ya lo exige, pero las Server Functions no deben fiarse solo de él. */
export async function requireDemo() {
  const jar = await cookies();
  if (authMode() === "real") {
    const db = await getDb();
    if (!(await memberFromSessionToken(db, jar.get(ACCOUNT_COOKIE)?.value))) redirect("/acceso");
    return;
  }
  if (!(await isValidSession(jar.get(DEMO_COOKIE)?.value))) redirect("/acceso");
}

export async function requireMember() {
  await requireDemo();
  const ctx = await currentMember();
  if (!ctx) throw new Error("La Sala no está inicializada. Ejecuta `pnpm db:seed`.");
  // Desde la notificación de baja, el Timonel no accede al panel de esa Sala ni a su panel personal (D-044).
  if (ctx.company.status !== "ACTIVE") redirect("/baja");
  return ctx;
}

/** Solo la Directiva de la Sala. Devuelve null si el Timonel activo no lo es (la página muestra el estado "sin permiso"). */
export async function requireDirector() {
  const ctx = await requireMember();
  return ctx.member.isDirector ? ctx : null;
}
