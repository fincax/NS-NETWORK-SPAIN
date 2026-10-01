"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { authorizeIntro, confirmValue, decide, markContacted, markIntroduced, sendIntroFromNS, submitVerdict, updateStage } from "@/services/referrals";
import { QUICK_QUESTIONS } from "@/core/state-machine";
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
  const raw = String(formData.get("decision"));
  // "Aceptar y preguntar" (D-065) es un APPROVE con pregunta; "Solo preguntar" es REQUEST_INFO. La pregunta sale de la pregunta tipo y/o de la línea libre.
  const decision = (raw === "APPROVE_ASK" ? "APPROVE" : raw) as HumanDecisionKind;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;
  const kind = String(formData.get("question_kind") ?? "");
  const typed = String(formData.get("question_text") ?? "").trim();
  const quick = QUICK_QUESTIONS.find((q) => q.key === kind)?.text;
  const question = [quick, typed].filter(Boolean).join(" ") || undefined;
  if ((raw === "APPROVE_ASK" || raw === "REQUEST_INFO") && !question) throw new Error("Elige una pregunta tipo o escribe la tuya.");
  const min = formData.get("promise_min");
  const max = formData.get("promise_max");
  const adjust = min || max ? { estimated_value_min: min ? Number(min) : undefined, estimated_value_max: max ? Number(max) : undefined, note: notes } : undefined;
  // Apertura en el visto bueno (D-067): el cedente puede dejarla autorizada al proponer.
  const apertura = String(formData.get("apertura") ?? "");
  const revealScope = apertura === "COMPANY_ONLY" || apertura === "COMPANY_AND_CONTACT" ? (apertura as RevealScope) : undefined;
  await decide(db, { referralId: id, memberId: member.id, decision, notes, promiseAdjustment: adjust, question: raw === "APPROVE" ? undefined : question, revealScope });
  done(id);
}

export async function aperturaAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  const scope = String(formData.get("reveal_scope")) as RevealScope;
  const answer = String(formData.get("answer") ?? "").trim() || undefined;
  await authorizeIntro(db, id, member.id, scope, { answer });
  done(id);
}

export async function puenteAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  const channel = String(formData.get("channel") ?? "EMAIL_BY_MEMBER") as "EMAIL_BY_MEMBER" | "NS_MESSAGE" | "MEETING" | "PHONE_BY_MEMBER";
  const message = String(formData.get("message"));
  // Puente desde NS (D-074, F4): lo envía NS en nombre del cedente; si no sale, la persona lo ve y lo envía desde su correo.
  if (channel === "NS_MESSAGE") await sendIntroFromNS(db, id, member.id, message);
  else await markIntroduced(db, id, member.id, message, channel);
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

export async function confirmValueAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  await confirmValue(db, id, member.id);
  done(id);
}

/** Primer contacto en un toque (D-073, F7). */
export async function contactedAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const id = String(formData.get("referralId"));
  await markContacted(db, id, member.id);
  done(id);
}
