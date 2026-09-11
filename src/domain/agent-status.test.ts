import { deriveAgentStatus } from "./agent-status";

describe("deriveAgentStatus", () => {
  it("agente activo → analizando aunque haya referido pendiente", () => {
    expect(deriveAgentStatus({ agentLive: true }, { referralsPending: 1 })).toBe("analyzing");
  });
  it("agente parado con referido pendiente → espera tu decisión", () => {
    expect(deriveAgentStatus({ agentLive: false }, { referralsPending: 1 })).toBe("waiting");
  });
  it("agente parado sin referidos → en reposo (cero rojo)", () => {
    expect(deriveAgentStatus({ agentLive: false }, { referralsPending: 0 })).toBe("idle");
  });
});
