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

## 1. Demo privada: ahora

**Qué se consigue.** Enseñar el producto a los primeros empresarios de Sevilla desde cualquier ordenador o móvil, sin instalar nada, con la Sala NS Cumbre, sus diez titulares y los tres escenarios. Y que tú puedas entrar cada día y pulsar botones sin depender de nadie.

**Qué hace falta.**

- Un alojamiento para la aplicación. Recomendación: Vercel (la empresa que hace Next.js, el framework de la app), plan gratuito o de 20 € al mes. Alternativa: un servidor pequeño en Hetzner o en un proveedor español, por unos 5 a 10 € al mes, si prefieres que los datos no salgan de Europa desde el primer día (Vercel también tiene región en Frankfurt).
- Una base de datos PostgreSQL gestionada. Recomendación: Neon o Supabase, con región en la Unión Europea, plan gratuito para la demo. Se conecta poniendo una sola variable (`DATABASE_URL`); la aplicación crea las tablas sola al arrancar.
- Una contraseña de acceso a toda la demo (protección básica del alojamiento, sin tocar el código) para que no la vea cualquiera.
- Opcional: la clave de Anthropic (`ANTHROPIC_API_KEY`) para que los Agentes razonen con Claude en lugar de con las reglas fijas. Para enseñar el producto no hace falta; para impresionar con Indicios escritos en lenguaje libre, sí.

**Cuánto tarda.** Una tarde de trabajo del equipo fundador. Puedo prepararlo en la siguiente sesión: crear la configuración, probarla y darte la dirección.

**Qué no debe pasar en la demo.** No metas datos de clientes reales ni nombres reales de terceros. Todo lo que hay es ficticio y así debe seguir hasta producción.

## 2. Producción: cuando se cumplan cinco condiciones

Estas son las cinco cosas que faltan hoy y que hacen imprudente abrir la puerta a empresas reales. Están ordenadas por lo que tardan.

| # | Qué falta | Por qué es imprescindible | Esfuerzo estimado |
| --- | --- | --- | --- |
| 1 | **Usuarios con contraseña y permisos por Sala** | Hoy se elige la persona en un desplegable. Con datos reales, cada Timonel debe entrar solo a lo suyo. | 1 semana |
| 2 | **Los Agentes en segundo plano con el modelo real** | Hoy la Mesa se ejecuta al publicar, en segundos, con reglas fijas. Con Claude cada Indicio tarda más y no puede bloquear la pantalla; hace falta una cola de trabajo y reintentos. | 1 semana |
| 3 | **Copias de seguridad y registro de accesos** | Sin copias diarias un fallo borra la Sala. Sin registro de accesos no se puede demostrar quién vio qué (y NS promete trazabilidad). | 2 días |
| 4 | **Textos legales y GDPR** | Aviso de privacidad, condiciones de la plaza (con las reglas inmutables y la cuota por Tramos), base jurídica de los datos de terceros, retención y borrado. Es `docs/08_SECURITY_PRIVACY_GDPR.md`, que aún no existe. | 1 semana con un abogado |
| 5 | **La entrevista del ADN por el Agente** | Hoy el alta es un formulario mínimo. Con empresas reales, la calidad de las Cesiones depende de un ADN completo, y eso lo hace la entrevista inteligente del Agente. | 1 semana |

A esto se suman las decisiones de producto que siguen esperándote y que la web pública y el onboarding necesitan: importes de la cuota y Tramos (D-025), parámetros del Compromiso (D-010), lista de especialidades fundadoras de NS Cumbre, tipografía (D-023).

**Estimación honesta:** unas 4 a 6 semanas de trabajo del equipo fundador desde que se decida, más el tiempo del abogado. Antes de eso, la "producción" sería una demo con datos reales, que es lo peor de los dos mundos.

## 3. Puerta de Fase 1 (cuándo decimos "adelante")

Pasamos a producción cuando se cumpla todo esto:

- Las cinco condiciones anteriores, hechas y probadas.
- Entre 12 y 15 empresas fundadoras con plaza confirmada y ADN completo (D-006).
- El Timonel de cada una ha hecho al menos un Indicio en la demo y ha aceptado una Cesión ficticia (sabe usarlo).
- Las reglas inmutables y la cuota firmadas en la Candidatura.
- Una Directiva nombrada (Presidencia de la Sala).

## 4. Cómo se despliega, técnicamente (para quien lo haga)

```text
Alojamiento     Vercel (región fra1) o servidor propio con Node 22 y pnpm.
Base de datos   PostgreSQL 16 gestionado en la UE. Variable DATABASE_URL. Las migraciones se aplican al arrancar.
Variables       DATABASE_URL · ANTHROPIC_API_KEY (opcional) · NS_LLM_MODEL (por defecto claude-opus-5) · NS_LLM_PROVIDER
Comandos        pnpm install && pnpm build && pnpm start   ·   pnpm db:seed (solo demo)   ·   pnpm clock (tarea diaria)
Tareas          El Reloj de la Sala y el Rastreo deben ejecutarse cada mañana (cron del alojamiento o una tarea programada).
Copias          Copia diaria de la base de datos con retención de 30 días.
Dominio         Un subdominio para la demo (por ejemplo demo.nsnetwork.es) y otro para producción, nunca el mismo.
```

## 5. Resumen

- **Hoy:** fusionamos todo en la rama principal. La aplicación funciona de principio a fin en local con un comando.
- **Siguiente sesión:** demo privada en internet, protegida por contraseña, para enseñar NS Cumbre.
- **Producción:** cuando estén las cinco condiciones y la puerta de Fase 1. Unas 4 a 6 semanas de trabajo, y solo entonces con empresas reales.
