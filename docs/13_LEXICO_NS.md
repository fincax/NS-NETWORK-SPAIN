# 13 · Léxico NS

**Estado:** léxico oficial (D-016, CONFIRMED por el fundador). Cambios posteriores se registran en DECISIONS.
**Por qué existe.** NS debe tener lenguaje propio (constitución, sección 2). Un producto que crea una categoría nueva necesita nombrar sus objetos y sus rituales con palabras que nadie más use. El léxico es propiedad intelectual y es producto: el microcopy, la web pública y la app hablan con él. Ningún término copia terminología de otras organizaciones de networking.

Criterios de cada nombre: castellano; una palabra siempre que sea posible; institucional y sobrio; con sentido literal reconocible; sin pistas territoriales; traducible sin perder el concepto. **La única marca registrada es NS Network Spain (D-028).** Los términos del léxico son lenguaje de producto, no marcas: no se exige ni se comprueba que sean registrables.

---

## 1. Estructura de la red

| Término NS | Qué es | Identificador técnico | Ejemplo de uso |
| --- | --- | --- | --- |
| **Red NS** | La red mundial. | `Network` | "La Red NS enruta lo que la zona no cubre." |
| **Zona** | Ciudad o área metropolitana que agrupa Salas. Lleva el nombre de la ciudad y pertenece a NS: "NS Sevilla". | `Zone` | "NS Sevilla tiene tres Salas activas." |
| **Sala** | Unidad fundamental: empresas seleccionadas, una por especialidad. No es territorial. Nombre propio autorizado: "NS Cumbre". | `Chapter` | "Soy miembro de NS Cumbre." |
| **Plaza** | Posición única de una especialidad dentro de una Sala. | `CategorySeat` | "La plaza de Derecho laboral está vacante." |
| **Titular** | Empresa que ocupa una plaza. | `seat.company_id` | "El titular de Climatización recibe la cesión." |
| **Timonel** | La persona que lleva el rumbo de su empresa en NS: da los vistos buenos, autoriza la Apertura, tiende el Puente y emite el Veredicto. El Agente trabaja 24/7; el Timonel manda (D-027). Invariable en género: el Timonel, la Timonel. Cada Titular designa un Timonel y puede designar un **Timonel suplente**. | `Member{ is_primary }` | "Carlos es el Timonel de Híspalis." "Los Timoneles de NS Cumbre se ven en el Pleno." |
| **Antesala** | Lista de espera de empresas que aguardan plaza o fundan la siguiente Sala. También la pantalla donde la Directiva despacha las candidaturas con el veredicto de plaza (D-035). | `Waitlist` / `Candidacy` | "Hay doce empresas en la Antesala de NS Sevilla." |
| **Fundación** | Proceso por el que una Sala nueva se forma en la Antesala: una Promotora reúne fundadoras hasta el mínimo y la Directiva funda la Sala (D-041). | `ChapterFounding` | "La Sala en fundación de Giralda va por 7 de 12." |
| **Promotora** | Empresa cuya plaza estaba ocupada y que promueve la siguiente Sala de la zona; recibe la gratificación de fundación al fundarse (D-041). | `promoter_candidacy` | "Correduría Giralda es la Promotora de la nueva Sala." |
| **Candidatura** | Solicitud de plaza y proceso de admisión. | `Application` | "Presentar candidatura" es el paso tras "Solicitar plaza". |
| **Directiva** | Presidencia y consejo de una Sala. | `Director` | "La Directiva revisa las excepciones." |
| **Consejo de Zona** | Gobierno de la zona: apertura, escisión y fusión de Salas; clasificación. | `ZoneDirector` | "El Consejo de Zona abre la cuarta Sala." |
| **Pleno** | Reunión periódica de las personas de una Sala. | `ChapterSession` | "El Pleno de NS Cumbre es el segundo martes." |
| **Confluencia** | Encuentro entre dos o más Salas, convocado cuando los agentes detectan demanda cruzada. | `CrossChapterMeeting` | "Confluencia NS Cumbre · NS Ágora, agenda generada por los agentes." |

