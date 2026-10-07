import { describe, expect, it } from "vitest";
import { buildExplanation, computeNSMatchScore, hardGates, WEIGHTS, PENALTY_WEIGHTS, type CapabilityView } from "@/core/scoring";
import { runComplianceGate, detectsReferralFee } from "@/core/compliance";
import { assertTransition, canTransition, MAX_INFO_ROUNDS, QUESTION_STATES, TIMEOUTS, TransitionError } from "@/core/state-machine";
import { computePromise, computeVerdictMerit } from "@/core/merit";
import { SEED_COMPANIES } from "@/db/seed-data";
import type { ChapterLayer, NeedDraft, QualificationLayer, QualificationTurn, SignalEnvelope } from "@/core/types";

const dnaOf = (slug: string) => SEED_COMPANIES.find((c) => c.slug === slug)!.dna;
const cap = (slug: string, specialty: string): CapabilityView => ({ companyId: slug, companyName: slug, specialtyCode: specialty, isPrimarySeat: true, dna: dnaOf(slug) });

const layer0A: ChapterLayer = { need_summary: "Empresa industrial de 51–200 empleados abrirá nueva sede en Dos Hermanas · 90 días · relación directa", industry: "Industrial", geography: { country: "España", region: "Andalucía", city: "Dos Hermanas" }, company_size_band: "51-200", timing: "90D", value_band: "50-100K", relationship_strength: "DIRECT", third_party_expects_contact: false, confidence: 0.9 };
const layer1A: QualificationLayer = { detailed_context: "Un cliente abre planta en Dos Hermanas en Q1.", triggers: ["NEW_SITE", "HEADCOUNT_GROWTH"], constraints: ["Presupuesto aprobado"], decision_role: "Director General" };
const needObra: NeedDraft = { specialty_hints: ["OBRA_INDUSTRIAL"], description: "Reforma y adecuación de la nueva nave o planta.", plausibility: 0.85, evidence: [], unknowns: [] };
const turnsA: QualificationTurn[] = [
  { kind: "BUDGET", question: "", answer: "Presupuesto aprobado internamente, cifra no conocida.", confidence: 0.6, insufficient: false },
  { kind: "TIMING", question: "", answer: "Licencia en trámite, inicio previsto febrero.", confidence: 0.8, insufficient: false },
  { kind: "DECISION_MAKER", question: "", answer: "Director General decide.", confidence: 0.9, insufficient: false },
];

