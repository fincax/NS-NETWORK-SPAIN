# 14 · Los tres protocolos obligatorios de Sala

**Estado:** D-018 y D-019 (CONFIRMED en su obligación por el fundador; nombres y parámetros PROPOSED).

Pertenecer a una Sala NS implica tres deberes que los Agentes ejecutan y las personas validan:

```text
Protocolo I  · GENERAR NEGOCIO      Ceder referidos de calidad.          Unidad: la Cesión.      Especificación: NS-ARP (docs/02).
Protocolo II · DAR A CONOCER        Comunicar tu trabajo a la Sala.      Unidad: el Comunicado.  Especificación: NS-ADP (este documento).
Protocolo III · CUENTAS CLARAS      Hacer visible el valor dado y recibido. Unidad: la Balanza.  Especificación: NS-ATP (este documento).
```

Los tres tienen cadencia semanal, cumplimiento verificable y consecuencias (D-010). Los tres los realiza el Agente; el gerente decide en segundos.

---

## Protocolo I · Generar Negocio (resumen)

Cada semana el Agente de cada empresa propone el máximo de Cesiones válidas posibles a partir de Indicios propios (Despacho), Rastreo y Sondeo. El titular cualifica con Veredicto (Facilidad, Negocio, Trato) y puede otorgar una Distinción; NS hace Contraste; el cedente suma Mérito y cumple su Compromiso. Sin titular en la Sala: Embajada. Todo el detalle vive en `docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`, `docs/12_SALAS.md` y `docs/13_LEXICO_NS.md`.

---

## Protocolo II · Dar a Conocer · NS-ADP (NS Agentic Disclosure Protocol)

### 1. Principio

> Nadie puede ceder bien lo que no conoce bien.

La calidad de las Cesiones depende de cuánto sabe cada Agente (y cada gerente) sobre los demás miembros de la Sala. Por eso **cada semana, el Agente de cada empresa informa a los Agentes de las demás empresas de la Sala** de: su especialidad y plaza; funciones, servicios y productos que trabaja; y las actualizaciones, novedades y cualquier dato importante ocurrido esa semana. Y **todo gerente debe conocer, o poder consultar en segundos, el Dossier, el histórico y las novedades de cada miembro de su Sala**.

### 2. Objetos

| Término NS | Qué es | Identificador técnico |
| --- | --- | --- |
| **Comunicado** | Informe semanal estructurado que el Agente de una empresa envía a los Agentes de la Sala. Contiene lo estable (qué hace) y el delta (qué ha cambiado esta semana). | `Communique` |
| **Gaceta** | Digesto semanal de la Sala que compila el Chapter Intelligence Agent a partir de todos los Comunicados, con una vista general y una vista "relevante para ti" por gerente. | `ChapterGazette` |
| **Dossier** | Ficha viva de cada miembro: quién es, qué hace, a quién sirve, cómo es su Cesión perfecta, qué busca ahora (Encargos), su Hoja de Méritos y el histórico de Comunicados. Accesible desde Mi Sala, desde cualquier Cesión y por búsqueda. | `MemberDossier` |

### 3. Especificación agentic

