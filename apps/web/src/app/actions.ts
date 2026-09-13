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

export async function setPersona(memberId: string) {
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, memberId, { path: "/", sameSite: "lax" });
  revalidatePath("/", "layout");
}

/** Prepara NS Cumbre con los escenarios de referencia si la base de datos está vacía. */
export async function prepareDemo() {
  const db = await getDb();
  const { companies } = await seedChapter(db);
  const existing = await db.query.referrals.findFirst();
  if (!existing) {
    for (const sc of Object.values(SCENARIOS)) {
      const c = companies[sc.originator];
      const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: sc.rawContent, visibility: "visibility" in sc ? sc.visibility : "CHAPTER", contactName: "contactName" in sc ? sc.contactName : undefined, contactRole: "contactRole" in sc ? sc.contactRole : undefined, legalBasisForContact: "legalBasisForContact" in sc ? sc.legalBasisForContact : undefined });
      await publishSignal(db, created.opportunitySignal.id, c.memberId);
    }
    const pending = await db.query.referrals.findFirst({ where: and(eq(schema.referrals.receiverCompanyId, companies["hispalis"].companyId), eq(schema.referrals.originatorCompanyId, companies["guadalquivir"].companyId), eq(schema.referrals.state, "ORIGINATOR_PENDING")) });
    if (pending) await decide(db, { referralId: pending.id, memberId: companies["guadalquivir"].memberId, decision: "APPROVE" });
  }
  revalidatePath("/", "layout");
}
