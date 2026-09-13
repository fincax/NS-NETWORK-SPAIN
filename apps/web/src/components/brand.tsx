/** Monograma NS (D-022) y avatar del Agente (brand/README.md). Solo el segmento de contacto se anima. */
export function Monogram({ size = 28, tone = "porcelain", state }: { size?: number; tone?: "porcelain" | "obsidian" | "institutional"; state?: "green" | "amber" }) {
  const fill = tone === "porcelain" ? "#F4F1EC" : tone === "obsidian" ? "#0B0D10" : "#0F2A4A";
  const contact = state === "green" ? "#2FBF71" : state === "amber" ? "#E8A33D" : undefined;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Monograma NS">
      <path d="M49 5 A27 27 0 0 0 49 59 Z" fill={fill} />
      <path d="M51 41 A27 27 0 0 1 51 95 Z" fill={fill} />
      {contact ? <rect x="48" y="41" width="4" height="18" fill={contact} /> : null}
    </svg>
  );
}

export type AgentState = "reposo" | "analizando" | "encontrado" | "esperando" | "sin-informacion";

export function AgentAvatar({ state = "reposo", label }: { state?: AgentState; label?: string }) {
  const fill = state === "sin-informacion" ? "none" : "#F4F1EC";
  const stroke = state === "sin-informacion" ? "#8A9098" : "none";
  const contact = state === "encontrado" || state === "analizando" ? "#2FBF71" : state === "esperando" ? "#E8A33D" : undefined;
  return (
    <span className={`agent ${state}`} title={label}>
      <svg viewBox="0 0 100 64" aria-hidden="true">
        <path d="M49 5 A27 27 0 0 0 49 59 Z" fill={fill} stroke={stroke} strokeWidth="2" />
        {contact ? <rect className="contact" x="49" y="41" width="3" height="18" fill={contact} /> : null}
      </svg>
      {label ? <span className="mono">{label}</span> : null}
    </span>
  );
}
