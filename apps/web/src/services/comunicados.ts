/**
 * Protocolo II · Dar a Conocer (NS-ADP, D-018, D-070). Sencillez para la persona, herramienta por detrás:
 *  - Cada lunes el Agente redacta el Comunicado de cada empresa a partir del ADN (capas PUBLIC/CHAPTER) y de los hechos de la
 *    semana anterior (Cesiones cedidas, cierres contrastados, Encargos abiertos). Nunca inventa: cada dato lleva su origen.
 *  - El Timonel lo aprueba con un toque (en Hoy o desde el correo) y puede añadir una línea.
 *  - El viernes a las 14:00 (Madrid) cierra la semana: lo no aprobado se publica como continuidad (solo la parte estable) y el
 *    Chapter Intelligence compila la Gaceta. Nada espera a nadie (D-066).
 */
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { addWeeks, weekStart } from "@/core/compromiso";
import { PROTOCOLO_II, relevanceFor, renderComunicado, stableFromDna, weekClosed, weekLabel } from "@/core/comunicado";
import type { BusinessDNA, ComunicadoDelta } from "@/core/types";
import { openDemands } from "@/services/demands";
import { notifyComunicado } from "@/services/avisos";

type Comunicado = typeof schema.comunicados.$inferSelect;

async function specialtyOf(db: Db, companyId: string): Promise<string> {
  const seat = await db.select({ name: schema.specialties.name }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(and(eq(schema.categorySeats.companyId, companyId), eq(schema.categorySeats.status, "ACTIVE")));
  return seat.map((s) => s.name).join(" · ") || "sin plaza";
}

/** Los hechos de la semana anterior, verificables: lo cedido y lo contrastado. */
async function weekFacts(db: Db, chapterId: string, companyId: string, start: Date): Promise<ComunicadoDelta[]> {
  const prev = addWeeks(start, -1);
  const delta: ComunicadoDelta[] = [];
  const given = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.originatorCompanyId, companyId), gte(schema.referrals.createdAt, prev), lt(schema.referrals.createdAt, start)), columns: { id: true, state: true, receiverCompanyId: true } });
  const valid = given.filter((r) => !["DISQUALIFIED", "BLOCKED", "EXPIRED", "WITHDRAWN_BY_ORIGINATOR", "DETECTED", "INVESTIGATING", "AGENT_MATCHED", "QUALIFIED", "COMPLIANCE_CHECK"].includes(r.state));
  if (valid.length) delta.push({ kind: "GIVEN", text: `Cedió ${valid.length} referido${valid.length > 1 ? "s" : ""} a ${new Set(valid.map((r) => r.receiverCompanyId)).size} titular${new Set(valid.map((r) => r.receiverCompanyId)).size > 1 ? "es" : ""} de la Sala`, source: "VERIFIED" });
  const won = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), eq(schema.referrals.receiverCompanyId, companyId), eq(schema.referrals.state, "VALUE_CONFIRMED"), gte(schema.referrals.updatedAt, prev), lt(schema.referrals.updatedAt, start)), columns: { valueVerified: true } });
  const total = won.reduce((a, r) => a + (r.valueVerified ?? 0), 0);
  if (won.length) delta.push({ kind: "CASE_WON", text: `Cierre${won.length > 1 ? "s" : ""} contrastado${won.length > 1 ? "s" : ""} con la Sala: ${total.toLocaleString("es-ES")} €`, source: "VERIFIED" });
  return delta;
}

