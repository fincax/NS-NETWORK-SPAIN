/** Alta de empresa: comprueba la plaza (una empresa por especialidad en la Sala), crea empresa, persona, ADN, capability y Agente. */
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { BusinessDNA } from "@/core/types";
import { missingNormas, NORMAS_NS, type RulesAcceptanceInput } from "@/core/normas";

export class SeatTakenError extends Error {
  constructor(public specialtyName: string, public holderName: string, public inRelease = false) {
    super(inRelease ? `La plaza de ${specialtyName} está en expediente de baja de ${holderName}; solo se libera cuando NS confirme la baja (D-044)` : `La plaza de ${specialtyName} está ocupada por ${holderName}`);
  }
}

export class RulesNotAcceptedError extends Error {
  constructor(public missing: string[]) {
    super(`Para ocupar una plaza hay que aceptar de forma expresa todas las Normas NS. Faltan: ${missing.map((c) => NORMAS_NS.find((n) => n.code === c)?.title ?? c).join(" ")}`);
  }
}

export interface OnboardingInput {
  chapterId: string;
  name: string;
  slug: string;
  legalName?: string;
  legalId?: string; // CIF/NIF (D-047)
  website?: string;
  city?: string;
  specialtyCode: string;
  person: { fullName: string; role: string; email: string; isDirector?: boolean; isNetwork?: boolean };
  dna: unknown;
  validate?: boolean;
  /** Aceptación expresa de todas las Normas NS por el Timonel (D-043). Sin ella no hay alta. */
  acceptance: RulesAcceptanceInput;
}

export async function checkSeatAvailability(db: Db, chapterId: string, specialtyCode: string) {
  const specialty = await db.query.specialties.findFirst({ where: eq(schema.specialties.nscatCode, specialtyCode) });
  if (!specialty) throw new Error(`Especialidad ${specialtyCode} no existe en NS-CAT`);
  const seat = await db.query.categorySeats.findFirst({ where: and(eq(schema.categorySeats.chapterId, chapterId), eq(schema.categorySeats.specialtyId, specialty.id)) });
  const holder = seat?.companyId ? await db.query.companies.findFirst({ where: eq(schema.companies.id, seat.companyId) }) : undefined;
  // Una plaza con titular (activa o en expediente de baja) nunca está disponible: solo se libera al confirmar NS la baja (D-044).
  return { specialty, seat, holder, available: !seat || !seat.companyId, inRelease: Boolean(seat && seat.companyId && seat.status !== "ACTIVE") };
}

export async function onboardCompany(db: Db, input: OnboardingInput) {
  const dna = BusinessDNA.parse(input.dna);
  const missing = missingNormas(input.acceptance);
  if (missing.length) throw new RulesNotAcceptedError(missing);
  const { specialty, seat, holder, available, inRelease } = await checkSeatAvailability(db, input.chapterId, input.specialtyCode);
  if (!available && holder) throw new SeatTakenError(specialty.name, holder.name, inRelease);

  const [company] = await db.insert(schema.companies).values({ chapterId: input.chapterId, name: input.name, slug: input.slug, legalName: input.legalName, legalId: input.legalId?.trim().toUpperCase() || null, website: input.website, city: input.city ?? "Sevilla", status: "ACTIVE" }).returning();
  const [member] = await db.insert(schema.members).values({ companyId: company.id, chapterId: input.chapterId, fullName: input.person.fullName, role: input.person.role, email: input.person.email, isPrimary: true, isDirector: input.person.isDirector ?? false, isNetwork: input.person.isNetwork ?? false }).returning();
  await db.insert(schema.rulesAcceptances).values({ chapterId: input.chapterId, companyId: company.id, memberId: member.id, rulesVersion: input.acceptance.rulesVersion, rules: [...input.acceptance.rules] });
  await db.insert(schema.businessDna).values({ companyId: company.id, dna, validatedBy: input.validate === false ? null : member.id, validatedAt: input.validate === false ? null : new Date() });
  if (seat) {
    await db.update(schema.categorySeats).set({ companyId: company.id, status: "ACTIVE", grantedAt: new Date() }).where(eq(schema.categorySeats.id, seat.id));
  } else {
    await db.insert(schema.categorySeats).values({ chapterId: input.chapterId, specialtyId: specialty.id, companyId: company.id, status: "ACTIVE", grantedAt: new Date() });
  }
  await db.insert(schema.capabilities).values({ companyId: company.id, chapterId: input.chapterId, specialtyId: specialty.id, isPrimarySeat: true });
  const [agent] = await db.insert(schema.agents).values({ chapterId: input.chapterId, companyId: company.id, kind: "COMPANY" }).returning();
  await audit(db, { chapterId: input.chapterId, kind: "MEMBER_ACTIVATED", actor: { type: "SYSTEM", id: "onboarding" }, subject: { type: "Company", id: company.id }, policyApplied: "seat.exclusivity", result: `${company.name} ocupa la plaza de ${specialty.name}. Su Timonel aceptó de forma expresa las Normas NS (versión ${input.acceptance.rulesVersion}). Su Agente NS está activo en la Mesa.`, significant: true });
  const bonus = await grantNetworkSeatBonus(db, company);
  return { company, member, agent, specialty, networkBonus: bonus };
}

