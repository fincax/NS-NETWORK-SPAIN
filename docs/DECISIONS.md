# NS Network Spain · Registro de decisiones

Este documento evita que las decisiones estructurales desaparezcan dentro de conversaciones. Cada entrada sigue el formato: Decision · Date · Context · Options · Choice · Why · Consequences · Revisit when.

**Estado de cada decisión:**

- `PROPOSED` — opción recomendada por defecto por el equipo fundador (Claude). Se diseña y se construye sobre ella, pero el fundador humano puede revocarla sin coste antes del cierre de la Fase 0.
- `CONFIRMED` — ratificada expresamente por el fundador.
- `SUPERSEDED` — reemplazada por otra decisión (se indica cuál).

**Terminología (D-013).** La unidad fundamental de NS se denomina **Sala**. Las decisiones anteriores a D-013 usan "círculo" o "grupo" con el mismo significado; no se reescriben para conservar el histórico. En el protocolo y el código el identificador técnico sigue siendo `Chapter` / `chapter_id` / visibilidad `CHAPTER`.

Las siete primeras decisiones (D-001 a D-007) responden a las preguntas estratégicas abiertas al cerrar la v0.1 de la constitución. Todas se registran como `PROPOSED` con la opción recomendada, para desbloquear el diseño del protocolo NS-ARP.

---

## D-001 · La plaza de exclusividad corresponde a una especialidad, no a un sector amplio

**Status:** PROPOSED
**Date:** 2026-09-11

**Context.** La exclusividad de categoría es a la vez regla operativa y argumento comercial. Si la plaza es demasiado amplia ("Marketing"), un solo miembro monopoliza decenas de necesidades que no cubre realmente y el círculo pierde capacidad de respuesta. Si es demasiado estrecha, el círculo se llena de empresas que compiten entre sí y la confianza se rompe.

**Options.**

1. Plaza por sector amplio (Marketing, Legal, Construcción).
2. Plaza por especialidad concreta (Paid Media B2B, Derecho laboral, Reformas de oficinas).
3. Plaza por especialidad con taxonomía de dos niveles y detección de solapamiento.

**Choice.** Opción 3. La **Category Seat** se define a nivel de **especialidad** dentro de una taxonomía de dos niveles `Sector → Specialty`. Cada empresa ocupa exactamente **una** plaza principal por círculo. Puede declarar **capabilities secundarias** en su Business DNA, pero éstas no otorgan exclusividad.

Reglas derivadas:

- Cada `Specialty` tiene una lista de `overlaps_with` (especialidades con las que el conflicto competitivo es probable). Al solicitar plaza, el sistema calcula el solapamiento con las plazas ocupadas y lo clasifica como `NONE`, `ADJACENT` o `CONFLICT`.
- `ADJACENT` requiere revisión de la Directiva antes de la admisión. `CONFLICT` bloquea la admisión en ese círculo y ofrece: otro círculo de la ciudad, lista de espera, o rechazo.
- En el matching, si una necesidad encaja con la plaza principal de un miembro y con la capability secundaria de otro, el titular de la plaza tiene **prioridad de referral**. El segundo solo recibe la oportunidad si el titular la declina, no responde en el plazo configurado, o el titular la cede expresamente.
- La taxonomía es configurable por país y evoluciona; la Directiva puede dividir una plaza cuando un sector se vuelve demasiado amplio para el círculo (por ejemplo, "Marketing" → "Paid Media", "Branding", "SEO/Contenido").

**Why.** La especialidad maximiza el número de plazas útiles por círculo (más densidad, más señales cubiertas) y a la vez preserva la promesa central: "en mi círculo nadie compite conmigo". La taxonomía de dos niveles permite comunicar en la web pública con lenguaje sencillo ("Comprobar disponibilidad de mi sector") y aplicar precisión operativa por dentro.

**Consequences.** Se necesita un modelo `Sector`, `Specialty`, `CategorySeat` y una matriz de solapamiento desde el MVP. El onboarding debe ayudar a la empresa a elegir su especialidad principal y advertir de conflictos antes de enviar la solicitud. La web pública debe mostrar disponibilidad a nivel de especialidad.

**Revisit when.** Un círculo alcance más de 35 plazas ocupadas, o cuando más del 20% de las solicitudes se clasifiquen como `ADJACENT`.

---

## D-002 · Fuentes de datos del agente: Business DNA + información introducida expresamente en el MVP; el modelo de permisos se diseña ahora, las integraciones después

**Status:** PROPOSED
**Date:** 2026-09-11

**Context.** El agente será tan inteligente como la información de la que disponga. Correo, CRM, calendario y ERP contienen las señales más ricas, pero también los mayores riesgos de privacidad, y su integración añade semanas de ingeniería antes de poder demostrar la tesis del MVP.

**Options.**

1. Solo Business DNA + señales introducidas manualmente.
2. Business DNA + integraciones desde el día uno (Gmail/Outlook, CRM, calendario, ERP).
3. Business DNA + información expresa en el MVP, con el modelo de `DataSource` y el sistema de permisos diseñados y persistidos desde el inicio; integraciones en lectura a partir de la Fase 2.

**Choice.** Opción 3.

En el MVP el agente se alimenta de:

- Business DNA (entrevista de onboarding + ingestión del sitio web público);
- señales introducidas expresamente por el miembro (texto libre, nota de voz transcrita, formulario rápido "He sabido que…");
- señales que el propio agente pregunta al miembro en su check-in semanal;
- información pública verificable (web, registros públicos) cuando el miembro lo autoriza.

Desde el día uno se persisten las entidades `DataSource` y `Permission` con los verbos `READ · INFER · STORE · SHARE · REVEAL_IDENTITY · CONTACT · WRITE · EXECUTE`. Las integraciones reales (calendario y correo en modo `READ + INFER`, sin `SHARE`) se activan en la Fase 2 sobre ese modelo, sin rediseño.

**Why.** El MVP debe demostrar calidad de referral, no amplitud de integración. Un miembro que introduce tres señales buenas a la semana ya produce suficiente materia prima para un círculo de 25 empresas. Diseñar los permisos ahora evita la deuda más peligrosa del producto: un agente que sabe cosas que no debería poder usar.

**Consequences.** El producto necesita una entrada de señal extraordinariamente fácil (móvil, 30 segundos). El agente debe ser proactivo al preguntar. El check-in semanal se convierte en un ritual de producto.

**Revisit when.** El círculo piloto tenga 3 meses de actividad y podamos medir cuántas señales cualificadas por miembro y semana genera la entrada manual.

---

## D-003 · Aprobación de referrals: el empresario aprueba por defecto; la Directiva interviene solo por excepción definida

**Status:** PROPOSED
**Date:** 2026-09-11

**Context.** Cada match excelente requiere que alguien humano autorice revelar identidades e iniciar la introducción. Si la Directiva revisa todo, se convierte en cuello de botella y contradice la promesa 24/7. Si nadie supervisa, un miembro nuevo o un sector regulado puede generar un incidente reputacional.

**Options.**

1. Aprobación exclusiva del empresario (doble consentimiento: originador y receptor).
2. Toda introducción pasa por Directiva.
3. Doble consentimiento del empresario por defecto + puerta de Directiva por excepción.

**Choice.** Opción 3.

Aprobación estándar (doble consentimiento):

- el **miembro originador** autoriza revelar la identidad del tercero y el contexto de la señal;
- el **miembro receptor** acepta el referral y confirma interés y capacidad.

La Directiva revisa únicamente cuando el Trust & Compliance Agent marca al menos una excepción:

- conflicto de plaza o solapamiento `ADJACENT`;
- sector regulado o restricción deontológica detectada (por ejemplo, prohibición de comisiones o de captación);
- datos personales de terceros no cubiertos por la base jurídica declarada;
- valor estimado por encima del umbral del círculo (configurable; por defecto 100.000 €);
- miembro en periodo de prueba (sus primeros 3 referrals emitidos y recibidos);
- disputa abierta entre las partes;
- confianza del match baja pero el originador insiste en introducir.

**Why.** Sitúa la aprobación humana exactamente donde genera valor. El empresario es quien conoce al cliente y asume el riesgo reputacional de la introducción; la Directiva aporta valor en las situaciones de conflicto, no en el flujo ordinario.

**Consequences.** El estado conceptual `HUMAN_REVIEW` del ciclo de vida se concreta en el protocolo como `MEMBER_REVIEW` con los subestados `ORIGINATOR_PENDING`, `RECEIVER_PENDING` y `DIRECTOR_PENDING` (este último solo con excepciones). Las excepciones deben ser visibles y explicables en la referral card ("Este referral requiere revisión de la Directiva porque…").

**Revisit when.** Se produzca el primer incidente reputacional, o cuando la tasa de intervención de la Directiva supere el 15% de los referrals.

---

## D-004 · Selección: admisión real con criterios objetivos mínimos + evaluación individual

**Status:** PROPOSED
**Date:** 2026-09-11

**Context.** NS promete "una red de confianza, no una red abierta". Sin criterios explícitos la selección se percibe como arbitraria; con criterios excesivamente rígidos se excluyen empresas valiosas.

**Options.**

1. Solo evaluación individual discrecional.
2. Criterios objetivos duros (facturación mínima, años, referencias) sin discrecionalidad.
3. Umbrales objetivos mínimos configurables por país/círculo + rúbrica de evaluación individual + entrevista.

**Choice.** Opción 3.

Umbrales mínimos por defecto para España (configurables):

- existencia legal verificable y actividad ininterrumpida ≥ 2 años;
- sin procedimiento concursal en curso ni deudas públicas certificadas;
- al menos 1 referencia empresarial contrastable (cliente o proveedor);
- una persona con capacidad de decisión comercial designada como Member principal;
- especialidad disponible o `ADJACENT` en el círculo solicitado.

Rúbrica de evaluación individual (puntuación 1–5 por eje, revisada por la Directiva):

- reputación y credibilidad;
- capacidad real de aportar señales y referrals (red de clientes, contactos, sector);
- complementariedad con el círculo;
- compromiso con la reciprocidad;
- calidad del Business DNA producido en la entrevista.

La facturación mínima **no** es criterio duro en el MVP; se registra como dato para calibrar el círculo.

**Why.** Los umbrales objetivos hacen la selección defendible y comunicable. La rúbrica protege la calidad relacional, que es lo que realmente sostiene la confianza del círculo.

**Consequences.** Se necesita un flujo de `Application` con estados, checklist de verificación, rúbrica y decisión motivada. El rechazo debe ser cortés y ofrecer lista de espera cuando proceda.

**Revisit when.** Se abra el segundo círculo de Sevilla o la primera ciudad adicional.

---

## D-005 · Modelo económico: cuota de incorporación + membresía anual con Agente NS incluido; sin porcentaje sobre negocio

**Status:** PROPOSED
**Date:** 2026-09-11

**Context.** Cobrar un porcentaje sobre cada negocio alinearía ingresos con valor, pero introduce fricción en la trazabilidad, riesgos legales/deontológicos en sectores regulados y desconfianza sobre los incentivos del sistema.

**Options.**

1. Joining fee + membresía anual, Agente incluido, sin success fee.
2. Membresía + comisión por negocio cerrado.
3. Solo comisión.

**Choice.** Opción 1. Cuota de incorporación + membresía anual (con opción de pago mensual) + NS Business Agent incluido. Sin comisión sobre referrals ni negocio cerrado.

La arquitectura conserva la capacidad de soportar en el futuro: niveles de membresía; servicios premium; conexiones internacionales; integraciones enterprise; capacidades avanzadas del agente. Estas extensiones se modelan como `MembershipPlan` y `Entitlement`, no como reglas fijas.

**Why.** Coincide con la visión fundacional. Un modelo de cuota protege la neutralidad del agente (no está incentivado a inflar valor), simplifica la contabilidad del miembro y evita restricciones legales en sectores profesionales.

**Consequences.** El valor generado (`Verified closed value`) se registra para reputación y métricas, no para facturación. La propuesta de valor comercial se apoya en ROI demostrable: valor verificado / cuota anual.

**Revisit when.** Se disponga de 12 meses de datos de valor verificado en NS Sevilla.

**Precisado por D-025 (2026-09-13).** La membresía no es plana: se estructura en Tramos ligados al valor contrastado recibido. Sigue sin existir porcentaje sobre negocio ni cargo por Cesión: la cuota es el precio de la suscripción a NS, no una contrapartida por referidos. La cuota de incorporación queda pendiente de decidir (existe o no).

---

## D-006 · Tamaño del círculo: objetivo 25–35 plazas activas; lanzamiento con 12–15 fundadoras; máximo 40

**Status:** PROPOSED
**Date:** 2026-09-11

**Context.** Un círculo pequeño no genera suficientes señales ni cubre suficientes necesidades. Un círculo grande diluye la confianza, multiplica los conflictos de plaza y hace inviable que la Directiva conozca a cada miembro.

**Options.**

1. 20–30 empresas.
2. 30–50 empresas.
3. Más de 50.

**Choice.** Objetivo operativo de **25–35 plazas activas**, con **lanzamiento a partir de 12–15 empresas fundadoras** y **tope de 40** por círculo. Al superar 35, la Directiva planifica el segundo círculo de la ciudad.

**Why.** Con 25–35 especialidades bien elegidas, una señal típica ("nueva sede", "expansión", "cambio de dirección financiera") encuentra 3–6 miembros relevantes, suficiente para que el matching sea útil sin generar ruido. Un umbral de arranque de 12–15 permite demostrar la tesis del MVP sin esperar a llenar el círculo.

**Consequences.** La selección de las 12–15 fundadoras debe optimizar cobertura de las señales más frecuentes en el tejido empresarial sevillano (construcción/reforma, legal, fiscal, seguros, IT/ciberseguridad, marketing, RR.HH., financiación, inmobiliario, consultoría). Los datos demo de NS Sevilla deben reflejar este tamaño.

**Revisit when.** El primer círculo alcance 30 miembros activos y podamos medir ratio señales/matches útiles.

---

## D-007 · Marca: institucional-premium, "el club empresarial del futuro"; la tecnología se percibe por comportamiento, no por estética futurista

**Status:** PROPOSED
**Date:** 2026-09-11

**Context.** El público objetivo son propietarios y directivos de empresas consolidadas. Una identidad radical/futurista puede resultar atractiva en demos pero reduce la sensación de prestigio, solvencia y seriedad que sostiene la admisión selectiva y la cuota.

**Options.**

1. Institucional-premium, muy seria, con inteligencia tecnológica expresada mediante producto y datos.
2. Radical/futurista/tecnológica.
3. Híbrido con estética tech dominante.

**Choice.** Opción 1. NS se presenta como un **club empresarial de nueva generación**: sobrio, editorial, europeo, con foundation cromática obsidian/porcelain/deep institutional blue y acentos signal green y opportunity amber. La sensación de "IA" surge de NS Radar, el Agent Room, las explicaciones de cada match y la velocidad del producto; nunca de degradados, glassmorphism o iconografía de robots.

**Why.** Coherente con la constitución (secciones 20–21) y con el perfil psicológico del miembro. La confianza se compra con sobriedad; la sorpresa se entrega con comportamiento inteligente.

**Consequences.** El design system prioriza tipografía editorial, espacios generosos, visualización de datos exquisita y animación contenida. La web pública puede ser cinematográfica; la app privada, rápida y densa en información útil.

**Revisit when.** Se realicen las primeras pruebas de percepción de marca con 5–8 empresarios sevillanos.

---

## D-008 · El protocolo NS-ARP se especifica antes de construir pantallas

**Status:** PROPOSED
**Date:** 2026-09-11

**Context.** El moat de NS es Business DNA acumulado + NS-ARP + Referral Graph + histórico de conversión + reputación + densidad + exclusividad. Construir UI antes que protocolo produce un SaaS más; construir el protocolo primero produce una categoría.

**Choice.** `docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md` es el segundo documento fundacional. Toda implementación de agentes, matching, estados y permisos debe referirse a él. Cada cambio de protocolo incrementa su versión y se registra aquí.

**Consequences.** El primer vertical slice implementa NS-ARP v0.1 de extremo a extremo con datos demo de NS Sevilla.

**Revisit when.** Se complete el primer vertical slice y existan aprendizajes reales del matching.

---

## D-009 · Espíritu del core: agentes que ejecutan, reparto ilimitado de referidos, calidad cualificada por el receptor y auditada por NS, reconocimiento escalable

**Status:** CONFIRMED (input directo del fundador)
**Date:** 2026-09-11

**Context.** El fundador ha fijado tres claves del espíritu de NS que precisan la constitución: (1) los agentes de IA realizan todo el trabajo de control, seguimiento, producción y desarrollo de los contactos facilitados por las empresas, e incluso prospectan y proponen referidos para su empresa; (2) no existe límite en el reparto de referidos (empresas o personas que necesitan a otra empresa), y cuanto mayor sea la cantidad y la calidad tangible, mayor reconocimiento; (3) tras entregar un referido, la App realiza seguimiento de su calidad, la empresa receptora cualifica la calidad final, NS puede auditarla, y la empresa que lo refirió recibe puntuación proporcional a esa calidad.

**Choice.** Se adopta este espíritu como marco del núcleo del producto: fusión de lo mejor del networking estructurado (confianza, reciprocidad, exclusividad) con un entorno agentic potente y un sistema de cualificación y reconocimiento escalable.

Reglas derivadas:

- El agente no es un asistente pasivo: prospecta, cualifica, prepara, persigue y cierra el bucle de cada referido. El miembro decide y aporta relación.
- No hay cuota máxima de referidos. La reputación crece sin techo, pero **solo** con calidad verificada por el receptor y auditada por NS. Un referido mal cualificado no suma y puede restar.
- Todo referido termina en una cualificación estructurada del receptor (rúbrica estándar) más evidencia recogida por los agentes. NS audita la coherencia entre lo declarado y la evidencia.
- La reputación es bilateral: se mide a quien da (calidad del referido) y a quien recibe (atención, tiempo de respuesta, honestidad al reportar).
- El reconocimiento es escalable en niveles con privilegios de acceso, nunca un ranking de cantidad.

**Why.** Sitúa el trabajo en los agentes y la decisión en las personas; convierte la generosidad en un activo verificable; hace que el efecto red crezca con cada referido bien dado.

**Consequences.** NS-ARP v0.2 debe incorporar: `ReferralQualification` (rúbrica del receptor), reputación bilateral en `TrustEvent`, índice de coherencia del evaluador, y fuentes de señal de prospección (`SignalSource`). El banco de ideas derivado vive en `docs/11_IDEAS_DISRUPTIVAS.md`. Se mantiene D-005: la puntuación nunca se convierte en comisión.

**Revisit when.** Se disponga de los primeros 50 referidos cualificados en NS Sevilla.

---

## D-010 · Reglas inmutables: nunca se cobra por un referido (expulsión); aportación mínima obligatoria de referidos por periodo; calidad por encima de cantidad

**Status:** CONFIRMED (input directo del fundador)
**Date:** 2026-09-11

**Context.** El fundador ha marcado a fuego tres ideas que no admiten revisión y que definen el espíritu de NS como network colaborativo, no como mercado de leads.

**Choice.**

1. **Prohibición absoluta de cobrar por un referido.** Ningún miembro puede pedir, ofrecer, aceptar o condicionar un referido a dinero, comisión, descuento, contraprestación o favor. NS tampoco cobra por referido (coherente con D-005). Es **motivo de expulsión** del círculo y de la red.
2. **Aportación mínima obligatoria.** Toda empresa debe aportar un número mínimo de referidos en los plazos que se estipulen. Pertenecer a NS es contribuir. Los parámetros (número, periodo, escalera de consecuencias) se fijan por círculo; los valores concretos quedan **pendientes de estipulación por el fundador** y se registrarán como decisión propia.
3. **Calidad por encima de cantidad.** Solo cuenta para el mínimo y para la reputación el referido que el receptor cualifica como válido y NS puede auditar. Un referido flojo no cumple y puede restar.

Reglas derivadas:

- No existe ningún campo de retribución, comisión o contraprestación en ningún objeto de NS-ARP. El Trust & Compliance Agent produce `FAIL` y emite `REFERRAL_FEE_VIOLATION` ante cualquier indicio; la Directiva instruye el expediente de expulsión. Existe un canal confidencial de denuncia.
- Las relaciones comerciales ordinarias entre miembros (cliente/proveedor) son legítimas. Lo prohibido es condicionar el referido.
- Se introduce el objeto `ContributionQuota` por círculo y periodo. El agente de cada empresa muestra el estado en "Hoy", propone candidatos concretos y avisa con antelación. Escalera de consecuencias propuesta: aviso del agente → conversación con la Directiva → plan de contribución de un periodo → plaza en revisión → baja.
- `TrustEvent` incorpora `CONTRIBUTION_QUOTA_MET` y `CONTRIBUTION_QUOTA_MISSED`.
- Estas reglas se comunican en la web pública, en la solicitud de plaza y en el onboarding. El solicitante las acepta expresamente antes de la admisión.

**Why.** La gratuidad del referido protege la confianza y la neutralidad del sistema. La aportación mínima garantiza que cada plaza produce valor para el círculo y que nadie ocupa una especialidad sin contribuir. La primacía de la calidad evita que el mínimo degenere en relleno.

**Consequences.** `CLAUDE.md` y `00_NORTH_STAR.md` incorporan una sección "Reglas inmutables". NS-ARP v0.2 añade la comprobación 10 de Compliance, los nuevos `TrustEvent` y el objeto `ContributionQuota`. La solicitud de membresía y el onboarding incluyen aceptación expresa. El banco de ideas (`11_IDEAS_DISRUPTIVAS.md`) reformula el pilar 2 como "con suelo, sin techo".

**Revisit when.** Nunca en cuanto a las tres reglas. Los parámetros de la cuota (número, periodo, consecuencias) quedaron fijados por el fundador en **D-042** (2026-09-14): mínimo de 1 Cesión válida por semana y escalera de cuatro semanas hasta la baja.

**Aclaración del fundador (2026-09-11).** Los referidos NS son ajenos a la circulación de negocio ordinaria entre empresas miembro. Que dos miembros se contraten entre sí no es un referido ni está sujeto a estas reglas; lo prohibido es condicionar un referido a cualquier contraprestación.

---

## D-011 · La exclusividad se define como Especialidad × Celda territorial; el círculo es la unidad de comunidad, no de exclusividad

**Status:** SUPERSEDED por D-013 (el fundador prefiere el modelo de Sala; la exclusividad vuelve a la Sala). Se conserva como registro. Las ideas reutilizables (prueba del referido, casuística de sectores, profundidad de mercado como criterio de saturación) se han trasladado a `docs/12_SALAS.md`.

**Status original:** PROPOSED
**Date:** 2026-09-11

**Context.** El fundador fija que en cada territorio marcado, por pequeño o grande que sea, solo puede haber una empresa por sector, y que el objetivo es que entre un número abundante de buenas empresas. D-001 situaba la exclusividad en el círculo (herencia del modelo de capítulo presencial). Con agentes 24/7 la sala deja de ser un límite y la unidad natural de exclusividad pasa a ser el mapa. Especificación completa en `docs/12_TERRITORIALIDAD.md`.

**Options.**

1. Mantener exclusividad por círculo (una plaza por especialidad y círculo, varios círculos por ciudad).
2. Exclusividad territorial con celda fija para todas las especialidades (por ejemplo, municipio).
3. Exclusividad territorial con **resolución natural por especialidad** sobre unidades oficiales INE, viabilidad por profundidad de mercado, territorio ganado por contribución, y círculo como comunidad humana.

**Choice.** Opción 3.

- `CategorySeat = Specialty × TerritoryUnit[]`. Escala oficial L0 país … L6 barrio, sin huecos, con códigos INE. H3 solo para cálculo interno.
- Cada especialidad tiene nivel natural y rango permitido. Las de proximidad juegan en distrito/barrio; las provinciales o nacionales, en su nivel. Esto multiplica las plazas útiles sin solapamiento.
- Una celda es viable para una especialidad si su profundidad de mercado (empresas objetivo × triggers estimados × densidad de originadores) cubre con holgura la cuota de D-010; si no, se agrega con vecinas.
- El territorio se conserva contribuyendo: cuota proporcional al territorio, ampliación solo a celdas vacantes adyacentes, cobertura provisional de vacantes, "úsalo o libéralo", subdivisión por demanda con consentimiento previo del titular.
- Sector definido por la prueba del referido: dos empresas son del mismo sector si un mismo referido válido debería enviarse a ambas. Taxonomía Sector → Especialidad → Segmento (opcional, como válvula para admitir más empresas sin fingir que no compiten).
- El referido se enruta por la ubicación de la necesidad, no por la del miembro. Sin titular → cobertura provisional → nivel superior → Global Routing.
- El círculo pasa a ser la comunidad humana de 25–35 empresas (D-006 se mantiene para ese fin); los agentes cooperan con toda la red.

**Why.** Es la única forma de cumplir simultáneamente "una empresa por sector en cada territorio" y "muchas buenas empresas". Adopta lo que funciona en franquicias (zonas con potencial equivalente, demarcación inequívoca) y en plataformas locales (área de servicio declarada y plausible), y descarta el reparto de un mismo lead entre competidores.

**Consequences.** D-001 queda parcialmente superada: la plaza sigue siendo por especialidad y la matriz de solapamiento se mantiene, pero el ámbito de exclusividad es la celda, no el círculo. NS-ARP v0.2 añade `TerritoryUnit`, `SeatCoverage`, `MarketDepth`, `Waitlist` y el enrutamiento territorial en S4. La web pública incorpora el mapa de disponibilidad. La Directiva necesita el mapa territorial con propuestas de subdivisión y liberación.

**Revisit when.** El fundador valide la escala L0–L6 y los niveles naturales del piloto; y tras el primer periodo con datos de territorio efectivo en NS Sevilla.

---

## D-012 · Modelo de volumen: cuotas muy inferiores a los clubes presenciales, escaladas por nivel territorial

**Status:** PROPOSED (sobre indicación del fundador)
**Date:** 2026-09-11

**Context.** El fundador indica que la posibilidad de suscribir muchas buenas empresas por zona hará que la cuota de alta y la mensual (si la hubiese) sean ínfimas comparadas con asociaciones como BNI (referencia de mercado: ≈ 450 € de alta + ≈ 1.249 € anuales + cuota semanal de reunión).

**Choice.** Se mantiene D-005 (alta + membresía, sin comisión) con dos precisiones: (1) el precio se fija para volumen, muy por debajo del club presencial; (2) la cuota es plana por plaza en una Sala (tras D-013 no existe escalado territorial). Los importes concretos quedan pendientes del fundador.

**Why.** El coste marginal de un miembro en una red agentic es bajo y el valor de la red crece con la densidad. Un precio bajo maximiza la densidad de buenas empresas, que es parte del moat.

**Consequences.** El modelo financiero se construye sobre número de plazas por ciudad × cuota media, no sobre pocas plazas caras. La selección (D-004) sigue siendo la barrera, no el precio.

**Revisit when.** Se fijen los importes del piloto de Sevilla.

**Precisado por D-025 (2026-09-13).** La cuota es plana dentro de cada Tramo, no plana para siempre: empieza en un Tramo de entrada bajo y sube solo cuando el miembro recibe más negocio contrastado.

---

## D-013 · La Sala es el eje de NS: exclusividad por Sala, tantas Salas por zona como permita su saturación, sectorización NS-CAT con base CNAE ampliable

**Status:** CONFIRMED (decisión directa del fundador)
**Date:** 2026-09-11

**Context.** Tras estudiar la alternativa territorial (D-011), el fundador decide que prefiere el modelo de sala: en un mismo territorio, por ejemplo Sevilla, se pueden crear todas las Salas que permita la saturación de la zona. El criterio de sectorización toma como eje una clasificación parecida a la CNAE, pero no inmutable: la casuística puede hacer surgir una nueva profesión y NS debe contemplarla antes que la administración. Especificación completa en `docs/12_SALAS.md`.

**Choice.**

- **Sala** es la unidad fundamental de NS y el término oficial del producto (sustituye a "círculo"/"grupo"; nunca "capítulo"). Una Sala reúne 12–15 empresas fundadoras, objetivo 25–35, tope 40 (D-006), con una empresa por especialidad (D-001).
- **Zona** es el ámbito geográfico (ciudad o área metropolitana, definido con unidades INE) que aloja Salas. Una zona abre una Sala nueva cuando existe una lista de espera de solicitantes admitidos que no caben en las Salas existentes, con al menos 12–15 fundadoras que cubran las especialidades más demandadas, y la profundidad de mercado de la zona lo sostiene. Deja de abrirlas (saturación) cuando el flujo de referidos válidos por miembro en las Salas existentes cae por debajo del umbral o la tasa de exportación de referidos entre Salas indica que la zona ya está cubierta.
- Una empresa pertenece a **una sola Sala por zona**. Sus agentes cooperan con toda la red, pero el enrutamiento es **Sala → Zona → Red**, de modo que la Sala conserva prioridad sobre los referidos que nacen en ella.
- **NS-CAT** (Clasificación NS de Actividades) es la taxonomía de plazas: toma como índice la estructura de la CNAE vigente (sección, división, grupo, clase) y añade el nivel **Especialidad NS**, que es el que otorga plaza. Cada especialidad tiene estado `OFICIAL` (derivada de CNAE), `NS_EXTENDIDA` (creada por NS) o `PROVISIONAL` (nueva profesión en periodo de prueba). Un Comité de Clasificación puede crear, dividir o fusionar especialidades a partir de solicitudes y de datos de enrutamiento; la definición operativa de conflicto sigue siendo la prueba del referido.
- Las cuotas son planas por plaza y bajas (D-012); nunca por referido (D-010).

**Why.** La Sala conserva lo mejor del club de referidos (pertenencia, confianza cara a cara, exclusividad comprensible) y NS le añade agentes 24/7 y tantas Salas como aguante la zona, lo que permite un número abundante de buenas empresas sin monopolios de ciudad. La clasificación con base administrativa es defendible y comunicable; la capa NS evita que una profesión nueva quede fuera.

**Consequences.** D-011 queda superada. D-001 y D-006 se mantienen íntegras con "Sala" como término. Se sustituye `docs/12_TERRITORIALIDAD.md` por `docs/12_SALAS.md`. NS-ARP v0.2 incorpora `Zone`, `Sala` (identificador técnico `Chapter`), el enrutamiento Sala → Zona → Red y `NS-CAT` como origen de `Specialty`. La web pública muestra disponibilidad por Sala dentro de la zona. La Directiva de zona gestiona apertura, escisión y fusión de Salas.

**Revisit when.** La primera zona alcance tres Salas activas y se disponga de datos de exportación de referidos entre Salas.

---

## D-014 · Nomenclatura: el nombre de la ciudad pertenece a NS y agrupa la zona; cada Sala lleva un nombre propio con prefijo NS, autorizado por NS

**Status:** CONFIRMED (decisión directa del fundador)
**Date:** 2026-09-11

**Context.** Con varias Salas por zona (D-013) hace falta una regla de nombres que evite que una Sala se apropie de la identidad de la ciudad, que distinga claramente zona y Sala, y que dé a cada Sala una identidad propia sin fragmentar la marca NS.

**Choice.**

- El nombre de la ciudad o municipio queda reservado a NS y designa la **zona**: "NS Sevilla" agrupa todas las Salas de Sevilla.
- Ninguna Sala puede usar el nombre de una ciudad, municipio, provincia, comunidad autónoma, país, barrio o distrito, ni ningún término que dé pistas territoriales (confirmado por el fundador). **La Sala no es territorial**: se define por sus empresas, no por un mapa. Se incorpora como principio no negociable 16. No existen sub-zonas ni áreas de influencia de Sala; la asignación de miembros a Salas no usa la ubicación; ninguna pantalla sitúa Salas sobre un mapa.
- Las Salas de una zona (y, más adelante, de zonas distintas) celebran encuentros entre Salas porque generan negocio, no porque compartan territorio. Formato y ritmo pendientes (`docs/12_SALAS.md` §6bis).
- Cada Sala elige un nombre propio con prefijo NS ("NS Cumbre"), propuesto por sus fundadoras y **autorizado por NS** conforme a criterios explícitos: unicidad en toda la red, no topónimo administrativo, no marca registrada ni nombre de empresa miembro, no término protegido de otras organizaciones, sin connotaciones ofensivas o partidistas, una o dos palabras.
- Hasta la autorización, la Sala usa un código provisional interno que nunca es nombre público.
- NS mantiene el registro central de nombres y la lista de reservados.

**Why.** Protege la marca y la neutralidad de NS en cada ciudad, da a cada Sala pertenencia e identidad propia, y evita que las Salas se perciban como territoriales.

**Consequences.** `Chapter` incorpora `name` único en la red y `name_status`. El ciclo de vida de la Sala (`docs/12_SALAS.md` §6) incluye la autorización del nombre antes de ACTIVA. La arquitectura de marca (brief de diseño) prevé lockups de zona y de Sala. Los datos demo pasan a "NS Sevilla · NS Cumbre".

**Revisit when.** Se abra la primera zona fuera de España (idiomas y topónimos distintos).

---

## D-015 · Embajada (Propuesta Fuera de la Sala): cuando la plaza está vacante en la Sala, el miembro puede ceder el referido a un titular de otra Sala como acto extraordinario con prima de Mérito

**Status:** CONFIRMED, integrada en el core de `CLAUDE.md`. Nombre "Embajada" confirmado por el fundador (se descartó "Embajada" por agresivo). Parámetros de la prima PROPOSED
**Date:** 2026-09-11

**Context.** El fundador propone que, cuando una empresa de una Sala disponga de un buen referido y no haya en su Sala ninguna empresa de alta con ese CNAE o especialidad, NS ofrezca la posibilidad de proponerlo a una empresa de otra Sala, como algo extraordinario, y que si resuelve proporcione muchos puntos al cedente. El enrutamiento Sala → Zona → Red (D-013) ya prevé que el referido no se pierda; esta decisión lo convierte en un acto del miembro, reconocido y recompensado.

**Choice.**

