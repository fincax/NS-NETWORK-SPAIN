# 12 · La Sala: eje de NS Network

**Estado:** especificación fundacional (D-013, CONFIRMED por el fundador). Plazas sin tope, tres pruebas de Especialidad y profesiones tecnológicas priorizadas: D-080 (CONFIRMED, sustituye a D-006).
**Sustituye a:** la propuesta territorial (D-011, superada).
**Premisas del fundador:** el modelo de sala. En un mismo territorio (por ejemplo, Sevilla) se pueden crear todas las Salas que permita la saturación de la zona. La sectorización toma como eje una clasificación parecida a la CNAE, pero no inmutable: cuando la casuística hace surgir una nueva profesión, NS la contempla antes que la administración.

---

## 0. Qué es una Sala

Una **Sala NS** es un grupo cerrado de empresas seleccionadas, con **una empresa por especialidad**, cuyos agentes trabajan juntos 24/7 y cuyas personas se conocen y se reúnen. Es el equivalente permanente y agentic de la reunión de un club de referidos.

```text
NS Network
└── NS España
    └── Zona NS Sevilla
        ├── NS Cumbre      (Sala · una empresa por especialidad; sin tope: tantas plazas como Especialidades NS)
        ├── NS Ágora       (Sala)
        ├── NS Meridiana   (Sala)
        └── ...            tantas como permita la saturación de la zona
```

Vocabulario oficial:

| Término NS | Qué es | Identificador técnico |
| --- | --- | --- |
| **Sala** | Unidad fundamental. Exclusividad, comunidad, cuota de contribución, rituales. | `Chapter`, `chapter_id`, visibilidad `CHAPTER` |
| **Zona** | Ámbito geográfico (ciudad o área metropolitana) que aloja Salas. Definida con unidades INE. | `Zone`, `zone_id` |
| **Plaza** | Posición única de una especialidad dentro de una Sala. Una Sala tiene tantas plazas posibles como Especialidades NS vigentes: no hay tope numérico (D-080). | `CategorySeat` |
| **Plaza base** | Especialidad que NS-CAT marca para fundar cualquier Sala: Manantiales primero, profesiones tecnológicas segundo, después el resto (D-080). | `Specialty{ base }` |
| **Plaza por demanda** | Cualquier otra Especialidad NS. Se abre en una Sala cuando sus Agentes detectan necesidades de esa especialidad que salen por Embajada o se pierden (D-080). | `Specialty` sin `base` + `CategorySeat` |
| **Especialidad NS** | Nivel de la clasificación NS-CAT que otorga plaza. Existe solo si pasa a la vez las tres pruebas de §3.4. | `Specialty` |
| **Directiva de Sala** | Presidencia y consejo de la Sala. | `Director` |
| **Directiva de Zona** | Gobierna apertura, escisión y fusión de Salas en la zona. | `ZoneDirector` |

No se usa "capítulo" ni "grupo": son términos de otros modelos. "Sala" es lenguaje propio de NS.

### 0.1 Nomenclatura de zonas y Salas (D-014)

- **La zona lleva el nombre de la ciudad y pertenece a NS:** "NS Sevilla", "NS Madrid". Agrupa todas las Salas de la zona. Solo NS puede usarlo.
- **Ninguna Sala puede llevar el nombre de una ciudad, municipio, provincia, comunidad autónoma, país, barrio o distrito**, ni ningún otro término que dé pistas territoriales (ríos, monumentos o hitos identificables de la zona incluidos). **La Sala no es territorial**: se define por sus empresas, no por un mapa (principio 16).
- **Cada Sala elige su nombre propio**, con el prefijo NS: "NS Cumbre", "NS Ágora", "NS Meridiana". Lo proponen las empresas fundadoras y lo **autoriza NS**.
- **Criterios de autorización:** prefijo NS + una o dos palabras; único en toda la red (un solo "NS Cumbre" en el mundo); no topónimo administrativo; no marca registrada ni nombre de una empresa miembro; no término protegido de otras organizaciones de networking; sin connotaciones ofensivas o partidistas; pronunciable en el idioma de la zona. NS mantiene un registro central de nombres y una lista de reservados.
- **Hasta la autorización**, una Sala en formación se identifica con un código provisional interno ("NS Sevilla · Sala en formación 03") que nunca es su nombre público.
- **Identidad visual:** el lockup de zona (NS Sevilla) y el de Sala (NS Cumbre) conviven en la app; la Sala tiene nombre pero no marca propia separada de NS.

