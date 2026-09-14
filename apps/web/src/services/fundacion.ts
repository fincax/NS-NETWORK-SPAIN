/**
 * Fundación de una Sala nueva (D-041).
 *
 * Cuando una empresa quiere entrar y su plaza está ocupada, NS no le dice que no: le ofrece ser la Promotora
 * de la siguiente Sala de la zona. La Promotora y las empresas que se le suman esperan juntas en la Antesala.
 * Al alcanzar el mínimo, la Directiva funda la Sala (nombre propio con prefijo NS, nunca territorial, D-014)
 * y la Promotora recibe la gratificación de fundación que NS anuncia.
 */
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { NSCAT, SPECIALTY_NAME } from "@/db/nscat";
import { CITIES } from "@/agents/deterministic";

/** Mínimo de fundadoras para abrir una Sala (D-006: 12–15). "A determinar en la práctica", por eso vive en la fundación, no en el código. */
export const FOUNDING_MIN_DEFAULT = 12;
/** Gratificación propuesta. El fundador fija la definitiva y NS la anuncia; nunca es dinero por referidos (D-010). */
export const FOUNDING_REWARD_DEFAULT = "3 meses de cuota gratis para la Promotora";

export class FoundingError extends Error {}

export type Founding = typeof schema.chapterFoundings.$inferSelect;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PLACE_WORDS = ["sevilla", "madrid", "barcelona", "malaga", "valencia", "cadiz", "huelva", "cordoba", "granada", "jaen", "almeria", "andalucia", "espana", "spain", "portugal", "triana", "nervion", "macarena", "aljarafe", "centro", "norte", "sur", "este", "oeste", "provincia", "distrito", "barrio"];

/** D-014: prefijo NS, nombre propio, nunca una ciudad, barrio, provincia, región o país. */
export function validateChapterName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!/^NS\s+\S/.test(name)) throw new FoundingError('El nombre de la Sala empieza por "NS " seguido de un nombre propio: "NS Ágora".');
  const proper = name.slice(3);
  if (proper.length < 3 || proper.length > 30) throw new FoundingError("El nombre propio tiene entre 3 y 30 caracteres.");
  const n = norm(proper);
  if (PLACE_WORDS.some((w) => new RegExp(`\\b${w}\\b`).test(n)) || CITIES.some((c) => new RegExp(`\\b${norm(c)}\\b`).test(n))) throw new FoundingError("La Sala no es territorial (D-014): el nombre no puede ser una ciudad, barrio, provincia, región ni país. El nombre de la ciudad es de NS.");
  return name;
}

export async function listFoundings(db: Db, zoneId: string) {
  const rows = await db.query.chapterFoundings.findMany({ where: and(eq(schema.chapterFoundings.zoneId, zoneId), inArray(schema.chapterFoundings.status, ["OPEN", "READY", "ACTIVATED"])), orderBy: [asc(schema.chapterFoundings.createdAt)] });
  return Promise.all(rows.map((f) => foundingProgress(db, f)));
}

export async function foundingProgress(db: Db, f: Founding) {
  const members = await db.query.betaRequests.findMany({ where: and(eq(schema.betaRequests.foundingId, f.id), inArray(schema.betaRequests.status, ["FOUNDING", "APPROVED", "ACTIVATED"])), orderBy: [asc(schema.betaRequests.createdAt)] });
  const promoter = members.find((m) => m.id === f.promoterCandidacyId) ?? (await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.id, f.promoterCandidacyId) }));
  const specialties = [...new Set(members.map((m) => m.specialtyCode).filter((x): x is string => !!x))];
  const chapter = f.chapterId ? await db.query.chapters.findFirst({ where: eq(schema.chapters.id, f.chapterId) }) : undefined;
  return { founding: f, members, promoter, count: members.length, specialties, missing: Math.max(0, f.minMembers - members.length), ready: members.length >= f.minMembers, chapter };
}

async function director(db: Db, memberId: string) {
  const m = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (!m?.isDirector) throw new FoundingError("Solo la Directiva gestiona las fundaciones.");
  return m;
}

/** La candidatura con plaza ocupada pasa a Promotora de una Sala nueva en la zona. */
export async function startFounding(db: Db, input: { zoneId: string; candidacyId: string; memberId: string; minMembers?: number }) {
  const m = await director(db, input.memberId);
  const c = await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.id, input.candidacyId) });
  if (!c) throw new FoundingError("Candidatura no encontrada.");
  if (c.foundingId) throw new FoundingError("Esta candidatura ya forma parte de una Sala en fundación.");
  if (["DECLINED", "ACTIVATED"].includes(c.status)) throw new FoundingError("Una candidatura declinada o ya activa no puede promover una Sala.");
  const zone = await db.query.zones.findFirst({ where: eq(schema.zones.id, input.zoneId) });
  if (!zone) throw new FoundingError("Zona no encontrada.");
  const [f] = await db.insert(schema.chapterFoundings).values({ zoneId: zone.id, promoterCandidacyId: c.id, minMembers: input.minMembers ?? FOUNDING_MIN_DEFAULT, rewardText: FOUNDING_REWARD_DEFAULT, createdByMemberId: m.id }).returning();
  await db.update(schema.betaRequests).set({ foundingId: f.id, status: "FOUNDING", reviewedBy: m.id, updatedAt: new Date() }).where(eq(schema.betaRequests.id, c.id));
  await audit(db, { chapterId: m.chapterId, kind: "FOUNDING_STARTED", actor: { type: "USER", id: m.id }, subject: { type: "ChapterFounding", id: f.id }, policyApplied: "founding.promoter", result: `${c.companyName} pasa a Promotora de una nueva Sala en ${zone.name}. Mínimo: ${f.minMembers} fundadoras. Gratificación anunciada: ${f.rewardText}.`, significant: true });
  return f;
}

