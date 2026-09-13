/**
 * Fuentes propias del Agente (D-038). El Timonel las añade en su Dossier; la Ronda las lee cada mañana.
 * Un fallo de lectura se anota en la fuente y no detiene nada.
 */
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { runRastreo } from "@/agents/rastreo";
import { OwnSourceFeed, fetchText as defaultFetch, type FetchText } from "@/agents/feeds";

export const MAX_SOURCES_PER_AGENT = 12;

export class SourceError extends Error {}

export function normalizeSourceUrl(raw: string): string {
  const v = raw.trim();
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    throw new SourceError("La dirección no es válida.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new SourceError("Solo se admiten direcciones http o https.");
  if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(u.hostname) || !u.hostname.includes(".")) throw new SourceError("La dirección debe ser pública.");
  return u.toString();
}

export async function listSources(db: Db, companyId: string) {
  return db.query.agentSources.findMany({ where: and(eq(schema.agentSources.companyId, companyId), eq(schema.agentSources.active, true)), orderBy: [asc(schema.agentSources.createdAt)] });
}

export async function addSource(db: Db, input: { companyId: string; memberId: string; label: string; url: string }) {
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, input.companyId) });
  if (!company) throw new SourceError("Empresa no encontrada.");
  const label = input.label.trim().slice(0, 80);
  if (label.length < 2) throw new SourceError("Ponle un nombre corto a la fuente.");
  const url = normalizeSourceUrl(input.url);
  const existing = await listSources(db, input.companyId);
  if (existing.some((s) => s.url === url)) throw new SourceError("Tu Agente ya lee esa fuente.");
  if (existing.length >= MAX_SOURCES_PER_AGENT) throw new SourceError(`Un Agente lee como máximo ${MAX_SOURCES_PER_AGENT} fuentes propias.`);
  const [row] = await db.insert(schema.agentSources).values({ chapterId: company.chapterId, companyId: input.companyId, label, url, createdByMemberId: input.memberId }).returning();
  await audit(db, { chapterId: company.chapterId, kind: "SOURCE_ADDED", actor: { type: "USER", id: input.memberId }, subject: { type: "AgentSource", id: row.id }, result: `${company.name} añadió la fuente "${label}" a su Agente.`, significant: false, companyIds: [company.id] });
  return row;
}

export async function removeSource(db: Db, companyId: string, sourceId: string) {
  const src = await db.query.agentSources.findFirst({ where: eq(schema.agentSources.id, sourceId) });
  if (!src || src.companyId !== companyId) throw new SourceError("Solo el titular retira sus fuentes.");
  await db.update(schema.agentSources).set({ active: false }).where(eq(schema.agentSources.id, sourceId));
}

export interface OwnSourcesResult { sources: number; drafts: number; errors: number }

/** El Agente de la empresa lee todas sus fuentes propias. Cada fuente anota su último resultado. */
export async function runOwnSources(db: Db, companyId: string, reader: FetchText = defaultFetch): Promise<OwnSourcesResult> {
  const sources = await listSources(db, companyId);
  const out: OwnSourcesResult = { sources: sources.length, drafts: 0, errors: 0 };
  for (const src of sources) {
    const now = new Date();
    try {
      const r = await runRastreo(db, companyId, new OwnSourceFeed(src, reader), new Date(now.getTime() - 30 * 86_400_000));
      out.drafts += r.ingested.length;
      await db.update(schema.agentSources).set({ lastFetchedAt: now, lastStatus: `ok · ${r.ingested.length + r.skipped} entradas, ${r.ingested.length} nueva(s) con posible negocio` }).where(eq(schema.agentSources.id, src.id));
    } catch (e) {
      out.errors++;
      const msg = e instanceof Error ? e.message : "error desconocido";
      await db.update(schema.agentSources).set({ lastFetchedAt: now, lastStatus: `error · ${msg.slice(0, 160)}` }).where(eq(schema.agentSources.id, src.id));
    }
  }
  return out;
}
