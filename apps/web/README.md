# NS Network · app (vertical slice)

Next.js 16 (App Router, server actions) · TypeScript · Drizzle ORM · PostgreSQL (PGlite en local) · zod · Vitest.

```text
src/core        dominio puro, sin framework: types (zod), scoring (puertas + NS Match Score + Explanation),
                compliance (Salvoconducto), state-machine (Cesión), merit (Promesa, Veredicto, Mérito)
src/agents      provider (contrato LLM), deterministic, anthropic, mesa (orquestador NS-ARP S4–S9)
src/services    onboarding (alta y plaza), signals (S0–S3), referrals (puertas humanas), today (Hoy, Mesa, Balanza)
src/db          schema (Drizzle), client (PGlite | Postgres), nscat (NS-CAT), seed-data (NS Cumbre), seed
src/app         hoy · mesa · cesiones/[id] (tarjeta) · indicio/nuevo · indicio/[id] · sala · sala/alta · empresa/[slug]
tests           core.test.ts (funciones puras) · slice.test.ts (recorrido completo sobre PGlite en memoria)
scripts         seed.ts · demo.ts
drizzle         migraciones SQL generadas (pnpm db:generate)
```

Variables: `DATABASE_URL` (Postgres; sin ella, PGlite en `.data/`), `PGLITE_DATA_DIR` (`memory` para efímero), `ANTHROPIC_API_KEY` y `NS_LLM_MODEL` (por defecto `claude-opus-5`), `NS_LLM_PROVIDER=deterministic|anthropic`.

Comandos: `pnpm dev` · `pnpm db:seed` · `pnpm db:reset` · `pnpm demo` (imprime Cesiones y Mesa) · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm db:generate` (tras cambiar el esquema).
