# 16 · Competencia y posición de NS

**Estado:** análisis de septiembre de 2026, con decisiones tomadas por el equipo fundador por delegación del fundador (D-029 a D-032). Fuentes al final.
**Para qué sirve:** saber qué hace cada competidor bien, qué hace mal, qué NS ya supera y qué adoptamos, mejorado, en el producto.

## 0. El mapa en una frase

Nadie hace lo que NS hace. Hay tres familias que cubren una parte cada una:

```text
CLUBES DE REFERIDOS         BNI · LeTip · Linkeat        Confianza, exclusividad, ritual. Todo depende del tiempo humano.
REDES DE INTRODUCCIONES     Boardy · Lunchclub · Intros  Un algoritmo o una IA presenta personas. Sin club, sin exclusividad, sin cuentas claras.
INTELIGENCIA DE SEÑALES     Clay · Common Room · Commsor · Alignable 360   Detectan señales de compra y caminos cálidos. Para vender, no para ceder.
```

NS es la intersección: **el club** (plaza única, admisión, Balanza) **+ la introducción brokerada por agentes** (Cesión con doble visto bueno) **+ las señales** (Indicio, Rastreo). Ninguno de los tres grupos tiene las otras dos patas, y ninguno tiene un agente por empresa que trabaje para los demás.

## 1. Clubes de referidos

### BNI (referencia de mercado)

Qué hace: un profesional por categoría y grupo, reunión semanal obligatoria con estructura fija (networking abierto, momento de formación, presentación de 45 segundos por miembro sobre "qué referido busco esta semana", presentaciones largas, referidos y testimonios), reuniones uno a uno entre miembros, días de visitantes, y una app (BNI Connect) para registrar referidos, uno a uno y "gracias por el negocio cerrado" (TYFCB). En España: 450 € de alta y 1.249 € al año más IVA, pago único, más la cuota semanal de reunión.

Qué hace bien y por qué funciona:

- **La calidad del referido se define en el papel.** Un referido "de verdad" es aquel en el que el miembro "le ha dicho al tercero que le llamarán": el tercero espera la llamada. Es la mejor definición operativa de calidad que hemos visto en el sector.
- **El ritual.** Cada semana cada miembro dice en voz alta qué referido quiere. La repetición crea conocimiento mutuo.
- **El cierre del bucle.** TYFCB obliga a agradecer y a cuantificar el negocio cerrado. Sin eso no hay prueba de valor.
- **Los uno a uno.** Nadie cede bien lo que no conoce bien.

Dónde flaquea: 3 a 5 horas semanales de tiempo humano; un solo canal de detección (la memoria del miembro en la reunión); reputación como recuento de referidos, no como calidad contrastada; ninguna inteligencia entre reuniones.

### LeTip

Igual modelo, más pequeño, más antiguo (1978). Exige de media un referido cualificado por semana o hacer negocio con otro miembro. Confirma que el "ritmo semanal" es el estándar del sector.

### Linkeat (Francia) y las alternativas "sin obligaciones"

Cenas semanales de 6 a 8 personas con un algoritmo que compone las mesas por sector, tamaño y objetivos; sin pitch cronometrado, sin cuota de recomendaciones, gratis salvo la cena. Es la reacción al cansancio con BNI: la gente quiere la relación sin la carga. La respuesta de NS no es quitar la obligación (D-010 la mantiene), sino quitar la carga: el Agente hace el trabajo y el Timonel decide en 30 segundos.

## 2. Redes de introducciones

### Boardy

Una IA de voz te llama, te entrevista y presenta personas de su red con doble consentimiento por correo. En junio de 2026 lanzó Boardy Pro: ya no solo presenta, hace seguimiento de la intro, ayuda a agendar, toma notas, registra tareas y "empuja el hilo cuando pierde impulso". Límites conocidos: una introducción por llamada y un tope de tres al día; una campaña de correos generados por IA sobre las fotos de perfil provocó una polémica pública por comentarios sesgados.

