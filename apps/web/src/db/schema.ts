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
import type { ValueTrialReport } from "@/core/prueba";
import type { ChapterGazette, CommuniqueDelta, CommuniqueEncargo, CommuniqueStable } from "@/core/comunicado";
import type { IntentProposal } from "@/core/intencion";

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
    status: text("status").notNull().default("VACANT"), // ACTIVE | VACANT | WAITLISTED | RELEASED | RELEASE_PENDING (baja notificada) | RELEASE_PROPOSED (Directiva propuso, NS confirma)
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
  legalId: text("legal_id"), // CIF/NIF: identifica a la misma empresa en varias Salas (D-047)
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
  isNetwork: boolean("is_network").notNull().default(false), // NS (la red): confirma bajas propuestas por la Directiva (D-044)
  createdAt: createdAt(),
});

// ───────────── Cuentas de acceso (D-054): contraseña por Timonel, sesiones e invitaciones ─────────────
export const credentials = pgTable("credentials", {
  memberId: uuid("member_id").primaryKey().references(() => members.id),
  passwordHash: text("password_hash").notNull(),
  updatedAt: updatedAt(),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    memberId: uuid("member_id").notNull().references(() => members.id),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_member_idx").on(t.memberId)],
);

export const invites = pgTable("invites", {
  id: id(),
  memberId: uuid("member_id").notNull().references(() => members.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdByMemberId: uuid("created_by_member_id"),
  createdAt: createdAt(),
});

/** Enlace de acción (D-067): un toque desde el correo ejecuta una decisión concreta sobre una Cesión. Un solo uso, 72 h, ligado a persona, Cesión y acción. */
export const actionLinks = pgTable(
  "action_links",
  {
    id: id(),
    memberId: uuid("member_id").notNull().references(() => members.id),
    referralId: uuid("referral_id").notNull(),
    action: text("action").notNull(), // PROPOSE | ACCEPT | OPEN | ANSWER | VIEW
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("action_links_referral_idx").on(t.referralId)],
);

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
  source: text("source").notNull(), // MEMBER_INPUT | APUNTE | AGENT_CHECKIN | WEBSITE | INTEGRATION | PUBLIC_RECORD
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
    // Apertura en el visto bueno (D-067): el cedente deja autorizada la Apertura al proponer; se ejecuta sola cuando el cesionario acepta.
    preauthorizedScope: text("preauthorized_scope"), // COMPANY_ONLY | COMPANY_AND_CONTACT
    preauthorizedByMemberId: uuid("preauthorized_by_member_id"),
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
    // Dinamismo (D-068): segundo aviso a las 48 h; escalado a NS de una excepción que la Directiva no resolvió en 24 h.
    secondReminderSentAt: timestamp("second_reminder_sent_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    lateFlaggedAt: timestamp("late_flagged_at", { withTimezone: true }),
    // Primer contacto en un toque (D-073, F7): el cesionario marca "He contactado"; recordatorio a las 24 h, compromiso a las 48 h.
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    contactReminderSentAt: timestamp("contact_reminder_sent_at", { withTimezone: true }),
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

/** Cola de trabajos de los Agentes (D-053): la Mesa corre en segundo plano con el modelo real. */
export const agentJobs = pgTable(
  "agent_jobs",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    kind: text("kind").notNull(), // MESA
    subjectId: uuid("subject_id").notNull(), // opportunity_signal_id
    status: text("status").notNull().default("QUEUED"), // QUEUED | RUNNING | DONE | FAILED | NEEDS_HUMAN
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("agent_job_subject").on(t.kind, t.subjectId), index("agent_job_status").on(t.status, t.runAfter)],
);

/** Prueba de Valor (D-050): siete días de Agente para un candidato, antes de la plaza. */
export const valueTrials = pgTable("value_trials", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  candidacyId: uuid("candidacy_id").notNull().references(() => betaRequests.id).unique(),
  companyId: uuid("company_id").notNull().references(() => companies.id), // empresa en estado TRIAL, sin plaza
  specialtyCode: text("specialty_code").notNull(),
  token: text("token").notNull().unique(), // enlace público del informe
  startedAt: createdAt(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  reportGeneratedAt: timestamp("report_generated_at", { withTimezone: true }),
  report: jsonb("report").$type<ValueTrialReport>(),
  startedBy: uuid("started_by"),
});

/** Aceptación expresa de las Normas NS al alta como titular (D-043). Queda la versión firmada y quién firmó. */
export const rulesAcceptances = pgTable("rules_acceptances", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  memberId: uuid("member_id").notNull().references(() => members.id),
  rulesVersion: text("rules_version").notNull(),
  rules: jsonb("rules").$type<string[]>().notNull().default([]),
  acceptedAt: createdAt(),
});

/** Compromiso semanal (D-042): una fila por titular y semana evaluada. La escalera vive aquí, no en la Cesión. */
export const contributionWeeks = pgTable(
  "contribution_weeks",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(), // lunes 00:00 UTC
    validCount: integer("valid_count").notNull().default(0),
    distinctSpecialties: integer("distinct_specialties").notNull().default(0),
    missedStreak: integer("missed_streak").notNull().default(0), // semanas seguidas sin Cesión válida, incluida esta
    action: text("action").notNull().default("NONE"), // NONE | MISSED | DIPLOMATIC_NOTICE | FORMAL_NOTICE | RELEASE_NOTICE
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("contribution_week_unique").on(t.companyId, t.weekStart), index("contribution_chapter_week").on(t.chapterId, t.weekStart)],
);

