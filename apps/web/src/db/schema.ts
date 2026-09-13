/**
 * Esquema Postgres (Drizzle) · docs/06_DATA_MODEL.md
 * Todo objeto de negocio lleva chapter_id (multi-tenancy explícita: Zona → Sala → Empresa → Persona).
 */
import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type {
  AuditEventInput,
  BusinessDNA,
  ComplianceVerdict,
  Explanation,
  IntroPackage,
  NSMatchScore,
  QualificationTurn,
  ReferralPromise,
  ReferralVerdict,
  SignalEnvelope,
} from "@/core/types";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ───────────── Estructura: Zona, Sala, NS-CAT, Plaza ─────────────
export const zones = pgTable("zones", {
  id: id(),
  country: text("country").notNull(),
  name: text("name").notNull(), // "NS Sevilla"
  slug: text("slug").notNull().unique(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: createdAt(),
});

export const chapters = pgTable("chapters", {
  id: id(),
  zoneId: uuid("zone_id").notNull().references(() => zones.id),
  name: text("name").notNull().unique(), // "NS Cumbre", único en la red (D-014)
  slug: text("slug").notNull().unique(),
  nameStatus: text("name_status").notNull().default("AUTHORIZED"),
  status: text("status").notNull().default("ACTIVE"),
  protocolVersion: text("protocol_version").notNull().default("0.2"),
  valueThresholdEur: integer("value_threshold_eur").notNull().default(250_000),
  weeklyPace: integer("weekly_pace").notNull().default(1),
  createdAt: createdAt(),
});

export const specialties = pgTable("specialties", {
  id: id(),
  nscatCode: text("nscat_code").notNull().unique(), // p. ej. "NS-K.65.12.01"
  cnaeClass: text("cnae_class"),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("OFFICIAL"), // OFFICIAL | NS_EXTENDED | PROVISIONAL | RETIRED
  regulated: boolean("regulated").notNull().default(false),
  overlapsWith: jsonb("overlaps_with").$type<string[]>().notNull().default([]),
});

export const categorySeats = pgTable(
  "category_seats",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    specialtyId: uuid("specialty_id").notNull().references(() => specialties.id),
    companyId: uuid("company_id"),
    status: text("status").notNull().default("VACANT"), // ACTIVE | VACANT | WAITLISTED | RELEASED
    grantedAt: timestamp("granted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("seat_unique").on(t.chapterId, t.specialtyId)],
);

// ───────────── Empresa, persona, ADN, Agente ─────────────
export const companies = pgTable("companies", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  legalName: text("legal_name"),
  website: text("website"),
  city: text("city").notNull().default("Sevilla"),
  status: text("status").notNull().default("ACTIVE"), // APPLICANT | ACTIVE | SUSPENDED | RELEASED
  tier: text("tier").notNull().default("MIEMBRO"),
  feeTier: text("fee_tier").notNull().default("ENTRADA"), // D-025
  createdAt: createdAt(),
});

/** Timonel (D-027): la persona que decide por la empresa. is_primary = Timonel; otro registro = Timonel suplente. */
export const members = pgTable("members", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default(""),
  email: text("email").notNull().unique(),
  isPrimary: boolean("is_primary").notNull().default(true),
  isDirector: boolean("is_director").notNull().default(false),
  createdAt: createdAt(),
});

export const businessDna = pgTable("business_dna", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id).unique(),
  version: integer("version").notNull().default(1),
  dna: jsonb("dna").$type<BusinessDNA>().notNull(),
  validatedBy: uuid("validated_by"),
  validatedAt: timestamp("validated_at", { withTimezone: true }),
  updatedAt: updatedAt(),
});

export const capabilities = pgTable(
  "capabilities",
  {
    id: id(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    specialtyId: uuid("specialty_id").notNull().references(() => specialties.id),
    isPrimarySeat: boolean("is_primary_seat").notNull().default(true),
  },
  (t) => [index("cap_chapter_specialty").on(t.chapterId, t.specialtyId)],
);

export const agents = pgTable("agents", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  companyId: uuid("company_id").references(() => companies.id), // null para agentes de Sala
  kind: text("kind").notNull(), // COMPANY | MATCHMAKER | COMPLIANCE | CHAPTER_INTELLIGENCE | BRIEFING
  status: text("status").notNull().default("ACTIVE"),
  activatedAt: timestamp("activated_at", { withTimezone: true }).defaultNow(),
});

// ───────────── Indicio y necesidades ─────────────
export const businessSignals = pgTable("business_signals", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  source: text("source").notNull(), // MEMBER_INPUT | AGENT_CHECKIN | WEBSITE | INTEGRATION | PUBLIC_RECORD
  rawContent: text("raw_content").notNull(),
  visibility: text("visibility").notNull().default("CHAPTER"),
  permissions: jsonb("permissions").$type<string[]>().notNull(),
  createdByMemberId: uuid("created_by_member_id"),
  createdAt: createdAt(),
});

