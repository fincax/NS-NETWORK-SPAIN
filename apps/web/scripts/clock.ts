/** pnpm clock · ejecuta la Ronda (D-036): Reloj de la Sala + Rastreo para todas las Salas. */
import { getDb, closeDb } from "@/db/client";
import { runRonda } from "@/services/ronda";

const db = await getDb();
const r = await runRonda(db);
for (const c of r.chapters) {
  console.log(`${c.chapterName} · Reloj: ${c.clock.reminders} recordatorio(s) · ${c.clock.expired} caducada(s) · ${c.clock.late} respuesta(s) tardía(s) · ${c.clock.nudges} check-in(s) · Compromiso: ${c.clock.compromiso.evaluated} evaluado(s), ${c.clock.compromiso.notices} aviso(s), ${c.clock.compromiso.releases} baja(s) · Rastreo: ${c.rastreo.agents} Agentes, ${c.rastreo.drafts} Indicio(s) en borrador`);
}
await closeDb();