| Campo | Especificación |
| --- | --- |
| **Trigger** | Cierre semanal de la Sala (día y hora configurables por Sala; propuesta: domingo 20:00, para que la Gaceta esté lista el lunes a primera hora). También bajo demanda cuando el ADN de Empresa cambia de forma relevante. |
| **Inputs** | ADN de Empresa (capas `PUBLIC` y `CHAPTER`); Encargos vigentes; cambios de la semana (servicios, productos, capacidad, equipo, certificaciones, sedes, casos ganados anonimizables); Cesiones cerradas contrastadas; lo que el gerente añada en el Despacho. |
| **Agente** | Company Agent redacta; Chapter Intelligence Agent compila la Gaceta; Trust & Compliance filtra visibilidad. |
| **Tools** | Lectura del ADN; diff de la semana; generador de Comunicado; índice de capabilities de la Sala; personalizador de relevancia. |
| **Permisos** | Solo capas `PUBLIC` y `CHAPTER`. Nada marcado `COMPANY_ONLY` o `NEVER_SHARE` entra jamás en un Comunicado. Datos personales de terceros: nunca. Casos de cliente: anonimizados salvo autorización expresa. |
| **Objetivo de razonamiento** | Que cada Agente de la Sala actualice su modelo de la empresa: qué ofrece, qué no, a quién, con qué capacidad ahora, y qué señales debe buscar para ella. Que el gerente lea en 90 segundos lo que le importa. |
| **Salida estructurada** | Ver §4. |
| **Confianza** | Cada afirmación del delta lleva origen: `DECLARED_BY_MEMBER` (lo dijo el gerente), `INFERRED_FROM_DNA` (cambio en el ADN), `VERIFIED` (Cesión contrastada, certificación comprobada). Nada inferido se publica como hecho sin visto bueno. |
| **Puerta humana** | El gerente revisa y aprueba el Comunicado en su Despacho (un toque). Si en 48 h no lo aprueba, el Agente envía un **Comunicado de continuidad**: solo la parte estable ya validada, sin nuevas afirmaciones, y lo marca como no revisado. |
| **Efecto** | Los Agentes receptores actualizan su índice de capabilities y sus criterios de Rastreo; el Dossier se actualiza; la Gaceta se publica; cada gerente recibe su vista "relevante para ti". |
| **Evento de auditoría** | `COMMUNIQUE_SENT`, `COMMUNIQUE_CONTINUITY`, `COMMUNIQUE_ACKED` (por cada Agente receptor), `GAZETTE_PUBLISHED`, `DOSSIER_VIEWED`. |
| **Fallo** | Si el Agente no puede generar el Comunicado (ADN incompleto, error), avisa al gerente y a la Directiva; la ausencia cuenta como incumplimiento solo si el gerente no responde al aviso en el plazo. |

### 4. Estructura del Comunicado

```jsonc
{
  "communique_id": "…",
  "company_id": "…",
  "chapter_id": "…",
  "week": "2026-W37",
  "visibility": "CHAPTER",
  "stable": {                          // lo que la empresa es: se repite cada semana, se edita poco
    "specialty": "69.10-NS-03 · Derecho laboral",
    "offering": ["…"],
    "not_offering": ["…"],
    "ideal_customer": "…",
    "perfect_referral": "…",
    "capacity_now": "ALTA | MEDIA | BAJA"
  },
  "delta": [                           // lo que ha cambiado esta semana
    { "kind": "NEW_SERVICE", "text": "…", "source": "DECLARED_BY_MEMBER" },
    { "kind": "CASE_WON", "text": "Cierre contrastado con un miembro de la Sala: 38.000 €", "source": "VERIFIED" },
    { "kind": "CAPACITY", "text": "Capacidad ALTA en octubre", "source": "DECLARED_BY_MEMBER" },
    { "kind": "TEAM", "text": "…", "source": "DECLARED_BY_MEMBER" },
    { "kind": "CERTIFICATION", "text": "…", "source": "VERIFIED" }
  ],
  "encargos": [ { "id": "…", "summary": "Buscamos pymes industriales con inspección de trabajo en curso" } ],
  "asks": [ "¿Alguien conoce al director de RR.HH. de …?" ],   // se convierten en Sondeos
  "unchanged": false,
  "approved_by": "user_id | CONTINUITY",
  "protocol_version": "ADP-0.1"
}
```

Regla de estilo: el Comunicado no es un anuncio. Es información de trabajo para agentes y gerentes: concreto, corto, sin adjetivos. El Agente lo redacta así por defecto.

### 5. La Gaceta

Compilada cada semana por el Chapter Intelligence Agent:

```text
GACETA · NS Cumbre · Semana 37

Relevante para ti (Carlos, Híspalis)
· Guadalquivir Legal ahora lleva inspecciones de trabajo: encaja con tus clientes industriales.
· Sur Climatización tiene capacidad ALTA en octubre.
· Encargo abierto de Torre Seguros: pymes con flota > 10 vehículos. Tienes dos.

En la Sala esta semana
· 3 nuevos servicios · 2 cierres contrastados (61.000 €) · 4 Encargos abiertos · 1 plaza vacante reclamada por Embajada
· Comunicados: 27 de 29 (2 de continuidad)

Sin novedades
· 11 miembros sin cambios (Comunicado estable).
```

La Gaceta se lee en la app, se envía por correo y, en el Pleno, sustituye la ronda de presentaciones repetitivas: solo se comentan novedades.

### 6. El Dossier

Un Dossier por miembro, siempre actualizado, accesible en dos toques:

```text
DOSSIER · Guadalquivir Legal
Plaza: Derecho laboral · NS Cumbre · desde marzo 2026
Qué hace / qué no hace
A quién sirve (ICP) · Cesión perfecta · Cesión que no le corresponde
Capacidad ahora
Encargos vigentes
Cómo presentarla (texto de Puente sugerido por su Agente)
Hoja de Méritos
Histórico de Comunicados (semana a semana)
Contacto del gerente · Preferencias de introducción
```

Accesos: desde Mi Sala (lista de miembros), desde cualquier Cesión o Pista ("ver Dossier del titular"), desde la búsqueda ("¿quién de mi Sala hace X?") y desde la Gaceta. Cada acceso queda registrado (`DOSSIER_VIEWED`) para medir conocimiento mutuo, nunca para vigilar.

### 7. Cumplimiento

- Un Comunicado aprobado por semana es obligatorio. Un Comunicado de continuidad cumple, pero dos de continuidad seguidos generan aviso del Agente y tres, aviso de la Directiva.
- `TrustEvent`: `COMMUNIQUE_MET` / `COMMUNIQUE_MISSED`. El incumplimiento reiterado sigue la misma escalera que el Compromiso (D-010).
- Cada Agente receptor debe acusar recibo (`COMMUNIQUE_ACKED`) y actualizar su índice. Es automático; su ausencia es un fallo técnico, no del miembro.
- Métrica de salud de la Sala: **conocimiento mutuo** = proporción de gerentes que han consultado la Gaceta o algún Dossier en la semana. Métrica de eficacia: mejora de la precisión de las Pistas tras los Comunicados.

### 8. Interfaz

- **Despacho**: "Tu Comunicado de esta semana" (borrador listo, un toque para aprobar, edición inline).
- **Hoy**: "Relevante para ti" de la Gaceta.
- **Mi Sala**: Gaceta de la semana, lista de miembros con acceso al Dossier, buscador.
- **Pleno**: la Gaceta en pantalla; solo novedades.
- **Parte** (Directiva): cumplimiento de Comunicados, conocimiento mutuo, miembros con ADN incompleto.

### 9. Pendientes del fundador

1. Día y hora del cierre semanal.
2. Si el Comunicado de continuidad cumple indefinidamente o tiene tope (propuesta: dos seguidos).
3. Si la Gaceta se comparte también entre Salas de la zona (propuesta: solo en Confluencias).

---

## Protocolo III · Cuentas Claras · NS-ATP (NS Agentic Transparency Protocol)

### 1. Principio

> Lo que se da y lo que se recibe se ve. Lo que hay que hacer para mejorar, solo lo ve quien tiene que hacerlo.

En una Sala es visible, para todos sus miembros, el **valor de negocio generado y recibido por cada titular**: el del mes y el acumulado. La transparencia sostiene la reciprocidad sin necesidad de discursos. Pero la transparencia tiene dos caras y el protocolo las separa con precisión:

- **Balanza** (pública dentro de la Sala): qué ha dado y qué ha recibido cada titular, y en qué punto del objetivo semanal se encuentra.
- **Brújula** (privada, solo el titular y su Agente): si está consiguiendo sus objetivos, por qué, qué le motiva a seguir, qué puede ofrecer a otros, qué puede proponer y qué referidos posibles tiene a mano para ceder.

### 2. Objetos

