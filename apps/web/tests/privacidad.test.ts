import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, schema, type Db } from "@/db/client";
import { parseCandidatura, submitCandidatura } from "@/services/candidatura";
import { CONSENTIMIENTO_CANDIDATURA, PRIVACIDAD_SECCIONES, PRIVACIDAD_VERSION } from "@/core/privacidad";

let db: Db;
beforeAll(async () => {
  db = await getDb();
});

const base = { fullName: "Lucía Vargas", companyName: "Vargas Interiorismo", email: "lucia@vargasinteriorismo.es", specialtyCode: "ARQUITECTURA", city: "Sevilla", message: "" };

describe("Aviso de privacidad en la candidatura (D-055)", () => {
  it("sin la casilla marcada no se guarda nada", async () => {
    const r = await submitCandidatura(db, { ...base, privacyAccepted: false });
    expect(r).toEqual({ ok: false, error: "PRIVACIDAD" });
    expect(await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.email, base.email) })).toBeUndefined();
  });

  it("los datos se validan antes que el consentimiento", async () => {
    const r = await submitCandidatura(db, { ...base, email: "sin-arroba", privacyAccepted: true });
    expect(r).toEqual({ ok: false, error: "DATOS" });
  });

  it("con la casilla marcada queda la versión del aviso y la fecha", async () => {
    const r = await submitCandidatura(db, { ...base, privacyAccepted: true, privacyVersion: PRIVACIDAD_VERSION });
    expect(r.ok).toBe(true);
    const row = (await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.email, base.email) }))!;
    expect(row.privacyVersion).toBe(PRIVACIDAD_VERSION);
    expect(row.privacyAcceptedAt).toBeInstanceOf(Date);
    expect(row.specialtyCode).toBe("ARQUITECTURA");
    await db.delete(schema.betaRequests).where(eq(schema.betaRequests.id, row.id));
  });

  it("el formulario se lee como lo envía el navegador", () => {
    const fd = new FormData();
    fd.set("fullName", " Lucía ");
    fd.set("companyName", "Vargas");
    fd.set("email", "l@v.es");
    fd.set("privacy", "on");
    fd.set("privacyVersion", PRIVACIDAD_VERSION);
    const parsed = parseCandidatura(fd);
    expect(parsed.privacyAccepted).toBe(true);
    expect(parsed.fullName).toBe("Lucía");
    const sin = new FormData();
    sin.set("fullName", "x");
    expect(parseCandidatura(sin).privacyAccepted).toBe(false);
  });

  it("el aviso cubre lo que exige el RGPD para informar al interesado", () => {
    const titles = PRIVACIDAD_SECCIONES.map((s) => s.title.toLowerCase());
    for (const needle of ["quién trata", "qué datos", "con qué base", "cuánto tiempo", "quién puede verlos", "tus derechos"]) {
      expect(titles.some((t) => t.includes(needle)), needle).toBe(true);
    }
    expect(CONSENTIMIENTO_CANDIDATURA).toMatch(/aviso de privacidad/);
  });
});
