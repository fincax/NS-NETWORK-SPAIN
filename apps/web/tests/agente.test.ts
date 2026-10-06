/** Mi Agente · "Dile a tu Agente" (D-075): intención → propuesta tipada → confirmación con un toque. Nada cambia sin el toque. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { interpretIntentRules, parseEuros } from "@/agents/intencion";
import { applyDnaPatch, DnaPatch } from "@/core/intencion";
import { agenteView, confirmIntent, dismissIntent, IntentError, pendingIntent, proposeIntent } from "@/services/agente";
import { TRIGGER_LABEL } from "@/services/entrevista";
import { openDemands } from "@/services/demands";
import type { BusinessDNA } from "@/core/types";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companyId: string;
let memberId: string;
let otherMemberId: string;
let dna: BusinessDNA;

const input = (text: string) => ({ text, companyName: "Reformas Industriales Híspalis", dna, triggerLabels: TRIGGER_LABEL });

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  companyId = r.companies["hispalis"].companyId;
  memberId = r.companies["hispalis"].memberId;
  otherMemberId = Object.entries(r.companies).find(([slug]) => slug !== "hispalis")![1].memberId;
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.id, companyId) });
  chapterId = company!.chapterId;
  dna = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) }))!.dna;
});
afterAll(async () => {
  await closeDb();
});

describe("Intérprete determinista", () => {
  it("lee importes como los dice un empresario", () => {
    expect(parseEuros("nada por debajo de 30.000 €")).toBe(30_000);
    expect(parseEuros("mínimo 30k")).toBe(30_000);
    expect(parseEuros("hasta 1,5 millones")).toBe(1_500_000);
    expect(parseEuros("contrata 40 empleados")).toBeUndefined(); // una cifra sin unidad no es un importe
  });

  it("«Durante este trimestre quiero clientes industriales grandes» es un Encargo con sector y tamaño", () => {
    const p = interpretIntentRules(input("Durante este trimestre quiero clientes industriales grandes."));
    expect(p.kind).toBe("ENCARGO");
    expect(p.encargo?.industry).toBe("Industrial");
    expect(p.dna_patch?.company_size_add).toEqual(["201-500", "500+"]);
    expect(p.summary).toMatch(/^He entendido/);
  });

  it("«No quiero proyectos inferiores a 30.000 €» es un cambio de ADN: ticket mínimo", () => {
    const p = interpretIntentRules(input("No quiero proyectos inferiores a 30.000 €."));
    expect(p.kind).toBe("ADN");
    expect(p.encargo).toBeUndefined();
    expect(p.dna_patch?.ticket_min).toBe(30_000);
  });

  it("«Busca empresas que estén abriendo nuevas sedes» es un Encargo con la señal NEW_SITE", () => {
    const p = interpretIntentRules(input("Busca empresas que estén abriendo nuevas sedes."));
    expect(p.kind).toBe("ENCARGO");
    expect(p.encargo?.trigger).toBe("NEW_SITE");
    expect(p.dna_patch?.triggers_add).toContain("NEW_SITE");
  });

  it("lo coyuntural y lo estructural conviven en una sola propuesta", () => {
    const p = interpretIntentRules(input("Este trimestre quiero clientes industriales grandes. Nada por debajo de 30.000 €. No me interesan hoteles ni restaurantes."));
    expect(p.kind).toBe("ENCARGO");
    expect(p.encargo?.value_band).toBe("10-50K");
    expect(p.dna_patch?.ticket_min).toBe(30_000);
    expect(p.dna_patch?.exclusions_add).toContain("Hostelería");
    expect(p.understood.length).toBeGreaterThanOrEqual(3);
  });

  it("un tercero con una necesidad es un Apunte, con la relación bien leída", () => {
    const p = interpretIntentRules(input("Mi cliente Metalúrgica del Sur va a abrir una planta nueva en Dos Hermanas y necesita obra y seguros. Sabe que le llamarán."));
    expect(p.kind).toBe("APUNTE");
    expect(p.apunte?.who).toBe("Metalúrgica del Sur");
    expect(p.apunte?.need).toMatch(/planta nueva/);
    expect(p.apunte?.relation).toBe("CLIENT");
    expect(p.apunte?.expects_contact).toBe(true);
    const heard = interpretIntentRules(input("He oído que Farmalab, que amplía plantilla con 25 técnicos"));
    expect(heard.kind).toBe("APUNTE");
    expect(heard.apunte?.relation).toBe("HEARD");
  });

  it("si no entiende, pregunta en vez de inventar", () => {
    const p = interpretIntentRules(input("Buenos días, ¿qué tal todo por ahí?"));
    expect(p.kind).toBe("INSUFICIENTE");
    expect(p.question).toBeTruthy();
    expect(p.dna_patch).toBeUndefined();
    expect(p.encargo).toBeUndefined();
  });

  it("el parche del ADN añade, quita y nunca borra lo que no se ha dicho", () => {
    const next = applyDnaPatch(dna, DnaPatch.parse({ ticket_min: 30_000, industries_remove: ["Hostelería"], industries_add: ["Industrial"], geography_add: ["Dos Hermanas"] }));
    expect(next.commercial.ticket_min).toBe(30_000);
    expect(next.commercial.ticket_max).toBe(dna.commercial.ticket_max);
    expect(next.ideal_customer.industries).toContain("Industrial");
    expect(next.ideal_customer.industries.map((i) => i.toLowerCase())).not.toContain("hostelería");
    expect(next.ideal_customer.exclusions).toContain("Hostelería");
    expect(next.ideal_customer.geography).toContain("Dos Hermanas");
    expect(next.offering.services).toEqual(dna.offering.services);
  });
});

describe("Dile a tu Agente · proponer, confirmar, descartar", () => {
  it("proponer no cambia nada: ni Encargo ni versión del ADN", async () => {
    const before = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) }))!;
    const demandsBefore = (await openDemands(db, chapterId, companyId)).length;
    const row = await proposeIntent(db, { companyId, memberId, text: "Este trimestre quiero clientes industriales grandes. Nada por debajo de 30.000 €." });
    expect(row.status).toBe("PROPOSED");
    expect(row.provider).toBe("deterministic");
    expect(row.proposal.kind).toBe("ENCARGO");
    const after = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) }))!;
    expect(after.version).toBe(before.version);
    expect((await openDemands(db, chapterId, companyId)).length).toBe(demandsBefore);
    expect(await pendingIntent(db, companyId)).toMatchObject({ id: row.id });
  });

  it("confirmar publica el Encargo y guarda una versión nueva del ADN validada por el Timonel", async () => {
    const pending = (await pendingIntent(db, companyId))!;
    const before = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) }))!;
    const { intent, outcome } = await confirmIntent(db, { intentId: pending.id, memberId });
    expect(intent.status).toBe("CONFIRMED");
    expect(outcome.demandId).toBeTruthy();
    expect(outcome.dnaVersion).toBe(before.version + 1);
    const demand = await db.query.demands.findFirst({ where: eq(schema.demands.id, outcome.demandId!) });
    expect(demand?.companyId).toBe(companyId);
    expect(demand?.industry).toBe("Industrial");
    const after = (await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) }))!;
    expect(after.version).toBe(before.version + 1);
    expect(after.validatedBy).toBe(memberId);
    expect(after.dna.commercial.ticket_min).toBe(30_000);
    expect(after.dna.ideal_customer.company_size).toContain("500+");
    const events = await db.query.auditEvents.findMany({ where: and(eq(schema.auditEvents.kind, "INTENT_CONFIRMED"), eq(schema.auditEvents.subjectId, pending.id)) });
    expect(events).toHaveLength(1);
    expect(events[0].companyIds).toEqual([companyId]); // privado de la empresa
    await expect(confirmIntent(db, { intentId: pending.id, memberId })).rejects.toBeInstanceOf(IntentError); // no se confirma dos veces
  });

  it("un referido confirmado nace como Apunte en borrador, nunca publicado", async () => {
    const row = await proposeIntent(db, { companyId, memberId, text: "Mi cliente Cerámicas Bajo Guadalquivir va a abrir una nave nueva en Alcalá de Guadaíra y busca obra." });
    expect(row.proposal.kind).toBe("APUNTE");
    const { outcome } = await confirmIntent(db, { intentId: row.id, memberId });
    const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, outcome.opportunitySignalId!) });
    expect(os?.status).toBe("DRAFT");
    expect(os?.originatorCompanyId).toBe(companyId);
    const bs = await db.query.businessSignals.findFirst({ where: eq(schema.businessSignals.id, os!.businessSignalId) });
    expect(bs?.source).toBe("APUNTE");
  });

  it("descartar cierra la propuesta sin tocar nada; una pregunta del Agente no se puede confirmar", async () => {
    const row = await proposeIntent(db, { companyId, memberId, text: "Buenos días, ¿qué tal todo?" });
    expect(row.proposal.kind).toBe("INSUFICIENTE");
    await expect(confirmIntent(db, { intentId: row.id, memberId })).rejects.toBeInstanceOf(IntentError);
    await dismissIntent(db, { intentId: row.id, memberId });
    const after = await db.query.agentIntents.findFirst({ where: eq(schema.agentIntents.id, row.id) });
    expect(after?.status).toBe("DISMISSED");
    expect(await pendingIntent(db, companyId)).toBeUndefined();
  });

  it("solo el Timonel de la empresa habla con su Agente, y nunca con una contraprestación (D-010)", async () => {
    await expect(proposeIntent(db, { companyId, memberId: otherMemberId, text: "Quiero clientes industriales" })).rejects.toBeInstanceOf(IntentError);
    await expect(proposeIntent(db, { companyId, memberId, text: "Busca obras y me llevo una comisión del 5 % por cada referido" })).rejects.toThrow(/D-010/);
    const row = await proposeIntent(db, { companyId, memberId, text: "Busca empresas que estén abriendo nuevas sedes." });
    await expect(confirmIntent(db, { intentId: row.id, memberId: otherMemberId })).rejects.toBeInstanceOf(IntentError);
    await dismissIntent(db, { intentId: row.id, memberId });
  });

  it("la vista reúne lo que ya existe: ADN, Encargos, Mesa, permisos y Movimientos", async () => {
    const v = await agenteView(db, { chapterId, companyId });
    expect(v.sabe.ticketMin).toBe(30_000);
    expect(v.buscanParaTi.some((d) => d.industry === "Industrial")).toBe(true);
    expect(v.puede.humanApproval).toBe(true);
    expect(v.hace.drafts).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(v.propone)).toBe(true);
    expect(v.reciente.length).toBeGreaterThanOrEqual(2);
  });
});
