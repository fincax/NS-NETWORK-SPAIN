/**
 * Antesala · candidaturas a una Sala (D-035).
 *
 * Una candidatura llega desde la portada pública (beta_requests) y la Directiva la despacha.
 * El sistema calcula el veredicto de plaza (vacante, ocupada, solapada, sin clasificar, duplicada)
 * para que la Directiva decida con un toque. Toda transición queda en el audit log.
 */
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { NSCAT, SPECIALTY_NAME } from "@/db/nscat";

export type CandidacyStatus = "NEW" | "CONTACTED" | "INTERVIEW" | "APPROVED" | "WAITLISTED" | "FOUNDING" | "DECLINED" | "ACTIVATED";

export const CANDIDACY_LABEL: Record<CandidacyStatus, string> = {
  NEW: "Nueva",
  CONTACTED: "Contactada",
  INTERVIEW: "Entrevistada",
  APPROVED: "Plaza aprobada",
  WAITLISTED: "En la Antesala",
  FOUNDING: "En fundación",
  DECLINED: "Declinada",
  ACTIVATED: "Titular activo",
};

/** Transiciones que la Directiva puede hacer desde cada estado. ACTIVATED solo lo pone el alta. */
export const CANDIDACY_TRANSITIONS: Record<CandidacyStatus, CandidacyStatus[]> = {
  NEW: ["CONTACTED", "INTERVIEW", "WAITLISTED", "DECLINED"],
  CONTACTED: ["INTERVIEW", "WAITLISTED", "DECLINED"],
  INTERVIEW: ["APPROVED", "WAITLISTED", "DECLINED"],
  WAITLISTED: ["APPROVED", "INTERVIEW", "DECLINED"],
  APPROVED: ["WAITLISTED", "DECLINED"],
  FOUNDING: ["DECLINED"], // se sale de la fundación declinando; el resto lo gestiona services/fundacion.ts
  DECLINED: ["NEW"],
  ACTIVATED: [],
};

export const PENDING_STATUSES: CandidacyStatus[] = ["NEW", "CONTACTED", "INTERVIEW"];

export type CandidacyView = "pendientes" | "espera" | "aprobadas" | "declinadas" | "todas";

export const VIEW_STATUSES: Record<CandidacyView, CandidacyStatus[] | null> = {
  pendientes: PENDING_STATUSES,
  espera: ["WAITLISTED", "FOUNDING"],
  aprobadas: ["APPROVED", "ACTIVATED"],
  declinadas: ["DECLINED"],
  todas: null,
};

export type SeatVerdict = "VACANT" | "TAKEN" | "UNCLASSIFIED" | "UNKNOWN_SPECIALTY";

export interface CandidacyTriage {
  seat: SeatVerdict;
  specialtyName?: string;
  holderName?: string;
  /** Plazas ocupadas cuya especialidad se solapa con la solicitada (Escenario E: revisión de categoría). */
  overlaps: { specialtyName: string; holderName: string }[];
  /** Otra candidatura viva con el mismo correo o la misma empresa, o un titular con ese nombre. */
  duplicateOf?: { kind: "CANDIDACY" | "MEMBER"; name: string };
  /** La ciudad declarada no es la de la zona de la Sala. */
  outsideZone: boolean;
  /** Recomendación en una línea, en lenguaje de la Directiva. */
  recommendation: string;
  /** La Directiva puede aprobar la plaza ahora mismo. */
  canApprove: boolean;
}

export type Candidacy = typeof schema.betaRequests.$inferSelect;

interface SeatRow { code: string; specialtyName: string; status: string; holderName: string | null; holderId: string | null }

