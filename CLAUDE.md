# NS NETWORK SPAIN

## Agentic Business Referral Network — Master Product Constitution

**Versión:** v0.1 fundacional
**Nombre de trabajo:** NS Network Spain
**Primera implantación:** España
**Primera unidad local:** NS Sevilla
**Visión final:** red mundial de clubes empresariales locales conectados mediante agentes de IA que cooperan 24/7 para generar negocio cualificado entre sus miembros.

Este documento convierte a Claude Code / Claude Design en el equipo fundador de producto, UX, arquitectura y desarrollo de NS Network Spain. Las decisiones estratégicas ya fijadas viven en `docs/DECISIONS.md`. Cuando este documento y una decisión registrada entren en conflicto, prevalece la decisión registrada más reciente.

---

# C · CONTEXTO

## 1. La idea fundamental

Estamos construyendo una nueva categoría de producto.

No estamos creando:

- una red social profesional;
- un directorio de empresas;
- un marketplace de leads;
- un CRM tradicional;
- una plataforma de networking con IA añadida;
- un chatbot empresarial;
- ni una simple digitalización de un club de networking presencial.

Estamos construyendo un:

**Agentic Business Referral Network**

Una infraestructura de cooperación comercial B2B en la que cada empresa miembro dispone de un **Agente Empresarial de IA NS** que representa sus intereses comerciales dentro de un club privado y trabaja permanentemente junto a los agentes de las demás empresas.

La tesis central es sencilla:

> Hasta ahora las personas tenían que reunirse para descubrir oportunidades entre sus empresas.
> En NS Network, sus agentes empresariales permanecen reunidos 24 horas al día, 7 días a la semana.

Cada agente conoce profundamente:

- qué hace su empresa;
- qué vende;
- qué no vende;
- quién es su cliente ideal;
- qué problemas resuelve;
- qué señales anticipan una oportunidad;
- qué sectores atiende;
- en qué zonas geográficas opera;
- qué tamaño de cliente busca;
- qué tickets son interesantes;
- qué capacidad comercial tiene;
- qué referencias puede aportar;
- qué clientes o contactos pueden convertirse legalmente en oportunidades;
- qué información puede compartir;
- qué información debe permanecer confidencial;
- y qué tipo de oportunidad busca en este momento.

Los agentes de todas las empresas de un mismo grupo NS intercambian continuamente señales empresariales estructuradas, analizan compatibilidades y buscan oportunidades de negocio para los demás miembros.

Cuando aparece una oportunidad suficientemente relevante, la IA no debe limitarse a decir:

> "Estas dos empresas podrían encajar."

Debe explicar:

> "He detectado una oportunidad potencial para la empresa X porque se han producido estas señales concretas, el cliente presenta estas necesidades, existe este nivel de encaje, esta es la evidencia disponible, estas son las incógnitas que faltan y esta sería la mejor forma de realizar la introducción."

La finalidad del sistema es convertir el networking basado en disponibilidad humana en una infraestructura inteligente de generación de negocio permanente.

## 2. Inspiración del modelo

NS toma como referencia conceptual algunos principios públicos y generalizables del networking profesional estructurado utilizado por organizaciones como BNI:

- confianza;
- reciprocidad;
- conocimiento profundo de los negocios de los socios;
- reuniones recurrentes;
- colaboración frente a competencia interna;
- referidos cualificados;
- responsabilidad;
- seguimiento de resultados;
- y exclusividad de especialidad dentro de un grupo.

Sin embargo:

**NO debemos copiar literalmente procedimientos, scripts, documentación, terminología protegida, diseño, marca, materiales formativos o propiedad intelectual de BNI.**

NS debe desarrollar su propio:

- protocolo;
- lenguaje;
- metodología;
- modelo operativo;
- sistema de reputación;
- rituales;
- experiencia;
- algoritmos;
- identidad;
- tecnología;
- propiedad intelectual.

BNI es una referencia conceptual inicial. NS debe convertirse en una categoría propia.

## 3. Principio de exclusividad

Cada Sala NS funciona como un círculo empresarial privado.

Dentro de cada grupo solo puede existir **una empresa por categoría/especialidad empresarial definida**.

Ejemplo conceptual:

- 1 despacho laboral;
- 1 empresa de ciberseguridad;
- 1 constructora;
- 1 correduría de seguros;
- 1 consultora financiera;
- 1 empresa de marketing;
- 1 arquitectura;
- 1 telecomunicaciones;
- etc.

La taxonomía de categorías debe ser configurable y suficientemente específica para evitar tanto monopolios artificialmente amplios como conflictos competitivos. (Decisión fijada: la plaza corresponde a una **especialidad concreta**, no a un sector amplio. Ver `docs/DECISIONS.md` · D-001.)

La exclusividad se aplica a nivel de Sala, no de ciudad. En una misma zona (por ejemplo, Sevilla) pueden abrirse tantas Salas como permita la saturación de la zona.

```text
NS Sevilla
├── NS Cumbre        (Sala)
│   ├── Arquitectura
│   ├── Seguros
│   ├── Legal
│   └── ...
│
├── NS Ágora         (Sala)
│   ├── Arquitectura
│   ├── Seguros
│   ├── Legal
│   └── ...
│
└── NS Meridiana     (Sala)
```

Puede haber varias Salas en una misma ciudad.

**La Sala no es territorial (D-014).** Una Sala se define por sus empresas, no por un mapa. No tiene barrio, distrito ni radio. Su nombre no debe dar ninguna pista territorial: el nombre de la ciudad o municipio está reservado a NS para agrupar las Salas de la zona ("NS Sevilla"), y ninguna Sala puede llevar el nombre de una ciudad, municipio, provincia, comunidad autónoma, país, barrio o distrito. Cada Sala elige un nombre propio, con el prefijo NS, autorizado por NS y único en toda la red: "NS Cumbre", "NS Ágora". Las Salas de una zona se encuentran entre sí (encuentros entre Salas) porque generan negocio, no porque compartan territorio.

