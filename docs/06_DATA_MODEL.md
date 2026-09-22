# 06 · Modelo de datos

**Estado:** v0.1 · implementado en `apps/web/src/db/schema.ts` (Drizzle ORM, PostgreSQL). Cada cambio de esquema genera una migración en `apps/web/drizzle/`.
**Deriva de:** NS-ARP v0.2 (`docs/02`), Salas (`docs/12`), Protocolos (`docs/14`), tarjeta de Cesión (`docs/15`), D-001, D-010, D-013, D-020, D-021, D-024, D-025.

## 0. Principios

1. **Los LLM razonan. El sistema mantiene estado.** Todo objeto del protocolo (Indicio, necesidad, claim, cualificación, Pista, Cesión, Puente, Veredicto) es una fila con historial. Ninguna salida de modelo se convierte en estado sin pasar por un esquema zod (`src/core/types.ts`) y por una función del sistema.
2. **Multi-tenancy explícita.** Toda tabla de negocio lleva `chapter_id` (Sala). La jerarquía es `Zona → Sala → Empresa → Persona`. Nunca se confía en filtros de interfaz: los servicios reciben `chapterId` y `companyId` y filtran en la consulta.
3. **Conocimiento ≠ permiso.** El envelope de un Indicio guarda las cuatro capas juntas en la empresa originadora; lo que ve cada parte lo decide el estado de la Cesión y el Salvoconducto, nunca una consulta directa al envelope desde la interfaz de otra empresa.
4. **Todo se audita.** `audit_events` registra decisiones, evidencia usada (con capa), política aplicada y resultado. No se guardan razonamientos internos del modelo. La Mesa Permanente y Hoy se construyen solo a partir de eventos marcados `significant`.
5. **Nunca un campo de retribución.** No existe columna, campo JSON ni enum que represente comisión, descuento o contraprestación (D-010). El Trust & Compliance Agent detecta indicios en texto libre y emite `REFERRAL_FEE_VIOLATION`.
6. **Grafo por diseño.** Las tablas son la proyección relacional del Referral Graph de la constitución (§11). Las relaciones `OFFERS`, `OCCUPIES`, `REPRESENTS`, `INDICATES`, `MATCHES`, `MAY_CREATE`, `PRODUCES`, `UPDATES` son claves foráneas explícitas para poder explotarlas como grafo más adelante.

## 1. Mapa de tablas

```text
ESTRUCTURA            zones · chapters · specialties (NS-CAT) · category_seats
EMPRESA               companies · members · business_dna · capabilities · agents
INDICIO               business_signals (S0) · opportunity_signals (S1–S3, envelope) · needs
PISTA                 interest_claims (S5) · qualifications (S6) · match_candidates (S7–S8: score, explanation, compliance)
CESIÓN                referrals (estado, Promesa, alcance de revelación, valor) · referral_transitions · human_decisions
PUENTE Y CIERRE       introductions · verdicts · recognitions · trust_events
AUDITORÍA             audit_events · agent_interactions
RASTREO Y ENCARGOS    public_records (D-031) · demands (D-032)
```

| Léxico NS | Tabla | Notas |
| --- | --- | --- |
| Zona | `zones` | "NS Sevilla". |
| Sala | `chapters` | Nombre único en la red (D-014). `value_threshold_eur` (umbral de Directiva), `weekly_pace` (Ritmo), `protocol_version`. |
| Especialidad (NS-CAT) | `specialties` | `nscat_code`, `cnae_class`, `status` OFFICIAL/NS_EXTENDED/PROVISIONAL, `regulated`, `overlaps_with[]`. Catálogo inicial en `src/db/nscat.ts`. La marca **Manantial** (D-059) vive hoy solo en el catálogo (`manantial`, `MANANTIALES`); pasará a columna cuando la Antesala la use en consultas. |
| Plaza | `category_seats` | Única por (Sala, especialidad). `status` ACTIVE/VACANT/WAITLISTED/RELEASED. |
| Titular | `companies` | `status`, `tier` (Niveles), `fee_tier` (Tramo, D-025). |
| Timonel | `members` | La persona que decide por la empresa (D-027). `is_primary` marca al Timonel; un segundo registro con `is_primary = false` es el Timonel suplente. `is_director` marca a la Directiva. |
| ADN de Empresa | `business_dna` | JSONB validado por `BusinessDNA` (zod), versionado, `validated_by/at`. |
| Capability | `capabilities` | Lo que la empresa cubre; `is_primary_seat` marca la plaza (prioridad D-001). |
| Agente NS | `agents` | `kind` COMPANY (uno por empresa) o de Sala: MATCHMAKER, COMPLIANCE, CHAPTER_INTELLIGENCE, BRIEFING. |
| Indicio (bruto) | `business_signals` | Fuente, contenido, `permissions[]` (verbos NS-ARP §2.1). |
| Indicio | `opportunity_signals` | `envelope` JSONB con las cuatro capas; `visibility`; `status` DRAFT/PUBLISHED/WITHDRAWN/EXPIRED. |
| Necesidad | `needs` | `specialty_hints[]`, `plausibility`, `status` ACTIVE/LATENT/UNCOVERED/SELF. |
| Interés | `interest_claims` | `preliminary_fit`, `status`, `decline_code` (puerta dura). |
| Cualificación | `qualifications` | `turns[]` tipados, `outcome`. |
| Pista | `match_candidates` | `score` (NSMatchScore), `explanation`, `compliance` (Salvoconducto). |
| Cesión | `referrals` | `state` (máquina §9), `route` CHAPTER/ZONE/NETWORK, `embassy`, `promise` (D-021), `reveal_scope`, `value_potential_*`, `value_verified`, plazos (`expires_at`, `response_due_at`). |
| Transición | `referral_transitions` | Toda transición con actor y motivo. |
| Visto bueno | `human_decisions` | Rol, decisión, `reveal_scope`, `seen_layers[]` (qué vio la persona al decidir). |
| Puente | `introductions` | Borrador del Agente, mensaje final, canal, quién lo envió. |
| Veredicto | `verdicts` | Tres ejes + resultado + valor; Mérito emitido; `contrast_status`. |
| Distinción | `recognitions` | Eje y motivo; máx. una por titular y mes (regla en servicio). |
| Mérito | `trust_events` | Cada hecho verificable con `weight`. La Hoja de Méritos es una vista, nunca un número opaco. |
| Mesa Permanente | `audit_events` | `significant`, `company_ids[]` (vacío = toda la Sala; con ids = privado). |
| Mensajes A2A | `agent_interactions` | Catálogo NS-ARP §5 con `layer_used` y `policy_applied`. |
| Rastreo | `public_records` | Registro público ingerido (fuente, referencia externa única por Sala, Indicio generado). |
| Encargo | `demands` | Lo que busca un titular ahora: texto, señal, industria, vigencia, estado. |
| Reloj de la Sala | columnas en `referrals` | `reminder_sent_at`, `late_flagged_at`, `last_nudge_at` garantizan idempotencia (D-030). |

