/**
 * NS-ARP · tipos del protocolo (v0.2)
 * Fuente: docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md, docs/06_DATA_MODEL.md
 * Los LLM razonan. El sistema mantiene estado: todo lo que hay aquí es estado persistido y tipado.
 */
import { z } from "zod";

export const PROTOCOL_VERSION = "0.2";

// ───────────────────────── Visibilidad y permisos ─────────────────────────
export const Visibility = z.enum([
  "PUBLIC",
  "CHAPTER",
  "MATCHED_PARTY",
  "DIRECTORS",
  "COMPANY_ONLY",
  "NEVER_SHARE",
]);
export type Visibility = z.infer<typeof Visibility>;

export const PermissionVerb = z.enum([
  "READ",
  "INFER",
  "STORE",
  "SHARE",
  "REVEAL_IDENTITY",
  "CONTACT",
  "WRITE",
  "EXECUTE",
]);
export type PermissionVerb = z.infer<typeof PermissionVerb>;

// ───────────────────────── Bandas del envelope ─────────────────────────
export const SizeBand = z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]);
export type SizeBand = z.infer<typeof SizeBand>;

export const TimingBand = z.enum(["IMMEDIATE", "30D", "90D", "180D", "UNKNOWN"]);
export type TimingBand = z.infer<typeof TimingBand>;

export const ValueBand = z.enum(["<10K", "10-50K", "50-100K", "100-500K", ">500K"]);
export type ValueBand = z.infer<typeof ValueBand>;

/** Rango en euros de cada banda de valor. */
export const VALUE_BAND_RANGE: Record<ValueBand, { min: number; max: number }> = {
  "<10K": { min: 0, max: 10_000 },
  "10-50K": { min: 10_000, max: 50_000 },
  "50-100K": { min: 50_000, max: 100_000 },
  "100-500K": { min: 100_000, max: 500_000 },
  ">500K": { min: 500_000, max: 5_000_000 },
};

export const RelationshipStrength = z.enum(["DIRECT", "INDIRECT", "WEAK", "UNKNOWN"]);
export type RelationshipStrength = z.infer<typeof RelationshipStrength>;

export const GeoScope = z.object({
  country: z.string(),
  region: z.string().optional(),
  city: z.string().optional(),
});
export type GeoScope = z.infer<typeof GeoScope>;

// ───────────────────────── Business DNA (ADN de Empresa) ─────────────────────────
export const IdealCustomerProfile = z.object({
  industries: z.array(z.string()).default([]),
  company_size: z.array(SizeBand).default([]),
  geography: z.array(z.string()).default([]), // ciudades/regiones/países servidos
  roles: z.array(z.string()).default([]),
  triggers: z.array(z.string()).default([]), // códigos de trigger: NEW_SITE, HEADCOUNT_GROWTH...
  problems: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]), // industrias excluidas
});
export type IdealCustomerProfile = z.infer<typeof IdealCustomerProfile>;

export const BusinessDNA = z.object({
  company: z.object({
    description: z.string(),
    locations: z.array(z.string()).default([]),
    website: z.string().optional(),
    certifications: z.array(z.string()).default([]),
    credibility: z.array(z.string()).default([]),
  }),
  offering: z.object({
    services: z.array(z.string()).default([]),
    products: z.array(z.string()).default([]),
    differentiators: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
    capacity: z.enum(["OPEN", "LIMITED", "FULL"]).default("OPEN"),
  }),
  ideal_customer: IdealCustomerProfile,
  commercial: z.object({
    average_ticket: z.number().optional(),
    ticket_min: z.number().optional(),
    ticket_max: z.number().optional(),
    sales_cycle_days: z.number().optional(),
    strategic_priority: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).default(1),
    urgency: TimingBand.default("90D"),
  }),
  referrals: z.object({
    perfect_referral: z.string().default(""),
    acceptable_referral: z.string().default(""),
    poor_referral: z.string().default(""),
    disqualifiers: z.array(z.string()).default([]),
    introduction_preferences: z.string().default(""),
  }),
  knowledge: z.object({
    public: z.array(z.string()).default([]),
    chapter_only: z.array(z.string()).default([]),
    match_only: z.array(z.string()).default([]),
    management_only: z.array(z.string()).default([]),
    never_share: z.array(z.string()).default([]),
  }),
  permissions: z.object({
    auto_publish_chapter_signals: z.boolean().default(false),
    external_contact: z.boolean().default(false),
    human_approval_required: z.boolean().default(true),
  }),
  objectives: z.object({
    monthly: z.string().default(""),
    quarterly: z.string().default(""),
    strategic: z.string().default(""),
  }),
});
export type BusinessDNA = z.infer<typeof BusinessDNA>;

