/**
 * Correos de acceso (D-060): la invitación de un Timonel nuevo y la recuperación de contraseña.
 * El enlace es el mismo de D-054 (/invitacion/[token], un solo uso; siete días, o 24 horas si es recuperación); aquí se envía y se registra.
 */
import { and, eq, gt } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { createInvite, INVITE_TTL_DAYS } from "@/lib/accounts";
import { mailEnabled, sendMail, type MailResult } from "@/lib/mail";

/** Recuperaciones por persona y hora: evita que alguien llene el buzón de un Timonel pidiendo enlaces. */
export const RECOVERY_LIMIT_PER_HOUR = 3;
/** El enlace de recuperación dura menos que una invitación: quien lo pide lo usa en el momento. */
export const RECOVERY_TTL_HOURS = 24;

type Member = typeof schema.members.$inferSelect;

export function publicUrl(): string {
  return (process.env.NS_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function accessLink(token: string): string {
  return `${publicUrl()}/invitacion/${token}`;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(paragraphs: string[], link: string, button: string, footer: string): string {
  const p = paragraphs.map((t) => `<p style="margin:0 0 16px">${escape(t)}</p>`).join("");
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f6f4ef;font-family:Georgia,'Times New Roman',serif;color:#16181d">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="margin:0 0 24px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#1f3a5f">NS Network</p>
<div style="font-size:16px;line-height:1.55">${p}</div>
<p style="margin:24px 0"><a href="${escape(link)}" style="display:inline-block;background:#1f3a5f;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-family:Arial,sans-serif;font-size:15px">${escape(button)}</a></p>
<p style="margin:0 0 24px;font-family:Arial,sans-serif;font-size:12px;color:#5b6070;word-break:break-all">Si el botón no funciona, copia este enlace en el navegador:<br>${escape(link)}</p>
<p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#5b6070">${escape(footer)}</p>
</div></body></html>`;
}

export function inviteMail(member: Pick<Member, "fullName" | "email">, link: string, chapterName: string, byName: string) {
  const first = member.fullName.split(" ")[0];
  const lines = [
    `Hola, ${first}:`,
    `${byName}, de la Directiva de ${chapterName}, te ha dado acceso a NS Network como Timonel de tu empresa.`,
    `Abre el enlace, elige tu contraseña y entra. Tu Agente te hará después unas preguntas para conocer bien tu negocio: de eso depende la calidad de lo que la Sala encuentre para ti.`,
    `El enlace es personal, de un solo uso y caduca en ${INVITE_TTL_DAYS} días. Tu correo de acceso será ${member.email}.`,
  ];
  const footer = "Si no esperabas este correo, ignóralo: sin abrir el enlace no se crea ningún acceso.";
  return {
    to: member.email,
    subject: `Tu acceso a ${chapterName} · NS Network`,
    text: `${lines.join("\n\n")}\n\n${link}\n\n${footer}\n\nNS Network`,
    html: layout(lines, link, "Activar mi acceso", footer),
  };
}

export function recoveryMail(member: Pick<Member, "fullName" | "email">, link: string) {
  const first = member.fullName.split(" ")[0];
  const lines = [
    `Hola, ${first}:`,
    "Hemos recibido una petición para cambiar tu contraseña de NS Network.",
    `Abre el enlace y elige una nueva. Al hacerlo se cerrarán tus demás sesiones abiertas. El enlace es de un solo uso y caduca en ${RECOVERY_TTL_HOURS} horas.`,
  ];
  const footer = "Si no lo has pedido tú, ignora este correo: tu contraseña actual sigue valiendo.";
  return {
    to: member.email,
    subject: "Cambiar tu contraseña · NS Network",
    text: `${lines.join("\n\n")}\n\n${link}\n\n${footer}\n\nNS Network`,
    html: layout(lines, link, "Elegir una contraseña nueva", footer),
  };
}

async function logMail(db: Db, member: Member, what: string, r: MailResult, actorId: string) {
  await audit(db, {
    chapterId: member.chapterId,
    kind: r.ok ? "MAIL_SENT" : "MAIL_FAILED",
    actor: { type: actorId === "system" ? "SYSTEM" : "USER", id: actorId },
    subject: { type: "Member", id: member.id },
    result: r.ok ? `${what} enviado a ${member.email}.` : `${what} no se pudo enviar a ${member.email}: ${r.error}`,
    significant: false,
    companyIds: [member.companyId],
  });
}

/**
 * La Directiva invita a un Timonel: crea el enlace y lo envía por correo.
 * Devuelve el token solo si el correo no salió (o no hay correo configurado), para mostrárselo a la Directiva como hasta ahora.
 */
export async function inviteByMail(db: Db, opts: { memberId: string; createdBy: string }): Promise<{ sent: true; email: string } | { sent: false; token: string; error?: string }> {
  const { token, member } = await createInvite(db, opts);
  if (!mailEnabled()) return { sent: false, token };
  const by = await db.query.members.findFirst({ where: eq(schema.members.id, opts.createdBy) });
  const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.id, member.chapterId) });
  const r = await sendMail(inviteMail(member, accessLink(token), chapter?.name ?? "tu Sala", by?.fullName ?? "La Directiva"));
  await logMail(db, member, "Enlace de acceso", r, opts.createdBy);
  return r.ok ? { sent: true, email: member.email } : { sent: false, token, error: r.error };
}

/**
 * "He olvidado mi contraseña". No revela si el correo existe: quien llama muestra siempre el mismo mensaje.
 * Solo envía si hay correo configurado, la persona existe, su empresa no está de baja y no ha superado el límite por hora.
 */
export async function requestPasswordRecovery(db: Db, email: string): Promise<void> {
  if (!mailEnabled()) return;
  const member = await db.query.members.findFirst({ where: eq(schema.members.email, email.trim().toLowerCase()) });
  if (!member) return;
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, member.companyId) });
  if (!company || company.status === "RELEASED" || company.status === "SUSPENDED") return;
  const recent = await db.query.invites.findMany({ where: and(eq(schema.invites.memberId, member.id), eq(schema.invites.createdByMemberId, member.id), gt(schema.invites.createdAt, new Date(Date.now() - 3_600_000))), columns: { id: true } });
  if (recent.length >= RECOVERY_LIMIT_PER_HOUR) {
    await audit(db, { chapterId: member.chapterId, kind: "RECOVERY_THROTTLED", actor: { type: "SYSTEM", id: "system" }, subject: { type: "Member", id: member.id }, result: `Recuperación de contraseña para ${member.email} no enviada: más de ${RECOVERY_LIMIT_PER_HOUR} en una hora.`, significant: false, companyIds: [member.companyId] });
    return;
  }
  const { token } = await createInvite(db, { memberId: member.id, createdBy: member.id, ttlHours: RECOVERY_TTL_HOURS });
  const r = await sendMail(recoveryMail(member, accessLink(token)));
  await logMail(db, member, "Enlace para cambiar la contraseña", r, "system");
}
