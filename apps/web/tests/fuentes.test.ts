/** Fuentes propias del Agente (D-038): lector RSS/Atom, alta y baja, lectura en la Ronda, fallos sin ruido. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { parseFeed, cleanText, OwnSourceFeed } from "@/agents/feeds";
import { addSource, listSources, removeSource, runOwnSources, SourceError, normalizeSourceUrl } from "@/services/sources";
import { runRonda } from "@/services/ronda";
import { SampleFeed } from "@/agents/rastreo";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

const RSS = `<?xml version="1.0"?><rss version="2.0"><channel><title>Economía Sevilla</title>
<item><title>Cerámicas del Sur amplía su planta en Dos Hermanas</title><link>https://prensa.test/a1</link><guid>a1</guid><pubDate>Fri, 11 Sep 2026 08:00:00 GMT</pubDate><description><![CDATA[La empresa levantará una <b>nave nueva</b> de 2.400 m&sup2; y contratará 40 empleados. Presupuesto de obra aprobado.]]></description></item>
<item><title>El tiempo para el fin de semana</title><link>https://prensa.test/a2</link><guid>a2</guid><pubDate>Fri, 11 Sep 2026 09:00:00 GMT</pubDate><description>Sol y 34 grados.</description></item>
<item><title>Noticia vieja</title><link>https://prensa.test/a0</link><guid>a0</guid><pubDate>Mon, 01 Jan 2024 09:00:00 GMT</pubDate><description>Una empresa abre nueva sede.</description></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Licitaciones</title>
<entry><id>urn:x:1</id><title>Adjudicación · mantenimiento integral de instalaciones</title><link href="https://lic.test/1"/><updated>2026-09-12T10:00:00Z</updated><summary>Mantenimientos Giralda resulta adjudicataria por 4 años; necesitará ampliar plantilla y responsabilidad civil.</summary></entry>
</feed>`;

let db: Db;
let companyId: string;
let memberId: string;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  companyId = r.companies["hispalis"].companyId;
  memberId = r.companies["hispalis"].memberId;
});
afterAll(async () => {
  await closeDb();
});

describe("Lector de fuentes", () => {
  it("entiende RSS 2.0 y Atom y limpia el HTML", () => {
    const rss = parseFeed(RSS);
    expect(rss.map((i) => i.id)).toEqual(["a1", "a2", "a0"]);
    expect(rss[0].summary).toBe("La empresa levantará una nave nueva de 2.400 m&sup2; y contratará 40 empleados. Presupuesto de obra aprobado.");
    expect(rss[0].publishedAt).toBe("2026-09-11T08:00:00.000Z");
    const atom = parseFeed(ATOM);
    expect(atom).toHaveLength(1);
    expect(atom[0].url).toBe("https://lic.test/1");
    expect(parseFeed("<html><body>no soy un feed</body></html>")).toEqual([]);
    expect(cleanText("<p>Hola &amp; adi&#243;s</p>")).toBe("Hola & adiós");
  });
  it("convierte las entradas en registros FUENTE_PROPIA y respeta la fecha", async () => {
    const feed = new OwnSourceFeed({ id: "src1", label: "Economía Sevilla", url: "https://prensa.test/rss" }, async () => RSS);
    const recs = await feed.fetch({ zone: "Sevilla", since: new Date("2026-01-01") });
    expect(recs.map((r) => r.external_ref)).toEqual(["FUENTE:src1:a1", "FUENTE:src1:a2"]);
    expect(recs[0].source).toBe("FUENTE_PROPIA");
    expect(recs[0].title).toContain("Economía Sevilla");
  });
});

describe("Fuentes propias del Agente", () => {
  it("valida direcciones y evita duplicados", async () => {
    expect(normalizeSourceUrl("prensa.test/rss")).toBe("https://prensa.test/rss");
    expect(() => normalizeSourceUrl("ftp://x.test/a")).toThrow(SourceError);
    expect(() => normalizeSourceUrl("http://localhost/rss")).toThrow(SourceError);
    await addSource(db, { companyId, memberId, label: "Economía Sevilla", url: "https://prensa.test/rss" });
    await expect(addSource(db, { companyId, memberId, label: "Otra vez", url: "https://prensa.test/rss" })).rejects.toBeInstanceOf(SourceError);
    await addSource(db, { companyId, memberId, label: "Licitaciones", url: "https://lic.test/atom" });
    await addSource(db, { companyId, memberId, label: "Caída", url: "https://caida.test/rss" });
    expect((await listSources(db, companyId)).map((s) => s.label)).toEqual(["Economía Sevilla", "Licitaciones", "Caída"]);
  });
  it("las lee, deja Indicios en borrador solo con posible negocio y anota los fallos sin detenerse", async () => {
    const reader = async (url: string) => {
      if (url.includes("prensa")) return RSS;
      if (url.includes("lic.test")) return ATOM;
      throw new Error("ECONNREFUSED");
    };
    const r = await runOwnSources(db, companyId, reader);
    expect(r.sources).toBe(3);
    expect(r.errors).toBe(1);
    expect(r.drafts).toBeGreaterThanOrEqual(2); // la nave nueva y la adjudicación; el tiempo no
    const sources = await listSources(db, companyId);
    expect(sources.find((s) => s.label === "Caída")?.lastStatus).toMatch(/^error · ECONNREFUSED/);
    expect(sources.find((s) => s.label === "Economía Sevilla")?.lastStatus).toMatch(/^ok · 2 entradas, 1 nueva/);
    const records = await db.query.publicRecords.findMany({ where: eq(schema.publicRecords.source, "FUENTE_PROPIA") });
    const weather = records.find((x) => x.externalRef === "FUENTE:" + sources[0].id + ":a2");
    expect(weather?.opportunitySignalId ?? null).toBeNull(); // se recuerda para no releerla, pero no genera Indicio
    // idempotente
    const again = await runOwnSources(db, companyId, reader);
    expect(again.drafts).toBe(0);
  });
  it("la Ronda incluye las fuentes propias y una fuente retirada deja de leerse", async () => {
    const sources = await listSources(db, companyId);
    await removeSource(db, companyId, sources.find((s) => s.label === "Caída")!.id);
    await expect(removeSource(db, "00000000-0000-0000-0000-000000000000", sources[0].id)).rejects.toBeInstanceOf(SourceError);
    const r = await runRonda(db, new Date(), new SampleFeed([]), async () => RSS);
    const cumbre = r.chapters[0];
    expect(cumbre.ownSources.sources).toBe(2);
    expect(cumbre.ownSources.errors).toBe(0);
  });
});