## 2. El flujo de negocio (NS-ARP)

| Término NS | Qué es | Identificador técnico | Sustituye a |
| --- | --- | --- | --- |
| **Interesado** | Quien busca un producto o servicio de confianza: empresa, persona física, autónomo, asociación, fundación, comunidad de propietarios, administración, club deportivo… Cualquier entidad o persona con una necesidad real. Es el objeto de toda Cesión; nunca es miembro de NS por el hecho de serlo. Si es persona física, su identidad solo se revela con base jurídica y consentimiento (NS-ARP §8). | `ThirdParty` | "tercero", "prospecto", "lead" |
| **Indicio** | Señal estructurada de que un Interesado puede tener una necesidad. Es la materia prima. | `OpportunitySignal` | "señal", "lead" |
| **Pista** | Hipótesis de encaje entre un Indicio y una plaza, formulada por los agentes y aún sin cualificar. | `MatchCandidate` | "match" |
| **Encaje** | Grado de ajuste explicable entre necesidad y titular (0–100 %). | `NSMatchScore` | "score" |
| **Fundamento** | Explicación obligatoria de una Pista: por qué, evidencia, confianza, incógnitas, siguiente paso. | `Explanation` | "why this match" |
| **Salvoconducto** | Veredicto del Trust & Compliance Agent que autoriza a una Pista a llegar a personas. | `ComplianceVerdict` | "compliance check" |
| **Visto bueno** | Decisión humana de aprobar (originador, receptor o Directiva). | `HumanDecision.APPROVE` | "aprobar" |
| **Apertura** | Momento en que el originador autoriza revelar identidad y contexto al receptor. | `INTRO_AUTHORIZED` + `reveal_scope` | "reveal" |
| **Cesión** | El referido NS: un Interesado con una necesidad concreta que un miembro (cedente) entrega al titular de esa especialidad en su Sala (cesionario). Un mismo Interesado puede originar varias Cesiones si su necesidad abarca varias especialidades. Es la unidad que se cualifica, se contrasta y genera Mérito. | `Referral` | "referido", "referencia" |
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
| **Promesa** | Valor a priori de una Cesión, fijado al aceptarse a partir de datos estructurados del Indicio y del Fundamento: valor estimado, necesidad real, información completa, decisor identificado, plazo, relación del cedente con el Interesado. La calculan los Agentes; el cesionario la confirma o ajusta con un toque. Da Mérito de Promesa al cedente sin esperar al cierre. | `ReferralPromise` |
| **Pregunta al cedente** | Lo que el cesionario pide saber antes de aceptar una Cesión. Va al cedente, que responde en persona con el borrador de su Agente, y vuelve al cesionario como evidencia. Máximo dos por Cesión (D-058). | `HumanDecision{REQUEST_INFO, ANSWER}` · `QualificationTurn{asked_by, answered_by}` |
| **Veredicto** | Valor a posteriori: cualificación de la Cesión por el cesionario en tres ejes, en tres toques: **Facilidad** (qué fácil fue prestar el servicio), **Negocio** (cuánto negocio generó) y **Trato** (cómo fue el trato de las personas). El Agente aporta la evidencia de cada eje. | `ReferralQualification{ease, business, treatment}` |
| **Contraste** | Auditoría de NS: comparación entre el Veredicto declarado y la evidencia recogida por los agentes. | `Audit` |
| **Mérito** | Unidad de reputación verificable. Nace en tres momentos: Mérito de Promesa (al aceptarse la Cesión), Mérito de Veredicto (al valorarla el cesionario) y Mérito de Cierre (al contrastarse el valor). Nunca de cantidad. | `TrustEvent.weight` |
| **Hoja de Méritos** | Panel público (dentro de la red) de comportamientos verificables de una empresa: cesiones, calidad media, valor contrastado, tiempo de respuesta, fiabilidad como cesionario. Nunca un número opaco. | `ReputationProfile` |
| **Distinción** | Reconocimiento que el cesionario otorga al cedente por una Cesión concreta, nombrando el eje que destacó (Facilidad, Negocio o Trato) y una línea de motivo. Escasa: máximo una por titular y mes. Se publica en la Crónica y alimenta el Mérito. De entre las Distinciones del mes sale la **Cesión del mes** de la Sala. | `Recognition{axis, reason}` |
| **Compromiso** | Mínimo de Cesiones válidas que toda empresa debe ceder: al menos una por semana, sin excusas (D-010, D-042). Con una se cumple; para destacar, varias y a varias especialidades. | `ContributionWeek` |
| **Prueba de Valor** | Siete días de Agente para un candidato antes de la plaza. Informe público por enlace con dos caras: lo que su Agente habría cedido y lo que la Sala ya encontró para su especialidad, en agregado (D-050). La empresa en prueba no tiene plaza, voto ni acceso y nunca recibe Cesiones. | `ValueTrial`, `Company{status: TRIAL}` |
| **Para los demás** | Norma y principio: nadie en NS busca para sí; el negocio propio no entra, solo lo que se cede (D-049). | Norma `PARA_LOS_DEMAS` |
| **Valoración** | Porcentaje mensual y explicable de cada titular en su Sala: calidad de lo cedido (Veredictos), Compromiso, plazo de respuesta, Comunicado y servicio a la red. Nunca mide cantidad. Con ≥ 80 % en el último mes completo, apta para Embajada y candidata a Director/a de Sala (D-046). | `MonthlyRating` |
| **Director/a de Sala** | Quien dirige la Sala: despacha la Antesala, propone bajas a NS, promueve acciones entre Salas y resuelve dudas entre Timoneles, lo que le suma Valoración (D-048). Candidata: ≥ 80 % de Valoración un mes. Elección y mandato pendientes. Sustituye al provisional "Directiva". | `Member{ is_director }` |
| **Titularidad** | Cada plaza ocupada por una empresa en una Sala. Una empresa con varios CNAE puede tener varias titularidades en la misma Sala, cada una con su Compromiso; NS premia repartirlas por Salas distintas con **Mérito de Red** (D-047). | `CategorySeat`, `TrustEvent{NETWORK_SEAT_BONUS}` |
| **Plazo de respuesta** | Las 48 h que tiene el cesionario para responder al Interesado tras el Puente (D-024). Antes se llamaba "compromiso de 48 h"; "Compromiso" queda solo para el mínimo semanal (D-045). | `TrustEvent{RESPONSE_ON_TIME | RESPONSE_LATE}` |
| **Escalera** | Consecuencias de las semanas seguidas sin una sola Cesión válida: 1.ª constancia, 2.ª **Aviso diplomático** del Agente, 3.ª **Aviso formal** de la Directiva, 4.ª **Baja** de la titularidad en esa Sala: la empresa sale de la Mesa y pierde el acceso, la plaza queda bloqueada, la Directiva propone la baja y NS la confirma; entonces la plaza vuelve a la Antesala (D-042, D-044). Una Cesión válida pone la cuenta a cero. | `ContributionWeek{ missed_streak, action }` |
| **Ejercicio** | Periodo de cómputo de la Promesa, la cuota por Tramos y la Embajada (por estipular: mes o trimestre). El Compromiso se mide por semana. | `Period` |
| **Niveles** | Miembro · Contribuidor · Referente · Consejero · Fundador. Se ganan con Mérito; amplían acceso, nunca lo restringen. ("Embajador" queda reservado a la Embajada.) | `MembershipTier` |
| **Arbitraje** | Resolución de disputas entre cedente y cesionario por la Directiva. | `Dispute` |
| **Cuota** | El precio de la suscripción a NS: lo que paga una empresa a NS por su plaza y su Agente. Coste inicial (por decidir si existe) y cuota mensual por Tramos. Son los ingresos de NS. Es un plano distinto de la regla entre miembros: nunca es un porcentaje del negocio ni un cargo por Cesión (D-005, D-025). | `MembershipPlan` |
| **Tramo** | Nivel de cuota mensual. Se entra en el Tramo de entrada y se sube solo cuando el valor contrastado recibido en el Ejercicio anterior supera el umbral del Tramo; también se baja. Importes fijos y públicos; el Tramo de cada empresa es privado. Cada Tramo lleva un presupuesto de actividad del Agente que cubre con creces su coste (D-025). | `FeeTier` |

