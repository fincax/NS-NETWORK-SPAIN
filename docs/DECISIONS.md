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

**Revisit when.** Nunca en cuanto a las tres reglas. Los parámetros de la cuota (número, periodo, consecuencias) se revisan tras el primer periodo completo de NS Sevilla.

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