/** Otra candidatura (normalmente con plaza ocupada) se suma a la Sala en fundación. Una especialidad, una fundadora. */
export async function joinFounding(db: Db, input: { foundingId: string; candidacyId: string; memberId: string }) {
  const m = await director(db, input.memberId);
  const f = await db.query.chapterFoundings.findFirst({ where: eq(schema.chapterFoundings.id, input.foundingId) });
  if (!f || !["OPEN", "READY"].includes(f.status)) throw new FoundingError("Esa Sala en fundación no admite más fundadoras.");
  const c = await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.id, input.candidacyId) });
  if (!c) throw new FoundingError("Candidatura no encontrada.");
  if (c.foundingId) throw new FoundingError("Esta candidatura ya forma parte de una Sala en fundación.");
  if (["DECLINED", "ACTIVATED"].includes(c.status)) throw new FoundingError("Una candidatura declinada o ya activa no puede sumarse.");
  const progress = await foundingProgress(db, f);
  if (c.specialtyCode && progress.specialties.includes(c.specialtyCode)) throw new FoundingError(`La Sala en fundación ya tiene fundadora de ${SPECIALTY_NAME[c.specialtyCode] ?? c.specialtyCode}: una plaza por especialidad también antes de nacer.`);
  await db.update(schema.betaRequests).set({ foundingId: f.id, status: "FOUNDING", reviewedBy: m.id, updatedAt: new Date() }).where(eq(schema.betaRequests.id, c.id));
  const after = await foundingProgress(db, f);
  if (after.ready && f.status === "OPEN") {
    await db.update(schema.chapterFoundings).set({ status: "READY", updatedAt: new Date() }).where(eq(schema.chapterFoundings.id, f.id));
    await audit(db, { chapterId: m.chapterId, kind: "FOUNDING_READY", actor: { type: "SYSTEM", id: "founding" }, subject: { type: "ChapterFounding", id: f.id }, result: `La Sala en fundación promovida por ${after.promoter?.companyName ?? "una Promotora"} alcanza ${after.count} fundadoras: lista para fundarse.`, significant: true });
  }
  return after;
}

/** Con el mínimo alcanzado, la Directiva funda la Sala: nombre autorizado, plazas creadas, gratificación a la Promotora. */
export async function activateFounding(db: Db, input: { foundingId: string; name: string; memberId: string }) {
  const m = await director(db, input.memberId);
  const f = await db.query.chapterFoundings.findFirst({ where: eq(schema.chapterFoundings.id, input.foundingId) });
  if (!f) throw new FoundingError("Fundación no encontrada.");
  if (f.status === "ACTIVATED") throw new FoundingError("Esta Sala ya está fundada.");
  const progress = await foundingProgress(db, f);
  if (!progress.ready) throw new FoundingError(`Faltan ${progress.missing} fundadoras para llegar al mínimo de ${f.minMembers}.`);
  const name = validateChapterName(input.name);
  const slug = norm(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (await db.query.chapters.findFirst({ where: eq(schema.chapters.slug, slug) })) throw new FoundingError("Ya existe una Sala con ese nombre en la red: el nombre es único (D-014).");
  const [chapter] = await db.insert(schema.chapters).values({ zoneId: f.zoneId, name, slug, nameStatus: "PROPOSED", status: "FORMING" }).returning();
  for (const s of NSCAT) {
    const sp = await db.query.specialties.findFirst({ where: eq(schema.specialties.nscatCode, s.code) });
    if (sp) await db.insert(schema.categorySeats).values({ chapterId: chapter.id, specialtyId: sp.id, status: "VACANT" });
  }
  const now = new Date();
  await db.update(schema.chapterFoundings).set({ status: "ACTIVATED", proposedName: name, chapterId: chapter.id, rewardGrantedAt: now, updatedAt: now }).where(eq(schema.chapterFoundings.id, f.id));
  await db.update(schema.betaRequests).set({ status: "APPROVED", decidedAt: now, updatedAt: now }).where(and(eq(schema.betaRequests.foundingId, f.id), eq(schema.betaRequests.status, "FOUNDING")));
  await audit(db, { chapterId: chapter.id, kind: "CHAPTER_FOUNDED", actor: { type: "USER", id: m.id }, subject: { type: "Chapter", id: chapter.id }, policyApplied: "founding.min_members", result: `Nace ${name} con ${progress.count} fundadoras. Nombre pendiente de autorización de NS.`, significant: true });
  await audit(db, { chapterId: chapter.id, kind: "FOUNDING_REWARD", actor: { type: "SYSTEM", id: "founding" }, subject: { type: "Candidacy", id: f.promoterCandidacyId }, policyApplied: "founding.reward", result: `Gratificación de fundación para ${progress.promoter?.companyName ?? "la Promotora"}: ${f.rewardText}.`, significant: true });
  return { chapter, founding: { ...f, status: "ACTIVATED", chapterId: chapter.id } };
}