Ejemplo completo: una empresa es miembro de **NS Cumbre**, Sala de **NS Sevilla**, dentro de **NS España**.

---

## 1. Lo que enseña el mercado

| Modelo | Cómo funciona | Qué toma NS |
| --- | --- | --- |
| **BNI / LeTip** | Un profesional por clasificación por capítulo. Varios capítulos por ciudad. Cuotas altas (BNI España ≈ 450 € alta + ≈ 1.249 € anuales + cuota semanal de reunión) porque cada capítulo es pequeño y presencial. | La sala como unidad de exclusividad y pertenencia. NS la mantiene y le añade agentes 24/7, muchas más Salas por zona y cuotas bajas. |
| **Franquicias** | Zonas diseñadas con potencial de mercado equivalente y volumen mínimo garantizado, sin exceder ese volumen para maximizar el número de zonas. | El criterio de **saturación por profundidad de mercado**: una zona abre Salas mientras cada una pueda alimentar a sus miembros. |
| **Thumbtack / Angi** | Un mismo lead vendido a 2–4 competidores. | El anti-modelo. En NS un referido nunca se reparte entre competidores. |
| **INE / CNAE / DIRCE** | Clasificación oficial de actividades, cartografía sin huecos y censo de empresas por municipio, actividad y tamaño. | La **base** de la clasificación (NS-CAT) y de la medición de saturación. NS no inventa lo que ya existe; lo amplía. |

---

## 2. Zonas y saturación: cuántas Salas caben en Sevilla

### 2.1 La zona

Una **Zona NS** es una ciudad o área metropolitana definida por una lista de municipios (códigos INE). Sevilla: capital y área metropolitana (Dos Hermanas, Alcalá de Guadaíra, Aljarafe, etc.), a validar por el fundador. La zona **no** es unidad de exclusividad: dos Salas de la misma zona pueden tener, cada una, su empresa de reformas.

Una empresa pertenece a **una sola Sala por zona**. Una empresa con unidades locales en varias zonas puede solicitar plaza en una Sala de cada zona, con cuota de contribución independiente.

### 2.2 Cuándo se abre una Sala nueva

La Directiva de Zona abre la Sala N+1 cuando se cumplen las tres condiciones:

1. **Demanda real.** Existe una lista de espera de solicitantes **ya admitidos** (D-004) que no caben en las Salas existentes porque su especialidad está ocupada, y alcanzan el **mínimo de fundación** (parámetro de cada Fundación, por defecto 12, D-041) cubriendo **plazas base** (D-080): antes que ninguna, las especialidades **Manantial** (administración de fincas, asesoría fiscal, correduría de seguros, arquitectura), que son las que más Cesiones de calidad traen desde el primer día (D-059); después, las **profesiones tecnológicas** (software a medida, ERP, ciberseguridad, nube, datos e IA, telecomunicaciones), las más receptivas a lo agentic de NS y las que más señales generan para las demás plazas; y por último el resto de plazas base (construcción/reforma, legal, seguros, marketing, RR.HH., financiación, inmobiliario, consultoría).
2. **Profundidad de mercado.** El censo de empresas objetivo de la zona (DIRCE por CNAE y tamaño, filtrado por los ICP de las especialidades fundadoras) soporta una Sala más sin que el flujo esperado de referidos válidos por miembro caiga por debajo del umbral configurado (propuesta: ≥ 3× el Compromiso semanal de D-042).
3. **Salud de las Salas existentes.** Las Salas activas tienen cubiertas sus plazas base, su tasa de cumplimiento del Compromiso es sana y no pierden Indicios por falta de plaza que la Antesala pudiera cubrir. No se abre una Sala nueva para descargar una Sala que no funciona, y nunca por tamaño: una Sala no se parte por grande (D-080).

