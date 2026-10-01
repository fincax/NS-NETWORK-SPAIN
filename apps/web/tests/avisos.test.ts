/** Avisos con acción en un toque y Apertura en el visto bueno (D-067). Correo en memoria, modo real. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { outbox } from "@/lib/mail";
import { createSignal, publishSignal } from "@/services/signals";
import { decide, infoRound } from "@/services/referrals";
import { actionContext, executeAction } from "@/services/accion";
import { actionLinkFromToken, avisosEnabled } from "@/services/avisos";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";
process.env.NS_PUBLIC_URL = "https://networkspain.com";
process.env.NS_LATIDO = "off";

let db: Db;
let companies: Awaited<ReturnType<typeof seedChapter>>["companies"];
const lucia = () => companies.guadalquivir;
const carlos = () => companies.hispalis;
const tokenFrom = (text: string) => text.match(/\/accion\/([A-Za-z0-9_-]+)/)![1];
const mailsTo = (email: string) => outbox.filter((m) => m.to === email);

beforeAll(async () => {
  db = await getDb();
  companies = (await seedChapter(db)).companies;
});
beforeEach(() => {
  process.env.NS_MAIL_TRANSPORT = "memory";
  process.env.NS_AUTH_MODE = "real";
  outbox.length = 0;
});
afterAll(async () => {
  delete process.env.NS_MAIL_TRANSPORT;
  delete process.env.NS_AUTH_MODE;
  await closeDb();
});

describe("D-067 · Avisos con acción en un toque", () => {
  let referralId: string;
  let carlosToken: string;

  it("en la demo no se avisa a nadie; en modo real con correo, sí", () => {
    process.env.NS_AUTH_MODE = "demo";
    expect(avisosEnabled()).toBe(false);
    process.env.NS_AUTH_MODE = "real";
    expect(avisosEnabled()).toBe(true);
  });

  it("al preparar la Cesión, el cedente recibe «Proponer»; con un toque propone y deja autorizada la Apertura", async () => {
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: "Mi cliente Envases del Aljarafe, empresa industrial de 120 empleados, abre una nueva nave industrial en Dos Hermanas en Q2 con 70 empleados nuevos. Presupuesto de obra aprobado de 600.000 €. Decide el Director General, con el que tengo trato directo.", contactName: "Rafael Montes", contactRole: "Director General", legalBasisForContact: "LEGITIMATE_INTEREST", thirdPartyExpectsContact: true });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
    referralId = ref.id;
    const toLucia = mailsTo("lucia@correduriaguadalquivir.es");
    expect(toLucia.length).toBeGreaterThanOrEqual(1);
    const mail = toLucia.find((m) => m.text.includes(referralId) || m.html.includes("Proponer la Cesión"))!;
    expect(mail.html).toContain("Proponer la Cesión");
    const token = tokenFrom(mail.text);
    const ctx = (await actionContext(db, token))!;
    expect(ctx.member.id).toBe(lucia().memberId);
    expect(ctx.applies).toBe(true);
    outbox.length = 0;
    const r = await executeAction(db, token);
    expect(r).toEqual({ referralId, memberId: lucia().memberId, done: true });
    const after = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) }))!;
    expect(after.state).toBe("RECEIVER_PENDING");
    expect(after.preauthorizedScope).toBe("COMPANY_AND_CONTACT");
    expect(after.preauthorizedByMemberId).toBe(lucia().memberId);
    expect(await actionLinkFromToken(db, token)).toBeNull(); // un solo uso
    await expect(executeAction(db, token)).rejects.toThrow(/ya no sirve/);
    // Al proponer, el cesionario recibe «Aceptar».
    const toCarlos = mailsTo("carlos@hispalis-industrial.es");
    expect(toCarlos).toHaveLength(1);
    expect(toCarlos[0].subject).toContain("Cesión de Correduría Guadalquivir");
    expect(toCarlos[0].html).toContain("Aceptar la Cesión");
    carlosToken = tokenFrom(toCarlos[0].text);
  });

  it("al aceptar con un toque, la Apertura anticipada se ejecuta sola y el Puente queda redactado", async () => {
    await executeAction(db, carlosToken);
    let ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) }))!;
    if (ref.state === "DIRECTOR_PENDING") {
      // El valor supera el umbral de la Sala: aprueba una Directiva ajena a la Cesión; la Apertura anticipada se ejecuta igualmente.
      const director = (await db.query.members.findMany({ where: eq(schema.members.isDirector, true) })).find((m) => m.companyId !== lucia().companyId && m.companyId !== carlos().companyId)!;
      await decide(db, { referralId, memberId: director.id, decision: "APPROVE" });
      ref = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) }))!;
    }
    expect(ref.state).toBe("INTRO_AUTHORIZED"); // sin pasar por la mesa del cedente
    expect(ref.revealScope).toBe("COMPANY_AND_CONTACT");
    const intro = await db.query.introductions.findFirst({ where: eq(schema.introductions.referralId, referralId) });
    expect(intro?.preparedByAgent.message).toBeTruthy();
    const auto = await db.query.referralTransitions.findFirst({ where: and(eq(schema.referralTransitions.referralId, referralId), eq(schema.referralTransitions.toState, "INTRO_AUTHORIZED")) });
    expect(auto?.actorType).toBe("SYSTEM");
    // El cedente no recibe "aceptada" (ya no tiene que abrir): recibe "Puente listo".
    const toLucia = mailsTo("lucia@correduriaguadalquivir.es");
    expect(toLucia).toHaveLength(1);
    expect(toLucia[0].html).toContain("Ver y enviar el Puente");
    expect(toLucia[0].html).not.toContain("Autorizar la Apertura");
  });

  it("una pregunta avisa al cedente con «Responder» y el enlace lleva el borrador; un enlace que ya no procede solo entra", async () => {
    const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: "Mi cliente Cerámicas Bajo Guadalquivir, empresa industrial de 90 empleados, abre una nueva nave industrial en Alcalá de Guadaíra en Q1 con 40 empleados nuevos. Presupuesto de obra aprobado de 500.000 €. Decide el gerente, con el que tengo trato directo." });
    await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
    const ref = (await db.query.referrals.findFirst({ where: and(eq(schema.referrals.opportunitySignalId, created.opportunitySignal.id), eq(schema.referrals.receiverCompanyId, carlos().companyId)) }))!;
    await decide(db, { referralId: ref.id, memberId: lucia().memberId, decision: "APPROVE" }); // sin Apertura anticipada
    outbox.length = 0;
    await decide(db, { referralId: ref.id, memberId: carlos().memberId, decision: "REQUEST_INFO", question: "¿Hay fecha de licencia?" });
    const toLucia = mailsTo("lucia@correduriaguadalquivir.es");
    expect(toLucia).toHaveLength(1);
    expect(toLucia[0].subject).toMatch(/te pregunta/);
    const token = tokenFrom(toLucia[0].text);
    const ctx = (await actionContext(db, token))!;
    expect(ctx.question).toMatch(/licencia/);
    await executeAction(db, token, { answer: "Licencia solicitada en julio." });
    expect((await infoRound(db, ref)).answered[0].answer).toMatch(/julio/);
    // Aceptar ahora: el cedente recibe "Autorizar la Apertura" porque no la dejó autorizada.
    outbox.length = 0;
    await decide(db, { referralId: ref.id, memberId: carlos().memberId, decision: "APPROVE" });
    const after = (await db.query.referrals.findFirst({ where: eq(schema.referrals.id, ref.id) }))!;
    if (after.state === "APPROVED") {
      const open = mailsTo("lucia@correduriaguadalquivir.es");
      expect(open).toHaveLength(1);
      expect(open[0].html).toContain("Autorizar la Apertura");
      const t2 = tokenFrom(open[0].text);
      await executeAction(db, t2, { revealScope: "COMPANY_ONLY" });
      expect((await db.query.referrals.findFirst({ where: eq(schema.referrals.id, ref.id) }))!.state).toBe("INTRO_AUTHORIZED");
    }
    // Un enlace cuya acción ya no procede: entra y ve, sin ejecutar nada.
    const stale = await (await import("@/services/avisos")).createActionLink(db, { memberId: carlos().memberId, referralId: ref.id, action: "ACCEPT" });
    const r = await executeAction(db, tokenFrom(stale));
    expect(r.done).toBe(false);
  });

  it("si el buzón falla, el protocolo sigue y el fallo queda registrado", async () => {
    delete process.env.NS_MAIL_TRANSPORT;
    Object.assign(process.env, { NS_SMTP_HOST: "127.0.0.1", NS_SMTP_PORT: "1", NS_SMTP_USER: "hola@networkspain.com", NS_SMTP_PASSWORD: "x" });
    try {
      const created = await createSignal(db, { companyId: lucia().companyId, memberId: lucia().memberId, rawContent: "Mi cliente Bodegas Alcor abre nueva sede en Utrera en Q1 con 30 empleados nuevos. Presupuesto aprobado. Decide el gerente." });
      const res = await publishSignal(db, created.opportunitySignal.id, lucia().memberId);
      expect(res.referralIds.length).toBeGreaterThan(0);
      const failed = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.kind, "MAIL_FAILED"), eq(schema.auditEvents.subjectId, res.referralIds[0])) });
      expect(failed.length).toBe(1);
    } finally {
      for (const v of ["NS_SMTP_HOST", "NS_SMTP_PORT", "NS_SMTP_USER", "NS_SMTP_PASSWORD"]) delete process.env[v];
    }
  });
});
