# Bitácora de trabajo

Punto de parada y siguiente paso. Se actualiza al cerrar cada sesión de trabajo.

## 16 de septiembre de 2026 · servidor al día con `main`

**Dónde estamos.**

- `main` contiene las PR #1 a #14. No hay PR abiertas. La #14 (la coma de «Su agente sí, 24/7») se aplicó hoy en el servidor con `actualizar.sh`: el servidor y `main` sirven lo mismo.
- Las PR #12 (privacidad, D-055) y #13 (copias, D-056) quedaron aplicadas en el servidor el día 15 por la tarde. Primera copia real hecha y restaurada con éxito (37 tablas, 10 empresas, 9 candidaturas). Copias nocturnas a las 03:30 activas.
- Decisiones registradas hasta **D-056**.
- Ramas antiguas sin fusionar (`claude/new-session-agaa9j`, `claude/optimistic-tesla-wb8htp`): superadas por trabajo posterior en `main`; no se fusionan.
- **Misma mañana:** Latido de la Sala de demostración (D-057), en la rama `claude/confident-ramanujan-2e7qif`. La Sala ficticia late sola a las 9:00, 13:00 y 18:00 (un Indicio de un banco de 24) y las Cesiones ficticias avanzan con plazos realistas hasta el valor contrastado; nadie decide por Reformas Industriales Híspalis (Carlos Ruiz), la empresa con la que se enseña, ni por una empresa que dé de alta el fundador. Tarjeta "Sala viva" y botón "Latir ahora" en Hoy. Segunda Directiva en la semilla (Pedro Lucena), que el Latido repone si la Sala ya existía. 132 pruebas en verde, tipos y lint limpios. **PR #15 fusionada y aplicada en el servidor** con `actualizar.sh` (commit `6ebc093`): el Latido corre en networkspain.com. Decisiones hasta **D-057**.

**Siguiente paso acordado (por este orden).**

1. Entrar en networkspain.com como Carlos Ruiz, comprobar en Hoy la tarjeta "Sala viva" y pulsar "Latir ahora" una vez para ver el primer Indicio del Latido en la Mesa. Desde entonces la Sala late sola (9:00, 13:00, 18:00).
2. Guardar la clave de cifrado de las copias (`cat /root/.ns-copias-clave`) en el gestor de contraseñas y configurar el remoto `ns-copias` con rclone (`docs/17` §4c) para que la tarjeta de copias pase a verde.
3. Pulsar "Preparar NS Cumbre (demo)" en Hoy, si no está hecho, y enseñar la demo a los primeros empresarios de Sevilla.
4. Al día siguiente, mirar `/var/log/ns-ronda.log` en el servidor: es la primera Ronda con las fuentes públicas reales (D-051).
5. Opcional: poner `ANTHROPIC_API_KEY` en `.env.production` (docs/17 §4c, paso 6) para que los Agentes razonen con Claude y la Mesa corra en segundo plano (D-053).
6. Envío de correos para invitaciones y recuperación de contraseña (D-054); después notificaciones push (D-039), que ya tienen dominio publicado.
7. Después: resto de `docs/08` con el abogado, Protocolo II (Comunicado y Gaceta) y Brújula.

**Para actualizar el servidor** cuando haya código nuevo en `main`: entrar por SSH (`ssh root@200.234.236.135` desde PowerShell) y lanzar `bash /opt/ns-network/deploy/actualizar.sh`. La última línea debe nombrar el commit más reciente de `main`.

## 15 de septiembre de 2026 · la demo está publicada

**Dónde estamos.**

- PR #9 (cuentas personales, D-054) fusionada en la #10; PR #11 (despliegue en servidor propio) fusionada. `main` contiene todo. Decisiones registradas hasta **D-054**.
- **La demo privada está en línea en https://networkspain.com** desde hoy, en un servidor propio de Clouding (Ubuntu, IP 200.234.236.135) instalado con `deploy/instalar.sh`: PostgreSQL local, `pm2` con la aplicación `online`, nginx con certificado HTTPS válido hasta el 14 de diciembre de 2026 (renovación automática), Ronda programada a las 06:00 y drenaje de la Mesa cada cinco minutos. Las claves están en `/opt/ns-network/apps/web/.env.production` del servidor. Modo `NS_AUTH_MODE=demo`, `NS_PUBLIC_FEEDS=real`, sin clave del modelo todavía.
- Antes de instalar se verificó en el entorno de desarrollo, con Node 22 y pnpm 10.33: build limpio, 105 pruebas en verde y arranque en modo producción con las mismas variables que crea el script.

