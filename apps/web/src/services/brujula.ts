/**
 * Brújula (Protocolo III · Cuentas Claras, D-019 · D-072). Privada: visibilidad COMPANY_ONLY, nunca sale de la empresa.
 *
 * El Agente estudia cómo mejorar los resultados de su Timonel y se lo cuenta en cuatro bloques (docs/14 §4):
 *   1 · Dónde estás      Ritmo y Compromiso, Comunicado, lo que recibes y lo que das (solo contrastado).
 *   2 · Por qué          Evidencia real: aceptación de tus Cesiones frente a la Sala, a quién le cierran rápido, qué
 *                        declinaron y por qué, qué señales conviertes, qué Veredictos recibes. Nunca consejos genéricos.
 *   3 · Qué ganas        Mérito, Distinciones, Valoración y Embajada, Tramo de cuota y valor recibido en el Ejercicio.
 *   4 · Movimientos      Tres acciones (cinco tras una semana sin ceder, D-042) con un toque: publicar lo que el Agente
 *                        encontró o lo que apuntaste, atender un Encargo de la Sala, cerrar lo que está abierto,
 *                        conocer a quien nunca has cedido, dar a conocer tu Comunicado, reclamar una plaza vacante.
 * Cada Movimiento lleva origen y confianza. Lo descartado con motivo (MOVE_DISMISSED) no vuelve en catorce días.
 * Todo se calcula al leer, a partir de hechos persistidos; nada se inventa (D-045).
 */
import { and, desc, eq, gte, inArray, ne } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { compromisoStatus, type CompromisoStatus } from "@/services/compromiso";
import { comunicadoStatus } from "@/services/comunicado";
import { valoracionActual } from "@/services/valoracion";
import { openDemands } from "@/services/demands";
import { monthStart } from "@/core/valoracion";
import { eur } from "@/lib/format";
import type { SignalEnvelope } from "@/core/types";
import type { ToqueAction } from "@/services/hoy";

export type MovimientoKind = "CEDER" | "PROPONER" | "OFRECER" | "CERRAR" | "CONOCER" | "COMUNICAR" | "RECLAMAR";
export type Confianza = "ALTA" | "MEDIA" | "BAJA";

export interface Movimiento {
  key: string;
  kind: MovimientoKind;
  title: string;
  why: string;
  origin: string; // "Rastreo · BORME", "Apunte", "Encargo de la Sala", "Cesión en curso"…
  confidence: Confianza;
  href: string;
  hrefLabel: string;
  primary?: { label: string; action: ToqueAction; payload: Record<string, string> };
  rank: number;
}

export interface Brujula {
  weekLabel: string;
  donde: {
    compromiso: CompromisoStatus;
    comunicado: { label: string; approvedStreak: number; status: string | null };
    recibes: { valueMonth: number; valueTotal: number; accepted: number; decided: number };
    das: { valueMonth: number; valueTotal: number; accepted: number; decided: number; salaRate: number | null };
  };
  porque: { sign: "+" | "–" | "·"; text: string }[];
  ganas: {
    merit: number;
    distinciones: { total: number; byAxis: Record<string, number> };
    valoracion: { score: number | null; month: string; eligibleEmbajada: boolean };
    embajada: string[]; // especialidades sin titular reclamadas por la Mesa en los últimos 30 días
    cuota: { tier: string; valueReceivedYear: number };
  };
  movimientos: Movimiento[];
  movimientosObjetivo: number;
}

const DAY = 86_400_000;
const TRIGGER_LABEL: Record<string, string> = { NEW_SITE: "nueva sede", HEADCOUNT_GROWTH: "crecimiento de plantilla", INTERNATIONAL_EXPANSION: "expansión internacional", FUNDING_ROUND: "ronda de financiación", COMPANY_SALE: "venta de empresa", NEW_PRODUCT: "nuevo producto", REGULATORY_CHANGE: "cambio normativo", SUPPLIER_CHANGE: "cambio de proveedor", DIGITALIZATION: "digitalización", FLEET_RENEWAL: "renovación de flota", LEADERSHIP_CHANGE: "cambio de dirección", OTHER: "otra señal" };

