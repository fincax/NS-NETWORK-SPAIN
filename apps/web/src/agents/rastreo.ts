/**
 * Rastreo público (D-031): el Agente de una empresa revisa fuentes públicas (BORME, licitaciones, licencias de obra,
 * empleo, prensa local) y convierte lo relevante en Indicios en borrador para otros titulares de la Sala.
 * El Timonel decide si los publica (puerta humana). En v0.1 la fuente es un lote de ejemplo verosímil;
 * los adaptadores reales implementan la misma interfaz `PublicFeed`.
 */
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { createSignal } from "@/services/signals";

export const PublicRecord = z.object({
  external_ref: z.string(),
  source: z.enum(["BORME", "LICITACION", "LICENCIA_OBRA", "EMPLEO", "PRENSA"]),
  title: z.string(),
  summary: z.string(),
  company_name: z.string().optional(),
  city: z.string().optional(),
  url: z.string().optional(),
  published_at: z.string(), // ISO
});
export type PublicRecord = z.infer<typeof PublicRecord>;

export interface PublicFeed {
  readonly name: string;
  fetch(opts: { zone: string; since: Date }): Promise<PublicRecord[]>;
}

export const SOURCE_LABEL: Record<PublicRecord["source"], string> = { BORME: "BORME", LICITACION: "Licitación pública", LICENCIA_OBRA: "Licencia de obra", EMPLEO: "Oferta de empleo", PRENSA: "Prensa local" };

/** Lote de ejemplo para NS Sevilla. Nombres ficticios; formatos y tipos de hecho, reales. */
export const SAMPLE_FEED: PublicRecord[] = [
  { external_ref: "LICENCIA_OBRA:sevilla:2026-09-08:0412", source: "LICENCIA_OBRA", title: "Licencia de obra mayor · nave industrial en Polígono La Isla", summary: "Cerámicas del Sur S.L. obtiene licencia de obra mayor para ampliar su planta en Dos Hermanas: 2.400 m² de nave nueva y oficinas. Inicio previsto en el primer trimestre. 40 empleados actuales.", company_name: "Cerámicas del Sur", city: "Dos Hermanas", url: "https://www.doshermanas.es/licencias", published_at: "2026-09-08" },
  { external_ref: "BORME:2026-09-09:A-2261", source: "BORME", title: "Ampliación de capital · Logística Bética S.A.", summary: "Logística Bética S.A. amplía capital en 1,2 millones de euros y nombra nueva directora financiera. La empresa, con 120 empleados en Sevilla, renueva flota de 12 vehículos según su memoria.", company_name: "Logística Bética", city: "Sevilla", url: "https://www.boe.es/diario_borme/", published_at: "2026-09-09" },
  { external_ref: "EMPLEO:2026-09-10:bio-7781", source: "EMPLEO", title: "Ofertas de empleo · 25 técnicos de producción", summary: "Farmalab Andalucía publica 25 ofertas de técnico de producción y 3 de mando intermedio para su nueva línea en Alcalá de Guadaíra. Empresa farmacéutica de 90 empleados.", company_name: "Farmalab Andalucía", city: "Alcalá de Guadaíra", url: "https://www.infoempleo.com/", published_at: "2026-09-10" },
  { external_ref: "BORME:2026-09-11:A-2302", source: "BORME", title: "Constitución · Aceitunas Vega Alta Portugal, Lda. (filial)", summary: "Aceitunas Vega Alta S.L., empresa familiar de 35 empleados de Sevilla, constituye una filial en Portugal para su entrada en el mercado portugués durante el próximo año.", company_name: "Aceitunas Vega Alta", city: "Sevilla", url: "https://www.boe.es/diario_borme/", published_at: "2026-09-11" },
  { external_ref: "PRENSA:2026-09-12:abc-sev-118", source: "PRENSA", title: "Startup sevillana cierra ronda seed", summary: "La startup SaaS Turnia, de 8 personas, cierra una ronda seed de 900.000 euros y busca diseño de identidad de marca y contratar 6 personas. Presupuesto de marca ajustado según su CEO.", company_name: "Turnia", city: "Sevilla", url: "https://sevilla.abc.es/", published_at: "2026-09-12" },
  { external_ref: "LICITACION:2026-09-12:PLACE-88231", source: "LICITACION", title: "Adjudicación · mantenimiento integral de instalaciones deportivas", summary: "Mantenimientos Giralda S.L. resulta adjudicataria del mantenimiento integral de instalaciones municipales por 4 años (1,8 millones de euros). Empresa de 60 empleados; necesitará ampliar plantilla y cobertura de responsabilidad civil.", company_name: "Mantenimientos Giralda", city: "Sevilla", url: "https://contrataciondelestado.es/", published_at: "2026-09-12" },
];

