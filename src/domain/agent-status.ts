import type { AgentStatus, MemberContext, TodayDigest } from "./types";

/**
 * Estado del indicador del agente en la cabecera de Hoy.
 * - El agente está trabajando → "Analizando" (respira).
 * - Hay un referido pendiente y el agente no está activo → "Espera tu decisión".
 * - Nada pendiente y agente parado → "En reposo".
 * Nunca "found" aquí: ese estado se reserva al momento de la detección
 * (fila y card del referido, Agent Room).
 */
export function deriveAgentStatus(
  member: Pick<MemberContext, "agentLive">,
  digest: Pick<TodayDigest, "referralsPending">,
): AgentStatus {
  if (member.agentLive) return "analyzing";
  if (digest.referralsPending > 0) return "waiting";
  return "idle";
}

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  idle: "Agente en reposo",
  analyzing: "Agente activo",
  found: "Ha encontrado algo",
  waiting: "Espera tu decisión",
};