export const DISMISS_REASONS = [
  { key: "NO_CONOZCO", text: "No conozco a nadie así" },
  { key: "NO_ENCAJA", text: "No encaja con mi actividad" },
  { key: "YA_HECHO", text: "Ya lo he hecho fuera de NS" },
  { key: "MAS_TARDE", text: "Ahora no; recuérdamelo en dos semanas" },
] as const;

export async function brujula(db: Db, ctx: { chapterId: string; companyId: string }, now = new Date()): Promise<Brujula> {
  const { chapterId, companyId } = ctx;
  const companies = new Map((await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapterId) })).map((c) => [c.id, c]));
  const me = companies.get(companyId)!;
  const month = monthStart(now);
  const year = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  // ── Dónde estás ──
  const compromiso = await compromisoStatus(db, chapterId, companyId, now);
  const comunicado = await comunicadoStatus(db, chapterId, companyId, now);
  const all = await db.query.referrals.findMany({ where: eq(schema.referrals.chapterId, chapterId) });
  const given = all.filter((r) => r.originatorCompanyId === companyId);
  const received = all.filter((r) => r.receiverCompanyId === companyId);
  const confirmedValue = (rs: typeof all, since?: Date) => rs.filter((r) => r.state === "VALUE_CONFIRMED" && (!since || (r.closedAt ?? r.updatedAt) >= since)).reduce((a, r) => a + (r.valueVerified ?? 0), 0);
  const DECIDED = new Set(["REJECTED_BY_MEMBER", "APPROVED", "INTRO_AUTHORIZED", "INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY", "WON", "LOST", "NO_DECISION", "VALUE_CONFIRMED"]);
  const decidedBy = (rs: typeof all) => rs.filter((r) => DECIDED.has(r.state));
  const acceptedOf = (rs: typeof all) => rs.filter((r) => r.state !== "REJECTED_BY_MEMBER");
  const givenDecided = decidedBy(given);
  const receivedDecided = decidedBy(received);
  const salaDecided = decidedBy(all.filter((r) => r.originatorCompanyId !== companyId));
  const rate = (acc: number, tot: number) => (tot ? acc / tot : null);

  // ── Por qué ──
  const porque: Brujula["porque"] = [];
  const myRate = rate(acceptedOf(givenDecided).length, givenDecided.length);
  const salaRate = rate(acceptedOf(salaDecided).length, salaDecided.length);
  if (myRate !== null) porque.push({ sign: salaRate !== null && myRate < salaRate ? "–" : "+", text: `Tus Cesiones se aceptan al ${Math.round(myRate * 100)} %${salaRate !== null ? ` (media de la Sala ${Math.round(salaRate * 100)} %)` : ""}: ${acceptedOf(givenDecided).length} de ${givenDecided.length} decididas.` });
  // Cierres rápidos por cesionario
  const closedGiven = given.filter((r) => r.state === "VALUE_CONFIRMED" && r.closedAt);
  const byReceiver = new Map<string, number[]>();
  for (const r of closedGiven) byReceiver.set(r.receiverCompanyId, [...(byReceiver.get(r.receiverCompanyId) ?? []), (r.closedAt!.getTime() - r.createdAt.getTime()) / DAY]);
  const fast = [...byReceiver].map(([id, ds]) => ({ id, days: Math.round(ds.reduce((a, b) => a + b, 0) / ds.length), n: ds.length })).sort((a, b) => a.days - b.days).slice(0, 2);
  if (fast.length) porque.push({ sign: "+", text: `Tus Cesiones a ${fast.map((f) => `${companies.get(f.id)?.name ?? "un titular"} cierran en ${f.days} días`).join(" y a ")}.` });
  // Declinadas con motivo
  const declined = given.filter((r) => r.state === "REJECTED_BY_MEMBER");
  if (declined.length) {
    const decisions = await db.query.humanDecisions.findMany({ where: and(inArray(schema.humanDecisions.referralId, declined.map((r) => r.id)), eq(schema.humanDecisions.decision, "REJECT")), orderBy: [desc(schema.humanDecisions.occurredAt)], limit: 3 });
    const last = decisions[0];
    const ref = last ? declined.find((r) => r.id === last.referralId) : undefined;
    if (ref) porque.push({ sign: "–", text: `${declined.length === 1 ? "Tu última Cesión a" : `${declined.length} Cesiones tuyas, la última a`} ${companies.get(ref.receiverCompanyId)?.name ?? "un titular"} ${declined.length === 1 ? "fue declinada" : "fueron declinadas"}${last?.notes ? `: «${last.notes.slice(0, 120)}»` : " sin motivo escrito"}. Tu Agente pedirá ese dato antes de proponer.` });
  }
  // Señales que conviertes
  if (closedGiven.length) {
    const signals = await db.query.opportunitySignals.findMany({ where: inArray(schema.opportunitySignals.id, closedGiven.map((r) => r.opportunitySignalId)), columns: { envelope: true } });
    const counts = new Map<string, number>();
    for (const s of signals) for (const t of (s.envelope as SignalEnvelope).qualification_layer?.triggers ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => TRIGGER_LABEL[t] ?? t.toLowerCase());
    if (top.length) porque.push({ sign: "·", text: `Las señales que mejor conviertes: ${top.join(" y ")}.` });
  }
  // Veredictos recibidos sobre lo cedido
  const verdicts = given.length ? await db.query.verdicts.findMany({ where: inArray(schema.verdicts.referralId, given.map((r) => r.id)) }) : [];
  if (verdicts.length) {
    const mean = (k: "ease" | "business" | "treatment") => verdicts.reduce((a, v) => a + v.verdict[k], 0) / verdicts.length;
    const ease = mean("ease");
    const treat = mean("treatment");
    porque.push({ sign: ease >= 4 ? "+" : ease >= 3 ? "·" : "–", text: `Facilidad media ${ease.toFixed(1)} de 5 en ${verdicts.length} Veredicto(s): ${ease >= 4 ? "tus referidos llegan con la información completa" : ease >= 3 ? "a tus referidos les falta a veces un dato (decisor o plazo)" : "tus referidos llegan incompletos: decisor, plazo o presupuesto"}. Trato ${treat.toFixed(1)}.` });
  }
  // Como cesionario: plazo de respuesta
  const onTime = await db.query.trustEvents.findMany({ where: and(eq(schema.trustEvents.companyId, companyId), inArray(schema.trustEvents.kind, ["RESPONSE_ON_TIME", "RESPONSE_LATE"]), gte(schema.trustEvents.createdAt, new Date(now.getTime() - 90 * DAY))), columns: { kind: true } });
  const late = onTime.filter((e) => e.kind === "RESPONSE_LATE").length;
  if (late) porque.push({ sign: "–", text: `${late} ${late === 1 ? "plazo vencido" : "plazos vencidos"} en 90 días (silencio ante una Cesión, una pregunta o un Interesado). Cada uno resta en tu Hoja de Méritos; un toque desde Hoy lo evita.` });
  if (porque.length === 0) porque.push({ sign: "·", text: "Aún sin datos suficientes. Cede tu primera Cesión y la Brújula empieza a aprender de lo que ocurre con ella." });

  // ── Qué ganas ──
  const meritRows = await db.query.trustEvents.findMany({ where: eq(schema.trustEvents.companyId, companyId), columns: { weight: true } });
  const merit = meritRows.reduce((a, e) => a + e.weight, 0);
  const recognitions = await db.query.recognitions.findMany({ where: eq(schema.recognitions.toCompanyId, companyId), columns: { axis: true } });
  const byAxis: Record<string, number> = {};
  for (const r of recognitions) byAxis[r.axis] = (byAxis[r.axis] ?? 0) + 1;
  const valoracion = await valoracionActual(db, chapterId, companyId, now);
  const uncovered = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.chapterId, chapterId), eq(schema.auditEvents.kind, "NEED_UNCOVERED"), gte(schema.auditEvents.occurredAt, new Date(now.getTime() - 30 * DAY))), orderBy: [desc(schema.auditEvents.occurredAt)], limit: 30 });
  const embajada = [...new Set(uncovered.flatMap((e) => (e.result.match(/Sin titular en la Sala para ([^:]+):/)?.[1] ?? "").split(",").map((x) => x.trim()).filter(Boolean)))].slice(0, 3);

  // ── Movimientos ──
  const dismissed = new Set((await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.kind, "MOVE_DISMISSED"), eq(schema.auditEvents.subjectType, "Move"), gte(schema.auditEvents.occurredAt, new Date(now.getTime() - 14 * DAY))), columns: { subjectId: true, companyIds: true } })).filter((e) => e.companyIds.includes(companyId)).map((e) => e.subjectId));
  const moves: Movimiento[] = [];

  const drafts = await db.query.opportunitySignals.findMany({ where: and(eq(schema.opportunitySignals.originatorCompanyId, companyId), eq(schema.opportunitySignals.status, "DRAFT"), ne(schema.opportunitySignals.visibility, "COMPANY_ONLY")), orderBy: [desc(schema.opportunitySignals.createdAt)] });
  const records = await db.query.publicRecords.findMany({ where: eq(schema.publicRecords.ingestedByCompanyId, companyId) });
  const recordBySignal = new Map(records.filter((r) => r.opportunitySignalId).map((r) => [r.opportunitySignalId as string, r]));
  const sources = new Map((await db.query.businessSignals.findMany({ where: inArray(schema.businessSignals.id, drafts.map((d) => d.businessSignalId).concat("00000000-0000-0000-0000-000000000000")), columns: { id: true, source: true } })).map((b) => [b.id, b.source]));
  for (const d of drafts) {
    const env = d.envelope as SignalEnvelope;
    const conf: Confianza = env.chapter_layer.confidence >= 0.75 ? "ALTA" : env.chapter_layer.confidence >= 0.5 ? "MEDIA" : "BAJA";
    const rec = recordBySignal.get(d.id);
    if (rec) moves.push({ key: `publish-${d.id}`, kind: "PROPONER", title: `Proponer: ${rec.title}`, why: `${env.chapter_layer.need_summary} Tu Agente lo encontró en ${rec.source === "PRENSA" ? "la prensa" : rec.source === "LICITACION" ? "una licitación pública" : "una fuente pública"}; publicado, la Mesa busca al titular que lo atienda.`, origin: `Rastreo · ${rec.source}`, confidence: conf, href: `/indicio/${d.id}`, hrefLabel: "Ver", primary: { label: "Publicar en la Sala", action: "PUBLISH_SIGNAL", payload: { id: d.id } }, rank: 2 });
    else moves.push({ key: `publish-${d.id}`, kind: "CEDER", title: `Ceder: ${env.chapter_layer.need_summary}`, why: sources.get(d.businessSignalId) === "APUNTE" ? "Lo apuntaste tú: ya decidiste ceder. Publicado, la Mesa lo convierte en Cesión en minutos." : "Tu Indicio sigue en borrador: hasta que lo publiques, nadie de la Sala puede atenderlo.", origin: sources.get(d.businessSignalId) === "APUNTE" ? "Apunte" : "Indicio propio", confidence: conf, href: `/indicio/${d.id}`, hrefLabel: "Ver lo que verá la Sala", primary: { label: "Publicar en la Sala", action: "PUBLISH_SIGNAL", payload: { id: d.id } }, rank: 1 });
  }

  if (comunicado.row?.status === "DRAFT") moves.push({ key: "comunicado", kind: "COMUNICAR", title: "Dar a conocer: aprueba tu Comunicado de la semana", why: comunicado.continuityStreak >= 1 ? `Llevas ${comunicado.continuityStreak} ${comunicado.continuityStreak === 1 ? "semana" : "semanas"} de continuidad: los Agentes de la Sala no saben nada nuevo de ti y te ceden a ciegas.` : "Un toque y los Agentes de la Sala actualizan lo que saben de ti antes de buscar para ti.", origin: "Protocolo II", confidence: "ALTA", href: "/comunicado", hrefLabel: "Añadir una novedad", primary: { label: "Aprobar", action: "APPROVE_COMMUNIQUE", payload: {} }, rank: 3 });

  const stale = received.filter((r) => ["INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY"].includes(r.state) && now.getTime() - r.updatedAt.getTime() > 7 * DAY);
  for (const r of stale.slice(0, 2)) moves.push({ key: `close-${r.id}`, kind: "CERRAR", title: `Cerrar: la Cesión de ${companies.get(r.originatorCompanyId)?.name ?? "un titular"} lleva ${Math.round((now.getTime() - r.updatedAt.getTime()) / DAY)} días sin hito`, why: "El cedente espera saber qué pasó y su Mérito de Veredicto depende de ti. Anota el hito o cierra con el Veredicto en tres toques.", origin: "Cesión en curso", confidence: "ALTA", href: `/cesiones/${r.id}`, hrefLabel: "Anotar el hito", rank: 4 });
  const won = all.filter((r) => r.state === "WON" && (r.originatorCompanyId === companyId || r.receiverCompanyId === companyId));
  for (const r of won.slice(0, 1)) moves.push({ key: `confirm-${r.id}`, kind: "CERRAR", title: `Contrastar: ${eur(r.valueVerified)} de la Cesión ${r.originatorCompanyId === companyId ? `a ${companies.get(r.receiverCompanyId)?.name}` : `de ${companies.get(r.originatorCompanyId)?.name}`}`, why: "Ganada y sin contrastar: hasta que las dos partes confirmen el valor, no cuenta en la Balanza ni en tu Tramo.", origin: "Cierre ganado", confidence: "ALTA", href: `/cesiones/${r.id}`, hrefLabel: "Confirmar el valor", rank: 4 });

  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
  const myIndustries = new Set((dnaRow?.dna.ideal_customer.industries ?? []).map((i) => i.toLowerCase()));
  const myTriggers = new Set(dnaRow?.dna.ideal_customer.triggers ?? []);
  const demands = (await openDemands(db, chapterId)).filter((d) => d.companyId !== companyId);
  for (const d of demands) {
    const byTrigger = d.trigger && myTriggers.has(d.trigger);
    const byIndustry = d.industry && myIndustries.has(d.industry.toLowerCase());
    if (!byTrigger && !byIndustry) continue;
    const owner = companies.get(d.companyId)?.name ?? "un titular";
    moves.push({ key: `demand-${d.id}`, kind: "OFRECER", title: `Ofrecer a ${owner}: «${d.text}»`, why: byTrigger ? `Tus clientes viven la señal "${TRIGGER_LABEL[d.trigger!] ?? d.trigger}". Si conoces a alguien así, apúntalo: tu Agente lo cede a ${owner} y cumples la semana.` : `Sirves al sector ${d.industry}. Si conoces a alguien así, apúntalo y tu Agente lo cede a ${owner}.`, origin: "Encargo de la Sala", confidence: byTrigger ? "MEDIA" : "BAJA", href: "/apunte", hrefLabel: "Apuntar un referido", rank: 5 });
  }

  const cededTo = new Set(given.map((r) => r.receiverCompanyId));
  const dnas = await db.query.businessDna.findMany({ where: inArray(schema.businessDna.companyId, [...companies.keys()].filter((id) => id !== companyId).concat("00000000-0000-0000-0000-000000000000")), columns: { companyId: true, dna: true } });
  const unknown = dnas.filter((d) => !cededTo.has(d.companyId) && companies.get(d.companyId)?.status === "ACTIVE").map((d) => ({ id: d.companyId, shared: d.dna.ideal_customer.industries.filter((i) => myIndustries.has(i.toLowerCase())) })).filter((x) => x.shared.length).sort((a, b) => b.shared.length - a.shared.length).slice(0, 1);
  for (const u of unknown) moves.push({ key: `know-${u.id}`, kind: "CONOCER", title: `Conocer a ${companies.get(u.id)?.name}: nunca le has cedido`, why: `Sirve a tus mismos sectores (${u.shared.slice(0, 2).join(", ")}): tus clientes son sus clientes. Lee su Cesión perfecta y sabrás qué apuntar la próxima vez que lo oigas.`, origin: "Dossier", confidence: "MEDIA", href: `/empresa/${companies.get(u.id)?.slug}`, hrefLabel: "Leer su Dossier", rank: 6 });

  for (const e of embajada.slice(0, 1)) moves.push({ key: `claim-${e}`, kind: "RECLAMAR", title: `Reclamar la plaza de ${e}`, why: "La Mesa encontró necesidades sin titular en la Sala este mes. Si conoces una empresa de esa especialidad, propónla a la Antesala: cada plaza cubierta es una Cesión más que la Sala puede atender.", origin: "Necesidad sin titular", confidence: "MEDIA", href: "/sala/alta", hrefLabel: "Proponer una empresa", rank: 7 });

  const target = compromiso.missedStreak >= 1 && compromiso.thisWeek.validCount < compromiso.minimum ? 5 : 3;
  const movimientos = moves.filter((m) => !dismissed.has(m.key)).sort((a, b) => a.rank - b.rank).slice(0, target);

  return {
    weekLabel: comunicado.weekLabel,
    donde: {
      compromiso,
      comunicado: { label: comunicado.label, approvedStreak: comunicado.approvedStreak, status: comunicado.row?.status ?? null },
      recibes: { valueMonth: confirmedValue(received, month), valueTotal: confirmedValue(received), accepted: acceptedOf(receivedDecided).length, decided: receivedDecided.length },
      das: { valueMonth: confirmedValue(given, month), valueTotal: confirmedValue(given), accepted: acceptedOf(givenDecided).length, decided: givenDecided.length, salaRate },
    },
    porque,
    ganas: {
      merit,
      distinciones: { total: recognitions.length, byAxis },
      valoracion: { score: valoracion.decisive.score, month: valoracion.decisive.monthLabel, eligibleEmbajada: valoracion.decisive.eligibleEmbajada },
      embajada,
      cuota: { tier: me.feeTier, valueReceivedYear: confirmedValue(received, year) },
    },
    movimientos,
    movimientosObjetivo: target,
  };
}

/** El Timonel descarta un Movimiento con motivo: entrena al Agente y no vuelve en catorce días. */
export async function dismissMove(db: Db, input: { chapterId: string; companyId: string; memberId: string; key: string; reason: string }) {
  const reason = DISMISS_REASONS.find((r) => r.key === input.reason);
  if (!reason) throw new Error("Elige un motivo para descartar el Movimiento.");
  await audit(db, { chapterId: input.chapterId, kind: "MOVE_DISMISSED", actor: { type: "USER", id: input.memberId }, subject: { type: "Move", id: input.key }, policyApplied: "brujula.dismiss", result: `Movimiento descartado: ${reason.text}.`, significant: false, companyIds: [input.companyId] });
}