export class SampleFeed implements PublicFeed {
  readonly name = "sample:ns-sevilla";
  constructor(private records: PublicRecord[] = SAMPLE_FEED) {}
  async fetch(opts: { zone: string; since: Date }): Promise<PublicRecord[]> {
    return this.records.filter((r) => new Date(r.published_at) >= opts.since);
  }
}

export interface RastreoResult {
  ingested: { recordRef: string; signalId: string; title: string }[];
  skipped: number;
}

/** El Agente de `companyId` rastrea la fuente y deja Indicios en borrador (fuente PUBLIC_RECORD) para que su Timonel decida. */
export async function runRastreo(db: Db, companyId: string, feed: PublicFeed = new SampleFeed(), since = new Date("2026-01-01")): Promise<RastreoResult> {
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) });
  const agent = await db.query.agents.findFirst({ where: and(eq(schema.agents.companyId, companyId), eq(schema.agents.kind, "COMPANY")) });
  if (!company || !agent) throw new Error("Empresa sin Agente");
  const records = await feed.fetch({ zone: company.city, since });
  const result: RastreoResult = { ingested: [], skipped: 0 };
  for (const rec of records) {
    const existing = await db.query.publicRecords.findFirst({ where: and(eq(schema.publicRecords.chapterId, company.chapterId), eq(schema.publicRecords.externalRef, rec.external_ref)) });
    if (existing) {
      result.skipped++;
      continue;
    }
    const rawContent = `Fuente pública (${SOURCE_LABEL[rec.source]}, ${rec.published_at}): ${rec.title}. ${rec.summary}${rec.company_name ? ` Empresa: cliente ${rec.company_name}.` : ""}`;
    const created = await createSignal(db, { companyId, rawContent, source: "PUBLIC_RECORD", visibility: "CHAPTER" });
    if (created.needs.length === 0) {
      await db.insert(schema.publicRecords).values({ chapterId: company.chapterId, externalRef: rec.external_ref, source: rec.source, title: rec.title, summary: rec.summary, companyName: rec.company_name, city: rec.city, url: rec.url, publishedAt: new Date(rec.published_at), ingestedByCompanyId: companyId, opportunitySignalId: null });
      await db.update(schema.opportunitySignals).set({ status: "WITHDRAWN" }).where(eq(schema.opportunitySignals.id, created.opportunitySignal.id));
      result.skipped++;
      continue;
    }
    await db.insert(schema.publicRecords).values({ chapterId: company.chapterId, externalRef: rec.external_ref, source: rec.source, title: rec.title, summary: rec.summary, companyName: rec.company_name, city: rec.city, url: rec.url, publishedAt: new Date(rec.published_at), ingestedByCompanyId: companyId, opportunitySignalId: created.opportunitySignal.id });
    result.ingested.push({ recordRef: rec.external_ref, signalId: created.opportunitySignal.id, title: rec.title });
  }
  if (result.ingested.length > 0) {
    await audit(db, { chapterId: company.chapterId, kind: "RASTREO", actor: { type: "AGENT", id: agent.id }, subject: { type: "Company", id: companyId }, policyApplied: "rastreo.public_sources", result: `Tu Agente ha encontrado ${result.ingested.length} Indicio(s) en fuentes públicas que podrían servir a otros titulares de la Sala. Revísalos antes de publicar.`, significant: true, companyIds: [companyId] });
  }
  return result;
}