## 4. Los agentes y el día a día

| Término NS | Qué es | Identificador técnico |
| --- | --- | --- |
| **Agente NS** | El agente empresarial de cada miembro. Representa, prospecta, cualifica, prepara, persigue. | `CompanyAgent` |
| **ADN de Empresa** | El conocimiento estructurado que entrena al Agente (Business DNA). | `BusinessDNA` |
| **Mesa Permanente** | La reunión 24/7 de los agentes de una Sala. Lo que en la app se ve como cronología de eventos significativos. | `AgentRoom` |
| **Despacho** | Sesión breve y periódica del miembro con su Agente: tres cosas ya preparadas, decisiones de 30 segundos. | `AgentCheckIn` |
| **Encargo** | Lo que una empresa busca ahora (texto, señal, industria, vigencia). Visible en la Sala; los Agentes priorizan las Pistas que responden a un Encargo abierto y lo dicen en el Fundamento (D-032). | `Demand` |
| **Entrevista** | Conversación del Agente con su Timonel para construir o ampliar el ADN de Empresa: diez preguntas, respuestas en lenguaje natural, ADN a la vista y validación humana al final (D-040). | `DnaInterview` |
| **Apunte** | Lo que el Timonel anota en treinta segundos, en la calle, sobre un posible referido: quién, qué necesita, relación y contacto. Entra en la memoria de su Agente como Indicio en borrador; nunca se publica solo (D-037). | `FieldNote` |
| **Fuente propia** | Dirección (RSS o Atom) que un Timonel añade a su Agente para que la lea cada mañana en la Ronda, además de las fuentes públicas de NS (D-038). | `AgentSource` |
| **Ronda** | La pasada de cada mañana de los Agentes, para todas las Salas: Reloj de la Sala y Rastreo, con un resumen en la Mesa Permanente. Ocurre sola, sin que nadie abra la aplicación (D-036). | `DailyRun` |
| **Latido** | Solo en la Sala de demostración: cada franja del día (9:00, 13:00, 18:00) un Agente ficticio lleva un Indicio a la Mesa y las Cesiones entre empresas ficticias avanzan con plazos realistas. Nunca decide por la empresa protagonista ni por una empresa dada de alta por el fundador; apagado con cuentas reales (D-057). | `DemoHeartbeat` |
| **Rastreo** | Prospección del Agente en fuentes públicas (BORME, licitaciones, licencias de obra, empleo, prensa local) para generar Indicios en borrador para otros titulares. El Timonel decide si los publica (D-031). | `PublicProspecting` |
| **Interesado avisado** | Hecho que distingue una Cesión de verdad: el Interesado sabe que le van a llamar. Va en la capa 0, lo detecta el Agente, lo confirma el cedente y pesa en la Promesa y en el Encaje (D-029). | `third_party_expects_contact` |
| **Reloj de la Sala** | Mecanismo que ejecuta los plazos: recuerda a las 72 h, caduca a los 7 días, marca la respuesta tardía a las 48 h del Puente y pregunta cada 14 días. El empujón lo recibe el Timonel, nunca el Interesado (D-030). | `ChapterClock` |
| **Sondeo** | Pregunta discreta al grafo de relaciones de la Sala: "¿alguien tiene relación con la dirección financiera de Z?". Nadie ve contactos hasta que su dueño da el visto bueno. | `RelationshipProbe` |
| **Hoy** | Pantalla de inicio del miembro: qué ha hecho la red por su empresa desde la última vez. | `TodayView` |
| **Parte** | Informe ejecutivo de la Directiva y del Consejo de Zona: indicios, pistas, cesiones, compromiso, antesala, saturación. | `ExecutiveBriefing` |
| **Crónica** | Muro de la Sala con hechos contrastados: cierres, distinciones, incorporaciones. Nada se publica sin confirmación de ambas partes. | `ChapterFeed` |
| **Carta de Presentación** | Página que ve el tercero cuando recibe un Puente: quién lo recomienda, por qué, agenda en un clic, opción de valorar. | `IntroLandingPage` |
| **NS Radar** | Visualización icónica de Indicios, Pistas y Cesiones de la Sala y de la zona. Nunca sobre un mapa. | `Radar` |

