# NS Network · app (vertical slice)

Next.js 16 (App Router, server actions) · TypeScript · Drizzle ORM · PostgreSQL (PGlite en local) · zod · Vitest.

```text
src/core        dominio puro, sin framework: types (zod), scoring (puertas + NS Match Score + Explanation),
                compliance (Salvoconducto), state-machine (Cesión), merit (Promesa, Veredicto, Mérito), aval (Eco y Aval, D-042)
src/agents      provider (contrato LLM), deterministic, anthropic, mesa (orquestador NS-ARP S4–S9), rastreo (fuentes públicas)
src/services    onboarding (alta y plaza), signals (S0–S3), referrals (puertas humanas), today (Hoy, Mesa, Balanza), clock (Reloj de la Sala), ronda (pasada de cada mañana: Reloj + Rastreo), demands (Encargos), antesala (candidaturas y veredicto de plaza, Directiva), apunte (captura móvil de un posible referido), sources (fuentes propias del Agente), entrevista (el Agente construye el ADN conversando), fundacion (Promotora y Sala nueva desde la Antesala), eco (Protocolo IV: invitación con el Puente, Petición de Eco, página pública del Interesado, Aval de la Cesión y del titular, Reloj)
src/db          schema (Drizzle), client (PGlite | Postgres), nscat (NS-CAT), seed-data (NS Cumbre), seed
src/app         / (portada beta pública) · acceso (puerta de la demo) · eco/[token] (página pública del Interesado, D-042) · (app)/: hoy · mesa · cesiones/[id] · indicio · sala · empresa/[slug]
src/proxy.ts    exige la sesión de la demo en todo lo que no sea portada, acceso o la página del Eco (D-033, D-042)
tests           core.test.ts (funciones puras) · slice.test.ts (recorrido completo sobre PGlite en memoria) · eco.test.ts (Protocolo IV de principio a fin)
scripts         seed.ts · demo.ts
drizzle         migraciones SQL generadas (pnpm db:generate)
```

Variables (ver `.env.example`): `DEMO_USER`, `DEMO_PASSWORD`, `DEMO_SESSION_SECRET` (en local: demo / nscumbre), `DATABASE_URL` (Postgres; sin ella, PGlite en `.data/`), `PGLITE_DATA_DIR` (`memory` para efímero), `ANTHROPIC_API_KEY` y `NS_LLM_MODEL` (por defecto `claude-opus-5`), `NS_LLM_PROVIDER=deterministic|anthropic`, `NS_PUBLIC_URL` (base del enlace del Eco que recibe el Interesado; en local, `http://localhost:3000`).

Comandos: `pnpm dev` · `pnpm db:seed` · `pnpm db:reset` · `pnpm demo` (imprime Cesiones y Mesa) · `pnpm clock` (Ronda: Reloj de la Sala + Rastreo; en el servidor la lanza `GET /api/clock` cada mañana) · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm db:generate` (tras cambiar el esquema).
