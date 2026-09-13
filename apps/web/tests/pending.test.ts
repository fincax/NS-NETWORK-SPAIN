/** Número en el icono (D-039): lo que espera el toque del Timonel. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb, type Db } from "@/db/client";
import { seedChapter } from "@/db/seed";
import { pendingDecisions } from "@/services/today";
import { createApunte } from "@/services/apunte";

process.env.PGLITE_DATA_DIR = "memory";
process.env.NS_LLM_PROVIDER = "deterministic";

let db: Db;
let chapterId: string;
let companies: Awaited<ReturnType<typeof seedChapter>>["companies"];

beforeAll(async () => {
  db = await getDb();
  const r = await seedChapter(db);
  chapterId = r.chapter.id;
  companies = r.companies;
});
afterAll(async () => {
  await closeDb();
});

describe("pendingDecisions", () => {
  it("un Timonel sin nada pendiente ve cero; un Apunte suma uno", async () => {
    const h = companies["hispalis"];
    const before = await pendingDecisions(db, chapterId, h.companyId, { isDirector: false });
    expect(before.total).toBe(0);
    await createApunte(db, { companyId: h.companyId, memberId: h.memberId, who: "Metalúrgica del Sur", need: "abre planta nueva y busca seguros", relation: "CLIENT" });
    const after = await pendingDecisions(db, chapterId, h.companyId, { isDirector: false });
    expect(after.apuntes).toBe(1);
    expect(after.total).toBe(1);
  });
  it("la Directiva suma las candidaturas nuevas; el resto de Timoneles no", async () => {
    const a = companies["bufete-alameda"];
    const director = await pendingDecisions(db, chapterId, a.companyId, { isDirector: true });
    expect(director.candidacies).toBeGreaterThan(0);
    expect(director.total).toBe(director.referrals + director.apuntes + director.candidacies);
    const plain = await pendingDecisions(db, chapterId, a.companyId, { isDirector: false });
    expect(plain.candidacies).toBe(0);
  });
});