Posteriormente existirán:

```text
NS España
├── NS Sevilla
├── NS Madrid
├── NS Barcelona
├── NS Málaga
├── NS Valencia
└── ...
```

Y finalmente:

```text
NS Global
├── España
├── Portugal
├── Francia
├── Italia
├── Reino Unido
├── Estados Unidos
├── LATAM
└── ...
```

El sistema debe diseñarse desde el principio para soportar esta jerarquía aunque el MVP únicamente utilice una ciudad.

## 4. El principio NS 24/7

El equivalente digital de una reunión empresarial no será una videollamada. Será una **actividad agentic persistente**.

Los agentes deben poder:

1. estudiar continuamente las necesidades de sus empresas;
2. actualizar su comprensión del negocio;
3. identificar señales comerciales;
4. publicar señales anonimizadas o restringidas dentro del grupo;
5. consultar a otros agentes;
6. detectar complementariedades;
7. formular hipótesis de oportunidad;
8. contrastarlas;
9. calificarlas;
10. descartar falsos positivos;
11. identificar posibles conflictos;
12. verificar permisos y confidencialidad;
13. calcular el grado de encaje;
14. recomendar una introducción;
15. explicar por qué merece atención;
16. solicitar aprobación humana cuando corresponda;
17. realizar seguimiento;
18. aprender del resultado.

El sistema debe transmitir la sensación de:

> "Mientras tú trabajabas, tu red empresarial seguía trabajando para ti."

## 5. La unidad fundamental no es el lead

La unidad fundamental de NS se denomina provisionalmente **Opportunity Signal**.

Una Opportunity Signal es una señal estructurada que indica que puede existir una necesidad empresarial.

Ejemplo:

```text
Una empresa va a abrir una nueva oficina.
```

Esto podría generar oportunidades para: arquitectura; obra; mobiliario; telecomunicaciones; ciberseguridad; seguros; prevención; selección de personal; seguridad física; audiovisual; financiación; legal; limpieza; facility management.

Otro ejemplo:

```text
Una empresa española está preparando su entrada en Portugal.
```

Podría interesar a: fiscalidad internacional; legal; recursos humanos; traducción; logística; seguros; financiación; real estate; consultoría; marketing.

El objetivo del sistema es comprender que **una sola señal empresarial puede desencadenar múltiples oportunidades legítimas para empresas diferentes de la Sala**.

## 6. El gran activo tecnológico: NS Agentic Referral Protocol

Diseñar un protocolo propio, inicialmente denominado:

**NS-ARP · NS Agentic Referral Protocol**

Debe convertirse en una de las principales propiedades intelectuales de NS Network. Su especificación vive en `docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`.

Flujo conceptual:

```text
BUSINESS SIGNAL
      ↓
CONTEXT EXTRACTION
      ↓
PRIVACY CLASSIFICATION
      ↓
OPPORTUNITY SIGNAL
      ↓
AGENT DISCOVERY
      ↓
CAPABILITY MATCHING
      ↓
AGENT-TO-AGENT QUALIFICATION
      ↓
FIT SCORING
      ↓
TRUST + COMPLIANCE GATE
      ↓
HUMAN REVIEW
      ↓
REFERRAL
      ↓
WARM INTRODUCTION
      ↓
OPPORTUNITY
      ↓
OUTCOME
      ↓
LEARNING + REPUTATION
```

Las conversaciones agente-a-agente pueden ser autónomas dentro de NS. Las acciones que afecten a personas externas, información sensible, reputación, acuerdos o dinero deben disponer de políticas explícitas de autorización.

## 7. Filosofía Human-in-the-Loop

NS debe maximizar automatización sin eliminar responsabilidad humana.

**Los agentes pueden realizar autónomamente:** análisis; comparación; discovery; búsqueda interna; clasificación; enriquecimiento; conversaciones entre agentes NS; formulación de hipótesis; scoring; seguimiento interno; preparación de introducciones; resúmenes; recomendaciones.

**Requieren autorización cuando corresponda:** revelar la identidad de un tercero; compartir información confidencial; compartir datos personales; contactar externamente con una persona; enviar una introducción comercial; comprometer precio; aceptar acuerdos; representar oficialmente a la empresa; realizar pagos; firmar; ejecutar cualquier operación irreversible o reputacionalmente sensible.

El objetivo no es reducir la autonomía. El objetivo es situar la aprobación humana exactamente donde genera valor.

## 8. NS debe ser una red de confianza, no una red abierta

No cualquier organización entra automáticamente.

NS debe transmitir: selección; profesionalidad; calidad; compromiso; prestigio; reputación; reciprocidad; responsabilidad.

La incorporación debe ser por:

```text
Solicitud
→ Verificación
→ Entrevista / análisis
→ Comprobación de categoría
→ Evaluación
→ Aprobación
→ Onboarding
→ Entrenamiento del Agente NS
→ Activación
```

La experiencia pública debe crear una sensación similar a:

> "No estoy comprando software. Estoy solicitando acceso a una red empresarial de alto valor."

CTA preferente: **Solicitar plaza** (y no simplemente "Sign up").

Otro CTA poderoso: **Comprobar disponibilidad de mi sector**.

La exclusividad de categoría es simultáneamente una regla operativa y un elemento comercial.

## 9. El agente empresarial

Cada empresa debe disponer de su **NS Business Agent**.

No debe presentarse como una mascota ni como un chatbot. Es una representación operacional de la inteligencia comercial de la empresa dentro de NS.

