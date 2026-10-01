/**
 * Avisos con acción en un toque (D-067, F1). Cuando una Cesión pasa a la mesa de un Timonel, su Agente le escribe un correo
 * con el botón de la decisión evidente dentro: "Proponer", "Aceptar", "Autorizar la Apertura", "Responder". El enlace es
 * personal, de un solo uso, caduca en 72 h y está ligado a esa Cesión y a esa acción. Al pulsarlo, la persona ve la tarjeta
 * preparada y confirma con un toque; la puerta humana sigue siendo humana.
 *
 * Solo en modo real (NS_AUTH_MODE=real) y con correo configurado: la demo tiene personas ficticias con correos ficticios.
 * Nunca lanza: un correo que no sale se registra y el protocolo sigue.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { authMode } from "@/lib/auth";
import { mailEnabled, sendMail } from "@/lib/mail";
import { publicUrl } from "@/services/correo";
import { TIMEOUTS } from "@/core/state-machine";
import { eurRange } from "@/lib/format";

export type LinkAction = "PROPOSE" | "ACCEPT" | "OPEN" | "ANSWER" | "CONTACTED" | "VIEW";
export const ACTION_LINK_TTL_HOURS = 72;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function avisosEnabled(): boolean {
  return authMode() === "real" && mailEnabled();
}

/** Crea un enlace de acción para una persona, una Cesión y una acción. Devuelve la URL completa. */
export async function createActionLink(db: Db, opts: { memberId: string; referralId: string; action: LinkAction }): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.actionLinks).values({ memberId: opts.memberId, referralId: opts.referralId, action: opts.action, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ACTION_LINK_TTL_HOURS * 3_600_000) });
  return `${publicUrl()}/accion/${token}`;
}

/** Enlace vigente (sin usar, sin caducar) o null. */
export async function actionLinkFromToken(db: Db, token: string) {
  if (!token) return null;
  return (await db.query.actionLinks.findFirst({ where: and(eq(schema.actionLinks.tokenHash, sha256(token)), isNull(schema.actionLinks.usedAt), gt(schema.actionLinks.expiresAt, new Date())) })) ?? null;
}

export async function markActionLinkUsed(db: Db, id: string) {
  await db.update(schema.actionLinks).set({ usedAt: new Date() }).where(eq(schema.actionLinks.id, id));
}

