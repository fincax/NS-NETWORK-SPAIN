# 15 · La tarjeta de Cesión

**Estado:** D-024 (CONFIRMED). Diseño publicado en el lienzo "Cesión NS". Fuente de verdad del comportamiento: NS-ARP (`docs/02`), D-020 y D-021.

La tarjeta de Cesión es la mejor pieza de UX del producto: el objeto donde la IA descubre y las personas deciden. Tiene dos caras, una tercera vista a posteriori y una cara pública para el Interesado (D-042).

## Regla de oro

Toda tarjeta muestra siempre **WHY · EVIDENCE · CONFIDENCE · UNKNOWN · NEXT ACTION**. Nunca solo un porcentaje. La **Promesa** es la pieza central de las dos caras.

## Cara A · el cesionario acepta

| | |
| --- | --- |
| **Objetivo del usuario** | Decidir en 30 segundos si quiere esta Cesión y si la Promesa es realista. |
| **Trabajo por hacer** | Comprometerse con un Interesado que aún no conoce, con garantías. |
| **Acción primaria** | Aceptar y confirmar la Promesa (un toque). |
| **Secundarias** | Ajustar la Promesa (el Agente registra la diferencia); pedir más información (máximo dos rondas, NS-ARP §9.1); declinar con motivo (entrena al Agente, no afecta a la reputación del que declina, el cedente conserva su Mérito de Promesa). |
| **Jerarquía** | Qué es → quién la cede y con qué historial → cuánto promete y por qué → qué falta → decidir. |
| **Bloque Promesa** | Valor a priori, Encaje, y cinco componentes con semáforo: necesidad real, información, decisor, plazo, presupuesto. |
| **Qué no aparece** | La identidad del Interesado. Solo tras la Apertura del cedente (capa 2). |
| **Compromiso al aceptar** | Responder al Interesado en **48 h** tras el Puente y emitir Veredicto al cerrar. |
| **Caducidad** | **7 días** sin respuesta (recordatorio a las 72 h). La Cesión vuelve al cedente, que puede proponerla a otra Sala. El silencio del cesionario cuenta en su Hoja de Méritos. |

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

Nueva · En revisión (esperando al otro) · Requiere Directiva (excepción explicada en la propia tarjeta) · Aprobada, Puente listo · En curso (hitos: Puente, reunión, propuesta, cierre; el Agente pregunta cada 14 días) · Embajada (desde otra Sala) · Baja confianza (el Agente pide dos datos) · Declinada con motivo · Caducada.

## Veredicto y Distinción (a posteriori)

Al Cierre, el cesionario valora en tres ejes y tres toques (Facilidad, Negocio, Trato) con la evidencia ya rellenada por el Agente. El Veredicto es interno a NS: el Interesado nunca lo ve. Puede otorgar una Distinción (una por mes) nombrando el eje y una línea que va a la Crónica. Al confirmar: Mérito de Veredicto y de Cierre para el cedente; Mérito de cesionario para quien cierra el bucle; valor contrastado al Libro de Valor y a la Balanza; Contraste de NS.

## Cara C · el Interesado deja su Eco (D-042)

| | |
| --- | --- |
| **Objetivo del usuario** | Decir en un minuto cómo le atendió el cesionario, sin registrarse en nada. |
| **Trabajo por hacer** | Devolver confianza a quien le presentó y a la red que lo hizo posible. |
| **Acción primaria** | Enviar el Eco: tres ejes (Atención, Resultado, Recomendación) en tres toques. |
| **Secundarias** | Añadir una línea; autorizar la publicación con su nombre; revisar el Eco desde el mismo enlace hasta 30 días después del cierre; retirar la publicación. |
| **Jerarquía** | Quién le presentó y por qué (capa 0) → tres preguntas → una línea → consentimiento → enviar. |
| **Qué no aparece** | El Veredicto del cesionario, la Promesa, las capas 1–3, nada de NS por dentro. Solo los nombres de las dos empresas y el resumen de la necesidad. |
| **Dónde vive** | `/eco/[token]`, fuera de la puerta de la demo: el Interesado nunca es usuario de NS. El token, único por Cesión, es la llave. |
| **Cómo llega** | Con la Petición de Eco que redacta el Agente del cesionario y envía la persona, durante la Cesión y al cierre. |

**Para el cesionario, en la tarjeta:** tras el Puente aparece "Da la palabra al Interesado" con la Petición redactada y el enlace; al cerrar la Cesión pasa a ámbar (obligatorio). Cuando el Eco llega, la tarjeta lo muestra a las dos partes con su consentimiento de publicación, y debajo el **Aval de la Cesión** con sus tres partes (Promesa, Veredicto, Eco) y su estado (provisional, firme, sin Eco, nulo).

## Móvil

La cara A en una pantalla: Promesa, tres razones, Salvoconducto y la decisión con el pulgar. La cara B prioriza escritorio, pero es operable en móvil con el mismo orden. La cara C es móvil por naturaleza: el Interesado abre el enlace desde el correo en el teléfono y responde con el pulgar.

## Estados de interfaz obligatorios

loading · vacío ("Tu Agente no tiene Cesiones para ti hoy. Está en la Mesa.") · primer uso · error · datos parciales · sin conexión · sin permiso · baja confianza · datos antiguos · completado.
