/** pnpm db:seed · crea NS Cumbre y ejecuta los escenarios A, C y D dejando las Cesiones pendientes de visto bueno. */
import { getDb, closeDb } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { decide } from "@/services/referrals";
import { eq, and } from "drizzle-orm";
import { schema } from "@/db/client";

const db = await getDb();
const { chapter, companies } = await seedChapter(db);
console.log(`Sala ${chapter.name} lista con ${Object.keys(companies).length} titulares.`);

for (const [key, sc] of Object.entries(SCENARIOS)) {
  const c = companies[sc.originator];
  const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: sc.rawContent, visibility: "visibility" in sc ? sc.visibility : "CHAPTER", contactName: "contactName" in sc ? sc.contactName : undefined, contactRole: "contactRole" in sc ? sc.contactRole : undefined, legalBasisForContact: "legalBasisForContact" in sc ? sc.legalBasisForContact : undefined });
  const res = await publishSignal(db, created.opportunitySignal.id, c.memberId);
  console.log(`Escenario ${key} (${created.provider}): ${created.needs.length} necesidades · ${res.referralIds.length} Cesión(es) · ${res.discarded.length} descarte(s) · sin titular: ${res.uncovered.join(", ") || "ninguna"}`);
  for (const d of res.discarded) console.log(`   descartada ${d.company}: ${d.code} · ${d.reason}`);
}
// El cedente (Lucía) ya ha dado el visto bueno a la Cesión con Híspalis: Carlos la encuentra en su cara A.
const hispalis = companies["hispalis"];
const guadalquivir = companies["guadalquivir"];
const pendingToHispalis = await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, hispalis.companyId), eq(schema.referrals.originatorCompanyId, guadalquivir.companyId), eq(schema.referrals.state, "ORIGINATOR_PENDING")) });
if (pendingToHispalis) {
  await decide(db, { referralId: pendingToHispalis.id, memberId: guadalquivir.memberId, decision: "APPROVE" });
  console.log("Visto bueno del cedente dado a la Cesión Guadalquivir → Híspalis: esperando a Carlos.");
}
await closeDb();