// ───────────────────────── Envelope de una señal (Indicio) ─────────────────────────
export const BusinessTrigger = z.enum([
  "NEW_SITE",
  "HEADCOUNT_GROWTH",
  "INTERNATIONAL_EXPANSION",
  "FUNDING_ROUND",
  "COMPANY_SALE",
  "NEW_PRODUCT",
  "REGULATORY_CHANGE",
  "SUPPLIER_CHANGE",
  "DIGITALIZATION",
  "FLEET_RENEWAL",
  "LEADERSHIP_CHANGE",
  "OTHER",
]);
export type BusinessTrigger = z.infer<typeof BusinessTrigger>;

export const ChapterLayer = z.object({
  need_summary: z.string(),
  industry: z.string(),
  geography: GeoScope,
  company_size_band: SizeBand,
  timing: TimingBand,
  value_band: ValueBand.optional(),
  relationship_strength: RelationshipStrength,
  third_party_expects_contact: z.boolean().default(false), // D-029 · el Interesado sabe que le llamarán
  confidence: z.number().min(0).max(1),
});
export type ChapterLayer = z.infer<typeof ChapterLayer>;

export const QualificationLayer = z.object({
  detailed_context: z.string(),
  triggers: z.array(BusinessTrigger),
  constraints: z.array(z.string()).default([]),
  decision_role: z.string().optional(),
});
export type QualificationLayer = z.infer<typeof QualificationLayer>;

export const LegalBasis = z.enum(["CONSENT", "LEGITIMATE_INTEREST", "CONTRACT", "NONE"]);
export type LegalBasis = z.infer<typeof LegalBasis>;

export const IdentityLayer = z.object({
  third_party_company: z.object({
    name: z.string(),
    website: z.string().optional(),
    tax_id: z.string().optional(),
  }),
  contact_person: z
    .object({
      name: z.string(),
      role: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      legal_basis: LegalBasis,
    })
    .optional(),
  originator_notes: z.string().optional(),
});
export type IdentityLayer = z.infer<typeof IdentityLayer>;

export const PrivateLayer = z.object({
  source_material_refs: z.array(z.string()).default([]),
  internal_notes: z.string().default(""),
});
export type PrivateLayer = z.infer<typeof PrivateLayer>;

export const SignalEnvelope = z.object({
  chapter_layer: ChapterLayer,
  qualification_layer: QualificationLayer.optional(),
  identity_layer: IdentityLayer.optional(),
  private_layer: PrivateLayer.optional(),
});
export type SignalEnvelope = z.infer<typeof SignalEnvelope>;

export const NeedDraft = z.object({
  specialty_hints: z.array(z.string()).min(1), // códigos NS-CAT
  description: z.string(),
  plausibility: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
  unknowns: z.array(z.string()).default([]),
});
export type NeedDraft = z.infer<typeof NeedDraft>;

// ───────────────────────── Cualificación agente-a-agente ─────────────────────────
export const QualificationQuestionKind = z.enum([
  "BUDGET",
  "TIMING",
  "DECISION_MAKER",
  "SCOPE",
  "CONSTRAINT",
  "FREE",
]);
export type QualificationQuestionKind = z.infer<typeof QualificationQuestionKind>;

export const QualificationTurn = z.object({
  kind: QualificationQuestionKind,
  question: z.string(),
  answer: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  insufficient: z.boolean().default(false),
  /** Pregunta al cedente (D-058): la formula el cesionario en la revisión; la responde el cedente en persona. */
  asked_by: z.enum(["RECEIVER"]).optional(),
  answered_by: z.enum(["ORIGINATOR"]).optional(),
  /** Borrador de respuesta que el Agente del cedente saca del Indicio; el Timonel lo confirma o lo corrige. */
  draft_answer: z.string().optional(),
});
export type QualificationTurn = z.infer<typeof QualificationTurn>;

