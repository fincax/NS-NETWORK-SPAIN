# 05 · Brief de diseño para Claude Design

**Proyecto:** NS Network Spain · Agentic Business Referral Network
**Primera unidad:** NS Sevilla
**Versión del brief:** 0.1 · 2026-09-11
**Fuentes de verdad:** `CLAUDE.md`, `docs/DECISIONS.md` (D-001 a D-008), `docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`. Este brief las condensa; si algo contradice a esos documentos, prevalecen ellos.

---

## 0. Tu misión

Eres el Design Director fundador de NS Network. Tu trabajo no es "hacer pantallas bonitas". Es crear la identidad visual y la experiencia de una **categoría nueva de software B2B** que no existía: un club privado de empresas donde cada miembro tiene un agente de IA que trabaja 24/7 con los agentes de las demás empresas para descubrir negocio entre ellas.

El listón:

> Un empresario de 55 años que dirige una constructora de 120 empleados debe mirar la primera pantalla y pensar: "Esto es serio, esto es nuevo, y quiero estar dentro."

Y un diseñador de producto de referencia debe mirarla y pensar: "No había visto esto antes."

Ambas cosas a la vez. Si solo consigues una, no está terminado.

---

## 1. Qué es NS en tres frases (memoriza esto)

1. **Tu empresa no hace networking. Su agente sí, 24/7.**
2. Un club privado de empresas, **una empresa por especialidad**, miembros seleccionados por admisión.
3. **La IA descubre. Las personas deciden.** Ningún agente contacta con terceros sin autorización humana.

Mantra: **Human trust. Agentic execution. Business without idle time.**

## 2. Lo que NS NO es (y no puede parecer)

- No es LinkedIn, ni un directorio, ni un marketplace de leads, ni un CRM, ni un chatbot.
- No es una copia de BNI ni de ningún club de networking presencial.
- No es una plantilla SaaS. No es una fintech intercambiable. No es Web3.
- **Prohibido:** degradados púrpura de "IA", glassmorphism decorativo, iconos de robots o cerebros, partículas flotantes sin significado, chispas ✨, tipografía "tech" genérica, dashboards de plantilla, nodos animados que no representen datos reales.

La inteligencia se demuestra con **comportamiento** (explicaciones, precisión, velocidad, datos), nunca con clichés visuales.

---

## 3. Decisiones ya tomadas que condicionan el diseño

| Decisión | Implicación para diseño |
| --- | --- |
| **D-001** Plaza por especialidad (taxonomía Sector → Especialidad) | El selector de disponibilidad de la web y el mapa de plazas de la Sala son piezas centrales. Mostrar "Ciberseguridad · Plaza ocupada" / "Paid Media B2B · Disponible" a nivel de especialidad. |
| **D-002** El agente se alimenta de Business DNA + señales que el miembro introduce | La entrada de señal ("He sabido que…") debe ser la acción más fácil del producto: móvil, 30 segundos, voz o texto. El check-in semanal del agente es un ritual con diseño propio. |
| **D-003** Doble consentimiento del empresario; Directiva solo por excepción | La referral card tiene dos caras (originador y receptor). Las excepciones de Directiva se explican en la propia card. |
| **D-004** Admisión con umbrales + rúbrica + entrevista | El flujo público es "Solicitar plaza", nunca "Sign up". Debe sentirse como solicitar acceso a un club, no como registrarse en una app. |
| **D-005** Cuota de incorporación + membresía anual, sin comisión | La página de membresía comunica pertenencia y ROI, no "pricing tiers" de SaaS. |
| **D-006** Salas de 25–35 plazas, arranque con 12–15 fundadoras | La Sala cabe en una sola vista. Diseñar para 30 empresas, no para 3.000. |
| **D-007** Marca institucional-premium, "el club empresarial del futuro" | Ver §4. |

---

## 4. Dirección de marca

### 4.1 Personalidad

Premium · exclusivo · tecnológico · fiable · empresarial · europeo · sofisticado · contemporáneo · humano.

Si tuviera que describirse como un lugar: un club de negocios de arquitectura contemporánea en el centro de Sevilla, luz cálida sobre piedra y madera oscura, y en una pared una visualización de datos en tiempo real que nadie explica porque se entiende sola.

