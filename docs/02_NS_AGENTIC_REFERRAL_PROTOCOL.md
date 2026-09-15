# 02 · NS-ARP · NS Agentic Referral Protocol

**Versión del protocolo:** 0.1 (borrador fundacional)
**Estado:** especificación de diseño. Todavía no existe implementación.
**Depende de:** `CLAUDE.md`, `docs/DECISIONS.md` (D-001 a D-008).
**Es referencia obligatoria para:** `06_DATA_MODEL`, `07_AGENT_ARCHITECTURE`, `08_SECURITY_PRIVACY_GDPR`, y toda feature agentic.

---

## 0. Qué es NS-ARP y por qué existe

NS-ARP es el protocolo que gobierna cómo los agentes empresariales de una Sala NS **descubren, comparten, cualifican, puntúan, autorizan y trazan** oportunidades de negocio entre sus empresas.

No es un formato de chat entre bots. Es un **protocolo de estado tipado**: define los objetos que existen, quién puede crearlos, qué mensajes pueden intercambiarse, qué información viaja en cada mensaje según su nivel de visibilidad, cómo se calcula el encaje y en qué puntos exactos la decisión pasa a una persona.

Principio rector:

> **Los LLM razonan. El sistema mantiene estado.**

Todo lo importante (señal, necesidad, interés, cualificación, score, decisión, introducción, resultado) es un objeto persistido y auditado. El razonamiento del modelo produce y transforma esos objetos; nunca los sustituye.

NS-ARP es propiedad intelectual de NS Network. Debe evolucionar con versiones explícitas. Una Sala puede operar únicamente sobre una versión de protocolo a la vez.

---

## 1. Principios de diseño del protocolo

1. **Señal antes que lead.** La unidad de entrada es una `OpportunitySignal`, no un contacto ni una empresa. Una señal puede producir múltiples necesidades y múltiples referrals.
2. **Progressive disclosure.** Toda señal viaja en capas. Cada capa se abre solo cuando existe permiso y la etapa del proceso lo justifica.
3. **Conocimiento ≠ permiso.** Que un agente sepa algo no significa que pueda usarlo, guardarlo, compartirlo o revelarlo. Cada dato lleva su nivel de visibilidad y cada acción se contrasta con los verbos de permiso.
4. **Tipado sobre prosa.** Los mensajes agente-a-agente tienen esquema. El texto libre existe solo dentro de campos declarados (`rationale`, `question`, `answer`) y nunca transporta datos estructurales.
5. **Nunca inventar.** Todo campo estimado lleva `confidence` y `evidence`. Un agente sin evidencia suficiente responde `INSUFFICIENT_INFORMATION`, no una hipótesis disfrazada de certeza.
6. **Explicabilidad obligatoria.** Cada `MatchCandidate` lleva un objeto `Explanation` con `why`, `evidence`, `confidence`, `unknowns`, `next_action`. Sin `Explanation` completa no existe referral.
7. **Puertas humanas exactas.** El protocolo enumera los estados en los que una persona decide. Fuera de ellos, los agentes actúan solos.
8. **Fail safe.** Ante duda de permiso, visibilidad o conflicto, el protocolo degrada a la acción más conservadora: no compartir, no revelar, no contactar, escalar.
9. **Todo se audita.** Cada transición produce un `AuditEvent`. No se registran razonamientos internos; se registran decisiones, evidencia y políticas aplicadas.
10. **Local first, global by architecture.** Todo objeto lleva `chapter_id`; el enrutamiento fuera de la Sala es una extensión explícita (§13), no un caso implícito.

---

## 2. Vocabulario y objetos del protocolo

Notación TypeScript orientativa. Los tipos definitivos se fijarán en `06_DATA_MODEL.md`. Todos los objetos incluyen `id`, `chapter_id`, `created_at`, `updated_at`, `protocol_version`.

### 2.1 Visibilidad y permisos

```ts
type Visibility =
  | "PUBLIC"          // visible fuera de NS
  | "CHAPTER"         // visible para todos los miembros y agentes de la Sala
  | "MATCHED_PARTY"   // visible solo para la contraparte de un match concreto
  | "DIRECTORS"       // visible para la Directiva de la Sala
  | "COMPANY_ONLY"    // visible solo dentro de la empresa propietaria (su agente puede razonar con ello)
  | "NEVER_SHARE";    // el agente lo conoce pero no puede usarlo para razonar hacia fuera ni inferir sobre ello

type PermissionVerb =
  | "READ"            // el agente puede leer la fuente
  | "INFER"           // puede derivar hipótesis a partir de ella
  | "STORE"           // puede persistir el contenido o derivados
  | "SHARE"           // puede compartir contenido (dentro del nivel de visibilidad)
  | "REVEAL_IDENTITY" // puede revelar identidades de terceros
  | "CONTACT"         // puede iniciar contacto con una persona externa
  | "WRITE"           // puede escribir en una fuente externa (CRM, calendario)
  | "EXECUTE";        // puede ejecutar acciones con efecto económico o contractual
```

Regla de orden: los verbos son independientes, no acumulativos. `SHARE` no implica `REVEAL_IDENTITY`. `READ` no implica `STORE`. La política por defecto de toda fuente nueva es `READ + INFER` únicamente.

### 2.2 Capas de una señal (Progressive Disclosure Envelope)

```ts
interface SignalEnvelope {
  // Capa 0 · siempre visible en la Sala
  chapter_layer: {
    need_summary: string;          // "Empresa industrial abrirá nueva sede en Sevilla"
    industry: IndustryCode;
    geography: GeoScope;           // { country, region, city? }
    company_size_band: SizeBand;   // "1-10" | "11-50" | "51-200" | "201-500" | "500+"
    timing: TimingBand;            // "IMMEDIATE" | "30D" | "90D" | "180D" | "UNKNOWN"
    value_band?: ValueBand;        // "<10K" | "10-50K" | "50-100K" | "100-500K" | ">500K"
    relationship_strength: "DIRECT" | "INDIRECT" | "WEAK" | "UNKNOWN";
    confidence: number;            // 0..1
  };
  // Capa 1 · visible para agentes con INTEREST_CLAIM aceptado
  qualification_layer?: {
    detailed_context: string;
    triggers: BusinessTrigger[];
    constraints: string[];         // "presupuesto aprobado", "licitación cerrada"
    decision_role?: string;        // "CEO", "Dirección Financiera"
  };
  // Capa 2 · visible solo tras INTRO_AUTHORIZED
  identity_layer?: {
    third_party_company: CompanyRef;
    contact_person?: PersonRef;    // requiere base jurídica y REVEAL_IDENTITY
    originator_notes?: string;
  };
  // Capa 3 · nunca sale de la empresa originadora
  private_layer?: {
    source_material_refs: DataSourceRef[];
    internal_notes: string;
  };
}
```