- **Misma tarde, después:** copias de seguridad del servidor (D-056): `deploy/copias.sh` hace cada noche una copia cifrada, la prueba restaurándola, guarda 30 días, la envía fuera si hay remoto `ns-copias` y deja el estado que la Directiva ve en Hoy. Probado contra un PostgreSQL real. Decisiones hasta **D-056**. Pendiente del fundador: guardar la clave y configurar el remoto.
- **Misma tarde:** aviso de privacidad público en `/privacidad` y consentimiento expreso, versionado y registrado, en la candidatura de la portada (D-055). Abierto `docs/08` v0.1. Decisiones hasta **D-055**. Pendiente de fusionar y de aplicar al servidor con `actualizar.sh`.

**Siguiente paso acordado (por este orden).**

1. Pulsar "Preparar NS Cumbre (demo)" en Hoy y enseñar la demo a los primeros empresarios de Sevilla.
2. Al día siguiente, mirar `/var/log/ns-ronda.log` en el servidor: es la primera Ronda con las fuentes públicas reales (D-051).
3. Opcional: poner `ANTHROPIC_API_KEY` en `.env.production` (docs/17 §4c, paso 6) para que los Agentes razonen con Claude y la Mesa corra en segundo plano (D-053).
4. Envío de correos para invitaciones y recuperación de contraseña (D-054); después notificaciones push (D-039), que ya tienen dominio publicado.
5. Fusionar y aplicar las copias con `actualizar.sh`; guardar la clave; configurar el remoto `ns-copias`. Después: resto de `docs/08` con el abogado, Protocolo II (Comunicado y Gaceta) y Brújula.

**Para actualizar el servidor** cuando haya código nuevo en `main`: `bash /opt/ns-network/deploy/actualizar.sh`.

## 14 de septiembre de 2026 · cierre de sesión

**Dónde estamos.**

- Rama principal (`main`) con las PR #1 a #8 fusionadas: constitución, protocolo NS-ARP, vertical slice completo, Antesala (D-035), Ronda diaria (D-036), Apunte móvil (D-037), fuentes propias (D-038), app instalable con número en el icono (D-039), entrevista del Agente para el ADN (D-040), Fundación de Sala (D-041) y el resumen técnico en PDF (`docs/exports/NS_Resumen_tecnico_2026-09-14.pdf`).
- **Pendiente de fusionar por el fundador: PR #9** (rama `claude/exciting-gauss-pqgjkv`): cuentas personales (D-054). 75 pruebas y dos recorridos de navegador en verde.
- Decisiones registradas hasta **D-054**.

**Decisiones del fundador que siguen abiertas.** Tipografía (D-023); importes y Tramos de la cuota y si hay cuota de incorporación (D-025); parámetros del Compromiso (D-010); especialidades fundadoras de NS Cumbre; Ritmo por defecto y calendario de la Gaceta; mínimo real de fundadoras y gratificación definitiva (D-041); comprobación de "NS Network" en EUIPO y dominios paraguas (D-034).

**Siguiente paso acordado (por este orden).**

1. Fusionar la PR #9.
2. Envío de correos para las invitaciones y la recuperación de contraseña (D-054 lo deja para después).
3. Notificaciones push "Tu Agente tiene una Cesión para ti" (decididas en D-039; exigen el dominio publicado).
4. Después: copias de seguridad en Neon con restauración probada, textos legales y GDPR (`docs/08`), Mesa en segundo plano con Claude, Protocolo II (Comunicado y Gaceta) y Brújula, fuentes reales de Rastreo.

**Para el fundador.** Publicar la demo en networkspain.com siguiendo `docs/17_DESPLIEGUE.md` §4 (Neon, Vercel, variables, "Preparar NS Cumbre", DNS) y enseñarla a los primeros empresarios de Sevilla.