export const NETWORK_SEAT_BONUS_MERIT = 50;

/** D-047: si la misma empresa (mismo CIF) ya es titular en otra Sala de la zona, NS premia que haya elegido otra Sala y no acumular plazas en una. */
async function grantNetworkSeatBonus(db: Db, company: { id: string; chapterId: string; name: string; legalId: string | null }) {
  if (!company.legalId) return false;
  const chapter = (await db.query.chapters.findFirst({ where: eq(schema.chapters.id, company.chapterId) }))!;
  const zoneChapters = await db.query.chapters.findMany({ where: eq(schema.chapters.zoneId, chapter.zoneId), columns: { id: true, name: true } });
  const others = await db.query.companies.findMany({ where: and(eq(schema.companies.legalId, company.legalId), eq(schema.companies.status, "ACTIVE"), inArray(schema.companies.chapterId, zoneChapters.filter((c) => c.id !== company.chapterId).map((c) => c.id))) });
  if (others.length === 0) return false;
  const otherNames = others.map((o) => zoneChapters.find((c) => c.id === o.chapterId)?.name ?? "otra Sala").join(", ");
  await db.insert(schema.trustEvents).values({ chapterId: company.chapterId, companyId: company.id, kind: "NETWORK_SEAT_BONUS", weight: NETWORK_SEAT_BONUS_MERIT, evidenceRef: `legalId:${company.legalId}` });
  await audit(db, { chapterId: company.chapterId, kind: "NETWORK_SEAT_BONUS", actor: { type: "SYSTEM", id: "onboarding" }, subject: { type: "Company", id: company.id }, policyApplied: "seats.prefer_other_chapter", result: `${company.name} ya es titular en ${otherNames}. NS premia que lleve cada especialidad a una Sala distinta: Mérito de Red +${NETWORK_SEAT_BONUS_MERIT}.`, significant: true, companyIds: [company.id] });
  return true;
}

/** D-047: una empresa con varias especialidades puede ocupar varias plazas en la misma Sala, cada una con su titularidad y su Compromiso. */
export async function addSeat(db: Db, input: { chapterId: string; companyId: string; specialtyCode: string; memberId: string }) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member || member.companyId !== input.companyId) throw new Error("Solo el Timonel de la empresa puede pedir otra plaza.");
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId) });
  if (!company || company.chapterId !== input.chapterId || company.status !== "ACTIVE") throw new Error("La empresa no es titular activa en esta Sala.");
  const { specialty, seat, holder, available, inRelease } = await checkSeatAvailability(db, input.chapterId, input.specialtyCode);
  if (!available && holder) throw new SeatTakenError(specialty.name, holder.name, inRelease);
  if (seat) await db.update(schema.categorySeats).set({ companyId: company.id, status: "ACTIVE", grantedAt: new Date() }).where(eq(schema.categorySeats.id, seat.id));
  else await db.insert(schema.categorySeats).values({ chapterId: input.chapterId, specialtyId: specialty.id, companyId: company.id, status: "ACTIVE", grantedAt: new Date() });
  await db.insert(schema.capabilities).values({ companyId: company.id, chapterId: input.chapterId, specialtyId: specialty.id, isPrimarySeat: false });
  const seats = await db.query.categorySeats.findMany({ where: and(eq(schema.categorySeats.companyId, company.id), eq(schema.categorySeats.status, "ACTIVE")), columns: { id: true } });
  await audit(db, { chapterId: input.chapterId, kind: "SEAT_ADDED", actor: { type: "USER", id: member.id }, subject: { type: "Company", id: company.id }, policyApplied: "seats.multi_specialty", result: `${company.name} ocupa también la plaza de ${specialty.name}: ${seats.length} titularidades en la Sala, cada una con su Compromiso semanal. NS premia llevar la siguiente especialidad a otra Sala de la zona (D-047).`, significant: true });
  return { specialty, seats: seats.length };
}

export async function updateDna(db: Db, companyId: string, dnaInput: unknown, validatedBy?: string) {
  const dna = BusinessDNA.parse(dnaInput);
  const existing = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
  if (!existing) throw new Error("ADN no encontrado");
  await db.update(schema.businessDna).set({ dna, version: existing.version + 1, validatedBy: validatedBy ?? existing.validatedBy, validatedAt: validatedBy ? new Date() : existing.validatedAt, updatedAt: new Date() }).where(eq(schema.businessDna.id, existing.id));
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) });
  if (company) await audit(db, { chapterId: company.chapterId, kind: "DNA_UPDATED", actor: { type: "USER", id: validatedBy ?? "member" }, subject: { type: "BusinessDNA", id: existing.id }, result: `${company.name} actualizó su ADN de Empresa (v${existing.version + 1}).`, significant: false, companyIds: [companyId] });
}