- **Condición.** La especialidad necesaria no tiene titular en la Sala del cedente (plaza vacante o especialidad sin representar en esa Sala). El sistema lo verifica; no es una opción libre cuando la plaza está ocupada, para no vaciar la prioridad de la propia Sala.
- **Acto.** El cedente propone un titular concreto de otra Sala de la zona. Su Agente le presenta candidatos ordenados por Hoja de Méritos, tiempo de respuesta y encaje; el cedente puede elegir uno que ya conozca. La Cesión sigue el ciclo NS-ARP completo (Salvoconducto, vistos buenos, Apertura, Puente, Veredicto, Contraste).
- **Prima de Mérito (propuesta).** Veredicto válido del cesionario: ×2 respecto a una Cesión ordinaria. Valor contrastado: ×3. La Embajada cuenta para el Compromiso del cedente como una Cesión ordinaria y media.
- **Efecto sobre la Sala.** Cada Embajada registra una plaza que la Sala del cedente debería cubrir. El Parte del Consejo de Zona la muestra como prioridad de captación desde la Antesala. Si una especialidad acumula tres Embajada en un Ejercicio, se abre candidatura preferente para esa plaza.
- **Salvaguardas.** El cesionario de otra Sala no adquiere derecho alguno sobre la Sala del cedente. Se aplican todas las reglas inmutables (D-010): nunca contraprestación. El Contraste vigila anillos de cesiones cruzadas entre dos empresas de Salas distintas. El cedente necesita consentimiento del tercero según NS-ARP como en cualquier Cesión.
- **Embajadora.** La empresa de otra Sala que acoge la Embajada queda acreditada como Embajadora de esa especialidad en la Sala del cedente mientras la plaza siga vacante: sin plaza, sin voto, sin derecho ni prioridad sobre la plaza; mención en su Hoja de Méritos; Mérito ordinario por la cesión. Condición temporal (termina al cubrirse la plaza o al cierre del Ejercicio siguiente sin nuevas Embajadas). Máximo dos Salas a la vez por empresa.
- **Embajada en Red.** Si ninguna Sala de la zona cubre la especialidad, el mismo mecanismo se extiende a otra zona con la misma prima.
- **Nombre.** "Embajada" (acto) y "Embajadora" (empresa que acoge). El nivel de membresía antes llamado "Embajador" pasa a "Consejero".

**Why.** Recompensa la generosidad exactamente donde más cuesta (fuera de la propia Sala), evita que un buen referido se pierda, y convierte cada hueco en una señal de captación para la Sala.

**Consequences.** `Referral.route: CHAPTER | ZONE | NETWORK` y `Referral.extramuros: true` en NS-ARP v0.2; `TrustEvent` con multiplicador; el Parte incorpora "plazas reclamadas por Embajada". Léxico en `docs/13_LEXICO_NS.md`.

**Revisit when.** Se disponga de 20 Embajadas contrastadas, para calibrar la prima y el límite de dos Salas por Embajadora.

---

## D-016 · Léxico NS: nombres propios para la estructura, el flujo, la reputación y el día a día

**Status:** CONFIRMED por el fundador (2026-09-11), con un cambio: "Extramuros" → "Embajada" / "Embajadora"; el nivel "Embajador" pasa a "Consejero".
**Date:** 2026-09-11

**Context.** El fundador pide nombres originales para las acciones del protocolo y del día a día de NS. La constitución exige lenguaje propio y prohíbe terminología de otras organizaciones.

**Choice.** Se adopta `docs/13_LEXICO_NS.md` como léxico oficial. Núcleo: Red NS · Zona · Sala · Plaza · Titular · Antesala · Candidatura · Directiva · Consejo de Zona · Pleno · Confluencia; Indicio · Pista · Encaje · Fundamento · Salvoconducto · Visto bueno · Apertura · Cesión · Embajada · Embajadora · Embajada en Red · Cedente/Cesionario · Puente · Oportunidad · Cierre · Valor contrastado · Libro de Valor; Veredicto · Contraste · Mérito · Hoja de Méritos · Distinción · Compromiso · Ejercicio · Niveles · Arbitraje; Agente NS · ADN de Empresa · Mesa Permanente · Despacho · Encargo · Rastreo · Sondeo · Hoy · Parte · Crónica · Carta de Presentación · NS Radar; NS-ARP · NS-CAT · Especialidad. Los identificadores técnicos del protocolo se mantienen en inglés y se mapean en el léxico.

**Why.** El léxico es propiedad intelectual y es producto: microcopy, web y app hablan con él. Palabras castellanas, sobrias, de una sola pieza, sin pistas territoriales.

**Consequences.** Los documentos vivos adoptan el léxico en su próxima revisión. El brief de diseño lo usa en todo el microcopy. Se comprueba la disponibilidad registral de "NS" + término para los principales.

**Revisit when.** El fundador ratifique o sustituya términos; antes de la primera zona fuera de España.

---

## D-017 · Definición del referido: un Interesado (empresa, persona, asociación o cualquier entidad) que busca un producto o servicio de confianza, propuesto por el Agente del cedente al titular de la especialidad en su Sala

**Status:** CONFIRMED (definición validada por el fundador)
**Date:** 2026-09-11

**Choice.** El objeto de toda Cesión es un **Interesado**: empresa, persona física, autónomo, asociación, fundación, comunidad de propietarios, administración, club u otra entidad con una necesidad real de un producto o servicio de confianza. El miembro que lo conoce (cedente) lo entrega a su Agente; el Agente lo estructura como Indicio y lo propone, a través de la Mesa Permanente, al titular de esa especialidad en la Sala. Un Interesado con varias necesidades origina varias Cesiones. Si no hay titular, Embajada.

**Consequences.** NS-ARP incorpora `ThirdParty` con `kind: COMPANY | PERSON | SOLE_TRADER | ASSOCIATION | PUBLIC_BODY | OTHER`. Cuando el Interesado es persona física, la Apertura exige base jurídica y consentimiento (NS-ARP §8.2.3); el sector regulado del titular puede añadir restricciones (§8.2.5). El léxico (`docs/13_LEXICO_NS.md` §5bis) recoge el reparto de papeles.

**Revisit when.** Se produzca la primera Cesión con Interesado persona física en el piloto.

---

## D-018 · Dos protocolos obligatorios de Sala: Generar Negocio (Cesión) y Dar a Conocer (Comunicado semanal, Gaceta y Dossier)

**Status:** CONFIRMED en su obligación (decisión directa del fundador); nombres y parámetros PROPOSED
**Date:** 2026-09-11

**Context.** El fundador fija que todo lo relativo a referidos pertenece al primer protocolo, Generar Negocio, y establece un segundo protocolo obligatorio, Dar a Conocer: igual que semanalmente los Agentes deben proponer el máximo de referidos posibles, cada Agente debe informar al Agente del resto de empresas de la Sala del sector, funciones, servicios y productos que trabaja su empresa y de las actualizaciones, novedades y datos importantes de esa semana; y todo gerente debe conocer o poder acceder fácilmente al dossier, histórico y novedades de cada miembro de su Sala.

**Choice.**

- **Protocolo I · Generar Negocio.** Unidad: la Cesión. Especificación NS-ARP. Cadencia semanal de propuesta máxima de Cesiones válidas; cumplimiento por Compromiso (D-010).
- **Protocolo II · Dar a Conocer.** Unidad: el **Comunicado** semanal (estable + delta) que el Agente redacta a partir del ADN de Empresa y de lo que el gerente aporta en el Despacho, y que el gerente aprueba con un toque. Sin aprobación en 48 h, Comunicado de continuidad (solo lo estable). El Chapter Intelligence Agent compila la **Gaceta** semanal con vista general y "relevante para ti". Cada miembro tiene un **Dossier** vivo accesible en dos toques desde Mi Sala, cualquier Cesión, la búsqueda y la Gaceta. Los Agentes receptores acusan recibo y actualizan su índice de capabilities y sus criterios de Rastreo.
- **Visibilidad.** Solo capas `PUBLIC` y `CHAPTER`. Nunca `COMPANY_ONLY`, `NEVER_SHARE` ni datos personales de terceros. Cada afirmación del delta lleva origen: declarada, inferida o verificada.
- **Cumplimiento.** Un Comunicado por semana. Propuesta: dos de continuidad seguidos generan aviso del Agente; tres, aviso de la Directiva; el incumplimiento reiterado sigue la escalera del Compromiso. `TrustEvent` `COMMUNIQUE_MET` / `COMMUNIQUE_MISSED`. Métrica de salud: conocimiento mutuo.
- Se incorpora como cuarta regla inmutable en `CLAUDE.md`.

**Why.** Nadie puede ceder bien lo que no conoce bien. El Comunicado es lo que hace que los Agentes conozcan de verdad a los demás miembros; la Gaceta y el Dossier hacen que las personas también lo sepan sin esfuerzo. Sustituye las presentaciones repetitivas por información de trabajo con delta.

**Consequences.** Nuevo `docs/14_PROTOCOLOS_DE_SALA.md` con la especificación agentic de NS-ADP v0.1. NS-ARP S4 (Agent Discovery) consume el índice de capabilities actualizado por los Comunicados. El Despacho, Hoy, Mi Sala, el Pleno y el Parte incorporan Comunicado, Gaceta y Dossier. Léxico ampliado (`docs/13_LEXICO_NS.md` §4bis).

**Revisit when.** Tras cuatro semanas de Comunicados en la Sala piloto, con datos de conocimiento mutuo y de precisión de Pistas.

---

## D-019 · Protocolo III · Cuentas Claras: Balanza pública por titular en la Sala (dado, recibido, mes y acumulado, estado frente al Ritmo) y Brújula privada generada por el Agente

**Status:** CONFIRMED en su obligación (decisión directa del fundador); nombres y parámetros PROPOSED
**Date:** 2026-09-11

**Context.** El fundador fija un tercer protocolo: en una Sala será visible el valor de negocio generado y recibido por cada titular, del mes y acumulado. En la parte pública se ven los números (Cesiones hechas y recibidas) y en qué punto del objetivo semanal, marcado por la Sala o en su defecto por NS, se encuentra cada titular. En la parte privada, como su Agente estudia constantemente cómo mejorar sus estadísticas, qué ofrecer a otros y qué proponer, el titular ve un cuadro con si está consiguiendo los objetivos, motivaciones para hacerlo y el rastreo de posibles referidos para ceder.

**Choice.**

- **Balanza** (visibilidad `CHAPTER`): por titular, Cesiones hechas y recibidas (solo con Veredicto válido; las demás como "en curso"), valor contrastado generado para otros y recibido (solo agregados, nunca el valor de una Cesión concreta), del mes y acumulado, historial de 12 semanas, y estado frente al **Ritmo**: En Ritmo · Por encima · Por debajo, con la cifra. Ordenada por plaza; nunca un ranking; reciprocidad explicada por el Agente de Sala, no juzgada. **Balanza de Sala** en cabecera.
- **Ritmo**: objetivo semanal de Cesiones válidas fijado por la Sala al inicio de cada Ejercicio; en su defecto, el de NS (propuesta: 1 por semana y titular). Nunca inferior al que garantiza el Compromiso. El Chapter Intelligence Agent propone ajustes con datos.
- **Brújula** (visibilidad `COMPANY_ONLY`): recalculada cada noche por el Agente del titular con cuatro bloques: dónde estás (Ritmo, Compromiso, Comunicado, dado y recibido), por qué (evidencia: Veredictos, tiempos, señales que convierten), qué ganas (Mérito hasta el siguiente nivel, Distinción, Embajada) y tres **Movimientos** accionables en un toque (ceder, ofrecer, proponer, sondear, Embajada), cinco si va Por debajo. Nunca sale de la empresa; la Directiva solo recibe agregados y el estado de Ritmo en el Parte.
- La obligación recae en NS: Balanza siempre pública en la Sala, exacta y contrastada. Se incorpora como quinta regla inmutable en `CLAUDE.md`.

**Why.** La transparencia del valor dado y recibido sostiene la reciprocidad sin discursos y sin rankings tóxicos (constitución §14). Separar lo público (pesar) de lo privado (orientar) convierte el dato en acción: el Agente no solo informa, propone la siguiente Cesión.

**Consequences.** `docs/14_PROTOCOLOS_DE_SALA.md` incorpora NS-ATP v0.1 con especificación agentic. Objetos `MemberBalance`, `ChapterBalance`, `WeeklyPace`, `MemberCompass`, `CompassMove`. Mi Sala, Dossier, Hoy, Despacho y Parte incorporan Balanza, Ritmo y Brújula. Léxico ampliado (`docs/13_LEXICO_NS.md` §4ter). PDF del léxico regenerado como v0.2.

**Revisit when.** Tras el primer Ejercicio completo con Balanza pública en la Sala piloto, con datos de aceptación y conversión de Movimientos.

---

## D-020 · Veredicto en tres ejes (Facilidad, Negocio, Trato) y Distinción otorgada por quien recibe la Cesión

**Status:** CONFIRMED (criterios fijados por el fundador); parámetros de escasez PROPOSED
**Date:** 2026-09-11

**Context.** El fundador ratifica que las Distinciones las otorga quien recibe la Cesión, teniendo en cuenta la facilidad de prestar el servicio, el negocio generado y el trato de las personas. Esos tres criterios sustituyen a la rúbrica de cinco ejes propuesta en D-009 por ser más simples, más memorables y más cercanos a cómo un empresario valora de verdad un referido.

**Choice.**

- **Veredicto** del cesionario en tres ejes, tres toques: Facilidad (información completa, momento real, decisor identificado, encaje), Negocio (oportunidad, cierre, valor contrastado) y Trato (del cedente en el Puente y del Interesado en la relación). El Agente aporta la evidencia de cada eje; la valoración opcional del Interesado desde la Carta de Presentación alimenta Trato.
- **Distinción**: acto deliberado del cesionario hacia el cedente por una Cesión concreta. Nombra el eje que destacó y una línea de motivo. Se publica en la Crónica y suma Mérito. Escasez propuesta: máximo una por titular y mes, y no más de dos al mismo cedente por Ejercicio. Nadie se distingue a sí mismo; nunca por cantidad.
- **Hoja de Méritos** muestra las Distinciones recibidas por eje ("5 por Trato, 4 por Facilidad, 3 por Negocio"): el perfil de por qué valoran a una empresa.
- **Cesión del mes** de la Sala: la Distinción del mes con mejor Veredicto y valor contrastado; empate a favor de Trato.
- **Contraste**: toda Distinción debe corresponder a una Cesión con Veredicto válido; vigilancia de pares que se distinguen mutuamente y de Distinciones sin motivo.

**Why.** Poner la valoración en manos de quien recibe elimina el autobombo y alinea el reconocimiento con la calidad real. Tres ejes se recuerdan y se responden en segundos. La escasez hace que una Distinción importe.

**Consequences.** `ReferralQualification{ease, business, treatment}` y `Recognition{axis, reason}` en NS-ARP v0.2. El core (`CLAUDE.md` §14), el léxico y el banco de ideas quedan actualizados. PDF del léxico regenerado como v0.3.

**Revisit when.** Se disponga de 100 Veredictos en la Sala piloto, para calibrar la escasez de la Distinción.

---

## D-021 · La Cesión vale en dos momentos: Promesa a priori (calculada por los Agentes, confirmada por el cesionario, con Mérito inmediato para el cedente) y Veredicto a posteriori

**Status:** CONFIRMED (criterio y nombre "Promesa" ratificados por el fundador el 2026-09-12); pesos PROPOSED
**Date:** 2026-09-11

**Context.** El fundador no quiere que toda la carga de la valoración de la Cesión recaiga sobre el cesionario: si un referido indica a priori un buen negocio en el Indicio, eso debe aparecer y contar, y se completa con la valoración a posteriori una vez prestado el servicio.

**Choice.**

- **Promesa**: valor a priori de la Cesión, fijado en el momento de la aceptación a partir de datos estructurados (valor estimado del Indicio, necesidad real, información completa, decisor identificado, plazo, fuerza de la relación del cedente con el Interesado). La calculan los Agentes con el Fundamento y las comprobaciones de NS-ARP; el cesionario la confirma o la ajusta con un toque al aceptar. No es una opinión libre del cedente.
- **Mérito en tres momentos**: Mérito de Promesa (al aceptarse la Cesión), Mérito de Veredicto (al valorarla el cesionario en Facilidad, Negocio y Trato) y Mérito de Cierre (al contrastarse el valor). Pesos propuestos: 30 % Promesa, 30 % Veredicto, 40 % Cierre, calibrables tras el piloto.
- **Protección del cedente**: si la Cesión no prospera por causa del cesionario (respuesta tardía, sin seguimiento, sin Veredicto en plazo), el cedente conserva su Mérito de Promesa y el cesionario responde en su reputación de cesionario (D-009).
- **Protección de la Sala**: si el Veredicto demuestra con evidencia que el Indicio era falso (el Interesado no tenía la necesidad), el Mérito de Promesa se retira. El Contraste vigila Promesas infladas, ajustes a la baja sistemáticos de un cesionario y discrepancias repetidas entre Promesa y Veredicto.
- **Dónde se ve**: la Promesa aparece en la tarjeta de la Cesión (valor estimado y confianza) y en la Hoja de Méritos ("Promesa media de tus Cesiones"). La Balanza sigue mostrando solo valor contrastado.
- La Cesión cuenta para el Compromiso y el Ritmo en el momento de la aceptación (Cesión válida), como ya estaba previsto.

**Why.** Reconoce la calidad del referido en el momento en que se entrega, no solo cuando otro lo convierte. Reparte la responsabilidad: el cedente responde de la Promesa, el cesionario del Veredicto y del seguimiento. Evita que un buen referido quede sin Mérito por causa ajena al cedente.

**Consequences.** `ReferralPromise` y `TrustEvent{PROMISE_EARNED, PROMISE_WITHDRAWN}` en NS-ARP v0.2. Core (`CLAUDE.md` §14), léxico, banco de ideas y PDF del léxico (v0.4) actualizados. La tarjeta de Cesión del diseño ya muestra el valor estimado; pasa a etiquetarse como Promesa.

