# NS Network Spain · Registro de decisiones

Este documento evita que las decisiones estructurales desaparezcan dentro de conversaciones. Cada entrada sigue el formato: Decision · Date · Context · Options · Choice · Why · Consequences · Revisit when.

**Estado de cada decisión:**

- `PROPOSED` — opción recomendada por defecto por el equipo fundador (Claude). Se diseña y se construye sobre ella, pero el fundador humano puede revocarla sin coste antes del cierre de la Fase 0.
- `CONFIRMED` — ratificada expresamente por el fundador.
- `SUPERSEDED` — reemplazada por otra decisión (se indica cuál).

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