/** Redacta (una vez) el Comunicado de la semana de cada empresa activa con ADN. Idempotente. Devuelve cuántos ha creado. */
export async function draftComunicados(db: Db, chapterId: string, now = new Date()): Promise<number> {
  if (weekClosed(now)) return 0; // la semana ya cerró: el siguiente borrador sale el lunes
  const start = weekStart(now);
  const companies = await db.query.companies.findMany({ where: and(eq(schema.companies.chapterId, chapterId), eq(schema.companies.status, "ACTIVE")) });
  const existing = new Set((await db.query.comunicados.findMany({ where: and(eq(schema.comunicados.chapterId, chapterId), eq(schema.comunicados.weekStart, start)), columns: { companyId: true } })).map((c) => c.companyId));
  let created = 0;
  for (const company of companies) {
    if (existing.has(company.id)) continue;
    const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, company.id) });
    if (!dnaRow) continue;
    const previous = await db.query.comunicados.findFirst({ where: and(eq(schema.comunicados.companyId, company.id), lt(schema.comunicados.weekStart, start)), orderBy: [desc(schema.comunicados.weekStart)] });
    const stable = stableFromDna(dnaRow.dna, await specialtyOf(db, company.id));
    const delta = await weekFacts(db, chapterId, company.id, start);
    if (previous && previous.stable.capacity_now !== stable.capacity_now) delta.unshift({ kind: "CAPACITY", text: `Capacidad ${stable.capacity_now} (antes ${previous.stable.capacity_now})`, source: "INFERRED_FROM_DNA" });
    if (previous) for (const s of stable.offering) if (!previous.stable.offering.includes(s)) delta.unshift({ kind: "NEW_SERVICE", text: `Nuevo en su oferta: ${s}`, source: "INFERRED_FROM_DNA" });
    const encargos = (await openDemands(db, chapterId, company.id)).map((d) => d.text).slice(0, 3);
    const [row] = await db.insert(schema.comunicados).values({ chapterId, companyId: company.id, weekStart: start, stable, delta, encargos }).returning();
    await notifyComunicado(db, row, company.name);
    created++;
  }
  return created;
}

/** El Timonel aprueba con un toque y, si quiere, añade una línea. */
export async function approveComunicado(db: Db, input: { comunicadoId: string; memberId: string; note?: string }) {
  const c = await db.query.comunicados.findFirst({ where: eq(schema.comunicados.id, input.comunicadoId) });
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!c || !member || member.companyId !== c.companyId) throw new Error("Solo el Timonel de la empresa aprueba su Comunicado.");
  if (c.status !== "DRAFT") return c;
  const now = new Date();
  const note = input.note?.trim() || null;
  const delta = note ? [...c.delta, { kind: "NOTE" as const, text: note, source: "DECLARED_BY_MEMBER" as const }] : c.delta;
  await db.update(schema.comunicados).set({ status: "APPROVED", note, delta, approvedByMemberId: member.id, approvedAt: now, publishedAt: now }).where(eq(schema.comunicados.id, c.id));
  await db.insert(schema.trustEvents).values({ chapterId: c.chapterId, companyId: c.companyId, kind: "COMMUNIQUE_MET", weight: 0, evidenceRef: `comunicado:${c.id}` });
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, c.companyId) });
  await audit(db, { chapterId: c.chapterId, kind: "COMMUNIQUE_SENT", actor: { type: "USER", id: member.id }, subject: { type: "Comunicado", id: c.id }, policyApplied: "adp.approved", result: `${company?.name} aprobó su Comunicado de la semana ${weekLabel(c.weekStart)}${note ? ` y añadió: «${note}»` : ""}. Los Agentes de la Sala actualizan lo que saben de ella.`, significant: false, companyIds: [] });
  return { ...c, status: "APPROVED", note, delta };
}

/**
 * Cierre semanal: lo no aprobado se publica como continuidad (parte estable, sin afirmaciones nuevas) y sale la Gaceta.
 * Idempotente: una Gaceta por Sala y semana (evento GAZETTE_PUBLISHED).
 */