/**
 * Comunicado semanal (Protocolo II, D-018 · D-069): una fila por titular y semana. `stable` sale del ADN (capas PUBLIC y
 * CHAPTER); `delta` lo recalcula el Agente (cambios del ADN y hechos verificados) mientras es borrador; `declared` son las
 * líneas que añade el Timonel. Aprobado por el Timonel o de continuidad al cierre de la semana (solo lo estable).
 */
export const communiques = pgTable(
  "communiques",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(), // lunes 00:00 UTC
    status: text("status").notNull().default("DRAFT"), // DRAFT | APPROVED | CONTINUITY
    stable: jsonb("stable").$type<CommuniqueStable>().notNull(),
    delta: jsonb("delta").$type<CommuniqueDelta[]>().notNull().default([]),
    declared: jsonb("declared").$type<CommuniqueDelta[]>().notNull().default([]),
    encargos: jsonb("encargos").$type<CommuniqueEncargo[]>().notNull().default([]),
    asks: jsonb("asks").$type<string[]>().notNull().default([]),
    unchanged: boolean("unchanged").notNull().default(true),
    dnaVersion: integer("dna_version").notNull().default(1),
    continuityStreak: integer("continuity_streak").notNull().default(0), // Comunicados de continuidad seguidos, incluido este
    approvedByMemberId: uuid("approved_by_member_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    protocolVersion: text("protocol_version").notNull().default("ADP-0.1"),
    draftedAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("communique_company_week").on(t.companyId, t.weekStart), index("communique_chapter_week").on(t.chapterId, t.weekStart)],
);