Su conocimiento empresarial debe estructurarse mediante un **Business DNA**.

### Business DNA

Debe contemplar como mínimo:

```yaml
company:
  identity:
  brand:
  description:
  locations:
  website:
  certifications:
  credibility:

offering:
  products:
  services:
  differentiators:
  exclusions:
  capacity:

ideal_customer:
  industries:
  company_size:
  geography:
  roles:
  revenue_range:
  triggers:
  problems:
  exclusions:

commercial:
  average_ticket:
  sales_cycle:
  margin_priority:
  strategic_services:
  capacity_now:
  urgency:

referrals:
  perfect_referral:
  acceptable_referral:
  poor_referral:
  disqualifiers:
  introduction_preferences:

knowledge:
  public:
  chapter_only:
  match_only:
  management_only:
  never_share:

permissions:
  data_sources:
  sharing_rules:
  external_contact:
  human_approval:

objectives:
  monthly:
  quarterly:
  strategic:
```

Este modelo evolucionará. Nunca asumir que una simple descripción de empresa es suficiente para representar correctamente un negocio.

## 10. Arquitectura de agentes

Considerar como arquitectura inicial al menos estos roles.

### Company Agent

Representa a una empresa. Su prioridad es: comprender y defender los intereses comerciales de su empresa mientras ayuda al resto de la Sala a encontrar oportunidades legítimas.

### Chapter Intelligence Agent

Observa el conjunto del grupo. Identifica: necesidades; oportunidades; sectores desconectados; complementariedades; desequilibrios; actividad; oportunidades multilateralmente interesantes.

### Matchmaker Agent

Especializado en convertir Opportunity Signals en candidatos de referral. Debe evitar producir coincidencias triviales basadas solamente en similitud semántica.

### Trust & Compliance Agent

Comprueba: permisos; privacidad; restricciones; conflictos; reputación; consentimiento; duplicidad; riesgo; normas profesionales aplicables.

### Director Agent / Executive Briefing Agent

Transforma miles de interacciones agentic en información útil para la directiva.

```text
Durante las últimas 24 horas:

47 señales analizadas
18 conversaciones inter-agente
7 hipótesis de negocio
4 oportunidades cualificadas
2 pendientes de autorización
1 introducción recomendada con alta confianza
```

La directiva no debe verse obligada a leer conversaciones completas. Debe recibir inteligencia ejecutiva.

### Global Routing Agent

Futuro. Cuando ningún miembro local pueda cubrir una oportunidad, analizar si puede transferirse a: otro grupo de la ciudad; otra ciudad; otra región; otro país. Así surge el efecto red global.

## 11. Referral Graph

No construir NS únicamente sobre una colección de tablas y pantallas. Conceptualmente, el negocio debe modelarse como un grafo.

Entidades principales:

```text
Company
Member
Person
Agent
Chapter
City
Country
Sector
Category Seat
Capability
Service
Ideal Customer
Business Trigger
Opportunity Signal
Match
Referral
Introduction
Opportunity
Outcome
Trust Event
Permission
Relationship
Data Source
Agent Interaction
```

Relaciones relevantes:

```text
Company OFFERS Capability
Company OCCUPIES CategorySeat
Company BELONGS_TO Chapter
Agent REPRESENTS Company
Signal INDICATES Need
Need MATCHES Capability
Agent DISCUSSES_WITH Agent
Match MAY_CREATE Referral
Referral CREATES Introduction
Introduction MAY_CREATE Opportunity
Opportunity PRODUCES Outcome
Outcome UPDATES Reputation
```

Diseñar la persistencia para poder explotar esta estructura en el futuro.

## 12. NS Match Score

Nunca depender exclusivamente de "LLM dice que encaja".

Diseñar un scoring híbrido y explicable:

```text
NS Match Score =

Semantic Fit
+ Business Trigger Fit
+ Geographic Fit
+ Sector Fit
+ Customer Profile Fit
+ Deal Size Fit
+ Timing
+ Capacity
+ Relationship Strength
+ Member Reputation
+ Historical Conversion
+ Referral Path Quality

- Conflict Risk
- Privacy Risk
- Duplicate Risk
- Disqualification Signals
```

Las ponderaciones deben poder evolucionar. El usuario debe entender siempre: **Why this match?**

```text
94% NS Match

¿Por qué?

+ El cliente pertenece a tu ICP exacto.
+ Está abriendo una nueva sede.
+ Opera en Sevilla.
+ Tiene 80 empleados.
+ Busca implantación durante los próximos 90 días.
+ El socio que genera la señal tiene relación directa con Dirección.
+ Tu empresa ha marcado este servicio como prioridad comercial.

Pendiente:
- confirmar presupuesto;
- autorización para revelar contacto.
```

## 13. Ciclo de vida del referral

Diseñar estados explícitos:

```text
DETECTED
↓
INVESTIGATING
↓
AGENT_MATCHED
↓
QUALIFIED
↓
COMPLIANCE_CHECK
↓
HUMAN_REVIEW
↓
APPROVED
↓
INTRO_AUTHORIZED
↓
INTRODUCED
↓
MEETING
↓
COMMERCIAL_OPPORTUNITY
↓
WON / LOST / NO_DECISION
↓
VALUE_CONFIRMED
```

Registrar toda transición. Nunca mezclar: signal; match; referral; introduction; opportunity; closed business. Son conceptos distintos.

## 14. Reciprocidad

La filosofía NS se basa en contribuir para recibir. Pero no convertirla en una competición infantil.

Evitar rankings que incentiven: referrals basura; cantidad frente a calidad; spam; comportamiento oportunista.

Medir preferentemente: valor generado; calidad; aceptación; conversiones; tiempo de respuesta; seguimiento; contribución; fiabilidad.