**Revisit when.** Tras 100 Cesiones con Promesa y Veredicto en la Sala piloto, para calibrar los pesos y la correlación entre ambas.

---

## D-022 · Monograma NS: ejecución B · Desplazado (dos medios discos sobre un eje, desplazados; el segmento de contacto es el Puente)

**Status:** CONFIRMED (elección directa del fundador)
**Date:** 2026-09-12

**Context.** El brief de diseño (§5) pedía explorar cuatro territorios conceptuales y proponer uno. El fundador prefirió el de "dos semicírculos" (la reunión permanente) y pidió verlo en tres ejecuciones para decidir.

**Options.** A · Encuentro (dos medios discos enfrentados con hueco). B · Desplazado (dos medios discos sobre un eje, desplazados, con S implícita y contacto en un segmento). C · Enlace (dos arcos de trazo entrelazados con una lente).

**Choice.** B · Desplazado. Geometría, versiones y reglas en `brand/README.md`; archivos SVG en `brand/monograma/`.

**Why.** Es la única ejecución que contiene la lectura NS sin letras, la más difícil de confundir con marcas existentes, y la que mejor anima con significado: el segmento de contacto se ilumina en verde cuando el Agente está en la Mesa y en ámbar cuando hay una Cesión esperando visto bueno. Se reconoce a 16 px, funciona en monocromo, metal y tela, y escala a cualquier zona.

**Consequences.** El brief de diseño pasa de "explorar" a "desarrollar el sistema": wordmark definitivo, espacio de protección, app icon, sello de miembro, avatar del Agente derivado del medio disco, marca de agua y guía de usos incorrectos. El diseño de Hoy adopta el monograma. Las ejecuciones A y C se conservan en el lienzo como descartadas.

**Revisit when.** Nunca en cuanto a la ejecución; el wordmark y la tipografía se cierran en el design system (`docs/05_DESIGN_SYSTEM.md`).

---

## D-023 · Sistema de identidad: tipografía (pendiente de elección), wordmark y lockups, sello de miembro, avatar del Agente, marca de agua y usos incorrectos

**Status:** PROPOSED (tipografía pendiente del fundador); el resto construido sobre la pareja recomendada
**Date:** 2026-09-12

**Context.** Tras D-022 (monograma B), el brief pide cerrar el sistema de identidad. Lienzo "Identidad NS" con seis artboards.

**Choice.**

- **Tipografía**: tres parejas presentadas. Recomendada: Newsreader + IBM Plex Sans + IBM Plex Mono (editorial con carácter, sans muy legible con cifras tabulares, mono para identificadores; todas SIL OFL). Alternativas: Instrument Serif + Instrument Sans (más editorial, un solo peso) y Bricolage Grotesque + Source Sans 3 (más tecnológica, pierde el registro de club).
- **Wordmark**: "NS Network" en Newsreader 500; lockup horizontal con monograma a 1,55× y separación 0,42×; jerarquía Red → Zona → Sala con etiquetas en mono; versión apilada solo para cuadrados; estados solo en la app.
- **Sello de miembro**: anillo doble con MIEMBRO · zona / Sala · año, monograma centrado; emitido y revocable por NS; enlaza al Dossier; insignia horizontal para firmas; variante Embajadora.
- **Avatar del Agente**: medio disco superior del monograma con cinco estados (reposo, analizando, ha encontrado algo, esperando tu decisión, sin información suficiente); estados privados del titular.
- **Marca de agua**: centrada al 6 % para documentos de Sala; esquina en azul institucional para documentos a Interesados; pie obligatorio con visibilidad, Sala, zona y fecha.
- **Usos incorrectos**: doce prohibiciones documentadas en `brand/README.md`.

**Consequences.** Archivos SVG en `brand/sello/`, `brand/agente/`, `brand/documentos/`. `docs/05_DESIGN_SYSTEM.md` se derivará de `brand/README.md` y de los tokens de Hoy cuando el fundador elija la tipografía.

**Revisit when.** El fundador elija la pareja tipográfica; y tras las primeras pruebas de percepción de marca con empresarios sevillanos (D-007).

---

## D-024 · Tarjeta de Cesión a dos caras: comportamiento, plazos y estados

**Status:** CONFIRMED (diseño y detalles validados por el fundador)
**Date:** 2026-09-12

**Choice.** La tarjeta de Cesión se especifica en `docs/15_TARJETA_DE_CESION.md`, con la Promesa como pieza central de ambas caras. Detalles validados expresamente:

- Al aceptar, el cesionario se compromete a responder al Interesado en 48 h tras el Puente y a emitir Veredicto al cerrar.
- Una Cesión caduca a los 7 días sin respuesta (recordatorio a las 72 h). Vuelve al cedente, que puede proponerla a otra Sala. El silencio del cesionario cuenta en su Hoja de Méritos.
- Declinar con motivo no afecta a la reputación del que declina y el cedente conserva su Mérito de Promesa.
- En la cara B, lo marcado COMPANY_ONLY o NEVER_SHARE se muestra bloqueado, no oculto.
- El Puente lo redacta el Agente y lo envía la persona. Ningún Agente contacta con el Interesado.

**Consequences.** NS-ARP §9.1 mantiene los timeouts (72 h recordatorio, 7 d caducidad) y añade el compromiso de 48 h tras `INTRODUCED` como `TrustEvent{RESPONSE_ON_TIME | RESPONSE_LATE}` del cesionario. Diseño publicado en el lienzo "Cesión NS" (cara A, cara B, móvil, estados, Veredicto).

**Revisit when.** Tras las primeras 50 Cesiones en la Sala piloto, para revisar los plazos con datos.

---

## D-025 · La cuota mensual cubre con creces el coste del Agente y no es fija: empieza baja y sube por Tramos solo cuando el miembro recibe más negocio contrastado gracias a NS

**Status:** CONFIRMED en el principio (input directo del fundador); PROPOSED en el mecanismo de Tramos y en los nombres
**Date:** 2026-09-13

**Context.** El fundador fija un principio interno de sostenibilidad antes de seguir con el desarrollo: la cuota mensual de cada miembro de una Sala debe cubrir con creces el gasto en tokens de su Agente. El miembro debe saber desde el principio que la cuota no es fija: si la actividad de su Agente es potente, la cuota puede variar, pero a la vez su Agente le estará generando mucho más negocio. La cuota comienza en un importe razonable, para que entrar sea fácil, y sube solo cuando NS le genera más negocio.

**Aclaración del fundador (2026-09-13): la cuota no es una comisión.** Hay dos planos que no se mezclan:

```text
ENTRE MIEMBROS        Prohibido dar un referido por una contrapartida económica (D-010, expulsión).
                      Se comparte para que te compartan. Es generación de negocio, no comercio de referidos.

ENTRE MIEMBRO Y NS    Suscribirse y pertenecer a NS tiene un coste: un coste inicial (o no, por decidir)
                      y un coste mensual. Esos son los ingresos de NS. Es el precio de la plaza y del Agente.
```

La cuota mensual, aunque varíe por Tramos, pertenece al segundo plano. Nunca es una comisión, nunca es un pago por un referido y nunca circula entre miembros. El mecanismo de Tramos solo decide **cuánto vale la suscripción** de cada empresa en cada Ejercicio.

**Options.**

1. Cuota plana para siempre, fijada para cubrir el coste medio del Agente. Simple, pero o es cara para entrar o pierde dinero con los miembros más activos.
2. Cuota base + facturación por consumo de tokens del Agente. Cubre el coste, pero el miembro paga la actividad del Agente aunque no le haya generado nada, y castiga la prospección para otros (Rastreo, Sondeo), que es el corazón del sistema.
3. Cuota base + porcentaje del valor contrastado. Alinea ingresos y valor, pero convierte la suscripción en un porcentaje sobre negocio, descartado en D-005 por fricción de trazabilidad y por restricciones legales en sectores regulados.
4. **Cuota por Tramos ligada al negocio recibido.** Cuota mensual en tramos fijos y públicos. Se entra en el Tramo de entrada. El paso a un Tramo superior se produce solo cuando el valor contrastado recibido por el miembro en el Ejercicio anterior supera el umbral del Tramo. Cada Tramo cubre con margen el presupuesto de tokens de su Agente.

**Choice.** Opción 4. Reglas:

- **Cobertura.** Todo Tramo se fija de modo que el coste esperado de tokens del Agente en ese Tramo sea una fracción minoritaria de la cuota (propuesta: nunca más de un tercio). NS mide el coste real del Agente de cada miembro; si el coste supera la fracción de forma sostenida, se ajusta el presupuesto de actividad del Agente en ese Tramo, no la cuota del miembro.
- **Entrada fácil.** El Tramo de entrada es una cuota baja y razonable (D-012: muy por debajo de los clubes presenciales). El importe concreto lo fija el fundador con el piloto de Sevilla. La existencia de una cuota de incorporación queda abierta ("o no, ya veremos"): se decidirá con los importes del piloto.
- **Solo sube con negocio contrastado recibido.** El único disparador de subida es el **valor contrastado recibido** por el miembro (`VALUE_CONFIRMED`, confirmado por ambas partes y contrastado por NS) en el Ejercicio anterior. No sube por actividad del Agente, por número de Cesiones, por tamaño de la empresa ni por antigüedad. Si el Agente trabaja mucho y no genera negocio contrastado, el miembro sigue en su Tramo.
- **Importes fijos por Tramo, nunca un porcentaje ni un cargo por Cesión.** Los Tramos son importes fijos escalonados. Ningún cálculo de cuota toma una Cesión concreta ni un porcentaje del negocio como base. El valor contrastado sirve solo para determinar el Tramo del Ejercicio siguiente. No existe ningún cargo asociado a una Cesión, un Puente o un Cierre. Así la suscripción es una suscripción, y la regla entre miembros (D-010) queda en su propio plano, intacta.
- **Proporción sana.** Los umbrales de cada Tramo se fijan de modo que la cuota anual del Tramo sea siempre una fracción pequeña del valor contrastado que lo activa (propuesta: menos del 5 %). El miembro que sube de Tramo está, por construcción, ganando mucho más de lo que paga.
- **Predecible y con aviso.** Los Tramos y sus umbrales son públicos desde la web y la Candidatura. El paso de Tramo se revisa una vez por Ejercicio, con aviso del Agente al menos un Ejercicio antes, mostrando el valor contrastado recibido, el Tramo resultante y qué habría que recibir para el siguiente. Nunca hay una subida sorpresa a mitad de Ejercicio.
- **También baja.** Si el valor contrastado recibido en un Ejercicio cae por debajo del umbral del Tramo actual, el miembro baja de Tramo en el siguiente. La cuota sigue al negocio en los dos sentidos.
- **Presupuesto del Agente por Tramo.** Cada Tramo lleva un presupuesto de actividad del Agente (frecuencia de Rastreo, profundidad de cualificación, número de Sondeos). El Agente prioriza siempre dentro de su presupuesto lo que más negocio contrastado puede producir. Un miembro puede pedir voluntariamente un Tramo superior para tener un Agente más intenso; nunca se le obliga.
- **Transparencia interna.** En su Brújula el miembro ve su cuota, su Tramo, el valor contrastado recibido en el Ejercicio y la relación entre ambos. La Balanza pública de la Sala no muestra el Tramo de nadie: la cuota es un asunto entre cada empresa y NS.
- **Aceptación expresa.** La regla "la cuota no es fija: empieza baja y sube solo cuando NS te genera más negocio" se comunica en la web pública, en la Candidatura y en el onboarding, y el solicitante la acepta expresamente, como las reglas inmutables.

**Why.** Los ingresos de NS son las suscripciones de sus miembros; la sostenibilidad depende de que cada Agente se pague a sí mismo con margen. Cobrar por consumo castigaría precisamente la actividad que hace funcionar la red (prospectar para otros). Cobrar un porcentaje sobre negocio ya se descartó en D-005. Los Tramos ligados al valor contrastado recibido consiguen las tres cosas a la vez: entrada fácil, cobertura del coste y cuota que crece solo cuando el miembro ya ha ganado. Y refuerzan la métrica primaria: NS solo factura más cuando ha demostrado valor contrastado.

**Consequences.**

- D-005 y D-012 se mantienen y se precisan: la membresía deja de ser "plana por plaza" y pasa a ser "por Tramos, plana dentro de cada Tramo". La cuota de incorporación pasa a estar pendiente de decisión (existe o no).
- `MembershipPlan` incorpora `FeeTier` (Tramo) con `monthly_fee`, `value_threshold`, `agent_budget`. Cada empresa tiene `current_tier`, `next_review_at` y el histórico de cambios de Tramo como eventos auditables.
- Se registra el coste de tokens por Agente y por Ejercicio (`AgentCostLedger`) para comprobar la cobertura. Es dato interno de NS; nunca se muestra como "consumo" al miembro para no convertir la relación en una factura de tokens.
- La Brújula (NS-ATP) añade el bloque "Tu cuota y tu negocio recibido". El Parte de la Directiva y del Consejo de Zona añade el margen de cobertura agregado por Sala.
- La web pública, la Candidatura y el onboarding incluyen los Tramos y la aceptación expresa.
- `CLAUDE.md` §28 y `docs/13_LEXICO_NS.md` incorporan Cuota y Tramo.

**Pendiente del fundador.** Si existe cuota de incorporación y su importe; importe del Tramo de entrada; número de Tramos y sus umbrales (propuesta inicial: tres o cuatro Tramos); fracción máxima de coste sobre cuota (propuesta: un tercio); proporción máxima cuota/valor (propuesta: 5 %); y si el Ejercicio de revisión de Tramo es mensual o trimestral (propuesta: trimestral, para amortiguar meses aislados).

**Revisit when.** Se disponga de dos Ejercicios completos de coste real de tokens y valor contrastado en NS Sevilla.

---

## D-026 · Stack técnico del vertical slice: TypeScript, Next.js, Drizzle sobre PostgreSQL (PGlite en local), zod, Vitest; razonamiento LLM detrás de un contrato con proveedor determinista y proveedor Anthropic

**Status:** CONFIRMED (por delegación expresa del fundador, 2026-09-13: "decide tú qué hacer con D-026"; el equipo fundador la confirma)
**Date:** 2026-09-13

**Context.** Cerrados el modelo de datos (`docs/06`) y la arquitectura de agentes (`docs/07`), hay que fijar el stack del primer recorrido ejecutable sin complejidad prematura y sin dependencia de red para la demo y los tests. La constitución (§A.9) orienta a TypeScript, framework full-stack, PostgreSQL, validación de esquemas y APIs tipadas.

**Options.**

1. Next.js + Prisma + Postgres servidor obligatorio. Cómodo, pero la demo exigiría un servidor Postgres y el JSON tipado es más rígido.
2. Next.js + Drizzle (pg-core) + PostgreSQL, con PGlite (Postgres embebido en WASM) para local, demo y tests. Un solo dialecto real, mismas migraciones en todos los entornos.
3. Backend separado (Nest/Fastify) + SPA. Más piezas antes de haber demostrado la tesis.

**Choice.** Opción 2.

- **Monorepo pnpm** con `apps/web`. El dominio (`src/core`) no importa nada del framework y se puede extraer a paquete cuando haga falta.
- **Drizzle ORM** sobre `pg-core`; `DATABASE_URL` → node-postgres; sin ella → PGlite en `.data/`. Migraciones generadas con drizzle-kit y aplicadas al arrancar.
- **zod** como fuente de verdad de los objetos del protocolo (`src/core/types.ts`), usada también para validar las salidas estructuradas del modelo.
- **Contrato `LLMProvider`** con dos implementaciones: determinista (reglas, sin red) y Anthropic (`@anthropic-ai/sdk`, `messages.parse` con `zodOutputFormat`, modelo `claude-opus-5` por defecto). El sistema nunca deja que una salida de modelo cambie estado sin validar.
- **Vitest** para funciones puras y para el slice completo sobre PGlite en memoria.
- **Sin autenticación en el slice**: cookie de persona para la demo. La autenticación y el RBAC por Sala/empresa son el primer trabajo de la fase siguiente.

**Why.** Un solo dialecto Postgres de verdad en todos los entornos elimina la deriva entre local y producción. PGlite permite demo y tests reproducibles sin infraestructura. El contrato de proveedor mantiene la promesa del protocolo ("los LLM razonan, el sistema mantiene estado") y permite ejecutar la Mesa sin coste ni red.

**Consequences.** `apps/web` con 25 tests que cubren los escenarios A, C y D. `docs/06` y `docs/07` describen lo implementado. Cada cambio de esquema exige `pnpm db:generate` y migración versionada.

**Revisit when.** Haga falta cola de trabajos en segundo plano para la Mesa con proveedor real, búsqueda vectorial para el recall de S4, o extraer `src/core` a un paquete compartido.

**Razón de la confirmación.** Tres criterios: (1) es la base más simple que cumple la constitución (§A.9: tipado, PostgreSQL, validación, auditoría) y ya demuestra el recorrido completo con 25 pruebas automáticas; (2) no compromete el futuro, porque el dominio (`src/core`) no depende del framework ni de la base de datos y cada pieza se puede sustituir por separado; (3) permite enseñar el producto a empresarios sin infraestructura ni coste de modelo, con un solo comando. Lo que sigue pendiente (autenticación, Mesa en segundo plano con proveedor real, búsqueda vectorial) se decide en su momento como decisiones nuevas, no como revisión de esta.

