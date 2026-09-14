import { describe, expect, it } from "vitest";
import { buildExplanation, computeNSMatchScore, hardGates, WEIGHTS, PENALTY_WEIGHTS, type CapabilityView } from "@/core/scoring";
import { runComplianceGate, detectsReferralFee } from "@/core/compliance";
import { assertTransition, canTransition, TransitionError } from "@/core/state-machine";
import { computePromise, computeVerdictMerit } from "@/core/merit";
import { avalBand, computeEcoMerit, computeReferralAval, computeTitularAval, DESTACADO, EMBASSY_ELIGIBILITY, isDestacado } from "@/core/aval";
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
  it("REQUEST_INFO devuelve a QUALIFIED y un agente no puede aprobar por una persona", () => {
    expect(canTransition("RECEIVER_PENDING", "QUALIFIED", "RECEIVER")).toBe(true);
    expect(canTransition("RECEIVER_PENDING", "APPROVED", "MATCHMAKER")).toBe(false);
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

describe("D-042 · Eco y Aval", () => {
  const score = computeNSMatchScore(needObra, layer0A, layer1A, turnsA, cap("hispalis", "OBRA_INDUSTRIAL"));
  const promise = computePromise(layer0A, score, turnsA);
  const verdict = { ease: 5, business: 4, treatment: 5, result: "WON" as const, value_verified: 80_000, need_was_real: true };
  it("el Aval de una Cesión es provisional sin Eco, firme con Veredicto y Eco, nulo si el Indicio era falso", () => {
    const soloPromesa = computeReferralAval({ promise });
    expect(soloPromesa.status).toBe("PROVISIONAL");
    expect(soloPromesa.parts.find((p) => p.key === "eco")?.value).toBeNull();
    const conVeredicto = computeReferralAval({ promise, verdict });
    expect(conVeredicto.status).toBe("PROVISIONAL");
    const firme = computeReferralAval({ promise, verdict, eco: { attention: 5, result: 5, recommend: 5 } });
    expect(firme.status).toBe("FIRME");
    expect(firme.total).toBeGreaterThan(conVeredicto.total);
    const malEco = computeReferralAval({ promise, verdict, eco: { attention: 1, result: 1, recommend: 1 } });
    expect(malEco.total).toBeLessThan(conVeredicto.total); // la voz del Interesado pesa más que ninguna otra parte
    const sinEco = computeReferralAval({ promise, verdict, ecoWindowClosed: true });
    expect(sinEco.status).toBe("SIN_ECO");
    expect(computeReferralAval({ promise, verdict, eco: { attention: 4, result: 4, recommend: 4, phase: "DURANTE" } }).status).toBe("PROVISIONAL"); // el Eco durante no cierra el Aval
    expect(computeReferralAval({ promise, verdict, eco: { attention: 4, result: 4, recommend: 4, phase: "DURANTE" }, ecoWindowClosed: true }).status).toBe("FIRME"); // salvo si la ventana se cerró
    expect(computeReferralAval({ promise, verdict: { ...verdict, need_was_real: false }, eco: { attention: 5, result: 5, recommend: 5 } })).toMatchObject({ total: 0, status: "NULO" });
    expect(avalBand(90).key).toBe("ALTO");
    expect(avalBand(40).key).toBe("BAJO");
  });
  it("el Aval del titular tiene cuatro bloques, arranca neutro y premia la voz de los Interesados y la respuesta", () => {
    const nuevo = computeTitularAval({ ecosReceived: [], givenAvals: [], responses: { onTime: 0, late: 0, ecoSent: 0, ecoMissed: 0 }, contribution: { validGiven: 0, weeks: 0, pace: 1, embassies: 0 } });
    expect(nuevo.total).toBe(60);
    expect(nuevo.provisional).toBe(true);
    expect(nuevo.blocks.every((b) => !b.hasData)).toBe(true);
    expect(nuevo.embassyEligible).toBe(false);
    const bueno = computeTitularAval({ ecosReceived: [1, 0.92, 1], givenAvals: [88, 91], responses: { onTime: 6, late: 0, ecoSent: 3, ecoMissed: 0 }, contribution: { validGiven: 10, weeks: 8, pace: 1, embassies: 1 } });
    expect(bueno.total).toBeGreaterThanOrEqual(EMBASSY_ELIGIBILITY.minAval);
    expect(bueno.embassyEligible).toBe(true);
    expect(bueno.provisional).toBe(false);
    const lento = computeTitularAval({ ...{ ecosReceived: [1, 0.92, 1], givenAvals: [88, 91], contribution: { validGiven: 10, weeks: 8, pace: 1, embassies: 1 } }, responses: { onTime: 1, late: 5, ecoSent: 0, ecoMissed: 3 } });
    expect(lento.total).toBeLessThan(bueno.total);
    const callado = computeTitularAval({ ecosReceived: [0.3, 0.25, 0.4], givenAvals: [88, 91], responses: { onTime: 6, late: 0, ecoSent: 3, ecoMissed: 0 }, contribution: { validGiven: 10, weeks: 8, pace: 1, embassies: 1 } });
    expect(callado.embassyEligible).toBe(false);
  });
  it("el Eco da Mérito al cesionario y una parte al cedente; la Embajada lo multiplica", () => {
    const m = computeEcoMerit({ attention: 5, result: 5, recommend: 5 });
    expect(m.receiver).toBe(80);
    expect(m.originator).toBe(30);
    expect(computeEcoMerit({ attention: 5, result: 5, recommend: 5 }, { embassy: true }).receiver).toBe(120);
    expect(computeEcoMerit({ attention: 1, result: 1, recommend: 1 })).toEqual({ receiver: 0, originator: 0 });
  });
});

describe("D-043 · Titular Destacado (umbral 85 confirmado)", () => {
  const disciplined = { responses: { onTime: 10, late: 0, ecoSent: 3, ecoMissed: 0 }, contribution: { validGiven: 12, weeks: 12, pace: 1, embassies: 0 } };
  const eco = (m: number) => (m - 1) / 4;
  it("85 es quien cumple todo con Ecos de 4/5 y lo cedido a 80; 80 no basta ni con Ecos perfectos y media disciplina", () => {
    const justo = computeTitularAval({ ecosReceived: [eco(4), eco(4), eco(4)], givenAvals: [80, 80, 80], ...disciplined });
    expect(justo.total).toBe(DESTACADO.minAval);
    expect(isDestacado({ ...justo, breaches: 0 })).toBe(true);
    const perfectosPeroVagos = computeTitularAval({ ecosReceived: [1, 1, 1], givenAvals: [90, 90, 90], responses: { onTime: 5, late: 5, ecoSent: 0, ecoMissed: 0 }, contribution: { validGiven: 6, weeks: 12, pace: 1, embassies: 0 } });
    expect(perfectosPeroVagos.total).toBe(80);
    expect(isDestacado({ ...perfectosPeroVagos, breaches: 0 })).toBe(false);
    const discretos = computeTitularAval({ ecosReceived: [eco(3.5), eco(3.5), eco(3.5)], givenAvals: [80, 80, 80], ...disciplined });
    expect(discretos.total).toBe(80);
  });
  it("exige Aval firme (3 Ecos y 3 Cesiones cedidas) y ningún incumplimiento en el Ejercicio", () => {
    const pocosDatos = computeTitularAval({ ecosReceived: [1, 1], givenAvals: [90], ...disciplined });
    expect(pocosDatos.total).toBeGreaterThanOrEqual(85);
    expect(isDestacado({ ...pocosDatos, breaches: 0 })).toBe(false);
    const excelente = computeTitularAval({ ecosReceived: [1, 1, 1], givenAvals: [90, 90, 90], ...disciplined });
    expect(isDestacado({ ...excelente, breaches: 0 })).toBe(true);
    expect(isDestacado({ ...excelente, breaches: 1 })).toBe(false);
  });
});