export const opportunitySignals = pgTable(
  "opportunity_signals",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    businessSignalId: uuid("business_signal_id").notNull().references(() => businessSignals.id),
    originatorCompanyId: uuid("originator_company_id").notNull().references(() => companies.id),
    envelope: jsonb("envelope").$type<SignalEnvelope>().notNull(),
    visibility: text("visibility").notNull().default("CHAPTER"),
    status: text("status").notNull().default("DRAFT"), // DRAFT | PUBLISHED | WITHDRAWN | EXPIRED
    protocolVersion: text("protocol_version").notNull().default("0.2"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("os_chapter_status").on(t.chapterId, t.status)],
);

export const needs = pgTable("needs", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  opportunitySignalId: uuid("opportunity_signal_id").notNull().references(() => opportunitySignals.id),
  specialtyHints: jsonb("specialty_hints").$type<string[]>().notNull(),
  description: text("description").notNull(),
  plausibility: numeric("plausibility", { precision: 4, scale: 3 }).notNull(),
  evidence: jsonb("evidence").$type<string[]>().notNull().default([]),
  unknowns: jsonb("unknowns").$type<string[]>().notNull().default([]),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE | LATENT | COVERED | UNCOVERED
});

// ───────────── Pista: claims, cualificación, match ─────────────
export const interestClaims = pgTable("interest_claims", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  needId: uuid("need_id").notNull().references(() => needs.id),
  claimantCompanyId: uuid("claimant_company_id").notNull().references(() => companies.id),
  capabilityId: uuid("capability_id").notNull().references(() => capabilities.id),
  preliminaryFit: numeric("preliminary_fit", { precision: 4, scale: 3 }).notNull(),
  rationale: text("rationale").notNull().default(""),
  status: text("status").notNull().default("PENDING"), // PENDING | ACCEPTED | DECLINED | EXPIRED | NO_INTEREST
  declineCode: text("decline_code"),
  createdAt: createdAt(),
});

export const qualifications = pgTable("qualifications", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  interestClaimId: uuid("interest_claim_id").notNull().references(() => interestClaims.id),
  turns: jsonb("turns").$type<QualificationTurn[]>().notNull().default([]),
  outcome: text("outcome").notNull().default("OPEN"), // QUALIFIED | DISQUALIFIED | INSUFFICIENT_INFORMATION | OPEN
  disqualificationCode: text("disqualification_code"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const matchCandidates = pgTable("match_candidates", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  needId: uuid("need_id").notNull().references(() => needs.id),
  originatorCompanyId: uuid("originator_company_id").notNull().references(() => companies.id),
  receiverCompanyId: uuid("receiver_company_id").notNull().references(() => companies.id),
  qualificationId: uuid("qualification_id").references(() => qualifications.id),
  score: jsonb("score").$type<NSMatchScore>().notNull(),
  explanation: jsonb("explanation").$type<Explanation>().notNull(),
  compliance: jsonb("compliance").$type<ComplianceVerdict>(),
  status: text("status").notNull().default("PROPOSED"), // PROPOSED | ACCEPTED | REJECTED | EXPIRED | BELOW_THRESHOLD
  createdAt: createdAt(),
});

// ───────────── Cesión ─────────────
export const referrals = pgTable(
  "referrals",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    matchId: uuid("match_id").notNull().references(() => matchCandidates.id),
    needId: uuid("need_id").notNull().references(() => needs.id),
    opportunitySignalId: uuid("opportunity_signal_id").notNull().references(() => opportunitySignals.id),
    originatorCompanyId: uuid("originator_company_id").notNull().references(() => companies.id),
    receiverCompanyId: uuid("receiver_company_id").notNull().references(() => companies.id),
    state: text("state").notNull().default("DETECTED"),
    route: text("route").notNull().default("CHAPTER"), // CHAPTER | ZONE | NETWORK
    embassy: boolean("embassy").notNull().default(false),
    promise: jsonb("promise").$type<ReferralPromise>(),
    revealScope: text("reveal_scope"), // COMPANY_ONLY | COMPANY_AND_CONTACT
    valuePotentialMin: integer("value_potential_min"),
    valuePotentialMax: integer("value_potential_max"),
    valueVerified: integer("value_verified"),
    reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    introducedAt: timestamp("introduced_at", { withTimezone: true }),
    responseDueAt: timestamp("response_due_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    // Reloj de la Sala (D-030)
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    lateFlaggedAt: timestamp("late_flagged_at", { withTimezone: true }),
    lastNudgeAt: timestamp("last_nudge_at", { withTimezone: true }),
    protocolVersion: text("protocol_version").notNull().default("0.2"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("ref_chapter_state").on(t.chapterId, t.state), index("ref_receiver").on(t.receiverCompanyId), index("ref_originator").on(t.originatorCompanyId)],
);

export const referralTransitions = pgTable("referral_transitions", {
  id: id(),
  referralId: uuid("referral_id").notNull().references(() => referrals.id),
  fromState: text("from_state").notNull(),
  toState: text("to_state").notNull(),
  actorType: text("actor_type").notNull(),
  actorId: text("actor_id").notNull(),
  reason: text("reason"),
  occurredAt: createdAt(),
});

export const humanDecisions = pgTable("human_decisions", {
  id: id(),
  referralId: uuid("referral_id").notNull().references(() => referrals.id),
  memberId: uuid("member_id").notNull().references(() => members.id),
  role: text("role").notNull(), // ORIGINATOR | RECEIVER | DIRECTOR
  decision: text("decision").notNull(), // APPROVE | REQUEST_INFO | REJECT | DEFER
  revealScope: text("reveal_scope"),
  notes: text("notes"),
  seenLayers: jsonb("seen_layers").$type<number[]>().notNull().default([]),
  occurredAt: createdAt(),
});

export const introductions = pgTable("introductions", {
  id: id(),
  referralId: uuid("referral_id").notNull().references(() => referrals.id).unique(),
  channel: text("channel").notNull().default("NS_MESSAGE"),
  preparedByAgent: jsonb("prepared_by_agent").$type<IntroPackage>().notNull(),
  finalMessage: text("final_message"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  sentByMemberId: uuid("sent_by_member_id"),
  createdAt: createdAt(),
});

export const verdicts = pgTable("verdicts", {
  id: id(),
  referralId: uuid("referral_id").notNull().references(() => referrals.id).unique(),
  receiverMemberId: uuid("receiver_member_id").notNull().references(() => members.id),
  verdict: jsonb("verdict").$type<ReferralVerdict>().notNull(),
  meritOriginator: integer("merit_originator").notNull().default(0),
  meritReceiver: integer("merit_receiver").notNull().default(0),
  contrastStatus: text("contrast_status").notNull().default("PENDING"), // PENDING | OK | FLAGGED
  createdAt: createdAt(),
});

export const recognitions = pgTable("recognitions", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  referralId: uuid("referral_id").notNull().references(() => referrals.id),
  fromCompanyId: uuid("from_company_id").notNull().references(() => companies.id),
  toCompanyId: uuid("to_company_id").notNull().references(() => companies.id),
  axis: text("axis").notNull(), // FACILIDAD | NEGOCIO | TRATO
  reason: text("reason").notNull(),
  createdAt: createdAt(),
});

export const trustEvents = pgTable("trust_events", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  kind: text("kind").notNull(),
  weight: integer("weight").notNull().default(0),
  evidenceRef: text("evidence_ref").notNull(),
  createdAt: createdAt(),
});

// ───────────── Auditoría y Mesa Permanente ─────────────
export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    kind: text("kind").notNull(),
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    inputsUsed: jsonb("inputs_used").$type<AuditEventInput["inputsUsed"]>().notNull().default([]),
    policyApplied: text("policy_applied"),
    result: text("result").notNull(),
    significant: boolean("significant").notNull().default(false),
    companyIds: jsonb("company_ids").$type<string[]>().notNull().default([]),
    occurredAt: createdAt(),
  },
  (t) => [index("audit_chapter_time").on(t.chapterId, t.occurredAt)],
);

