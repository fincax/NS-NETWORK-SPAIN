# Pendientes del fundador

Lo que se ha dejado deliberadamente "para más adelante". Claude lo recuerda cuando se le pide y cuando una feature toca uno de estos puntos. Cuando un punto se decide, pasa a `DECISIONS.md` y se tacha aquí con la referencia.

**Última revisión:** 2026-09-22

## Protocolos de Sala (D-018, D-019) · detalles pospuestos el 2026-09-14

- **Protocolo II · Dar a Conocer.** Comunicado semanal, Gaceta y Dossier vivo: decidido en su obligación, sin construir. Faltan día y hora del cierre semanal, tope de Comunicados de continuidad y si la Gaceta se comparte entre Salas (`docs/14` §9). El titular ya firma el Comunicado como Norma NS: conviene construirlo antes de las primeras empresas reales.
- **Brújula completa.** Cuatro bloques (dónde estás, por qué, qué ganas, Movimientos) y tres o cinco Movimientos accionables. Hoy es una tarjeta con el estado del Compromiso.
- **Ritmo por Sala.** La Sala puede fijar un Ritmo mayor que 1, pero no hay pantalla para hacerlo.
- **Calibración del Mérito frente a la Escalera.** Una Promesa vale hasta 100 y una semana sin ceder resta 5. Revisar tras cuatro semanas de la Sala piloto (D-042).

## Estructura y gobierno

- ~~Nombre de la dirección de la Sala~~ → **Directiva** (D-061; "Director/a de Sala" desaparece). Pendientes: composición de la Directiva (una persona o varias), cómo se elige y duración del mandato.
- **Calibración de la Valoración** (D-046): pesos de los cinco componentes, umbral de tres acciones de dirección, Mérito por acción (D-048), Mérito de Red por Sala adicional (D-047). Tras el primer mes de la Sala piloto.
- **Cesiones abiertas en el momento de la baja** (D-044).
- **Panel de NS.** Hoy NS confirma las bajas desde la Antesala de la Sala con el rol `is_network`. Falta un panel propio de la red.
- **Re-aceptación de las Normas NS** por los titulares existentes cuando cambie la versión (D-043).
- **Manantial (D-059).** Confirmar qué especialidades llevan la marca en NS-CAT v0.1 (propuesta: administración de fincas, asesoría fiscal, seguros de empresa, arquitectura). Construir el Apunte de Interesado múltiple (una comunidad de propietarios → varias Cesiones de un toque, con decisor y plazo de la junta). Recoger la forma jurídica en el alta para admitir autónomos con NIF como titulares. Decidir si la Hoja de Méritos muestra "negocio contrastado para N especialidades" como reconocimiento del Manantial.
- Delimitar la Zona NS Sevilla; lista de especialidades fundadoras de NS Cumbre y primera versión NS-CAT; umbrales de apertura y saturación; formato de los encuentros entre Salas (`docs/12` §9).

## Modelo económico (D-025, D-041)

- Importes de la cuota, si existe cuota de incorporación, número de Tramos, umbrales y periodo de revisión.
- Mínimo real de fundadoras y gratificación definitiva de la Promotora.

## Fuentes públicas y Prueba de Valor (D-050, D-051)

- **BORME por empresa**: los actos están en PDF por provincia; hace falta extracción de texto antes de leerlos.
- **Licencias de obra** municipales y **empleo**: sin fuente abierta estable; buscar convenios o portales de datos abiertos.
- **Validar en el servidor** los adaptadores de PLACE y prensa (volumen y calidad de Indicios por fuente).
- **Envío automático del informe** de la Prueba de Valor por correo al candidato y su duración definitiva (hoy 7 días).
- **Web del candidato en la Prueba**: la candidatura pública aún no pide la web; con ella el ADN provisional sería mejor.

## Mesa en directo (D-053)

- ~~Cola de trabajos~~ hecha. Pendiente: validarla con la clave del modelo en el servidor, medir tiempos por Indicio y fijar el presupuesto de tokens por Tramo (D-025).

## Producto

- Tipografía definitiva (D-023).
- Política de notificaciones push (D-039).
- **Latido de la demo** (D-057): el banco tiene 24 Indicios y se repite cada ocho días; ampliarlo si la ronda de demos se alarga. Confirmar la protagonista (hoy Reformas Industriales Híspalis · Carlos Ruiz) o fijar otra con `NS_LATIDO_PROTAGONISTA`. Decidir si la demo pasa al modelo real (`ANTHROPIC_API_KEY`), con el que el Latido encola en la Mesa en vez de cualificar en línea.
- **Pregunta al cedente** (D-058): el tope de dos rondas y el reinicio del plazo de 7 días en cada ida y vuelta son parámetros iniciales; revisar con Timoneles reales. Sin clave del modelo, el Agente del cedente no deja borrador (el determinista no responde preguntas libres).
- ~~**Copias de seguridad** (D-056): clave guardada fuera del servidor y remoto `ns-copias` en Backblaze B2 (UE), hecho el 22-09.~~ Queda hacer una restauración completa de prueba una vez.
- **Correo saliente** (D-060): configurado en el servidor con IONOS (`smtp.ionos.es`, 465) el 22-09. **Pendiente de que soporte de Clouding desbloquee la salida por los puertos 465 y 587** (ticket abierto por el fundador). Después: `correo.sh probar` y, si los correos llegan a spam, SPF y DKIM del dominio en IONOS. Plan B: Brevo por el puerto 2525.
- Textos legales y GDPR (`docs/08`, condición 4 de `docs/17`). Hecho el aviso de privacidad de la web pública (D-055); falta el resto de `docs/08` §3 con el abogado.
- ~~Responsable del tratamiento~~ → Be Trendy, S.L. (D-055, aviso 2026-09-15.3). Buzón de contacto: `hola@networkspain.com` (o `NS_CONTACT_EMAIL` en el servidor); comprobar que recibe correo.
