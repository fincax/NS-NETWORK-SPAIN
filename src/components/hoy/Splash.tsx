import { NSMark } from "@/components/brand";
import { formatCircle } from "@/lib/format";
import styles from "./hoy.module.css";

/** Arranque (5b): el círculo se abre al cargar. Se usa como estado de carga de la app. */
export function Splash({ city = "Sevilla", circle = 1 }: { city?: string; circle?: number }) {
  return (
    <div className={styles.splash} role="status" aria-live="polite" aria-label="Cargando NS Sevilla">
      <div className={styles.splashMark}>
        <NSMark size={160} state="analyzing" duration="var(--motion-mark-splash)" />
      </div>
      <div className={styles.splashFoot}>
        <span className={styles.splashTitle}>NS {city}</span>
        <span className="kicker">{formatCircle(circle)} · Human trust. Agentic execution.</span>
      </div>
    </div>
  );
}
