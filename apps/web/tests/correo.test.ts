/** Correos de acceso (D-060): invitación, recuperación de contraseña, límite por hora y fallo del buzón. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { inviteFromToken, redeemInvite } from "@/lib/accounts";
import { mailEnabled, outbox } from "@/lib/mail";
import { inviteByMail, RECOVERY_LIMIT_PER_HOUR, requestPasswordRecovery } from "@/services/correo";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";
process.env.NS_PUBLIC_URL = "https://networkspain.com";

let db: Db;
let carlosId: string;
let inesId: string; // Directiva

const tokenFrom = (text: string) => text.match(/\/invitacion\/([A-Za-z0-9_-]+)/)![1];
const kindsFor = async (memberId: string) => (await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.subjectId, memberId) })).map((e) => e.kind);

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  carlosId = r.companies["hispalis"].memberId;
  inesId = r.companies["bufete-alameda"].memberId;
});
const SMTP_VARS = ["NS_SMTP_HOST", "NS_SMTP_PORT", "NS_SMTP_USER", "NS_SMTP_PASSWORD"];
beforeEach(() => {
  process.env.NS_MAIL_TRANSPORT = "memory";
  for (const v of SMTP_VARS) delete process.env[v];
  outbox.length = 0;
});
afterAll(async () => {
  delete process.env.NS_MAIL_TRANSPORT;
  for (const v of SMTP_VARS) delete process.env[v];
  await closeDb();
});

describe("Invitación por correo", () => {
  it("la Directiva invita: el Timonel recibe el enlace, el token no vuelve a la pantalla y el enlace funciona", async () => {
    const r = await inviteByMail(db, { memberId: carlosId, createdBy: inesId });
    expect(r).toEqual({ sent: true, email: "carlos@hispalis-industrial.es" });
    expect(outbox).toHaveLength(1);
    const mail = outbox[0];
    expect(mail.to).toBe("carlos@hispalis-industrial.es");
    expect(mail.subject).toContain("NS Cumbre");
    expect(mail.text).toContain("https://networkspain.com/invitacion/");
    expect(mail.html).toContain("Activar mi acceso");
    const found = await inviteFromToken(db, tokenFrom(mail.text));
    expect(found?.member.id).toBe(carlosId);
    expect(await kindsFor(carlosId)).toContain("MAIL_SENT");
  });
  it("sin correo configurado, el enlace se muestra a la Directiva como antes (D-054)", async () => {
    delete process.env.NS_MAIL_TRANSPORT;
    expect(mailEnabled()).toBe(false);
    const r = await inviteByMail(db, { memberId: carlosId, createdBy: inesId });
    expect(r.sent).toBe(false);
    expect(r.sent === false && r.token).toBeTruthy();
    expect(outbox).toHaveLength(0);
  });
  it("si el buzón falla, la Directiva recibe el enlace y el fallo queda registrado", async () => {
    delete process.env.NS_MAIL_TRANSPORT;
    Object.assign(process.env, { NS_SMTP_HOST: "127.0.0.1", NS_SMTP_PORT: "1", NS_SMTP_USER: "hola@networkspain.com", NS_SMTP_PASSWORD: "x" });
    const r = await inviteByMail(db, { memberId: carlosId, createdBy: inesId });
    expect(r.sent).toBe(false);
    expect(r.sent === false && r.token && r.error).toBeTruthy();
    expect(await kindsFor(carlosId)).toContain("MAIL_FAILED");
  });
});

describe("Recuperación de contraseña", () => {
  it("envía un enlace de 24 horas al propio Timonel; al usarlo elige contraseña nueva", async () => {
    await requestPasswordRecovery(db, "  Carlos@Hispalis-Industrial.es ");
    expect(outbox).toHaveLength(1);
    expect(outbox[0].subject).toContain("contraseña");
    const token = tokenFrom(outbox[0].text);
    const found = await inviteFromToken(db, token);
    const hours = (found!.invite.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThanOrEqual(24);
    const r = await redeemInvite(db, token, "otra-contraseña-segura");
    expect(r.member.id).toBe(carlosId);
  });
  it("no revela nada ni envía si el correo no es de un Timonel", async () => {
    await requestPasswordRecovery(db, "nadie@example.com");
    expect(outbox).toHaveLength(0);
  });
  it(`como mucho ${RECOVERY_LIMIT_PER_HOUR} por hora y persona; el exceso queda registrado`, async () => {
    const member = (await db.query.members.findFirst({ where: eq(schema.members.id, inesId) }))!;
    for (let i = 0; i < RECOVERY_LIMIT_PER_HOUR + 2; i++) await requestPasswordRecovery(db, member.email);
    expect(outbox).toHaveLength(RECOVERY_LIMIT_PER_HOUR);
    expect(await kindsFor(inesId)).toContain("RECOVERY_THROTTLED");
  });
  it("una empresa de baja no recibe enlaces", async () => {
    const carlos = (await db.query.members.findFirst({ where: eq(schema.members.id, carlosId) }))!;
    await db.update(schema.companies).set({ status: "RELEASED" }).where(eq(schema.companies.id, carlos.companyId));
    await requestPasswordRecovery(db, carlos.email);
    expect(outbox).toHaveLength(0);
    await db.update(schema.companies).set({ status: "ACTIVE" }).where(eq(schema.companies.id, carlos.companyId));
  });
});