El agente originador construye las cuatro capas. El sistema (no el agente) decide qué capa entrega a quién en cada mensaje, según estado del referral y permisos.

### 2.3 Objetos principales

```ts
interface BusinessSignal {              // entrada bruta
  id: SignalId;
  company_id: CompanyId;                // empresa originadora
  source: "MEMBER_INPUT" | "AGENT_CHECKIN" | "WEBSITE" | "INTEGRATION" | "PUBLIC_RECORD";
  raw_content_ref: string;              // referencia, no contenido, si la fuente es COMPANY_ONLY
  data_source_id?: DataSourceId;
  permissions_snapshot: PermissionVerb[];
}

interface OpportunitySignal {           // señal estructurada y clasificada
  id: OpportunitySignalId;
  business_signal_id: SignalId;
  originator_company_id: CompanyId;
  envelope: SignalEnvelope;
  needs: Need[];
  visibility: Visibility;               // nivel máximo de la capa 0
  status: "DRAFT" | "PUBLISHED" | "WITHDRAWN" | "EXPIRED";
  expires_at: Date;                     // por defecto 90 días
}

interface Need {                        // una señal produce N necesidades
  id: NeedId;
  opportunity_signal_id: OpportunitySignalId;
  specialty_hints: SpecialtyCode[];     // taxonomía D-001
  description: string;
  plausibility: number;                 // 0..1, cuán probable es que la necesidad exista
  evidence: EvidenceRef[];
  unknowns: string[];
}

interface Capability {                  // lo que una empresa puede cubrir
  id: CapabilityId;
  company_id: CompanyId;
  specialty: SpecialtyCode;
  is_primary_seat: boolean;             // true solo para la Category Seat
  icp: IdealCustomerProfile;
  ticket_min?: Money;
  ticket_max?: Money;
  capacity_now: "OPEN" | "LIMITED" | "FULL";
  strategic_priority: 0 | 1 | 2 | 3;    // declarado en Business DNA
}

interface InterestClaim {               // un agente declara interés en una necesidad
  id: InterestClaimId;
  need_id: NeedId;
  claimant_company_id: CompanyId;
  capability_id: CapabilityId;
  preliminary_fit: number;              // 0..1, calculado solo con la capa 0
  rationale: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
}

interface QualificationExchange {       // conversación tipada agente-a-agente
  id: QualificationId;
  interest_claim_id: InterestClaimId;
  turns: QualificationTurn[];           // ver §5
  outcome: "QUALIFIED" | "DISQUALIFIED" | "INSUFFICIENT_INFORMATION" | "OPEN";
  disqualification_reason?: DisqualificationCode;
}

interface MatchCandidate {              // resultado del scoring
  id: MatchId;
  need_id: NeedId;
  originator_company_id: CompanyId;
  receiver_company_id: CompanyId;
  qualification_id: QualificationId;
  score: NSMatchScore;                  // §7
  explanation: Explanation;             // §7.5
  compliance: ComplianceVerdict;        // §8
  status: "PROPOSED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
}

interface Referral {                    // objeto de negocio con ciclo de vida
  id: ReferralId;
  match_id: MatchId;
  state: ReferralState;                 // §9
  originator_decision?: HumanDecision;
  receiver_decision?: HumanDecision;
  director_decision?: HumanDecision;
  value_potential?: MoneyRange;
  value_pipeline?: Money;
  value_verified?: Money;
}

interface Introduction {
  id: IntroductionId;
  referral_id: ReferralId;
  channel: "NS_MESSAGE" | "EMAIL_BY_MEMBER" | "MEETING" | "PHONE_BY_MEMBER";
  prepared_by_agent: IntroPackage;      // borrador; lo envía siempre una persona en el MVP
  sent_at?: Date;
  sent_by_user_id?: UserId;
}

interface Opportunity {
  id: OpportunityId;
  introduction_id: IntroductionId;
  stage: "MEETING" | "PROPOSAL" | "NEGOTIATION" | "WON" | "LOST" | "NO_DECISION";
  confirmed_by_receiver: boolean;
  confirmed_by_originator: boolean;
}

interface Outcome {
  id: OutcomeId;
  opportunity_id: OpportunityId;
  result: "WON" | "LOST" | "NO_DECISION";
  value_verified?: Money;
  verified_by: UserId[];                // ambas partes para VALUE_CONFIRMED
  learning_notes?: string;              // por qué funcionó o no
}

interface TrustEvent {                  // alimenta la reputación verificable
  id: TrustEventId;
  company_id: CompanyId;
  kind: "REFERRAL_ACCEPTED" | "REFERRAL_DECLINED_WITH_REASON" | "RESPONSE_ON_TIME"
      | "RESPONSE_LATE" | "INTRO_COMPLETED" | "OUTCOME_REPORTED" | "VALUE_VERIFIED"
      | "COMPLAINT" | "DISPUTE_OPENED" | "DISPUTE_RESOLVED" | "POLICY_VIOLATION"
      | "REFERRAL_FEE_VIOLATION"        // D-010 · motivo de expulsión
      | "CONTRIBUTION_QUOTA_MET" | "CONTRIBUTION_QUOTA_MISSED";  // D-010 · mínimo de aportación
  weight: number;
  evidence_ref: string;
}
```

---

## 3. Actores y roles de agente