### 4.2 Tensión creativa que debes resolver

```text
PRESTIGIO INSTITUCIONAL  ←→  INTELIGENCIA TECNOLÓGICA  ←→  ENERGÍA COMERCIAL
(piedra, tipografía        (datos, precisión,             (ámbar, movimiento,
 editorial, silencio)       señal verde, Radar)            oportunidad, dinero)
```

La marca vive en el equilibrio de los tres. Si solo hay prestigio, parece un despacho de abogados. Si solo hay tecnología, parece otra startup de IA. Si solo hay energía comercial, parece un marketplace.

### 4.3 Foundation cromática (punto de partida, refinar)

```text
Obsidian        #0B0D10   fondo profundo, app privada en modo oscuro
Graphite        #1A1D22   superficies elevadas
Porcelain       #F4F1EC   fondo cálido, web pública y modo claro
Warm white      #FBFAF7   superficies en claro
Institutional   #0F2A4A   azul institucional profundo, identidad y énfasis
Signal green    #2FBF71   señal detectada, actividad de agentes, "vivo"
Opportunity amber #E8A33D oportunidad, valor, acción pendiente
```

Reglas:

- Signal green y Opportunity amber son **semánticos**: verde = la red está trabajando / señal / match; ámbar = valor / decisión pendiente / dinero. Nunca decorativos.
- Nada de degradados como identidad. Un degradado sutil solo puede existir dentro de una visualización de datos con significado (intensidad, confianza).
- Contraste WCAG AA mínimo en todo texto. Premium no significa ilegible.
- Entregar paleta completa con escalas (50–900) para neutros, azul, verde y ámbar, más colores de estado (error, aviso, info) coherentes.

### 4.4 Tipografía

- **Display editorial** con carácter (una serif contemporánea o una grotesk de alto contraste) para titulares, cifras de valor y la voz de la marca.
- **Sans funcional** de gran legibilidad para la app (interfaz, tablas, cards, móvil).
- **Mono** solo para identificadores, timestamps del Agent Room y datos técnicos.
- Escala tipográfica generosa: los titulares de la web pública pueden ser enormes. Las cifras de valor (€42.000 – €67.000) son protagonistas y merecen tratamiento tipográfico propio (tabular figures, peso, tracking).
- Propón 2–3 combinaciones y elige una con argumentos. Todas con licencia apta para producto y web.
- **Elegida (D-064):** **Instrument Serif** para titulares y cifras de valor, **Inter** para la interfaz y el texto, **IBM Plex Mono** para identificadores y horas. Instrument Serif solo tiene peso 400: los titulares nunca van en negrita.

### 4.5 Tendencias que sí y que no

Sí, si sirven a la función:

- Tipografía editorial de gran tamaño y jerarquía brutal en la web pública.
- Layouts asimétricos con mucho aire, ritmo de revista de negocios de alta gama.
- Modo oscuro cálido (no negro puro, no azul frío) para la app privada; modo claro porcelain para la web.
- Profundidad táctil sutil (bordes finos, sombras cortas, superficies con textura mínima), en lugar de cristal.
- Datos como protagonista: sparklines, indicadores de confianza, radar, timelines. Visualización exquisita y sobria.
- Microinteracciones con intención: una card que "respira" cuando llega un match, un contador que sube cuando se confirma valor.
- Motion contenido, físicamente creíble, con `prefers-reduced-motion` respetado.

No, aunque estén de moda:

- Glassmorphism, neomorfismo, aurora gradients, blobs, grain excesivo, 3D genérico, mascotas, emojis en la interfaz, "bento grids" como decoración vacía.

---

## 5. El logo

### 5.1 Encargo

Diseñar el sistema de identidad completo:

1. **Monograma NS** que funcione desde 16 px (favicon) hasta una fachada.
2. **Wordmark** "NS Network".
3. **Lockups jerárquicos:** NS Network · NS España · NS Sevilla · NS Cumbre. La arquitectura de marca es global → país → zona (ciudad) → Sala y el sistema debe escalar sin rediseño. El nombre de ciudad pertenece a la zona; cada Sala tiene nombre propio con prefijo NS, autorizado por NS (D-014). El sistema de identidad debe prever un lockup de Sala que conviva con el de zona sin competir con él.
4. Versiones: positivo sobre porcelain, negativo sobre obsidian, monocromo, azul institucional, y una versión "activa" donde un único elemento adopta signal green (para estados de la app: "tu agente está trabajando").
5. App icon, favicon, avatar de agente (ver 5.3), marca de agua para documentos, sello de "Miembro NS Sevilla" para que las empresas lo usen en sus webs y firmas de correo.

### 5.2 Territorios conceptuales · DECIDIDO (D-022)

**Decisión del fundador (2026-09-12):** territorio "la reunión permanente", ejecución **B · Desplazado**: dos medios discos sobre un eje vertical, desplazados, que se tocan en un segmento (el Puente). Geometría y archivos en `brand/`. Lo que sigue se conserva como registro de la exploración.

#### Territorios explorados

- **La plaza.** Una Sala con un hueco o segmento: cada empresa ocupa una posición única e irrepetible. Habla de exclusividad y de pertenencia.
- **La reunión permanente.** Dos formas que se tocan sin fundirse: dos empresas, dos agentes, un punto de contacto. Habla de cooperación y de confianza.
- **El radar / la órbita.** Un barrido, un arco, un punto que aparece: la red detecta algo mientras tú no miras. Habla del 24/7 y conecta con NS Radar, el elemento icónico del producto.
- **El sello.** Una marca de calidad, casi notarial, construida con geometría precisa. Habla de admisión y prestigio.

Lo que NO puede ser: un nodo con líneas (ya es el logo de mil empresas), un cerebro, un robot, un apretón de manos, un chip, un candado, una lupa, letras con "circuitos".

### 5.3 El avatar del agente

Cada empresa tiene un NS Business Agent. No es una mascota ni un chatbot. Necesita una representación visual **abstracta y viva**: una forma geométrica derivada del monograma que pueda mostrar estado (en reposo, analizando, ha encontrado algo, esperando tu decisión) mediante cambios mínimos de forma, luz o ritmo. Piensa en un indicador de presencia elevado a identidad, no en un personaje.

### 5.4 Criterios de evaluación del logo

- ¿Se reconoce en 16 px? ¿Y a 40 metros?
- ¿Funciona en monocromo, grabado en metal, bordado en tela?
- ¿Tiene un elemento que la app pueda "animar con significado"?
- ¿Escala a NS Lisboa y NS Milán sin perder sentido?
- ¿Parece la marca de un club al que cuesta entrar?
- ¿Se parece a algo que ya existe? Si la respuesta es sí, descártalo.

---

## 6. Pantallas a diseñar (con prioridad)

### Prioridad 1 · Las cinco piezas que definen el producto

**1. Landing pública (hero).** Debe comunicar en 5 segundos: "Tu empresa no hace networking. Su agente sí, 24/7." Narrativa en scroll: Problema → Cambio → Red → Resultado → Confianza → Control → CTA. Dos CTAs: **Comprobar disponibilidad de mi sector** (primario) y **Solicitar plaza**. Estilo editorial, cinematográfico, con una sola pieza de visualización real (un fragmento del Radar) que demuestre la tesis sin explicarla.

**2. Referral card.** La mejor pieza de UX del producto. Un objeto premium y accionable que muestra siempre: WHY · EVIDENCE · CONFIDENCE · UNKNOWN · NEXT ACTION. Nunca solo un porcentaje. Contenido de referencia:

```text
OPORTUNIDAD DETECTADA
Auditoría de ciberseguridad · 92% NS Match · Confianza alta

Origen: miembro de confianza · relación directa con Dirección
Empresa potencial: información restringida hasta tu aprobación
Trigger: nueva sede + crecimiento de plantilla
Valor estimado: €18K – €30K · Timing: 30–60 días

Por qué encaja
+ El trigger "nueva sede" está en tu lista de señales prioritarias.
+ Empresa industrial de 51–200 empleados: tu ICP exacto.
+ Sevilla capital, dentro de tu zona de servicio.
+ El miembro originador tiene relación directa con Dirección.

Pendiente
- Presupuesto aprobado: sin confirmar.

[APROBAR INTRODUCCIÓN]  [SOLICITAR MÁS INFORMACIÓN]  [DESCARTAR]
```