export const DisqualificationCode = z.enum([
  "OUT_OF_GEO",
  "OUT_OF_ICP",
  "TICKET_MISMATCH",
  "NO_CAPACITY",
  "CONFLICT",
  "DUPLICATE",
  "EXPLICIT_EXCLUSION",
  "VISIBILITY_BLOCK",
  "OTHER",
]);
export type DisqualificationCode = z.infer<typeof DisqualificationCode>;

// ───────────────────────── NS Match Score (Encaje) ─────────────────────────
export const ScoreComponentKey = z.enum([
  "trigger_fit",
  "customer_profile_fit",
  "semantic_fit",
  "deal_size_fit",
  "timing_fit",
  "capacity_fit",
  "strategic_priority",
  "relationship_strength",
  "qualification_quality",
  "member_reputation",
  "historical_conversion",
]);
export type ScoreComponentKey = z.infer<typeof ScoreComponentKey>;

export const PenaltyKey = z.enum([
  "privacy_risk",
  "conflict_risk",
  "duplicate_risk",
  "disqualification_signals",
  "uncertainty_penalty",
]);
export type PenaltyKey = z.infer<typeof PenaltyKey>;

export const ScoreComponent = z.object({
  key: ScoreComponentKey,
  value: z.number().min(0).max(1),
  weight: z.number(),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
});
export type ScoreComponent = z.infer<typeof ScoreComponent>;

export const ScorePenalty = z.object({
  key: PenaltyKey,
  value: z.number().min(0).max(1),
  weight: z.number(),
  evidence: z.string(),
});
export type ScorePenalty = z.infer<typeof ScorePenalty>;

export const ScoreBand = z.enum(["HIGH", "GOOD", "PARTIAL", "LOW"]);
export type ScoreBand = z.infer<typeof ScoreBand>;

export const NSMatchScore = z.object({
  total: z.number(),
  positive: z.number(),
  penalty: z.number(),
  evidence_confidence: z.number(),
  band: ScoreBand,
  components: z.array(ScoreComponent),
  penalties: z.array(ScorePenalty),
  profile_version: z.string(),
});
export type NSMatchScore = z.infer<typeof NSMatchScore>;

export const Explanation = z.object({
  why: z.array(z.string()).max(7),
  evidence: z.array(z.string()),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  unknowns: z.array(z.string()),
  next_action: z.string(),
  negatives: z.array(z.string()),
});
export type Explanation = z.infer<typeof Explanation>;

// ───────────────────────── Salvoconducto (Compliance) ─────────────────────────
export const ComplianceCheck = z.object({
  name: z.string(),
  result: z.enum(["OK", "WARN", "FAIL"]),
  detail: z.string(),
});
export type ComplianceCheck = z.infer<typeof ComplianceCheck>;

export const Reviewer = z.enum(["ORIGINATOR", "RECEIVER", "DIRECTOR"]);
export type Reviewer = z.infer<typeof Reviewer>;

export const ComplianceVerdict = z.object({
  verdict: z.enum(["PASS", "PASS_WITH_EXCEPTIONS", "BLOCK"]),
  checks: z.array(ComplianceCheck),
  exceptions: z.array(z.string()),
  required_reviewers: z.array(Reviewer),
  blocked_fields: z.array(z.string()),
  legal_basis: LegalBasis.optional(),
});
export type ComplianceVerdict = z.infer<typeof ComplianceVerdict>;

// ───────────────────────── Ciclo de vida de la Cesión ─────────────────────────
export const ReferralState = z.enum([
  "DETECTED",
  "INVESTIGATING",
  "AGENT_MATCHED",
  "QUALIFIED",
  "COMPLIANCE_CHECK",
  "ORIGINATOR_PENDING",
  "RECEIVER_PENDING",
  "DIRECTOR_PENDING",
  "APPROVED",
  "INTRO_AUTHORIZED",
  "INTRODUCED",
  "MEETING",
  "COMMERCIAL_OPPORTUNITY",
  "WON",
  "LOST",
  "NO_DECISION",
  "VALUE_CONFIRMED",
  // terminales laterales
  "DISQUALIFIED",
  "BLOCKED",
  "REJECTED_BY_MEMBER",
  "WITHDRAWN_BY_ORIGINATOR",
  "EXPIRED",
]);
export type ReferralState = z.infer<typeof ReferralState>;

export const HumanDecisionKind = z.enum(["APPROVE", "REQUEST_INFO", "ANSWER", "REJECT", "DEFER"]);
export type HumanDecisionKind = z.infer<typeof HumanDecisionKind>;