| Agente | Responsabilidad en NS-ARP | Puede crear |
| --- | --- | --- |
| **Company Agent** (uno por empresa) | Extraer señales de su empresa, clasificarlas, publicar la capa 0, declarar interés en necesidades ajenas, responder cualificaciones, preparar introducciones. | `OpportunitySignal`, `Need`, `InterestClaim`, `QualificationTurn`, `IntroPackage` |
| **Matchmaker Agent** (uno por Sala) | Descubrir agentes relevantes, orquestar cualificaciones, calcular NS Match Score, producir `MatchCandidate`. | `MatchCandidate`, `Explanation` |
| **Trust & Compliance Agent** (uno por Sala) | Verificar permisos, visibilidad, conflictos de plaza, duplicidad, normas profesionales, base jurídica de datos personales. Emitir veredicto y excepciones. | `ComplianceVerdict`, `TrustEvent` |
| **Chapter Intelligence Agent** | Observar patrones: necesidades sin cobertura, plazas inactivas, señales repetidas. No participa en el flujo de un referral concreto. | `ChapterInsight` |
| **Executive Briefing Agent** | Sintetizar actividad para miembros (Hoy) y Directiva (Command Center). Solo lee. | `Briefing` |
| **Global Routing Agent** (futuro) | Enrutar necesidades sin cobertura local a otras Salas. | `RoutingProposal` |

Cada agente actúa con la identidad de su `agent_id` y los permisos de la empresa/Sala que representa. Ningún agente puede leer objetos de otra empresa por debajo del nivel `CHAPTER` salvo en el marco de un match donde el estado lo autorice.

---

## 4. Etapas del protocolo

```text
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  S0  BUSINESS SIGNAL         (entrada bruta, permisos de la fuente)       │
 │  S1  CONTEXT EXTRACTION      (agente originador estructura)               │
 │  S2  PRIVACY CLASSIFICATION  (capas + visibilidad; compliance valida)     │
 │  S3  OPPORTUNITY SIGNAL      (publicación de capa 0 a la Sala)           │
 │  S4  AGENT DISCOVERY         (matchmaker localiza capabilities)           │
 │  S5  CAPABILITY MATCHING     (interest claims con fit preliminar)         │
 │  S6  A2A QUALIFICATION       (intercambio tipado; capa 1)                 │
 │  S7  FIT SCORING             (NS Match Score + Explanation)               │
 │  S8  TRUST + COMPLIANCE GATE (veredicto + excepciones)                    │
 │  S9  HUMAN REVIEW            (miembros; Directiva por excepción)          │
 │  S10 REFERRAL                (objeto vivo; capa 2 al receptor)            │
 │  S11 WARM INTRODUCTION       (paquete preparado por agente, enviado por persona) │
 │  S12 OPPORTUNITY             (seguimiento confirmado por ambas partes)    │
 │  S13 OUTCOME                 (resultado y valor verificado)               │
 │  S14 LEARNING + REPUTATION   (trust events, calibración de pesos)         │
 └──────────────────────────────────────────────────────────────────────────┘
```

### 4.1 Reglas por etapa

**S0 · Business Signal.** Se registra la fuente y una instantánea de sus permisos. Si la fuente no otorga `INFER`, el protocolo se detiene aquí: el dato se guarda (si hay `STORE`) pero no se razona sobre él.

**S1 · Context Extraction.** El Company Agent produce `needs[]` con `plausibility` y `evidence`. Una señal "abrimos nueva sede" produce típicamente 5–12 necesidades candidatas. Solo las de `plausibility ≥ 0.4` avanzan; el resto se guarda como `LATENT` para aprendizaje.

**S2 · Privacy Classification.** El agente propone la visibilidad de cada capa. El Trust & Compliance Agent valida contra `knowledge.*` del Business DNA y la política de fuente. Toda mención de una persona física en capa 0 o 1 se rechaza automáticamente; las personas solo existen en capa 2.

**S3 · Opportunity Signal.** Se publica **solo la capa 0**. El miembro originador ve una previsualización de lo que verán los demás y puede editar, restringir o retirar antes de publicar. Publicación con visibilidad `CHAPTER` por defecto. Si el miembro elige `COMPANY_ONLY`, la señal no se publica pero su agente puede seguir buscando internamente (§12, Scenario D).

**S4 · Agent Discovery.** El Matchmaker consulta el índice de `Capability` de la Sala por `specialty_hints`, geografía y tamaño. Usa búsqueda semántica solo como **recall**, nunca como decisión. Produce una lista corta (≤ 8) de capabilities candidatas por necesidad.

**S5 · Capability Matching.** Cada Company Agent candidato recibe la capa 0 y responde con un `InterestClaim` o `NO_INTEREST` con motivo. El fit preliminar se calcula con las puertas duras de §7.1. Las claims con fit preliminar `< 0.35` se descartan sin cualificar.

**S6 · Agent-to-Agent Qualification.** Solo entre el agente originador y cada agente reclamante aceptado. Se abre la capa 1 al reclamante. El intercambio está limitado a **6 turnos por parte** y **48 horas** (configurable). Concluye en `QUALIFIED`, `DISQUALIFIED` o `INSUFFICIENT_INFORMATION`.

**S7 · Fit Scoring.** El Matchmaker calcula el NS Match Score (§7) sobre el resultado de la cualificación y produce `MatchCandidate` + `Explanation`. Umbral por defecto para avanzar: **≥ 0.70**. Entre 0.55 y 0.70 el match se muestra al originador como "encaje parcial" y solo avanza si éste lo promueve manualmente.

**S8 · Trust + Compliance Gate.** Veredicto `PASS`, `PASS_WITH_EXCEPTIONS` o `BLOCK`. Las excepciones son las de D-003 y determinan si interviene la Directiva.

**S9 · Human Review.** Doble consentimiento (D-003). Orden: primero el **originador** (autoriza revelar), después el **receptor** (acepta). La Directiva entra solo con excepciones. Plazo de respuesta por defecto: 72 horas; a partir de ahí el agente recuerda y se registra `RESPONSE_LATE`.

**S10 · Referral.** Nace el objeto `Referral`. Se abre la capa 2 al receptor. El originador decide si revela `contact_person` o solo la empresa.

**S11 · Warm Introduction.** El agente prepara `IntroPackage` (mensaje de introducción, contexto para cada parte, siguiente paso sugerido). **En el MVP siempre lo envía una persona**: el originador desde NS Message o por su propio correo, marcando la introducción como enviada. Ningún agente contacta con terceros.

**S12 · Opportunity.** El receptor actualiza la etapa. El originador confirma. Las discrepancias abren un diálogo, no una disputa automática.