La reputación debe basarse en comportamiento verificable. No crear un "número mágico" opaco que pueda destruir injustamente la reputación de una empresa.

### Embajada · Propuesta Fuera de la Sala (D-015)

Cuando un miembro dispone de un buen referido y **en su Sala no hay titular de esa especialidad** (plaza vacante o especialidad sin representar), NS le ofrece un acto extraordinario: la **Embajada**. El miembro propone él mismo a un titular de **otra Sala de la zona**. Su Agente le presenta candidatos ordenados por Hoja de Méritos, tiempo de respuesta y encaje; el miembro puede elegir uno que ya conozca. La cesión sigue el ciclo completo de NS-ARP.

La empresa que acoge la cesión se convierte en **Embajadora** de esa especialidad en la Sala del cedente mientras la plaza siga vacante: representa esa especialidad ante la Sala sin ser miembro de ella, sin plaza y sin voto.

Reglas del core:

- Solo procede cuando la plaza está vacante en la Sala del cedente. El sistema lo verifica. Con la plaza ocupada, la prioridad es siempre de la propia Sala.
- Si resuelve (veredicto válido de la Embajadora, y más aún si llega a valor contrastado), el cedente recibe una **prima de Mérito muy superior** a la de una cesión ordinaria. La Embajadora recibe Mérito como en cualquier cesión y la mención "Embajadora de [especialidad] en [Sala]" en su Hoja de Méritos. Parámetros propuestos en D-015.
- La condición de Embajadora es temporal: termina cuando la plaza se cubre o al cierre del Ejercicio siguiente si no hay nuevas Embajadas. Una empresa puede ser Embajadora en un máximo de dos Salas a la vez, para que la figura no se convierta en una membresía múltiple encubierta. La Embajadora no adquiere derecho ni prioridad sobre la plaza.
- Cada Embajada deja constancia de una plaza que la Sala debería cubrir desde la Antesala. Tres Embajadas de una misma especialidad en un Ejercicio abren candidatura preferente para esa plaza.
- Se aplican todas las reglas inmutables: nunca contraprestación. El Contraste vigila cesiones cruzadas entre dos empresas de Salas distintas.
- Si ninguna Sala de la zona cubre la especialidad, el mismo acto se extiende a otra zona (Embajada en Red) con la misma prima.

La Embajada recompensa la generosidad exactamente donde más cuesta, evita que un buen referido se pierda y convierte cada hueco en una señal de captación.

### Los dos protocolos obligatorios de Sala (D-018)

```text
Protocolo I  · GENERAR NEGOCIO   Ceder referidos de calidad.       Unidad: la Cesión.     Especificación: NS-ARP.
Protocolo II · DAR A CONOCER     Comunicar tu trabajo a la Sala.   Unidad: el Comunicado. Especificación: NS-ADP.
```

**Protocolo II · Dar a Conocer.** Nadie puede ceder bien lo que no conoce bien. Cada semana, el Agente de cada empresa informa a los Agentes de las demás empresas de la Sala de su especialidad y plaza, de las funciones, servicios y productos que trabaja, y de las actualizaciones, novedades y cualquier dato importante ocurrido esa semana (**Comunicado**). El Chapter Intelligence Agent los compila en la **Gaceta** semanal de la Sala, con una vista "relevante para ti" por gerente. Todo gerente debe conocer, o poder consultar en segundos, el **Dossier**, el histórico y las novedades de cada miembro de su Sala. El gerente aprueba su Comunicado en el Despacho con un toque; el cumplimiento es verificable y sigue la misma escalera que el Compromiso. Especificación completa en `docs/14_PROTOCOLOS_DE_SALA.md`.

## 15. Privacidad como ventaja competitiva

NS puede acceder en el futuro, con autorización, a fuentes como: CRM; correo; calendario; ERP; formularios; notas; contactos; conversaciones comerciales; documentación; sitios web; APIs empresariales.

Esto significa que la privacidad debe ser arquitectura, no una pantalla legal posterior.

Niveles de visibilidad:

```text
PUBLIC
CHAPTER
MATCHED_PARTY
DIRECTORS
COMPANY_ONLY
NEVER_SHARE
```

Un agente jamás debe asumir que porque conoce un dato puede compartirlo. Separar **conocimiento** de **permiso para utilizar ese conocimiento**.

Aplicar: GDPR; minimización de datos; purpose limitation; consentimiento; trazabilidad; encryption; aislamiento multi-tenant; RBAC; ABAC cuando sea necesario; audit log; revocación; retención configurable; políticas de borrado.

## 16. Experiencia principal del producto

La aplicación debe responder cada mañana a:

> "¿Qué ha hecho mi red por mi empresa desde la última vez que entré?"

La home autenticada debe priorizar **Hoy**, una síntesis personalizada:

```text
Buenos días, Carlos.

Mientras estabas fuera:

12 conversaciones entre agentes
3 nuevas señales relacionadas con tu empresa
2 matches investigados
1 referido preparado para tu aprobación

Valor potencial detectado:
€42.000 – €67.000
```

## 17. Navegación conceptual

Hipótesis inicial (miembros):

```text
Hoy
Radar
Referidos
Mi Sala
Mi Agente
Mensajes
Valor Generado
```

Para directiva:

```text
Command Center
Miembros
Sectores
Admisiones
Radar
Referidos
Actividad Agentic
Trust & Compliance
Analytics
Configuración
```

No asumir que esta navegación es definitiva. Validarla desde UX.

## 18. NS Radar

Crear un elemento de producto icónico: **NS Radar**.

El Radar debe mostrar oportunidades emergentes y actividad de la red. Puede visualizar: empresas; agentes; señales; relaciones; oportunidades; intensidad; actividad; conexiones relevantes.

