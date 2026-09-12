# 11 · Ideas disruptivas sobre el núcleo de NS Network

**Estado:** banco de ideas fundacional (no compromisos). Cada idea que se adopte se convierte en decisión en `DECISIONS.md` y en especificación en NS-ARP.
**Base:** D-009 (espíritu del core: agentes que hacen el trabajo + reparto ilimitado de referidos + calidad cualificada por el receptor y auditada por NS + reconocimiento escalable).

---

## 0. El core en una frase

> NS es el primer club empresarial donde **los agentes trabajan, las personas deciden, y la reputación se gana con negocio verificado**.

Tres pilares:

1. **Agentic**: el agente no asiste, ejecuta: prospecta, cualifica, prepara, persigue, cierra el bucle.
2. **Con suelo, sin techo**: toda empresa debe aportar un mínimo de referidos válidos por periodo (D-010, regla inmutable). Por encima de ese mínimo no hay límite. Cuantos más y mejores, más reconocimiento. Nunca se cobra por un referido: hacerlo es motivo de expulsión.
3. **Calidad verificada**: quien recibe cualifica; NS audita; quien da acumula reputación verificable y portable.

---

## A · El motor: prospección agentic delegada

### A1 · Prospección proactiva del agente ("tu agente sale a buscar")

El agente de cada empresa no espera señales: **rastrea fuentes públicas** (BORME, licitaciones, licencias de obra, ofertas de empleo, noticias locales, webs corporativas, aperturas de sedes) y las convierte en `OpportunitySignal` para **otros miembros** de la Sala. Después pregunta a su propio miembro: "¿Conoces a alguien en Empresa Z? Su agente ha detectado que abre sede en Dos Hermanas". La persona pone el calor; el agente pone el descubrimiento.

- Cambia BNI: la "referencia" ya no depende de que a alguien se le ocurra en la reunión semanal.
- Estructura: `SignalSource = PUBLIC_WEB | MEMBER_INPUT | INTEGRATION`. Las señales de web pública nacen con visibilidad `CHAPTER` y sin datos personales.

### A2 · Grafo colectivo de relaciones ("¿Quién de la Sala conoce a…?")

Con consentimiento y base jurídica B2B, cada miembro deja que su agente indexe **sus relaciones profesionales** (contactos, clientes, proveedores) en un grafo privado. Ningún otro miembro ve los contactos. Pero cualquier agente puede preguntar: "¿Alguien tiene relación directa con la dirección financiera de Empresa Z?" y recibir un `PathFound{ strength, member_id }` sin revelar identidad hasta que el dueño de la relación aprueba.

- Es el activo que ninguna red abierta puede construir: **capital relacional colectivo bajo permiso**.
- Alimenta `relationship_strength` y `referral_path_quality` del NS Match Score con datos reales.

### A3 · Tablón de demanda permanente ("Necesito")

Cada empresa mantiene una lista viva y estructurada de lo que busca ahora (ICP + trigger + ticket + plazo). Los agentes prospectan **contra esa lista**, no contra descripciones genéricas. En el Radar aparece como "demanda no cubierta de la Sala".

### A4 · Jefe de gabinete comercial

Cada semana el agente entrega a su miembro tres cosas, ya preparadas: "3 personas a las que deberías presentar a alguien de la Sala", "2 referidos que te han llegado y esperan tu decisión", "1 seguimiento que se está enfriando". Cada ítem se resuelve en móvil en 30 segundos. El agente redacta la introducción, persigue la respuesta y cierra el bucle.

### A5 · Captura de señal sin fricción

Nota de voz de 20 segundos, foto de una tarjeta, un vCard reenviado, un "He sabido que…" por WhatsApp. El agente estructura, anonimiza y pregunta lo que falta. Objetivo: que dar un referido cueste menos que no darlo.

---

## B · El sistema de calidad y reconocimiento

### B1 · Recibo de referido (Referral Receipt)

Cada referido es un objeto firmado y auditable con ciclo de vida completo (NS-ARP §9) y una **cualificación final del receptor** en una rúbrica estándar de 5 ejes:

```text
Facilidad   ¿Fue fácil prestar el servicio?   (información, momento, decisor, encaje)
Negocio     ¿Cuánto negocio generó?           (oportunidad, cierre, valor contrastado)
Trato       ¿Cómo fue el trato de las personas?
```

(Versión confirmada por el fundador, D-020. Los cinco ejes iniciales pasan a ser evidencia que el Agente aporta bajo estos tres.)