export async function closeWeek(db: Db, chapterId: string, now = new Date()): Promise<{ continuity: number; gazette: boolean }> {
  if (!weekClosed(now)) return { continuity: 0, gazette: false };
  const start = weekStart(now);
  const label = weekLabel(start);
  const already = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.kind, "GAZETTE_PUBLISHED"), eq(schema.auditEvents.subjectId, `${chapterId}:${label}`)) });
  if (already) return { continuity: 0, gazette: false };
  const drafts = await db.query.comunicados.findMany({ where: and(eq(schema.comunicados.chapterId, chapterId), eq(schema.comunicados.weekStart, start), eq(schema.comunicados.status, "DRAFT")) });
  for (const c of drafts) {
    // Continuidad: solo lo estable; el delta inferido no se publica como hecho sin visto bueno.
    await db.update(schema.comunicados).set({ status: "CONTINUITY", delta: c.delta.filter((d) => d.source === "VERIFIED"), publishedAt: now }).where(eq(schema.comunicados.id, c.id));
    await db.insert(schema.trustEvents).values({ chapterId, companyId: c.companyId, kind: "COMMUNIQUE_CONTINUITY", weight: 0, evidenceRef: `comunicado:${c.id}` });
    const streak = await continuityStreak(db, c.companyId, start);
    const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, c.companyId) });
    if (streak >= PROTOCOLO_II.continuityDirectorNotice) {
      const directors = await db.query.members.findMany({ where: and(eq(schema.members.chapterId, chapterId), eq(schema.members.isDirector, true)), columns: { companyId: true } });
      await audit(db, { chapterId, kind: "COMMUNIQUE_CONTINUITY", actor: { type: "AGENT", id: "adp" }, subject: { type: "Comunicado", id: c.id }, policyApplied: "adp.continuity.director_notice", result: `${company?.name} lleva ${streak} semanas sin aprobar su Comunicado: la Sala solo conoce de ella lo estable. Aviso a la Directiva.`, significant: true, companyIds: [...new Set([c.companyId, ...directors.map((d) => d.companyId)])] });
    } else if (streak >= PROTOCOLO_II.continuityAgentNotice) {
      await audit(db, { chapterId, kind: "COMMUNIQUE_CONTINUITY", actor: { type: "AGENT", id: "adp" }, subject: { type: "Comunicado", id: c.id }, policyApplied: "adp.continuity.agent_notice", result: `Segunda semana seguida sin aprobar tu Comunicado: se ha publicado solo lo estable. Un toque el lunes y la Sala sabrá qué hay de nuevo.`, significant: true, companyIds: [c.companyId] });
    } else {
      await audit(db, { chapterId, kind: "COMMUNIQUE_CONTINUITY", actor: { type: "AGENT", id: "adp" }, subject: { type: "Comunicado", id: c.id }, policyApplied: "adp.continuity", result: "Tu Comunicado salió sin revisar: solo lo estable. La Cesión no espera; la Gaceta tampoco.", significant: false, companyIds: [c.companyId] });
    }
  }
  const published = await db.query.comunicados.findMany({ where: and(eq(schema.comunicados.chapterId, chapterId), eq(schema.comunicados.weekStart, start)) });
  const approved = published.filter((c) => c.status === "APPROVED").length;
  const news = published.reduce((a, c) => a + c.delta.filter((d) => d.kind === "NEW_SERVICE" || d.kind === "NOTE").length, 0);
  const won = published.reduce((a, c) => a + c.delta.filter((d) => d.kind === "CASE_WON").length, 0);
  const encargos = published.reduce((a, c) => a + c.encargos.length, 0);
  await audit(db, { chapterId, kind: "GAZETTE_PUBLISHED", actor: { type: "AGENT", id: "chapter-intelligence" }, subject: { type: "Gaceta", id: `${chapterId}:${label}` }, policyApplied: "adp.gazette", result: `Gaceta · semana ${label}: ${published.length} Comunicados (${approved} aprobados, ${drafts.length} de continuidad) · ${news} novedades · ${won} cierres contrastados · ${encargos} Encargos abiertos. Mira "relevante para ti".`, significant: true, companyIds: [] });
  return { continuity: drafts.length, gazette: true };
}

async function continuityStreak(db: Db, companyId: string, start: Date): Promise<number> {
  const rows = await db.query.comunicados.findMany({ where: and(eq(schema.comunicados.companyId, companyId), inArray(schema.comunicados.status, ["APPROVED", "CONTINUITY"])), orderBy: [desc(schema.comunicados.weekStart)] });
  let streak = 1; // incluida la de esta semana
  for (const r of rows) {
    if (r.weekStart.getTime() >= start.getTime()) continue;
    if (r.status === "CONTINUITY") streak++;
    else break;
  }
  return streak;
}

/** Una pasada del Protocolo II para una Sala: borradores el lunes, cierre el viernes. Idempotente; la llama el Reloj. */
export async function runProtocoloII(db: Db, chapterId: string, now = new Date()): Promise<{ drafted: number; continuity: number; gazette: boolean }> {
  const drafted = await draftComunicados(db, chapterId, now);
  const closed = await closeWeek(db, chapterId, now);
  return { drafted, ...closed };
}