**Quién empuja (D-041).** La empresa cuya plaza está ocupada no se queda en lista: NS le ofrece ser **Promotora** de la siguiente Sala. Reúne fundadoras en la Antesala (una por especialidad), la Directiva funda la Sala al alcanzar el mínimo, y la Promotora recibe una **gratificación** anunciada por NS (propuesta: meses de cuota gratis). Reglas completas en D-041.

### 2.3 Cuándo la zona está saturada

Señales que detienen la apertura y que el Chapter Intelligence Agent vigila:

- el flujo de referidos válidos por miembro y periodo en las Salas existentes baja dos periodos seguidos;
- la tasa de referidos **exportados** (que ninguna plaza de la Sala originadora cubre y se enrutan a otra Sala de la zona) cae por debajo de un mínimo: si casi nada sale de las Salas, la zona ya está cubierta;
- la tasa de aceptación de referidos por parte de los receptores baja (señal de referidos de peor calidad por sobreoferta);
- la lista de espera de calidad deja de crecer.

La saturación **no es un número fijo de Salas**: es una lectura continua de datos. Sevilla puede sostener 3 Salas o 12; lo dirán la lista de espera y el flujo de referidos.

### 2.4 La Sala no es territorial

Dentro de una zona, la Sala **no** tiene barrio, distrito ni radio de acción. Las empresas se asignan a una Sala por disponibilidad de plaza, complementariedad y calidad, nunca por dónde tienen la sede. Dos empresas de la misma calle pueden estar en Salas distintas; dos de municipios opuestos de la zona, en la misma. La geografía sigue contando en el **matching** (el NS Match Score valora si la empresa puede servir dónde está la necesidad), pero nunca en la **identidad ni en la composición** de la Sala.

Consecuencias de diseño:

- la asignación de nuevos miembros a Salas no usa la ubicación como criterio;
- ninguna pantalla muestra las Salas sobre un mapa ni sugiere áreas de influencia;
- el lugar de reunión presencial de una Sala es logística, no identidad, y puede rotar.

---

## 3. Sectorización: NS-CAT, base CNAE ampliable

### 3.1 Estructura

**NS-CAT** (Clasificación NS de Actividades) toma como índice la estructura de la CNAE vigente y añade un nivel propio:

```text
Sección  (CNAE)        M   Actividades profesionales, científicas y técnicas
División (CNAE)        69  Actividades jurídicas y de contabilidad
Grupo    (CNAE)        69.1 Actividades jurídicas
Clase    (CNAE)        69.10 Actividades jurídicas
Especialidad NS        69.10-NS-03  Derecho laboral
                       69.10-NS-04  Derecho mercantil y societario
                       69.10-NS-07  Compliance y protección de datos
```

- La **plaza se otorga a nivel de Especialidad NS**. Nunca a nivel de clase CNAE (demasiado ancho: "69.10 Actividades jurídicas" bloquearía a diez despachos que no compiten; "62.02 Consultoría informática" dejaría fuera a toda la tecnología menos a una empresa). La CNAE es el índice, nunca la plaza (D-001, D-080).
- **No hay tope de plazas por Sala** (D-080). El máximo es el número de Especialidades NS vigentes en la versión de NS-CAT sobre la que opera la Sala. Lo que limita es la demanda (§4, plaza base y plaza por demanda), y lo que protege la promesa "nadie compite conmigo" es la definición de la especialidad (§3.4).
- Cada Especialidad NS tiene: código, nombre comprensible, descripción en lenguaje de negocio, `overlaps_with[]` (matriz de solapamiento, D-001), ejemplos de referido perfecto y de referido que no le corresponde, estado, la marca **base** cuando es plaza de fundación (D-080), la marca **Manantial** cuando, por naturaleza, ve necesidades de muchos sectores (D-059) y la marca **tech** cuando es una profesión tecnológica (D-080). Las marcas no cambian ninguna regla de la plaza: sirven para captar, para ordenar la Antesala, para preparar al Agente y para reconocer la amplitud de lo cedido.
- Un solicitante elige su especialidad con ayuda del agente durante la solicitud; el agente propone la especialidad a partir del CNAE declarado, la web y la entrevista, y detecta solapamientos antes de enviar la solicitud.