La Cesión vale en dos momentos (D-021): la **Promesa** a priori, calculada por los Agentes al aceptarse y confirmada por el cesionario, ya da Mérito al cedente; el Veredicto a posteriori la completa. Un buen referido cuenta aunque quien lo recibe no lo convierta.

El receptor puntúa en 3 toques en cada hito. El agente rellena la evidencia (fechas, mensajes enviados, reuniones confirmadas). NS audita el conjunto.

### B2 · Responsabilidad bilateral

No solo se puntúa al que da. También al que recibe: tiempo de respuesta, seguimiento, honestidad al reportar resultado. Un receptor que no atiende referidos o que infrarreporta para no "deber" pierde reputación como receptor. Esto protege el reparto ilimitado: dar mucho solo funciona si recibir obliga.

### B3 · Calibración del evaluador (anti-manipulación)

Cada miembro tiene un índice de **coherencia como evaluador**: comparación entre lo que declara y la evidencia recogida por los agentes (¿hubo reunión?, ¿se envió propuesta?). Un evaluador incoherente pierde peso en las puntuaciones que emite. La auditoría de NS se concentra donde la desviación es mayor. Detección de anillos de colusión y autorreferidos.

### B4 · Índice de Contribución Verificada (ICV)

Reputación escalable, transparente y **no reducida a un número opaco**: panel de comportamientos verificables (referidos dados, calidad media, valor verificado generado para otros, tiempo de respuesta, fiabilidad como receptor). Sobre él, **niveles** con privilegios reales:

```text
Miembro       acceso a la Sala
Contribuidor  prioridad en matching cuando hay empate de plaza secundaria
Referente     acceso a referidos de otras Salas de la ciudad
Consejero     acceso a la red nacional; asiento en el consejo de la Sala
Fundador      condiciones de membresía y voz en la taxonomía
```

El nivel se gana con calidad verificada. No hay tope superior de contribución.

### B5 · Reputación portable ("pasaporte empresarial NS")

El ICV viaja con la empresa entre Salas, ciudades y países. Una empresa que se muda de Sevilla a Madrid entra con su historial. A largo plazo: credencial verificable exportable ("NS Verified Referrer · 47 referidos · 82 % calidad · 310 k€ verificados").

### B6 · Árbol de referidos (atribución en cadena)

Si A refiere a B y el proyecto de B genera una necesidad que C cubre, A recibe reconocimiento residual en la cadena. La contribución **se compone**: quien abre puertas grandes acumula valor durante años. Es la genealogía del negocio de la Sala.

### B7 · Reconocimiento como ritual, no como ranking tóxico

Nada de leaderboards de cantidad. En su lugar: "Referido de la semana" (elegido por calidad verificada), "Cierre del mes" con agradecimiento público del receptor, memoria anual de la Sala con valor verificado por empresa. La competición es por calidad y generosidad, y el que recibe es quien reconoce.

---

## C · Efecto red y componente social

### C1 · Muro de victorias

Feed de la Sala con eventos verificados: "Gracias a la introducción de X, Y ha cerrado un proyecto de 40 k€". Solo lo verificado se publica. Reacciones simples (agradecer, felicitar). Es la parte "red social", con la regla de que nada se publica sin que ambas partes lo confirmen.

### C2 · Experiencia del tercero referido

La persona que recibe la introducción ve una página premium: "Carlos, de Empresa X, te recomienda a Empresa Y", con contexto preparado por el agente, agenda en un clic y opción de valorar la experiencia. Ese tercero puede convertirse en solicitante de plaza. **El referido es el canal de captación de miembros.**

### C3 · Enrutamiento sin fronteras desde el diseño

Si nadie en mi Sala cubre la necesidad, el referido viaja a otra Sala o ciudad y el originador sigue acumulando reputación. El reparto ilimitado incluye el reparto geográfico. El Global Routing Agent deja de ser "futuro" y pasa a ser un modo del protocolo activado por fases.

### C4 · Consejo semanal de agentes

Los agentes celebran una sesión semanal automática y producen un acta ejecutiva para la Sala: demanda no cubierta, plazas vacías más valiosas, quién ha contribuido, qué señales se han quedado sin dueño. La Directiva gobierna con inteligencia, no con asistencia a reuniones.

### C5 · Índice NS de ciudad

Publicar trimestralmente el valor verificado generado por Sala y ciudad, como indicador económico local. Es relaciones públicas, es prueba de la tesis y es moat: nadie más puede publicar ese dato.

### C6 · Dar primero en el onboarding

Antes de recibir su primer referido, el agente de un miembro nuevo genera candidatos de referido a partir de su grafo de relaciones y de su conocimiento de la Sala. El nuevo miembro entra dando. La reciprocidad se instala desde el minuto uno sin discursos.