| Término NS | Qué es | Visibilidad | Identificador técnico |
| --- | --- | --- | --- |
| **Balanza** | Panel de valor dado y recibido de cada titular de la Sala: Cesiones hechas y recibidas (número), valor contrastado generado para otros y recibido, del mes y acumulado, más el estado frente al Ritmo. Nunca un ranking. | `CHAPTER` | `MemberBalance` |
| **Balanza de Sala** | Agregado de la Sala: Cesiones del mes, valor contrastado del mes y acumulado, Distinciones, mejor semana. | `CHAPTER` | `ChapterBalance` |
| **Ritmo** | Objetivo semanal de Cesiones válidas fijado por la Sala; si la Sala no lo fija, el de NS por defecto. Es el paso semanal que lleva al Compromiso del Ejercicio. | `CHAPTER` | `WeeklyPace` |
| **Brújula** | Cuadro privado en el que el Agente muestra al titular si consigue sus objetivos (Ritmo, Compromiso, Comunicado), por qué, qué le motiva, qué ofrecer, qué proponer y qué referidos posibles tiene para ceder. | `COMPANY_ONLY` | `MemberCompass` |
| **Movimiento** | Cada acción concreta que la Brújula propone para la semana: una Cesión candidata, un Sondeo, un Encargo de la Sala que el titular puede atender, una Embajada. Tres por semana. | `COMPANY_ONLY` | `CompassMove` |

### 3. La Balanza (pública en la Sala)

Se consulta desde Mi Sala y desde cualquier Dossier. Una fila por titular, ordenada por plaza (nunca por valor), con la Balanza de Sala en cabecera.

```text
BALANZA · NS Cumbre · Septiembre 2026
Sala: 41 Cesiones válidas este mes · 312.000 € contrastados · acumulado 2,1 M€ · Ritmo de Sala: 1 Cesión válida / semana

Plaza                       Dadas      Recibidas   Contrastado dado   Contrastado recibido   Ritmo
                            mes · acum mes · acum  mes · acum         mes · acum
Obra industrial · Híspalis   3 · 27     2 · 19     38.000 · 410.000   61.000 · 520.000       En Ritmo (2 de 2)
Seguros · Guadalquivir       5 · 44     1 · 12     92.000 · 780.000   9.000 · 96.000         Por encima (4 de 2)
Mobiliario · vacante         —          —          —                  —                      Plaza vacante
```

Reglas:

1. **Solo cuenta lo válido y lo contrastado.** "Dadas" y "Recibidas" son Cesiones con Veredicto válido. Las Cesiones en curso se muestran aparte, en gris, como "en curso". El valor es siempre valor contrastado (confirmado por ambas partes). El valor potencial y el pipeline nunca aparecen en la Balanza.
2. **Nunca es un ranking.** El orden es por plaza. No hay medallas, posiciones ni "top". Las Distinciones las otorga quien recibe, por Facilidad, Negocio o Trato (D-020), y se muestran junto al titular como hechos, no como puntos.
3. **El Ritmo se ve.** Cada titular muestra su estado semanal frente al Ritmo: **En Ritmo**, **Por encima**, **Por debajo**, con la cifra (hechas de objetivo). Es el único indicador de "cómo va" que la Sala ve de cada miembro, y es el que el Consejo de Zona usa en el Parte.
4. **Reciprocidad explicada, no juzgada.** Junto a cada titular, un indicador de balance con explicación del Agente de Sala: "Da más de lo que recibe: su especialidad genera muchas señales para otros" o "Recibe más de lo que da: especialidad de destino frecuente". Nunca un número de reciprocidad a secas.
5. **El valor de una Cesión concreta nunca se muestra en la Balanza.** Solo agregados por titular. Las dos partes de una Cesión conocen su valor; el resto de la Sala ve sumas.
6. **Doce semanas de historia** en una línea por titular (sparkline) para que el patrón se entienda sin leer números.

### 4. La Brújula (privada)

El Agente del titular la recalcula cada noche y la presenta en el Despacho y en Hoy. Es el lugar donde el Agente "estudia constantemente cómo mejorar sus estadísticas". Cuatro bloques:

```text
BRÚJULA · Híspalis · Semana 37

1 · Dónde estás
    Ritmo         En Ritmo · 2 de 2 esta semana · racha de 5 semanas
    Compromiso    2 de 3 en el Ejercicio · quedan 19 días · a tiempo
    Comunicado    Aprobado el domingo · 3 semanas seguidas
    Recibes       61.000 € contrastados este mes · 2 Cesiones aceptadas de 2 (100 %)
    Das           38.000 € · tus Cesiones se aceptan al 87 % (media de la Sala 74 %)

2 · Por qué
    + Tus Cesiones a Guadalquivir y Triana cierran en menos de 30 días.
    – Tus dos últimas Cesiones a SecureNet fueron declinadas: "sin decisor identificado". Tu Agente pedirá ese dato antes de proponer.
    · Las señales que mejor conviertes: "nueva sede" y "cambio de dirección financiera".

3 · Qué ganas
    Mérito        1.420 · a 180 del nivel Referente (acceso a Cesiones de otras Salas)
    Distinción    Tu Cesión a Triana es candidata a Cesión del mes
    Embajada      La plaza de Mobiliario sigue vacante: cada Embajada que resuelva vale prima ×2

4 · Tres Movimientos para esta semana
    1  Ceder: tu cliente Logística Bética renueva flota (12 vehículos) → Torre Seguros tiene un Encargo abierto exacto. Borrador listo.
    2  Ofrecer: PRL Andaluza busca naves con licencia en trámite → tienes 3 obras en curso que encajan. Sondeo preparado.
    3  Proponer: Rastreo público: licencia de obra mayor en Alcalá para "Cerámicas del Sur" → posible Cesión para ti vía Bufete Alameda, que conoce a la propiedad. ¿Pedimos Sondeo?
```

Reglas:

1. La Brújula nunca sale de la empresa: visibilidad `COMPANY_ONLY`. Ni la Directiva ni la Sala la ven; el Parte solo recibe agregados y el estado de Ritmo.
2. Cada Movimiento es accionable en un toque desde el Despacho (ceder, sondear, aprobar borrador, descartar con motivo). Lo descartado con motivo entrena al Agente.
3. El bloque "Por qué" usa evidencia real: Veredictos recibidos, tiempos de respuesta, tipos de Indicio que convierten. Nunca consejos genéricos.
4. El bloque "Qué ganas" enlaza cada objetivo con una consecuencia concreta (nivel, Distinción, prima de Embajada, plaza que se abre). La motivación es tangible o no se muestra.
5. Si el titular va Por debajo del Ritmo dos semanas, la Brújula sube de tono: el Agente propone cinco Movimientos en lugar de tres y ofrece agendar un Despacho de 10 minutos. Si van tres, avisa de que la Directiva lo verá en el Parte.

### 5. El Ritmo

- Lo fija la Sala (Directiva, ratificado en Pleno) al inicio de cada Ejercicio; si no lo fija, rige el Ritmo de NS por defecto (propuesta inicial: 1 Cesión válida por semana y titular).
- El Ritmo es el paso semanal; el Compromiso (D-010) es el mínimo del Ejercicio. Un titular puede cumplir el Compromiso sin ir siempre En Ritmo, y la Balanza lo muestra con honestidad.
- Un Ritmo de Sala no puede ser inferior al que garantiza el Compromiso del Ejercicio.
- El Chapter Intelligence Agent propone ajustar el Ritmo cuando más del 60 % de los titulares está Por encima (subirlo) o más del 40 % está Por debajo dos semanas seguidas (revisarlo o revisar la captación de Indicios).

### 6. Especificación agentic (NS-ATP v0.1)