### 3.2 Estados de una especialidad

| Estado | Origen | Qué implica |
| --- | --- | --- |
| `OFICIAL` | Derivada directamente de una clase CNAE. | Base estable de la taxonomía. |
| `NS_EXTENDIDA` | Creada por NS por debajo de una clase CNAE porque el mercado la distingue (por ejemplo, "Paid Media B2B" dentro de publicidad). | Otorga plaza como cualquier otra. |
| `PROVISIONAL` | Nueva profesión que la administración aún no recoge (por ejemplo, integración de agentes de IA, gobierno del dato, operaciones de modelos, sostenibilidad o nuevas formas de financiación). Las profesiones tecnológicas emergentes entran por esta vía en diez días como máximo, sin esperar a la CNAE (D-080). | Otorga plaza en periodo de prueba de dos periodos de contribución. Se consolida como `NS_EXTENDIDA` si genera y recibe referidos válidos; si no, se fusiona con la más cercana. |
| `RETIRADA` | Fusionada o eliminada. | Las plazas existentes migran a la especialidad sucesora con preaviso. |

### 3.3 Cómo nace una profesión nueva en NS

```text
Solicitud de plaza con actividad no contemplada
  → el agente de admisión propone la Especialidad NS más cercana y la marca como posible hueco
  → el Comité de Clasificación (Directiva de Zona + NS España) decide en ≤ 10 días:
      · asignar a una especialidad existente, o
      · crear una especialidad PROVISIONAL con su matriz de solapamiento provisional
  → se registra en DECISIONS (cambio menor de taxonomía) y en el changelog de NS-CAT
  → tras dos periodos con datos: consolidar, fusionar o retirar
```

NS-CAT lleva versión propia (`nscat_version`). Cada Sala opera sobre una versión; los cambios se aplican con migración de plazas explícita.

### 3.4 Las tres pruebas de Especialidad NS (D-080)

La CNAE es el índice; la definición de la plaza es de producto. Sin tope de plazas, la única defensa contra trocear una especialidad para colar a un competidor es esta definición. **Una Especialidad NS existe, y es plaza, solo si pasa las tres pruebas a la vez:**

| Prueba | Pregunta | Ejemplo que la pasa | Ejemplo que no la pasa |
| --- | --- | --- | --- |
| **Del referido** | ¿Un referido válido para A deja de serlo para B? | Un despido colectivo no es un referido para el mercantilista: laboral y mercantil son dos plazas. | "Despidos" y "convenios colectivos": el mismo referido vale para las dos. Una sola plaza, laboral. |
| **De la unidad de contratación** | ¿El cliente contrataría proveedores distintos para A y para B? | Implantación de ERP y software a medida: el cliente contrata a un implantador de Odoo o SAP y a otra empresa para su aplicación propia. Dos plazas. | Desarrollo web y comercio electrónico cuando el cliente contrata a la misma empresa para las dos cosas. Una plaza. |
| **De la señal** | ¿El Agente puede enrutar la necesidad a A o a B desde un Indicio típico sin preguntar? | "Han sufrido un ataque y han perdido datos" va a ciberseguridad; "quieren mover los servidores fuera de la oficina" va a nube e infraestructura. Dos plazas. | "Quieren digitalizar la empresa" no distingue entre A y B: mientras ningún Indicio típico las separe, A y B no son dos plazas. |

Condición de creación, además de las tres pruebas: **prueba de mercado**. Al menos tres empresas independientes la ofrecen como actividad principal en la zona. Para las especialidades tecnológicas, que se prestan en remoto, la prueba de mercado se mide en España, no en la zona (§3.5).

**Ejemplo completo: 69.10 Actividades jurídicas** se despliega en laboral; mercantil y societario; fiscal; concursal; inmobiliario y urbanístico; administrativo y contratación pública; penal económico; propiedad intelectual; compliance y protección de datos; familia y sucesiones; extranjería (las dos últimas son plaza gracias a D-079: el Interesado puede ser un particular). El despacho generalista sigue D-001: una plaza principal, capacidades secundarias sin exclusividad, `ADJACENT` a revisión de la Directiva. El despacho con varias especialidades reales, D-047: varias titularidades.