export const RevealScope = z.enum(["COMPANY_ONLY", "COMPANY_AND_CONTACT"]);
export type RevealScope = z.infer<typeof RevealScope>;

// ───────────────────────── Promesa (D-021) ─────────────────────────
export const PromiseComponentKey = z.enum([
  "expects_contact",
  "real_need",
  "information_complete",
  "decision_maker",
  "timing",
  "budget",
]);
export type PromiseComponentKey = z.infer<typeof PromiseComponentKey>;

export const PromiseComponent = z.object({
  key: PromiseComponentKey,
  status: z.enum(["GREEN", "AMBER", "RED"]),
  detail: z.string(),
});

export const ReferralPromise = z.object({
  estimated_value_min: z.number(),
  estimated_value_max: z.number(),
  fit: z.number(), // Encaje 0..1
  components: z.array(PromiseComponent),
  promise_score: z.number().min(0).max(1),
  merit_promise: z.number(), // Mérito de Promesa para el cedente
  adjusted_by_receiver: z.boolean().default(false),
  receiver_adjustment_note: z.string().optional(),
});
export type ReferralPromise = z.infer<typeof ReferralPromise>;

// ───────────────────────── Veredicto (D-020) ─────────────────────────
export const VerdictAxis = z.enum(["FACILIDAD", "NEGOCIO", "TRATO"]);
export type VerdictAxis = z.infer<typeof VerdictAxis>;

export const ReferralVerdict = z.object({
  ease: z.number().int().min(1).max(5),
  business: z.number().int().min(1).max(5),
  treatment: z.number().int().min(1).max(5),
  result: z.enum(["WON", "LOST", "NO_DECISION"]),
  value_verified: z.number().optional(),
  need_was_real: z.boolean().default(true),
  notes: z.string().optional(),
});
export type ReferralVerdict = z.infer<typeof ReferralVerdict>;

export const TrustEventKind = z.enum([
  "REFERRAL_ACCEPTED",
  "REFERRAL_DECLINED_WITH_REASON",
  "RESPONSE_ON_TIME",
  "RESPONSE_LATE",
  "INTRO_COMPLETED",
  "OUTCOME_REPORTED",
  "VALUE_VERIFIED",
  "PROMISE_EARNED",
  "PROMISE_REVOKED",
  "VERDICT_MERIT",
  "CLOSE_MERIT",
  "RECEIVER_MERIT",
  "RECOGNITION_GIVEN",
  "COMPLAINT",
  "DISPUTE_OPENED",
  "DISPUTE_RESOLVED",
  "POLICY_VIOLATION",
  "REFERRAL_FEE_VIOLATION",
  "CONTRIBUTION_QUOTA_MET",
  "CONTRIBUTION_QUOTA_MISSED",
  "DIRECTOR_INTERCHAPTER_ACTION", // D-048 · acción entre Salas promovida por la Directiva
  "DIRECTOR_QUERY_RESOLVED", // D-048 · duda entre Timoneles resuelta por la Directiva
  "NETWORK_SEAT_BONUS", // D-047 · misma empresa titular en otra Sala de la zona
]);
export type TrustEventKind = z.infer<typeof TrustEventKind>;

// ───────────────────────── Puente ─────────────────────────
export const IntroPackage = z.object({
  subject: z.string(),
  message: z.string(),
  context_for_receiver: z.string(),
  suggested_next_step: z.string(),
});
export type IntroPackage = z.infer<typeof IntroPackage>;

export const IntroChannel = z.enum(["NS_MESSAGE", "EMAIL_BY_MEMBER", "MEETING", "PHONE_BY_MEMBER"]);
export type IntroChannel = z.infer<typeof IntroChannel>;

// ───────────────────────── Auditoría ─────────────────────────
export const ActorType = z.enum(["AGENT", "USER", "SYSTEM"]);
export type ActorType = z.infer<typeof ActorType>;

export interface AuditEventInput {
  chapterId: string;
  kind: string;
  actor: { type: ActorType; id: string };
  subject: { type: string; id: string };
  inputsUsed?: { type: string; id: string; layer?: 0 | 1 | 2 | 3 }[];
  policyApplied?: string;
  result: string;
  significant?: boolean; // aparece en la Mesa Permanente
  companyIds?: string[]; // empresas que pueden ver el evento (vacío = toda la Sala)
}