export const agentInteractions = pgTable("agent_interactions", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  fromAgentId: uuid("from_agent_id").notNull(),
  toAgentId: uuid("to_agent_id"), // null = CHAPTER
  messageType: text("message_type").notNull(),
  referralContextId: uuid("referral_context_id"),
  payload: jsonb("payload").notNull(),
  layerUsed: integer("layer_used").notNull().default(0),
  policyApplied: text("policy_applied"),
  createdAt: createdAt(),
});

// ───────────── Rastreo público (D-031) y Encargos (D-032) ─────────────
export const publicRecords = pgTable(
  "public_records",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    externalRef: text("external_ref").notNull(), // fuente:identificador, p. ej. "BORME:2026-09-10:A-1234"
    source: text("source").notNull(), // BORME | LICITACION | LICENCIA_OBRA | EMPLEO | PRENSA
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    companyName: text("company_name"),
    city: text("city"),
    url: text("url"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ingestedByCompanyId: uuid("ingested_by_company_id").references(() => companies.id),
    opportunitySignalId: uuid("opportunity_signal_id").references(() => opportunitySignals.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("public_record_ref").on(t.chapterId, t.externalRef)],
);

export const demands = pgTable(
  "demands",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    text: text("text").notNull(), // "Busco empresas industriales que abran planta en el área de Sevilla"
    trigger: text("trigger"), // BusinessTrigger opcional
    industry: text("industry"),
    valueBand: text("value_band"),
    status: text("status").notNull().default("OPEN"), // OPEN | FULFILLED | CLOSED
    activeUntil: timestamp("active_until", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("demand_chapter_status").on(t.chapterId, t.status)],
);

// ───────────── Beta privada (D-033): solicitudes de plaza desde la portada ─────────────
export const betaRequests = pgTable("beta_requests", {
  id: id(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  specialtyCode: text("specialty_code"),
  city: text("city").notNull().default("Sevilla"),
  message: text("message"),
  status: text("status").notNull().default("NEW"), // NEW | CONTACTED | INVITED | DECLINED
  createdAt: createdAt(),
});