Con datos reales, la taxonomía se corrige sola: si los referidos de dos especialidades "distintas" acaban de forma sistemática en las mismas empresas, el Comité las fusiona; si una especialidad recibe referidos heterogéneos que su titular declina por sistema, se divide (como prevé D-001 para "Marketing" → "Paid Media", "Branding", "SEO/Contenido").

### 3.5 Las profesiones tecnológicas: desplegadas con finura y priorizadas (D-080)

Instrucción del fundador: las nuevas profesiones tecnológicas serán las más receptivas a lo agentic de NS. La CNAE las describe peor que a ninguna otra, así que NS-CAT las trata con cuatro reglas propias:

1. **Finura.** La sección J (61 telecomunicaciones, 62 programación y consultoría informática, 63 datos y hosting) y las partes tecnológicas de 70–74 se despliegan con al menos la misma finura que la 69.10. Despliegue inicial propuesto, cada especialidad sometida a las tres pruebas de §3.4:

   | Especialidad NS propuesta | Clase CNAE índice | En NS-CAT v0.1 |
   | --- | --- | --- |
   | Desarrollo de software a medida | 62.01 | no |
   | Implantación de ERP y sistemas de gestión | 62.02 | no |
   | Implantación de CRM y automatización comercial | 62.02 | no |
   | Ciberseguridad | 62.02 | sí (`CIBERSEGURIDAD`) |
   | Nube e infraestructura | 62.03 / 63.11 | no |
   | Datos, analítica e inteligencia de negocio | 62.02 / 63.11 | no |
   | Inteligencia artificial y agentes | 62.01 / 62.02 | no (`PROVISIONAL` si hace falta) |
   | Automatización de procesos e integraciones | 62.02 | no |
   | Comercio electrónico y plataformas digitales | 62.01 / 47.91 | no |
   | Producto digital y experiencia de usuario | 62.01 / 74.10 | no |
   | Telecomunicaciones y redes | 61.10 | sí (`TELECOMUNICACIONES`) |
   | Internet de las cosas e industria 4.0 | 62.09 / 26.51 | no |
   | Soporte y sistemas gestionados | 62.03 / 62.09 | no |
   | Marketing digital de resultados · SEO y contenido | 73.11 | previstas en D-001 |

   La lista es una propuesta de Claude pendiente de confirmación del fundador junto con la lista de plazas base (`docs/PENDIENTES_DEL_FUNDADOR.md`). NS-CAT v0.1 en código no cambia hasta entonces.

2. **Prueba de mercado nacional.** Las especialidades tecnológicas se prestan en remoto y §4 ya admite como titular a la empresa nacional o 100 % remota con equipo o clientes verificables en la zona. Su prueba de mercado se mide en España: una plaza tecnológica puede abrirse por demanda en una Sala aunque en la zona solo haya una empresa que la ofrezca.

3. **Prioridad en la Antesala y en la Fundación.** Tras los Manantiales, las especialidades con la marca `tech` son el segundo bloque de plazas base que la Antesala busca al fundar y al completar una Sala. Sus Timoneles adoptan antes al Agente, alimentan antes las Fuentes propias y «Dile a tu Agente» (D-075), y sus proyectos generan señales para muchas plazas: un ERP nuevo arrastra datos, ciberseguridad, formación, financiación y mobiliario.

4. **Vía rápida a `PROVISIONAL`.** Una profesión tecnológica que la administración aún no recoge entra por §3.3 en diez días como máximo. Para una candidata tecnológica, el Agente de admisión propone la especialidad desde su web, sus casos y su pila tecnológica, nunca desde su CNAE, que en tecnología no distingue nada.

---

## 4. La plaza dentro de la Sala

Reglas (integran D-001, D-004 y D-080):

