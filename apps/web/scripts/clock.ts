/** pnpm clock · ejecuta el Reloj de la Sala (D-030): recordatorios, caducidades, respuestas tardías y check-ins. */
import { getDb, closeDb } from "@/db/client";
import { runClock } from "@/services/clock";

const db = await getDb();
const r = await runClock(db);
console.log(`Reloj: ${r.reminders} recordatorio(s) · ${r.expired} caducada(s) · ${r.late} respuesta(s) tardía(s) · ${r.nudges} check-in(s)`);
await closeDb();