Qué aprendemos: la entrevista por voz es el onboarding menos pesado que existe; el seguimiento activo ("empujar cuando pierde impulso") es lo que convierte una intro en negocio; y el riesgo reputacional de una IA que habla en nombre de personas es real. NS ya tiene el doble visto bueno y el Agente nunca habla con terceros; nos falta el "empujón" sistemático.

### Lunchclub

Emparejamiento uno a uno semanal por objetivos, con feedback tras cada reunión que realimenta el algoritmo (filtrado colaborativo). Lección: el bucle de retroalimentación es el motor. NS lo tiene diseñado (Veredicto → S14 recalibración) pero aún no cierra el bucle en el código.

### Intros.ai (adquirida por Bevy) y similares

Introducciones automáticas dentro de comunidades, en marca blanca, desde 199 $/mes por 100 miembros. Referencia útil de precio por miembro para el Tramo de entrada (D-025): el mercado paga entre 2 y 30 € por miembro y mes por "intros", sin agente ni exclusividad.

## 3. Inteligencia de señales y caminos cálidos

### Clay y Common Room (Zoom anunció su adquisición en julio de 2026)

Detectan señales de compra (cambios de puesto, contrataciones, rondas, visitas repetidas a precios), las ordenan y enriquecen contactos. Las señales que más convierten en B2B: cambio de puesto de un decisor, nuevas contrataciones y financiación. Coinciden casi exactamente con nuestros triggers (LEADERSHIP_CHANGE, HEADCOUNT_GROWTH, FUNDING_ROUND, NEW_SITE).

### Commsor (adquirida por The Swarm en 2026)

Mapea la red extendida de los "conectores" de una empresa, calcula la fuerza de cada relación, encuentra caminos cálidos hacia cuentas objetivo y avisa a la persona adecuada para pedir la intro. Publica que en torno al 60 % de las intros solicitadas terminan en reunión, frente al 1 a 10 % del resto de canales.

### Alignable 360

Red de pymes norteamericana (millones de miembros) que ahora mapea las conexiones de segundo grado para descubrir clientes y referidos ocultos; los planes de pago abren el segundo grado de todas tus conexiones.

Qué aprendemos: el grafo de relaciones es el activo. NS tiene `relationship_strength` y el Sondeo diseñado, pero no tiene todavía el grafo de "quién conoce a quién" dentro de la Sala.

## 4. Qué NS ya hace mejor que todos

| Capacidad | Quién más la tiene | NS |
| --- | --- | --- |
| Una empresa por especialidad, admisión y expulsión | BNI, LeTip | Sí, por Sala (D-001, D-013) |
| Un agente por empresa que trabaja para las demás 24/7 | Nadie | Sí (Company Agent, Mesa Permanente) |
| Introducción con doble visto bueno | Boardy, Commsor | Sí, con capas de revelación y Salvoconducto |
| Encaje explicado (por qué, evidencia, incógnitas) | Parcialmente Clay/Common Room (scoring) | Sí, obligatorio (Explanation) |
| Valor a priori (Promesa) y a posteriori (Veredicto) | Nadie (BNI solo TYFCB a posteriori) | Sí (D-020, D-021) |
| Cuentas claras públicas sin ranking | Nadie | Sí (Balanza) |
| Prohibición de contraprestación vigilada por sistema | Nadie | Sí (D-010, Compliance) |
| Confidencialidad por capas y matching interno sin publicar | Nadie | Sí (Scenario D) |

## 5. Qué adoptamos, mejorado (decisiones tomadas)

### D-029 · "Interesado avisado": la definición operativa de calidad de BNI, integrada en el Indicio y en la Promesa

BNI distingue el referido real por un hecho: el tercero espera la llamada. NS lo incorpora como campo del Indicio (`third_party_expects_contact`), lo detecta el Agente en el texto ("le he dicho que le llamarán"), lo pide en el formulario, lo muestra en la tarjeta de Cesión y lo convierte en un componente explícito de la Promesa ("Interesado avisado") y en evidencia del Encaje. Mejora respecto a BNI: no es una casilla que se marca, es un dato que el Agente contrasta y que pesa en el Mérito.