0. **Sin tope.** Una Sala tiene tantas plazas posibles como Especialidades NS vigentes en su versión de NS-CAT. Hay dos clases: **plaza base**, la que NS-CAT marca para fundar cualquier Sala (Manantiales primero, profesiones tecnológicas segundo, después el resto), y **plaza por demanda**, cualquier otra Especialidad NS, que una Sala abre cuando sus Agentes detectan necesidades de esa especialidad que salen por Embajada (D-015) o se pierden. Tres Embajadas de una misma especialidad en un Ejercicio abren candidatura preferente; la Antesala ofrece la plaza desde la primera. El tamaño de cada Sala emerge de sus datos.
1. Una empresa, una plaza principal por Sala y, si tiene varias especialidades (varios CNAE), tantas titularidades como plazas vacantes ocupe (D-047). Cada titularidad tiene su exclusividad y su Compromiso. NS premia con Mérito de Red llevar cada especialidad a una Sala distinta.
2. Especialidad ocupada en la Sala solicitada → el solicitante admitido elige: otra Sala de la zona con la plaza libre, lista de espera de esa Sala, o lista de fundadores de la próxima Sala.
3. Solapamiento `ADJACENT` → revisión de la Directiva de Sala antes de admitir. `CONFLICT` → no en esa Sala.
4. La plaza se conserva cumpliendo la cuota de contribución (D-010) y las reglas inmutables. Se pierde por incumplimiento reiterado o expulsión.
5. Una plaza liberada se ofrece primero a la lista de espera de esa Sala, después a la de la zona.

### Casuística

| Caso | Regla |
| --- | --- |
| Empresa multiservicio (legal + fiscal + laboral) | Puede ocupar una plaza por especialidad en la misma Sala, cada una con su titularidad y su Compromiso semanal (D-047). NS le propone llevar la siguiente especialidad a otra Sala de la zona, o fundarla (D-041), y lo premia con Mérito de Red. |
| Generalista frente a especialista | El generalista ocupa una especialidad concreta, nunca la clase CNAE. Un especialista posterior tiene prioridad en las especialidades que el generalista no ocupa. |
| Franquicia o red de oficinas | La plaza la ocupa la unidad local, no la marca. Dos oficinas de la misma marca no pueden estar en la misma Sala; sí en dos Salas de la zona. |
| Empresa nacional o 100 % remota | Puede ocupar plaza en una Sala de la zona donde tenga equipo o clientes verificables. No puede ocupar la misma especialidad en dos Salas de la misma zona. |
| Dos solicitantes admitidos para la misma plaza | Rúbrica de admisión (D-004) y calidad del Business DNA deciden. El otro pasa a lista de espera con prioridad para la siguiente Sala o para la primera vacante. |
| Miembro que cambia de especialidad | Nueva solicitud; la plaza anterior se libera con preaviso de un periodo. |
| Traslado entre Salas de la zona | Permitido una vez por año con vacante en destino y sin cuota pendiente; la reputación viaja con la empresa. |
| Profesión no contemplada | §3.3: especialidad `PROVISIONAL`. Si es tecnológica, vía rápida de §3.5: diez días, especialidad propuesta desde la web y los casos, no desde la CNAE. |
| Candidata que pide una plaza "nueva" junto a una ocupada (trocear la especialidad) | Las tres pruebas de §3.4 deciden. Si el cliente contrataría al mismo proveedor para las dos cosas, o el Agente no puede separarlas desde un Indicio típico, no hay plaza nueva: es `CONFLICT` con la ocupada (D-001) y la candidata va a otra Sala, a la Antesala o a promover la siguiente (D-041). |
| Profesión tecnológica con una sola empresa en la zona | La prueba de mercado se mide en España (§3.5). Puede ocupar plaza por demanda si la Sala detecta necesidades de esa especialidad. |
| Concentrador de referidos (cualquier empresa o profesión que ve necesidades de muchos sectores; p. ej., administración de fincas, gestoría, correduría) | Es un **Manantial** (D-059): titular como cualquier otro, en la plaza de su especialidad, con las mismas Normas, cuota y Compromiso. NS lo prioriza en la Antesala y prepara a su Agente para desplegar varias Cesiones de un mismo Interesado. No existe un miembro "fuente de referidos" sin plaza. |
| Autónomo (persona física con NIF) | Puede ser titular: la persona como empresa. Una persona sin empresa no puede ser miembro (D-059). |

