# 15 · La tarjeta de Cesión

**Estado:** D-024 (CONFIRMED). Diseño publicado en el lienzo "Cesión NS". Fuente de verdad del comportamiento: NS-ARP (`docs/02`), D-020 y D-021.

La tarjeta de Cesión es la mejor pieza de UX del producto: el objeto donde la IA descubre y las personas deciden. Tiene dos caras y una tercera vista a posteriori.

## Regla de oro

Toda tarjeta muestra siempre **WHY · EVIDENCE · CONFIDENCE · UNKNOWN · NEXT ACTION**. Nunca solo un porcentaje. La **Promesa** es la pieza central de las dos caras.

## Cara A · el cesionario acepta

| | |
| --- | --- |
| **Objetivo del usuario** | Decidir en 30 segundos si quiere esta Cesión y si la Promesa es realista. |
| **Trabajo por hacer** | Comprometerse con un Interesado que aún no conoce, con garantías. |
| **Acción primaria** | Aceptar y confirmar la Promesa (un toque). |
| **Secundarias** | Ajustar la Promesa (el Agente registra la diferencia); pedir más información al cedente (máximo dos rondas, NS-ARP §9.1, D-058: la pregunta va al cedente y vuelve con su respuesta destacada en la propia cara A); declinar con motivo (entrena al Agente, no afecta a la reputación del que declina, el cedente conserva su Mérito de Promesa). |
| **Jerarquía** | Qué es → quién la cede y con qué historial → cuánto promete y por qué → qué falta → decidir. |
| **Bloque Promesa** | Valor a priori, Encaje, y cinco componentes con semáforo: necesidad real, información, decisor, plazo, presupuesto. |
| **Qué no aparece** | La identidad del Interesado. Solo tras la Apertura del cedente (capa 2). |
| **Plazo de respuesta** | Responder al Interesado en **48 h** tras el Puente y emitir Veredicto al cerrar. |
| **Caducidad** | **7 días** sin respuesta (recordatorio a las 72 h). La Cesión vuelve al cedente, que puede proponerla a otra Sala. El silencio del cesionario cuenta en su Hoja de Méritos. |

## Cara A′ · el cedente responde a una pregunta (D-058)

| | |
| --- | --- |
| **Objetivo del usuario** | Contestar en un minuto lo que el cesionario necesita para decidir, sin exponer nada indebido. |
| **Trabajo por hacer** | Cumplir con el cesionario que se toma en serio el referido. |
| **Acción primaria** | Enviar la respuesta (el Agente la deja redactada a partir del Indicio; la persona la confirma o corrige). |
| **Secundarias** | No ceder. |
| **Jerarquía** | La pregunta, literal → el borrador del Agente → enviar. |
| **Qué ve el cesionario después** | La respuesta destacada arriba de su cara A y como evidencia en "Lo que averiguaron los Agentes", con las rondas que le quedan. En Hoy, el cedente ve "X te pregunta" con la pregunta literal. |
| **Plazo** | Cada ida y vuelta reinicia los 7 días de la revisión. Máximo dos rondas por Cesión. |

## Cara B · el cedente autoriza la Apertura

| | |
| --- | --- |
| **Objetivo del usuario** | Saber exactamente qué se revela, a quién y con qué garantía antes de abrir. |
| **Trabajo por hacer** | Cumplir con el Interesado que confió en él y con la Sala, sin exponer nada indebido. |
| **Acción primaria** | Autorizar la Apertura y tender el Puente. |
| **Secundarias** | Limitar el alcance (solo la empresa, sin contacto); editar el Puente redactado por el Agente; retirar la Cesión (posible hasta el envío del Puente). |
| **Jerarquía** | Quién ha aceptado → Promesa confirmada y Mérito ya ganado → a quién se cede (respuesta media, aceptación, Distinciones) → qué verá el cesionario (capa 2) → Puente → decidir. |
| **Capa 2 visible tal cual** | Empresa y contexto; persona de contacto con su base jurídica. Lo marcado COMPANY_ONLY o NEVER_SHARE aparece **bloqueado, no oculto**, para que el cedente vea que su Agente lo respeta. |
| **Puente** | Lo redacta el Agente; lo envía la persona, desde su correo o desde NS. Ningún Agente contacta con el Interesado. |

## Estados

Nueva · En revisión (esperando al otro) · Pregunta al cedente (D-058) · Requiere Directiva (excepción explicada en la propia tarjeta) · Aprobada, Puente listo · En curso (hitos: Puente, reunión, propuesta, cierre; el Agente pregunta cada 14 días) · Embajada (desde otra Sala) · Baja confianza (el Agente pide dos datos) · Declinada con motivo · Caducada.

## Veredicto y Distinción (a posteriori)

Al Cierre, el cesionario valora en tres ejes y tres toques (Facilidad, Negocio, Trato) con la evidencia ya rellenada por el Agente. Puede otorgar una Distinción (una por mes) nombrando el eje y una línea que va a la Crónica. Al confirmar: Mérito de Veredicto y de Cierre para el cedente; Mérito de cesionario para quien cierra el bucle; valor contrastado al Libro de Valor y a la Balanza; Contraste de NS.

## Móvil

La cara A en una pantalla: Promesa, tres razones, Salvoconducto y la decisión con el pulgar. La cara B prioriza escritorio, pero es operable en móvil con el mismo orden.

## Estados de interfaz obligatorios

loading · vacío ("Tu Agente no tiene Cesiones para ti hoy. Está en la Mesa.") · primer uso · error · datos parciales · sin conexión · sin permiso · baja confianza · datos antiguos · completado.
