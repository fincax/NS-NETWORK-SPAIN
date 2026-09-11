# 13 · Léxico NS

**Estado:** léxico oficial (D-016, CONFIRMED por el fundador). Cambios posteriores se registran en DECISIONS.
**Por qué existe.** NS debe tener lenguaje propio (constitución, sección 2). Un producto que crea una categoría nueva necesita nombrar sus objetos y sus rituales con palabras que nadie más use. El léxico es propiedad intelectual y es producto: el microcopy, la web pública y la app hablan con él. Ningún término copia terminología de otras organizaciones de networking.

Criterios de cada nombre: castellano; una palabra siempre que sea posible; institucional y sobrio; con sentido literal reconocible; sin pistas territoriales; traducible sin perder el concepto; registrable con el prefijo NS.

---

## 1. Estructura de la red

| Término NS | Qué es | Identificador técnico | Ejemplo de uso |
| --- | --- | --- | --- |
| **Red NS** | La red mundial. | `Network` | "La Red NS enruta lo que la zona no cubre." |
| **Zona** | Ciudad o área metropolitana que agrupa Salas. Lleva el nombre de la ciudad y pertenece a NS: "NS Sevilla". | `Zone` | "NS Sevilla tiene tres Salas activas." |
| **Sala** | Unidad fundamental: empresas seleccionadas, una por especialidad. No es territorial. Nombre propio autorizado: "NS Cumbre". | `Chapter` | "Soy miembro de NS Cumbre." |
| **Plaza** | Posición única de una especialidad dentro de una Sala. | `CategorySeat` | "La plaza de Derecho laboral está vacante." |
| **Titular** | Empresa que ocupa una plaza. | `seat.company_id` | "El titular de Climatización recibe la cesión." |
| **Antesala** | Lista de espera de empresas admitidas que aguardan plaza o fundan la siguiente Sala. | `Waitlist` | "Hay doce empresas en la Antesala de NS Sevilla." |
| **Candidatura** | Solicitud de plaza y proceso de admisión. | `Application` | "Presentar candidatura" es el paso tras "Solicitar plaza". |
| **Directiva** | Presidencia y consejo de una Sala. | `Director` | "La Directiva revisa las excepciones." |
| **Consejo de Zona** | Gobierno de la zona: apertura, escisión y fusión de Salas; clasificación. | `ZoneDirector` | "El Consejo de Zona abre la cuarta Sala." |
| **Pleno** | Reunión periódica de las personas de una Sala. | `ChapterSession` | "El Pleno de NS Cumbre es el segundo martes." |
| **Confluencia** | Encuentro entre dos o más Salas, convocado cuando los agentes detectan demanda cruzada. | `CrossChapterMeeting` | "Confluencia NS Cumbre · NS Ágora, agenda generada por los agentes." |

## 2. El flujo de negocio (NS-ARP)