### D-030 · El Reloj de la Sala: los plazos los ejecuta el sistema, y el Agente empuja cuando el hilo pierde impulso

Boardy Pro demuestra que el seguimiento activo es lo que convierte intros en negocio. NS tenía los plazos diseñados (D-024) pero nada los ejecutaba. Ahora el Reloj de la Sala recuerda a las 72 horas, caduca a los 7 días, marca la respuesta tardía a las 48 horas del Puente y pregunta cada 14 días por el seguimiento; cada acción deja un evento y un Mérito. Mejora respecto a Boardy: el empujón lo recibe el Timonel en su Hoy, nunca el Interesado; ningún Agente contacta con terceros.

### D-031 · Rastreo público: las señales de Clay y Common Room, pero para ceder, no para vender

Las señales que más convierten (nueva sede, contrataciones, financiación, cambio de dirección) están en fuentes públicas españolas: BORME (constituciones, ampliaciones de capital, cambios de administrador), licitaciones (PLACE), licencias de obra municipales, ofertas de empleo, prensa local. El Agente de cada empresa las rastrea y las convierte en Indicios en borrador **para otros titulares de la Sala**; el Timonel decide si los publica. Mejora respecto a Clay: la señal no acaba en una secuencia de correos fríos, acaba en una Cesión con doble visto bueno dentro de un club. En v0.1 el Rastreo usa un adaptador de fuentes con un lote de ejemplo verosímil; los adaptadores reales (BORME vía datos.gob.es, PLACE, portales municipales) son el siguiente paso.

### D-032 · Encargo: la presentación semanal de BNI convertida en objeto que los Agentes usan

En BNI cada miembro dice cada semana "el referido que busco es...". Se pierde en cuanto termina la reunión. En NS el Encargo es un objeto persistente y visible en la Sala (qué busco ahora, con qué disparador, hasta cuándo), que los Agentes usan para priorizar: una Pista que responde a un Encargo abierto sube de prioridad y lo dice en su Fundamento. Mejora: el Encargo trabaja los siete días, no solo en el Pleno.

### Adoptado y ya presente

- Ritmo semanal (LeTip, BNI) → Ritmo y Compromiso (D-010, D-019).
- TYFCB → Veredicto con valor contrastado por ambas partes y Libro de Valor.
- Doble opt-in (Boardy, Commsor) → vistos buenos y Apertura.
- Presentación semanal y conocimiento mutuo (BNI) → Comunicado, Gaceta y Dossier (Protocolo II).

### En el mapa, no todavía

- **Sondeo y grafo de relaciones** (Alignable 360, Commsor): quién de la Sala conoce a quién fuera de ella. Requiere consentimiento y fuentes (contactos, correo). Fase 2.
- **Encuentro** (uno a uno de BNI): el Agente propone cada semana con quién reunirse y por qué, con agenda preparada. Fase 2, sobre la Gaceta.
- **Recalibración con Veredictos** (Lunchclub): pesos del Encaje ajustados por resultados reales. Cuando haya 50 Cesiones cerradas.
- **Despacho por voz** (Boardy): la entrevista del ADN y el Despacho semanal por teléfono. Cuando el proveedor real esté en producción.

## 6. Posicionamiento frente a cada uno (para la web pública)

```text
Frente a BNI          Las mismas reglas de confianza, sin las 4 horas semanales: tu Agente va a la reunión por ti, todos los días.
Frente a Boardy       No una IA que presenta a desconocidos: un club de empresas seleccionadas donde tu Agente cede y recibe con reglas.
Frente a Clay         Las mismas señales, pero terminan en una introducción cálida de un socio, no en un correo frío.
Frente a Linkeat      Sin obligaciones no hay negocio. Con obligaciones que cumple tu Agente, sí.
```

## Fuentes