**S13 · Outcome.** `VALUE_CONFIRMED` requiere confirmación de ambas partes. El valor verificado es el único que alimenta la métrica North Star `Verified closed value`.

**S14 · Learning + Reputation.** Se emiten `TrustEvent` para ambas partes y se registra la tupla `(signal features, capability features, score components, outcome)` para calibración futura de pesos. La reputación nunca se reduce a un número opaco: se muestra como panel de comportamientos verificables.

---

## 5. Catálogo de mensajes agente-a-agente

Todos los mensajes son objetos `AgentInteraction` persistidos con `from_agent_id`, `to_agent_id | "CHAPTER"`, `referral_context_id`, `payload`, `visibility_layer_used`, `policy_applied`.

| Mensaje | Emisor → Receptor | Capa máxima | Payload esencial |
| --- | --- | --- | --- |
| `SIGNAL_PUBLISHED` | Company → Chapter | 0 | `opportunity_signal_id`, `chapter_layer`, `needs[].{id, specialty_hints, plausibility}` |
| `CONTEXT_REQUEST` | Company → Company (originador) | 0 | `need_id`, `questions[]` (máx. 3, de una lista controlada + 1 libre) |
| `CONTEXT_RESPONSE` | Company (originador) → Company | 0 o 1 según claim | `answers[]`, `still_unknown[]` |
| `INTEREST_CLAIM` | Company → Matchmaker | 0 | `need_id`, `capability_id`, `preliminary_fit`, `rationale` |
| `NO_INTEREST` | Company → Matchmaker | 0 | `need_id`, `reason_code` (`OUT_OF_GEO`, `OUT_OF_ICP`, `TICKET_MISMATCH`, `NO_CAPACITY`, `CONFLICT`, `OTHER`) |
| `CLAIM_ACCEPTED` / `CLAIM_DECLINED` | Matchmaker → Company | 0 | `interest_claim_id`, `reason` |
| `QUALIFICATION_QUESTION` | Company ↔ Company | 1 | `qualification_id`, `question` (tipada: `BUDGET`, `TIMING`, `DECISION_MAKER`, `SCOPE`, `CONSTRAINT`, `FREE`) |
| `QUALIFICATION_ANSWER` | Company ↔ Company | 1 | `answer`, `confidence`, `evidence_refs[]`, o `INSUFFICIENT_INFORMATION` |
| `DISQUALIFY` | Company → Matchmaker | 1 | `qualification_id`, `disqualification_code`, `rationale` |
| `MATCH_PROPOSAL` | Matchmaker → Compliance | 1 | `match_candidate` completo con `score` y `explanation` |
| `COMPLIANCE_VERDICT` | Compliance → Matchmaker | 1 | `verdict`, `exceptions[]`, `required_reviewers[]`, `blocked_fields[]` |
| `REVIEW_REQUEST` | Matchmaker → Human (vía app) | 1 (+2 para originador) | referral card completa |
| `HUMAN_DECISION` | Human → Sistema | — | `decision` (`APPROVE`, `REQUEST_INFO`, `REJECT`, `DEFER`), `reveal_scope`, `notes` |
| `INTRO_PACKAGE` | Company (originador) → Company (receptor) | 2 | mensaje de intro, contexto, siguiente paso |
| `OPPORTUNITY_UPDATE` | Company → Company | 2 | `stage`, `notes` |
| `OUTCOME_REPORT` | Company → Company, Chapter (agregado) | 2 | `result`, `value`, `learning_notes` |
| `ROUTING_PROPOSAL` (futuro) | Matchmaker → Global Routing | 0 | `need_id`, `reason_no_local_coverage` |

Reglas:

- Un mensaje que intente transportar datos de una capa superior a la permitida por el estado del referral es **rechazado por el sistema antes de entregarse**, y se emite `AuditEvent{kind: "LAYER_VIOLATION_BLOCKED"}`.
- Los campos de texto libre pasan por un filtro de entidades: nombres de personas y datos de contacto en capas 0–1 se redactan automáticamente y se notifica al emisor.
- Ningún mensaje agente-a-agente abandona NS. No existe `EXTERNAL_CONTACT` en v0.1.

---

## 6. Pseudocódigo del flujo principal

```ts
async function onBusinessSignal(signal: BusinessSignal) {
  const perms = signal.permissions_snapshot;
  if (!perms.includes("INFER")) return audit("SIGNAL_STORED_NO_INFER", signal);

  // S1 · extracción por el agente de la empresa originadora
  const draft = await companyAgent(signal.company_id).extract(signal);
  // draft: { envelope, needs[] } con plausibility + evidence por necesidad

  // S2 · clasificación de privacidad
  const classified = await complianceAgent.classify(draft, businessDNA(signal.company_id));
  if (classified.blocked) return audit("SIGNAL_BLOCKED", classified.reason);

  // S3 · el miembro previsualiza y publica (o restringe)
  const os = await persistOpportunitySignal(classified, { status: "DRAFT" });
  await notifyMember(signal.company_id, "SIGNAL_PREVIEW", os);
  // continúa en onSignalPublished cuando el miembro confirma (o auto-publica si su
  // Business DNA lo autoriza para señales de visibilidad CHAPTER)
}

async function onSignalPublished(os: OpportunitySignal) {
  broadcast("SIGNAL_PUBLISHED", layer0(os));

  for (const need of os.needs.filter(n => n.plausibility >= 0.4)) {
    // S4 · discovery: índice estructurado primero, semántica solo para recall
    const candidates = await matchmaker.discover(need, { max: 8 });

    // S5 · interest claims con puertas duras
    const claims = await Promise.all(candidates.map(async cap => {
      const gate = hardGates(need, cap, os.envelope.chapter_layer);
      if (!gate.pass) return send("NO_INTEREST", cap.company_id, gate.reason);
      const claim = await companyAgent(cap.company_id).evaluateInterest(need, layer0(os), cap);
      return claim.preliminary_fit >= 0.35 ? claim : null;
    }));

    // Prioridad de plaza (D-001): titulares de la plaza antes que capabilities secundarias
    const ordered = prioritizeSeatHolders(claims.filter(Boolean));

    for (const claim of ordered) {
      // S6 · cualificación agente-a-agente con capa 1
      const q = await runQualification(os, need, claim, { maxTurns: 6, ttlHours: 48 });
      if (q.outcome !== "QUALIFIED") { audit("CLAIM_CLOSED", q); continue; }

      // S7 · scoring explicable
      const score = computeNSMatchScore(need, claim, q, context(os, claim));
      const explanation = buildExplanation(score, q);
      const match = await persistMatchCandidate({ need, claim, q, score, explanation });
      if (score.total < 0.55) { audit("MATCH_BELOW_THRESHOLD", match); continue; }

      // S8 · compliance
      const verdict = await complianceAgent.review(match);
      if (verdict.verdict === "BLOCK") { audit("MATCH_BLOCKED", verdict); continue; }

      // S9 · revisión humana: originador → receptor → (Directiva si excepciones)
      const referral = await createReferral(match, verdict);
      await requestHumanReview(referral, "ORIGINATOR");
      // el resto del ciclo se gobierna por la máquina de estados de §9
    }
  }
}
```