| Término NS | Qué es | Identificador técnico | Sustituye a |
| --- | --- | --- | --- |
| **Indicio** | Señal estructurada de que puede existir una necesidad empresarial. Es la materia prima. | `OpportunitySignal` | "señal", "lead" |
| **Pista** | Hipótesis de encaje entre un Indicio y una plaza, formulada por los agentes y aún sin cualificar. | `MatchCandidate` | "match" |
| **Encaje** | Grado de ajuste explicable entre necesidad y titular (0–100 %). | `NSMatchScore` | "score" |
| **Fundamento** | Explicación obligatoria de una Pista: por qué, evidencia, confianza, incógnitas, siguiente paso. | `Explanation` | "why this match" |
| **Salvoconducto** | Veredicto del Trust & Compliance Agent que autoriza a una Pista a llegar a personas. | `ComplianceVerdict` | "compliance check" |
| **Visto bueno** | Decisión humana de aprobar (originador, receptor o Directiva). | `HumanDecision.APPROVE` | "aprobar" |
| **Apertura** | Momento en que el originador autoriza revelar identidad y contexto al receptor. | `INTRO_AUTHORIZED` + `reveal_scope` | "reveal" |
| **Cesión** | El referido NS: un contacto o necesidad concreta que un miembro (cedente) entrega a un titular (cesionario) de su Sala. Es la unidad que se cualifica, se contrasta y genera Mérito. | `Referral` | "referido", "referencia" |
| **Embajada** | Propuesta Fuera de la Sala: cesión extraordinaria que el miembro propone a un titular de **otra Sala de la zona** cuando la plaza está vacante en la suya. Prima de Mérito para el cedente. Ver D-015. "Hacer una Embajada". | `Referral{ route: ZONE, embassy: true }` | — |
| **Embajadora** | La empresa de otra Sala que acoge la Embajada. Representa esa especialidad en la Sala del cedente mientras la plaza siga vacante: sin plaza, sin voto, con mención en su Hoja de Méritos. Máximo dos Salas a la vez. | `EmbassyRole` | — |
| **Embajada en Red** | El mismo acto extendido a otra zona cuando ninguna Sala de la zona cubre la necesidad. | `Referral{ route: NETWORK, embassy: true }` | "global routing" |
| **Cedente / Cesionario** | Quien entrega la Cesión / quien la recibe. | `originator` / `receiver` | "giver / receiver" |
| **Puente** | La introducción cálida: el mensaje o reunión que conecta al cesionario con el tercero, preparado por el agente y enviado por la persona. | `Introduction`, `IntroPackage` | "intro" |
| **Oportunidad** | Negociación abierta confirmada por el cesionario tras el Puente. | `Opportunity` | — |
| **Cierre** | Resultado: ganado, perdido o sin decisión. | `Outcome` | — |
| **Valor contrastado** | Valor económico confirmado por ambas partes y verificable por NS. El único que alimenta la métrica principal. | `VALUE_CONFIRMED` | "verified closed value" |
| **Libro de Valor** | Registro acumulado de valor contrastado de una empresa, una Sala, una zona. | `ValueLedger` | "value tracking" |

## 3. Calidad, reputación y compromiso

| Término NS | Qué es | Identificador técnico |
| --- | --- | --- |
| **Veredicto** | Cualificación de la Cesión por el cesionario en cinco ejes: encaje, oportunidad en el tiempo, calor de la relación, información aportada, resultado. Tres toques por hito. | `ReferralQualification` |
| **Contraste** | Auditoría de NS: comparación entre el Veredicto declarado y la evidencia recogida por los agentes. | `Audit` |
| **Mérito** | Unidad de reputación verificable. Solo nace de Veredictos y Cierres contrastados. Nunca de cantidad. | `TrustEvent.weight` |
| **Hoja de Méritos** | Panel público (dentro de la red) de comportamientos verificables de una empresa: cesiones, calidad media, valor contrastado, tiempo de respuesta, fiabilidad como cesionario. Nunca un número opaco. | `ReputationProfile` |
| **Distinción** | Reconocimiento periódico por calidad: "Cesión de la semana", "Cierre del mes", memoria anual. La otorga quien recibe. | `Recognition` |
| **Compromiso** | Mínimo de Cesiones válidas por Ejercicio que toda empresa debe aportar (D-010). | `ContributionQuota` |
| **Ejercicio** | Periodo de cómputo del Compromiso (por estipular: mes o trimestre). | `QuotaPeriod` |
| **Niveles** | Miembro · Contribuidor · Referente · Consejero · Fundador. Se ganan con Mérito; amplían acceso, nunca lo restringen. ("Embajador" queda reservado a la Embajada.) | `MembershipTier` |
| **Arbitraje** | Resolución de disputas entre cedente y cesionario por la Directiva. | `Dispute` |

## 4. Los agentes y el día a día