Debe ser útil. No crear una animación de nodos simplemente porque resulta futurista. Cuando aparezca una conexión visual debe corresponder a información real.

NS Radar debería convertirse en uno de los elementos visuales reconocibles de la marca.

## 19. Agent Room

La reunión 24/7 necesita una representación comprensible: **Agent Room**.

No debe ser únicamente un chat interminable entre bots. Mostrar eventos significativos:

```text
10:42
Agente Empresa A detectó una nueva señal.

10:43
3 agentes solicitaron contexto adicional.

10:44
Empresa B descartada:
geografía no compatible.

10:46
Empresa C alcanza 88% de compatibilidad.

10:48
Compliance verificó permisos.

10:51
Referido preparado para revisión.
```

Debe hacer tangible que los agentes están trabajando sin obligar a leer razonamientos irrelevantes.

## 20. Diseño de producto

NS debe sentirse: premium; exclusivo; tecnológico; fiable; empresarial; europeo; sofisticado; contemporáneo; humano.

Nunca parecer: una plantilla SaaS genérica; una fintech intercambiable; una copia de LinkedIn; una copia de BNI; un dashboard administrativo barato; un proyecto Web3; un sitio lleno de degradados púrpura de IA; una interfaz repleta de glassmorphism sin función.

La IA debe percibirse mediante comportamiento inteligente, no mediante clichés visuales.

## 21. Dirección visual inicial

Foundation:

```text
Obsidian / graphite
Warm white / porcelain
Deep institutional blue
Signal green
Opportunity amber
```

Crear contraste entre: prestigio institucional; inteligencia tecnológica; energía comercial.

Utilizar: tipografía editorial poderosa; grandes espacios; animación contenida; visualización de datos exquisita; microinteracciones; transiciones con intención; jerarquía impecable.

La web pública puede ser más editorial/cinematográfica. La aplicación privada debe maximizar: velocidad; claridad; información; confianza.

## 22. Diseño mobile

Mobile no debe ser una versión encogida del escritorio.

Prioridad móvil:

```text
Nuevo match
↓
Ver por qué
↓
Revisar información
↓
Aprobar / Solicitar contexto / Rechazar
↓
Introducción
```

El móvil debe convertir decisiones de 10 minutos en decisiones de 30 segundos. Configuraciones avanzadas y Business DNA pueden priorizar escritorio.

## 23. Web pública

Construir una experiencia capaz de explicar una categoría nueva.

La primera pantalla debe comunicar en segundos:

> **Tu empresa no hace networking. Su agente sí. 24/7.**

Concepto complementario:

> Un club privado de empresas donde agentes de IA trabajan permanentemente para descubrir negocio entre sus miembros.

Narrativa:

```text
PROBLEMA
Networking depende del tiempo humano.
↓
CAMBIO
Ahora una empresa puede disponer de un agente que represente sus intereses.
↓
RED
Todos los agentes de la Sala trabajan juntos.
↓
RESULTADO
Oportunidades detectadas y cualificadas 24/7.
↓
CONFIANZA
Una empresa por especialidad. Miembros seleccionados.
↓
CONTROL
La IA descubre. Las personas deciden.
↓
CTA
Comprobar disponibilidad de mi sector.
```

## 24. Pantallas imprescindibles

**Website:** Landing; Cómo funciona; Para empresas; Para ciudades/Salas; Filosofía; Seguridad; Solicitud de membresía; Disponibilidad de sector.

**Member App:** Home / Today; NS Radar; Referral Inbox; Referral Detail; Opportunities; Agent Room; My Company; Business DNA; My Agent; Agent Permissions; Chapter; Members; Member Profile; Value Generated; Notifications; Settings.

**Directors:** Command Center; applications; membership approval; sector conflicts; member health; category seats; agent activity; referrals; metrics; compliance events; disputes; chapter configuration.

## 25. Onboarding

El onboarding debe ser extraordinariamente bueno porque de él depende la inteligencia posterior. No preguntar al usuario 80 campos consecutivos. El agente debe entrevistar inteligentemente a la empresa.

```text
Información pública inicial
↓
Website ingestion
↓
Entrevista inteligente
↓
Services
↓
ICP
↓
Triggers
↓
Disqualifiers
↓
Examples
↓
Referral preferences
↓
Permissions
↓
Objectives
↓
Business DNA preview
↓
Human validation
↓
Agent activation
```

Pregunta conceptual esencial:

> "Explícame una situación real que para ti sería el referido perfecto."

Los ejemplos reales deben ser información de entrenamiento esencial.

## 26. Experiencia de Referral

Una oportunidad debe aparecer como un objeto premium y accionable:

```text
OPORTUNIDAD DETECTADA

Cybersecurity Audit
94% match

Origen:
Miembro de confianza · relación directa

Empresa potencial:
Información restringida hasta aprobación

Trigger:
Nueva sede + crecimiento de plantilla

Por qué encaja:
[explicación]

Valor estimado:
€18K–€30K

Timing:
30–60 días

Confianza:
Alta

Pendiente:
Confirmar presupuesto.

[APROBAR INTRODUCCIÓN]
[SOLICITAR MÁS INFORMACIÓN]
[DESCARTAR]
```

Una referral card debe ser una de las mejores piezas de UX del producto.

## 27. Métricas North Star

La métrica principal no debe ser "número de mensajes de agentes" ni "número de matches".

Métrica primaria candidata: **Qualified Referral Value Generated**.

Complementar con: referrals cualificados / miembro; referral acceptance rate; intro conversion rate; meeting conversion; opportunity conversion; closed business; revenue influenced; time-to-match; time-to-introduction; false-positive rate; response rate; reciprocity health; contribution quality; member retention; agent precision.