Puntos de diseño relevantes:

- `hardGates` es determinista y barato; se ejecuta antes de invocar cualquier LLM.
- `runQualification` es el único lugar donde dos agentes conversan; el sistema limita turnos, tiempo y capa.
- `computeNSMatchScore` es una función pura sobre objetos persistidos. Nunca llama a un modelo. El modelo ya aportó sus estimaciones (con `confidence`) durante S1, S5 y S6.
- Todo `continue` produce un `AuditEvent` visible en el Agent Room como evento significativo ("Empresa B descartada: ticket mínimo incompatible").

---

## 7. NS Match Score v0.1

### 7.1 Puertas duras (eliminatorias, deterministas)

Cualquiera de estas condiciones produce `NO_INTEREST` o `DISQUALIFY` sin scoring:

| Puerta | Condición de fallo | Código |
| --- | --- | --- |
| Geografía | `need.geography` fuera de `capability.icp.geography` y sin cobertura declarada | `OUT_OF_GEO` |
| Ticket | `need.value_band.max < capability.ticket_min` o `need.value_band.min > capability.ticket_max` | `TICKET_MISMATCH` |
| Exclusión explícita | `need.industry ∈ capability.icp.exclusions` o `need` coincide con `referrals.disqualifiers` del Business DNA | `EXPLICIT_EXCLUSION` |
| Capacidad | `capability.capacity_now == "FULL"` | `NO_CAPACITY` |
| Conflicto | receptor y tercero son la misma entidad, o existe disputa abierta entre originador y receptor | `CONFLICT` |
| Duplicado | existe `Referral` activo para el mismo `third_party_company` + `specialty` en los últimos 90 días | `DUPLICATE` |
| Visibilidad | la señal es `COMPANY_ONLY` y el originador no ha autorizado matching interno | `VISIBILITY_BLOCK` |

### 7.2 Componentes positivos (0..1 cada uno)

| Componente | Peso v0.1 | Fuente | Cómo se calcula |
| --- | --- | --- | --- |
| `trigger_fit` | 0.18 | Business DNA `ideal_customer.triggers` vs `need.triggers` | coincidencia de triggers declarados; 1.0 si el trigger de la señal está en la lista del receptor |
| `customer_profile_fit` | 0.16 | ICP (industria, tamaño, rol decisor) | media ponderada de coincidencias; industria pesa doble |
| `semantic_fit` | 0.10 | embedding de `need.description` vs `capability` + `referrals.perfect_referral` | similitud coseno normalizada; techo 0.10 por diseño: la semántica sola nunca decide |
| `deal_size_fit` | 0.10 | `value_band` vs `ticket_min/max` y `average_ticket` | 1.0 dentro del rango preferido; decae linealmente hacia los extremos |
| `timing_fit` | 0.08 | `timing` vs `commercial.urgency` y `sales_cycle` | 1.0 si el horizonte de la señal es compatible con el ciclo de venta |
| `capacity_fit` | 0.05 | `capacity_now` | OPEN 1.0 · LIMITED 0.5 |
| `strategic_priority` | 0.07 | `strategic_priority` de la capability | 0/0.33/0.66/1.0 |
| `relationship_strength` | 0.10 | `envelope.relationship_strength` del originador con el tercero | DIRECT 1.0 · INDIRECT 0.6 · WEAK 0.3 · UNKNOWN 0.2 |
| `qualification_quality` | 0.08 | resultado de S6 | proporción de preguntas críticas (`BUDGET`, `TIMING`, `DECISION_MAKER`) respondidas con `confidence ≥ 0.6` |
| `member_reputation` | 0.04 | `TrustEvent` del receptor | normalizado; en el MVP arranca en 0.6 para todos (sin histórico) |
| `historical_conversion` | 0.04 | pares `(specialty, trigger)` con outcome | prior bayesiano; en el MVP contribuye 0.5 fijo hasta disponer de datos |

Suma de pesos: 1.00.

### 7.3 Penalizaciones (restan, 0..1 cada una, multiplicadas por su peso)

| Penalización | Peso | Fuente |
| --- | --- | --- |
| `privacy_risk` | −0.15 | el match requiere revelar datos por encima del permiso actual |
| `conflict_risk` | −0.15 | solapamiento `ADJACENT` con otra plaza de la Sala (D-001) |
| `duplicate_risk` | −0.10 | referral similar en los últimos 180 días (fuera de la ventana de la puerta dura) |
| `disqualification_signals` | −0.20 | cualquier respuesta de S6 que contradiga el ICP o los disqualifiers sin llegar a puerta dura |
| `uncertainty_penalty` | −0.10 | proporción de `unknowns` críticos sin resolver |

### 7.4 Fórmula

```ts
function computeNSMatchScore(need, claim, q, ctx): NSMatchScore {
  const positive = Σ (weight_i × component_i);        // 0..1
  const penalty  = Σ (weight_j × penalty_j);          // 0..0.70
  const raw      = clamp(positive − penalty, 0, 1);

  // La confianza global limita el score mostrado: un 0.9 con evidencia débil no es un 0.9
  const evidence_confidence = weightedMean(component.confidence);
  const total = raw × (0.6 + 0.4 × evidence_confidence);

  return { total, positive, penalty, components, penalties, evidence_confidence,
           band: total >= 0.85 ? "HIGH" : total >= 0.70 ? "GOOD" : total >= 0.55 ? "PARTIAL" : "LOW" };
}
```

