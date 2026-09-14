# 18 · Reglamento · Normas y Ventajas de los titulares

**Estado:** canal abierto por el fundador (D-043, CONFIRMED). Registro vivo: se añade en el tiempo.
**Fuente de verdad ejecutable:** `apps/web/src/core/rulebook.ts` (lo que la Sala ve en `/sala/reglamento` y lo que las pruebas comprueban). Este documento es la lectura humana y el historial de cada entrada.

## 0. Qué es

El Reglamento es el conjunto de **Normas de obligado cumplimiento para todos los titulares** y de **Ventajas para los titulares destacados**. No es un manual de buenas prácticas: cada entrada dice cómo la verifica NS y qué pasa si se incumple o cómo se disfruta. Las reglas inmutables (D-010, D-018, D-019, D-042) son Normas del Reglamento con la marca **inmutable**: no se revisan, se aplican.

Principios:

1. **Norma para todos, Ventaja para los destacados.** Ninguna Ventaja restringe el acceso básico de nadie; amplía el de quien destaca (D-009).
2. **Verificable o no es Norma.** Una Norma vigente tiene mecanismo, verificación (evento) y consecuencia. Si todavía no, está protocolizada y lo dice.
3. **Explicable.** El titular ve en su Sala el Reglamento completo con el estado de cada entrada. Nada se aplica por sorpresa.
4. **El Agente ayuda a cumplir.** Cada Norma con plazo tiene su empujón en el Reloj de la Sala y su Movimiento en la Brújula antes de que haya consecuencia.
5. **Nunca contraprestación.** Ninguna Ventaja es dinero por referidos ni condiciona una Cesión (N-001).

## 1. El canal: cómo se añade una Norma o una Ventaja

```text
1. El fundador la enuncia (en conversación, en una línea o en detalle).
2. Se registra en el acto en este documento y en rulebook.ts con el siguiente identificador libre
   (N-0xx para Normas, V-0xx para Ventajas), fecha, fuente y el estado que el fundador indique:
     · "de inmediato"        → PROTOCOLIZADA hoy; VIGENTE en cuanto el mecanismo esté en el código (mismo cambio si es posible).
     · "cuando se diga"      → BORRADOR, anotada y visible solo aquí, hasta que el fundador la fije.
3. Si es una Norma: se especifica mecanismo, verificación (evento) y consecuencia. Si es una Ventaja: mecanismo y qué se gana.
4. Se implementa: Reloj, Compliance, Aval, Mérito, pantalla, según corresponda. Las pruebas comprueban la integridad del registro.
5. Se anota en DECISIONS.md si cambia algo estructural; si no, basta con este registro.
```

Estados: **BORRADOR** (anotada, pendiente del fundador) → **PROTOCOLIZADA** (fijada por el fundador, especificada y visible en la Sala; verificación en construcción) → **VIGENTE** (NS la verifica y la aplica sola). También **SUSPENDIDA** y **DEROGADA**, con motivo.

Ámbitos: **Todos los titulares** · **Titulares destacados** · **NS** (obligación de NS con la Sala).

## 2. Titular Destacado (umbral 85 CONFIRMADO por el fundador el 2026-09-14 · PROTOCOLIZADA y VIGENTE)

> Titular con **Aval firme igual o superior a 85** (al menos 3 Ecos recibidos y 3 Cesiones cedidas con Veredicto) y **sin ningún incumplimiento del Reglamento en los últimos 90 días** (respuestas tardías, Peticiones de Eco no enviadas, Compromiso o Comunicado incumplidos, violaciones de política).

El Ritmo y el Comunicado no se exigen aparte: ya pesan dentro del Aval (bloque Contribución y, cuando exista, el Comunicado). Se recalcula cada mañana en la Ronda (`runDestacados`), se ve en el Dossier, en la Balanza y en la página pública del Aval, y la Crónica anuncia a la Sala quien lo alcanza; quien lo pierde lo sabe solo él, con la razón y con Movimientos para recuperarlo. Nunca es un ranking: es una condición que cualquiera puede alcanzar. Las Ventajas de ámbito "destacados" que se añadan a partir de ahora se conceden por esta marca.

