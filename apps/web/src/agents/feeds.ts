/**
 * Fuentes propias del Agente (D-038): el Timonel añade direcciones (RSS/Atom de prensa local, boletines,
 * portales de licitaciones) y su Agente las lee cada mañana en la Ronda, con el mismo circuito que el Rastreo.
 * Lector mínimo de RSS 2.0 y Atom sin dependencias; lo que no se entiende se ignora, nunca rompe la Ronda.
 */
import type { PublicFeed, PublicRecord } from "@/agents/rastreo";

export interface FeedItem {
  id: string;
  title: string;
  summary: string;
  url?: string;
  publishedAt?: string; // ISO
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " " };

export function cleanText(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

const tag = (block: string, name: string): string | undefined => {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : undefined;
};
const attr = (block: string, name: string, attribute: string): string | undefined => {
  const m = block.match(new RegExp(`<${name}\\b[^>]*\\b${attribute}="([^"]*)"[^>]*/?>`, "i"));
  return m ? m[1] : undefined;
};
const iso = (d: string | undefined): string | undefined => {
  if (!d) return undefined;
  const t = Date.parse(cleanText(d));
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
};

/** Extrae las entradas de un documento RSS 2.0 o Atom. Devuelve [] si no reconoce el formato. */
export function parseFeed(xml: string, limit = 50): FeedItem[] {
  const items: FeedItem[] = [];
  const rss = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const block of rss) {
    const title = cleanText(tag(block, "title"));
    if (!title) continue;
    const url = cleanText(tag(block, "link")) || undefined;
    items.push({ id: cleanText(tag(block, "guid")) || url || title, title, summary: cleanText(tag(block, "description") ?? tag(block, "content:encoded")).slice(0, 600), url, publishedAt: iso(tag(block, "pubDate") ?? tag(block, "dc:date")) });
  }
  if (items.length === 0) {
    const atom = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
    for (const block of atom) {
      const title = cleanText(tag(block, "title"));
      if (!title) continue;
      const url = attr(block, "link", "href") ?? undefined;
      items.push({ id: cleanText(tag(block, "id")) || url || title, title, summary: cleanText(tag(block, "summary") ?? tag(block, "content")).slice(0, 600), url, publishedAt: iso(tag(block, "updated") ?? tag(block, "published")) });
    }
  }
  return items.slice(0, limit);
}

export type FetchText = (url: string) => Promise<string>;

/** Lector por defecto: HTTP con tiempo máximo de 10 s y sin seguir más de lo razonable. */
export const fetchText: FetchText = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "user-agent": "NS-Network-Agent/0.1 (+https://networkspain.com)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5" }, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text.length > 2_000_000 ? text.slice(0, 2_000_000) : text;
  } finally {
    clearTimeout(timer);
  }
};

export interface OwnSource { id: string; label: string; url: string }

/** Una fuente propia vista como PublicFeed: cada entrada es un registro FUENTE_PROPIA con referencia estable. */
export class OwnSourceFeed implements PublicFeed {
  readonly name: string;
  constructor(private source: OwnSource, private reader: FetchText = fetchText) {
    this.name = `own:${source.id}`;
  }
  async fetch(opts: { zone: string; since: Date }): Promise<PublicRecord[]> {
    const xml = await this.reader(this.source.url);
    const items = parseFeed(xml);
    if (items.length === 0) throw new Error("No se reconoce como RSS o Atom, o no tiene entradas.");
    return items
      .filter((it) => !it.publishedAt || new Date(it.publishedAt) >= opts.since)
      .map((it) => ({
        external_ref: `FUENTE:${this.source.id}:${it.id.slice(0, 200)}`,
        source: "FUENTE_PROPIA" as const,
        title: `${it.title} · ${this.source.label}`,
        summary: it.summary || it.title,
        url: it.url,
        published_at: it.publishedAt ?? new Date().toISOString(),
      }));
  }
}
