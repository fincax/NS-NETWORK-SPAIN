import Link from "next/link";
import { NSMark } from "@/components/brand";
import { HouseIcon, InboxIcon, LayoutGridIcon, RadarIcon } from "@/components/icons";
import styles from "./hoy.module.css";

export type TabKey = "hoy" | "referidos" | "radar" | "agente" | "circulo";

const TABS: { key: TabKey; href: string; label: string; icon: React.ReactNode }[] = [
  { key: "hoy", href: "/hoy", label: "Hoy", icon: <HouseIcon /> },
  { key: "referidos", href: "/referidos", label: "Referidos", icon: <InboxIcon /> },
  { key: "radar", href: "/radar", label: "Radar", icon: <RadarIcon /> },
  { key: "agente", href: "/agente", label: "Agente", icon: <NSMark size={20} /> },
  { key: "circulo", href: "/circulo", label: "Círculo", icon: <LayoutGridIcon /> },
];

export function TabBar({ active }: { active: TabKey }) {
  return (
    <nav className={styles.tabbar} aria-label="Navegación principal">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} className={styles.tab} aria-current={t.key === active ? "page" : undefined}>
          {t.icon}
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
