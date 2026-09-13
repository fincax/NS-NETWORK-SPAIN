/** Alta de empresa: comprueba la plaza (una empresa por especialidad en la Sala), crea empresa, persona, ADN, capability y Agente. */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { BusinessDNA } from "@/core/types";

export class SeatTakenError extends Error {
  constructor(public specialtyName: string, public holderName: string) {
    super(`La plaza de ${specialtyName} está ocupada por ${holderName}`);
  }
}

export interface OnboardingInput {
  chapterId: string;
  name: string;
  slug: string;
  legalName?: string;
  website?: string;
  city?: string;
  specialtyCode: string;
  person: { fullName: string; role: string; email: string; isDirector?: boolean };
  dna: unknown;
  validate?: boolean;
}

export async function checkSeatAvailability(db: Db, chapterId: string, specialtyCode: string) {
  const specialty = await db.query.specialties.findFirst({ where: eq(schema.specialties.nscatCode, specialtyCode) });
  if (!specialty) throw new Error(`Especialidad ${specialtyCode} no existe en NS-CAT`);
  const seat = await db.query.categorySeats.findFirst({ where: and(eq(schema.categorySeats.chapterId, chapterId), eq(schema.categorySeats.specialtyId, specialty.id)) });
  const holder = seat?.companyId ? await db.query.companies.findFirst({ where: eq(schema.companies.id, seat.companyId) }) : undefined;
  return { specialty, seat, holder, available: !seat || seat.status !== "ACTIVE" };
}

export async function onboardCompany(db: Db, input: OnboardingInput) {
  const dna = BusinessDNA.parse(input.dna);
  const { specialty, seat, holder, available } = await checkSeatAvailability(db, input.chapterId, input.specialtyCode);
  if (!available && holder) throw new SeatTakenError(specialty.name, holder.name);

  const [company] = await db.insert(schema.companies).values({ chapterId: input.chapterId, name: input.name, slug: input.slug, legalName: input.legalName, website: input.website, city: input.city ?? "Sevilla", status: "ACTIVE" }).returning();
  const [member] = await db.insert(schema.members).values({ companyId: company.id, chapterId: input.chapterId, fullName: input.person.fullName, role: input.person.role, email: input.person.email, isPrimary: true, isDirector: input.person.isDirector ?? false }).returning();
  await db.insert(schema.businessDna).values({ companyId: company.id, dna, validatedBy: input.validate === false ? null : member.id, validatedAt: input.validate === false ? null : new Date() });
  if (seat) {
    await db.update(schema.categorySeats).set({ companyId: company.id, status: "ACTIVE", grantedAt: new Date() }).where(eq(schema.categorySeats.id, seat.id));
  } else {
    await db.insert(schema.categorySeats).values({ chapterId: input.chapterId, specialtyId: specialty.id, companyId: company.id, status: "ACTIVE", grantedAt: new Date() });
  }
  await db.insert(schema.capabilities).values({ companyId: company.id, chapterId: input.chapterId, specialtyId: specialty.id, isPrimarySeat: true });
  const [agent] = await db.insert(schema.agents).values({ chapterId: input.chapterId, companyId: company.id, kind: "COMPANY" }).returning();
  await audit(db, { chapterId: input.chapterId, kind: "MEMBER_ACTIVATED", actor: { type: "SYSTEM", id: "onboarding" }, subject: { type: "Company", id: company.id }, policyApplied: "seat.exclusivity", result: `${company.name} ocupa la plaza de ${specialty.name}. Su Agente NS está activo en la Mesa.`, significant: true });
  return { company, member, agent, specialty };
}

export async function updateDna(db: Db, companyId: string, dnaInput: unknown, validatedBy?: string) {
  const dna = BusinessDNA.parse(dnaInput);
  const existing = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
  if (!existing) throw new Error("ADN no encontrado");
  await db.update(schema.businessDna).set({ dna, version: existing.version + 1, validatedBy: validatedBy ?? existing.validatedBy, validatedAt: validatedBy ? new Date() : existing.validatedAt, updatedAt: new Date() }).where(eq(schema.businessDna.id, existing.id));
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) });
  if (company) await audit(db, { chapterId: company.chapterId, kind: "DNA_UPDATED", actor: { type: "USER", id: validatedBy ?? "member" }, subject: { type: "BusinessDNA", id: existing.id }, result: `${company.name} actualizó su ADN de Empresa (v${existing.version + 1}).`, significant: false, companyIds: [companyId] });
}
