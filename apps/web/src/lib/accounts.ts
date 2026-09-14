/**
 * Cuentas de acceso (D-042): contraseña por Timonel, sesiones personales e invitaciones.
 *
 * - Contraseñas con scrypt (Node crypto) y sal por cuenta. Nunca se guarda la contraseña.
 * - Sesiones: token aleatorio en la cookie, en base de datos solo su hash. Caducan a los 30 días y se pueden cerrar una a una.
 * - Invitaciones: enlace de un solo uso, 7 días, para fijar la primera contraseña o recuperarla. Lo genera la Directiva
 *   (o NS); el envío por correo llega después. Mientras tanto, el enlace se muestra a quien lo genera.
 * Cada acceso, fallo, cierre e invitación queda en el audit log: es el registro de accesos.
 */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";

const scrypt = promisify(scryptCb) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export const SESSION_TTL_DAYS = 30;
export const INVITE_TTL_DAYS = 7;
export const MIN_PASSWORD_LENGTH = 10;

export class AccountError extends Error {}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) throw new AccountError(`La contraseña tiene al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hex] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hex) return false;
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");
const days = (n: number) => new Date(Date.now() + n * 86_400_000);

export async function setPassword(db: Db, memberId: string, password: string) {
  const passwordHash = await hashPassword(password);
  const existing = await db.query.credentials.findFirst({ where: eq(schema.credentials.memberId, memberId) });
  if (existing) await db.update(schema.credentials).set({ passwordHash, updatedAt: new Date() }).where(eq(schema.credentials.memberId, memberId));
  else await db.insert(schema.credentials).values({ memberId, passwordHash });
}

export async function hasPassword(db: Db, memberId: string) {
  return !!(await db.query.credentials.findFirst({ where: eq(schema.credentials.memberId, memberId) }));
}

/** Crea una sesión y devuelve el token en claro (va a la cookie; en la base de datos solo su hash). */
export async function createSession(db: Db, memberId: string, userAgent?: string) {
  const token = newToken();
  const [row] = await db.insert(schema.sessions).values({ memberId, tokenHash: sha256(token), expiresAt: days(SESSION_TTL_DAYS), userAgent: userAgent?.slice(0, 200) }).returning();
  return { token, session: row };
}

/** El Timonel de la sesión, o null si no existe, caducó o se cerró. Actualiza "visto por última vez" como mucho cada 10 minutos. */
export async function memberFromSessionToken(db: Db, token: string | undefined) {
  if (!token) return null;
  const s = await db.query.sessions.findFirst({ where: and(eq(schema.sessions.tokenHash, sha256(token)), isNull(schema.sessions.revokedAt), gt(schema.sessions.expiresAt, new Date())) });
  if (!s) return null;
  if (Date.now() - s.lastSeenAt.getTime() > 10 * 60_000) await db.update(schema.sessions).set({ lastSeenAt: new Date() }).where(eq(schema.sessions.id, s.id));
  return (await db.query.members.findFirst({ where: eq(schema.members.id, s.memberId) })) ?? null;
}

export async function sessionIdFromToken(db: Db, token: string | undefined) {
  if (!token) return null;
  const s = await db.query.sessions.findFirst({ where: eq(schema.sessions.tokenHash, sha256(token)) });
  return s?.id ?? null;
}

export async function login(db: Db, email: string, password: string, userAgent?: string) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.email, email.trim().toLowerCase()) });
  const cred = member ? await db.query.credentials.findFirst({ where: eq(schema.credentials.memberId, member.id) }) : undefined;
  const ok = member && cred ? await verifyPassword(password, cred.passwordHash) : false;
  if (!member || !ok) {
    if (member) await audit(db, { chapterId: member.chapterId, kind: "LOGIN_FAILED", actor: { type: "USER", id: member.id }, subject: { type: "Member", id: member.id }, result: `Intento de acceso fallido para ${member.email}.`, significant: false, companyIds: [member.companyId] });
    return null;
  }
  const { token } = await createSession(db, member.id, userAgent);
  await audit(db, { chapterId: member.chapterId, kind: "LOGIN", actor: { type: "USER", id: member.id }, subject: { type: "Member", id: member.id }, result: `${member.fullName} entró en NS.`, significant: false, companyIds: [member.companyId] });
  return { member, token };
}

export async function logout(db: Db, token: string | undefined) {
  if (!token) return;
  const s = await db.query.sessions.findFirst({ where: eq(schema.sessions.tokenHash, sha256(token)) });
  if (!s || s.revokedAt) return;
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.id, s.id));
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, s.memberId) });
  if (member) await audit(db, { chapterId: member.chapterId, kind: "LOGOUT", actor: { type: "USER", id: member.id }, subject: { type: "Member", id: member.id }, result: `${member.fullName} salió de NS.`, significant: false, companyIds: [member.companyId] });
}

export async function listSessions(db: Db, memberId: string) {
  return db.query.sessions.findMany({ where: and(eq(schema.sessions.memberId, memberId), isNull(schema.sessions.revokedAt), gt(schema.sessions.expiresAt, new Date())), orderBy: [desc(schema.sessions.lastSeenAt)] });
}

export async function revokeSession(db: Db, memberId: string, sessionId: string) {
  const s = await db.query.sessions.findFirst({ where: eq(schema.sessions.id, sessionId) });
  if (!s || s.memberId !== memberId) throw new AccountError("Solo puedes cerrar tus propias sesiones.");
  await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.id, sessionId));
}

export async function revokeOtherSessions(db: Db, memberId: string, keepToken?: string) {
  const keep = keepToken ? sha256(keepToken) : null;
  const open = await listSessions(db, memberId);
  for (const s of open) if (s.tokenHash !== keep) await db.update(schema.sessions).set({ revokedAt: new Date() }).where(eq(schema.sessions.id, s.id));
}

export async function changePassword(db: Db, memberId: string, current: string, next: string, keepToken?: string) {
  const cred = await db.query.credentials.findFirst({ where: eq(schema.credentials.memberId, memberId) });
  if (!cred || !(await verifyPassword(current, cred.passwordHash))) throw new AccountError("La contraseña actual no es correcta.");
  await setPassword(db, memberId, next);
  await revokeOtherSessions(db, memberId, keepToken);
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, memberId) });
  if (member) await audit(db, { chapterId: member.chapterId, kind: "PASSWORD_CHANGED", actor: { type: "USER", id: member.id }, subject: { type: "Member", id: member.id }, result: `${member.fullName} cambió su contraseña. Las demás sesiones se cerraron.`, significant: false, companyIds: [member.companyId] });
}

/** Invitación para fijar (o recuperar) la contraseña. Solo la Directiva, NS o la propia persona la generan. */
export async function createInvite(db: Db, opts: { memberId: string; createdBy: string }) {
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, opts.memberId) });
  if (!member) throw new AccountError("Persona no encontrada.");
  const by = await db.query.members.findFirst({ where: eq(schema.members.id, opts.createdBy) });
  if (!by || (by.id !== member.id && !by.isDirector)) throw new AccountError("Solo la Directiva genera enlaces de acceso para otros.");
  const token = newToken();
  const [row] = await db.insert(schema.invites).values({ memberId: member.id, tokenHash: sha256(token), expiresAt: days(INVITE_TTL_DAYS), createdByMemberId: by.id }).returning();
  await audit(db, { chapterId: member.chapterId, kind: "INVITE_CREATED", actor: { type: "USER", id: by.id }, subject: { type: "Member", id: member.id }, result: `${by.fullName} generó un enlace de acceso para ${member.fullName} (válido ${INVITE_TTL_DAYS} días).`, significant: false, companyIds: [member.companyId] });
  return { token, invite: row, member };
}

export async function inviteFromToken(db: Db, token: string) {
  const inv = await db.query.invites.findFirst({ where: and(eq(schema.invites.tokenHash, sha256(token)), isNull(schema.invites.usedAt), gt(schema.invites.expiresAt, new Date())) });
  if (!inv) return null;
  const member = await db.query.members.findFirst({ where: eq(schema.members.id, inv.memberId) });
  return member ? { invite: inv, member } : null;
}

/** Canjea la invitación: fija la contraseña, la marca usada, cierra sesiones anteriores y abre una nueva. */
export async function redeemInvite(db: Db, token: string, password: string, userAgent?: string) {
  const found = await inviteFromToken(db, token);
  if (!found) throw new AccountError("Este enlace no es válido, ya se usó o ha caducado. Pide otro a la Directiva.");
  await setPassword(db, found.member.id, password);
  await db.update(schema.invites).set({ usedAt: new Date() }).where(eq(schema.invites.id, found.invite.id));
  await revokeOtherSessions(db, found.member.id);
  const { token: sessionToken } = await createSession(db, found.member.id, userAgent);
  await audit(db, { chapterId: found.member.chapterId, kind: "PASSWORD_SET", actor: { type: "USER", id: found.member.id }, subject: { type: "Member", id: found.member.id }, result: `${found.member.fullName} activó su acceso a NS.`, significant: false, companyIds: [found.member.companyId] });
  return { member: found.member, token: sessionToken };
}
