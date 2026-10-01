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
import { runLatido } from "@/agents/latido";
import { approveComunicado } from "@/services/comunicados";
import { acceptedMove, dismissMove, type MoveAction } from "@/services/brujula";
import { mesaMode, runJobs } from "@/services/jobs";
import { after } from "next/server";
import { redirect } from "next/navigation";

/** Brújula (D-071): un Movimiento se ejecuta o se descarta con un toque. */
export async function moveAction(formData: FormData) {
  const { member, company, chapter } = await requireMember();
  const db = await getDb();
  const key = String(formData.get("key") ?? "");
  const action = JSON.parse(String(formData.get("action") ?? "{}")) as MoveAction;
  if (String(formData.get("do")) === "dismiss") {
    await dismissMove(db, { chapterId: chapter.id, companyId: company.id, memberId: member.id, key, reason: "No procede" });
    revalidatePath("/hoy");
    return;
  }
  let next = "/hoy";
  switch (action.type) {
    case "PUBLISH_SIGNAL": {
      const res = await publishSignal(db, action.signalId, member.id, { mode: mesaMode() });
      if ("queued" in res) after(() => runJobs(db, { chapterId: chapter.id, max: 3 }));
      next = "/mesa";
      break;
    }
    case "ACCEPT_REFERRAL":
      await decide(db, { referralId: action.referralId, memberId: member.id, decision: "APPROVE" });
      next = `/cesiones/${action.referralId}`;
      break;
    case "PROPOSE_REFERRAL":
      await decide(db, { referralId: action.referralId, memberId: member.id, decision: "APPROVE", revealScope: "COMPANY_ONLY" });
      next = `/cesiones/${action.referralId}`;
      break;
    case "APPROVE_COMUNICADO":
      await approveComunicado(db, { comunicadoId: action.comunicadoId, memberId: member.id });
      break;
    case "LINK":
      next = action.href;
      break;
  }
  await acceptedMove(db, { chapterId: chapter.id, companyId: company.id, key });
  revalidatePath("/", "layout");
  redirect(next);
}

/** Protocolo II (D-070): el Timonel aprueba su Comunicado con un toque, con una línea opcional. */
export async function approveComunicadoAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  await approveComunicado(db, { comunicadoId: String(formData.get("comunicadoId")), memberId: member.id, note: String(formData.get("note") ?? "").trim() || undefined });
  revalidatePath("/hoy");
  revalidatePath("/gaceta");
}

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
      const created = await createSignal(db, { companyId: c.companyId, memberId: c.memberId, rawContent: sc.rawContent, visibility: "visibility" in sc ? sc.visibility : "CHAPTER", contactName: "contactName" in sc ? sc.contactName : undefined, contactRole: "contactRole" in sc ? sc.contactRole : undefined, legalBasisForContact: "legalBasisForContact" in sc ? sc.legalBasisForContact : undefined, thirdPartyExpectsContact: "thirdPartyExpectsContact" in sc ? sc.thirdPartyExpectsContact : false });
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

/** Rastreo público a demanda (D-031). En producción lo lanza el Reloj de la Sala cada mañana. */
export async function runRastreoAction() {
  const { company } = await requireMember();
  const db = await getDb();
  await runRastreo(db, company.id);
  revalidatePath("/hoy");
  revalidatePath("/mesa");
}
