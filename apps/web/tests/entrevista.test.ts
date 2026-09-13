/** Entrevista del Agente (D-040): guion determinista, lectura de la web, estado y validación humana. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { closeDb, getDb, schema, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { SEED_COMPANIES } from "@/db/seed-data";
import { onboardCompany } from "@/services/onboarding";
import { activeInterview, answerInterview, dnaGaps, finishInterview, InterviewError, startInterview } from "@/services/entrevista";
import { euros, list, sizeBands } from "@/agents/interview-script";
import { htmlToText } from "@/lib/website";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companyId: string;
let memberId: string;
let otherMemberId: string;

const SITE = `<html><head><title>Correduría Giralda</title><meta name="description" content="Seguros para pymes industriales y flotas en Sevilla"></head>
<body><nav>Inicio Servicios Contacto</nav><script>var x=1;</script><h1>Correduría Giralda</h1><p>Desde 2004 aseguramos <b>flotas</b> y naves industriales.</p><footer>© Giralda</footer></body></html>`;

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  otherMemberId = r.companies["hispalis"].memberId;
  const minimal = { ...SEED_COMPANIES[0].dna, company: { description: "", locations: [], certifications: [], credibility: [] }, offering: { services: [], products: [], differentiators: [], exclusions: [], capacity: "OPEN" as const }, ideal_customer: { industries: [], company_size: [], geography: [], roles: [], triggers: [], problems: [], exclusions: [] }, commercial: { strategic_priority: 2 as const, urgency: "90D" as const }, referrals: { perfect_referral: "", acceptable_referral: "", poor_referral: "", disqualifiers: [], introduction_preferences: "" } };
  const c = await onboardCompany(db, { chapterId, name: "Redes Giralda", slug: "redes-giralda-ent", website: "https://redesgiralda.example", specialtyCode: "TELECOMUNICACIONES", person: { fullName: "Lucía Romero", role: "CEO", email: "lucia@redesgiralda.example" }, dna: minimal, validate: false });
  companyId = c.company.id;
  memberId = c.member.id;
});
afterAll(async () => {
  await closeDb();
});

describe("Piezas del guion", () => {
  it("entiende listas, cifras en euros y tamaños", () => {
    expect(list("obra, seguros y prevención")).toEqual(["obra", "seguros", "prevención"]);
    expect(euros("desde 40.000 € hasta 1,2 millones")).toEqual([40_000, 1_200_000]);
    expect(euros("mínimo 15k")).toEqual([15_000]);
    expect(sizeBands("empresas de más de 50 empleados")).toEqual(["51-200", "201-500", "500+"]);
    expect(sizeBands("pymes de 10 a 60 personas")).toEqual(["1-10", "11-50", "51-200"]);
  });
  it("lee una web y se queda con el texto útil", () => {
    const t = htmlToText(SITE);
    expect(t.startsWith("Correduría Giralda. Seguros para pymes industriales y flotas en Sevilla")).toBe(true);
    expect(t).toContain("Desde 2004 aseguramos flotas y naves industriales.");
    expect(t).not.toMatch(/var x|Inicio Servicios|© Giralda/);
  });
});

describe("Entrevista", () => {
  it("solo el Timonel de la empresa puede empezarla", async () => {
    await expect(startInterview(db, { companyId, memberId: otherMemberId })).rejects.toBeInstanceOf(InterviewError);
  });
  it("empieza leyendo la web y hace la primera pregunta", async () => {
    const i = await startInterview(db, { companyId, memberId, reader: async () => SITE });
    expect(i.status).toBe("OPEN");
    expect(i.topic).toBe("COMPANY");
    expect(i.transcript[0].role).toBe("agent");
    expect(i.transcript[0].text).toMatch(/Lucía/);
    expect(i.websiteText).toContain("Correduría Giralda");
    expect(i.draftDna.company.description).toContain("Correduría Giralda");
    const again = await startInterview(db, { companyId, memberId, reader: async () => SITE });
    expect(again.id).toBe(i.id);
  });
  it("cada respuesta construye el ADN a la vista y avanza el tema", async () => {
    const i = (await activeInterview(db, companyId))!;
    let s = await answerInterview(db, { interviewId: i.id, memberId, text: "Instalamos redes y telefonía para empresas en Sevilla y Dos Hermanas desde 2010." });
    expect(s.topic).toBe("SERVICES");
    expect(s.draftDna.company.locations).toEqual(expect.arrayContaining(["Sevilla", "Dos Hermanas"]));
    expect(s.transcript.at(-1)?.learned?.[0]).toMatch(/Sevilla/);
    s = await answerInterview(db, { interviewId: i.id, memberId, text: "Cableado estructurado, wifi profesional y centralitas. No hacemos venta de móviles ni reparaciones." });
    expect(s.draftDna.offering.services).toEqual(["Cableado estructurado", "wifi profesional", "centralitas"]);
    expect(s.draftDna.offering.exclusions).toEqual(["venta de móviles", "reparaciones"]);
    s = await answerInterview(db, { interviewId: i.id, memberId, text: "Empresas industriales y logísticas de más de 50 empleados en Sevilla; decide el director de operaciones." });
    expect(s.draftDna.ideal_customer.industries).toEqual(expect.arrayContaining(["Industrial", "Logística"]));
    expect(s.draftDna.ideal_customer.company_size).toContain("51-200");
    expect(s.draftDna.ideal_customer.roles).toContain("Director de Operaciones");
    s = await answerInterview(db, { interviewId: i.id, memberId, text: "Cuando abren una nueva sede o contratan a mucha gente." });
    expect(s.draftDna.ideal_customer.triggers).toEqual(expect.arrayContaining(["NEW_SITE", "HEADCOUNT_GROWTH"]));
    s = await answerInterview(db, { interviewId: i.id, memberId, text: "Desde 8.000 € hasta 120k. La venta dura unas 6 semanas." });
    expect(s.draftDna.commercial.ticket_min).toBe(8_000);
    expect(s.draftDna.commercial.ticket_max).toBe(120_000);
    expect(s.draftDna.commercial.sales_cycle_days).toBe(42);
    expect(s.progress).toBe(50);
  });
  it("saltar una pregunta no inventa nada; terminar antes de tiempo cierra", async () => {
    const i = (await activeInterview(db, companyId))!;
    let s = await answerInterview(db, { interviewId: i.id, memberId, text: "paso" });
    expect(s.draftDna.referrals.perfect_referral).toBe("");
    expect(s.topic).toBe("DISQUALIFIERS");
    s = await answerInterview(db, { interviewId: i.id, memberId, text: "Particulares, comunidades de vecinos y locales pequeños." });
    expect(s.draftDna.referrals.disqualifiers).toEqual(["Particulares", "comunidades de vecinos", "locales pequeños"]);
    s = await answerInterview(db, { interviewId: i.id, memberId, text: "terminar" });
    expect(s.status).toBe("READY");
    expect(s.topic).toBe("DONE");
    expect(s.progress).toBe(100);
    expect(s.transcript.at(-1)?.text).toMatch(/Cableado estructurado/);
    await expect(answerInterview(db, { interviewId: i.id, memberId, text: "otra cosa" })).rejects.toBeInstanceOf(InterviewError);
  });
  it("nada cambia en la empresa hasta que el Timonel valida; al validar, versión nueva y evento en la Mesa", async () => {
    const before = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
    expect(before?.validatedAt).toBeNull();
    expect(before?.dna.offering.services).toEqual([]);
    const i = (await activeInterview(db, companyId))!;
    await finishInterview(db, { interviewId: i.id, memberId });
    const after = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, companyId) });
    expect(after?.validatedAt).not.toBeNull();
    expect(after?.version).toBe((before?.version ?? 1) + 1);
    expect(after?.dna.offering.services).toContain("centralitas");
    expect(dnaGaps(after!.dna)).toEqual(["el referido perfecto"]);
    expect(await activeInterview(db, companyId)).toBeUndefined();
    const ev = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "DNA_VALIDATED") });
    expect(ev?.significant).toBe(true);
    expect(ev?.companyIds).toContain(companyId);
  });
  it("una nueva entrevista parte del ADN validado", async () => {
    const i = await startInterview(db, { companyId, memberId, reader: async () => SITE });
    expect(i.draftDna.offering.services).toContain("centralitas");
    expect(i.transcript[0].topic).toBe("COMPANY");
  });
});