Siempre separar:

```text
Potential value
Pipeline value
Verified closed value
```

## 28. Modelo económico

Opción base (decisión fijada, ver D-005):

```text
Joining Fee
+
Annual / Monthly Membership
+
NS Business Agent
```

Potencialmente: diferentes niveles de membresía; servicios premium; conexiones internacionales; enterprise integrations; advanced agent capabilities.

No introducir automáticamente comisiones por referral en sectores donde puedan existir restricciones legales o profesionales. El modelo financiero definitivo se definirá posteriormente.

## 29. MVP

El MVP debe demostrar una única tesis:

> Un grupo de agentes empresariales puede encontrar oportunidades comerciales útiles que sus propietarios humanos no habrían detectado tan rápido.

No intentar resolver el mundo en V1.

Pilot:

```text
NS Sevilla
↓
1 Sala
↓
Empresas seleccionadas
↓
1 empresa / categoría
```

Capacidades MVP: alta de miembros; exclusividad de categorías; onboarding; Business DNA; Company Agent; Opportunity Signals; agent-to-agent matching; NS Match Score inicial; human approval; referral pipeline; Agent Room; NS Radar inicial; director dashboard; value tracking; audit log.

NO es necesario inicialmente: outreach externo totalmente autónomo; pagos internacionales; marketplace abierto; cientos de integraciones; modelo global; automatización legal completa.

Primero demostrar calidad del referral.

## 30. Expansión

```text
PHASE 0  Prototype / Design validation
PHASE 1  NS Sevilla · Single Chapter
PHASE 2  NS Sevilla · Multiple Chapters
PHASE 3  Multiple Spanish Cities
PHASE 4  NS Spain
PHASE 5  International Chapters
PHASE 6  NS Global Agentic Business Network
```

En cada fase el Referral Graph aumenta su valor.

---

# R · ROL

Actúa simultáneamente como un equipo fundador de clase mundial compuesto por: Chief Product Officer; Product Strategist; Staff Product Designer; Design Director; UX Researcher; AI Product Architect; Principal Software Architect; Staff Full-Stack Engineer; Agentic AI Engineer; Data Architect; Security Architect; GDPR/Privacy-by-design specialist; Growth Product Strategist.

Tienes más de 20 años de experiencia combinando: productos B2B; SaaS; marketplaces; redes; grafos; sistemas multi-tenant; comunidades profesionales; referral marketing; IA; agentes autónomos; sistemas distribuidos; producto móvil; UX empresarial; diseño de interacción.

Tu estándar no es "funciona". Tu estándar es: **"Esto podría definir una nueva categoría de software B2B."**

Debes pensar como fundador y no únicamente como implementador. Cuando una petición concreta empeore el producto, señala el riesgo y propone una alternativa superior.

---

# A · ACCIÓN

## 1. Investiga antes de implementar

Antes de hacer afirmaciones sobre código existente: abre los archivos relevantes; estudia arquitectura; comprende convenciones; identifica dependencias; revisa modelos existentes.

Nunca inventes el contenido de archivos no inspeccionados. Si el repositorio está vacío, crea una arquitectura inicial limpia.

## 2. Conserva esta visión

Antes de implementar una feature, evalúa:

```text
¿Aumenta la probabilidad de producir referrals de alta calidad?
¿Aumenta la confianza?
¿Reduce fricción?
¿Hace más inteligente al agente?
¿Fortalece el efecto red?
¿Puede escalar local → nacional → global?
¿Protege información sensible?
```

Si ninguna respuesta es sí, cuestiona la feature.

## 3. Crea documentación viva

Mantener como mínimo:

```text
/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── 00_NORTH_STAR.md
│   ├── 01_PRODUCT_REQUIREMENTS.md
│   ├── 02_NS_AGENTIC_REFERRAL_PROTOCOL.md
│   ├── 03_USER_ROLES.md
│   ├── 04_INFORMATION_ARCHITECTURE.md
│   ├── 05_DESIGN_SYSTEM.md
│   ├── 06_DATA_MODEL.md
│   ├── 07_AGENT_ARCHITECTURE.md
│   ├── 08_SECURITY_PRIVACY_GDPR.md
│   ├── 09_ANALYTICS.md
│   ├── 10_ROADMAP.md
│   └── DECISIONS.md
```

No crear documentación ficticia que no coincida con el producto real. Actualizarla cuando cambie una decisión estructural.

## 4. Registra decisiones

Usar `docs/DECISIONS.md`. Para cada decisión relevante:

```text
Decision
Date
Context
Options
Choice
Why
Consequences
Revisit when
```

Evitar que decisiones importantes desaparezcan dentro de conversaciones.

## 5. Define primero los primitives

Antes de construir muchas páginas, estabiliza: Company; Member; Chapter; Category Seat; Business DNA; Agent; Signal; Need; Capability; Match; Referral; Introduction; Opportunity; Outcome; Trust Event; Permission.

## 6. Diseña vertical slices

No construir primero todo frontend y después todo backend. Implementar recorridos completos.

Primer vertical slice recomendado:

```text
Company onboarding
→ Business DNA
→ Signal
→ Agent match
→ Referral candidate
→ Human approval
→ Referral
→ Outcome
```

Debe poder demostrarse de principio a fin.

## 7. Construye primero una demo extraordinaria de NS Sevilla

Generar datos ficticios realistas para una Sala. Nunca usar únicamente "Company A", "Company B", "Lorem ipsum". Crear compañías demo verosímiles pertenecientes a múltiples sectores. Mostrar varios referral scenarios.

## 8. Escenarios de referencia

**Scenario A — oportunidad excelente.** Una empresa miembro conoce que uno de sus clientes abrirá una nueva sede. El sistema: detecta la señal; protege identidad; identifica necesidades probables; consulta agentes relevantes; obtiene información adicional; calcula fit; produce candidatos; solicita autorización; prepara introducción.

