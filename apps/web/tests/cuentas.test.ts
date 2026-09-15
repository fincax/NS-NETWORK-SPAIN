/** Cuentas de acceso (D-054): contraseñas, invitaciones, sesiones, registro de accesos y permisos. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { AccountError, changePassword, createInvite, hashPassword, inviteFromToken, listSessions, login, logout, memberFromSessionToken, redeemInvite, revokeSession, verifyPassword } from "@/lib/accounts";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";
process.env.NS_SEED_PASSWORD = "nscumbre-2026";

let db: Db;
let carlosId: string;
let inesId: string; // Directiva

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  carlosId = r.companies["hispalis"].memberId;
  inesId = r.companies["bufete-alameda"].memberId;
});
afterAll(async () => {
  await closeDb();
});

describe("Contraseñas", () => {
  it("se guardan con sal y se verifican; las cortas se rechazan", async () => {
    const h = await hashPassword("una-contraseña-larga");
    expect(h.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("una-contraseña-larga", h)).toBe(true);
    expect(await verifyPassword("otra", h)).toBe(false);
    await expect(hashPassword("corta")).rejects.toBeInstanceOf(AccountError);
  });
  it("la semilla da contraseña a los Timoneles de la demo", async () => {
    const r = await login(db, "carlos@hispalis-industrial.es", "nscumbre-2026", "vitest");
    expect(r?.member.id).toBe(carlosId);
    expect(r?.token).toBeTruthy();
    expect(await login(db, "carlos@hispalis-industrial.es", "incorrecta")).toBeNull();
    expect(await login(db, "nadie@example.com", "nscumbre-2026")).toBeNull();
    const kinds = (await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.subjectId, carlosId) })).map((e) => e.kind);
    expect(kinds).toContain("LOGIN");
    expect(kinds).toContain("LOGIN_FAILED");
  });
});

describe("Sesiones", () => {
  it("la cookie identifica al Timonel; cerrar sesión la invalida", async () => {
    const r = (await login(db, "carlos@hispalis-industrial.es", "nscumbre-2026"))!;
    expect((await memberFromSessionToken(db, r.token))?.id).toBe(carlosId);
    expect(await memberFromSessionToken(db, "token-inventado")).toBeNull();
    await logout(db, r.token);
    expect(await memberFromSessionToken(db, r.token)).toBeNull();
  });
  it("solo se cierran las sesiones propias; cambiar la contraseña cierra las demás", async () => {
    const a = (await login(db, "carlos@hispalis-industrial.es", "nscumbre-2026", "móvil"))!;
    const b = (await login(db, "carlos@hispalis-industrial.es", "nscumbre-2026", "portátil"))!;
    const open = await listSessions(db, carlosId);
    expect(open.length).toBeGreaterThanOrEqual(2);
    await expect(revokeSession(db, inesId, open[0].id)).rejects.toBeInstanceOf(AccountError);
    await expect(changePassword(db, carlosId, "incorrecta", "nueva-contraseña-larga", a.token)).rejects.toBeInstanceOf(AccountError);
    await changePassword(db, carlosId, "nscumbre-2026", "nueva-contraseña-larga", a.token);
    expect((await memberFromSessionToken(db, a.token))?.id).toBe(carlosId);
    expect(await memberFromSessionToken(db, b.token)).toBeNull();
    expect(await login(db, "carlos@hispalis-industrial.es", "nueva-contraseña-larga")).not.toBeNull();
  });
});

describe("Invitaciones", () => {
  it("solo la Directiva (o uno mismo) genera enlaces; el enlace es de un solo uso", async () => {
    const [nuevo] = await db.insert(schema.members).values({ companyId: (await db.query.members.findFirst({ where: eq(schema.members.id, carlosId) }))!.companyId, chapterId: (await db.query.members.findFirst({ where: eq(schema.members.id, carlosId) }))!.chapterId, fullName: "Suplente Híspalis", role: "Directora comercial", email: "suplente@hispalis-industrial.es", isPrimary: false }).returning();
    await expect(createInvite(db, { memberId: nuevo.id, createdBy: carlosId })).rejects.toBeInstanceOf(AccountError);
    const { token } = await createInvite(db, { memberId: nuevo.id, createdBy: inesId });
    expect((await inviteFromToken(db, token))?.member.id).toBe(nuevo.id);
    expect(await login(db, "suplente@hispalis-industrial.es", "todavia-sin-clave-1")).toBeNull();
    const r = await redeemInvite(db, token, "mi-primera-clave-segura");
    expect((await memberFromSessionToken(db, r.token))?.id).toBe(nuevo.id);
    expect(await login(db, "suplente@hispalis-industrial.es", "mi-primera-clave-segura")).not.toBeNull();
    await expect(redeemInvite(db, token, "otra-clave-segura-123")).rejects.toThrow(/ya se usó|no es válido/);
    const own = await createInvite(db, { memberId: nuevo.id, createdBy: nuevo.id });
    expect(own.token).toBeTruthy();
  });
  it("un enlace caducado no sirve", async () => {
    const { token, invite } = await createInvite(db, { memberId: carlosId, createdBy: inesId });
    await db.update(schema.invites).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.invites.id, invite.id));
    expect(await inviteFromToken(db, token)).toBeNull();
  });
});
