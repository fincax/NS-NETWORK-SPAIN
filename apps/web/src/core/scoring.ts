/**
 * NS Match Score v0.1 (NS-ARP §7) · función pura, nunca llama a un modelo.
 * Los agentes aportan estimaciones con confianza en S1/S5/S6; aquí solo se combinan.
 */
import {
  type BusinessDNA,
  type ChapterLayer,
  type DisqualificationCode,
  type Explanation,
  type NeedDraft,
  type NSMatchScore,
  type QualificationLayer,
  type QualificationTurn,
  type ScoreComponent,
  type ScorePenalty,
  VALUE_BAND_RANGE,
} from "./types";

export const SCORING_PROFILE_VERSION = "ns-cumbre-0.1";

export const WEIGHTS = {
  trigger_fit: 0.18,
  customer_profile_fit: 0.16,
  semantic_fit: 0.1,
  deal_size_fit: 0.1,
  timing_fit: 0.08,
  capacity_fit: 0.05,
  strategic_priority: 0.07,
  relationship_strength: 0.1,
  qualification_quality: 0.08,
  member_reputation: 0.04,
  historical_conversion: 0.04,
} as const;

export const PENALTY_WEIGHTS = {
  privacy_risk: 0.15,
  conflict_risk: 0.15,
  duplicate_risk: 0.1,
  disqualification_signals: 0.2,
  uncertainty_penalty: 0.1,
} as const;

export interface CapabilityView {
  companyId: string;
  companyName: string;
  specialtyCode: string;
  isPrimarySeat: boolean;
  dna: BusinessDNA;
  reputation?: number; // 0..1, 0.6 por defecto en el MVP
}

export interface GateContext {
  hasOpenDispute?: boolean;
  duplicateWithin90d?: boolean;
  signalVisibility: string;
  originatorAllowsInternalMatching?: boolean;
  thirdPartyIsReceiver?: boolean;
}

export interface GateResult {
  pass: boolean;
  code?: DisqualificationCode;
  reason?: string;
}

const normalize = (s: string) => s.trim().toLowerCase();

/** §7.1 · puertas duras, deterministas y baratas. Se ejecutan antes de cualquier LLM. */
export function hardGates(
  need: NeedDraft,
  layer0: ChapterLayer,
  cap: CapabilityView,
  ctx: GateContext,
): GateResult {
  const icp = cap.dna.ideal_customer;
  const commercial = cap.dna.commercial;

  // Visibilidad
  if (ctx.signalVisibility === "COMPANY_ONLY" && !ctx.originatorAllowsInternalMatching) {
    return { pass: false, code: "VISIBILITY_BLOCK", reason: "La señal es COMPANY_ONLY y el originador no autoriza matching interno." };
  }
  // Geografía
  const geoTargets = [layer0.geography.city, layer0.geography.region, layer0.geography.country]
    .filter(Boolean)
    .map((g) => normalize(g as string));
  const served = icp.geography.map(normalize);
  if (served.length > 0 && !served.some((g) => geoTargets.includes(g) || g === "españa" && geoTargets.includes("españa"))) {
    return { pass: false, code: "OUT_OF_GEO", reason: `Geografía ${geoTargets.join("/")} fuera de la zona de servicio (${icp.geography.join(", ")}).` };
  }
  // Ticket
  if (layer0.value_band) {
    const range = VALUE_BAND_RANGE[layer0.value_band];
    // El límite superior de la banda es exclusivo: "<10K" nunca alcanza un ticket mínimo de 10.000 €.
    if (commercial.ticket_min !== undefined && range.max <= commercial.ticket_min) {
      return { pass: false, code: "TICKET_MISMATCH", reason: `Valor estimado ${layer0.value_band} por debajo del ticket mínimo (${commercial.ticket_min.toLocaleString("es-ES")} €).` };
    }
    if (commercial.ticket_max !== undefined && range.min > commercial.ticket_max) {
      return { pass: false, code: "TICKET_MISMATCH", reason: `Valor estimado ${layer0.value_band} por encima del ticket máximo (${commercial.ticket_max.toLocaleString("es-ES")} €).` };
    }
  }
  // Exclusión explícita
  if (icp.exclusions.map(normalize).includes(normalize(layer0.industry))) {
    return { pass: false, code: "EXPLICIT_EXCLUSION", reason: `La industria "${layer0.industry}" está excluida en el ADN de la empresa.` };
  }
  const dq = cap.dna.referrals.disqualifiers.map(normalize);
  const needText = normalize(need.description + " " + layer0.need_summary);
  const hit = dq.find((d) => d.length > 3 && needText.includes(d));
  if (hit) {
    return { pass: false, code: "EXPLICIT_EXCLUSION", reason: `Coincide con un descalificador declarado: "${hit}".` };
  }
  // Capacidad
  if (cap.dna.offering.capacity === "FULL") {
    return { pass: false, code: "NO_CAPACITY", reason: "Capacidad comercial completa ahora mismo." };
  }
  // Conflicto y duplicado
  if (ctx.hasOpenDispute || ctx.thirdPartyIsReceiver) {
    return { pass: false, code: "CONFLICT", reason: ctx.thirdPartyIsReceiver ? "El tercero es la propia empresa receptora." : "Existe una disputa abierta entre las partes." };
  }
  if (ctx.duplicateWithin90d) {
    return { pass: false, code: "DUPLICATE", reason: "Ya existe una Cesión activa para el mismo tercero y especialidad en los últimos 90 días." };
  }
  return { pass: true };
}

