"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { MEMBER_COOKIE } from "@/lib/session";
import { getDb } from "@/db/client";
import { seedChapter, SCENARIOS } from "@/db/seed";
import { createSignal, publishSignal } from "@/services/signals";
import { decide } from "@/services/referrals";
import { and, eq } from "drizzle-orm";
import { schema } from "@/db/client";
import { requireDemo, requireMember } from "@/lib/session";
import { runRastreo } from "@/agents/rastreo";
import { defaultPublicFeed } from "@/agents/feeds-public";
import { runOwnSources } from "@/services/sources";
import { runLatido } from "@/agents/latido";

export async function setPersona(memberId: string) {
  await requireDemo();
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, memberId, { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}

/** Prepara NS Cumbre con los escenarios de referencia si la base de datos está vacía. */
export async function prepareDemo() {
  await requireDemo();
  const db = await getDb();
  const { companies } = await seedChapter(db);
  const existing = await db.query.referrals.findFirst();
  if (!existing) {
    for (const sc of Object.values(SCENARIOS)) {
      const c = companies[sc.originator];
      const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: sc.rawContent, visibility: "visibility" in sc ? sc.visibility : "CHAPTER", contactName: "contactName" in sc ? sc.contactName : undefined, contactRole: "contactRole" in sc ? sc.contactRole : undefined, legalBasisForContact: "legalBasisForContact" in sc ? sc.legalBasisForContact : undefined, thirdPartyExpectsContact: "thirdPartyExpectsContact" in sc ? sc.thirdPartyExpectsContact : false, interesadoKind: "interesadoKind" in sc ? sc.interesadoKind : undefined, thirdPartyName: "thirdPartyName" in sc ? sc.thirdPartyName : undefined });
      await publishSignal(db, created.opportunitySignal.id, c.memberId);
    }
    const pending = await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, companies["hispalis"].companyId), eq(schema.referrals.originatorCompanyId, companies["guadalquivir"].companyId), eq(schema.referrals.state, "ORIGINATOR_PENDING")) });
    if (pending) await decide(db, { referralId: pending.id, memberId: companies["guadalquivir"].memberId, decision: "APPROVE" });
    await runRastreo(db, companies["hispalis"].companyId);
  }
  revalidatePath("/", "layout");
}

/** Latido a demanda (D-057): un Indicio ficticio más en la Mesa y las Cesiones ficticias vencidas avanzan. Solo demo. */
export async function runLatidoAction() {
  await requireMember();
  const db = await getDb();
  await runLatido(db, { force: true });
  revalidatePath("/hoy");
  revalidatePath("/mesa");
  revalidatePath("/sala");
}

/**
 * Rastreo a demanda (D-031): lo mismo que hace la Ronda cada mañana para esta empresa, sin esperar a mañana.
 * Lee las fuentes públicas que marque NS_PUBLIC_FEEDS (reales en el servidor, lote de muestra en la demo) y las
 * fuentes propias del Agente (D-038).
 */
export async function runRastreoAction() {
  const { company } = await requireMember();
  const db = await getDb();
  await runRastreo(db, company.id, defaultPublicFeed());
  await runOwnSources(db, company.id);
  revalidatePath("/hoy");
  revalidatePath("/mesa");
}