## 4bis. Protocolo II · Dar a Conocer

| Término NS | Qué es | Identificador técnico |
| --- | --- | --- |
| **Comunicado** | Informe semanal estructurado que el Agente de una empresa envía a los Agentes de la Sala: lo estable (qué hace) y el delta (qué ha cambiado esta semana). El Timonel lo aprueba en el Despacho. | `Communique` |
| **Comunicado de continuidad** | El que envía el Agente cuando el Timonel no aprueba a tiempo: solo lo estable ya validado, sin nuevas afirmaciones. | `Communique{ approved_by: CONTINUITY }` |
| **Gaceta** | Digesto semanal de la Sala compilado por el Chapter Intelligence Agent a partir de los Comunicados, con vista general y "relevante para ti" por Timonel. En el Pleno sustituye la ronda de presentaciones. | `ChapterGazette` |
| **Dossier** | Ficha viva de cada miembro: qué hace, a quién sirve, Cesión perfecta, capacidad ahora, Encargos, cómo presentarla, Hoja de Méritos, histórico de Comunicados. Dos toques desde cualquier pantalla. | `MemberDossier` |
| **Conocimiento mutuo** | Métrica de salud de la Sala: proporción de Timoneles que consultan la Gaceta o un Dossier cada semana. | `MutualKnowledgeRate` |