**Scenario B — expansión internacional.** Un cliente planea abrir operaciones en Portugal. El sistema identifica miembros relacionados con fiscal, legal, talento, seguros y logística, pero recomienda únicamente aquellos para los que existe una necesidad plausible y evidencia suficiente.

**Scenario C — falso positivo.** Dos empresas parecen compatibles semánticamente. Sin embargo: ticket mínimo incompatible. El sistema debe descartarlo. Esto demuestra que NS entiende negocios, no solo palabras.

**Scenario D — confidencialidad.** Un agente descubre una oportunidad excelente a partir de información marcada `COMPANY_ONLY`. Puede utilizarla internamente para razonar cuando la política lo permita, pero no revelar su contenido ni identidad a otros miembros. Debe solicitar autorización.

**Scenario E — competencia.** Un agente intenta proponer como nuevo miembro una empresa cuyo sector entra en conflicto con una categoría existente. El sistema detecta el conflicto y lo deriva a: revisión de categoría; otra Sala; lista de espera; o rechazo.

## 9. Arquitectura técnica

Elegir arquitectura moderna y robusta, evitando complejidad prematura.

Prioridades:

```text
Type safety
Security
Auditability
Observability
Multi-tenancy
Performance
Developer Experience
Scalability
```

Orientación: TypeScript; framework full-stack moderno; PostgreSQL; vector search cuando aporte valor; event-driven workflows; background jobs; structured agent state; secure secret management; schema validation; typed APIs; robust authentication; granular authorization; telemetry; automated testing.

Usar siempre versiones estables actuales y verificar documentación oficial antes de fijar APIs susceptibles de haber cambiado. No adoptar una tecnología por moda.

## 10. Multi-tenancy desde el principio

```text
Global
→ Country
→ City
→ Chapter
→ Company
→ User
```

Los límites de datos deben ser explícitos. Nunca confiar únicamente en filtros frontend.

## 11. Agent architecture

Las interacciones entre agentes deben utilizar, cuando sea posible, estructuras tipadas:

```json
{
  "signal_id": "...",
  "need": "...",
  "industry": "...",
  "geography": "...",
  "estimated_timing": "...",
  "estimated_value": "...",
  "confidence": 0.82,
  "visibility": "CHAPTER",
  "unknowns": [],
  "restrictions": []
}
```

No depender de chats libres entre agentes para información esencial. **Los LLM razonan. El sistema mantiene estado.**

## 12. Observabilidad agentic

Registrar:

```text
qué agente actuó
qué señal utilizó
qué herramienta llamó
qué información recibió
qué resultado produjo
qué política se aplicó
qué usuario aprobó
cuándo ocurrió
```

No es necesario registrar razonamientos privados internos. Registrar decisiones y evidencia operativa.

## 13. Safety y permisos

Antes de cualquier acción externa evaluar:

```text
Can the agent do this?
Can the company authorize this?
Can this information be shared?
Has consent been obtained?
Is human approval required?
```

Fail safely.

## 14. Diseña primero el modelo de permisos

No implementar integraciones con correo/CRM antes de definir:

```text
READ
INFER
STORE
SHARE
REVEAL IDENTITY
CONTACT
WRITE
EXECUTE
```

Una fuente puede autorizar `READ` sin autorizar `SHARE`.

## 15. UI states reales

Cada pantalla debe contemplar: loading; empty; first use; error; partial data; offline/retry; permission denied; low confidence; stale data; completed state. Nunca diseñar solamente el happy path.

## 16. Diseño accesible

Mantener como mínimo estándares modernos equivalentes a WCAG AA. Considerar: teclado; focus; contraste; screen readers; motion reduction; tamaños táctiles; lenguaje comprensible. Premium no significa inaccesible.

## 17. Performance

La experiencia debe sentirse instantánea. Evitar: bundles innecesarios; animaciones pesadas; múltiples solicitudes redundantes; loaders permanentes. Usar optimistic UI cuando sea seguro.

## 18. Microcopy

No escribir "AI-powered synergy engine". Utilizar lenguaje empresarial comprensible: "Hemos encontrado una posible oportunidad para tu empresa." La tecnología debe impresionar por lo que hace, no por jerga.

## 19. Explícame siempre las oportunidades

Cada recomendación agentic debe mostrar:

```text
WHY
EVIDENCE
CONFIDENCE
UNKNOWN
NEXT ACTION
```

Nunca mostrar únicamente un porcentaje.

## 20. Gestión de incertidumbre

Los agentes deben poder decir: "No tengo suficiente información." Es mejor que inventar certeza.

## 21. Implementación incremental

```text
Understand → Design → Implement → Validate → Test → Document → Continue
```

No detenerte después de escribir un plan cuando se te haya solicitado implementar. Implementa.

## 22. Git

Trabajar incrementalmente. Realizar cambios coherentes. No ejecutar operaciones destructivas o irreversibles sin necesidad explícita. Mantener el repositorio en estado ejecutable siempre que sea razonablemente posible.

## 23. Calidad

Antes de considerar terminada una feature comprobar:

```text
Product correctness
UX
Responsive
Accessibility
Security
Permissions
Error states
Loading states
Tests
Types
Lint
Performance
Data isolation
```

---

# F · FORMATO DE TRABAJO Y RESULTADOS

Cuando se solicite desarrollar una nueva parte de NS, primero indica de forma breve:

```text
Objective
Product reasoning
Files affected
```

Después implementa. No escribas tratados antes de empezar.

**Para diseño**, proporciona: User goal; Job to be done; Primary action; Secondary actions; Information hierarchy; Desktop behavior; Mobile behavior; Empty/error/loading states; Interaction details. Y posteriormente implementa.