---

## 5. Enrutamiento: Sala → Zona → Red

La Sala tiene prioridad sobre los referidos que nacen en ella. Cuando ninguna plaza de la Sala cubre la necesidad, el referido no se pierde:

```text
Necesidad detectada por un agente de NS Cumbre
  → plaza de la especialidad en NS Cumbre        (titular recibe)
  → si vacante: otras Salas de la Zona Sevilla    (rotación por reputación y tiempo de respuesta; requiere consentimiento del originador, NS-ARP §13)
  → si ninguna: red NS (otras zonas, Global Routing)
```

El originador acumula reputación en todos los casos (D-009). La tasa de referidos exportados por Sala es, además, la señal principal de saturación de la zona (§2.3).

### 5.1 Embajada · Propuesta Fuera de la Sala (D-015)

Cuando un miembro dispone de un buen referido y **en su Sala no hay titular de esa especialidad** (plaza vacante o especialidad aún sin representar), NS le ofrece un acto extraordinario, la **Embajada**: proponer él mismo a un titular de otra Sala de la zona, que pasa a ser **Embajadora** de esa especialidad en la Sala del cedente mientras la plaza siga vacante. El agente le presenta candidatos ordenados por Hoja de Méritos y tiempo de respuesta, o el miembro elige uno que ya conoce. Si la Cesión resuelve (Veredicto válido del cesionario, y más aún si llega a valor contrastado), el cedente recibe una **prima de Mérito** muy superior a la de una Cesión ordinaria. Cada Embajada deja constancia de una plaza que la Sala debería cubrir desde la Antesala. Reglas completas en D-015.


---

## 6. Ciclo de vida de una Sala

```text
EN_FORMACIÓN   mínimo de fundación alcanzado en la Antesala (parámetro, por defecto 12; D-041); Directiva provisional; Agentes activados; código provisional; nombre propuesto pendiente de autorización NS
  → ACTIVA     nombre autorizado (NS <Nombre>); Compromiso, Comunicado y Balanza en vigor; plazas base cubriéndose desde la Antesala
  → CONSOLIDADA  plazas base cubiertas; Directiva elegida; rituales estables; las plazas por demanda se abren con los datos de la Sala
  → EN_PAUSA   la Directiva o NS detienen la Sala (Mesa, cola, Reloj, Ronda y Latido parados; nadie penalizado; D-076)
  → FUSIÓN     por debajo del mínimo de fundación durante 2 periodos: se fusiona con otra Sala de la zona (las plazas en conflicto se resuelven por antigüedad y reputación)
  → CIERRE     solo si la fusión no es posible; los miembros pasan a lista de espera prioritaria
```

**No existe la escisión por tamaño** (D-080): una Sala nunca se parte por grande. La Sala N+1 de una zona nace por Fundación (D-041): una empresa encuentra su plaza ocupada, promueve la siguiente Sala y reúne fundadoras en la Antesala. Sin tope de plazas, la Sala crece por donde sus Agentes detectan negocio sin cubrir, y la zona crece por donde las plazas ya están ocupadas.

Gobierno: Directiva de Sala (D-048, D-061), Consejo de Zona (apertura, fusión, Comité de Clasificación), NS España (versión de NS-CAT y de NS-ARP).

---

## 6bis. Encuentros entre Salas (a plantear con el fundador)

Las Salas de una zona, y con el tiempo de zonas distintas, se encuentran entre sí porque generan negocio, no porque compartan territorio. Propuesta inicial de formato, pendiente de decisión:

| Elemento | Propuesta |
| --- | --- |
| Quién convoca | La Directiva de Zona, a propuesta del Chapter Intelligence Agent, cuando detecta demanda cruzada: necesidades de una Sala que las plazas de otra cubrirían, referidos exportados frecuentes entre dos Salas, o especialidades complementarias sin relación previa. |
| Con quién | Dos o más Salas completas, o una selección de plazas de varias Salas ("encuentro por sector": todas las plazas de construcción y afines de la zona). |
| Agenda | Generada por los agentes: lista de necesidades abiertas sin plaza en la Sala de origen, pares de empresas con mayor potencial cruzado, y referidos exportados pendientes de introducción. Nada de presentaciones genéricas. |
| Formato | Presencial o mixto, corto, centrado en introducciones concretas preparadas de antemano por los agentes. |
| Resultado medible | Referidos entre Salas originados en el encuentro, con el mismo ciclo, cualificación y reputación que cualquier otro (D-009, D-010). |
| Ritmo | Trimestral por zona como hipótesis; el agente propone adelantar cuando la demanda cruzada lo justifica. |

