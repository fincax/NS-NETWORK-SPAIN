/** Trust & Compliance Gate (NS-ARP §8) · Salvoconducto. Determinista en el MVP. */
import type { ComplianceCheck, ComplianceVerdict, NSMatchScore, PermissionVerb, SignalEnvelope } from "./types";

export const FEE_PATTERNS = [/comisi[oó]n/i, /a cambio de/i, /te pago/i, /porcentaje del contrato/i, /kickback/i, /descuento si me/i, /finder'?s fee/i];

export interface ComplianceInput {
  envelope: SignalEnvelope;
  permissions: PermissionVerb[];
  score: NSMatchScore;
  receiverSpecialtyRegulated: boolean;
  adjacentSeatOverlap: boolean;
  receiverCompletedReferrals: number;
  chapterValueThreshold: number; // euros
  estimatedValueMax: number;
  recentPolicyViolation: boolean;
  freeTexts: string[]; // notas, rationale, mensajes que pasan por el filtro de retribución
}

const PERSON_LIKE = /\b(don|doña|sr\.|sra\.|d\.)\s+[A-ZÁÉÍÓÚ]/;

export function runComplianceGate(input: ComplianceInput): ComplianceVerdict {
  const checks: ComplianceCheck[] = [];
  const reviewers = new Set<"ORIGINATOR" | "RECEIVER" | "DIRECTOR">(["ORIGINATOR", "RECEIVER"]);
  const blocked: string[] = [];
  const exceptions: string[] = [];

  // 1 · permisos de fuente
  const hasInfer = input.permissions.includes("INFER");
  const hasShare = input.permissions.includes("SHARE");
  checks.push({ name: "Permisos de fuente", result: hasInfer && hasShare ? "OK" : "FAIL", detail: hasInfer && hasShare ? "La fuente autoriza INFER y SHARE." : "La fuente no autoriza compartir (SHARE)." });
  if (!input.permissions.includes("REVEAL_IDENTITY")) {
    blocked.push("identity_layer.contact_person");
  }

  // 2 · visibilidad de capas: personas físicas nunca en capa 0/1
  const l0 = input.envelope.chapter_layer.need_summary;
  const l1 = input.envelope.qualification_layer?.detailed_context ?? "";
  const personLeak = PERSON_LIKE.test(l0) || PERSON_LIKE.test(l1) || /@/.test(l0 + l1);
  checks.push({ name: "Visibilidad de capas", result: personLeak ? "FAIL" : "OK", detail: personLeak ? "Se detectan datos personales en capa 0/1." : "Capas 0 y 1 sin datos personales." });

  // 3 · datos personales en capa 2
  const contact = input.envelope.identity_layer?.contact_person;
  let legal_basis = contact?.legal_basis;
  if (contact && (!legal_basis || legal_basis === "NONE")) {
    blocked.push("identity_layer.contact_person");
    checks.push({ name: "Base jurídica", result: "WARN", detail: "Sin base jurídica declarada: solo se revelará la empresa." });
    legal_basis = "NONE";
  } else if (contact) {
    checks.push({ name: "Base jurídica", result: "OK", detail: `Base jurídica: ${legal_basis}.` });
  }

  // 4 · conflicto de plaza
  checks.push({ name: "Conflicto de plaza", result: input.adjacentSeatOverlap ? "WARN" : "OK", detail: input.adjacentSeatOverlap ? "Solapamiento adyacente con otra plaza." : "Sin solapamiento con otras plazas." });
  if (input.adjacentSeatOverlap) exceptions.push("ADJACENT_SEAT");

  // 5 · sector regulado
  checks.push({ name: "Sector regulado", result: input.receiverSpecialtyRegulated ? "WARN" : "OK", detail: input.receiverSpecialtyRegulated ? "Especialidad regulada: sin campos de retribución, revisión de Directiva." : "Especialidad sin restricciones de captación." });
  if (input.receiverSpecialtyRegulated) exceptions.push("REGULATED_SPECIALTY");

  // 7 · periodo de prueba
  const trial = input.receiverCompletedReferrals < 3;
  checks.push({ name: "Periodo de prueba", result: trial ? "WARN" : "OK", detail: trial ? "El cesionario tiene menos de 3 Cesiones completadas." : "Cesionario fuera del periodo de prueba." });
  if (trial) exceptions.push("TRIAL_PERIOD");

  // 8 · umbral de valor
  const overThreshold = input.estimatedValueMax > input.chapterValueThreshold;
  checks.push({ name: "Umbral de valor", result: overThreshold ? "WARN" : "OK", detail: overThreshold ? `Valor por encima del umbral de la Sala (${input.chapterValueThreshold.toLocaleString("es-ES")} €).` : "Valor por debajo del umbral de la Sala." });
  if (overThreshold) exceptions.push("VALUE_THRESHOLD");

  // 9 · reputación
  checks.push({ name: "Reputación", result: input.recentPolicyViolation ? "FAIL" : "OK", detail: input.recentPolicyViolation ? "Violación de política reciente en una de las partes." : "Sin violaciones recientes." });

  // 10 · retribución por referido (D-010)
  const feeHit = input.freeTexts.some((t) => FEE_PATTERNS.some((p) => p.test(t)));
  checks.push({ name: "Retribución por referido", result: feeHit ? "FAIL" : "OK", detail: feeHit ? "Indicio de contraprestación condicionada al referido (regla inmutable D-010)." : "Sin indicios de contraprestación." });

  const hasFail = checks.some((c) => c.result === "FAIL");
  const hasWarn = checks.some((c) => c.result === "WARN");
  // En el MVP, el periodo de prueba solo se anota: no exige Directiva por sí solo (D-003).
  const directorExceptions = exceptions.filter((e) => e !== "TRIAL_PERIOD");
  if (directorExceptions.length > 0) reviewers.add("DIRECTOR");

  return {
    verdict: hasFail ? "BLOCK" : hasWarn && directorExceptions.length > 0 ? "PASS_WITH_EXCEPTIONS" : "PASS",
    checks,
    exceptions,
    required_reviewers: [...reviewers],
    blocked_fields: [...new Set(blocked)],
    legal_basis,
  };
}

export function detectsReferralFee(text: string): boolean {
  return FEE_PATTERNS.some((p) => p.test(text));
}
