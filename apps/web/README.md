# NS Network · app (vertical slice)

Next.js 16 (App Router, server actions) · TypeScript · Drizzle ORM · PostgreSQL (PGlite en local) · zod · Vitest.

```text
src/core        dominio puro, sin framework: types (zod), scoring (puertas + NS Match Score + Explanation),
                compliance (Salvoconducto), state-machine (Cesión), merit (Promesa, Veredicto, Mérito)
src/agents      provider (contrato LLM), deterministic, anthropic, mesa (orquestador NS-ARP S4–S9), rastreo (fuentes públicas)
src/services    onboarding (alta y plaza), signals (S0–S3), referrals (puertas humanas), today (Hoy, Mesa, Balanza), clock (Reloj de la Sala), demands (Encargos), antesala (candidaturas y veredicto de plaza, Directiva)
src/db          schema (Drizzle), client (PGlite | Postgres), nscat (NS-CAT), seed-data (NS Cumbre), seed
src/app         / (portada beta pública) · acceso (puerta de la demo) · (app)/: hoy · mesa · cesiones/[id] · indicio · sala · empresa/[slug]
src/proxy.ts    exige la sesión de la demo en todo lo que no sea portada o acceso (D-033)
tests           core.test.ts (funciones puras) · slice.test.ts (recorrido completo sobre PGlite en memoria)
scripts         seed.ts · demo.ts
drizzle         migraciones SQL generadas (pnpm db:generate)
```

Variables (ver `.env.example`): `DEMO_USER`, `DEMO_PASSWORD`, `DEMO_SESSION_SECRET` (en local: demo / nscumbre), `DATABASE_URL` (Postgres; sin ella, PGlite en `.data/`), `PGLITE_DATA_DIR` (`memory` para efímero), `ANTHROPIC_API_KEY` y `NS_LLM_MODEL` (por defecto `claude-opus-5`), `NS_LLM_PROVIDER=deterministic|anthropic`.

Comandos: `pnpm dev` · `pnpm db:seed` · `pnpm db:reset` · `pnpm demo` (imprime Cesiones y Mesa) · `pnpm clock` (Reloj de la Sala) · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm db:generate` (tras cambiar el esquema).
