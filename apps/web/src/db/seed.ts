/** Seed de NS Sevilla · NS Cumbre: estructura, NS-CAT, plazas, empresas, personas, ADN y agentes de Sala. Idempotente por slug. */
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { NSCAT } from "./nscat";
import { SEED_CANDIDACIES, SEED_COMPANIES } from "./seed-data";
import { acceptAllNormas } from "@/core/normas";
import { onboardCompany } from "@/services/onboarding";
import { hasPassword, setPassword } from "@/lib/accounts";

/**
 * Especialidades de NS-CAT que aún no existen en la base de datos → especialidad nueva y plaza vacante en la Sala.
 * Idempotente. Lo llaman la semilla y /api/jobs, para que una especialidad añadida a NS-CAT (p. ej. Administración de
 * fincas, D-059) llegue al servidor con `actualizar.sh`, sin volver a ejecutar la semilla. Devuelve los códigos añadidos.
 */
export async function syncNscatSeats(db: Db, chapterId: string): Promise<string[]> {
  const added: string[] = [];
  for (const s of NSCAT) {
    const existing = await db.query.specialties.findFirst({ where: eq(schema.specialties.nscatCode, s.code) });
    const [row] = existing
      ? [existing]
      : await db.insert(schema.specialties).values({ nscatCode: s.code, cnaeClass: s.cnae, name: s.name, description: s.description, status: s.status, regulated: s.regulated ?? false, overlapsWith: s.overlapsWith ?? [] }).returning();
    const seat = await db.query.categorySeats.findFirst({ where: eq(schema.categorySeats.specialtyId, row.id) });
    if (!seat) {
      await db.insert(schema.categorySeats).values({ chapterId, specialtyId: row.id, status: "VACANT" });
      added.push(s.code);
    }
  }
  return added;
}

export async function seedChapter(db: Db) {
  let zone = await db.query.zones.findFirst({ where: eq(schema.zones.slug, "ns-sevilla") });
  if (!zone) [zone] = await db.insert(schema.zones).values({ country: "ES", name: "NS Sevilla", slug: "ns-sevilla" }).returning();
  let chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.slug, "ns-cumbre") });
  if (!chapter) [chapter] = await db.insert(schema.chapters).values({ zoneId: zone.id, name: "NS Cumbre", slug: "ns-cumbre" }).returning();

  await syncNscatSeats(db, chapter.id);

  for (const kind of ["MATCHMAKER", "COMPLIANCE", "CHAPTER_INTELLIGENCE", "BRIEFING"]) {
    const existing = await db.query.agents.findFirst({ where: eq(schema.agents.kind, kind) });
    if (!existing) await db.insert(schema.agents).values({ chapterId: chapter.id, kind });
  }

  const companies: Record<string, { companyId: string; memberId: string }> = {};
  for (const c of SEED_COMPANIES) {
    const existing = await db.query.companies.findFirst({ where: eq(schema.companies.slug, c.slug) });
    if (existing) {
      const m = await db.query.members.findFirst({ where: eq(schema.members.companyId, existing.id) });
      companies[c.slug] = { companyId: existing.id, memberId: m!.id };
      continue;
    }
    const r = await onboardCompany(db, { chapterId: chapter.id, name: c.name, slug: c.slug, legalName: c.legalName, website: c.website, specialtyCode: c.specialty, person: c.person, dna: c.dna, acceptance: acceptAllNormas() });
    companies[c.slug] = { companyId: r.company.id, memberId: r.member.id };
  }
  // Cuentas personales (D-054): en local y en la demo, los Timoneles sembrados comparten una contraseña conocida.
  const seedPassword = process.env.NS_SEED_PASSWORD ?? (process.env.NODE_ENV === "production" ? undefined : "nscumbre-demo");
  if (seedPassword) {
    for (const { memberId } of Object.values(companies)) if (!(await hasPassword(db, memberId))) await setPassword(db, memberId, seedPassword);
  }

  const anyCandidacy = await db.query.betaRequests.findFirst();
  if (!anyCandidacy) {
    const rows = await db.insert(schema.betaRequests).values(SEED_CANDIDACIES.map((c) => { const at = new Date(Date.now() - c.daysAgo * 86_400_000); return { fullName: c.fullName, companyName: c.companyName, email: c.email, specialtyCode: c.specialtyCode, city: c.city, message: c.message, status: c.status, notes: c.notes ?? null, createdAt: at, updatedAt: at }; })).returning();
    // Sala en fundación (D-041): la Promotora es la candidatura con la plaza de Seguros ocupada.
    const promoter = rows.find((r) => r.companyName === "Correduría Giralda");
    if (promoter) {
      const [f] = await db.insert(schema.chapterFoundings).values({ zoneId: zone.id, promoterCandidacyId: promoter.id, minMembers: 12, rewardText: "3 meses de cuota gratis para la Promotora" }).returning();
      for (const r of rows.filter((r) => r.status === "FOUNDING")) await db.update(schema.betaRequests).set({ foundingId: f.id }).where(eq(schema.betaRequests.id, r.id));
    }
  }

  return { zone, chapter, companies };
}

/** Escenarios de referencia (NS-ARP §14). */
export const SCENARIOS = {
  A: {
    originator: "guadalquivir",
    rawContent:
      "Mi cliente Metalúrgica del Sur abre planta en Dos Hermanas en Q1, 60 empleados nuevos. Presupuesto de obra aprobado internamente, cifra no conocida. Licencia de obra en trámite, inicio previsto febrero. Decide el Director General, al que le aseguro la flota.",
    contactName: "Rafael Montes",
    contactRole: "Director General",
    legalBasisForContact: "LEGITIMATE_INTEREST" as const,
    thirdPartyExpectsContact: true,
  },
  C: {
    originator: "securenet",
    rawContent: "Conozco una startup SaaS de 8 personas que busca diseño de identidad de marca antes de su ronda seed. Presupuesto ajustado, unos 6.000 €.",
  },
  D: {
    originator: "fiscal-triana",
    rawContent: "Nota interna confidencial: mi cliente Aceitunas Vega Alta, empresa familiar de 35 empleados, prepara la venta de la empresa. Necesitará due diligence legal y valoración en los próximos seis meses.",
    visibility: "COMPANY_ONLY" as const,
  },
};
