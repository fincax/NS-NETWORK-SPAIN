# 12 · Territorialidad: plazas, sectores y demarcación

**Estado:** propuesta fundacional (D-011, PROPOSED).
**Premisa del fundador:** en cada territorio marcado, por pequeño o grande que sea, solo puede haber una empresa por sector. La idea principal es que entre un número abundante de buenas empresas.
**Problema a resolver:** la exclusividad sin territorio bien definido produce dos fallos opuestos: monopolios (una empresa "de Sevilla" bloquea a todas las demás de su sector) o conflictos (dos empresas que se disputan los mismos referidos). Hay que demarcar de forma que maximice plazas útiles sin romper la promesa "en mi territorio nadie compite conmigo".

---

## 0. Lo que enseña el mercado

| Modelo | Cómo demarca | Lección para NS |
| --- | --- | --- |
| **BNI / LeTip** | Una persona por clasificación profesional por capítulo. El capítulo (20–50 personas, una sala) es la unidad de exclusividad. Sin noción de territorio: dos capítulos en la misma ciudad pueden tener dos fontaneros. Coste BNI España ≈ 450 € alta + 1.249 € anual + cuota semanal de reunión. | La exclusividad "por sala" es un accidente logístico de la reunión presencial. Con agentes, la sala desaparece y la unidad natural de exclusividad pasa a ser **el mapa**. Las cuotas altas son consecuencia de capítulos pequeños. |
| **Franquicias (España)** | Zona de exclusividad fijada en contrato por relación de códigos postales o municipios, o mapa anexo. Las cadenas serias diseñan zonas con geomarketing: potencial de mercado equivalente entre zonas, volumen mínimo garantizado, y **no exceder ese volumen para maximizar el número de zonas**. | Es exactamente el objetivo de NS: zonas con potencial mínimo garantizado y el mayor número posible de ellas. La demarcación debe ser inequívoca (códigos oficiales, no descripciones). |
| **Google Business Profile** | La empresa declara sus áreas de servicio (ciudades, distritos, códigos postales), máximo 20, y no más de unas dos horas en coche desde su base. | El área de servicio se **declara desde la empresa** y se **limita por plausibilidad**. Es un precedente masivo y comprensible para cualquier pyme. |
| **Thumbtack / Angi** | El profesional elige códigos postales (hasta 1.000); el mismo lead se vende a 2–4 competidores. | El anti-modelo: sin exclusividad, la velocidad y el presupuesto publicitario ganan. NS es lo contrario: un lead nunca se reparte entre competidores. |
| **Uber H3 / rejillas hexagonales** | Celdas jerárquicas de tamaño uniforme (res. 5 ≈ 253 km², res. 7 ≈ 5 km², res. 9 ≈ 0,1 km²) para agregar y comparar territorios. | Útil **por dentro** para medir densidad y adyacencia. **Nunca** como frontera visible: un empresario entiende "Triana" o "Dos Hermanas", no un hexágono. |
| **INE (España)** | 8.1xx municipios; distritos y ≈ 36.000 secciones censales que cubren todo el territorio sin huecos, con códigos únicos y cartografía abierta. DIRCE: ≈ 3,3 M de empresas activas, con desglose municipal por actividad y tamaño. | La base cartográfica y el censo empresarial oficial ya existen, son gratuitos y son inequívocos. NS no inventa polígonos: **adopta los oficiales y decide a qué nivel se juega cada especialidad**. |

---

## 1. Principio rector: la exclusividad vive en el mapa, no en la sala

Con agentes que trabajan 24/7, la "reunión" ya no limita cuántas empresas pueden cooperar. Por tanto:

- La **plaza** (Category Seat) pasa a definirse como **Especialidad × Celda territorial**.
- El **círculo** deja de ser la unidad de exclusividad y pasa a ser la **unidad de comunidad humana** (rituales, consejo, confianza cara a cara, 25–35 empresas). Los agentes cooperan con toda la red; las personas se reúnen en su círculo.
- Un referido se enruta por **dónde está la necesidad** (la sede o el proyecto del tercero), no por dónde está el miembro. La plaza da derecho a recibir los referidos cuya necesidad cae en la celda.

