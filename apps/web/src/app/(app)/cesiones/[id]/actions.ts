"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { authorizeIntro, confirmValue, decide, markIntroduced, submitVerdict, updateStage } from "@/services/referrals";
import { markEcoRequested } from "@/services/eco";
import type { HumanDecisionKind, RevealScope, VerdictAxis } from "@/core/types";

function done(id: string) {
  revalidatePath(`/cesiones/${id}`);
  revalidatePath("/cesiones");
  revalidatePath("/hoy");
  revalidatePath("/mesa");
}

export async function decideAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  const decision = String(formData.get("decision")) as HumanDecisionKind;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const min = formData.get("promise_min");
  const max = formData.get("promise_max");
  const adjust = min || max ? { estimated_value_min: min ? Number(min) : undefined, estimated_value_max: max ? Number(max) : undefined, note: notes } : undefined;
  await decide(db, { referralId: id, memberId: member.id, decision, notes, promiseAdjustment: adjust });
  done(id);
}

export async function aperturaAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  const scope = String(formData.get("reveal_scope")) as RevealScope;
  await authorizeIntro(db, id, member.id, scope);
  done(id);
}

export async function puenteAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  await markIntroduced(db, id, member.id, String(formData.get("message")), (String(formData.get("channel") ?? "EMAIL_BY_MEMBER") as "EMAIL_BY_MEMBER"));
  done(id);
}

export async function stageAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  await updateStage(db, id, member.id, String(formData.get("stage")) as "MEETING", String(formData.get("notes") ?? "") || undefined);
  done(id);
}

export async function verdictAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  const axis = String(formData.get("recognition_axis") ?? "");
  const reason = String(formData.get("recognition_reason") ?? "").trim();
  await submitVerdict(db, {
    referralId: id,
    memberId: member.id,
    verdict: {
      ease: Number(formData.get("ease")),
      business: Number(formData.get("business")),
      treatment: Number(formData.get("treatment")),
      result: String(formData.get("result")),
      value_verified: formData.get("value_verified") ? Number(formData.get("value_verified")) : undefined,
      need_was_real: formData.get("need_was_real") !== "no",
      notes: String(formData.get("notes") ?? "").trim() || undefined,
    },
    recognition: axis && reason ? { axis: axis as VerdictAxis, reason } : undefined,
  });
  done(id);
}

/** Protocolo IV (D-042): la persona envía la Petición de Eco y lo marca aquí. */
export async function ecoRequestAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  await markEcoRequested(db, id, member.id, String(formData.get("message") ?? ""));
  done(id);
}

export async function confirmValueAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  await confirmValue(db, id, member.id);
  done(id);
}