Los pesos viven en configuración versionada por Sala (`ScoringProfile`) y se recalibran a partir de S14. Todo cambio de pesos se registra en `DECISIONS.md`.

### 7.5 Objeto `Explanation` (obligatorio)

```ts
interface Explanation {
  why: string[];            // frases afirmativas, máx. 7, ordenadas por contribución al score
  evidence: EvidenceRef[];  // cada "why" apunta al menos a una evidencia
  confidence: "HIGH" | "MEDIUM" | "LOW";
  unknowns: string[];       // qué falta por confirmar
  next_action: string;      // "Aprobar introducción" | "Solicitar presupuesto estimado" | ...
  negatives: string[];      // penalizaciones aplicadas, en lenguaje de negocio
}
```

Renderizado de referencia en la referral card:

```text
92% NS Match · Confianza alta

Por qué
+ El trigger "nueva sede" está en tu lista de señales prioritarias.
+ Empresa industrial de 51–200 empleados: tu ICP exacto.
+ Sevilla capital, dentro de tu zona de servicio.
+ Rango estimado 50–100K, dentro de tu ticket habitual.
+ El miembro originador tiene relación directa con Dirección.
+ Su agente confirmó plazo de 90 días y decisor identificado.

Pendiente
- Presupuesto aprobado: sin confirmar.

Siguiente paso
Aprobar la introducción. El miembro originador ya ha autorizado revelar la empresa.
```

---

## 8. Trust & Compliance Gate

### 8.1 Veredicto

```ts
interface ComplianceVerdict {
  verdict: "PASS" | "PASS_WITH_EXCEPTIONS" | "BLOCK";
  checks: { name: string; result: "OK" | "WARN" | "FAIL"; detail: string }[];
  exceptions: DirectorException[];       // ver D-003
  required_reviewers: ("ORIGINATOR" | "RECEIVER" | "DIRECTOR")[];
  blocked_fields: string[];              // campos que no pueden revelarse aunque el humano apruebe
  legal_basis?: "CONSENT" | "LEGITIMATE_INTEREST" | "CONTRACT" | "NONE";
}
```

### 8.2 Comprobaciones mínimas v0.1

1. **Permisos de fuente:** la señal proviene de una fuente con `INFER` y, para avanzar a S10, con `SHARE`. `REVEAL_IDENTITY` es necesario para abrir la capa 2.
2. **Visibilidad de capas:** ninguna capa entregada excede lo que el estado permite.
3. **Datos personales:** si la capa 2 contiene `contact_person`, se exige `legal_basis ≠ NONE` declarada por el originador. Sin base jurídica, se revela solo la empresa.
4. **Conflicto de plaza:** cruza `receiver.specialty` con la matriz de solapamiento; `ADJACENT` produce excepción.
5. **Sector regulado:** consulta la tabla `RegulatedSpecialty` (abogacía, auditoría, sanidad, seguros, servicios financieros…); si hay restricción de captación o comisión, produce excepción y bloquea cualquier campo de retribución.
6. **Duplicidad y disputas:** referrals activos y disputas abiertas.
7. **Periodo de prueba:** miembros con < 3 referrals completados.
8. **Umbral de valor:** `value_band` por encima del umbral de la Sala.
9. **Reputación:** `TrustEvent` de tipo `POLICY_VIOLATION` reciente en cualquiera de las partes.
10. **Retribución por referido (regla inmutable D-010):** cualquier indicio de dinero, comisión, descuento o contraprestación condicionada al referido en mensajes, notas, `IntroPackage` o `learning_notes` produce `FAIL`, emite `REFERRAL_FEE_VIOLATION` y abre expediente de expulsión ante la Directiva. No existe campo de retribución en ningún objeto del protocolo.

Ante cualquier `FAIL` el veredicto es `BLOCK`. Ante `WARN` es `PASS_WITH_EXCEPTIONS` y se añade `DIRECTOR` a `required_reviewers`.

---

## 9. Máquina de estados del Referral

```text
DETECTED
  → INVESTIGATING            (Matchmaker inicia discovery)
  → AGENT_MATCHED            (≥1 InterestClaim aceptada)
  → QUALIFIED                (QualificationExchange.outcome = QUALIFIED)
  → COMPLIANCE_CHECK         (MATCH_PROPOSAL enviada a Compliance)
  → MEMBER_REVIEW            (verdict PASS | PASS_WITH_EXCEPTIONS)
      ├─ ORIGINATOR_PENDING
      ├─ RECEIVER_PENDING
      └─ DIRECTOR_PENDING    (solo con excepciones; tras ambos miembros)
  → APPROVED                 (todas las decisiones requeridas = APPROVE)
  → INTRO_AUTHORIZED         (originador fija reveal_scope; se abre capa 2 al receptor)
  → INTRODUCED               (una persona marca la introducción como enviada)
  → MEETING                  (receptor confirma reunión)
  → COMMERCIAL_OPPORTUNITY   (receptor confirma propuesta/negociación)
  → WON | LOST | NO_DECISION (receptor informa; originador confirma)
  → VALUE_CONFIRMED          (ambas partes confirman valor verificado)

Estados terminales laterales desde cualquier estado previo a INTRODUCED:
  DISQUALIFIED · BLOCKED · REJECTED_BY_MEMBER · WITHDRAWN_BY_ORIGINATOR · EXPIRED
```

### 9.1 Reglas de transición