/** Fit preliminar (S5), solo con la capa 0. */
export function preliminaryFit(need: NeedDraft, layer0: ChapterLayer, cap: CapabilityView): number {
  const c = components(need, layer0, undefined, [], cap);
  const quick = c.filter((x) => ["trigger_fit", "customer_profile_fit", "deal_size_fit", "timing_fit", "capacity_fit"].includes(x.key));
  const w = quick.reduce((a, x) => a + x.weight, 0);
  return w === 0 ? 0 : quick.reduce((a, x) => a + x.weight * x.value, 0) / w;
}

function includesAny(list: string[], values: string[]): boolean {
  const l = list.map(normalize);
  return values.map(normalize).some((v) => l.includes(v));
}

/** Similitud léxica simple (Jaccard sobre tokens) como sustituto del embedding en el MVP. Techo 0.10 por diseño. */
export function lexicalSimilarity(a: string, b: string): number {
  const tok = (s: string) => new Set(normalize(s).split(/[^a-záéíóúñü0-9]+/).filter((t) => t.length > 3));
  const A = tok(a);
  const B = tok(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

function components(
  need: NeedDraft,
  layer0: ChapterLayer,
  layer1: QualificationLayer | undefined,
  turns: QualificationTurn[],
  cap: CapabilityView,
): ScoreComponent[] {
  const dna = cap.dna;
  const icp = dna.ideal_customer;
  const out: ScoreComponent[] = [];

  // trigger_fit
  const signalTriggers = layer1?.triggers ?? [];
  const triggerHit = signalTriggers.some((t) => icp.triggers.includes(t));
  out.push({
    key: "trigger_fit",
    weight: WEIGHTS.trigger_fit,
    value: signalTriggers.length === 0 ? 0.4 : triggerHit ? 1 : 0.15,
    confidence: signalTriggers.length === 0 ? 0.4 : 0.9,
    evidence: triggerHit
      ? `El trigger "${signalTriggers.find((t) => icp.triggers.includes(t))}" está en tu lista de señales prioritarias.`
      : signalTriggers.length === 0
        ? "La señal no declara triggers todavía."
        : "Ningún trigger de la señal está entre tus señales prioritarias.",
  });

  // customer_profile_fit (industria pesa doble)
  const indHit = icp.industries.length === 0 || includesAny(icp.industries, [layer0.industry]);
  const sizeHit = icp.company_size.length === 0 || icp.company_size.includes(layer0.company_size_band);
  const roleHit = !layer1?.decision_role || icp.roles.length === 0 || includesAny(icp.roles, [layer1.decision_role]);
  const cpf = (2 * (indHit ? 1 : 0) + (sizeHit ? 1 : 0) + (roleHit ? 1 : 0)) / 4;
  out.push({
    key: "customer_profile_fit",
    weight: WEIGHTS.customer_profile_fit,
    value: cpf,
    confidence: 0.85,
    evidence: `${indHit ? "Industria dentro de tu ICP" : "Industria fuera de tu ICP"}; ${sizeHit ? `tamaño ${layer0.company_size_band} encaja` : `tamaño ${layer0.company_size_band} fuera de tu ICP`}${layer1?.decision_role ? `; decisor: ${layer1.decision_role}` : ""}.`,
  });

  // semantic_fit (techo 0.10)
  const sem = Math.min(
    1,
    lexicalSimilarity(need.description + " " + layer0.need_summary, dna.referrals.perfect_referral + " " + dna.offering.services.join(" ")) * 3,
  );
  out.push({ key: "semantic_fit", weight: WEIGHTS.semantic_fit, value: sem, confidence: 0.5, evidence: sem > 0.5 ? "La necesidad se parece a tu Cesión perfecta declarada." : "Parecido léxico limitado con tu Cesión perfecta." });

  // deal_size_fit
  let dsf = 0.5;
  let dsfEv = "Valor estimado desconocido.";
  if (layer0.value_band) {
    const r = VALUE_BAND_RANGE[layer0.value_band];
    const min = dna.commercial.ticket_min ?? 0;
    const max = dna.commercial.ticket_max ?? Number.POSITIVE_INFINITY;
    const mid = (r.min + r.max) / 2;
    if (mid >= min && mid <= max) {
      dsf = 1;
      dsfEv = `Rango estimado ${layer0.value_band}, dentro de tu ticket habitual.`;
    } else if (r.max >= min && r.min <= max) {
      dsf = 0.6;
      dsfEv = `Rango estimado ${layer0.value_band}, en el límite de tu ticket habitual.`;
    } else {
      dsf = 0.2;
      dsfEv = `Rango estimado ${layer0.value_band}, fuera de tu ticket habitual.`;
    }
  }
  out.push({ key: "deal_size_fit", weight: WEIGHTS.deal_size_fit, value: dsf, confidence: layer0.value_band ? 0.7 : 0.3, evidence: dsfEv });

  // timing_fit
  const order = ["IMMEDIATE", "30D", "90D", "180D", "UNKNOWN"];
  const ti = order.indexOf(layer0.timing);
  const cycleDays = dna.commercial.sales_cycle_days ?? 60;
  const horizonDays = [0, 30, 90, 180, 365][ti] ?? 365;
  const tf = layer0.timing === "UNKNOWN" ? 0.4 : horizonDays >= cycleDays * 0.5 ? 1 : 0.6;
  out.push({ key: "timing_fit", weight: WEIGHTS.timing_fit, value: tf, confidence: layer0.timing === "UNKNOWN" ? 0.3 : 0.8, evidence: layer0.timing === "UNKNOWN" ? "Plazo sin confirmar." : `Horizonte ${layer0.timing} compatible con tu ciclo de venta (${cycleDays} días).` });

  // capacity_fit
  const capv = dna.offering.capacity === "OPEN" ? 1 : dna.offering.capacity === "LIMITED" ? 0.5 : 0;
  out.push({ key: "capacity_fit", weight: WEIGHTS.capacity_fit, value: capv, confidence: 0.9, evidence: dna.offering.capacity === "OPEN" ? "Tienes capacidad abierta ahora." : "Capacidad limitada ahora." });

  // strategic_priority
  const sp = [0, 0.33, 0.66, 1][dna.commercial.strategic_priority];
  out.push({ key: "strategic_priority", weight: WEIGHTS.strategic_priority, value: sp, confidence: 0.95, evidence: sp >= 0.66 ? "Has marcado esta especialidad como prioridad comercial." : "Prioridad comercial media o baja para este servicio." });

  // relationship_strength
  const rs = { DIRECT: 1, INDIRECT: 0.6, WEAK: 0.3, UNKNOWN: 0.2 }[layer0.relationship_strength];
  out.push({ key: "relationship_strength", weight: WEIGHTS.relationship_strength, value: rs, confidence: 0.9, evidence: layer0.relationship_strength === "DIRECT" ? "El cedente tiene relación directa con el Interesado." : `Relación del cedente con el Interesado: ${layer0.relationship_strength.toLowerCase()}.` });

  // qualification_quality
  const critical = turns.filter((t) => ["BUDGET", "TIMING", "DECISION_MAKER"].includes(t.kind));
  const answered = critical.filter((t) => !t.insufficient && (t.confidence ?? 0) >= 0.6).length;
  const qq = critical.length === 0 ? 0.3 : answered / critical.length;
  out.push({ key: "qualification_quality", weight: WEIGHTS.qualification_quality, value: qq, confidence: critical.length === 0 ? 0.3 : 0.85, evidence: critical.length === 0 ? "Sin cualificación agente-a-agente todavía." : `${answered} de ${critical.length} preguntas críticas respondidas con confianza.` });

  // member_reputation / historical_conversion (MVP: valores por defecto)
  out.push({ key: "member_reputation", weight: WEIGHTS.member_reputation, value: cap.reputation ?? 0.6, confidence: 0.5, evidence: "Reputación inicial (sin histórico suficiente)." });
  out.push({ key: "historical_conversion", weight: WEIGHTS.historical_conversion, value: 0.5, confidence: 0.3, evidence: "Sin histórico de conversión para este par especialidad/trigger." });

  return out;
}

export interface PenaltyContext {
  requiresRevealAbovePermission?: boolean;
  adjacentSeatOverlap?: boolean;
  similarReferralWithin180d?: boolean;
  contradictions?: string[];
}

function penalties(need: NeedDraft, turns: QualificationTurn[], pctx: PenaltyContext): ScorePenalty[] {
  const out: ScorePenalty[] = [];
  if (pctx.requiresRevealAbovePermission) out.push({ key: "privacy_risk", weight: PENALTY_WEIGHTS.privacy_risk, value: 1, evidence: "Avanzar exige revelar datos por encima del permiso actual." });
  if (pctx.adjacentSeatOverlap) out.push({ key: "conflict_risk", weight: PENALTY_WEIGHTS.conflict_risk, value: 1, evidence: "Solapamiento adyacente con otra plaza de la Sala." });
  if (pctx.similarReferralWithin180d) out.push({ key: "duplicate_risk", weight: PENALTY_WEIGHTS.duplicate_risk, value: 1, evidence: "Cesión similar en los últimos 180 días." });
  if (pctx.contradictions && pctx.contradictions.length > 0) out.push({ key: "disqualification_signals", weight: PENALTY_WEIGHTS.disqualification_signals, value: Math.min(1, pctx.contradictions.length / 2), evidence: pctx.contradictions.join("; ") });
  const critical = turns.filter((t) => ["BUDGET", "TIMING", "DECISION_MAKER"].includes(t.kind));
  const unresolved = critical.filter((t) => t.insufficient || (t.confidence ?? 0) < 0.6).length + need.unknowns.length;
  const denom = Math.max(1, critical.length + need.unknowns.length);
  if (unresolved > 0) out.push({ key: "uncertainty_penalty", weight: PENALTY_WEIGHTS.uncertainty_penalty, value: unresolved / denom, evidence: `${unresolved} incógnita(s) crítica(s) sin resolver.` });
  return out;
}

export function computeNSMatchScore(
  need: NeedDraft,
  layer0: ChapterLayer,
  layer1: QualificationLayer | undefined,
  turns: QualificationTurn[],
  cap: CapabilityView,
  pctx: PenaltyContext = {},
): NSMatchScore {
  const comps = components(need, layer0, layer1, turns, cap);
  const pens = penalties(need, turns, pctx);
  const positive = comps.reduce((a, c) => a + c.weight * c.value, 0);
  const penalty = pens.reduce((a, p) => a + p.weight * p.value, 0);
  const raw = Math.min(1, Math.max(0, positive - penalty));
  const wsum = comps.reduce((a, c) => a + c.weight, 0);
  const evidence_confidence = comps.reduce((a, c) => a + c.weight * c.confidence, 0) / wsum;
  const total = raw * (0.6 + 0.4 * evidence_confidence);
  const band = total >= 0.85 ? "HIGH" : total >= 0.7 ? "GOOD" : total >= 0.55 ? "PARTIAL" : "LOW";
  return { total, positive, penalty, evidence_confidence, band, components: comps, penalties: pens, profile_version: SCORING_PROFILE_VERSION };
}

/** §7.5 · Explanation obligatoria: WHY · EVIDENCE · CONFIDENCE · UNKNOWN · NEXT ACTION. */
export function buildExplanation(score: NSMatchScore, need: NeedDraft, turns: QualificationTurn[]): Explanation {
  const ranked = [...score.components]
    .filter((c) => c.value >= 0.6 && c.confidence >= 0.5)
    .sort((a, b) => b.weight * b.value - a.weight * a.value)
    .slice(0, 7);
  const why = ranked.map((c) => c.evidence);
  const evidence = ranked.map((c) => `${c.key}=${c.value.toFixed(2)} (conf ${c.confidence.toFixed(2)})`);
  const unknowns = [
    ...need.unknowns,
    ...turns.filter((t) => t.insufficient || (t.confidence ?? 0) < 0.6).map((t) => `${labelKind(t.kind)}: sin confirmar.`),
  ];
  const confidence = score.evidence_confidence >= 0.75 ? "HIGH" : score.evidence_confidence >= 0.5 ? "MEDIUM" : "LOW";
  const next_action =
    score.band === "HIGH" || score.band === "GOOD"
      ? "Aceptar la Cesión y confirmar la Promesa."
      : score.band === "PARTIAL"
        ? "Pedir más información antes de decidir."
        : "Declinar con motivo.";
  return { why, evidence, confidence, unknowns, next_action, negatives: score.penalties.map((p) => p.evidence) };
}

export function labelKind(kind: QualificationTurn["kind"]): string {
  return { BUDGET: "Presupuesto", TIMING: "Plazo", DECISION_MAKER: "Decisor", SCOPE: "Alcance", CONSTRAINT: "Condicionantes", FREE: "Pregunta" }[kind];
}
