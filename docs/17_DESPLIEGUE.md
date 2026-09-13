# 17 · Cuándo y cómo pasar al servidor

**Para quién:** el fundador, sin conocimientos de programación. **Estado:** recomendación del equipo fundador, septiembre de 2026.

## La respuesta corta

Hay dos "servidores" distintos y conviene no confundirlos:

```text
1. DEMO PRIVADA        Una dirección web protegida por contraseña donde tú (y quien tú invites) veis NS Cumbre funcionando
                       con los datos ficticios. Conviene hacerlo YA. Cuesta una tarde y unos pocos euros al mes.

2. PRODUCCIÓN          La dirección donde entran empresas reales con datos reales. NO todavía. Antes hay que cerrar cinco
                       cosas que hoy faltan y que, con empresas de verdad, serían un riesgo legal y de confianza.
```

## 0. Lo que ya está hecho en el código (D-033)

- Portada pública en `/` con la narrativa en modo beta, la disponibilidad real de plazas y la candidatura "Solicitar plaza en la beta" (se guarda en la base de datos).
- Puerta de la demo en `/acceso`: usuario y contraseña compartidos, definidos por variables de entorno. Todo lo que no es portada exige esa sesión.
- Aviso permanente "Beta privada · datos ficticios" dentro de la app, con salida.
- **Entrevista del Agente** (D-040): desde el Dossier de la propia empresa, "Ampliar mi ADN con la entrevista del Agente", o automáticamente tras dar de alta una empresa. Sin `ANTHROPIC_API_KEY` conduce el guion fijo; con ella, Claude.
- **App instalable** (D-039): en el móvil, la demo se instala desde el navegador (Android: "Instalar aplicación"; iPhone: Compartir → "Añadir a pantalla de inicio"). Hoy lo sugiere la primera vez. El icono muestra el número de decisiones pendientes.
- **Apunte** (D-037): botón flotante "Apuntar" en toda la app. En el móvil, con la demo abierta en el navegador, "Añadir a pantalla de inicio" crea un icono NS cuyo menú ofrece "Apuntar un referido".
- **Fuentes propias** (D-038): en el Dossier de la propia empresa, "Fuentes de mi Agente". La Ronda las lee cada mañana; en local se prueban con "Leer mis fuentes ahora" (requiere salida a internet).
- **Antesala** (D-035): la Directiva ve y despacha las candidaturas que llegan desde la portada, con el veredicto de plaza calculado. En la demo, elige a Inés Domínguez (Bufete Alameda · Directiva) en el selector de Timonel.

## 1. Demo privada: ahora

**Qué se consigue.** Enseñar el producto a los primeros empresarios de Sevilla desde cualquier ordenador o móvil, sin instalar nada, con la Sala NS Cumbre, sus diez titulares y los tres escenarios. Y que tú puedas entrar cada día y pulsar botones sin depender de nadie.

**Qué hace falta.**

- Un alojamiento para la aplicación. Recomendación: Vercel (la empresa que hace Next.js, el framework de la app), plan gratuito o de 20 € al mes. Alternativa: un servidor pequeño en Hetzner o en un proveedor español, por unos 5 a 10 € al mes, si prefieres que los datos no salgan de Europa desde el primer día (Vercel también tiene región en Frankfurt).
- Una base de datos PostgreSQL gestionada. Recomendación: Neon o Supabase, con región en la Unión Europea, plan gratuito para la demo. Se conecta poniendo una sola variable (`DATABASE_URL`); la aplicación crea las tablas sola al arrancar.
- Una contraseña de acceso a toda la demo (protección básica del alojamiento, sin tocar el código) para que no la vea cualquiera.
- Opcional: la clave de Anthropic (`ANTHROPIC_API_KEY`) para que los Agentes razonen con Claude en lugar de con las reglas fijas. Para enseñar el producto no hace falta; para impresionar con Indicios escritos en lenguaje libre, sí.

**Cuánto tarda.** Una hora, siguiendo los pasos del apartado 4. El código ya está preparado; lo que falta son las cuentas (Vercel, Neon) y apuntar el dominio, que solo puedes hacer tú porque exigen tus credenciales.

**Qué no debe pasar en la demo.** No metas datos de clientes reales ni nombres reales de terceros. Todo lo que hay es ficticio y así debe seguir hasta producción.

## 2. Producción: cuando se cumplan cinco condiciones

Estas son las cinco cosas que faltan hoy y que hacen imprudente abrir la puerta a empresas reales. Están ordenadas por lo que tardan.

| # | Qué falta | Por qué es imprescindible | Esfuerzo estimado |
| --- | --- | --- | --- |
| 1 | **Usuarios con contraseña y permisos por Sala** | Hoy se elige la persona en un desplegable. Con datos reales, cada Timonel debe entrar solo a lo suyo. | 1 semana |
| 2 | **Los Agentes en segundo plano con el modelo real** | Hoy la Mesa se ejecuta al publicar, en segundos, con reglas fijas. Con Claude cada Indicio tarda más y no puede bloquear la pantalla; hace falta una cola de trabajo y reintentos. | 1 semana |
| 3 | **Copias de seguridad y registro de accesos** | Sin copias diarias un fallo borra la Sala. Sin registro de accesos no se puede demostrar quién vio qué (y NS promete trazabilidad). | 2 días |
| 4 | **Textos legales y GDPR** | Aviso de privacidad, condiciones de la plaza (con las reglas inmutables y la cuota por Tramos), base jurídica de los datos de terceros, retención y borrado. Es `docs/08_SECURITY_PRIVACY_GDPR.md`, que aún no existe. | 1 semana con un abogado |
| 5 | **La entrevista del ADN por el Agente** | Hecha en su primera versión (D-040): el alta desemboca en la entrevista, el ADN se construye conversando y se valida al final. Falta afinarla con Timoneles reales y con la clave del modelo en el servidor. | Hecha · afinar 2 días |