async function seatRows(db: Db, chapterId: string): Promise<SeatRow[]> {
  const rows = await db
    .select({ code: schema.specialties.nscatCode, specialtyName: schema.specialties.name, status: schema.categorySeats.status, holderId: schema.categorySeats.companyId })
    .from(schema.categorySeats)
    .innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId))
    .where(eq(schema.categorySeats.chapterId, chapterId));
  const holderIds = rows.map((r) => r.holderId).filter((x): x is string => !!x);
  const holders = holderIds.length ? await db.query.companies.findMany({ where: inArray(schema.companies.id, holderIds) }) : [];
  const byId = new Map(holders.map((h) => [h.id, h.name]));
  return rows.map((r) => ({ ...r, holderName: r.holderId ? (byId.get(r.holderId) ?? null) : null }));
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Calcula el veredicto de plaza de una candidatura frente al estado real de la Sala. */
export async function triageCandidacy(db: Db, chapterId: string, c: Candidacy, zoneCity = "Sevilla"): Promise<CandidacyTriage> {
  const seats = await seatRows(db, chapterId);
  const outsideZone = norm(c.city) !== norm(zoneCity);

  // Duplicados: otra candidatura viva (no declinada) con el mismo correo o empresa, o un titular con el mismo nombre.
  const others = await db.query.betaRequests.findMany({ where: and(ne(schema.betaRequests.id, c.id), ne(schema.betaRequests.status, "DECLINED")) });
  const dupCandidacy = others.find((o) => o.email.toLowerCase() === c.email.toLowerCase() || norm(o.companyName) === norm(c.companyName));
  const members = await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapterId) });
  const dupMember = members.find((m) => norm(m.name) === norm(c.companyName));
  const duplicateOf = dupMember ? { kind: "MEMBER" as const, name: dupMember.name } : dupCandidacy ? { kind: "CANDIDACY" as const, name: `${dupCandidacy.companyName} (${CANDIDACY_LABEL[dupCandidacy.status as CandidacyStatus] ?? dupCandidacy.status})` } : undefined;

  if (!c.specialtyCode) {
    return { seat: "UNCLASSIFIED", overlaps: [], duplicateOf, outsideZone, canApprove: false, recommendation: "Sin especialidad declarada. Clasifícala en NS-CAT antes de seguir; si no encaja en ninguna plaza, propón la especialidad al Consejo de Zona." };
  }
  const spec = NSCAT.find((s) => s.code === c.specialtyCode);
  const seat = seats.find((s) => s.code === c.specialtyCode);
  if (!spec || !seat) {
    return { seat: "UNKNOWN_SPECIALTY", specialtyName: SPECIALTY_NAME[c.specialtyCode] ?? c.specialtyCode, overlaps: [], duplicateOf, outsideZone, canApprove: false, recommendation: "La especialidad no existe en esta Sala. Revisa la clasificación." };
  }
  const overlapCodes = new Set([...(spec.overlapsWith ?? []), ...NSCAT.filter((s) => s.overlapsWith?.includes(spec.code)).map((s) => s.code)]);
  const overlaps = seats.filter((s) => overlapCodes.has(s.code) && s.status === "ACTIVE" && s.holderName).map((s) => ({ specialtyName: s.specialtyName, holderName: s.holderName as string }));

  if (seat.status === "ACTIVE" && seat.holderName) {
    return { seat: "TAKEN", specialtyName: seat.specialtyName, holderName: seat.holderName, overlaps, duplicateOf, outsideZone, canApprove: false, recommendation: `Plaza ocupada por ${seat.holderName}. NS le ayuda a fundar la siguiente Sala: Promotora de nueva Sala o sumarse a una en fundación (D-041). También: Antesala hasta que quede libre, otra Sala de la zona, o revisar si la especialidad real es otra.` };
  }
  const parts: string[] = [];
  if (duplicateOf?.kind === "MEMBER") parts.push(`${duplicateOf.name} ya es titular de la Sala: comprueba que no es la misma empresa.`);
  else if (duplicateOf) parts.push(`Parece repetida con ${duplicateOf.name}.`);
  if (overlaps.length) parts.push(`Plaza vacante, pero se solapa con ${overlaps.map((o) => `${o.specialtyName} (${o.holderName})`).join(" y ")}: confirma con ese titular que no compiten antes de aprobar.`);
  if (outsideZone) parts.push(`Declara ${c.city}, fuera de NS ${zoneCity}: valora si abre una Sala en su zona.`);
  if (!parts.length) parts.push("Plaza vacante y sin conflictos. Contacta, entrevista y, si encaja, aprueba la plaza.");
  return { seat: "VACANT", specialtyName: seat.specialtyName, overlaps, duplicateOf, outsideZone, canApprove: true, recommendation: parts.join(" ") };
}

export async function listCandidacies(db: Db, view: CandidacyView = "pendientes") {
  const statuses = VIEW_STATUSES[view];
  return db.query.betaRequests.findMany({
    where: statuses ? inArray(schema.betaRequests.status, statuses) : undefined,
    orderBy: view === "pendientes" ? [asc(schema.betaRequests.createdAt)] : [desc(schema.betaRequests.updatedAt)],
  });
}

