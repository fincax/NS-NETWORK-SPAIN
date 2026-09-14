/** Reglamento (D-043): integridad del registro de Normas y Ventajas. */
import { describe, expect, it } from "vitest";
import { RULEBOOK, normas, validateRulebook, ventajas } from "@/core/rulebook";
import { TrustEventKind } from "@/core/types";

describe("Reglamento", () => {
  it("es íntegro: identificadores únicos, vigentes con mecanismo y verificación, normas con consecuencia", () => {
    expect(validateRulebook()).toEqual([]);
  });
  it("las seis reglas inmutables están registradas como Normas y ninguna Ventaja es inmutable", () => {
    expect(normas().filter((r) => r.immutable)).toHaveLength(6);
    expect(ventajas().every((r) => !r.immutable)).toBe(true);
  });
  it("toda verificación con nombre de TrustEvent existe en el protocolo", () => {
    const kinds = new Set<string>(TrustEventKind.options);
    const audits = new Set(["VALUE_CONFIRMED", "HUMAN_DECISION", "INTRODUCED", "ECO_REQUESTED", "AGENT_DISCOVERY", "FOUNDING_REWARD", "COMMUNIQUE_MET", "COMMUNIQUE_MISSED"]);
    for (const r of RULEBOOK) for (const v of r.verification) expect(kinds.has(v) || audits.has(v), `${r.id} → ${v}`).toBe(true);
  });
  it("el validador detecta una regla vigente sin verificación", () => {
    expect(validateRulebook([{ ...RULEBOOK[0], id: "N-999", verification: [] }])).toContain("N-999: una regla VIGENTE necesita verificación");
  });
});