## 4ter. Protocolo III · Cuentas Claras

| Término NS | Qué es | Identificador técnico |
| --- | --- | --- |
| **Balanza** | Panel público en la Sala con lo que cada titular ha dado y recibido: Cesiones hechas y recibidas, valor contrastado generado y recibido, del mes y acumulado, y estado frente al Ritmo. Ordenada por plaza, nunca un ranking. | `MemberBalance` |
| **Balanza de Sala** | Agregado de la Sala: Cesiones y valor contrastado del mes y acumulado, Distinciones, mejor semana. | `ChapterBalance` |
| **Ritmo** | Objetivo semanal de Cesiones válidas fijado por la Sala o, en su defecto, por NS. Estados: En Ritmo · Por encima · Por debajo. | `WeeklyPace` |
| **Brújula** | Cuadro privado del titular: si consigue sus objetivos, por qué, qué gana, qué ofrecer, qué proponer y qué referidos posibles tiene para ceder. Solo lo ven el titular y su Agente. | `MemberCompass` |
| **Movimiento** | Acción concreta que la Brújula propone para la semana (ceder, ofrecer, proponer, sondear, Embajada). Tres por semana; cinco si el titular va Por debajo. Un toque para ejecutar. | `CompassMove` |

Alternativas consideradas para Tramo: "Escalón" y "Nivel de cuota" (descartado "Nivel" por colisión con los Niveles de membresía). Alternativas consideradas: para el protocolo, "Rendir Cuentas" y "Transparencia"; para Balanza, "Tablón" y "Cuadro"; para Brújula, "Bitácora" y "Plan". Se recomienda Cuentas Claras · Balanza · Brújula · Ritmo · Movimiento por sobriedad, literalidad y contraste entre lo público (pesar) y lo privado (orientar).

## 5. Protocolos y clasificaciones