---

## D-027 · La persona que representa a la empresa en NS se llama Timonel; el Timonel manda

**Status:** CONFIRMED (elección directa del fundador)
**Date:** 2026-09-13

**Context.** El léxico tenía nombre para la empresa (Titular) pero no para la persona que decide por ella; los documentos usaban "gerente" de forma informal. El fundador pidió una palabra cercana y coloquial, no un cargo administrativo.

**Options.** Portavoz · Salense / Salano (de Sala) · Mesario (de Mesa) · Personia / Personero / Personado (de persona) · Manitas · Copiloto · Piloto · Capitán · Timonel.

**Choice.** **Timonel.** Invariable en género (el Timonel, la Timonel). Cada Titular designa un Timonel y puede designar un Timonel suplente. Descartes razonados: Portavoz (administrativo); Personia y Personero (colisión con marcas de software de recursos humanos y registro poco natural); Manitas (nombra a quien ejecuta con las manos, no a quien decide, y suena a bricolaje); Copiloto (hoy significa la inteligencia artificial y sitúa al humano como ayudante de la máquina, además de la colisión con Microsoft); Piloto (choca con "el piloto de NS Sevilla" como fase de lanzamiento).

**Why.** Cuenta la relación persona-Agente en una sola imagen: el Agente rema y vigila el horizonte 24/7; el Timonel decide el rumbo. Es cercana sin ser vulgar y hace familia con Brújula y Puente. Y describe la verdad del protocolo: nada llega a un tercero sin su visto bueno, nadie revela una identidad sin su Apertura, ningún Puente sale sin que lo envíe, y el Veredicto lo emite ella.

**Principio que fija el fundador.** *La persona debe sentir siempre que es quien dirige.* No es una cortesía de interfaz para que el humano "se sienta bien": es la descripción exacta de las puertas humanas de NS-ARP. Todo diseño que convierta al Timonel en espectador de su Agente es un error de producto. Se incorpora a la constitución (§7, Human-in-the-Loop).

**Consequences.** "Gerente" se sustituye por "Timonel" en la constitución, el North Star, el léxico y los Protocolos de Sala. En el modelo de datos, `members.is_primary` marca al Timonel. La app usa "Timonel" en el alta, el selector de demo, el Dossier y la tarjeta de Cesión. No requiere comprobación de marca (D-028).

**Revisit when.** Nunca en cuanto al principio.

---

## D-028 · La única marca registrada es NS Network Spain; los términos del léxico no tienen que ser registrables

**Status:** CONFIRMED (indicación directa del fundador)
**Date:** 2026-09-13

**Context.** El equipo fundador venía condicionando cada término nuevo del léxico (Embajada, Tramo, Timonel) a una comprobación de marca en la OEPM y la EUIPO. El fundador aclara que la marca registrada es **NS Network Spain** y que las denominaciones menores no pretenden ser registrables.

**Choice.** Los términos del léxico (Sala, Plaza, Titular, Timonel, Cesión, Embajada, Promesa, Veredicto, Balanza, Brújula, Tramo, etc.) son **lenguaje de producto**, no marcas. Se eligen por claridad, sobriedad y coherencia con el imaginario NS; no se exige ni se comprueba que sean registrables, y no se vuelve a plantear esa comprobación al proponer nombres. La protección de la propiedad intelectual de NS descansa en la marca NS Network Spain, en el protocolo NS-ARP y en el conjunto del léxico y la metodología como obra, no en el registro de cada palabra.

**Consequences.** Se elimina el criterio "registrable con el prefijo NS" del léxico (`docs/13`). Las decisiones anteriores que mencionaban comprobaciones de marca pendientes (D-015, D-025, D-027) quedan libres de esa condición. Si en el futuro conviene registrar algún término concreto (por ejemplo, el nombre de un producto o servicio de pago), se abrirá una decisión propia.

**Revisit when.** NS salga de España o lance una línea de producto con nombre propio.

---

## D-029 · "Interesado avisado": el Indicio y la Promesa registran si el tercero sabe que le van a llamar

**Status:** CONFIRMED (decisión del equipo fundador por delegación del fundador: "mira qué hace la competencia, mejóralo y toma tú las decisiones")
**Date:** 2026-09-13

**Context.** El análisis de competencia (`docs/16`) muestra que la mejor definición operativa de calidad de un referido en el sector es la de BNI: un referido es real cuando el miembro "le ha dicho al tercero que le llamarán" y el tercero espera la llamada. NS medía la relación del cedente con el Interesado pero no este hecho concreto.

**Choice.** El Indicio incorpora `third_party_expects_contact` en la capa 0 (no es identidad). El Agente lo detecta en el texto ("le he dicho que le llamarán", "espera vuestra llamada"), el formulario lo pregunta con una casilla, la tarjeta de Cesión lo muestra como distintivo "Interesado avisado", la Promesa lo incluye como componente propio y el Encaje lo usa como evidencia (eleva la fuerza de relación a 0,85 como mínimo).

**Why.** Es el dato que separa una pista de una Cesión de verdad. Mejora sobre BNI: no es una casilla, es un dato contrastado por el Agente que pesa en el Mérito y que el cesionario ve antes de aceptar.

**Consequences.** Cambios en `core/types`, `core/scoring`, `core/merit`, proveedor determinista, formulario de Indicio, tarjeta. Los Indicios de Rastreo (D-031) nunca llevan Interesado avisado.

**Revisit when.** Tras 50 Cesiones cerradas, para medir si el aviso predice la conversión.

---

## D-030 · El Reloj de la Sala ejecuta los plazos y el Agente empuja cuando el hilo pierde impulso

**Status:** CONFIRMED (por delegación del fundador)
**Date:** 2026-09-13

**Context.** Boardy Pro demuestra que el seguimiento activo (empujar el hilo cuando pierde impulso, recordar, agendar) es lo que convierte introducciones en negocio. NS tenía los plazos diseñados en D-024 pero ningún mecanismo los ejecutaba.

**Choice.** Un servicio determinista e idempotente, el **Reloj de la Sala** (`services/clock.ts`), que: recuerda a las 72 horas de revisión; caduca a los 7 días con `RESPONSE_LATE` para quien calló (la Cesión vuelve al cedente); marca la respuesta tardía a las 48 horas del Puente sin hito; y pregunta por el seguimiento cada 14 días. Cada acción deja un evento en la Mesa (privado para el afectado) y su Mérito. Se ejecuta al cargar Hoy (máximo una vez cada 10 minutos por proceso) y con `pnpm clock`; en el servidor será una tarea programada diaria.

**Why.** Sin plazos ejecutados, el compromiso de 48 h y la caducidad de 7 días eran texto. Mejora sobre Boardy: el empujón lo recibe siempre el Timonel, nunca el Interesado; ningún Agente contacta con terceros.

**Consequences.** Columnas `reminder_sent_at`, `late_flagged_at`, `last_nudge_at` en Cesiones (migración 0001). Nuevos eventos `REMINDER`, `EXPIRED`, `RESPONSE_LATE`, `CHECK_IN`. El léxico incorpora "Reloj de la Sala".

**Revisit when.** Se mida el efecto de los recordatorios en el tiempo de respuesta real.

---

## D-031 · Rastreo público: el Agente convierte señales de fuentes públicas en Indicios en borrador para otros titulares

**Status:** CONFIRMED (por delegación del fundador)
**Date:** 2026-09-13

**Context.** Clay, Common Room y similares viven de señales de compra (nueva sede, contrataciones, financiación, cambio de dirección) que en España están en fuentes públicas: BORME, licitaciones (PLACE), licencias de obra municipales, ofertas de empleo y prensa local. Ninguna de esas herramientas termina en una introducción cálida dentro de un club. El banco de ideas (`docs/11`, A1) ya lo preveía como "Rastreo".

**Choice.** El Agente de cada empresa rastrea una fuente (`PublicFeed`) y crea Indicios en borrador con fuente `PUBLIC_RECORD`, relación "débil" y sin Interesado avisado, para otros titulares de la Sala. El Timonel los ve en Hoy ("Rastreo") y decide si los publica: si lo hace, es el cedente y gana Mérito si la Cesión prospera. Deduplicación por referencia externa (`public_records`). En v0.1 la fuente es un lote de ejemplo verosímil (`SampleFeed`); los adaptadores reales (BORME vía datos.gob.es, PLACE, portales municipales, empleo) implementan la misma interfaz y se añaden uno a uno.

**Why.** Convierte a cada Agente en prospector para los demás, que es la promesa central de NS ("mientras tú trabajabas, tu red seguía trabajando"). Mejora sobre Clay: la señal acaba en una Cesión con doble visto bueno, no en un correo frío.

**Consequences.** `agents/rastreo.ts`, tabla `public_records`, sección Rastreo en Hoy, botón "Rastrear fuentes públicas ahora" (en el servidor lo lanza el Reloj cada mañana). Un Indicio de Rastreo publicado que no genera ninguna Pista queda como necesidad sin cobertura, útil para la Antesala.

**Revisit when.** Se conecte la primera fuente real; entonces se fijan frecuencia, filtros por zona y límites de volumen por Agente (para no inundar la Mesa).

---

## D-032 · Encargo: lo que cada titular busca ahora es un objeto visible en la Sala que los Agentes usan para priorizar

**Status:** CONFIRMED (por delegación del fundador)
**Date:** 2026-09-13

**Context.** En BNI cada miembro dice cada semana "el referido que busco es..." y se pierde al terminar la reunión. El léxico ya tenía "Encargo" (`DemandPosting`) sin implementación.

**Choice.** Tabla `demands`: texto, señal (trigger) opcional, industria opcional, vigencia (90 días por defecto), estado. El titular los publica y cierra desde su Dossier; la Sala los ve en Mi Sala. La Mesa consulta los Encargos abiertos del cesionario candidato: si uno coincide con el Indicio, la componente de prioridad estratégica del Encaje sube al máximo y el Fundamento lo dice ("Responde a tu Encargo abierto: ...").

**Why.** El Encargo trabaja los siete días, no solo en el Pleno, y da a los Agentes una señal de demanda explícita que el ADN estático no tiene.

**Consequences.** `services/demands.ts`, migración 0001, UI en Dossier y Mi Sala, evento `DEMAND_POSTED`. El Comunicado semanal (Protocolo II) incluirá los Encargos vigentes cuando se implemente.

**Revisit when.** Haya datos sobre cuántas Cesiones responden a Encargos frente a las que nacen del ADN.

---

## D-033 · Beta privada en networkspain.com: portada pública en modo beta, demostración tras usuario y contraseña compartidos, candidaturas guardadas

**Status:** CONFIRMED (propuesta del fundador, diseño del equipo fundador)
**Date:** 2026-09-13

**Context.** El fundador dispone del dominio networkspain.com (sin publicar) y quiere enseñar NS a empresarios sevillanos: una demo con usuario y contraseña, y una pantalla pública en modo beta.

**Choice.**

- **Portada pública** en `/`: la narrativa de la constitución (§23) en modo beta privada, la disponibilidad real de plazas de NS Cumbre leída de la base de datos, y una **candidatura** ("Solicitar plaza en la beta") que se guarda en `beta_requests` para que la Directiva la revise. No crea cuentas ni Agentes.
- **Puerta de la demo**: todo lo demás exige una sesión creada en `/acceso` con un usuario y una contraseña compartidos definidos por variables de entorno (`DEMO_USER`, `DEMO_PASSWORD`, `DEMO_SESSION_SECRET`). La cookie es un HMAC del secreto y la contraseña vigente: cambiar la contraseña expulsa a todos. La comprobación se hace en el proxy y, además, en cada página y Server Function (`requireDemo`).
- **Aviso permanente** dentro de la app: "Beta privada · datos ficticios de demostración", con salida.
- **Un solo despliegue** en networkspain.com sirve portada y demo. Cuando exista producción, la demo pasará a un subdominio (demo.networkspain.com) y networkspain.com será la web pública definitiva.

**Why.** Enseñar el producto en una dirección real cambia la conversación con un empresario. La candidatura desde la portada empieza a llenar la Antesala antes de que exista el producto completo. La puerta compartida es suficiente para una demo con datos ficticios y se sustituye por autenticación real antes de producción (condición 1 de `docs/17`).

**Consequences.** `src/proxy.ts`, `src/lib/auth.ts`, `/acceso`, portada en `/`, grupo de rutas `(app)` con su propio layout y barra de beta, tabla `beta_requests` (migración 0002), `.env.example`. `docs/17` incorpora los pasos concretos para Vercel y Neon con networkspain.com.

**Revisit when.** Se implemente la autenticación real por Timonel (la puerta compartida desaparece) o el número de candidaturas exija una pantalla de Directiva para gestionarlas.

---

## D-034 · Marca fuera de España: "NS Network" como paraguas por defecto; una marca europea nueva solo si la comprobación lo obliga

**Status:** CONFIRMED (el fundador sigue la recomendación del equipo fundador)
**Date:** 2026-09-13

**Context.** El fundador tiene registrada en España "NS Network Spain" y el dominio networkspain.com. Preguntó qué hacer con la marca si el proyecto sale de España, si tendría sentido un dominio inventado (nsnetworld.com; nsnetwork.com está ocupado) y si, en caso extremo, habría que crear una marca europea nueva que englobe a NS Network Spain.

**Options.**

1. Una sola marca global, "NS Network", con el país como etiqueta (NS Network Spain, NS Network Portugal).
2. Una marca europea nueva como paraguas, con NS Network Spain como marca de España bajo licencia.
3. Sustituir NS por completo.

**Choice.** Opción 1 por defecto. La opción 2 queda como vía de escape, y solo se abre por uno de estos dos motivos: que la búsqueda en la oficina europea de marcas (EUIPO) muestre que "NS Network" no puede registrarse por un conflicto serio, o que un socio de otro país exija otra bandera. La opción 3 se descarta.

Pasos fijados, en orden:

- **Ya:** no explicar nunca en público qué significan las siglas NS, para que no queden ancladas a "Network Spain". El logotipo sigue mostrando "NS Network" con el país debajo, como hace la portada.
- **Próximas semanas (coste casi nulo):** comprobar disponibilidad de "NS Network" en EUIPO (búsqueda gratuita o una tarde de un agente de marcas) y reservar dos o tres dominios paraguas que estén libres, por este orden de preferencia: ns.network, nsnetwork.global, nsnetwork.eu, ns-network.com. Comprobar si nsnetwork.com está simplemente aparcado y en venta a un precio razonable. Todos redirigen a networkspain.com hasta que exista un segundo país. Descartado nsnetworld.com: rompe la marca, "Networld" ya es marca de terceros y no transmite el posicionamiento.
- **Antes de que NS aparezca en prensa con empresas reales (entre Fase 1 y Fase 3):** registrar la marca de la Unión Europea "NS Network" en las clases de servicios de negocio y networking empresarial y de software como servicio.
- **Al entrar en cada país fuera de la UE:** extender la marca por el sistema internacional (Madrid) apoyándose en el registro europeo.
- **Estructura cuando haya varios países:** una sociedad matriz posee la tecnología y la marca paraguas; cada país opera bajo licencia como "NS Network [país]". Decisión societaria y fiscal para su momento, con abogado.

**Why.** Dos letras pierden su origen con el uso (BNI, IBM, SAP): fuera de España "NS" se lee como un nombre, no como "Network Spain". Una sola red con un solo nombre acumula todo el prestigio y evita que una Embajada en Red entre Sevilla y Lisboa muestre dos marcas. Lo que protege el proyecto no es el nombre sino NS-ARP, el método, el ADN acumulado y el grafo: el nombre es lo más barato de cambiar; la red, lo más caro. Los dominios son un complemento; la protección la da el registro.

**Consequences.** Ningún cambio de código: la marca ya se presenta como "NS Network" + país. `docs/17` enlaza esta decisión en el apartado de dominio. El léxico no expande las siglas.

**Revisit when.** Se conozca el resultado de la búsqueda en EUIPO (es la bifurcación) o se decida la entrada en el primer país fuera de España.

---

## D-035 · Antesala: la Directiva despacha las candidaturas con el veredicto de plaza ya calculado

**Status:** CONFIRMED (delegado por el fundador: "vamos a por la 2, haz magia")
**Date:** 2026-09-13

**Context.** Desde D-033 la portada guarda candidaturas ("Solicitar plaza en la beta"), pero no existía ninguna pantalla para verlas ni despacharlas. En cuanto la demo se publique en networkspain.com, llegarán solicitudes reales. La constitución fija el proceso de admisión (§8) y el Escenario E (conflicto de categoría → revisión, otra Sala, lista de espera o rechazo).

**Choice.** Pantalla **Antesala**, visible solo para la Directiva, con estas reglas:

- **Estados de una candidatura:** Nueva → Contactada → Entrevistada → Plaza aprobada → Titular activo; con salidas a En la Antesala (espera plaza) y Declinada (reabrible). Las transiciones válidas están fijadas en código; el alta desde una candidatura aprobada la cierra como "Titular activo" y la enlaza con la empresa creada.
- **Veredicto de plaza automático**, calculado contra el estado real de la Sala en cada visita: plaza vacante; vacante con reservas (se solapa con una plaza ocupada según NS-CAT, posible duplicado, o ciudad fuera de la zona); plaza ocupada (nombra al titular); sin clasificar. Cada veredicto lleva una recomendación en una línea, en lenguaje de la Directiva.
- **Nunca se aprueba una plaza ocupada.** El botón se desactiva y el servicio lo rechaza aunque se fuerce. Con la plaza ocupada, las salidas son la Antesala, otra Sala de la zona o revisar la especialidad real (Escenario E).
- **Solapamiento (Escenario E).** Si la especialidad solicitada se solapa con una plaza ocupada (por ejemplo Telecomunicaciones ↔ Ciberseguridad, Arquitectura ↔ Obra industrial), la plaza sigue siendo aprobable, pero la Antesala pide confirmar con el titular afectado antes de aprobar. Se comprueba en las dos direcciones del solape.
- **Clasificación y nota privada.** La Directiva puede reclasificar la candidatura en NS-CAT y dejar una nota privada. La nota nunca sale de la Directiva.
- **Rastro.** Toda decisión escribe un evento de auditoría; aprobar y declinar son significativos y aparecen en la Mesa Permanente.
- **Aviso.** Hoy muestra a la Directiva cuántas candidaturas esperan; el menú lleva un contador de nuevas.

**Why.** Convierte la puerta de entrada en un proceso con criterio: la exclusividad de plaza se aplica en la admisión, no después. La Directiva decide con un toque porque el sistema ya hizo la comprobación, que es el patrón de todo NS (la IA descubre y comprueba; las personas deciden). Las candidaturas con plaza ocupada alimentan la Antesala de la zona, que es la semilla de la siguiente Sala.

**Consequences.** `services/antesala.ts`, ruta `/antesala` con acciones, columnas nuevas en `beta_requests` (migración 0003), prefijado del alta desde una candidatura aprobada, seis candidaturas de demostración (una por veredicto), pruebas y recorrido de navegador ampliado. En producción, la Antesala será la primera pantalla de la Directiva que exija autenticación real por rol.

**Revisit when.** Exista la entrevista del ADN por el Agente (el paso "Entrevistada" pasará a apoyarse en ella) o haya varias Salas en la zona (la salida "otra Sala" tendrá destino real).

---

## D-036 · Ronda: los Agentes hacen su pasada cada mañana sin que nadie abra la aplicación

**Status:** CONFIRMED (delegado por el fundador: "sigue con el 4")
**Date:** 2026-09-13

**Context.** El Reloj de la Sala (D-030) y el Rastreo (D-031) se ejecutaban solo cuando alguien abría Hoy o pulsaba un botón. Eso contradice la promesa central de NS: la red trabaja mientras el Timonel no está. En el servidor hace falta que ocurra sola cada mañana.

**Choice.** Una **Ronda** diaria, para todas las Salas, en este orden:

1. Reloj de la Sala: recordatorios, caducidades, respuestas tardías y check-ins.
2. Rastreo con el Agente de cada empresa activa. Los registros nuevos se reparten: empieza el Agente que menos ha rastreado hasta ahora, para que los Indicios en borrador no caigan siempre en el mismo Timonel.
3. Un evento "Ronda" por Sala en la Mesa Permanente, visible para todos, con el resumen de lo hecho. Si no hubo nada que hacer, no se escribe nada.

La Ronda es idempotente: se puede lanzar varias veces al día sin efectos dobles. La lanza el alojamiento cada mañana mediante la ruta `GET /api/clock`, definida en `vercel.json` (06:00 UTC, es decir, a las 8 de la mañana en verano y a las 7 en invierno). La ruta está protegida por `CRON_SECRET`, que el alojamiento envía como cabecera; sin secreto configurado, en producción la ruta no se ejecuta. En local, `pnpm clock` hace lo mismo. El Reloj al abrir Hoy se mantiene como red de seguridad de la demo.

**Why.** Es la pieza mínima que hace verdad "mientras tú trabajabas, tu red seguía trabajando". Separar la Ronda del Reloj permite añadirle más tareas de mañana (Comunicado semanal, Brújula, Gaceta) sin tocar el alojamiento. El reparto equitativo del Rastreo evita que el Mérito de los Indicios públicos se concentre en una empresa por accidente de orden.

**Consequences.** `services/ronda.ts`, `app/api/clock/route.ts`, `vercel.json`, variable `CRON_SECRET`, `pnpm clock` pasa a ejecutar la Ronda, exclusión de la ruta en la puerta de la demo, etiqueta "Ronda" en la Mesa, cinco pruebas nuevas. La entrada en el léxico.

**Revisit when.** Se conecte la primera fuente real de Rastreo (la Ronda deberá limitar el volumen por Agente) o el Protocolo II exija una Ronda semanal además de la diaria.

---

## D-037 · Apunte: el Timonel mete un posible referido en la memoria de su Agente en treinta segundos, desde el móvil

**Status:** CONFIRMED (petición del fundador: "una acción importante")
**Date:** 2026-09-13

**Context.** Los mejores referidos nacen en la calle: en una visita, en una feria, en una conversación casual. Si el Timonel tiene que esperar a sentarse ante un formulario, se pierden. El fundador pide un apartado, sobre todo en móvil pero no en exclusiva, para anotar de inmediato nombre de empresa o persona, persona de contacto, necesidad y observaciones, y que entre en la memoria del Agente en el acto.

**Choice.** El **Apunte**:

- Pantalla `/apunte` pensada para el móvil: dos campos obligatorios (quién y qué necesita), tres fichas para la relación (es mi cliente, lo conozco, me lo han contado), un interruptor "ya sabe que le llamarán" (D-029) y, plegados, persona de contacto y observaciones. Botón grande "Guardar en mi Agente".
- Acceso permanente: botón flotante "Apuntar" en todas las pantallas de la app, atajo en Hoy, y acceso directo desde la pantalla de inicio del móvil (la app se puede "añadir a inicio" y el icono ofrece "Apuntar un referido").
- El Apunte entra en el circuito normal de NS-ARP como Indicio en borrador con fuente `APUNTE`: el Agente lo lee, detecta necesidades y plazas, y lo deja en Hoy ("Tus Apuntes"). La confirmación muestra lo que el Agente ha entendido y ofrece publicar en la Sala con un toque, apuntar otro o ver la previsualización. **Nunca se publica solo.**
- La relación elegida alimenta la fuerza de relación del Indicio; el nombre de la persona de contacto se guarda solo en la capa 2, sin base jurídica hasta que el Timonel la declare en la Apertura.

**Why.** Es la puerta de entrada más natural del negocio real a la red: convierte el "me acabo de enterar de algo" en trabajo del Agente sin fricción. Reutiliza todo el protocolo (extracción, privacidad, Mesa) en lugar de crear un cajón aparte.

**Consequences.** `services/apunte.ts`, ruta `/apunte`, botón flotante, `manifest.webmanifest` con atajos, sección "Tus Apuntes" en Hoy, fuente `APUNTE` en `business_signals`, pruebas. CLAUDE.md §22 incorpora el Apunte como prioridad móvil.

**Revisit when.** Exista dictado por voz o captura desde una foto de tarjeta, o el Agente pueda hacer preguntas de seguimiento sobre el Apunte (entrevista corta).

---

## D-038 · Fuentes propias: cada Timonel añade direcciones a su Agente y la Ronda las lee cada mañana

**Status:** CONFIRMED (petición del fundador)
**Date:** 2026-09-13

**Context.** El Rastreo (D-031) lee fuentes públicas de NS. El fundador quiere además que cada Timonel pueda ir incluyendo fuentes a su Agente para que rastree a diario: el medio local que él sigue, el boletín de su asociación, el portal de licitaciones de su sector.

**Choice.**

- Cada empresa tiene una lista de **fuentes propias** (hasta 12): nombre y dirección de un canal RSS o Atom. Se gestionan en el Dossier ("Fuentes de mi Agente"), con el estado de la última lectura y un botón "Leer mis fuentes ahora".
- La Ronda (D-036) las lee cada mañana después de las fuentes públicas, con el mismo circuito del Rastreo: cada entrada con posible negocio se convierte en Indicio en borrador para el Timonel que añadió la fuente, con fuente `FUENTE_PROPIA` y deduplicada por referencia estable. Las entradas sin necesidad detectable se descartan en silencio.
- Un fallo de lectura (dirección caída, formato no reconocido) se anota en la fuente y no detiene la Ronda. Solo se admiten direcciones públicas http/https.
- El lector de RSS/Atom es propio y mínimo, sin dependencias; la misma interfaz (`PublicFeed`) servirá para los adaptadores de BORME, PLACE, licencias y empleo.

**Why.** Convierte al Agente en un lector personalizado del mundo de cada Timonel, y hace que el Rastreo crezca con la red sin esperar a integraciones oficiales. Quien más fuentes buenas aporta, más Indicios genera para los demás y más Mérito acumula.

**Consequences.** Tabla `agent_sources` (migración 0004), `agents/feeds.ts`, `services/sources.ts`, sección en el Dossier, la Ronda incluye las fuentes propias, pruebas con lectores simulados. En este entorno de desarrollo no hay salida a internet, así que la lectura real solo se comprueba en el servidor.

**Revisit when.** Se conecten las fuentes oficiales (BORME, PLACE) o el volumen exija límites por fuente y filtros por zona o palabras clave.

---

## D-039 · NS se instala en el móvil como una app, con el número de decisiones pendientes en el icono

**Status:** CONFIRMED (petición del fundador: "haz todo lo que me propones")
**Date:** 2026-09-13

**Context.** El fundador quiere que la versión móvil sea como una app descargable e instalable en el escritorio del móvil, con el icono de NS, y que avise cuando haya algo pendiente, con un número. Sin pasar por App Store ni Google Play en la beta.

**Choice.** NS es una aplicación web instalable (PWA):

- **Instalación** desde el navegador, sin tienda: en Android "Instalar aplicación", en iPhone "Añadir a pantalla de inicio". Iconos PNG de 192 y 512 píxeles (generados del monograma), icono para iOS, pantalla completa, arranque en Hoy y atajo "Apuntar un referido".
- **Invitación la primera vez**, en Hoy, fuera de la app instalada: en Android un botón "Instalar"; en iPhone las instrucciones de Safari. Se puede descartar y no vuelve a aparecer.
- **Número en el icono** con lo que espera el toque del Timonel: Cesiones por decidir, Apuntes por publicar y, para la Directiva, candidaturas nuevas (`pendingDecisions`). Se pinta al abrir cualquier pantalla y se refresca cada minuto mientras la app está visible (`GET /api/pending`). Donde el sistema no admite número en el icono, va en el título de la pestaña.
- **Avatar vivo**: dentro de la app, el segmento de contacto del Agente late cuando espera una decisión o ha encontrado algo, con la animación desactivada si el usuario pide menos movimiento. El icono del escritorio del móvil no se mueve: ningún sistema lo permite, y se le ha explicado al fundador.
- **Notificaciones push** ("Tu Agente tiene una Cesión para ti"), con sonido y banner aunque la app esté cerrada: decididas, pendientes de implementar después de la entrevista del Agente y del despliegue en networkspain.com, porque exigen el dominio publicado y una política de qué merece aviso.
- **App nativa en tiendas**: no en la beta. Se podrá envolver la misma aplicación más adelante.

**Why.** Da la experiencia de app (icono, pantalla completa, número, atajo) con cero fricción de instalación y sin revisión de tiendas, y usa la misma aplicación y el mismo código. El número en el icono convierte el móvil en el sitio donde se toman las decisiones de treinta segundos.