## 2. Ciclos de vida

```text
OpportunitySignal   DRAFT → PUBLISHED → (WITHDRAWN | EXPIRED)         COMPANY_ONLY nunca pasa de DRAFT
Need                ACTIVE | LATENT (<0.4) | UNCOVERED (sin titular) | SELF (la titular es la originadora)
InterestClaim       PENDING → ACCEPTED | DECLINED | NO_INTEREST(decline_code) | EXPIRED
Qualification       OPEN → QUALIFIED | DISQUALIFIED | INSUFFICIENT_INFORMATION
MatchCandidate      PROPOSED | BELOW_THRESHOLD | ACCEPTED | REJECTED | EXPIRED
Referral            ver máquina de estados en src/core/state-machine.ts (NS-ARP §9 + D-024)
```

Plazos (D-024) ejecutados por el Reloj de la Sala (D-030, `services/clock.ts`): recordatorio a las 72 h, caducidad a los 7 días de revisión, respuesta al Interesado en 48 h tras el Puente, check-in del Agente cada 14 días.

## 3. Visibilidad en consultas

| Quién | Qué ve | Cómo se aplica |
| --- | --- | --- |
| Cualquier titular de la Sala | Capa 0 de Indicios publicados; eventos `significant` sin `company_ids`; Balanza (agregados contrastados). | `mesaTimeline`, `balance`. |
| Cedente | Capas 0–3 propias; Cesiones donde es originador. | `roleOf()` en `services/referrals.ts`. |
| Cesionario | Capa 1 al aceptarse su claim; capa 2 solo desde `INTRO_AUTHORIZED` y según `reveal_scope`; nunca la capa 3. | Tarjeta de Cesión, `layer2Open`. |
| Directiva | Cesiones de la Sala con excepciones; capa 2 solo si la excepción es de datos personales. | `members.is_director`. |
| Agente de otra empresa | Nada por debajo de CHAPTER fuera de una Cesión en curso. | Los agentes reciben objetos ya filtrados por el orquestador. |

## 4. Persistencia

- **PostgreSQL** es el motor. En desarrollo, demo y tests se usa **PGlite** (Postgres embebido) con el mismo esquema y las mismas migraciones; con `DATABASE_URL` se conecta a un Postgres real. Decisión en D-026.
- JSONB para el envelope, el ADN, el score, la Explanation, la Promesa y el Veredicto: son documentos validados por zod cuyo interior evoluciona con el protocolo; las columnas relacionales guardan lo que se filtra, se indexa o se agrega.
- Índices: `(chapter_id, state)` en Cesiones, `(chapter_id, occurred_at)` en auditoría, `(chapter_id, specialty_id)` en capabilities, `(chapter_id, status)` en Indicios.
- Búsqueda semántica (pgvector) queda fuera de v0.1: `semantic_fit` usa similitud léxica con techo 0.10 (NS-ARP §7.2). Se añadirá cuando aporte recall real.

## 5. Pendiente

- Re-aceptación de las Normas NS por titulares existentes cuando cambie la versión (D-043): hoy `rules_acceptances` registra la aceptación del alta (empresa, Timonel, versión, códigos, fecha).
- `MemberBalance` histórico de 12 semanas y `WeeklyPace` de Sala editable: hoy `weekly_pace` es un entero en la Sala (1 por defecto) y el Compromiso ya persiste en `contribution_weeks` (D-042: una fila por titular y semana con `valid_count`, `distinct_specialties`, `missed_streak`, `action`).
- `Communique`, `ChapterGazette`, `MemberDossier` (Protocolo II) y `MemberCompass` (Protocolo III): no persisten todavía; el Dossier se deriva del ADN.
- `FeeTier` / `AgentCostLedger` (D-025): solo la columna `fee_tier`.
- `Waitlist` (Antesala), `ReferralRoute` (Embajada en Red), `DataSource` (integraciones) y `Permission` por fuente.
- Adaptadores reales de Rastreo (BORME, PLACE, licencias municipales, empleo): hoy solo `SampleFeed`.
- Autenticación y RBAC: el slice usa una cookie de persona para la demo.