A esto se suman las decisiones de producto que siguen esperándote y que la web pública y el onboarding necesitan: importes de la cuota y Tramos (D-025), parámetros del Compromiso (D-010), lista de especialidades fundadoras de NS Cumbre, tipografía (D-023).

**Estimación honesta:** unas 4 a 6 semanas de trabajo del equipo fundador desde que se decida, más el tiempo del abogado. Antes de eso, la "producción" sería una demo con datos reales, que es lo peor de los dos mundos.

## 3. Puerta de Fase 1 (cuándo decimos "adelante")

Pasamos a producción cuando se cumpla todo esto:

- Las cinco condiciones anteriores, hechas y probadas.
- Entre 12 y 15 empresas fundadoras con plaza confirmada y ADN completo (D-006).
- El Timonel de cada una ha hecho al menos un Indicio en la demo y ha aceptado una Cesión ficticia (sabe usarlo).
- Las reglas inmutables y la cuota firmadas en la Candidatura.
- Una Directiva nombrada (Presidencia de la Sala).

## 4. Pasos para publicar la demo en networkspain.com

Los cinco pasos, en orden. Ninguno requiere programar; todos requieren tus cuentas.

1. **Base de datos.** Crea una cuenta en Neon (neon.tech) y un proyecto en la región de Frankfurt (eu-central-1). Copia la cadena de conexión (empieza por `postgres://`).
2. **Alojamiento.** Crea una cuenta en Vercel (vercel.com) con tu GitHub, importa el repositorio `fincax/NS-NETWORK-SPAIN` y, en la configuración del proyecto, pon **Root Directory = `apps/web`**. Vercel detecta Next.js solo.
3. **Variables de entorno** en Vercel (Settings → Environment Variables): `DATABASE_URL` (la cadena de Neon), `DEMO_USER`, `DEMO_PASSWORD` (elige una buena), `DEMO_SESSION_SECRET` (una frase larga y aleatoria), `CRON_SECRET` (otra frase larga y aleatoria; con ella Vercel lanza la Ronda cada mañana), `NS_PUBLIC_URL=https://networkspain.com`. Opcional: `ANTHROPIC_API_KEY`. Pulsa Deploy.
4. **Datos de la demo.** La primera vez, entra en la dirección que te da Vercel, ve a `/acceso`, entra con el usuario y la contraseña y pulsa "Preparar NS Cumbre (demo)" en Hoy. Eso crea la Sala, los diez titulares y los escenarios en la base de datos de Neon.
5. **Dominio.** En Vercel, Settings → Domains, añade `networkspain.com` y `www.networkspain.com`. Vercel te dice qué registro DNS crear en el panel donde compraste el dominio (un registro A o CNAME). En unas horas la portada responde en networkspain.com y la demo en networkspain.com/acceso.

La **Ronda** de cada mañana (D-036) ya viene programada en el código (`vercel.json`): Vercel llama a `GET /api/clock` a las 06:00 UTC con el `CRON_SECRET`, y los Agentes ejecutan el Reloj y el Rastreo de todas las Salas sin que nadie abra la aplicación. Se comprueba en Vercel, Settings → Cron Jobs, donde debe aparecer la tarea y sus últimas ejecuciones. En otro alojamiento, programa una tarea diaria que llame a esa dirección con la cabecera `Authorization: Bearer <CRON_SECRET>`, o ejecuta `pnpm clock`.

## 4b. Cómo se despliega, técnicamente (para quien lo haga)

```text
Alojamiento     Vercel (región fra1) o servidor propio con Node 22 y pnpm.
Base de datos   PostgreSQL 16 gestionado en la UE. Variable DATABASE_URL. Las migraciones se aplican al arrancar.
Variables       DATABASE_URL · DEMO_USER · DEMO_PASSWORD · DEMO_SESSION_SECRET · CRON_SECRET · NS_PUBLIC_URL · ANTHROPIC_API_KEY (opcional) · NS_LLM_MODEL · NS_LLM_PROVIDER
Comandos        pnpm install && pnpm build && pnpm start   ·   pnpm db:seed (solo demo)   ·   pnpm clock (Ronda diaria, equivale a GET /api/clock)
Tareas          La Ronda (Reloj + Rastreo) cada mañana: vercel.json la programa; en otro alojamiento, un cron que llame a /api/clock con el CRON_SECRET.
Copias          Copia diaria de la base de datos con retención de 30 días.
Dominio         Hoy: networkspain.com sirve portada y demo. Con producción: demo.networkspain.com para la demo y networkspain.com para la web y la app reales.
Marca           Paraguas "NS Network" + país (D-034). Dominios paraguas a reservar y marca europea a registrar antes de salir en prensa con empresas reales.
```

## 5. Resumen

- **Hoy:** fusionamos todo en la rama principal. La aplicación funciona de principio a fin en local con un comando.
- **Ahora:** el código de la demo privada y la portada beta está listo. Publicarla en networkspain.com son los cinco pasos del apartado 4, con tus cuentas.
- **Producción:** cuando estén las cinco condiciones y la puerta de Fase 1. Unas 4 a 6 semanas de trabajo, y solo entonces con empresas reales.
