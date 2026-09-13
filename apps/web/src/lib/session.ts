/**
 * Sesión de demo: la persona activa se guarda en una cookie (sin autenticación en el vertical slice).
 * En producción esto lo sustituye la autenticación real y el RBAC por Sala/empresa.
 */
import { cookies } from "next/headers";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";

export const MEMBER_COOKIE = "ns_member";

export async function listMembers() {
  const db = await getDb();
  const rows = await db.select({ id: schema.members.id, fullName: schema.members.fullName, role: schema.members.role, companyId: schema.members.companyId, companyName: schema.companies.name, isDirector: schema.members.isDirector }).from(schema.members).innerJoin(schema.companies, eq(schema.companies.id, schema.members.companyId)).orderBy(asc(schema.companies.name));
  return rows;
}

export async function currentMember() {
  const db = await getDb();
  const jar = await cookies();
  const id = jar.get(MEMBER_COOKIE)?.value;
  let member = id ? await db.query.members.findFirst({ where: eq(schema.members.id, id) }) : undefined;
  if (!member) {
    member = await db.query.members.findFirst({ where: eq(schema.members.email, "carlos@hispalis-industrial.es") }) ?? (await db.query.members.findFirst());
  }
  if (!member) return null;
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, member.companyId) });
  const chapter = company ? await db.query.chapters.findFirst({ where: eq(schema.chapters.id, company.chapterId) }) : undefined;
  if (!company || !chapter) return null;
  return { member, company, chapter };
}

export async function requireMember() {
  const ctx = await currentMember();
  if (!ctx) throw new Error("La Sala no está inicializada. Ejecuta `pnpm db:seed`.");
  return ctx;
}
