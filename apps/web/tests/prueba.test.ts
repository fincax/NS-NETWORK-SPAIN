/** Prueba de Valor (D-050), fuentes públicas reales (D-051) y "nadie busca para sí" (D-049). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { runRonda } from "@/services/ronda";
import { SAMPLE_FEED, SampleFeed } from "@/agents/rastreo";
import { createSignal, publishSignal } from "@/services/signals";
import { generateValueTrialReport, getTrialByToken, listTrials, startValueTrial } from "@/services/prueba";
import { CompositeFeed, parsePlaceAwards, PlaceAwardsFeed, PrensaFeed } from "@/agents/feeds-public";
import { NORMAS_NS } from "@/core/normas";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Record<string, { companyId: string; memberId: string }>;
const lucia = () => companies.guadalquivir;
const director = () => companies["bufete-alameda"];

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
});
afterAll(async () => {
  await closeDb();
});

const PLACE_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:cac-place-ext="urn:dgpe:names:draft:codice-place-ext:schema:xsd:CommonAggregateComponents-2" xmlns:cac="urn:dgpe:names:draft:codice:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:dgpe:names:draft:codice:schema:xsd:CommonBasicComponents-2">
<entry><id>https://contrataciondelestado.es/sindicacion/licitacion/1001</id><link href="https://contrataciondelestado.es/wps/poc?uri=deeplink:detalle_licitacion&amp;idEvl=1001"/><title>Servicio de mantenimiento de climatización</title><updated>2026-09-10T09:00:00.000+02:00</updated>
<cac-place-ext:ContractFolderStatus><cbc:ContractFolderID>EXP-2026-41-0001</cbc:ContractFolderID>
<cac-place-ext:LocatedContractingParty><cac:Party><cac:PartyName><cbc:Name>Ayuntamiento de Dos Hermanas</cbc:Name></cac:PartyName></cac:Party></cac-place-ext:LocatedContractingParty>
<cac:ProcurementProject><cbc:Name>Servicio de mantenimiento de climatización en edificios municipales</cbc:Name><cac:BudgetAmount><cbc:TotalAmount currencyID="EUR">420000</cbc:TotalAmount></cac:BudgetAmount><cac:RequiredCommodityClassification><cbc:ItemClassificationCode>50730000</cbc:ItemClassificationCode></cac:RequiredCommodityClassification><cac:RealizedLocation><cbc:CountrySubentity>Sevilla</cbc:CountrySubentity><cbc:CityName>Dos Hermanas</cbc:CityName></cac:RealizedLocation></cac:ProcurementProject>
<cac:TenderResult><cbc:ResultCode>8</cbc:ResultCode><cac:WinningParty><cac:PartyName><cbc:Name>Climatizaciones Andaluzas S.L.</cbc:Name></cac:PartyName></cac:WinningParty><cac:AwardedTenderedProject><cac:LegalMonetaryTotal><cbc:TaxExclusiveAmount currencyID="EUR">398500</cbc:TaxExclusiveAmount></cac:LegalMonetaryTotal></cac:AwardedTenderedProject></cac:TenderResult>
</cac-place-ext:ContractFolderStatus></entry>
<entry><id>https://contrataciondelestado.es/sindicacion/licitacion/1002</id><title>Suministro de mobiliario</title><updated>2026-09-11T09:00:00.000+02:00</updated>
<cac-place-ext:ContractFolderStatus><cbc:ContractFolderID>EXP-2026-28-0002</cbc:ContractFolderID>
<cac-place-ext:LocatedContractingParty><cac:Party><cac:PartyName><cbc:Name>Ministerio de Cultura</cbc:Name></cac:PartyName></cac:Party></cac-place-ext:LocatedContractingParty>
<cac:ProcurementProject><cbc:Name>Suministro de mobiliario de oficina</cbc:Name><cac:RealizedLocation><cbc:CountrySubentity>Madrid</cbc:CountrySubentity></cac:RealizedLocation></cac:ProcurementProject>
<cac:TenderResult><cac:WinningParty><cac:PartyName><cbc:Name>Muebles Centro S.A.</cbc:Name></cac:PartyName></cac:WinningParty></cac:TenderResult>
</cac-place-ext:ContractFolderStatus></entry>
<entry><id>https://contrataciondelestado.es/sindicacion/licitacion/1003</id><title>Obras de urbanización</title><updated>2026-09-12T09:00:00.000+02:00</updated>
<cac-place-ext:ContractFolderStatus><cbc:ContractFolderID>EXP-2026-41-0003</cbc:ContractFolderID>
<cac:ProcurementProject><cbc:Name>Obras de urbanización en Sevilla Este</cbc:Name><cac:RealizedLocation><cbc:CountrySubentity>Sevilla</cbc:CountrySubentity></cac:RealizedLocation></cac:ProcurementProject>
</cac-place-ext:ContractFolderStatus></entry>
</feed>`;

const RSS_FIXTURE = `<?xml version="1.0"?><rss version="2.0"><channel><title>Economía</title>
<item><title>Una empresa sevillana de envases abre una segunda planta en Alcalá</title><link>https://www.diariodesevilla.es/economia/envases-alcala.html</link><guid>ds-1</guid><pubDate>Fri, 12 Sep 2026 08:00:00 +0200</pubDate><description><![CDATA[Envases del Guadaíra invertirá 6 millones y contratará 40 personas en su nueva planta de Alcalá de Guadaíra.]]></description></item>
<item><title>Viejo artículo</title><link>https://x/old</link><guid>ds-0</guid><pubDate>Mon, 01 Jan 2024 08:00:00 +0200</pubDate><description>antiguo</description></item>
</channel></rss>`;

describe("Fuentes públicas reales (D-051)", () => {
  it("de PLACE solo entran adjudicaciones con adjudicataria en la zona: la que gana es la que va a necesitar cosas (D-049)", async () => {
    const awards = parsePlaceAwards(PLACE_FIXTURE);
    expect(awards.map((a) => a.winner)).toEqual(["Climatizaciones Andaluzas S.L.", "Muebles Centro S.A."]);
    expect(awards[0]).toMatchObject({ contractingParty: "Ayuntamiento de Dos Hermanas", amount: 398500, city: "Dos Hermanas", province: "Sevilla", cpv: ["50730000"] });
    const feed = new PlaceAwardsFeed(async () => PLACE_FIXTURE);
    const recs = await feed.fetch({ zone: "Sevilla", since: new Date("2026-01-01") });
    expect(recs).toHaveLength(1);
    expect(recs[0].source).toBe("LICITACION");
    expect(recs[0].company_name).toBe("Climatizaciones Andaluzas S.L.");
    expect(recs[0].summary).toMatch(/adjudicataria/);
    expect(recs[0].external_ref).toBe("LICITACION:https://contrataciondelestado.es/sindicacion/licitacion/1001");
  });
  it("la prensa local entra por RSS, filtrada por fecha, y una cabecera caída no rompe la Ronda", async () => {
    const feed = new PrensaFeed(async (url) => { if (url.includes("caida")) throw new Error("HTTP 503"); return RSS_FIXTURE; }, ["https://caida.example/rss", "https://www.diariodesevilla.es/economia/rss.html"]);
    const recs = await feed.fetch({ zone: "Sevilla", since: new Date("2026-01-01") });
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ source: "PRENSA", external_ref: "PRENSA:ds-1", published_at: "2026-09-12" });
    const all = await new CompositeFeed([feed, new PlaceAwardsFeed(async () => PLACE_FIXTURE)]).fetch({ zone: "Sevilla", since: new Date("2026-01-01") });
    expect(all).toHaveLength(2);
  });
});

describe("Prueba de Valor (D-050)", () => {
  let candidacyId: string;
  let trialId: string;
  let trialCompanyId: string;

  it("solo la Directiva la inicia y solo con especialidad clasificada", async () => {
    const cand = (await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.companyName, "Redes del Sur Telecom") }))!;
    candidacyId = cand.id;
    await expect(startValueTrial(db, { chapterId, candidacyId, memberId: lucia().memberId })).rejects.toThrow(/Directiva/);
    const unclassified = (await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.companyName, "Beltrán Consultores") }))!;
    await expect(startValueTrial(db, { chapterId, candidacyId: unclassified.id, memberId: director().memberId })).rejects.toThrow(/especialidad/);
    const t = await startValueTrial(db, { chapterId, candidacyId, memberId: director().memberId });
    trialId = t.id;
    trialCompanyId = t.companyId;
    const company = (await db.query.companies.findFirst({ where: eq(schema.companies.id, t.companyId) }))!;
    expect(company.status).toBe("TRIAL");
    expect(await db.query.categorySeats.findFirst({ where: eq(schema.categorySeats.companyId, t.companyId) })).toBeUndefined();
    await expect(startValueTrial(db, { chapterId, candidacyId, memberId: director().memberId })).rejects.toThrow(/ya tiene/);
  });

  it("su Agente rastrea para los demás en la Ronda, pero nunca recibe Cesiones", async () => {
    const r = await runRonda(db, new Date(), new SampleFeed(SAMPLE_FEED));
    const cumbre = r.chapters.find((c) => c.chapterId === chapterId)!;
    expect(cumbre.rastreo.agents).toBe(11); // 10 titulares + la empresa en prueba
    // Reparto: la empresa en prueba, que nunca ha rastreado, recibe los registros de muestra.
    const drafts = await db.query.opportunitySignals.findMany({ where: eq(schema.opportunitySignals.originatorCompanyId, trialCompanyId) });
    expect(drafts.length).toBeGreaterThan(0);
    const sc = SCENARIOS.A;
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: sc.rawContent, contactName: sc.contactName, contactRole: sc.contactRole, legalBasisForContact: sc.legalBasisForContact });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const toTrial = await db.query.referrals.findMany({ where: eq(schema.referrals.receiverCompanyId, trialCompanyId) });
    expect(toTrial).toHaveLength(0);
    const claims = await db.query.matchCandidates.findMany({ where: and(eq(schema.matchCandidates.chapterId, chapterId), eq(schema.matchCandidates.receiverCompanyId, trialCompanyId)) });
    expect(claims).toHaveLength(0);
  });

  it("el informe tiene dos caras, las dos hacia los demás, y se publica con un enlace", async () => {
    const report = await generateValueTrialReport(db, trialId);
    expect(report.ceded.count).toBeGreaterThan(0);
    expect(report.ceded.receivers).toBeGreaterThan(0);
    for (const it of report.ceded.items) for (const n of it.needs) expect(n.specialties).not.toContain("Telecomunicaciones");
    expect(report.forYou.count).toBeGreaterThan(0); // el Indicio A de Guadalquivir tiene una necesidad de Telecomunicaciones
    expect(report.forYou.uncovered).toBeGreaterThan(0); // sin titular de Telecomunicaciones en la Sala
    expect(report.summary).toMatch(/Nadie en NS busca para sí/);
    const trial = (await getTrialByToken(db, (await db.query.valueTrials.findFirst({ where: eq(schema.valueTrials.id, trialId) }))!.token))!;
    expect(trial.report?.candidate.specialtyName).toBe("Telecomunicaciones");
    const listed = await listTrials(db, chapterId);
    expect(listed.get(candidacyId)?.drafts).toBeGreaterThan(0);
    expect(listed.get(candidacyId)?.day).toBe(1);
  });

  it("la norma 'para los demás' está entre las Normas NS que firma todo titular (D-049)", () => {
    expect(NORMAS_NS.map((n) => n.code)).toContain("PARA_LOS_DEMAS");
  });
});