| Transición | Actor autorizado | Precondición | Timeout |
| --- | --- | --- | --- |
| DETECTED → INVESTIGATING | Matchmaker | señal publicada | — |
| INVESTIGATING → AGENT_MATCHED | Matchmaker | ≥1 claim con `preliminary_fit ≥ 0.35` | 24 h → EXPIRED |
| AGENT_MATCHED → QUALIFIED | Company Agents | outcome QUALIFIED | 48 h → INSUFFICIENT_INFORMATION → EXPIRED |
| QUALIFIED → COMPLIANCE_CHECK | Matchmaker | `score.total ≥ 0.55` | — |
| COMPLIANCE_CHECK → MEMBER_REVIEW | Compliance | verdict ≠ BLOCK | — |
| ORIGINATOR_PENDING → RECEIVER_PENDING | Miembro originador | `HUMAN_DECISION.APPROVE` | 72 h → recordatorio; 7 d → EXPIRED |
| RECEIVER_PENDING → APPROVED / DIRECTOR_PENDING | Miembro receptor | `APPROVE` | 72 h → recordatorio; 7 d → EXPIRED |
| DIRECTOR_PENDING → APPROVED | Director | `APPROVE` | 5 d → escalado a Presidencia de la Sala |
| APPROVED → INTRO_AUTHORIZED | Miembro originador | `reveal_scope` definido | — |
| INTRO_AUTHORIZED → INTRODUCED | Miembro (persona) | introducción enviada | 14 d → recordatorio |
| INTRODUCED → MEETING → … | Miembro receptor | actualización | check-in del agente cada 14 d |
| * → VALUE_CONFIRMED | Ambos miembros | ambos confirman | — |

`REQUEST_INFO` en cualquier estado de revisión devuelve el referral a `QUALIFIED` con una pregunta concreta para el agente contrario y un límite de 2 rondas.

### 9.2 Reglas de exclusividad de plaza en el ciclo

Si dos claims sobre la misma necesidad provienen de una plaza principal y de una capability secundaria, el referral de la capability secundaria queda en `AGENT_MATCHED` con motivo `SEAT_PRIORITY` hasta que el titular de la plaza: declina, deja expirar, o cede. Solo entonces avanza.

---

## 10. Puertas humanas

| Puerta | Quién decide | Qué decide | Qué ve |
| --- | --- | --- | --- |
| Publicación de señal | Originador | publicar / restringir / retirar | previsualización de capa 0 exacta |
| Revisión del originador | Originador | aprobar revelar / pedir info / rechazar | referral card + capa 0–1 del receptor + explanation |
| Revisión del receptor | Receptor | aceptar / pedir info / rechazar | referral card + capa 1 de la señal (sin identidad) + explanation |
| Revisión de Directiva | Director | aprobar / rechazar / derivar | referral card + excepciones + capa 1; capa 2 solo si la excepción es de datos personales |
| Alcance de revelación | Originador | empresa sola / empresa + contacto | capa 2 propia |
| Envío de introducción | Originador (persona) | enviar / editar / cancelar | `IntroPackage` |
| Confirmación de resultado | Ambos | valor verificado | outcome propuesto por la otra parte |

Toda decisión humana produce `HumanDecision{ user_id, decision, notes, seen_layers[], timestamp }`. El sistema registra qué capas vio la persona en el momento de decidir.

---

## 11. Auditoría y observabilidad

Cada transición, mensaje y decisión emite:

```ts
interface AuditEvent {
  id: AuditEventId;
  chapter_id: ChapterId;
  kind: string;                    // "SIGNAL_PUBLISHED", "LAYER_VIOLATION_BLOCKED", "HUMAN_DECISION", ...
  actor: { type: "AGENT" | "USER" | "SYSTEM"; id: string };
  subject: { type: string; id: string };     // OpportunitySignal, Referral, ...
  inputs_used: { type: string; id: string; layer?: 0|1|2|3 }[];
  tool_calls?: { name: string; ok: boolean }[];
  policy_applied?: string;         // "visibility.chapter", "seat_priority", "regulated_specialty.legal"
  result: string;
  occurred_at: Date;
}
```

No se persisten razonamientos internos del modelo. Sí se persisten: decisiones, evidencia usada, capa usada, política aplicada, resultado.

El **Agent Room** se construye únicamente a partir de `AuditEvent` con `kind` marcado como significativo. El **Executive Briefing** agrega `AuditEvent` por ventana temporal.

---

## 12. Incertidumbre y comportamiento ante fallo

- Cualquier estimación sin evidencia se marca `confidence ≤ 0.3` y no puede sostener un `why`.
- `INSUFFICIENT_INFORMATION` es un resultado legítimo de S1, S5 y S6 y se muestra como tal ("Tu agente no tiene información suficiente para valorar esta señal. ¿Puedes responder a dos preguntas?").
- Si un modelo devuelve un objeto que no valida contra el esquema, el sistema descarta la salida, reintenta una vez y, si vuelve a fallar, marca el paso como `NEEDS_HUMAN` sin avanzar el estado.
- Ante indisponibilidad del modelo, el pipeline se pausa; nunca se degrada a reglas que inventen contenido.
- Ante conflicto entre visibilidad declarada y contenido detectado (por ejemplo, un nombre de persona en capa 0), gana la regla más restrictiva y se notifica al originador.

---

## 13. Enrutamiento global (extensión futura, no en v0.1)

Cuando una `Need` termina S5 sin ninguna claim, el Matchmaker emite `ROUTING_PROPOSAL`. Orden de enrutamiento (D-013): **Sala del originador → otras Salas de la misma Zona → red NS**. El originador acumula reputación en todos los casos. En fases posteriores, el Global Routing Agent evaluará otras Salas de la ciudad, otras ciudades y otros países, reutilizando S4–S9 con `chapter_id` de destino y una capa 0 aún más restringida (`geography` a nivel de país, sin `value_band`). Requiere consentimiento expreso del originador para salir de la Sala. Todo lo demás del protocolo se mantiene.

---

## 14. Escenarios de referencia (trazas)

### Scenario A · Oportunidad excelente