Diseñar la card en sus dos caras (originador: "autorizar revelar"; receptor: "aceptar") y en sus estados: nueva, en revisión, requiere Directiva (con explicación), aprobada, introducida, expirada, baja confianza.

**3. NS Radar.** El elemento visual icónico de la marca. Muestra empresas de la Sala, señales activas, matches en investigación e intensidad. Cada elemento visual corresponde a un dato real; ninguna animación decorativa. Debe funcionar como pantalla completa (desktop), como widget en "Hoy" y como fragmento en la landing. Explora: disposición circular por plazas (la geometría de la Sala NS), barrido temporal, señales que emergen desde la empresa originadora hacia las especialidades relevantes.

**4. Agent Room.** La reunión 24/7 hecha tangible. Un timeline de eventos significativos, no un chat de bots:

```text
10:42  Agente Correduría Guadalquivir detectó una nueva señal.
10:43  3 agentes solicitaron contexto adicional.
10:44  Mobiliario Delta descartada: ticket mínimo incompatible.
10:46  Reformas Industriales Híspalis alcanza 91% de compatibilidad.
10:48  Compliance verificó permisos. Sin excepciones.
10:51  Referido preparado para revisión.
```

Diseñar densidad, ritmo, filtros (mi empresa / toda la Sala), estado "en vivo" y estado "resumen de la noche".

**5. Hoy (home autenticada).** Responde a "¿Qué ha hecho mi red por mi empresa desde la última vez que entré?":

```text
Buenos días, Carlos.
Mientras estabas fuera:
12 conversaciones entre agentes · 3 señales relacionadas con tu empresa
2 matches investigados · 1 referido preparado para tu aprobación
Valor potencial detectado: €42.000 – €67.000
```

Con acceso inmediato a: nueva señal ("He sabido que…"), referidos pendientes, Radar, estado de mi agente.

### Prioridad 2 · Flujo público y admisión

- Comprobar disponibilidad de mi sector (selector Sector → Especialidad, resultado "Disponible / Ocupada / Lista de espera" en NS Sevilla, por Sala: NS Cumbre, NS Ágora…).
- Solicitar plaza (formulario que se siente como candidatura, no como registro).
- Cómo funciona · Para empresas · Filosofía · Seguridad y privacidad · Membresía.

### Prioridad 3 · Onboarding y agente

- Entrevista inteligente del agente (conversacional pero estructurada; el agente pregunta "Explícame una situación real que para ti sería el referido perfecto").
- Business DNA preview y validación humana.
- Mi Agente: estado, permisos (READ · INFER · STORE · SHARE · REVEAL IDENTITY · CONTACT · WRITE · EXECUTE) como controles claros, nunca como un muro de toggles.
- Nueva señal (móvil, 30 segundos, voz o texto) y previsualización de "qué verán los demás" antes de publicar.

### Prioridad 4 · Sala, valor y Directiva

- Mi Sala: mapa de plazas (ocupadas, disponibles, en admisión), perfiles de miembros.
- Valor Generado: siempre separado en Potencial · Pipeline · Verificado.
- Command Center de Directiva: admisiones, conflictos de plaza, salud de miembros, actividad agentic, compliance, métricas.

### Móvil

No es el escritorio encogido. Prioridad: **Nuevo match → Ver por qué → Revisar → Aprobar / Pedir contexto / Rechazar → Introducción**. Convertir decisiones de 10 minutos en decisiones de 30 segundos. Business DNA y configuración avanzada pueden priorizar escritorio.

---

## 7. Estados que toda pantalla debe contemplar

loading · empty · first use · error · partial data · offline/retry · permission denied · low confidence · stale data · completed. Nunca diseñar solo el happy path. Los empty states de una Sala recién creada con 12 empresas deben inspirar, no avergonzar.

---

## 8. Datos demo: NS Sevilla · NS Cumbre

Usa siempre empresas verosímiles. Nunca "Empresa A" ni lorem ipsum. Nombres ya establecidos en el protocolo (mantenlos para coherencia):

