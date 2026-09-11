import Link from "next/link";
import { Lockup } from "@/components/brand";
import { formatCircle } from "@/lib/format";
import { CARLOS } from "@/demo/ns-sevilla";
import { TabBar, type TabKey } from "./TabBar";
import styles from "./hoy.module.css";

/**
 * Pantalla aún no diseñada. Mantiene la navegación viva sin fingir contenido:
 * el handoff solo cubre Hoy y el arranque.
 */
export function PendingScreen({ tab, title, body }: { tab: TabKey; title: string; body: string }) {
  const circle = CARLOS.circle;
  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <header className={styles.header}>
          <Lockup level={`NS ${circle.city}`} circle={formatCircle(circle.number)} fontSize={18} markSize={28} />
        </header>
        <h1 className={styles.greeting}>{title}</h1>
        <div className={styles.errorBox}>
          <p className={styles.errorBody}>{body}</p>
          <div className={styles.errorActions}>
            <Link href="/hoy" className="btn btn-secondary">
              Volver a Hoy
            </Link>
          </div>
        </div>
      </div>
      <TabBar active={tab} />
    </div>
  );
}