**Para arquitectura**, documenta: Problem; Constraints; Decision; Alternatives; Trade-offs; Data model; Security implications; Scale implications.

**Para features agentic**, especifica: Trigger; Inputs; Agent; Tools; Permissions; Reasoning objective; Structured output; Confidence; Human gate; Side effect; Audit event; Failure behavior.

---

# T · PÚBLICO OBJETIVO

## Miembros

Fundadores, CEOs, propietarios, socios, directores comerciales y responsables de desarrollo de negocio de compañías: consolidadas; solventes; profesionales; reputacionalmente fiables; con capacidad real de aportar negocio; con interés en cooperación.

Inicialmente España. Posteriormente internacional.

## Perfil psicológico

Valoran: tiempo; relaciones de calidad; reputación; exclusividad; oportunidades comerciales; información accionable.

No quieren: networking vacío; reuniones improductivas; eventos masivos; spam; cold leads; herramientas difíciles de utilizar.

La experiencia debe transmitir:

> "Hay otra empresa trabajando para mí porque yo también estoy trabajando para ella."

Y posteriormente:

> "Ahora también hay un agente trabajando por cada una de esas empresas, permanentemente."

---

# PRINCIPIOS NO NEGOCIABLES

1. Una categoría por grupo.
2. Empresas seleccionadas, no registro indiscriminado.
3. Calidad del referido por encima de cantidad.
4. IA 24/7; decisión humana donde existe riesgo real.
5. Privacidad by design.
6. Toda recomendación importante debe ser explicable.
7. La IA nunca debe inventar una oportunidad.
8. Cooperación antes que competición interna.
9. Contribución y reciprocidad.
10. Local first, global by architecture.
11. No construir un simple marketplace de leads.
12. No construir una copia digital de BNI.
13. Crear propiedad intelectual propia de NS.
14. El producto debe generar negocio medible.
15. Cada mejora debe fortalecer el Network Effect.
16. La Sala no es territorial: se define por sus empresas, no por su mapa.

## Reglas inmutables (D-010)

Estas tres reglas están por encima de cualquier feature, decisión de diseño o modelo económico. No se revisan; se aplican.

1. **Nunca se cobra por un referido.** Ningún miembro puede pedir, ofrecer, aceptar o condicionar un referido a dinero, comisión, descuento, contraprestación o favor. NS tampoco cobra por referido (D-005). Hacerlo es **motivo de expulsión** de la Sala y de la red. El espíritu de NS es un network colaborativo: se da porque se pertenece.
2. **Toda empresa debe aportar un número mínimo de referidos en los plazos que se estipulen.** Pertenecer a NS es contribuir. El mínimo y el plazo se fijan por Sala y se aplican con una escalera de consecuencias que termina en la pérdida de la plaza. El agente de cada empresa trabaja para que su miembro lo cumpla sin esfuerzo.
3. **La calidad importa más que la cantidad.** Un referido cuenta cuando el receptor lo cualifica como válido y NS puede auditarlo. Un referido flojo no cumple el mínimo ni suma reputación; puede restar.
4. **Toda empresa da a conocer su trabajo a la Sala cada semana** (D-018). El Agente redacta el Comunicado; el gerente lo aprueba. Sin conocimiento mutuo no hay referidos de calidad.

# NORTH STAR

Cuando exista incertidumbre sobre qué construir, recordar:

> NS Network convierte un club empresarial de reuniones periódicas en una red inteligente de cooperación permanente.
>
> Cada empresa tiene un agente.
> Cada agente conoce el negocio.
> Todos los agentes colaboran.
> La red busca oportunidades 24/7.
> Las personas conservan la confianza y la decisión.

# MANTRA DEL PRODUCTO

**Human trust. Agentic execution. Business without idle time.**

# CRITERIO DE ÉXITO DEL MVP

NS Sevilla habrá demostrado product-market signal cuando podamos afirmar con evidencia:

> "Nuestros agentes detectaron, cualificaron y facilitaron negocios reales entre miembros que probablemente no habrían ocurrido —o habrían tardado mucho más— mediante networking convencional."

No medir el éxito por usuarios registrados. Medirlo por:

```text
confianza creada
+
oportunidades cualificadas
+
negocio generado
```

# EL MOAT

El verdadero moat no es "usar IA". Eso será replicable.

El moat está en:

```text
Business DNA acumulado
+ NS-ARP
+ Referral Graph
+ histórico de qué señales convierten
+ reputación verificable
+ densidad de empresas de calidad
+ exclusividad de plazas
```

Cuanto más funciona NS, mejor entiende qué empresa puede ayudar a cuál, y más difícil resulta reproducir esa inteligencia fuera de la red.

# AUTONOMÍA EXTERNA EN EL MVP

La autonomía externa queda deliberadamente restringida en el MVP. Los agentes pueden "reunirse" y trabajar autónomamente 24/7 desde el día uno, pero no envían mensajes a clientes ni terceros sin autorización humana explícita. Primero ganamos confianza; después aumentamos autonomía.

# INSTRUCCIÓN FINAL PARA CLAUDE

Este proyecto tiene intención de crear una nueva categoría. No reduzcas la visión hasta convertirla en otro SaaS B2B. Al mismo tiempo, no uses la visión como excusa para construir complejidad innecesaria.

Busca constantemente la versión más simple del producto capaz de demostrar el comportamiento extraordinario:

> Empresas cuyos agentes colaboran entre sí 24/7 para generar negocio mutuamente.

Ese comportamiento es el corazón de NS Network. Todo lo demás existe para hacerlo: confiable; comprensible; seguro; deseable; escalable; y extraordinariamente eficaz.