| Término NS | Qué es | Identificador técnico |
| --- | --- | --- |
| **Agente NS** | El agente empresarial de cada miembro. Representa, prospecta, cualifica, prepara, persigue. | `CompanyAgent` |
| **ADN de Empresa** | El conocimiento estructurado que entrena al Agente (Business DNA). | `BusinessDNA` |
| **Mesa Permanente** | La reunión 24/7 de los agentes de una Sala. Lo que en la app se ve como cronología de eventos significativos. | `AgentRoom` |
| **Despacho** | Sesión breve y periódica del miembro con su Agente: tres cosas ya preparadas, decisiones de 30 segundos. | `AgentCheckIn` |
| **Encargo** | Lo que una empresa busca ahora (ICP + trigger + ticket + plazo). Los agentes prospectan contra los Encargos de la Sala. | `DemandPosting` |
| **Rastreo** | Prospección del Agente en fuentes públicas (registros, licitaciones, licencias, empleo, noticias) para generar Indicios para otros. | `PublicProspecting` |
| **Sondeo** | Pregunta discreta al grafo de relaciones de la Sala: "¿alguien tiene relación con la dirección financiera de Z?". Nadie ve contactos hasta que su dueño da el visto bueno. | `RelationshipProbe` |
| **Hoy** | Pantalla de inicio del miembro: qué ha hecho la red por su empresa desde la última vez. | `TodayView` |
| **Parte** | Informe ejecutivo de la Directiva y del Consejo de Zona: indicios, pistas, cesiones, compromiso, antesala, saturación. | `ExecutiveBriefing` |
| **Crónica** | Muro de la Sala con hechos contrastados: cierres, distinciones, incorporaciones. Nada se publica sin confirmación de ambas partes. | `ChapterFeed` |
| **Carta de Presentación** | Página que ve el tercero cuando recibe un Puente: quién lo recomienda, por qué, agenda en un clic, opción de valorar. | `IntroLandingPage` |
| **NS Radar** | Visualización icónica de Indicios, Pistas y Cesiones de la Sala y de la zona. Nunca sobre un mapa. | `Radar` |

## 5. Protocolos y clasificaciones

| Término | Qué es |
| --- | --- |
| **NS-ARP** | NS Agentic Referral Protocol: cómo los agentes descubren, comparten, cualifican, puntúan, autorizan y trazan Cesiones. |
| **NS-CAT** | Clasificación NS de Actividades: base CNAE + Especialidad NS, ampliable y versionada. |
| **Especialidad** | Nivel de NS-CAT que otorga plaza. |
| **Reglas inmutables** | Nunca se cobra por una Cesión (expulsión); Compromiso obligatorio; calidad sobre cantidad (D-010). |

---

## 6. El flujo completo dicho en léxico NS

```text
El Agente de Híspalis detecta un Indicio en su Rastreo: un cliente abre sede.
La Mesa Permanente de NS Cumbre formula tres Pistas; una alcanza 91 % de Encaje con Fundamento claro.
Compliance emite Salvoconducto. Carlos da el visto bueno en su Despacho; Lucía acepta.
Apertura: se revela la identidad. Carlos tiende el Puente; el tercero ve la Carta de Presentación.
La Cesión avanza a Oportunidad y a Cierre ganado. Ambos confirman: 38.000 € de valor contrastado en el Libro de Valor.
Lucía emite su Veredicto; NS hace Contraste. Híspalis suma Mérito y cumple su Compromiso del Ejercicio.
La Crónica de NS Cumbre lo publica; la Cesión recibe la Distinción de la semana.
La plaza de Mobiliario estaba vacante en NS Cumbre: Carlos hizo una Embajada a un titular de NS Ágora, que pasó a ser Embajadora de Mobiliario en NS Cumbre; Carlos obtuvo prima de Mérito.
El Parte del Consejo de Zona anota que Mobiliario debería cubrirse desde la Antesala.
```

## 6bis. Por qué "Embajada"

El fundador descartó "Extramuros" por agresivo. "Embajada" describe el acto con exactitud diplomática: la Sala del cedente envía una cesión a otra Sala, y la empresa que la acoge queda acreditada como **Embajadora** de esa especialidad en la Sala que no la tiene. Es sobria, cálida, castellana, sin pista territorial y registrable como "NS Embajada". Para evitar colisión, el antiguo nivel de membresía "Embajador" pasa a llamarse "Consejero".

## 7. Palabras que NS no usa

"Lead", "referencia" (en sentido de referido), "capítulo", "grupo", "networking" como sustantivo del producto, "sinergia", "match" en la interfaz, "ranking", "puntos". Y ninguna expresión, lema o formato protegido de otras organizaciones de networking.