Regla: el encuentro entre Salas nunca sustituye la prioridad de la propia Sala en el enrutamiento (§5); la complementa cuando la Sala no cubre la necesidad.

## 7. Producto

- **Web pública.** "Comprobar disponibilidad de mi sector" muestra, para la especialidad elegida, el estado en cada Sala de la zona: Disponible · Ocupada · Lista de espera · Próxima Sala en formación. Genera urgencia honesta y explica el modelo en una pantalla.
- **Mi Sala.** Mapa de plazas de la Sala, perfiles, cuota de contribución de cada miembro (verificada), muro de victorias.
- **Command Center de Zona.** Salas con estado, plazas por especialidad, lista de espera por especialidad, flujo de referidos por miembro, tasa de exportación, propuesta automática de apertura o fusión, cola del Comité de Clasificación.
- **Radar.** Las señales y referidos se representan dentro de la Sala; los exportados aparecen como conexiones entre Salas de la zona. Nunca sobre un mapa geográfico: las Salas no tienen territorio.

---

## 8. Modelo de datos (extensión de NS-ARP y del Referral Graph)

```text
Zone          { id, country, name, ine_municipalities[], status, saturation_indicators }
Chapter(Sala) { id, zone_id, sequence (interno), name ("NS <Nombre>", único en la red), name_status: PROPOSED|AUTHORIZED|REJECTED, status: FORMING|ACTIVE|PAUSED|MERGING|CLOSED,
                council[], nscat_version, protocol_version }            # sin SPLITTING: no hay escisión por tamaño (D-080); en código hoy FORMING|ACTIVE|PAUSED
Specialty     { id, nscat_code, cnae_class, name, description, status: OFFICIAL|NS_EXTENDED|PROVISIONAL|RETIRED,
                overlaps_with[], perfect_referral_examples[], not_for_examples[],
                base: bool, manantial: bool, tech: bool,                  # plaza base (D-080), Manantial (D-059), profesión tecnológica (D-080)
                market_proof_scope: ZONE|COUNTRY }                        # prueba de mercado; COUNTRY para tech (D-080)
CategorySeat  { id, chapter_id, specialty_id, company_id, status: ACTIVE|VACANT|WAITLISTED|RELEASED, granted_at }
Waitlist      { zone_id, chapter_id?, specialty_id, application_id, priority, founder_candidate: bool }
ReferralRoute { referral_id, origin_chapter_id, target_chapter_id, level: CHAPTER|ZONE|NETWORK, consent_ref }
```

---

## 9. Pendientes del fundador

1. Delimitar la Zona NS Sevilla (solo capital, o capital + área metropolitana).
2. Confirmar la lista de **plazas base** de NS-CAT (D-080), con las especialidades Manantial (D-059) y el bloque de profesiones tecnológicas de §3.5, y con ella la primera versión NS-CAT de NS Sevilla. Ya no hay un número objetivo de plazas: el mínimo de fundación es un parámetro (D-041) y el máximo, el número de Especialidades NS.
3. Fijar `nscat_version` sobre la CNAE-2025 antes de las admisiones reales: NS-CAT v0.1 en código usa clases de la CNAE-2009; verificar la correspondencia contra el INE.
4. Fijar los umbrales de apertura y saturación (propuesta: ≥ 3× el Compromiso semanal de D-042, es decir, 3 Cesiones válidas por titular y semana en el flujo esperado; dos periodos de caída de flujo).
5. Decidir si el enrutamiento a otras Salas de la zona requiere consentimiento del originador en cada caso o una preferencia general en su Business DNA.
6. Decidir el formato y ritmo de los encuentros entre Salas (§6bis).
