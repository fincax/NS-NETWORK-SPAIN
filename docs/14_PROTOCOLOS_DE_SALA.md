# 14 · Los dos protocolos obligatorios de Sala

**Estado:** D-018 (CONFIRMED en su obligación por el fundador; nombres y parámetros PROPOSED).

Pertenecer a una Sala NS implica dos deberes que los Agentes ejecutan y las personas validan:

```text
Protocolo I  · GENERAR NEGOCIO      Ceder referidos de calidad.          Unidad: la Cesión.      Especificación: NS-ARP (docs/02).
Protocolo II · DAR A CONOCER        Comunicar tu trabajo a la Sala.      Unidad: el Comunicado.  Especificación: NS-ADP (este documento).
```

Ambos tienen cadencia semanal, cumplimiento verificable y consecuencias (D-010). Ambos los realiza el Agente; el gerente decide en segundos.

---

## Protocolo I · Generar Negocio (resumen)

Cada semana el Agente de cada empresa propone el máximo de Cesiones válidas posibles a partir de Indicios propios (Despacho), Rastreo y Sondeo. El titular cualifica con Veredicto, NS hace Contraste, el cedente suma Mérito y cumple su Compromiso. Sin titular en la Sala: Embajada. Todo el detalle vive en `docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`, `docs/12_SALAS.md` y `docs/13_LEXICO_NS.md`.

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
