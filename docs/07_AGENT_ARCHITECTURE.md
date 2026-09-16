# 07 · Arquitectura de agentes

**Estado:** v0.1 · implementada en `apps/web/src/agents/` y `apps/web/src/core/`.
**Deriva de:** NS-ARP v0.2 (`docs/02`), constitución §10–§12, Protocolos de Sala (`docs/14`).

## 0. Idea rectora

Un agente NS no es un chat. Es un módulo con **entradas tipadas, salidas validadas y permisos explícitos**, que produce estimaciones con confianza. El orquestador (la Mesa Permanente) llama a los agentes en el orden del protocolo, persiste cada resultado, aplica las funciones puras del sistema (puertas duras, Match Score, Salvoconducto, máquina de estados, Promesa, Mérito) y audita cada paso.

```text
             ┌──────────────────────── Mesa Permanente (orquestador · agents/mesa.ts) ────────────────────────┐
             │                                                                                                │
 Indicio ──▶ │ Company Agent ──▶ Matchmaker ──▶ Company Agents ──▶ Matchmaker ──▶ Trust & Compliance ──▶ Cesión │ ──▶ Personas
             │  (S1–S3)          (S4)            (S5–S6)             (S7)              (S8)              (S9)    │      (S9–S13)
             └────────────────────────────────────────────────────────────────────────────────────────────────┘
                     ▲                                   ▲                       ▲
              LLMProvider                          funciones puras         funciones puras
       (determinista | Anthropic)              core/scoring.ts         core/compliance.ts
```

## 1. Roles

| Agente | Responsabilidad implementada | Crea | Dónde |
| --- | --- | --- | --- |
| **Company Agent** (uno por empresa) | S1 extracción del Indicio en cuatro capas y necesidades con plausibilidad; S2 propuesta de visibilidad; S5 interés preliminar; S6 respuestas de cualificación desde el texto y las notas privadas del cedente; S11 borrador del Puente. | `OpportunitySignal`, `Need`, `InterestClaim`, `QualificationTurn`, `IntroPackage` | `services/signals.ts`, `agents/mesa.ts`, `services/referrals.ts` |
| **Matchmaker Agent** (uno por Sala) | S4 discovery sobre el índice estructurado de capabilities (≤ 8 por necesidad, titulares antes que secundarias); S5 puertas duras; S7 Match Score y Explanation; S9 solicitud de revisión. | `MatchCandidate`, `Explanation` | `agents/mesa.ts`, `core/scoring.ts` |
| **Trust & Compliance Agent** (uno por Sala) | S2 redacción de datos personales en capas 0–1; S8 Salvoconducto con diez comprobaciones, excepciones y campos bloqueados; vigilancia de retribución (D-010) en cualquier texto libre. | `ComplianceVerdict`, `TrustEvent` | `core/compliance.ts`, `services/referrals.ts` |
| **Chapter Intelligence Agent** | Registra necesidades sin titular (`NEED_UNCOVERED`, candidatas a Embajada). Gaceta y Balanza de Sala: pendientes. | `ChapterInsight` (como AuditEvent) | `agents/mesa.ts` |
| **Rastreo** (parte del Company Agent) | Revisa fuentes públicas y deja Indicios en borrador para otros titulares; el Timonel decide (D-031). | `OpportunitySignal{DRAFT, source: PUBLIC_RECORD}` | `agents/rastreo.ts` |
| **Reloj de la Sala** (sistema, sin modelo) | Ejecuta plazos y empujones de seguimiento (D-030). | `AuditEvent`, `TrustEvent`, transición `EXPIRED` | `services/clock.ts` |
| **Executive Briefing Agent** | Hoy: síntesis por empresa a partir de AuditEvents visibles. Parte de Directiva: pendiente. | `Briefing` (vista) | `services/today.ts` |
| **Global Routing Agent** | Fuera de v0.1. | — | — |

Cada agente actúa con un `agent_id` de la tabla `agents` y con los permisos de la empresa o Sala que representa. Los agentes no consultan la base de datos libremente: el orquestador les entrega objetos ya filtrados por capa.

## 2. Contrato con el modelo (`agents/provider.ts`)

```ts
interface LLMProvider {
  extractSignal(input): Promise<ExtractionOutput>;      // capas 0/1/2 + needs[] + triggers[]  (zod)
  answerQualification(input): Promise<QualificationAnswer>; // { answer, confidence, insufficient }
  draftIntro(input): Promise<IntroPackage>;             // asunto, mensaje, contexto, siguiente paso
}
```

Dos implementaciones con el mismo contrato:

- **Determinista** (`agents/deterministic.ts`): reglas explícitas sobre el texto (triggers, industria, tamaño, plazo, banda de valor, relación, tercero). Sirve para demo, tests y como comportamiento de referencia. Lo que no encuentra lo devuelve como `insufficient` o con confianza baja: nunca inventa.
- **Anthropic** (`agents/anthropic.ts`): `@anthropic-ai/sdk` con salidas estructuradas (`client.messages.parse` + `zodOutputFormat`). Modelo por defecto `claude-opus-5` (`NS_LLM_MODEL` para cambiarlo). Se activa con `ANTHROPIC_API_KEY`; `NS_LLM_PROVIDER=deterministic` fuerza el determinista.