Consecuencia directa: una ciudad ya no tiene "una plaza de reformas por círculo", sino "una plaza de reformas por celda de reformas". Si la celda natural de reformas es el distrito, Sevilla capital tiene 11 plazas de reformas en lugar de una.

---

## 2. La celda no es fija: cada especialidad tiene su resolución natural

La pregunta "¿municipio, distrito o algo menor?" no tiene una única respuesta porque **el radio real de servicio depende de la especialidad**. Un instalador de climatización trabaja a 15 minutos; un despacho de fiscalidad internacional trabaja a escala provincial o nacional.

NS define una **escala territorial oficial** (todas las unidades con código INE, sin huecos):

```text
L0  País
L1  Comunidad autónoma
L2  Provincia
L3  Área metropolitana / comarca          (agrupación de municipios definida por NS)
L4  Municipio
L5  Distrito                              (en municipios que los tienen; si no, = L4)
L6  Barrio / agrupación de secciones censales
```

Cada **Especialidad** lleva en la taxonomía su **nivel natural** (`natural_level`) y un rango permitido (`min_level`, `max_level`):

| Tipo de especialidad | Ejemplos | Nivel natural |
| --- | --- | --- |
| Proximidad (servicio físico recurrente, ticket bajo-medio) | reformas, climatización, limpieza, mantenimiento, rotulación, catering, gestoría de barrio, seguros generalistas, asesoría laboral pyme | L5 distrito / L6 barrio |
| Local (visita puntual, ticket medio) | arquitectura, obra comercial, seguridad física, mobiliario, audiovisual, marketing local, formación | L4 municipio / L3 área metropolitana |
| Provincial (conocimiento especializado, ticket alto) | ciberseguridad, ERP, financiación empresarial, selección directiva, legal mercantil, PRL | L2 provincia / L3 |
| Nacional o remoto (sin componente geográfico real) | fiscalidad internacional, M&A, propiedad industrial, software especializado | L1 / L0 |

Reglas:

1. Una empresa ocupa una plaza en el nivel natural de su especialidad. Puede pedir un nivel **más fino** (menos territorio, menos cuota) pero no más grueso de `max_level`.
2. Dos plazas de la misma especialidad nunca se solapan geográficamente. Una plaza L4 (municipio) excluye todas las L5/L6 de ese municipio para esa especialidad, y viceversa.
3. La Directiva puede **subir o bajar el nivel natural** de una especialidad por ciudad (en Madrid, "arquitectura" puede ser L5; en Huelva, L2).

Esto es lo que produce "un número abundante de buenas empresas": las especialidades de proximidad, que son la mayoría del tejido pyme, generan decenas de plazas por ciudad sin que ninguna compita con otra.

---

## 3. Viabilidad de la celda: profundidad de mercado, no superficie

Una celda no se define por kilómetros ni por población, sino por **cuánto negocio puede generar para esa especialidad**.

```text
Profundidad de mercado (especialidad, celda) =
    nº de empresas objetivo en la celda      (DIRCE por CNAE y tamaño, filtrado por el ICP de la especialidad)
  × frecuencia estimada de triggers relevantes por empresa y año
  × densidad de miembros NS que pueden originar señales en la celda
```

Una celda es **viable** para una especialidad si su profundidad estimada permite cumplir la cuota mínima de referidos válidos (D-010) con holgura (propuesta: ≥ 3× la cuota). Si no lo es, la celda se agrega con las vecinas hasta que lo sea (algoritmo de agregación por adyacencia, calculado con H3 por dentro, expresado en unidades INE por fuera).

Resultado práctico: en el centro de Sevilla la celda de "reformas" puede ser un barrio; en la Sierra Norte puede ser una comarca de doce municipios. El sistema lo calcula, la Directiva lo valida, el mapa lo muestra.