### Por qué 85 (cálculo con la fórmula real del Aval, 2026-09-14)

Aval del titular = 40 % Voz de los Interesados + 25 % Calidad de lo que cede + 20 % Respuesta + 15 % Contribución. Perfiles ejecutados sobre `computeTitularAval`:

| Perfil | Aval |
| --- | --- |
| Recién llegado, todo neutro | 60 |
| Cumple plazos y Ritmo; Ecos 3/5; lo cedido con Aval 70 | 73 |
| Cumple plazos y Ritmo; Ecos 3,5/5; lo cedido 80 | 80 |
| **Cumple plazos y Ritmo; Ecos 4/5; lo cedido 80** | **85** |
| Cumple plazos y Ritmo; Ecos 4/5; lo cedido 90 | 88 |
| Cumple todo; Ecos 5/5; lo cedido 90 | 98 |
| Ecos 5/5 y lo cedido 90, pero la mitad de los plazos y del Ritmo | 80 |
| Ecos 5/5 y lo cedido 90, con el 80 % de plazos y de Ritmo | 91 |
| Ecos 2,5/5 (mal atendido) aunque cumple todo; lo cedido 90 | 73 |

Conclusión: **85** es exactamente el titular que hace todo lo que depende de él (plazos y Ritmo al 100 %), cuyos Interesados le dan de media 4 sobre 5 y cuyas Cesiones cedidas salen con Aval 80. Por debajo de 85 se llega con Ecos discretos aunque se cumpla todo (80), o con Ecos perfectos aunque se cumpla solo la mitad (80): ninguno de los dos debe ser destacado. Por eso el umbral no es 80. Un 90 exigiría Ecos de 4,5 sobre 5, que dependen de la generosidad del cliente más que del titular: demasiado alto para una condición alcanzable. Además, 85 coincide con la banda "Aval alto" ya definida. El Aval debe ser **firme** (al menos tres Ecos y tres Cesiones con Veredicto): el valor neutro de un recién llegado es 60 y nunca cuenta.

## 3. Normas · para todos los titulares

| Id | Norma | Estado | Fuente | Cómo se aplica | Si se incumple |
| --- | --- | --- | --- | --- | --- |
| **N-001** · inmutable | Nunca se cobra por una Cesión ni por una valoración. | VIGENTE | D-010 | Filtro de contraprestación en notas, Puente, Veredicto, Petición de Eco y comentarios; `REFERRAL_FEE_VIOLATION`. | Expulsión de la Sala y de la red. |
| **N-002** · inmutable | Compromiso: mínimo de Cesiones válidas por Ejercicio. | PROTOCOLIZADA | D-010 | Ritmo por Sala y bloque Contribución del Aval. Parámetros del Compromiso pendientes del fundador. | Escalera: aviso → Directiva → plan → plaza en revisión → baja. |
| **N-003** · inmutable | Calidad por encima de cantidad: solo cuenta la Cesión con Veredicto válido. | VIGENTE | D-010 | Balanza y Compromiso cuentan solo válidas; `PROMISE_REVOKED` y Aval nulo si el Indicio era falso. | La Cesión no cuenta; se retira el Mérito de Promesa. |
| **N-004** · inmutable | Comunicado semanal a la Sala. | PROTOCOLIZADA | D-018 | Protocolo II (docs/14); persistencia y Reloj semanal pendientes. | Misma escalera que el Compromiso. |
| **N-005** · inmutable · NS | Lo que se da y lo que se recibe se ve (Balanza pública). | VIGENTE | D-019 | Balanza en Mi Sala y Dossier. | — |
| **N-006** · inmutable | Toda Cesión da la palabra al Interesado. | VIGENTE | D-042 | Protocolo IV: invitación con el Puente, Reloj a 3 · 14 · 30 días, Peticiones pendientes en Hoy. | `ECO_REQUEST_MISSED` (−15) a los 14 días; cuenta en el Aval. |
| **N-007** | Decidir sobre una Cesión en 7 días; el silencio cuenta. | VIGENTE | D-024, D-030 | Reloj: recordatorio a las 72 h, caducidad a los 7 días. | `RESPONSE_LATE` (−20); bloque Respuesta del Aval. |
| **N-008** | Responder al Interesado en 48 h tras el Puente. | VIGENTE | D-024, D-030 | Reloj: `response_due_at`; `RESPONSE_LATE` sin hito. | `RESPONSE_LATE` (−10); bloque Respuesta del Aval. |
| **N-009** | Emitir Veredicto al cerrar toda Cesión. | PROTOCOLIZADA | D-020 | Check-in del Agente cada 14 días. Consecuencia por Veredicto no emitido pendiente del fundador (propuesta: `RESPONSE_LATE` a los 14 días del cierre). | Pendiente. |
| **N-010** | Una empresa por plaza y un Timonel que decide. | VIGENTE | D-001, D-027 | Plaza única en el alta; puertas humanas de NS-ARP. | Alta derivada a Antesala o a Fundación (D-041). |
| **N-011** | Ningún Agente contacta con un tercero: lo hace la persona. | VIGENTE | Constitución · autonomía externa | No existe envío externo en el código; el Timonel marca Puente y Petición como enviados. | Contacto con un tercero sin Apertura autorizada: Contraste y expediente ante la Directiva. |
| **N-012** | Mantener el ADN de Empresa validado. | PROTOCOLIZADA | D-040 | Aviso en Hoy y Dossier; Entrevista. Plazo pendiente del fundador. | Pendiente (propuesta: plaza marcada "ADN sin validar" y Pistas con confianza baja). |

