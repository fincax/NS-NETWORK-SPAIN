/**
 * Fuentes públicas reales para el Rastreo (D-051). Cada adaptador implementa `PublicFeed` y solo produce registros
 * que sirvan para ceder a otros (D-049): hechos de empresas terceras que anticipan necesidades. Nunca "oportunidades
 * para ti" (una licitación abierta a la que un miembro podría presentarse no entra en NS: sería negocio propio).
 *
 *  - PLACE (Plataforma de Contratación del Sector Público): solo ADJUDICACIONES con adjudicatario en la provincia
 *    de Sevilla: la empresa que gana un contrato tendrá necesidades (personal, seguros, subcontratas, financiación).
 *  - Prensa local: RSS de economía de cabeceras sevillanas. El modelo extrae después los Indicios.
 *
 * Los lectores no siguen scripts ni dependencias: expresiones regulares sobre XML, tolerantes a lo que no entienden.
 * Sin red (pruebas, sandbox) se alimentan con fixtures; en el servidor, con NS_PUBLIC_FEEDS=real.
 */
import { parseFeed, cleanText, fetchText, type FetchText } from "@/agents/feeds";
import { SampleFeed, type PublicFeed, type PublicRecord } from "@/agents/rastreo";

const tagNs = (block: string, local: string): string | undefined => {
  const m = block.match(new RegExp(`<(?:[\\w-]+:)?${local}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${local}>`, "i"));
  return m ? m[1] : undefined;
};
const allTagNs = (block: string, local: string): string[] => {
  const re = new RegExp(`<(?:[\\w-]+:)?${local}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${local}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) out.push(m[1]);
  return out;
};

export const PLACE_ATOM_URL = "https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom";

export interface PlaceAward {
  id: string;
  title: string;
  contractingParty: string;
  winner: string;
  amount?: number;
  city?: string;
  province?: string;
  cpv: string[];
  url?: string;
  updated?: string;
}

/** Extrae de un Atom de PLACE las entradas con resultado de adjudicación. */
export function parsePlaceAwards(xml: string): PlaceAward[] {
  const out: PlaceAward[] = [];
  for (const entry of xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? []) {
    const folder = tagNs(entry, "ContractFolderStatus") ?? entry;
    const result = tagNs(folder, "TenderResult");
    if (!result) continue;
    const winnerBlock = tagNs(result, "WinningParty");
    const winner = cleanText(winnerBlock ? tagNs(tagNs(winnerBlock, "PartyName") ?? winnerBlock, "Name") : undefined);
    if (!winner) continue;
    const project = tagNs(folder, "ProcurementProject") ?? "";
    const location = tagNs(project, "RealizedLocation") ?? "";
    const party = tagNs(folder, "LocatedContractingParty") ?? "";
    const amountRaw = cleanText(tagNs(result, "AwardedTenderedProject") ? tagNs(tagNs(result, "AwardedTenderedProject")!, "TaxExclusiveAmount") : tagNs(project, "TotalAmount"));
    const amount = amountRaw ? Number(amountRaw.replace(/[^\d.,]/g, "").replace(",", ".")) : undefined;
    const linkAttr = entry.match(/<link\b[^>]*\bhref="([^"]*)"/i);
    out.push({
      id: cleanText(tagNs(entry, "id")) || cleanText(tagNs(folder, "ContractFolderID")) || winner,
      title: cleanText(tagNs(project, "Name")) || cleanText(tagNs(entry, "title")),
      contractingParty: cleanText(tagNs(tagNs(party, "PartyName") ?? party, "Name")),
      winner,
      amount: amount && Number.isFinite(amount) ? amount : undefined,
      city: cleanText(tagNs(location, "CityName")) || undefined,
      province: cleanText(tagNs(location, "CountrySubentity")) || undefined,
      cpv: allTagNs(folder, "ItemClassificationCode").map(cleanText).filter(Boolean),
      url: linkAttr?.[1],
      updated: cleanText(tagNs(entry, "updated")) || undefined,
    });
  }
  return out;
}

const inZone = (zone: string, ...fields: (string | undefined)[]) => {
  const z = zone.toLowerCase();
  return fields.some((f) => f && f.toLowerCase().includes(z));
};

/** Adjudicaciones de PLACE en la zona: la adjudicataria es la que va a necesitar cosas. */
export class PlaceAwardsFeed implements PublicFeed {
  readonly name = "place:adjudicaciones";
  constructor(private reader: FetchText = fetchText, private url = PLACE_ATOM_URL) {}
  async fetch(opts: { zone: string; since: Date }): Promise<PublicRecord[]> {
    const xml = await this.reader(this.url);
    return parsePlaceAwards(xml)
      .filter((a) => inZone(opts.zone, a.province, a.city, a.contractingParty))
      .filter((a) => !a.updated || new Date(a.updated) >= opts.since)
      .map((a) => ({
        external_ref: `LICITACION:${a.id}`,
        source: "LICITACION" as const,
        title: `Adjudicación · ${a.title}`,
        summary: `${a.winner} resulta adjudicataria de "${a.title}" (${a.contractingParty})${a.amount ? ` por ${Math.round(a.amount).toLocaleString("es-ES")} €` : ""}${a.city ? ` en ${a.city}` : ""}.${a.cpv.length ? ` CPV ${a.cpv.slice(0, 3).join(", ")}.` : ""} Como adjudicataria, previsiblemente ampliará plantilla, seguros, subcontratas o financiación.`,
        company_name: a.winner,
        city: a.city ?? opts.zone,
        url: a.url,
        published_at: (a.updated ?? new Date().toISOString()).slice(0, 10),
      }));
  }
}

export const PRENSA_SEVILLA_URLS = [
  "https://www.diariodesevilla.es/economia/rss.html",
  "https://sevilla.abc.es/rss/atom/economia/",
  "https://elcorreoweb.es/rss/economia",
];

/** Prensa económica local: el modelo extrae después los Indicios (nueva sede, ampliación, ronda, expansión). */
export class PrensaFeed implements PublicFeed {
  readonly name = "prensa:sevilla";
  constructor(private reader: FetchText = fetchText, private urls = PRENSA_SEVILLA_URLS) {}
  async fetch(opts: { zone: string; since: Date }): Promise<PublicRecord[]> {
    const out: PublicRecord[] = [];
    for (const url of this.urls) {
      let xml = "";
      try {
        xml = await this.reader(url);
      } catch {
        continue; // una cabecera caída nunca rompe la Ronda
      }
      for (const item of parseFeed(xml, 40)) {
        if (item.publishedAt && new Date(item.publishedAt) < opts.since) continue;
        out.push({ external_ref: `PRENSA:${item.id}`, source: "PRENSA", title: item.title, summary: item.summary || item.title, city: opts.zone, url: item.url, published_at: (item.publishedAt ?? new Date().toISOString()).slice(0, 10) });
      }
    }
    return out;
  }
}

export class CompositeFeed implements PublicFeed {
  readonly name: string;
  constructor(private feeds: PublicFeed[]) {
    this.name = feeds.map((f) => f.name).join("+");
  }
  async fetch(opts: { zone: string; since: Date }): Promise<PublicRecord[]> {
    const out: PublicRecord[] = [];
    for (const f of this.feeds) {
      try {
        out.push(...(await f.fetch(opts)));
      } catch {
        // la fuente que falla se salta; el resto sigue
      }
    }
    return out;
  }
}

/** NS_PUBLIC_FEEDS=real → PLACE + prensa; en cualquier otro caso, el lote de muestra (demo, pruebas). */
export function defaultPublicFeed(reader: FetchText = fetchText): PublicFeed {
  if (process.env.NS_PUBLIC_FEEDS === "real") return new CompositeFeed([new PlaceAwardsFeed(reader), new PrensaFeed(reader)]);
  return new SampleFeed();
}