| Empresa | Especialidad |
| --- | --- |
| Correduría Guadalquivir | Seguros de empresa |
| Reformas Industriales Híspalis | Obra y reforma industrial |
| PRL Andaluza | Prevención de riesgos laborales |
| Talento Sur | Selección de personal |
| SecureNet Sevilla | Ciberseguridad |
| Mobiliario Delta | Mobiliario de oficina |
| Branding Atelier | Branding |
| Consultora Fiscal Triana | Asesoría fiscal |
| Bufete Alameda | Legal M&A |
| Valoraciones Ibéricas | Valoración de empresas |

Completa hasta 25–30 con especialidades plausibles del tejido sevillano: arquitectura, telecomunicaciones, marketing digital, financiación, inmobiliario de oficinas, facility management, logística, formación, auditoría, energía, software a medida, eventos corporativos, traducción, seguridad física, transporte.

Escenarios a ilustrar:

- **A · Oportunidad excelente:** un cliente de Correduría Guadalquivir abre planta en Dos Hermanas; Híspalis alcanza 91%.
- **C · Falso positivo:** Branding Atelier descartada por ticket mínimo incompatible (demuestra que NS entiende negocios, no palabras).
- **D · Confidencialidad:** Consultora Fiscal Triana recibe "Tu agente ha identificado dos miembros que podrían ayudar a un cliente tuyo en una operación confidencial. Nada se ha compartido."

Personas: Carlos (miembro, CEO de Híspalis), Lucía (miembro, socia de Guadalquivir), Directiva: Presidencia de la Sala.

---

## 9. Microcopy

Lenguaje empresarial, claro, en español de España, tuteo profesional. Nada de "sinergias potenciadas por IA". Ejemplos correctos:

- "Hemos encontrado una posible oportunidad para tu empresa."
- "Tu agente no tiene información suficiente para valorar esta señal. ¿Puedes responder a dos preguntas?"
- "Nada se ha compartido todavía. Tú decides."
- "Este referido requiere revisión de la Directiva porque la especialidad es colindante con otra plaza de la Sala."

---

## 10. Accesibilidad y rendimiento

WCAG AA mínimo. Navegación por teclado, focus visible y elegante, contraste, tamaños táctiles ≥ 44 px, `prefers-reduced-motion`, lenguaje comprensible. La interfaz debe sentirse instantánea: nada de loaders permanentes ni animaciones pesadas.

---

## 11. Entregables

1. **Identidad:** monograma, wordmark, lockups jerárquicos, versiones, avatar del agente con estados, app icon, favicon, sello de miembro, guía de uso (espacio de protección, tamaños mínimos, usos incorrectos).
2. **Design tokens:** color (escalas y semánticos, claro y oscuro), tipografía (familias, escala, pesos, tabular figures), espaciado, radios, sombras, motion (duraciones, curvas).
3. **Componentes:** botones, inputs, selector Sector → Especialidad, badges de confianza y estado, referral card completa, evento del Agent Room, fila de miembro, tarjeta de plaza, panel de valor, indicador de agente, navegación desktop y móvil, notificaciones.
4. **Pantallas clave** en desktop y móvil con sus estados: las cinco de Prioridad 1 completas; Prioridad 2 y 3 en su flujo principal; Prioridad 4 en Command Center.
5. **NS Radar:** concepto, anatomía, comportamiento en tres tamaños, y qué dato representa cada elemento.
6. **Un documento de rationale** de una página: por qué esta identidad, por qué esta tipografía, por qué este Radar. Argumentos, no adjetivos.

## 12. Cómo trabajar

- Empieza por identidad y tokens; sin eso, cada pantalla será una opinión distinta.
- Después la referral card y el Radar: si esas dos piezas no dejan a nadie con la boca abierta, el resto no importa.
- Después Hoy, Agent Room y landing.
- Presenta alternativas solo donde la decisión sea de marca (logo, tipografía). En lo demás, decide y argumenta.
- Cuando algo de este brief empeore el resultado, dilo y propón algo mejor. Tu estándar no es "queda bien". Es "esto podría definir una nueva categoría de software B2B".