## 4. Ventajas · para los titulares destacados

| Id | Ventaja | Estado | Fuente | Cómo se aplica | Qué se gana |
| --- | --- | --- | --- | --- | --- |
| **V-001** | Acoger Embajadas. | VIGENTE | D-015, D-042 | Elegibilidad: Aval ≥ 70, 3 Ecos, voz ≥ 70; candidatos ordenados por Aval. | Cesiones de otras Salas y mención en la Hoja de Méritos. |
| **V-002** | Prioridad en la Mesa. | VIGENTE | D-042 | Orden de candidatos por Aval a igual plaza; Aval en el Encaje. | Recibe antes y con mejor Encaje. |
| **V-003** | Prima de Mérito por Embajada. | VIGENTE | D-015 | ×2,5 en Promesa y Veredicto; ×1,5 en Eco. | Mérito muy superior al ordinario. |
| **V-004** | Distinción y Cesión del mes. | PROTOCOLIZADA | D-020 | Distinción implementada; Cesión del mes en la Crónica pendiente. | Reconocimiento público en la Sala. |
| **V-005** | Niveles que amplían el acceso (Contribuidor, Referente, Consejero, Fundador). | PROTOCOLIZADA | D-009, D-016 | Columna `tier`; umbrales y automatismo pendientes del fundador. | Prioridad en empates, Cesiones de otras Salas, red nacional, asiento en el consejo. |
| **V-006** · todos | Gratificación a la Promotora de una Sala nueva. | VIGENTE | D-041 | `reward_text` al fundar la Sala. | Meses de cuota gratis u otra que NS anuncie. |

## 5. Borradores

Ninguno todavía. Las próximas Normas y Ventajas del fundador se anotan aquí con su identificador siguiente (N-013, V-007) y pasan a las tablas cuando se fijan.

## 6. Historial

- 2026-09-14 · El fundador confirma el umbral 85 de Titular Destacado. Criterio protocolizado y vigente: `destacado_since` en la empresa, pasada diaria en la Ronda, marca en Dossier, Balanza y página pública, evento en la Crónica.
- 2026-09-14 · Canal abierto (D-043). Registro sembrado con las doce Normas y seis Ventajas ya en vigor o protocolizadas en la constitución y en D-001 a D-042. Criterio de Destacado propuesto.