**Consequences.** `manifest.ts` con iconos PNG, `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `scripts/icons.mjs` para regenerarlos, `app-badge.tsx`, `install-hint.tsx`, `api/pending`, `pendingDecisions` en `services/today.ts`, animación del avatar, pruebas.

**Revisit when.** Se implementen las notificaciones push (la política de avisos) o se decida la app en tiendas.

---

## D-040 · Entrevista del Agente: el ADN de Empresa se construye conversando, no rellenando un formulario

**Status:** CONFIRMED (delegado por el fundador: "haz magia")
**Date:** 2026-09-13

**Context.** CLAUDE.md §25 exige un onboarding extraordinario: el Agente entrevista inteligentemente a la empresa en lugar de pedir 80 campos. Hasta hoy el alta era un formulario mínimo, y `docs/17` lo señalaba como condición 5 para producción. La calidad de las Cesiones depende del ADN.

**Choice.**

- **Alta en dos tiempos.** El alta de la plaza pide solo lo imprescindible (plaza, empresa, Timonel, web, una frase de qué hace) y crea un ADN **sin validar**. Inmediatamente empieza la **entrevista** con el Agente. El Dossier y Hoy avisan mientras el ADN siga sin validar.
- **Entrevista conversacional**, una pregunta por turno, en el orden de §25: qué hace y dónde; servicios y lo que no hace; cliente ideal (sectores, tamaño, zonas, quién decide); señales que anticipan una oportunidad; ticket mínimo y máximo, ciclo y capacidad; el referido perfecto con un ejemplo real; lo que nunca quiere recibir; cómo prefiere que le presenten; qué no se comparte nunca; objetivo del trimestre. El Timonel responde en lenguaje natural, salta lo que no sabe y puede dejarlo para otro día.
- **El ADN se construye a la vista.** Junto a la conversación, "Lo que tu Agente sabe ya" se actualiza con cada respuesta y dice qué falta. Cada turno del Agente muestra en una línea lo que ha aprendido.
- **Lectura de la web.** Antes de la primera pregunta, el Agente lee la web de la empresa (título, descripción, texto visible) y no pregunta lo que ya está escrito.
- **Validación humana.** Nada cambia en el ADN de la empresa hasta que el Timonel pulsa "Validar mi ADN y activar": entonces se crea una versión nueva, validada, y queda un evento significativo en la Mesa. Una entrevista se puede repetir para ampliar un ADN ya validado: parte de lo que se sabe.
- **Dos conductores, un contrato.** Con clave de Anthropic, Claude conduce la entrevista con salida estructurada validada (pregunta, tema, ADN actualizado, aprendido, progreso), con la instrucción de no inventar nunca cifras ni clientes. Sin clave, un guion determinista con las mismas diez preguntas que entiende listas, cifras en euros, ciudades y señales. La interfaz y las pruebas son idénticas para ambos.

**Why.** Un empresario no rellena ochenta campos, pero sí contesta a un director comercial que pregunta bien. La conversación produce ADN más rico (ejemplos reales, exclusiones, referido perfecto) que ningún formulario, y es el primer momento en que el Timonel siente que su Agente trabaja para él. Mantener el guion determinista garantiza que la demo y las pruebas funcionan sin red y que el producto no depende de un solo proveedor.

**Consequences.** Tabla `dna_interviews` (migración 0005), `agents/interview-script.ts`, método `interview` en el contrato del proveedor y en ambos proveedores, `services/entrevista.ts`, `lib/website.ts`, ruta `/entrevista`, alta simplificada que desemboca en la entrevista, avisos en Dossier y Hoy, pruebas. Condición 5 de `docs/17` cumplida en su primera versión.

**Revisit when.** Se conecte el Agente a fuentes autorizadas (CRM, correo) para preguntar menos y proponer más, o se añada dictado por voz en el móvil.

---

## D-041 · Fundación: la empresa con plaza ocupada promueve la siguiente Sala y, si reúne el mínimo, recibe una gratificación

**Status:** CONFIRMED (regla fijada por el fundador)
**Date:** 2026-09-14

**Context.** Cuando una empresa pretende entrar en una Sala y su plaza (misma especialidad NS-CAT, base CNAE) ya está ocupada, NS no debe perderla. `docs/12` §2.2 preveía abrir una Sala nueva cuando hubiera 12–15 admitidas en espera; faltaba decir quién empuja y qué gana.

**Choice.** Regla del fundador: **NS ayuda a esa empresa a promover, promocionar e iniciar una nueva Sala**. Si consigue el número mínimo de fundadoras que se exija (a determinar en la práctica), como compensación recibe una **gratificación**, por ejemplo unos meses de cuota gratis u otra que NS anuncie.

Cómo se aplica en el producto:

- **Promotora.** En la Antesala, toda candidatura con plaza ocupada ofrece "Promotora de nueva Sala". Al aceptarlo, la candidatura pasa al estado "En fundación" y nace una **Sala en fundación** en la zona, con su mínimo y su gratificación anunciada.
- **Fundadoras.** Las demás candidaturas (sobre todo las que también tienen la plaza ocupada) se suman a la Sala en fundación desde su ficha. Una plaza por especialidad también antes de nacer: no entran dos fundadoras de la misma especialidad.
- **Mínimo.** Es un parámetro de cada fundación (por defecto 12, D-006), no una constante del código, porque se ajustará en la práctica. La Antesala muestra el progreso ("7 de 12") y las especialidades ya cubiertas. Al alcanzarlo, la fundación pasa a "lista".
- **Fundar.** La Directiva funda la Sala con un nombre propio: prefijo NS, nunca una ciudad, barrio, provincia, región ni país (D-014, comprobado en código), único en la red. Se crea la Sala en estado "en formación" con el nombre pendiente de autorización de NS y todas sus plazas vacantes; las fundadoras pasan a "Plaza aprobada" para darlas de alta en la Sala nueva.
- **Gratificación.** Se concede en el momento de fundar, no al alcanzar la cuenta, y queda registrada en la Mesa. El texto por defecto ("3 meses de cuota gratis para la Promotora") es una propuesta: el fundador fija la definitiva y NS la anuncia públicamente. Nunca es dinero por referidos (D-010) ni condiciona ninguna Cesión.
- **NS promociona.** La portada explica la vía a quien tiene la especialidad ocupada. Falta, para más adelante, el kit de promoción de la Promotora (página propia de la Sala en fundación, invitaciones, seguimiento).

**Why.** Convierte cada "plaza ocupada" en una fuerza de captación: quien más interés tiene en entrar es quien mejor recluta. Alinea el crecimiento del número de Salas (docs/12) con un incentivo explícito, público y ajeno al circuito de referidos.

**Consequences.** Tabla `chapter_foundings` y columna `founding_id` en candidaturas (migración 0006), estado "En fundación", `services/fundacion.ts`, sección "Salas en fundación" y botones en la Antesala, alta en una Sala recién fundada, aviso en la portada, Sala en fundación de demostración (Correduría Giralda como Promotora, 3 de 12), pruebas.

**Revisit when.** Se conozca el mínimo real tras las primeras fundaciones, se fije la gratificación definitiva, o se construya el kit de promoción de la Promotora.

---

## D-042 · Compromiso: mínimo de 1 Cesión válida por semana, sin excusas; cuatro semanas sin ceder suponen la baja de la titularidad (aviso diplomático en la 2.ª, aviso formal en la 3.ª, notificación de baja en la 4.ª)

**Status:** CONFIRMED (regla fijada por el fundador)
**Date:** 2026-09-14

**Context.** D-010 dejó la regla inmutable de aportación mínima con los parámetros pendientes: número, periodo y escalera de consecuencias. Hasta hoy la especificación hablaba de un "Ejercicio" por estipular (mes o trimestre), de un Ritmo de NS "propuesto" de 1 por semana y de una escalera larga con plan de contribución y plaza en revisión. El fundador fija los parámetros y los endurece.

**Choice.** Regla del fundador, literal en lo esencial:

- **Mínimo: 1 Cesión válida a la semana.** Válida es la que el cesionario acepta (transición a `APPROVED`, momento en que ya cuenta para el Compromiso según D-024) y que NS puede auditar. El mínimo es el suelo de NS; una Sala puede fijar un Ritmo mayor, nunca menor.
- **Con el mínimo se cumple, pero nunca se destaca.** NS promueve que cada titular ceda **varias** Cesiones **a varias especialidades**. El Mérito semanal lo refleja: base por cumplir y un plus por cada especialidad distinta a la que se cede. La Brújula lo dice con esas palabras cuando el titular cumple con una sola.
- **No se debe fallar, sin excusas.** Cada semana completa sin una sola Cesión válida consta en la Balanza y en la Brújula y resta en la Hoja de Méritos. No hay periodos de gracia, planes de contribución ni plazas en revisión.
- **Escalera de cuatro semanas seguidas sin una sola Cesión válida:**

```text
Semana 1   Constancia: la Balanza y la Brújula lo muestran; el Agente propone Movimientos.
Semana 2   Aviso diplomático del Agente al Timonel.
Semana 3   Aviso formal de la Directiva: aportar lo antes posible. Lo ven la empresa y la Directiva.
Semana 4   Notificación de baja de la titularidad. La empresa queda suspendida y su plaza vuelve a la Antesala.
```

- **Una Cesión válida pone la cuenta a cero.** La escalera cuenta semanas seguidas; cualquier semana cumplida la reinicia.
- **Ejecución de la baja.** La notificación es automática y sin excepciones. *(Modificado por D-044: la Directiva de la Sala propone la baja y NS la confirma; desde la notificación la empresa sale de la Mesa de esa Sala y su Timonel pierde el acceso; la plaza queda bloqueada hasta la confirmación.)*
- **Semana y primera semana.** La semana va de lunes a domingo (UTC). La semana de alta no cuenta: la primera semana completa en la Sala es la primera evaluada. Se evalúa cada mañana en la Ronda, una sola vez por titular y semana.
- **Coherencia con el resto.** El Ritmo (D-019) deja de ser "propuesta" y pasa a ser 1 por defecto, con la Sala pudiendo subirlo. El "Ejercicio" sigue existiendo para la Promesa, la cuota por Tramos (D-025) y la Embajada, pero el Compromiso ya no se mide por Ejercicio sino por semana. El Comunicado (D-018) mantiene su propia escalera, más suave, y solo "el incumplimiento reiterado" llega a la de D-042.

**Why.** Un club en el que se puede no ceder durante un mes sin consecuencias no es un club de contribución. La escalera corta y pública convierte la regla inmutable 2 en algo que se cumple sin esfuerzo la inmensa mayoría de las semanas, porque el Agente trabaja para ello, y que libera la plaza rápido cuando una empresa no aporta. El plus por especialidades distintas empuja hacia el comportamiento que hace red: ceder a muchos, no solo al vecino de plaza.

**Consequences.** Nuevo `apps/web/src/core/compromiso.ts` (reglas puras: escalera, semana, Mérito semanal), tabla `contribution_weeks` (migración 0007), `services/compromiso.ts` (evaluación semanal idempotente, avisos, notificación de baja, ejecución por la Directiva, estado para Brújula y Balanza), paso 5 del Reloj de la Sala dentro de la Ronda, tarjeta de Compromiso en Hoy, columna Ritmo en la Balanza, sección "Bajas notificadas por Compromiso" en la Antesala, pruebas (`tests/compromiso.test.ts`). Documentación: regla inmutable 2 en `CLAUDE.md` y `00_NORTH_STAR.md`, léxico (Compromiso, Ejercicio, Aviso diplomático, Aviso formal, Baja), `14_PROTOCOLOS_DE_SALA.md` §5 y §4, NS-ARP pendiente 6 cerrado, `06_DATA_MODEL.md`, `11_IDEAS_DISRUPTIVAS.md` B8, `17_DESPLIEGUE.md`.

**Revisit when.** Nunca en cuanto a la regla. El plus de Mérito por especialidades distintas y el peso de cada peldaño se calibran tras cuatro semanas de la Sala piloto.

---

## D-043 · Toda empresa acepta de forma expresa todas las Normas NS al suscribirse como titular; sin aceptación no hay alta

**Status:** CONFIRMED (regla fijada por el fundador)
**Date:** 2026-09-14

**Context.** D-010 y D-025 ya decían que las reglas se comunican en la web, en la Candidatura y en el onboarding y que "el solicitante las acepta expresamente antes de la admisión", pero no había mecanismo: el alta creaba la empresa sin registrar ninguna aceptación. Con D-042 la regla del Compromiso tiene consecuencias duras (baja a la cuarta semana), y una consecuencia dura sin aceptación expresa previa es indefendible ante el miembro.

**Choice.**

- Existe un texto único y versionado de **Normas NS** (`apps/web/src/core/normas.ts`, versión `2026-09-14`): las cinco reglas inmutables (nunca contraprestación · Compromiso semanal con Escalera · calidad sobre cantidad · Comunicado semanal · Balanza pública) y la condición de la cuota por Tramos (D-025). Cada norma cita su decisión.
- **Aceptación expresa en el alta.** El formulario de alta de plaza muestra las Normas una a una, cada una con su casilla obligatoria, y el botón dice "Acepto las Normas NS". El servicio de alta rechaza cualquier alta cuya aceptación no incluya **todas** las normas de la **versión vigente** (`RulesNotAcceptedError`); no existe camino de alta sin aceptación, tampoco desde el seed ni desde una Sala recién fundada.
- **Registro.** Tabla `rules_acceptances` (migración 0008): Sala, empresa, Timonel que acepta, versión, códigos aceptados y fecha. El evento `MEMBER_ACTIVATED` de la Mesa lo menciona. El Dossier de la empresa muestra "Normas NS aceptadas de forma expresa (versión X) por [Timonel] el [fecha]".
- **Cambio de Normas.** Si cambia el texto, sube la versión. Las altas nuevas firman la nueva; para los titulares existentes queda pendiente (revisit) el flujo de re-aceptación con un toque en Hoy y plazo.
- **Web pública.** La portada enumera las Normas que se aceptarán al ocupar la plaza, para que nadie llegue al alta sin haberlas leído.

**Why.** La exclusividad, la Escalera y la expulsión por contraprestación solo son legítimas si el titular las aceptó a sabiendas, con constancia de qué aceptó y cuándo. Convertir la aceptación en una puerta del sistema (no un texto legal aparte) es privacidad y cumplimiento como arquitectura, coherente con §15 de la constitución.

**Consequences.** `core/normas.ts`, tabla `rules_acceptances`, campo obligatorio `acceptance` en `onboardCompany`, fieldset de Normas en `/sala/alta` y su acción, línea en el Dossier, portada, pruebas (`slice.test.ts`), seed y pruebas que ya aceptan todas las normas.

**Revisit when.** Se redacten los textos legales (`docs/08_SECURITY_PRIVACY_GDPR.md`, condición 4 de `docs/17`) o cambie cualquier Norma: entonces se define la re-aceptación de los titulares existentes.

---

## D-044 · La baja por Compromiso es por Sala: la empresa suspendida sale de la Mesa y pierde el acceso; la plaza queda bloqueada; la Directiva propone la baja y NS la confirma

**Status:** CONFIRMED (regla fijada por el fundador)
**Date:** 2026-09-14

**Context.** D-042 dejó la ejecución de la baja en manos de la Directiva y la auditoría de coherencia encontró tres cables sueltos: una empresa suspendida seguía recibiendo Cesiones en la Mesa, la plaza en expediente aparecía como disponible para una empresa nueva, y el Timonel de una empresa suspendida entraba en la aplicación como si nada. El fundador fija cómo debe ser.

**Choice.**

- **La expulsión es por Sala.** Una empresa suspendida sale de la Mesa y de la Sala donde no ha cumplido. Si la misma empresa es titular en varias Salas donde cumple, en esas Salas no cambia nada. En el modelo, cada titularidad es una fila de empresa por Sala, así que la suspensión no puede contagiarse.
- **Fuera de la Mesa desde la notificación.** El Matchmaker solo consulta Agentes de empresas activas de la Sala; una empresa suspendida no recibe Cesiones ni cualifica. Su Agente queda inactivo al confirmarse la baja.
- **Plaza bloqueada.** La plaza expedientada solo puede ocuparla otro titular cuando la baja de la anterior sea efectiva. La comprobación de plaza considera ocupada toda plaza con titular, activa o en expediente, y lo dice: "en expediente de baja; se libera cuando NS confirme".
- **La Directiva propone, NS confirma.** Dos toques: la dirección de la Sala (cuyo nombre y composición se fijarán más adelante) propone la baja a NS desde la Antesala; NS la confirma. Solo entonces la plaza queda vacante y vuelve a la Antesala y la empresa pasa a baja. En la aplicación, NS es un rol de persona (`is_network`); en la demo la misma persona hace de Directiva y de NS.
- **Sin acceso.** Desde la notificación, el Timonel no accede al panel de la Sala expulsada ni a su panel personal: cualquier pantalla le lleva a la de baja, que explica el estado, que afecta solo a esa Sala, y cómo hablar con la Directiva.

**Why.** Una baja que no saca a la empresa de la Mesa no es una baja, y una plaza que se puede ocupar antes de la baja efectiva crea dos titulares. Separar quién propone (la Sala, que conoce el caso) de quién confirma (NS, que vela por la red y por la igualdad de trato entre Salas) es la misma puerta humana de la constitución §7 con la responsabilidad en el sitio correcto.

**Consequences.** Estados de plaza `RELEASE_PENDING` (notificada) y `RELEASE_PROPOSED` (propuesta a NS); `members.is_network` (migración 0009); `proposeRelease` y `confirmRelease` en `services/compromiso.ts`; filtro de empresas activas en `agents/mesa.ts`; plaza en expediente no disponible en `services/onboarding.ts`; redirección a `/baja` en `requireMember`; pantalla `/baja`; Antesala con los dos pasos; pruebas.

**Revisit when.** Se fije el nombre y la composición de la dirección de la Sala, o se construya el panel de NS (hoy NS actúa desde la Antesala de la Sala).

---

## D-045 · Principio del núcleo: la calidad del negocio cedido vale más que la cantidad, siempre; y la documentación viva es la que existe

**Status:** CONFIRMED (regla fijada por el fundador)
**Date:** 2026-09-14

**Context.** El fundador pide memorizar y poner en el núcleo un principio que ya estaba en la regla inmutable 3, pero que con el Compromiso semanal y el Mérito necesita quedar por encima de cualquier métrica: la calidad del negocio cedido vale más que la cantidad. Siempre. En la misma sesión pide una propuesta de documentos para CLAUDE.md, porque la constitución exigía doce documentos de los que faltaban siete y el repositorio tiene otros que la constitución no nombra.

**Choice.**

- **Calidad sobre cantidad, siempre.** Queda en la constitución (principio no negociable 3 y regla inmutable 3), en el North Star, en las Normas NS que firma cada titular (versión `2026-09-14.2`) y en el código: `core/compromiso.ts` documenta que el Mérito semanal no crece con el número de Cesiones sino con su amplitud, y que el Mérito grande viene de la Promesa, el Veredicto y el Cierre de cada Cesión. Ninguna métrica, ranking, Balanza o Brújula de NS podrá premiar el número por encima de la calidad. Toda feature futura se evalúa contra esta frase.
- **Documentación viva real.** CLAUDE.md §3 pasa a listar los documentos que existen y su función, más los dos que faltan y son obligatorios antes de producción: `08_SECURITY_PRIVACY_GDPR.md` (condición 4 de `docs/17`) y `PENDIENTES_DEL_FUNDADOR.md` (creado hoy). Requisitos, roles, arquitectura de información y analítica no se separan en documentos propios: viven en NS-ARP, el léxico, los protocolos y `docs/12`; `05_DESIGN_BRIEF.md` sustituye a `05_DESIGN_SYSTEM.md`; el roadmap es `docs/17`.
- **Un solo sitio para lo que espera al fundador.** `docs/PENDIENTES_DEL_FUNDADOR.md` recoge todo lo que se ha dejado "para más adelante", con la decisión de origen. Claude lo recuerda cuando se le pide y cuando una feature lo toca.
- **"Compromiso" significa una sola cosa.** El plazo de 48 h para responder al Interesado pasa a llamarse **Plazo de respuesta**; "Compromiso" queda solo para el mínimo semanal.

**Why.** Un principio que está en el código y en lo que firma el titular no se pierde en una conversación. Una constitución que describe documentos inexistentes es una fuente de trabajo ficticio.

**Consequences.** CLAUDE.md §3 y reglas, `00_NORTH_STAR.md`, `13_LEXICO_NS.md`, `15_TARJETA_DE_CESION.md`, `core/normas.ts`, `core/compromiso.ts`, `services/clock.ts`, nuevo `docs/PENDIENTES_DEL_FUNDADOR.md`, README.

**Revisit when.** Nunca en cuanto al principio. La lista de documentos, cada vez que se cree o retire uno.

---

## D-046 · Valoración mensual del titular: para ser Embajadora hace falta al menos un 80 % durante un mes; con ese mismo umbral se es candidata a Director/a de Sala

**Status:** CONFIRMED (regla fijada por el fundador); componentes y pesos PROPOSED
**Date:** 2026-09-14

**Context.** La Embajada (D-015) y la dirección de la Sala necesitan un criterio verificable de quién merece representar una especialidad fuera de su Sala o dirigirla. El fundador fija el umbral: 80 % de valoración durante un mes. Faltaba definir qué es la Valoración de forma que no sea un número mágico (constitución §14) y que respete que la calidad vale más que la cantidad (D-045).

**Choice.**

- **Valoración** es un porcentaje mensual por titular y Sala, explicable componente a componente. Mide calidad y fiabilidad, nunca cantidad:

```text
Calidad de lo cedido     40 %   media de los Veredictos recibidos en el mes sobre Cesiones cedidas (Facilidad, Negocio, Trato sobre 15); necesidad falsa = 0
Compromiso semanal       25 %   semanas del mes con el Compromiso cumplido / semanas evaluadas
Plazo de respuesta       15 %   como cesionario: respuestas al Interesado en 48 h / Puentes recibidos
Comunicado semanal       10 %   Comunicados aprobados / semanas (sin datos hasta el Protocolo II)
Servicio a la red        10 %   solo suma: acciones de dirección del mes (3 = 100 %), ver D-048
```

- Los componentes sin datos en el mes no cuentan ni a favor ni en contra: su peso se reparte entre los que sí tienen datos. Sin datos en ningún componente no hay Valoración y no se cumple ningún umbral.
- **El mes que decide es el último completo.** La del mes en curso se muestra como orientación.
- **Embajada:** solo puede proponerse como Embajadora (D-015) una titular con Valoración ≥ 80 % en el último mes completo. El sistema lo verifica y lo muestra en el Dossier ("Apta para Embajada").
- **Candidatura a Director/a de Sala:** el mismo umbral. Cómo se elige y por cuánto tiempo queda en `PENDIENTES_DEL_FUNDADOR.md`. La figura pasa a llamarse **Director/a de Sala** (hasta hoy "Directiva", provisional).
- Pesos y umbral de acciones se calibran tras el primer mes de la Sala piloto.

**Why.** Un umbral público y explicable convierte la Embajada y la dirección en algo que se gana con comportamiento verificable, no con antigüedad ni volumen. Al medir Veredictos, Compromiso y plazos, premia exactamente lo que hace buena a una Cesión.

**Consequences.** `core/valoracion.ts` (cálculo puro), `services/valoracion.ts` (lectura del mes, `eligibleForEmbajada`), tarjeta de Valoración en el Dossier con desglose y las dos aptitudes, pruebas. Léxico: Valoración, Director/a de Sala.

**Revisit when.** Tras el primer mes completo de NS Cumbre, con Valoraciones reales; y cuando exista el Protocolo II (componente Comunicado con datos).

---

## D-047 · Una empresa con varios CNAE puede ocupar varias plazas en la misma Sala, cada una con su titularidad; NS premia con Mérito de Red que lleve cada especialidad a una Sala distinta

**Status:** CONFIRMED (regla fijada por el fundador)
**Date:** 2026-09-14

**Context.** `docs/12` §4 solo permitía una segunda plaza en la misma Sala de forma excepcional. El fundador decide lo contrario: se permite, pero se premia hacerlo en Salas distintas, porque cada plaza llevada a otra Sala ayuda a crear Salas.

**Choice.**

- **Titularidades múltiples en la misma Sala.** Una empresa con varias especialidades (varios CNAE) puede ocupar varias plazas en la misma Sala. Cada plaza es una titularidad: exclusividad propia, Compromiso propio. El Compromiso mínimo semanal de la empresa en esa Sala se multiplica por su número de plazas. Ceder algo pero menos que el mínimo consta como "Por debajo del mínimo" y resta Mérito, pero no sube la Escalera: la Escalera solo cuenta semanas sin una sola Cesión válida (D-042).
- **Mérito de Red.** Cuando la misma empresa (mismo CIF) ocupa plaza en otra Sala de la zona, recibe Mérito de Red al darse de alta, con constancia en la Mesa. El CIF se registra en el alta. Propuesta: +50 por Sala adicional.
- **Salas en fundación.** Una empresa con la segunda especialidad puede ser fundadora o Promotora de una Sala nueva (D-041) con esa especialidad; es la vía preferida y la que NS promociona en el Dossier junto al botón de "otra plaza".
- Se sustituye la casuística "empresa multiservicio" de `docs/12` §4.

**Why.** No hay razón para impedir que una empresa aporte todo lo que sabe hacer; sí la hay para empujarla a repartirlo por la zona, porque cada plaza en otra Sala densifica la red y adelanta la siguiente fundación.

**Consequences.** `addSeat` en `services/onboarding.ts`, capability secundaria, `companies.legal_id` (migración 0010), bono `NETWORK_SEAT_BONUS`, mínimo por titularidad y acción `BELOW` en el Compromiso, formulario "Ocupar también esta plaza" en el Dossier, pruebas. `docs/12` §4 actualizado.

**Revisit when.** Se conozca cuántas empresas piden segunda plaza en la Sala piloto y cuántas eligen otra Sala.

---

## D-048 · Los Directores/as de Sala promueven acciones entre Salas y resuelven dudas entre Timoneles, y eso suma Valoración

**Status:** CONFIRMED (regla fijada por el fundador)
**Date:** 2026-09-14

**Context.** Dirigir una Sala es trabajo para la red. Debe verse y contar.

**Choice.**

- Un Director/a registra en la Antesala sus **acciones de dirección**: "Acción entre Salas" (encuentros, cruces de plazas vacantes, Embajadas facilitadas) y "Duda resuelta entre Timoneles". Cada acción exige una frase (qué se hizo y con quién) y queda en la Mesa, visible para la Sala.
- Cada acción suma **puntos de Valoración** a la empresa del Director/a en el componente "Servicio a la red" (D-046): tres acciones en el mes valen el 100 % del componente. Solo suma; nunca resta. Mérito propuesto: +15 por acción entre Salas, +10 por duda resuelta.
- El Contraste puede revisar acciones vacías o repetidas. Las acciones entre Salas nutren los encuentros entre Salas (`docs/12` §6bis).

**Why.** Sin esto, dirigir solo cuesta. Con esto, dirigir bien abre la puerta a la Embajada y a seguir dirigiendo, y la red gana quien la cuida.

**Consequences.** `services/direccion.ts`, `TrustEvent` `DIRECTOR_INTERCHAPTER_ACTION` y `DIRECTOR_QUERY_RESOLVED`, sección "Acciones de dirección" en la Antesala, componente en la Valoración, pruebas.

**Revisit when.** Se defina la elección y el mandato del Director/a de Sala.

---

## D-049 · Nadie busca para sí: los titulares (Agentes y Timoneles) buscan negocio para los demás titulares de su Sala; el negocio propio no entra en NS

**Status:** CONFIRMED (principio fijado por el fundador)
**Date:** 2026-09-14

**Context.** Al proponer la Prueba de Valor se describió el informe como "señales que encajan con tu cliente ideal". El fundador corrige y fija el principio: dentro de NS, cada titular y su Agente buscan referidos para sus compañeros de Sala. Cualquier negocio para uno mismo no entra en NS; solo entra el negocio que se puede ceder a uno o varios cesionarios. Lo que un titular recibe lo han buscado los demás para él.

**Choice.**

- Principio del núcleo, con rango de Norma NS que firma todo titular ("Para los demás", versión `2026-09-14.3`).
- En el sistema ya se cumplía y ahora está escrito: el Matchmaker nunca propone a la empresa originadora como cesionaria; el Rastreo produce Indicios en borrador "para otros titulares"; una necesidad que solo cubre la especialidad del propio originador no es plaza vacante ni Cesión. Las fuentes públicas solo aportan hechos de terceros que anticipan necesidades (por ejemplo, adjudicaciones: quien gana el contrato es quien va a necesitar cosas), nunca "oportunidades para ti" (una licitación abierta a la que un miembro podría presentarse es negocio propio y no entra).
- La Prueba de Valor (D-050) tiene dos caras y las dos miran a los demás: lo que el Agente del candidato habría cedido, y lo que los Agentes de la Sala ya encontraron para su especialidad.
- Los Encargos ("lo que busco ahora") no contradicen el principio: son la forma de que los demás sepan qué ceder.

**Why.** Es lo que distingue a NS de un buscador de leads: la red trabaja para cada miembro porque cada miembro trabaja para la red. Sin esta regla, el Agente degeneraría en prospección propia y la reciprocidad desaparecería.

**Consequences.** Norma nueva en `core/normas.ts`; constitución (principio 17 y regla 6); North Star; léxico; adaptadores de fuentes con el filtro explícito; informe de la Prueba de Valor. Prueba en `tests/prueba.test.ts`.

**Revisit when.** Nunca.

---

## D-050 · Prueba de Valor: siete días de Agente para el candidato, antes de la plaza, con un informe de dos caras

**Status:** CONFIRMED (el fundador aprueba la propuesta "implementa todo, paso a paso")
**Date:** 2026-09-14

**Context.** El "wow" comercial de NS no es una pantalla: es que una empresa vea negocio real antes de haber hecho nada. Hasta hoy la demo funcionaba con datos ficticios y el candidato solo veía una portada.

**Choice.**

- Un Director/a inicia desde la Antesala la **Prueba de Valor** de una candidatura con especialidad clasificada. Se crea una empresa en estado `TRIAL`: sin plaza, sin voto, sin acceso, con un ADN provisional (mensaje de la candidatura y, cuando exista, su web) y un Agente en estado de prueba.
- Durante **siete días** su Agente rastrea en la Ronda como cualquier otro, para los demás (D-049). Rastrea con su propia clave de deduplicación: sus borradores no quitan a los titulares ningún hecho público. Nunca recibe Cesiones: la Mesa solo consulta titulares activos.
- Al terminar (o antes, a petición del Director/a), se genera el **informe**, público por enlace con token: **cara 1**, lo que su Agente habría cedido (hechos, necesidades, especialidades y titulares que las habrían recibido); **cara 2**, lo que la Sala ya encontró para su especialidad en el último mes, en agregado y sin identidad (recuento, Agentes que lo encontraron, cuántas se quedaron sin titular, sectores, valor estimado, plazos). El candidato no es miembro: nunca ve capa 0 ni nombres de terceros.
- El informe termina con la solicitud de plaza y las Normas.

**Why.** Enseña las dos cosas que venden NS: que su Agente trabajaría para la Sala desde el primer día, y que la Sala ya trabaja para su especialidad. Ningún club, directorio ni red profesional puede enseñar eso.

**Consequences.** Tabla `value_trials` (migración 0011), `services/prueba.ts`, `core/prueba.ts`, estado `TRIAL` en empresas y Agentes, Ronda con empresas en prueba, ruta pública `/prueba/[token]` fuera de la puerta de la demo, botones en la Antesala, pruebas.

**Revisit when.** Se conozca la conversión candidatura → plaza con y sin Prueba de Valor; o se decida enviar el informe por correo automáticamente.

---

## D-051 · Fuentes públicas reales para el Rastreo: adjudicaciones de PLACE y prensa económica local; BORME y licencias, pendientes

**Status:** CONFIRMED en la decisión; adaptadores PROPOSED hasta validarlos en el servidor
**Date:** 2026-09-14

**Context.** El Rastreo (D-031) funcionaba con un lote de muestra. La Prueba de Valor y la Ronda solo impresionan con hechos reales de la zona.

**Choice.**

- **PLACE** (Plataforma de Contratación del Sector Público, Atom de licitaciones): solo entradas con **resultado de adjudicación** cuya provincia, ciudad u órgano contengan la zona. La adjudicataria es la que va a necesitar personal, seguros, subcontratas o financiación (D-049). Nunca licitaciones abiertas.
- **Prensa económica local** por RSS (Diario de Sevilla, ABC Sevilla, El Correo): titulares y entradillas; el modelo extrae después el Indicio. Una cabecera caída nunca rompe la Ronda.
- Lectores sin dependencias (expresiones regulares tolerantes sobre XML). Se activan con `NS_PUBLIC_FEEDS=real`; sin esa variable, el lote de muestra. Las pruebas usan fixtures con el formato real.
- **Pendientes:** BORME (los actos por empresa están en PDF por provincia; hace falta extracción de texto), licencias de obra municipales (sin fuente abierta estable) y empleo (sin RSS público fiable). Todos en `PENDIENTES_DEL_FUNDADOR.md`.
- Los adaptadores no han podido probarse contra los servidores reales desde el entorno de desarrollo (sin salida de red a esos dominios). Primera validación: en el servidor desplegado.

**Why.** Adjudicaciones y prensa son las dos fuentes con formato estable, abiertas y ricas en hechos de terceros. Empezar por ellas da Indicios reales en días.

**Consequences.** `agents/feeds-public.ts`, `defaultPublicFeed()` en la Ronda, pruebas con fixtures, variable de entorno documentada en `docs/17`.

**Revisit when.** Se valide en el servidor el volumen y la calidad de Indicios por fuente; entonces se añade BORME.

---

## D-052 · Apunte por voz: el Timonel dicta y el Agente estructura

**Status:** CONFIRMED (el fundador aprueba la propuesta)
**Date:** 2026-09-14

**Context.** El Apunte (D-037) es la segunda prioridad móvil. En la calle se habla, no se escribe.

**Choice.** En el Apunte, los campos "Qué necesita" y "Observaciones" llevan un botón de dictado que usa el reconocimiento de voz del propio móvil (castellano). Si el dispositivo no lo ofrece, el botón no aparece. El texto cae en el campo y el circuito sigue igual: el Agente lo estructura y el Timonel decide si se publica. Ningún audio sale del dispositivo hacia NS.

**Why.** Convierte treinta segundos de conversación en un Indicio sin fricción, sin infraestructura de audio ni datos personales de voz en los servidores de NS.

**Consequences.** `components/dictation.tsx`, Apunte con dictado. Pendiente (móvil real): afinar la puntuación y probar en iOS y Android.

**Revisit when.** El dictado del navegador no sea suficiente (ruido, precisión) y merezca transcripción en servidor.

---

## D-053 · Mesa en directo: la Mesa corre en segundo plano con cola persistente, reintentos y puerta humana ante fallos repetidos

**Status:** CONFIRMED (el fundador aprueba la propuesta)
**Date:** 2026-09-15

**Context.** La Mesa (extracción, discovery, cualificación entre Agentes, score, compliance) se ejecutaba al publicar, en la misma petición. Con el modelo real cada Indicio tarda y no puede bloquear la pantalla del Timonel. `docs/17` lo señalaba como condición 2 para producción.

**Choice.**

- **Cola persistente** `agent_jobs`: un trabajo por Indicio (clave única por tipo y sujeto: encolar dos veces no duplica). Estados `QUEUED → RUNNING → DONE`, con `FAILED` transitorio y `NEEDS_HUMAN` final.
- **Reclamación exclusiva**: solo gana el proceso que pasa el trabajo de `QUEUED` a `RUNNING` en una actualización condicional; dos procesos nunca cualifican el mismo Indicio a la vez. La Mesa ya era idempotente por Indicio, así que un reintento nunca duplica Cesiones.
- **Reintentos** con espera creciente (inmediato, 1 minuto, 5 minutos) hasta tres intentos; después `NEEDS_HUMAN` y aviso al cedente en Hoy: "tu Agente lo deja en tus manos".
- **Cuándo corre**: tras responder a la publicación (`after()`, sin bloquear la redirección), en cada Ronda antes del Reloj, y por la ruta programada `GET /api/jobs` cada cinco minutos donde el alojamiento lo permita (misma protección que el Reloj).
- **Modo**: `NS_MESA_MODE=async|inline`. Sin variable, asíncrono si hay clave del modelo y no se fuerza el proveedor determinista; en línea para la demo y las pruebas. El contrato de los Agentes no cambia.
- **Visible**: la Mesa muestra "En la Mesa ahora: N Indicios en cualificación, M tuyos" y los que esperan revisión humana; la Ronda lo resume en su evento.

**Why.** Convierte la tesis "los Agentes se reúnen 24/7" en algo que ocurre de verdad en segundo plano, con el modelo real, sin que nadie espere mirando una pantalla, y sin perder ningún Indicio por un fallo de red.

**Consequences.** Tabla `agent_jobs` (migración 0012), `services/jobs.ts`, `publishSignal` con modo, acción de publicar con `after()`, Ronda con drenaje, `GET /api/jobs`, cron en `vercel.json`, estado en la Mesa, pruebas (`tests/jobs.test.ts`). Condición 2 de `docs/17` cumplida en su primera versión.

**Revisit when.** Haya volumen real: entonces, prioridad por Encargos abiertos, límite de trabajos por Agente y presupuesto de tokens por Tramo (D-025).

---

## D-054 · Cuentas personales: cada Timonel entra con su contraseña, sus sesiones se ven y cada acceso queda registrado

*(Numerada D-042 en su rama de origen, PR #9; renumerada a D-054 al integrarla, porque D-042 ya era el Compromiso.)*

**Status:** CONFIRMED (delegado por el fundador tras fusionar la #8)
**Date:** 2026-09-14

**Context.** La demo usa una puerta compartida y un selector de persona (D-033). Con empresas reales, cada Timonel debe entrar solo a lo suyo, y NS promete trazabilidad. Era la condición 1 de `docs/17` para producción.

**Choice.**

- **Dos modos**, elegidos por `NS_AUTH_MODE`: `demo` (por defecto en local: puerta compartida y selector) y `real` (por defecto en producción: cuentas personales). Toda la aplicación, las Server Functions y el proxy respetan el modo; el resto del código no cambia porque ya trabajaba sobre "el Timonel activo".
- **Contraseña por persona**, guardada con scrypt y sal; mínimo diez caracteres. **Sesiones** de treinta días con token aleatorio en la cookie y solo su hash en la base de datos; se ven y se cierran una a una en "Mi acceso", y cambiar la contraseña cierra las demás.
- **Invitaciones**: enlace de un solo uso y siete días para fijar la primera contraseña o recuperarla. Lo genera la Directiva desde el Dossier del Timonel (o la propia persona); el alta de una empresa en modo real termina mostrando ese enlace a la Directiva. El envío por correo llega después; mientras tanto el enlace se muestra una sola vez a quien lo genera.
- **Registro de accesos**: entrada, fallo, salida, invitación, activación y cambio de contraseña quedan en el audit log con la persona y la empresa.
- **Permisos**: los servicios ya comprobaban propiedad por empresa y Directiva; con cuentas reales esas comprobaciones dejan de depender de un selector. Un Timonel sin Directiva no ve la Antesala ni las Cesiones ajenas.
- **Demo intacta**: en modo demo nada cambia. La semilla da a los Timoneles ficticios una contraseña conocida (`NS_SEED_PASSWORD`, en local "nscumbre-demo") para probar el modo real; en producción no se siembra ninguna si no se define.

**Why.** Es la pieza mínima y honesta para que entre una empresa real: sin terceros, sin correos todavía, con lo que un Timonel espera de una red de confianza (saber dónde está abierta su sesión y poder cerrarla). Separar el modo permite seguir enseñando la demo con un solo clic.

**Consequences.** Tablas `credentials`, `sessions`, `invites` (migración 0007), `lib/accounts.ts`, `/acceso` en dos versiones, `/invitacion/[token]`, `/cuenta`, enlace de acceso en el Dossier, alta en modo real, `pnpm e2e:auth`, pruebas. Condición 1 de `docs/17` cumplida; condición 3 (registro de accesos) cubierta en su parte de accesos.

**Revisit when.** Se conecte el envío de correos (invitaciones y recuperación sin pasar por la Directiva), se añada un segundo factor para la Directiva, o NS necesite un rol de administración de red por encima de las Salas.
