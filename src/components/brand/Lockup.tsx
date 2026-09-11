import { NSMark, type NSMarkState } from "./NSMark";
import styles from "./brand.module.css";

export type LockupLevel = "NS Network" | "NS España" | "NS Sevilla" | (string & {});

export interface LockupProps {
  /** La marca no cambia entre niveles; solo cambia la palabra. */
  level: LockupLevel;
  /** Sufijo del círculo, p. ej. "Círculo 01". */
  circle?: string;
  /** Tamaño de fuente del wordmark. La marca mide 1.1–1.3× (por defecto ≈1.5× en app: 28/18). */
  fontSize?: number;
  markSize?: number;
  markState?: NSMarkState;
  className?: string;
}

export function Lockup({ level, circle, fontSize = 18, markSize, markState = "brand", className }: LockupProps) {
  const mark = markSize ?? Math.round(fontSize * 1.55);
  return (
    <span className={[styles.lockup, className ?? ""].join(" ").trim()}>
      <NSMark size={mark} state={markState} />
      <span className={styles.wordmark} style={{ fontSize }}>
        {level}
      </span>
      {circle ? <span className={styles.circle}>{circle}</span> : null}
    </span>
  );
}