describe("NS Match Score v0.1", () => {
  it("los pesos positivos suman 1.00 y las penalizaciones 0.70", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    expect(Object.values(PENALTY_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(0.7, 5);
  });
  it("Scenario A · Híspalis obtiene un Encaje alto y una Explanation completa", () => {
    const score = computeNSMatchScore(needObra, layer0A, layer1A, turnsA, cap("hispalis", "OBRA_INDUSTRIAL"));
    expect(score.total).toBeGreaterThanOrEqual(0.8);
    expect(["HIGH", "GOOD"]).toContain(score.band);
    const ex = buildExplanation(score, needObra, turnsA);
    expect(ex.why.length).toBeGreaterThanOrEqual(4);
    expect(ex.why.length).toBeLessThanOrEqual(7);
    expect(ex.next_action).toMatch(/Aceptar/);
    expect(ex.why[0]).toMatch(/nueva sede|NEW_SITE|trigger/i);
  });
  it("la confianza de la evidencia limita el score mostrado", () => {
    const weak = turnsA.map((t) => ({ ...t, confidence: 0.2, insufficient: true }));
    const strong = computeNSMatchScore(needObra, layer0A, layer1A, turnsA, cap("hispalis", "OBRA_INDUSTRIAL"));
    const weakScore = computeNSMatchScore(needObra, layer0A, layer1A, weak, cap("hispalis", "OBRA_INDUSTRIAL"));
    expect(weakScore.total).toBeLessThan(strong.total);
    expect(weakScore.penalties.some((p) => p.key === "uncertainty_penalty")).toBe(true);
  });
});

describe("Puertas duras (NS-ARP §7.1)", () => {
  it("Scenario C · Branding Atelier queda descartada por ticket mínimo sin llamar a ningún modelo", () => {
    const layer0: ChapterLayer = { ...layer0A, industry: "Tecnología", company_size_band: "1-10", value_band: "<10K", relationship_strength: "INDIRECT", timing: "90D" };
    const need: NeedDraft = { specialty_hints: ["BRANDING"], description: "Diseño de identidad de marca.", plausibility: 0.9, evidence: [], unknowns: [] };
    const gate = hardGates(need, layer0, cap("branding-atelier", "BRANDING"), { signalVisibility: "CHAPTER" });
    expect(gate.pass).toBe(false);
    expect(gate.code).toBe("TICKET_MISMATCH");
  });
  it("una señal COMPANY_ONLY sin autorización interna se bloquea por visibilidad", () => {
    const gate = hardGates(needObra, layer0A, cap("hispalis", "OBRA_INDUSTRIAL"), { signalVisibility: "COMPANY_ONLY" });
    expect(gate.code).toBe("VISIBILITY_BLOCK");
  });
  it("geografía fuera de zona de servicio descarta", () => {
    const gate = hardGates(needObra, { ...layer0A, geography: { country: "Portugal", city: "Lisboa" } }, cap("hispalis", "OBRA_INDUSTRIAL"), { signalVisibility: "CHAPTER" });
    expect(gate.code).toBe("OUT_OF_GEO");
  });
  it("un descalificador declarado en el ADN descarta", () => {
    const gate = hardGates({ ...needObra, description: "Reforma de vivienda unifamiliar" }, layer0A, cap("hispalis", "OBRA_INDUSTRIAL"), { signalVisibility: "CHAPTER" });
    expect(gate.code).toBe("EXPLICIT_EXCLUSION");
  });
});

describe("Trust & Compliance Gate (NS-ARP §8)", () => {
  const envelope: SignalEnvelope = { chapter_layer: layer0A, qualification_layer: layer1A, identity_layer: { third_party_company: { name: "Metalúrgica del Sur" }, contact_person: { name: "Rafael Montes", legal_basis: "LEGITIMATE_INTEREST" } } };
  const score = computeNSMatchScore(needObra, layer0A, layer1A, turnsA, cap("hispalis", "OBRA_INDUSTRIAL"));
  const base = { envelope, permissions: ["READ", "INFER", "STORE", "SHARE", "REVEAL_IDENTITY"] as const, score, receiverSpecialtyRegulated: false, adjacentSeatOverlap: false, receiverCompletedReferrals: 5, chapterValueThreshold: 250_000, estimatedValueMax: 100_000, recentPolicyViolation: false, freeTexts: [] };
  it("Scenario A · PASS sin excepciones", () => {
    const v = runComplianceGate({ ...base, permissions: [...base.permissions] });
    expect(v.verdict).toBe("PASS");
    expect(v.required_reviewers).toEqual(["ORIGINATOR", "RECEIVER"]);
    expect(v.blocked_fields).toEqual([]);
  });
  it("sin base jurídica se bloquea el contacto pero no la empresa", () => {
    const v = runComplianceGate({ ...base, permissions: ["READ", "INFER", "STORE", "SHARE"], envelope: { ...envelope, identity_layer: { third_party_company: { name: "X" }, contact_person: { name: "Y", legal_basis: "NONE" } } } });
    expect(v.verdict).not.toBe("BLOCK");
    expect(v.blocked_fields).toContain("identity_layer.contact_person");
  });
  it("regla inmutable D-010 · cualquier indicio de contraprestación bloquea", () => {
    const v = runComplianceGate({ ...base, permissions: [...base.permissions], freeTexts: ["Si cierra, te pago un 5 % de comisión."] });
    expect(v.verdict).toBe("BLOCK");
    expect(detectsReferralFee("a cambio de un descuento")).toBe(true);
    expect(detectsReferralFee("Le presento a mi contacto de obra.")).toBe(false);
  });
  it("sin SHARE en la fuente el veredicto es BLOCK", () => {
    const v = runComplianceGate({ ...base, permissions: ["READ", "INFER"] });
    expect(v.verdict).toBe("BLOCK");
  });
  it("especialidad regulada o solapamiento de plaza exigen Directiva", () => {
    const v = runComplianceGate({ ...base, permissions: [...base.permissions], receiverSpecialtyRegulated: true });
    expect(v.verdict).toBe("PASS_WITH_EXCEPTIONS");
    expect(v.required_reviewers).toContain("DIRECTOR");
  });
});

describe("Máquina de estados de la Cesión (NS-ARP §9)", () => {
  it("sigue el camino feliz y rechaza saltos", () => {
    expect(canTransition("ORIGINATOR_PENDING", "RECEIVER_PENDING", "ORIGINATOR")).toBe(true);
    expect(canTransition("RECEIVER_PENDING", "APPROVED", "RECEIVER")).toBe(true);
    expect(canTransition("APPROVED", "INTRO_AUTHORIZED", "ORIGINATOR")).toBe(true);
    expect(canTransition("INTRO_AUTHORIZED", "INTRODUCED", "ORIGINATOR")).toBe(true);
    expect(canTransition("INTRODUCED", "WON", "RECEIVER")).toBe(false); // hace falta reunión o propuesta antes del cierre directo desde INTRODUCED
    expect(canTransition("MEETING", "WON", "RECEIVER")).toBe(true);
    expect(canTransition("WON", "VALUE_CONFIRMED", "ORIGINATOR")).toBe(true);
    expect(canTransition("ORIGINATOR_PENDING", "APPROVED", "ORIGINATOR")).toBe(false);
    expect(canTransition("RECEIVER_PENDING", "APPROVED", "ORIGINATOR")).toBe(false);
    expect(() => assertTransition("VALUE_CONFIRMED", "DETECTED", "SYSTEM")).toThrow(TransitionError);
  });
  it("una pregunta nunca mueve la Cesión (D-065): ni a Cualificada ni al cedente; y un agente no puede aprobar por una persona", () => {
    expect(canTransition("RECEIVER_PENDING", "ORIGINATOR_PENDING", "RECEIVER")).toBe(false);
    expect(canTransition("RECEIVER_PENDING", "QUALIFIED", "RECEIVER")).toBe(false);
    expect(canTransition("ORIGINATOR_PENDING", "QUALIFIED", "ORIGINATOR")).toBe(false);
    expect(canTransition("ORIGINATOR_PENDING", "RECEIVER_PENDING", "ORIGINATOR")).toBe(true); // el visto bueno del cedente
    expect(canTransition("RECEIVER_PENDING", "APPROVED", "MATCHMAKER")).toBe(false);
    expect(MAX_INFO_ROUNDS).toBe(2);
    expect(TIMEOUTS.questionAnswerHours).toBe(24);
    expect(TIMEOUTS.questionReminderHours).toBeLessThan(TIMEOUTS.questionAnswerHours);
    expect(TIMEOUTS.reminderHours).toBe(24);
    expect(TIMEOUTS.secondReminderHours).toBe(48);
    expect(TIMEOUTS.expiryHours).toBe(72);
    expect(TIMEOUTS.directorHours).toBe(24);
    expect(canTransition("DIRECTOR_PENDING", "APPROVED", "SYSTEM")).toBe(true); // solo el Reloj, excepción de criterio (D-068)
    expect(canTransition("APPROVED", "INTRO_AUTHORIZED", "SYSTEM")).toBe(true); // solo la Apertura anticipada (D-067)
    expect(QUESTION_STATES.has("RECEIVER_PENDING") && QUESTION_STATES.has("APPROVED") && QUESTION_STATES.has("INTRODUCED")).toBe(true);
    expect(QUESTION_STATES.has("ORIGINATOR_PENDING")).toBe(false);
  });
});

describe("Promesa y Mérito (D-020, D-021)", () => {
  const score = computeNSMatchScore(needObra, layer0A, layer1A, turnsA, cap("hispalis", "OBRA_INDUSTRIAL"));
  it("la Promesa se fija con datos estructurados y da Mérito inmediato al cedente", () => {
    const p = computePromise(layer0A, score, turnsA);
    expect(p.estimated_value_min).toBe(50_000);
    expect(p.estimated_value_max).toBe(100_000);
    expect(p.components.find((c) => c.key === "decision_maker")?.status).toBe("GREEN");
    expect(p.merit_promise).toBeGreaterThan(70);
    expect(computePromise(layer0A, score, turnsA, { embassy: true }).merit_promise).toBeGreaterThan(p.merit_promise * 2);
  });
  it("el Veredicto suma Mérito de Veredicto y de Cierre; un Indicio falso retira la Promesa", () => {
    const p = computePromise(layer0A, score, turnsA);
    const won = computeVerdictMerit({ ease: 5, business: 4, treatment: 5, result: "WON", value_verified: 80_000, need_was_real: true }, p);
    expect(won.originator.verdict).toBeGreaterThan(0);
    expect(won.originator.close).toBeGreaterThan(0);
    expect(won.receiver.closedLoop).toBeGreaterThan(0);
    const fake = computeVerdictMerit({ ease: 1, business: 1, treatment: 1, result: "LOST", need_was_real: false }, p);
    expect(fake.originator.promiseRevoked).toBe(true);
    expect(fake.originator.verdict).toBe(0);
  });
});

describe("D-029 · Interesado avisado y D-032 · Encargo", () => {
  it("un Interesado avisado sube la relación y aparece en la Promesa", () => {
    const base = computeNSMatchScore(needObra, layer0A, layer1A, turnsA, cap("hispalis", "OBRA_INDUSTRIAL"));
    const warned = computeNSMatchScore(needObra, { ...layer0A, relationship_strength: "INDIRECT", third_party_expects_contact: true }, layer1A, turnsA, cap("hispalis", "OBRA_INDUSTRIAL"));
    const cold = computeNSMatchScore(needObra, { ...layer0A, relationship_strength: "INDIRECT" }, layer1A, turnsA, cap("hispalis", "OBRA_INDUSTRIAL"));
    expect(warned.total).toBeGreaterThan(cold.total);
    expect(warned.components.find((c) => c.key === "relationship_strength")?.evidence).toMatch(/sabe que le llamarán/);
    const p = computePromise({ ...layer0A, third_party_expects_contact: true }, base, turnsA);
    expect(p.components.find((c) => c.key === "expects_contact")?.status).toBe("GREEN");
    expect(computePromise(layer0A, base, turnsA).components.find((c) => c.key === "expects_contact")?.status).toBe("AMBER");
  });
  it("un Encargo abierto que coincide eleva la prioridad y lo dice en el Fundamento", () => {
    const withDemand = computeNSMatchScore(needObra, layer0A, layer1A, turnsA, { ...cap("prl-andaluza", "PRL"), openDemand: "Busco aperturas de centros de trabajo" });
    const without = computeNSMatchScore(needObra, layer0A, layer1A, turnsA, cap("prl-andaluza", "PRL"));
    expect(withDemand.total).toBeGreaterThan(without.total);
    expect(buildExplanation(withDemand, needObra, turnsA).why.some((w) => w.includes("Encargo"))).toBe(true);
  });
});

describe("Titular de la Cesión (D-077)", () => {
  it("la Cesión se titula con la necesidad emparejada, no con la cabecera del Indicio", async () => {
    const { cesionHeadline, needPhrase, subjectOf } = await import("@/core/headline");
    // Un Indicio de contratación (cabecera: selección de personal) también deriva obra para Híspalis.
    const layer0: ChapterLayer = { ...layer0A, need_summary: "Empresa industrial de 51–200 empleados necesita selección de las nuevas incorporaciones · 90 días · fuente pública" };
    expect(subjectOf(layer0)).toBe("Empresa industrial de 51–200 empleados");
    expect(needPhrase("Adecuación de la línea de producción.")).toBe("adecuación de la línea de producción");
    expect(cesionHeadline({ description: "Adecuación de la línea de producción." }, layer0)).toBe("Empresa industrial de 51–200 empleados necesita adecuación de la línea de producción");
    expect(cesionHeadline({ description: "Marca de la nueva línea." }, { industry: "Tecnología", company_size_band: "1-10" })).toBe("Empresa tecnológica de 1–10 empleados necesita marca de la nueva línea");
    expect(cesionHeadline({ description: "Fiscalidad internacional." }, { industry: "Agroalimentario", company_size_band: "11-50" })).toBe("Empresa de agroalimentario de 11–50 empleados necesita fiscalidad internacional");
  });

  it("el Puente determinista presenta la necesidad del cesionario, no la cabecera del Indicio", async () => {
    const { DeterministicProvider } = await import("@/agents/deterministic");
    const pkg = await new DeterministicProvider().draftIntro({
      originatorCompany: "Consultora Fiscal Triana", originatorPerson: "Alberto Vidal", receiverCompany: "Reformas Industriales Híspalis", receiverPerson: "Carlos Ruiz",
      receiverServices: ["Adecuación de plantas de producción", "Oficinas dentro de nave"], thirdPartyCompany: "Farmalab Andalucía", contactName: "Lucía",
      needSummary: "Empresa industrial de 51–200 empleados necesita selección de las nuevas incorporaciones · 90 días · relación directa",
      needDescription: "Adecuación de la línea de producción.", detailedContext: "Nueva línea en Alcalá.", introductionPreferences: "Visita a planta.",
    });
    expect(pkg.subject).toBe("Presentación: Reformas Industriales Híspalis · Adecuación de la línea de producción");
    expect(pkg.message).toContain("vuestra empresa industrial de 51–200 empleados necesita adecuación de la línea de producción");
    expect(pkg.message).not.toMatch(/selección/);
  });
});
