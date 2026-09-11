import type { CSSProperties } from "react";
import styles from "./brand.module.css";

/**
 * "El Encuentro" · marca NS Network (versión aprobada 4b: sin relleno, trazo 3 u).
 * Un círculo (el club) partido en dos mitades que se desplazan en sentidos opuestos.
 * El hueco de contacto es lo único que la app anima.
 *
 * Estados (mismo dibujo, solo cambia posición/color):
 * - brand      posición abierta (S), tinta · el logotipo
 * - idle       "En reposo": mitades casi alineadas (±0.5, 0)
 * - analyzing  "Analizando": oscila entre cerrado y abierto, 2,4 s (4 s en arranque)
 * - found      "Ha encontrado algo": abierta + línea de contacto roja
 * - waiting    "Espera tu decisión": abierta, mitad derecha en acento
 *
 * Con prefers-reduced-motion la animación se desactiva y se muestra la posición abierta.
 */
export type NSMarkState = "brand" | "idle" | "analyzing" | "found" | "waiting";

export interface NSMarkProps {
  size?: number;
  state?: NSMarkState;
  /** Color de la marca; por defecto currentColor (tinta en la UI). */
  color?: string;
  /** Duración del ciclo de "Analizando". */
  duration?: string;
  /** Marca de agua: trazo 0.6 u. */
  watermark?: boolean;
  title?: string;
  className?: string;
}

const LEFT = "M16 4A12 12 0 0 0 16 28Z";
const RIGHT = "M16 4A12 12 0 0 1 16 28Z";

const OPEN_LEFT = "translate(-1.75 4)";
const OPEN_RIGHT = "translate(1.75 -4)";
const REST_LEFT = "translate(-0.5 0)";
const REST_RIGHT = "translate(0.5 0)";

export function NSMark({
  size = 28,
  state = "brand",
  color = "currentColor",
  duration = "var(--motion-mark-ui)",
  watermark = false,
  title,
  className,
}: NSMarkProps) {
  const analyzing = state === "analyzing";
  const rest = state === "idle";
  const rightColor = state === "waiting" ? "var(--color-accent)" : color;
  const animStyle = (name: string): CSSProperties | undefined =>
    analyzing ? { animation: `${name} ${duration} var(--motion-ease) infinite` } : undefined;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      strokeWidth={watermark ? 0.6 : 3}
      className={[styles.mark, analyzing ? styles.analyzing : "", className ?? ""].join(" ").trim()}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      data-state={state}
    >
      {title ? <title>{title}</title> : null}
      <path
        d={LEFT}
        stroke={color}
        transform={analyzing ? undefined : rest ? REST_LEFT : OPEN_LEFT}
        style={animStyle("ns-half-left")}
      />
      <path
        d={RIGHT}
        stroke={rightColor}
        transform={analyzing ? undefined : rest ? REST_RIGHT : OPEN_RIGHT}
        style={animStyle("ns-half-right")}
      />
      {state === "found" ? <rect x="15.25" y="8" width="1.5" height="16" fill="var(--color-accent)" /> : null}
    </svg>
  );
}