```text
S0  Miembro (Correduría Guadalquivir) introduce por móvil:
    "Mi cliente Metalúrgica del Sur abre planta en Dos Hermanas en Q1, 60 empleados nuevos."
    Fuente: MEMBER_INPUT · permisos: READ, INFER, STORE, SHARE (REVEAL_IDENTITY pendiente)

S1  Agente Guadalquivir extrae needs:
    - Obra/reforma industrial (0.85) · Prevención de riesgos (0.80) · Selección de personal (0.75)
    - Ciberseguridad/IT (0.65) · Telecomunicaciones (0.60) · Mobiliario (0.45) · Catering (0.30, LATENT)

S2  Compliance: capa 0 sin identidad ✓ · sin personas físicas ✓ · visibilidad CHAPTER

S3  Miembro previsualiza: "Empresa industrial 51–200 empleados abrirá nueva planta en área
    metropolitana de Sevilla · Q1 · relación directa" → publica.

S4  Matchmaker: 6 capabilities candidatas para 5 needs.

S5  Claims: Reformas Industriales Híspalis (0.78) · PRL Andaluza (0.72) · Talento Sur (0.70)
    · SecureNet Sevilla (0.61) · NO_INTEREST de Mobiliario Delta (TICKET_MISMATCH: mínimo 80K).

S6  Cualificación Híspalis ↔ Guadalquivir (capa 1):
    Q BUDGET → "Presupuesto de obra aprobado internamente, cifra no conocida" (conf 0.6)
    Q TIMING → "Licencia de obra en trámite, inicio previsto febrero" (conf 0.8)
    Q DECISION_MAKER → "Director General; el miembro le asegura su flota" (conf 0.9)
    → QUALIFIED

S7  Score Híspalis: 0.91 HIGH. Explanation con 6 why, 1 unknown (cifra de presupuesto).

S8  Compliance: PASS (sin excepciones; miembro fuera de periodo de prueba; valor < umbral).

S9  ORIGINATOR aprueba y fija reveal_scope = empresa + contacto (base jurídica: interés legítimo,
    relación comercial previa). RECEIVER acepta en 3 h.

S10 Referral INTRO_AUTHORIZED. Híspalis ve por primera vez "Metalúrgica del Sur".

S11 Agente prepara IntroPackage. El miembro de Guadalquivir lo envía desde su correo y marca INTRODUCED.
```

### Scenario C · Falso positivo semántico

```text
S3  Señal: "Startup SaaS de 8 personas busca diseño de identidad de marca antes de ronda seed."
S4  Discovery incluye Branding Atelier (plaza: Branding).
S5  hardGates(need, Branding Atelier):
      value_band "<10K" vs ticket_min 25.000 € → TICKET_MISMATCH
    → NO_INTEREST antes de cualquier llamada al modelo.
    Agent Room: "Branding Atelier descartada: ticket mínimo incompatible."
    Chapter Intelligence registra necesidad sin cobertura (Branding para tickets pequeños).
```

### Scenario D · Confidencialidad

```text
S0  Fuente: notas internas del miembro (Consultora Fiscal Triana) marcadas COMPANY_ONLY.
    Contenido: cliente prepara venta de la empresa; necesitará due diligence legal y valoración.
S1  Agente Triana extrae needs (Legal M&A 0.9 · Valoración 0.85). Permisos: READ, INFER. Sin SHARE.
S3  No se publica. El agente puede buscar internamente qué plazas de la Sala cubrirían la necesidad
    (Discovery sobre índice de capabilities, que es CHAPTER) sin emitir ningún mensaje.
    Resultado: "Bufete Alameda (Legal M&A) y Valoraciones Ibéricas cubrirían esta necesidad."
    → Se presenta SOLO al miembro de Triana:
      "Tu agente ha identificado dos miembros que podrían ayudar a un cliente tuyo en una
       operación confidencial. Nada se ha compartido. ¿Quieres autorizar una señal anónima?"
S9  Si el miembro autoriza: se crea una OpportunitySignal nueva con capa 0 mínima
    ("Empresa familiar 11–50 empleados, operación societaria, 180 días") y permisos SHARE
    limitados. El material original permanece en private_layer. Si no autoriza: fin, sin traza
    fuera de la empresa salvo AuditEvent interno.
```

### Scenario E · Conflicto de plaza en admisión (fuera de NS-ARP, gobernado por D-001)

Se documenta en `01_PRODUCT_REQUIREMENTS.md` (flujo de Application). NS-ARP solo interviene si un miembro con plaza `ADJACENT` reclama una necesidad: la penalización `conflict_risk` se aplica y la Directiva revisa.

---

## 15. Preguntas abiertas para v0.2

1. ¿Debe el receptor ver `relationship_strength` del originador con el tercero antes de aceptar, o solo tras `INTRO_AUTHORIZED`? (Propuesta: antes, es parte del valor del referral.)
2. Ventana de duplicidad: 90 días como puerta dura y 180 como penalización. Validar con la Sala piloto.
3. Cómo tratar señales multilaterales (una obra que requiere arquitectura + reforma + instalaciones coordinadas). Propuesta: `ReferralBundle` en v0.3.
4. Política de expiración de `OpportunitySignal` por tipo de trigger (una expansión internacional dura más que una sustitución de proveedor).
5. Calibración inicial de pesos con datos demo antes del piloto real.
6. ~~Objeto `ContributionQuota` (D-010)~~ **Resuelto en D-042**: objeto `ContributionWeek` por titular y semana (Cesiones válidas cedidas, especialidades distintas, semanas seguidas sin ceder, acción de la Escalera). Mínimo de 1 Cesión válida por semana; aviso diplomático en la 2.ª semana sin ceder, aviso formal en la 3.ª, notificación de baja en la 4.ª. `TrustEvent` `CONTRIBUTION_QUOTA_MET` (con plus por especialidades distintas) y `CONTRIBUTION_QUOTA_MISSED` (peso por peldaño).
7. Objeto `ReferralPromise` (D-021): valor a priori fijado en `APPROVED` a partir de `value_band`, `qualification_quality`, `relationship_strength` y `timing`, confirmado o ajustado por el receptor; emite `TrustEvent{PROMISE_EARNED}` para el originador. Objeto `ReferralQualification` (D-009, D-020): Veredicto del receptor en tres ejes (Facilidad, Negocio, Trato) con evidencia del Agente; objeto `Recognition{axis, reason}` para la Distinción, máximo una por titular y mes; reputación bilateral.
8. Objetos `Zone` y `Sala` (D-013): saturación de zona, apertura de nuevas Salas y enrutamiento Sala → Zona → Red en S4/§13. Clasificación `NS-CAT` como origen de `Specialty`.

---

## 16. Versionado del protocolo

- `protocol_version` en cada objeto.
- Cambios compatibles (nuevos campos opcionales, nuevos códigos): incremento menor.
- Cambios de estados, capas, verbos o fórmula del score: incremento mayor, registrado en `DECISIONS.md`, con migración explícita de referrals abiertos.
- Una Sala migra de versión de forma atómica; los referrals en curso conservan la versión en la que nacieron hasta cerrarse.
