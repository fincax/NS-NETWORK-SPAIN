import { deriveAgentStatus } from "@/domain/agent-status";
import type { TodayView } from "@/domain/types";
import { CARLOS, REFERRAL_DOS_HERMANAS, digestQuietNight, digestScenarioA } from "@/demo/ns-sevilla";

/**
 * Escenarios demo de la home. Se seleccionan con `?demo=` mientras no exista backend.
 * - (por defecto) Escenario A: un referido preparado para aprobación.
 * - sin-referidos: noche tranquila, cero rojo.
 * - agente-parado: referido pendiente y agente en reposo → indicador "Espera tu decisión".
 * - cargando: retrasa la respuesta para mostrar el arranque (5b).
 * - error: fuerza el estado de error.
 */
export const DEMO_SCENARIOS = ["escenario-a", "sin-referidos", "agente-parado", "cargando", "error"] as const;
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export function parseScenario(value: string | string[] | undefined): DemoScenario {
  const v = Array.isArray(value) ? value[0] : value;
  return (DEMO_SCENARIOS as readonly string[]).includes(v ?? "") ? (v as DemoScenario) : "escenario-a";
}

export async function getTodayView(scenario: DemoScenario, now = new Date()): Promise<TodayView> {
  if (scenario === "cargando") await new Promise((r) => setTimeout(r, 2800));
  if (scenario === "error") throw new Error("DEMO_ERROR: no se pudo cargar la síntesis del agente.");

  const member = scenario === "agente-parado" ? { ...CARLOS, agentLive: false } : CARLOS;
  const digest = scenario === "sin-referidos" ? digestQuietNight(now) : digestScenarioA(now);
  const referrals = digest.referralsPending > 0 ? [REFERRAL_DOS_HERMANAS] : [];

  return { member, digest, referrals, agentStatus: deriveAgentStatus(member, digest) };
}