- BNI Connect y ritual: [BNI Connect Mobile](https://apps.apple.com/us/app/bni-connect-mobile/id1212875170), [Referral Tracking en BNI Connect](https://bniblog.co.nz/bni-workshops/referrals/update-your-referral-partners-using-referral-tracking-in-the-bni-connect-app/), [BNI Slips Program Overview](https://support.bniconnect.com/hc/en-us/articles/219067637-BNI-SLIPS-PROGRAM-OVERVIEW), [Qué pasa en una reunión BNI](https://www.bni.com/the-latest/blog-news/what-happens-at-a-bni-meeting/), [Agenda de reunión](https://bnibrookline.com/meeting-agenda/), [BNI Education Moment](https://countylineconnections.com/bni-education-moment-ideas/), [BNI review 2026](https://diymarketers.com/bni-review/).
- BNI España precios: [Cuota de nuevo miembro](https://bnimarketing.es/producto/cuota-de-nuevo-miembro-bni/), [Renovación](https://bnimarketing.es/producto/cuota-de-renovacion-miembro-bni/), [BNI España](https://www.bniespana.com/).
- LeTip: [LeTip vs BNI](https://crapnoonetellsyou.com/letip-and-bni-are-referral-networking-titans/), [BNI vs LeTip vs Chamber](https://diymarketers.com/bni-vs-letip-vs-chamber-of-commerce/).
- Linkeat: [Alternatives au BNI](https://www.linkeat.club/alternatives-bni), [Linkeat](https://www.linkeat.club/).
- Boardy: [Guía Boardy Pro 2026](https://blastra.io/blog/boardy-ai-networking-guide/), [Boardy review](https://www.goodword.com/blog/boardy-ai-alternative-can-ai-really-manage-your-network), [Boardy Pro](https://slavakurilyak.com/posts/boardy-pro), [Articuler review](https://www.articuler.ai/resources/guides/boardy-ai-review/), [Polémica de la campaña](https://www.forbes.com/sites/rebekahbastian/2025/01/20/my-value-is-not-my-appearance--women-leaders-blast-ai-platforms-failed-campaign/).
- Lunchclub: [HP Tech Takes](https://www.hp.com/us-en/shop/tech-takes/lunch-club-networking), [Lightspeed](https://medium.com/lightspeed-venture-partners/lunchclub-the-future-of-professional-networking-429b25d82bb1).
- Intros.ai: [Pricing](https://www.intros.ai/pricing), [Forbes](https://www.forbes.com/sites/frederickdaso/2022/07/06/social-infrastructure-startup-intros-raises-13m-to-automate-community-member-introductions/).
- Señales: [Clay vs Common Room](https://www.artisan.co/blog/clay-vs-common-room-which-should-you-choose-in-2026), [Buying signals (Clay)](https://www.clay.com/guides/how-to-identify-buying-signals), [Common Room review](https://syncgtm.com/blog/common-room-review).
- Commsor: [Warm intros](https://www.commsor.com/warm-intros), [How it works](https://www.commsor.com/how-it-works), [Warm Intros 101](https://www.commsor.com/post/warm-intros-101).
- Alignable 360: [Newswire](https://www.newswire.com/news/small-businesses-just-got-a-faster-way-to-grow-meet-alignable-360-22524822), [Segundo grado](https://support.alignable.com/hc/en-us/articles/33896494846733-Paid-Member-Access-to-the-Second-Degree-Network), [Alignable review](https://paperbell.com/blog/what-is-alignable/).
- Fuentes públicas en España: [BORME en datos.gob.es](https://datos.gob.es/es/etiquetas/borme-0), [API BORME](https://datos.gob.es/en/catalogo/ea0040819-diario-oficial-borme/resource/50c83bd5-2034-4145-a12a-92d62790ddd0), [Licitaciones España (GitHub)](https://github.com/BquantFinance/licitaciones-espana), [Apispain](https://www.apispain.es/), [OpenMercantil](https://openmercantil.es/fuentes).