/** Gaceta semanal de la Sala (Protocolo II): la compila el Chapter Intelligence Agent al cierre de la semana. Una por Sala y semana. */
export const gazettes = pgTable(
  "gazettes",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
    gazette: jsonb("gazette").$type<ChapterGazette>().notNull(),
    publishedAt: createdAt(),
  },
  (t) => [uniqueIndex("gazette_chapter_week").on(t.chapterId, t.weekStart)],
);

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
/** Entrevista del Agente para el ADN de Empresa (D-040). Una abierta por empresa como máximo. */
export const dnaInterviews = pgTable("dna_interviews", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  memberId: uuid("member_id").notNull(),
  status: text("status").notNull().default("OPEN"), // OPEN | READY (todo preguntado, falta validar) | DONE | ABANDONED
  topic: text("topic").notNull().default("COMPANY"),
  progress: integer("progress").notNull().default(0), // 0..100
  transcript: jsonb("transcript").$type<{ role: "agent" | "timonel"; text: string; topic?: string; learned?: string[] }[]>().notNull().default([]),
  draftDna: jsonb("draft_dna").$type<BusinessDNA>().notNull(),
  websiteText: text("website_text"),
  provider: text("provider"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Fuentes propias del Agente (D-038): direcciones que el Timonel añade para que su Agente las rastree cada mañana. */
export const agentSources = pgTable("agent_sources", {
  id: id(),
  chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  label: text("label").notNull(),
  url: text("url").notNull(),
  kind: text("kind").notNull().default("FEED"), // FEED (RSS/Atom) · más adelante: WEB, BORME, PLACE…
  active: boolean("active").notNull().default(true),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  lastStatus: text("last_status"), // "ok · 12 entradas, 2 nuevas" | "error · …"
  createdByMemberId: uuid("created_by_member_id"),
  createdAt: createdAt(),
});

/** Fundación de una Sala nueva (D-041): la Promotora reúne fundadoras en la Antesala hasta el mínimo. */
export const chapterFoundings = pgTable("chapter_foundings", {
  id: id(),
  zoneId: uuid("zone_id").notNull().references(() => zones.id),
  promoterCandidacyId: uuid("promoter_candidacy_id").notNull(),
  proposedName: text("proposed_name"),
  status: text("status").notNull().default("OPEN"), // OPEN | READY (mínimo alcanzado) | ACTIVATED | CLOSED
  minMembers: integer("min_members").notNull().default(12),
  rewardText: text("reward_text"),
  rewardGrantedAt: timestamp("reward_granted_at", { withTimezone: true }),
  chapterId: uuid("chapter_id"),
  createdByMemberId: uuid("created_by_member_id"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const betaRequests = pgTable("beta_requests", {
  id: id(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  specialtyCode: text("specialty_code"),
  city: text("city").notNull().default("Sevilla"),
  message: text("message"),
  privacyVersion: text("privacy_version"), // versión del aviso de privacidad aceptado (D-055); nulo en candidaturas anteriores
  privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }),
  status: text("status").notNull().default("NEW"), // CandidacyStatus (services/antesala.ts)
  notes: text("notes"), // nota privada de la Directiva
  reviewedBy: uuid("reviewed_by"), // último miembro de la Directiva que la tocó
  companyId: uuid("company_id"), // empresa creada al activarla
  foundingId: uuid("founding_id"), // Sala en fundación a la que se ha sumado (D-041)
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: createdAt(),
});

/** "Dile a tu Agente" (D-075): lo que el Timonel dijo, lo que su Agente propuso y qué se hizo con ello. Privado de la empresa. */
export const agentIntents = pgTable(
  "agent_intents",
  {
    id: id(),
    chapterId: uuid("chapter_id").notNull().references(() => chapters.id),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    memberId: uuid("member_id").notNull().references(() => members.id),
    text: text("text").notNull(), // lo dicho, tal cual
    proposal: jsonb("proposal").$type<IntentProposal>().notNull(),
    provider: text("provider").notNull(), // deterministic | anthropic:<modelo>
    status: text("status").notNull().default("PROPOSED"), // PROPOSED | CONFIRMED | DISMISSED
    result: jsonb("result").$type<{ demandId?: string; dnaVersion?: number; opportunitySignalId?: string }>(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("agent_intent_company").on(t.companyId, t.createdAt)],
);

/**
 * Historial del ADN (D-076). Hasta aquí `business_dna` solo guardaba la versión vigente y subía el número: el contenido
 * anterior se perdía. Cada vez que el ADN cambia (entrevista, Comunicado, «Dile a tu Agente») la versión que se sustituye
 * queda aquí tal cual, con quién la había validado y qué la reemplazó. Privado de la empresa.
 */
export const businessDnaVersions = pgTable(
  "business_dna_versions",
  {
    id: id(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    version: integer("version").notNull(), // la versión que se sustituye
    dna: jsonb("dna").$type<BusinessDNA>().notNull(),
    validatedBy: uuid("validated_by"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    replacedBy: uuid("replaced_by"), // Timonel que provocó el cambio, si lo hubo
    reason: text("reason").notNull(), // "entrevista" | "comunicado.capacidad" | "intencion" | "actualizacion"
    replacedAt: createdAt(),
  },
  (t) => [index("dna_version_company").on(t.companyId, t.version)],
);