Reglas comunes (NS-ARP §12): una salida que no valida se descarta; el paso queda como `NEEDS_HUMAN` sin avanzar el estado (pendiente de implementar el reintento único); ante indisponibilidad del modelo el pipeline se pausa, nunca degrada a reglas que inventen contenido.

## 3. Lo que el modelo no decide

| Decisión | Quién la toma | Por qué |
| --- | --- | --- |
| Puertas duras (geografía, ticket, exclusiones, capacidad, conflicto, duplicado, visibilidad) | `hardGates()` determinista, antes de cualquier llamada al modelo | Baratas, explicables, auditables. Scenario C. |
| Encaje (NS Match Score) | `computeNSMatchScore()` función pura sobre objetos persistidos | El modelo aporta estimaciones con confianza en S1/S5/S6; la combinación es determinista y versionada (`ScoringProfile`). |
| Salvoconducto | `runComplianceGate()` | Diez comprobaciones deterministas; cualquier `FAIL` bloquea. |
| Transiciones de estado | `assertTransition()` por actor | Un agente no puede aprobar por una persona. |
| Promesa y Mérito | `computePromise()`, `computeVerdictMerit()` | Datos estructurados, no opinión. |
| Qué capa ve quién | Orquestador y servicios | Conocimiento ≠ permiso. |

## 4. Puertas humanas (NS-ARP §10) tal como están en el slice

| Puerta | Pantalla | Servicio |
| --- | --- | --- |
| Publicar / restringir / retirar el Indicio | `/indicio/[id]` (previsualización exacta de la capa 0) | `publishSignal`, `withdrawSignal` |
| Visto bueno del cedente | tarjeta, cara B0 | `decide` (ORIGINATOR) |
| Aceptar y confirmar la Promesa / pedir información / declinar con motivo | tarjeta, cara A | `decide` (RECEIVER) |
| Directiva por excepción | tarjeta (`DIRECTOR_PENDING`) | `decide` (DIRECTOR) |
| Alcance de revelación (empresa sola / empresa y contacto) | tarjeta, cara B | `authorizeIntro` |
| Envío del Puente | tarjeta, cara B | `markIntroduced` (siempre una persona) |
| Seguimiento por hitos | tarjeta | `updateStage` |
| Veredicto y Distinción | tarjeta | `submitVerdict` |
| Confirmación del valor contrastado | tarjeta | `confirmValue` |

## 5. Observabilidad

Cada paso emite un `AuditEvent{ kind, actor, subject, inputs_used[{type,id,layer}], policy_applied, result, significant, company_ids }`. Los eventos `significant` sin `company_ids` forman la Mesa Permanente de la Sala; los que llevan `company_ids` son privados (Scenario D). Los mensajes agente-a-agente se registran en `agent_interactions` con la capa usada. No se persiste ningún razonamiento interno del modelo.

## 6. Runtime

La Mesa corre de dos formas (D-053): **en línea** al publicar (demo y pruebas, proveedor determinista, segundos) o **en cola** (`agent_jobs`) con el modelo real: un trabajo por Indicio, reclamación exclusiva, tres intentos con espera creciente y `NEEDS_HUMAN` con aviso al cedente. La cola se drena tras responder a la publicación (`after()`), en cada Ronda antes del Reloj y por `GET /api/jobs`. El contrato de los agentes no cambia. Además de la Mesa, la Ronda ejecuta el Reloj (plazos y Compromiso), el Rastreo (fuentes públicas reales con `NS_PUBLIC_FEEDS=real`, D-051; empresas en Prueba de Valor incluidas, D-050) y las fuentes propias.

**Latido (solo demo, D-057, `agents/latido.ts`).** Con `NS_AUTH_MODE=demo`, `GET /api/jobs` y `GET /api/clock` llaman antes a `runLatido`: en cada franja (9:00, 13:00, 18:00 hora de Madrid) el Agente de una empresa ficticia publica un Indicio del banco `LATIDO_INDICIOS` por el camino normal (`createSignal` → `publishSignal` con `mesaMode()`), y las Cesiones entre empresas ficticias avanzan un paso cuando vence su plazo (`LATIDO_DELAYS_H`), a través de los mismos servicios que usan las personas. Nunca actúa por la protagonista (`NS_LATIDO_PROTAGONISTA`, por defecto `hispalis`) ni por empresas ajenas a la semilla. `NS_LATIDO=off` lo apaga; `NS_LATIDO=on` lo fuerza. En Hoy, "Latir ahora" ejecuta una pasada forzada. Si la protagonista hace una Pregunta al cedente (D-058), el cedente ficticio responde al vencer su plazo con el borrador de su Agente o repitiendo lo que consta, sin inventar nada.

## 7. Pendiente

- Adaptadores de Rastreo pendientes: BORME (PDF por provincia), licencias y empleo; Sondeo (grafo de relaciones). PLACE y prensa, hechos (D-051).
- Cualificación real agente-a-agente con preguntas generadas por el Agente receptor (hoy: tres preguntas críticas fijas).
- Recalibración de pesos a partir de S14 (`historical_conversion`, `member_reputation` son priors fijos).
- Protocolos II y III: Comunicado, Gaceta, Brújula y Movimientos.
- Enrutamiento Sala → Zona → Red y Embajada.