export async function candidacyCounts(db: Db) {
  const all = await db.query.betaRequests.findMany({ columns: { status: true } });
  const count = (s: CandidacyStatus[]) => all.filter((r) => s.includes(r.status as CandidacyStatus)).length;
  return { nuevas: count(["NEW"]), pendientes: count(PENDING_STATUSES), espera: count(["WAITLISTED", "FOUNDING"]), aprobadas: count(["APPROVED", "ACTIVATED"]), declinadas: count(["DECLINED"]), todas: all.length };
}

export class CandidacyTransitionError extends Error {}

export interface UpdateCandidacyInput {
  chapterId: string;
  candidacyId: string;
  memberId: string;
  status?: CandidacyStatus;
  specialtyCode?: string | null;
  notes?: string;
}

/** Despacho de la Directiva: cambio de estado, reclasificación o nota. Aprobar exige plaza vacante. */
export async function updateCandidacy(db: Db, input: UpdateCandidacyInput) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, input.memberId) });
  if (!member?.isDirector) throw new CandidacyTransitionError("Solo la Directiva despacha candidaturas.");
  const c = await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.id, input.candidacyId) });
  if (!c) throw new CandidacyTransitionError("Candidatura no encontrada.");
  const from = c.status as CandidacyStatus;
  const patch: Partial<typeof schema.betaRequests.$inferInsert> = { reviewedBy: member.id, updatedAt: new Date() };
  const changes: string[] = [];

  if (input.specialtyCode !== undefined) {
    const code = input.specialtyCode && NSCAT.some((s) => s.code === input.specialtyCode) ? input.specialtyCode : null;
    if (code !== c.specialtyCode) {
      patch.specialtyCode = code;
      changes.push(code ? `clasificada como ${SPECIALTY_NAME[code]}` : "especialidad retirada");
    }
  }
  if (input.notes !== undefined && input.notes.trim() !== (c.notes ?? "")) {
    patch.notes = input.notes.trim() || null;
    changes.push("nota actualizada");
  }
  if (input.status && input.status !== from) {
    if (!CANDIDACY_TRANSITIONS[from]?.includes(input.status)) throw new CandidacyTransitionError(`No se puede pasar de ${CANDIDACY_LABEL[from]} a ${CANDIDACY_LABEL[input.status]}.`);
    if (input.status === "APPROVED") {
      const triage = await triageCandidacy(db, input.chapterId, { ...c, specialtyCode: patch.specialtyCode !== undefined ? patch.specialtyCode : c.specialtyCode });
      if (!triage.canApprove) throw new CandidacyTransitionError(`No se puede aprobar: ${triage.recommendation}`);
    }
    patch.status = input.status;
    if (["APPROVED", "WAITLISTED", "DECLINED"].includes(input.status)) patch.decidedAt = new Date();
    changes.push(`${CANDIDACY_LABEL[from]} → ${CANDIDACY_LABEL[input.status]}`);
  }
  if (!changes.length) return c;

  const [row] = await db.update(schema.betaRequests).set(patch).where(eq(schema.betaRequests.id, c.id)).returning();
  await audit(db, {
    chapterId: input.chapterId,
    kind: "CANDIDACY_UPDATED",
    actor: { type: "USER", id: member.id },
    subject: { type: "Candidacy", id: c.id },
    policyApplied: patch.status === "APPROVED" ? "seat.exclusivity" : undefined,
    result: `Candidatura de ${c.companyName}: ${changes.join("; ")}.`,
    significant: patch.status === "APPROVED" || patch.status === "DECLINED",
  });
  return row;
}

/** El alta de la empresa desde una candidatura aprobada la marca como titular activo. */
export async function activateCandidacy(db: Db, candidacyId: string, companyId: string) {
  const c = await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.id, candidacyId) });
  if (!c || c.status === "ACTIVATED") return c ?? null;
  const [row] = await db.update(schema.betaRequests).set({ status: "ACTIVATED", companyId, decidedAt: c.decidedAt ?? new Date(), updatedAt: new Date() }).where(eq(schema.betaRequests.id, candidacyId)).returning();
  return row;
}
