/** pnpm db:seed · crea NS Cumbre y ejecuta los escenarios A, C y D dejando las Cesiones pendientes de visto bueno. */
import { getDb, closeDb } from "@/db/client";
import { seedChapter, seedClosedCesionWithEco, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { decide } from "@/services/referrals";
import { runRastreo } from "@/agents/rastreo";
import { createDemand } from "@/services/demands";
import { eq, and } from "drizzle-orm";
import { schema } from "@/db/client";

const db = await getDb();
const { chapter, companies } = await seedChapter(db);
console.log(`Sala ${chapter.name} lista con ${Object.keys(companies).length} titulares.`);

for (const [key, sc] of Object.entries(SCENARIOS)) {
  const c = companies[sc.originator];
  const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: sc.rawContent, visibility: "visibility" in sc ? sc.visibility : "CHAPTER", contactName: "contactName" in sc ? sc.contactName : undefined, contactRole: "contactRole" in sc ? sc.contactRole : undefined, legalBasisForContact: "legalBasisForContact" in sc ? sc.legalBasisForContact : undefined, thirdPartyExpectsContact: "thirdPartyExpectsContact" in sc ? sc.thirdPartyExpectsContact : false });
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
// Protocolo IV (D-042): una Cesión cerrada con Veredicto, valor contrastado y Eco público del Interesado.
const closed = await seedClosedCesionWithEco(db, companies);
if (closed) console.log("Cesión Guadalquivir → PRL Andaluza cerrada con Eco público: el Dossier de PRL Andaluza muestra su Aval.");
// Encargo de Talento Sur y Rastreo del Agente de Híspalis (D-031, D-032)
await createDemand(db, { companyId: companies["talento-sur"].companyId, memberId: companies["talento-sur"].memberId, text: "Busco empresas industriales que contraten más de 20 personas en el área de Sevilla en los próximos 6 meses", trigger: "HEADCOUNT_GROWTH" });
const rastreo = await runRastreo(db, hispalis.companyId);
console.log(`Rastreo del Agente de Híspalis: ${rastreo.ingested.length} Indicio(s) en borrador para Carlos.`);
await closeDb();