export interface ComunicadoStatus {
  comunicado: Comunicado | null;
  text: string | null;
  week: string;
  closed: boolean;
}

/** Lo que ve el Timonel en Hoy: su Comunicado de esta semana y en qué punto está. */
export async function comunicadoStatus(db: Db, companyId: string, now = new Date()): Promise<ComunicadoStatus> {
  const start = weekStart(now);
  const c = (await db.query.comunicados.findFirst({ where: and(eq(schema.comunicados.companyId, companyId), eq(schema.comunicados.weekStart, start)) })) ?? null;
  const company = c ? await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) }) : null;
  return { comunicado: c, text: c ? renderComunicado(c, company?.name ?? "") : null, week: weekLabel(start), closed: weekClosed(now) };
}

export interface GacetaEntry {
  comunicado: Comunicado;
  companyName: string;
  companySlug: string;
  text: string;
  why: string | null;
  score: number;
}

export interface Gaceta {
  week: string;
  weekStart: Date;
  published: boolean;
  relevant: GacetaEntry[];
  all: GacetaEntry[];
  totals: { comunicados: number; approved: number; continuity: number; news: number; won: number; encargos: number };
}

/** La Gaceta de la última semana cerrada (o de la actual si ya cerró), con "relevante para ti" según el ADN del lector. */
export async function gaceta(db: Db, chapterId: string, forCompanyId: string, now = new Date()): Promise<Gaceta> {
  const current = weekStart(now);
  const closed = weekClosed(now);
  const candidate = closed ? current : addWeeks(current, -1);
  const rows = await db.query.comunicados.findMany({ where: and(eq(schema.comunicados.chapterId, chapterId), eq(schema.comunicados.weekStart, candidate), inArray(schema.comunicados.status, ["APPROVED", "CONTINUITY"])) });
  // Sin Gaceta publicada todavía (Sala nueva): se habla de la semana en curso, que es la que saldrá el viernes.
  const start = rows.length || closed ? candidate : current;
  const companies = new Map((await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapterId) })).map((c) => [c.id, c]));
  const mine = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, forCompanyId) }))?.dna as BusinessDNA | undefined;
  const entries: GacetaEntry[] = rows.map((c) => {
    const company = companies.get(c.companyId);
    const rel = mine && c.companyId !== forCompanyId ? relevanceFor(c, mine) : { score: 0, why: null };
    return { comunicado: c, companyName: company?.name ?? "", companySlug: company?.slug ?? "", text: renderComunicado(c, company?.name ?? ""), why: rel.why, score: rel.score };
  }).sort((a, b) => a.companyName.localeCompare(b.companyName, "es"));
  const relevant = entries.filter((e) => e.score > 0 && e.why).sort((a, b) => b.score - a.score).slice(0, 5);
  return {
    week: weekLabel(start),
    weekStart: start,
    published: rows.length > 0,
    relevant,
    all: entries,
    totals: {
      comunicados: rows.length,
      approved: rows.filter((c) => c.status === "APPROVED").length,
      continuity: rows.filter((c) => c.status === "CONTINUITY").length,
      news: rows.reduce((a, c) => a + c.delta.filter((d) => d.kind === "NEW_SERVICE" || d.kind === "NOTE").length, 0),
      won: rows.reduce((a, c) => a + c.delta.filter((d) => d.kind === "CASE_WON").length, 0),
      encargos: rows.reduce((a, c) => a + c.encargos.length, 0),
    },
  };
}

/** Histórico de Comunicados de una empresa para su Dossier (los publicados, más recientes primero). */
export async function comunicadoHistory(db: Db, companyId: string, limit = 6) {
  const rows = await db.query.comunicados.findMany({ where: and(eq(schema.comunicados.companyId, companyId), inArray(schema.comunicados.status, ["APPROVED", "CONTINUITY"])), orderBy: [desc(schema.comunicados.weekStart)], limit });
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) });
  return rows.map((c) => ({ ...c, week: weekLabel(c.weekStart), text: renderComunicado(c, company?.name ?? "") }));
}