---

## 4. El territorio se gana y se conserva contribuyendo

El territorio no se compra. Se justifica con capacidad real y se conserva con aportación.

- **Cuota proporcional al territorio.** El mínimo de referidos válidos por periodo (D-010) escala con el número de celdas y el nivel ocupado. Quien quiera una provincia entera debe aportar como una empresa provincial.
- **Ampliación solo a celdas vacantes adyacentes.** Un titular puede solicitar celdas contiguas libres de su especialidad. Si aparece un solicitante de calidad para una de esas celdas, tiene prioridad sobre la ampliación del titular salvo que el titular demuestre conversión real en ella.
- **Cobertura provisional.** Las celdas vacantes se cubren provisionalmente por el titular más cercano (o mejor reputado) para que ningún referido se pierda. La cobertura provisional no es propiedad: termina en el momento en que la celda se ocupa.
- **Úsalo o libéralo.** El agente mide el "territorio efectivo": dónde acepta, atiende y convierte referidos el titular. Si durante dos periodos no atiende referidos válidos de una parte de su territorio, el sistema propone liberarla. La plaza se conserva; el territorio sobrante se abre.
- **Subdivisión por demanda.** Una celda se divide cuando hay lista de espera de solicitantes de calidad para esa especialidad **y** el titular no absorbe los referidos generados (tasa de aceptación o de respuesta por debajo del umbral). El titular elige qué subcelda conserva y mantiene cobertura provisional del resto hasta que se ocupe. La posibilidad de subdivisión se acepta expresamente al solicitar la plaza.

---

## 5. Qué es un sector: la prueba del referido

La taxonomía usa CNAE/IAE solo como índice de búsqueda. La definición operativa de conflicto es de producto, no administrativa:

> **Dos empresas son del mismo sector si un mismo referido válido debería enviarse legítimamente a las dos.**

Taxonomía de tres niveles (extiende D-001):

```text
Sector        → Especialidad        → Segmento (opcional)
Legal         → Laboral             → pyme | gran empresa
Construcción  → Reforma de oficinas → hasta 300 m² | más de 300 m²
IT            → Ciberseguridad      → industrial/OT | corporativa
```

- La plaza se otorga a nivel de **Especialidad**. El **Segmento** solo se usa cuando la Directiva comprueba que dos empresas de la misma especialidad reciben referidos realmente distintos (ticket, tamaño de cliente, tipo de obra). Es la válvula para admitir más buenas empresas sin fingir que no compiten.
- Cada especialidad tiene `overlaps_with` (D-001). El solapamiento se recalcula con datos: si el histórico muestra que los referidos de dos especialidades "distintas" acaban en las mismas empresas, se fusionan; si una especialidad recibe referidos heterogéneos que un titular declina sistemáticamente, se divide.

### Casuística que hay que resolver desde el día uno

| Caso | Regla |
| --- | --- |
| Empresa multiservicio (legal + fiscal + laboral) | Una plaza principal por empresa y celda. Las demás son capabilities secundarias sin exclusividad (D-001). Puede solicitar una segunda plaza solo si la especialidad lleva ≥ 2 periodos vacante en esa celda y asume la cuota completa de esa plaza. |
| Generalista frente a especialista | El generalista solo puede ocupar una plaza de especialidad concreta; nunca "el sector". Un especialista que solicita después tiene prioridad en las especialidades que el generalista no ocupa. |
| Franquicia o red de oficinas | La plaza la ocupa la unidad local (franquiciado, oficina), no la marca. Dos oficinas de la misma marca en dos celdas son dos plazas. |
| Empresa nacional o 100 % remota | Ocupa una plaza L1/L0 con cuota nacional. No bloquea plazas L4–L6 de especialidades de proximidad aunque "pueda" prestar el servicio: la exclusividad se aplica dentro del mismo nivel y en los niveles inferiores **solo** si la especialidad es la misma y el nivel natural coincide. |
| Sede fuera de la celda que se solicita | Permitido si demuestra clientes o equipo en la celda (verificación del agente). El territorio se asigna por capacidad de servicio real, no por domicilio social. |
| Dos solicitantes para la misma plaza | Se aplica la rúbrica de admisión (D-004) y la promesa de contribución. El que no obtiene la plaza entra en lista de espera con prioridad para la primera celda adyacente o subdivisión. |
| Cambio de especialidad de un titular | Se trata como nueva solicitud; la plaza anterior se libera con preaviso. |
| Miembro cuya empresa crece a varias celdas | Ampliación a celdas vacantes adyacentes con cuota proporcional (§4). |

