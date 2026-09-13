/** Apunte (D-037): captura rápida del Timonel → Indicio en borrador en la memoria del Agente. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { apunteText, createApunte, ApunteError } from "@/services/apunte";
import type { SignalEnvelope } from "@/core/types";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let companyId: string;
let memberId: string;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  companyId = r.companies["hispalis"].companyId;
  memberId = r.companies["hispalis"].memberId;
});
afterAll(async () => {
  await closeDb();
});

describe("Apunte", () => {
  it("redacta el texto como se lo contarías a un socio", () => {
    expect(apunteText({ companyId, memberId, who: "Metalúrgica del Sur", need: "obra para una nave nueva en Dos Hermanas", relation: "CLIENT", notes: "presupuesto aprobado", expectsContact: true })).toBe("Apunte del Timonel. Mi cliente Metalúrgica del Sur necesita obra para una nave nueva en Dos Hermanas. Observaciones: presupuesto aprobado. Sabe que le llamarán.");
    expect(apunteText({ companyId, memberId, who: "Turnia", need: "marca nueva.", relation: "HEARD" })).toBe("Apunte del Timonel. He oído que Turnia necesita marca nueva.");
  });
  it("queda en borrador, con necesidades detectadas y sin publicar", async () => {
    const r = await createApunte(db, { companyId, memberId, who: "Metalúrgica del Sur", need: "abre planta nueva en Dos Hermanas y contrata 40 empleados, busca obra y seguros", relation: "CLIENT", contactName: "Rocío Salas", contactRole: "Directora general", notes: "presupuesto aprobado", expectsContact: true });
    expect(r.opportunitySignal.status).toBe("DRAFT");
    expect(r.needs.length).toBeGreaterThan(0);
    const bs = await db.query.businessSignals.findFirst({ where: eq(schema.businessSignals.id, r.opportunitySignal.businessSignalId) });
    expect(bs?.source).toBe("APUNTE");
    const env = r.opportunitySignal.envelope as SignalEnvelope;
    expect(env.chapter_layer.third_party_expects_contact).toBe(true);
    expect(env.chapter_layer.relationship_strength).toBe("DIRECT");
    expect(env.identity_layer?.contact_person?.name).toBe("Rocío Salas");
    expect(env.identity_layer?.contact_person?.legal_basis).toBe("NONE");
    expect(env.chapter_layer.need_summary).not.toMatch(/Rocío/);
  });
  it("la relación cambia la fuerza del Indicio", async () => {
    const heard = await createApunte(db, { companyId, memberId, who: "una empresa de Alcalá", need: "renovar su flota de 12 vehículos", relation: "HEARD" });
    expect((heard.opportunitySignal.envelope as SignalEnvelope).chapter_layer.relationship_strength).toBe("WEAK");
    const known = await createApunte(db, { companyId, memberId, who: "Farmalab", need: "ampliar plantilla con 25 técnicos", relation: "KNOWN" });
    expect((known.opportunitySignal.envelope as SignalEnvelope).chapter_layer.relationship_strength).toBe("INDIRECT");
  });
  it("rechaza apuntes vacíos y contraprestaciones (D-010)", async () => {
    await expect(createApunte(db, { companyId, memberId, who: "", need: "algo" })).rejects.toBeInstanceOf(ApunteError);
    await expect(createApunte(db, { companyId, memberId, who: "Alguien", need: "una obra, me llevo una comisión del 5 %" })).rejects.toThrow(/D-010/);
  });
});