---

### B8 · Cuota de contribución asistida por el agente

El mínimo obligatorio de referidos (D-010) no debe vivirse como una amenaza sino como un objetivo que el agente ayuda a alcanzar. El agente muestra en "Hoy" el estado del periodo ("2 de 3 referidos válidos · quedan 19 días"), propone candidatos concretos desde el grafo de relaciones y la prospección pública, y avisa con antelación. Solo cuentan los referidos que el receptor cualifica como válidos. Escalera de consecuencias propuesta: aviso del agente → conversación con la Directiva → plan de contribución de un periodo → plaza en revisión → baja. Un miembro que no aporta libera una plaza valiosa para otro que sí lo hará.

### B9 · Cero retribución, tolerancia cero

El Trust & Compliance Agent vigila cualquier indicio de dinero, comisión, descuento o favor condicionado a un referido (mensajes, notas de introducción, resultados). Un indicio abre expediente; una confirmación supone expulsión. Existe un canal confidencial para que un miembro denuncie que le han pedido o le han ofrecido contraprestación. Las relaciones comerciales normales entre miembros (ser cliente o proveedor uno de otro) son bienvenidas; lo prohibido es condicionar el referido.

### C7 · Tantas Salas como aguante la zona

Ver `docs/12_SALAS.md` y D-013. La exclusividad vive en la Sala (una empresa por especialidad). Una zona abre Salas nuevas mientras la lista de espera de calidad y la profundidad de mercado lo permitan, y deja de abrirlas cuando el flujo de referidos válidos por miembro empieza a diluirse. El mapa de Salas y plazas de la zona es el principal argumento de captación.

### C8 · Encuentros entre Salas con agenda generada por los agentes

Las Salas no son territoriales, así que el encuentro entre Salas no es "la reunión del barrio": es una cita convocada cuando los agentes detectan demanda cruzada real (necesidades de una Sala que otra cubre, referidos exportados frecuentes, sectores complementarios sin relación). La agenda la escriben los agentes: introducciones concretas preparadas de antemano. El resultado se mide en referidos entre Salas. Ver `docs/12_SALAS.md` §6bis.

### C9 · Embajada: la generosidad que más cuesta es la que más vale

Propuesta Fuera de la Sala (D-015, en el core). Cuando tu Sala no tiene titular para un buen referido, lo propones a un titular de otra Sala y, si resuelve, obtienes una prima de Mérito muy superior. La empresa que acoge la cesión queda acreditada como Embajadora de esa especialidad en tu Sala mientras la plaza siga vacante. Cada Embajada marca además una plaza que la Sala debería cubrir: el hueco se convierte en captación.

## D · Tensiones que hay que resolver (no ignorar)

| Tensión | Riesgo | Respuesta de diseño |
| --- | --- | --- |
| Reparto ilimitado vs. calidad | inflación de referidos flojos para sumar puntos | los puntos solo nacen de la cualificación del receptor y de resultados verificados; un referido mal cualificado resta |
| Mínimo obligatorio vs. calidad | referidos de relleno para cumplir cuota | solo cuentan los referidos cualificados como válidos por el receptor; el agente ayuda a llegar al mínimo con candidatos reales; el relleno reiterado se trata como incumplimiento |
| Receptor que infrapuntúa | evita "deber" reciprocidad | B2 + B3: el receptor también tiene reputación y coherencia como evaluador |
| Colusión | dos empresas se inflan mutuamente | detección de anillos, auditoría muestral, peso decreciente de pares repetidos |
| Grafo de relaciones | GDPR, contactos de terceros | base jurídica B2B (interés legítimo), minimización, el contacto nunca se revela sin permiso del dueño, derecho de exclusión |
| Prospección pública | falsos positivos, ruido | las señales de web pública entran con `confidence` baja y solo se elevan si un miembro las confirma |
| Niveles y privilegios | percepción de club de dos velocidades | los privilegios amplían acceso, nunca restringen el básico; todo nivel es explicable |

---

## E · Qué entra en el MVP y qué no

**Entra (demuestra la tesis):** A3, A4, A5, B1, B2, B7, B8, B9, C1, C6.
**Se diseña ahora, se activa en Fase 2:** A1, A2, B3, B4 (niveles), C2.
**Fase 3+:** B5, B6, C3, C4, C5.

Regla: el MVP debe demostrar que **un referido dado por un agente, cualificado por el receptor y verificado por NS, produce más y mejor negocio que una reunión semanal**. Todo lo demás es escala.
