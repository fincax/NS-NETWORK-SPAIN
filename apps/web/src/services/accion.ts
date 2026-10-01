/**
 * Enlace de acción (D-067): qué muestra y qué ejecuta. El token identifica a la persona, la Cesión y la acción; un solo uso.
 * La acción solo procede si la Cesión sigue en el estado que la espera; si no, el enlace vale igualmente para entrar y ver la tarjeta.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { actionLinkFromToken, markActionLinkUsed, type LinkAction } from "@/services/avisos";
import { authorizeIntro, decide, infoRound, markContacted } from "@/services/referrals";
import type { ReferralState, RevealScope } from "@/core/types";

const EXPECTED: Record<LinkAction, ReferralState[] | null> = {
  PROPOSE: ["ORIGINATOR_PENDING"],
  ACCEPT: ["RECEIVER_PENDING"],
  OPEN: ["APPROVED"],
  ANSWER: null, // mientras haya una pregunta pendiente
  CONTACTED: ["INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY"],
  VIEW: null,
};

export const ACTION_LABEL: Record<LinkAction, string> = {
  PROPOSE: "Proponer la Cesión",
  ACCEPT: "Aceptar y confirmar la Promesa",
  OPEN: "Autorizar la Apertura",
  ANSWER: "Enviar la respuesta",
  CONTACTED: "He contactado al Interesado",
  VIEW: "Ver la Cesión",
};

export interface ActionContext {
  link: typeof schema.actionLinks.$inferSelect;
  member: typeof schema.members.$inferSelect;
  referral: typeof schema.referrals.$inferSelect;
  match: typeof schema.matchCandidates.$inferSelect | undefined;
  other: typeof schema.companies.$inferSelect | undefined;
  otherPerson: typeof schema.members.$inferSelect | undefined;
  /** La acción del enlace todavía procede en el estado actual de la Cesión. */
  applies: boolean;
  draftAnswer?: string;
  question?: string;
  hasContact: boolean;
  blockedContact: boolean;
}

export async function actionContext(db: Db, token: string): Promise<ActionContext | null> {
  const link = await actionLinkFromToken(db, token);
  if (!link) return null;
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, link.memberId) });
  const referral = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, link.referralId) });
  if (!member || !referral) return null;
  const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, referral.matchId) });
  const iAmOriginator = member.companyId === referral.originatorCompanyId;
  const otherId = iAmOriginator ? referral.receiverCompanyId : referral.originatorCompanyId;
  const other = await db.query.companies.findFirst({ where: eq(schema.companies.id, otherId) });
  const otherPerson = await db.query.members.findFirst({ where: and(eq(schema.members.companyId, otherId), eq(schema.members.isPrimary, true)) });
  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, referral.opportunitySignalId) });
  const hasContact = Boolean(os?.envelope.identity_layer?.contact_person);
  const blockedContact = match?.compliance?.blocked_fields.includes("identity_layer.contact_person") ?? false;
  const action = link.action as LinkAction;
  let applies = EXPECTED[action] ? EXPECTED[action]!.includes(referral.state as ReferralState) : action === "VIEW";
  if (action === "CONTACTED" && referral.contactedAt) applies = false;
  let draftAnswer: string | undefined;
  let question: string | undefined;
  if (action === "ANSWER") {
    const round = await infoRound(db, referral);
    applies = Boolean(round.pending);
    draftAnswer = round.pending?.draft_answer;
    question = round.pending?.question;
  }
  return { link, member, referral, match, other, otherPerson, applies, draftAnswer, question, hasContact, blockedContact };
}

/** Ejecuta la acción del enlace con la persona a la que pertenece. Marca el enlace como usado haya o no acción que ejecutar. */
export async function executeAction(db: Db, token: string, input: { answer?: string; revealScope?: RevealScope } = {}): Promise<{ referralId: string; memberId: string; done: boolean }> {
  const ctx = await actionContext(db, token);
  if (!ctx) throw new Error("Este enlace ya no sirve.");
  await markActionLinkUsed(db, ctx.link.id);
  const action = ctx.link.action as LinkAction;
  if (!ctx.applies) return { referralId: ctx.referral.id, memberId: ctx.member.id, done: false };
  const scope: RevealScope = input.revealScope ?? (ctx.hasContact && !ctx.blockedContact ? "COMPANY_AND_CONTACT" : "COMPANY_ONLY");
  switch (action) {
    case "PROPOSE":
      await decide(db, { referralId: ctx.referral.id, memberId: ctx.member.id, decision: "APPROVE", revealScope: scope });
      break;
    case "ACCEPT":
      await decide(db, { referralId: ctx.referral.id, memberId: ctx.member.id, decision: "APPROVE" });
      break;
    case "OPEN":
      await authorizeIntro(db, ctx.referral.id, ctx.member.id, scope);
      break;
    case "ANSWER":
      if (!input.answer?.trim()) throw new Error("Escribe la respuesta.");
      await decide(db, { referralId: ctx.referral.id, memberId: ctx.member.id, decision: "ANSWER", notes: input.answer.trim() });
      break;
    case "CONTACTED":
      await markContacted(db, ctx.referral.id, ctx.member.id);
      break;
    case "VIEW":
      break;
  }
  return { referralId: ctx.referral.id, memberId: ctx.member.id, done: action !== "VIEW" };
}