| Campo | Especificación |
| --- | --- |
| **Trigger** | Cierre diario (Brújula) y cierre semanal (Balanza y Ritmo). Recalculo inmediato al confirmarse un Veredicto o un valor contrastado. |
| **Inputs** | Cesiones y Veredictos; valor contrastado; Compromiso y Ritmo vigentes; Comunicados; Encargos de la Sala; Rastreo y Sondeos del Agente; Hoja de Méritos; historial de 12 semanas. |
| **Agente** | Company Agent (Brújula y Movimientos); Chapter Intelligence Agent (Balanza de Sala, explicación de reciprocidad, propuesta de Ritmo); Trust & Compliance (Contraste de lo que entra en la Balanza). |
| **Permisos** | Balanza: `CHAPTER`, solo agregados por titular y solo valor contrastado. Brújula: `COMPANY_ONLY`. Los Movimientos que impliquen a un tercero respetan NS-ARP: nada sale de la empresa hasta el visto bueno. |
| **Objetivo de razonamiento** | Balanza: mostrar con exactitud y sin juicio. Brújula: encontrar las tres acciones con mayor probabilidad de producir una Cesión válida esta semana, explicar por qué, y conectar cada objetivo con una consecuencia real. |
| **Salida estructurada** | `MemberBalance{ given{month,total}, received{month,total}, value_given{month,total}, value_received{month,total}, in_progress, pace_status, pace_done, pace_target, reciprocity_note, history_12w[] }` · `MemberCompass{ status{pace,quota,communique}, why[], gains[], moves[3..5] }`. |
| **Confianza** | Todo dato de la Balanza es contrastado o no aparece. En la Brújula, cada Movimiento lleva confianza y origen (Encargo de la Sala, Rastreo, Sondeo, cliente propio). |
| **Puerta humana** | Ninguna para ver la Balanza. Cada Movimiento requiere un toque del titular para ejecutarse. |
| **Efecto** | Balanza publicada en Mi Sala y Dossier; Brújula en Despacho y Hoy; Ritmo en el Parte del Consejo de Zona. |
| **Auditoría** | `BALANCE_PUBLISHED`, `PACE_STATUS_CHANGED`, `COMPASS_GENERATED`, `MOVE_ACCEPTED`, `MOVE_DISMISSED{reason}`. |
| **Fallo** | Si falta un Veredicto o un valor no está contrastado, la Balanza muestra "en curso", nunca un dato provisional. Si el Agente no puede generar Movimientos con confianza suficiente, la Brújula lo dice y pide dos datos al titular en el Despacho. |

### 7. Cumplimiento y salud

- No hay obligación nueva sobre el miembro: Cuentas Claras hace visibles las obligaciones de los Protocolos I y II. La obligación recae en NS: la Balanza es siempre pública en la Sala, exacta y contrastada.
- Métricas: proporción de titulares En Ritmo; tasa de aceptación de Movimientos; conversión de Movimientos en Cesiones válidas; tiempo entre Movimiento y Cesión.
- El Parte del Consejo de Zona recibe: distribución de Ritmo, titulares Por debajo dos semanas, propuesta de ajuste de Ritmo y plazas cuya Balanza recibida es alta con Balanza dada baja (candidatas a conversación de reciprocidad).

### 8. Interfaz

- **Mi Sala → Balanza**: tabla por plaza, Balanza de Sala en cabecera, sparkline de 12 semanas, filtro mes / acumulado.
- **Dossier**: Balanza del titular y estado de Ritmo.
- **Hoy**: estado de Ritmo y el primer Movimiento de la Brújula.
- **Despacho**: Brújula completa; cada Movimiento con un toque.
- **Parte**: distribución de Ritmo y alertas.
- **Móvil**: Ritmo y Movimientos primero; la Balanza completa, en escritorio.

### 9. Pendientes del fundador

1. Ritmo de NS por defecto (propuesta: 1 Cesión válida por semana y titular).
2. Si la Balanza muestra el valor contrastado en euros por titular o solo el número de Cesiones (la propuesta muestra ambos, solo agregados).
3. Nombres: Cuentas Claras (protocolo), Balanza (público), Brújula (privado), Ritmo (objetivo semanal), Movimiento (acción propuesta). Alternativas en `docs/13_LEXICO_NS.md`.