| Término | Qué es |
| --- | --- |
| **Protocolo I · Generar Negocio** | Deber de ceder referidos de calidad. Unidad: la Cesión. Especificación técnica: NS-ARP. |
| **Protocolo II · Dar a Conocer** | Deber de comunicar el trabajo propio a la Sala cada semana. Unidad: el Comunicado. Especificación técnica: NS-ADP. |
| **Protocolo III · Cuentas Claras** | Deber de NS de hacer visible en la Sala el valor dado y recibido por cada titular. Unidad: la Balanza. Especificación técnica: NS-ATP. |
| **NS-ARP** | NS Agentic Referral Protocol: cómo los agentes descubren, comparten, cualifican, puntúan, autorizan y trazan Cesiones. |
| **NS-ADP** | NS Agentic Disclosure Protocol: cómo los agentes redactan, filtran, envían, acusan y compilan Comunicados, Gaceta y Dossier. |
| **NS-ATP** | NS Agentic Transparency Protocol: cómo se calculan, contrastan y publican la Balanza y el Ritmo, y cómo el Agente genera la Brújula y sus Movimientos. |
| **NS-CAT** | Clasificación NS de Actividades: base CNAE + Especialidad NS, ampliable y versionada. |
| **Especialidad** | Nivel de NS-CAT que otorga plaza. |
| **Normas NS** | Texto único y versionado que toda empresa acepta de forma expresa, norma a norma, al ocupar su plaza: las cinco reglas inmutables y la condición de la cuota por Tramos. Sin aceptación no hay alta (D-043). | `RulesAcceptance{ rules_version }` |
| **Reglas inmutables** | Nunca se cobra por una Cesión (expulsión); Compromiso obligatorio de una Cesión válida por semana con Escalera de cuatro semanas (D-010, D-042); calidad sobre cantidad; Comunicado semanal (D-018); Balanza pública (D-019). |

---

## 5bis. Quién hace qué en una Cesión (definición confirmada por el fundador)

```text
1. Un miembro conoce a un Interesado (empresa, persona, asociación…) que busca un producto o servicio de confianza.
   Lo cuenta a su Agente en el Despacho, o su Agente lo detecta en un Rastreo o en un Sondeo.
2. El Agente del miembro lo estructura como Indicio y lo lleva a la Mesa Permanente de la Sala.
3. La Mesa identifica la plaza (o plazas) de la Sala que cubre la necesidad y formula la Pista con su Fundamento.
   Si la plaza está vacante: Embajada.
4. El Agente del titular cualifica; Compliance emite Salvoconducto.
5. Vistos buenos: el cedente autoriza la Apertura; el titular acepta.
6. El cedente tiende el Puente al Interesado. Desde aquí es una Cesión en curso.
7. El titular emite Veredicto por hitos; NS hace Contraste; el cedente suma Mérito y cumple Compromiso.
```

El Agente del cedente no "vende" el referido: lo estructura, lo protege y lo propone. El Agente del titular no "compra": cualifica y prepara. Las personas deciden en los pasos 5 y 6.

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

## 6bis. Por qué "Timonel" (D-027)

El fundador quería una palabra cercana, no un cargo administrativo. Se descartaron "Portavoz" (administrativo), "Personia" y "Personero" (colisión de marca y registro), "Manitas" (describe a quien ejecuta, no a quien decide, y suena a bricolaje), "Copiloto" (hoy significa la IA y coloca al humano como ayudante de la máquina) y "Piloto" (choca con "el piloto de NS Sevilla" como fase de lanzamiento). "Timonel" cuenta la relación en una imagen: el Agente rema y vigila el horizonte 24/7; el Timonel decide el rumbo. Hace familia con **Brújula** (lo que el Agente le muestra para orientarse) y **Puente** (desde donde se manda un barco). Principio que fija el fundador: **la persona debe sentir siempre que es quien dirige**. El nombre no es una cortesía: es la descripción exacta de las puertas humanas de NS-ARP.

## 6ter. Por qué "Embajada"

El fundador descartó "Extramuros" por agresivo. "Embajada" describe el acto con exactitud diplomática: la Sala del cedente envía una cesión a otra Sala, y la empresa que la acoge queda acreditada como **Embajadora** de esa especialidad en la Sala que no la tiene. Es sobria, cálida, castellana y sin pista territorial. Para evitar colisión, el antiguo nivel de membresía "Embajador" pasa a llamarse "Consejero".

## 7. Palabras que NS no usa

"Lead", "referencia" (en sentido de referido), "capítulo", "grupo", "networking" como sustantivo del producto, "sinergia", "match" en la interfaz, "ranking", "puntos". Y ninguna expresión, lema o formato protegido de otras organizaciones de networking.
