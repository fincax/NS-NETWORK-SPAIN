/** pnpm demo · imprime el estado de la Mesa de NS Cumbre: Cesiones con Encaje y la cronología. */
import { desc } from "drizzle-orm";
import { getDb, closeDb, schema } from "@/db/client";

const db = await getDb();
const refs = await db.query.referrals.findMany({ orderBy: [desc(schema.referrals.createdAt)] });
const companies = new Map((await db.query.companies.findMany()).map((c) => [c.id, c.name]));
console.log("── Cesiones");
for (const r of refs) {
  const m = await db.query.matchCandidates.findFirst({ where: (t, { eq }) => eq(t.id, r.matchId) });
  console.log(`${companies.get(r.originatorCompanyId)} → ${companies.get(r.receiverCompanyId)} · ${r.state} · Encaje ${(Number(m?.score.total ?? 0) * 100).toFixed(0)} % (${m?.score.band}) · Promesa ${r.promise?.merit_promise} · Salvoconducto ${m?.compliance?.verdict}`);
  for (const w of m?.explanation.why ?? []) console.log(`    + ${w}`);
  for (const u of m?.explanation.unknowns ?? []) console.log(`    - ${u}`);
}
console.log("── Mesa Permanente (últimos 25 eventos significativos)");
const ev = await db.query.auditEvents.findMany({ where: (t, { eq }) => eq(t.significant, true), orderBy: [desc(schema.auditEvents.occurredAt)], limit: 25 });
for (const e of ev.reverse()) console.log(`${e.occurredAt.toISOString().slice(11, 19)}  ${e.kind.padEnd(22)} ${e.result}${e.companyIds.length ? "  [privado]" : ""}`);
await closeDb();