function layout(paragraphs: string[], link: string, button: string, footer: string): string {
  const p = paragraphs.map((t) => `<p style="margin:0 0 16px">${escape(t)}</p>`).join("");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;color:#16181d">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="margin:0 0 24px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#1f3a5f">NS Network · tu Agente</p>
<div style="font-size:16px;line-height:1.55">${p}</div>
<p style="margin:24px 0"><a href="${escape(link)}" style="display:inline-block;background:#b7791f;color:#ffffff;text-decoration:none;padding:14px 22px;border-radius:6px;font-family:Arial,sans-serif;font-size:16px">${escape(button)}</a></p>
<p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:12px;color:#5b6070;word-break:break-all">Si el botón no funciona, copia este enlace en el navegador:<br>${escape(link)}</p>
<p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5b6070">${escape(footer)}</p>
</div></body></html>`;
}

export type AvisoEvent = "REVIEW_ORIGINATOR" | "REVIEW_RECEIVER" | "ACCEPTED" | "INTRO_READY" | "INTRODUCED" | "QUESTION";

interface AvisoSpec {
  to: "ORIGINATOR" | "RECEIVER";
  action: LinkAction;
  subject: (c: Ctx) => string;
  lines: (c: Ctx) => string[];
  button: (c: Ctx) => string;
}

interface Ctx {
  first: string;
  other: string;
  otherPerson: string;
  value: string;
  fit: string;
  need: string;
  question?: string;
}

const footer = `El enlace es personal, de un solo uso y caduca en ${ACTION_LINK_TTL_HOURS} h. Si no quieres decidir desde el correo, entra en NS Network y verás la misma Cesión en Hoy.`;

const SPECS: Record<AvisoEvent, AvisoSpec> = {
  REVIEW_ORIGINATOR: {
    to: "ORIGINATOR",
    action: "PROPOSE",
    subject: (c) => `Tu Agente ha preparado una Cesión para ${c.other} · NS Network`,
    lines: (c) => [`Hola, ${c.first}:`, `De tu Indicio "${c.need}", tu Agente ha preparado una Cesión para ${c.other} (${c.otherPerson}): encaje del ${c.fit}, valor estimado ${c.value}.`, `Si das el visto bueno, ${c.otherPerson} verá el contexto sin identidad y decidirá. Puedes dejar ya autorizada la Apertura para que, si acepta, el Puente quede redactado al momento.`],
    button: () => "Proponer la Cesión",
  },
  REVIEW_RECEIVER: {
    to: "RECEIVER",
    action: "ACCEPT",
    subject: (c) => `Cesión de ${c.other} · ${c.fit} · ${c.value} · NS Network`,
    lines: (c) => [`Hola, ${c.first}:`, `${c.otherPerson} (${c.other}) te cede un referido: "${c.need}". Encaje del ${c.fit}, valor estimado ${c.value}.`, `Acepta con un toque y ${c.otherPerson} abrirá la identidad del Interesado. Si tienes una duda, puedes aceptar y preguntar a la vez: nada espera.`],
    button: () => "Aceptar la Cesión",
  },
  ACCEPTED: {
    to: "ORIGINATOR",
    action: "OPEN",
    subject: (c) => `${c.other} ha aceptado tu Cesión · autoriza la Apertura · NS Network`,
    lines: (c) => [`Hola, ${c.first}:`, `${c.otherPerson} (${c.other}) ha aceptado la Cesión "${c.need}" y confirmado la Promesa. Ya has ganado tu Mérito de Promesa.`, `Autoriza la Apertura con un toque: tu Agente redactará el Puente y solo te quedará enviarlo.`],
    button: () => "Autorizar la Apertura",
  },
  INTRO_READY: {
    to: "ORIGINATOR",
    action: "VIEW",
    subject: (c) => `Puente listo para ${c.other} · envíalo hoy · NS Network`,
    lines: (c) => [`Hola, ${c.first}:`, `Tu Agente ha redactado el Puente para presentar a ${c.otherPerson} (${c.other}) al Interesado de "${c.need}".`, `Revísalo, envíalo desde tu correo y márcalo como tendido. Cuanto antes, mejor: el valor de un referido cae con las horas.`],
    button: () => "Ver y enviar el Puente",
  },
  INTRODUCED: {
    to: "RECEIVER",
    action: "CONTACTED",
    subject: () => `Puente tendido: contacta en ${TIMEOUTS.responseAfterIntroHours} h · NS Network`,
    lines: (c) => [`Hola, ${c.first}:`, `${c.otherPerson} (${c.other}) ha tendido el Puente: el Interesado de "${c.need}" ya sabe que le vas a llamar.`, `Tu compromiso es responderle en ${TIMEOUTS.responseAfterIntroHours} h. Cuando lo hayas hecho, pulsa el botón: un toque y queda anotado.`],
    button: () => "He contactado",
  },
  QUESTION: {
    to: "ORIGINATOR",
    action: "ANSWER",
    subject: (c) => `${c.otherPerson} te pregunta · responde en ${TIMEOUTS.questionAnswerHours} h · NS Network`,
    lines: (c) => [`Hola, ${c.first}:`, `${c.otherPerson} (${c.other}) pregunta sobre la Cesión "${c.need}": «${c.question ?? ""}».`, `Tu Agente te deja un borrador. Sí, no o una línea bastan. La Cesión no espera a tu respuesta, pero ${c.otherPerson} la agradecerá.`],
    button: () => "Responder",
  },
};

type Referral = typeof schema.referrals.$inferSelect;

/**
 * Envía el aviso de un evento de la Cesión al Timonel que debe actuar. Nunca lanza.
 * Devuelve true si salió un correo.
 */
export async function notifyReferral(db: Db, ref: Referral, event: AvisoEvent, extra: { question?: string } = {}): Promise<boolean> {
  if (!avisosEnabled()) return false;
  try {
    const spec = SPECS[event];
    const toCompanyId = spec.to === "ORIGINATOR" ? ref.originatorCompanyId : ref.receiverCompanyId;
    const otherCompanyId = spec.to === "ORIGINATOR" ? ref.receiverCompanyId : ref.originatorCompanyId;
    const member = (await db.query.members.findFirst({ where: and(eq(schema.members.companyId, toCompanyId), eq(schema.members.isPrimary, true)) })) ?? (await db.query.members.findFirst({ where: eq(schema.members.companyId, toCompanyId) }));
    if (!member?.email) return false;
    const other = await db.query.companies.findFirst({ where: eq(schema.companies.id, otherCompanyId) });
    const otherPerson = (await db.query.members.findFirst({ where: and(eq(schema.members.companyId, otherCompanyId), eq(schema.members.isPrimary, true)) })) ?? (await db.query.members.findFirst({ where: eq(schema.members.companyId, otherCompanyId) }));
    const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, ref.matchId) });
    const need = await db.query.needs.findFirst({ where: eq(schema.needs.id, ref.needId) });
    const ctx: Ctx = {
      first: member.fullName.split(" ")[0],
      other: other?.name ?? "otra empresa de la Sala",
      otherPerson: otherPerson?.fullName.split(" ")[0] ?? "su Timonel",
      value: eurRange(ref.valuePotentialMin, ref.valuePotentialMax),
      fit: match ? `${Math.round(match.score.total * 100)} %` : "",
      need: need?.description ?? "una necesidad detectada",
      question: extra.question,
    };
    const link = await createActionLink(db, { memberId: member.id, referralId: ref.id, action: spec.action });
    const lines = spec.lines(ctx);
    const r = await sendMail({ to: member.email, subject: spec.subject(ctx), text: `${lines.join("\n\n")}\n\n${link}\n\n${footer}\n\nNS Network`, html: layout(lines, link, spec.button(ctx), footer) });
    await audit(db, { chapterId: ref.chapterId, kind: r.ok ? "MAIL_SENT" : "MAIL_FAILED", actor: { type: "AGENT", id: "avisos" }, subject: { type: "Referral", id: ref.id }, policyApplied: `aviso.${event.toLowerCase()}`, result: r.ok ? `Aviso "${spec.button(ctx)}" enviado a ${member.email}.` : `Aviso a ${member.email} no enviado: ${r.error}`, significant: false, companyIds: [toCompanyId] });
    return r.ok;
  } catch {
    return false;
  }
}