---

## 6. El mapa NS: la demarcación como producto

La territorialidad no es un reglamento; es una pantalla.

- **Mapa público de disponibilidad.** El CTA "Comprobar disponibilidad de mi sector" se convierte en "Encuentra tu plaza en el mapa": el solicitante elige especialidad y ve, sobre el mapa de su ciudad, qué celdas están ocupadas, cuáles libres y cuáles en cobertura provisional. Genera urgencia real y honesta.
- **Mapa de la Directiva.** Celdas por especialidad con profundidad de mercado, titular, cuota cumplida, territorio efectivo, lista de espera y propuestas de subdivisión o liberación generadas por el agente.
- **Radar territorial.** En NS Radar, las señales se sitúan en la celda de la necesidad, y el enrutamiento explica: "Este referido va a Empresa X porque ocupa la plaza de Climatización en Distrito Nervión, donde está la nueva sede".
- **Nada de hexágonos en la interfaz.** Por fuera, barrios, distritos, municipios y comarcas. Por dentro, códigos INE y H3 para cálculo.

---

## 7. Modelo de datos (extensión de NS-ARP y del Referral Graph)

```text
TerritoryUnit { id, level (L0..L6), ine_code, name, geometry, parent_id, h3_cells[] }
Specialty     { id, sector_id, name, natural_level, min_level, max_level, overlaps_with[], segments[] }
CategorySeat  { id, specialty_id, segment_id?, company_id, territory_unit_ids[], status: ACTIVE|PROVISIONAL|WAITLISTED|RELEASED,
                quota_multiplier, granted_at, split_consent: true }
SeatCoverage  { seat_id, territory_unit_id, mode: OWNED|PROVISIONAL, effective_score }
MarketDepth   { specialty_id, territory_unit_id, target_companies, est_triggers_year, viability: VIABLE|AGGREGATE }
Waitlist      { specialty_id, territory_unit_id, application_id, priority }
```

Enrutamiento (NS-ARP S4 Agent Discovery): `need.location → TerritoryUnit → CategorySeat(specialty, OWNED)`; si no hay titular, `PROVISIONAL`; si tampoco, nivel superior; si tampoco, Global Routing. El originador acumula reputación en todos los casos.

---

## 8. Efecto sobre el modelo económico

El modelo territorial multiplica las plazas y, con ello, el número de empresas de calidad por ciudad. Eso permite cuotas muy inferiores a las de los clubes presenciales (D-012). La cuota puede escalar con el nivel territorial ocupado (una plaza de barrio cuesta menos que una provincial), lo que es coherente con la cuota de contribución proporcional. Nunca hay coste por referido (D-010).

---

## 9. Decisiones pendientes del fundador

1. Ratificar que la exclusividad se traslada del círculo a la celda territorial (D-011).
2. Validar la escala L0–L6 y la definición de L3 (áreas metropolitanas y comarcas NS).
3. Fijar la primera asignación de niveles naturales para las 30–40 especialidades del piloto de Sevilla.
4. Definir el umbral de viabilidad (propuesta: profundidad ≥ 3× cuota) y los umbrales de subdivisión y liberación.
5. Confirmar si el Segmento se usa desde el MVP o solo a partir del segundo círculo.
