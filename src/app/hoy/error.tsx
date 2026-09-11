"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Lockup } from "@/components/brand";
import { TabBar } from "@/components/hoy/TabBar";
import styles from "@/components/hoy/hoy.module.css";

export default function HoyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Observabilidad: en producción irá al sistema de telemetría.
    console.error("[hoy] error", error);
  }, [error]);

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <header className={styles.header}>
          <Lockup level="NS Sevilla" circle="Círculo 01" fontSize={18} markSize={28} />
        </header>
        <div className={styles.errorBox} role="alert">
          <h1 className={styles.errorTitle}>No hemos podido cargar tu síntesis.</h1>
          <p className={styles.errorBody}>
            Tu agente sigue trabajando y nada se ha perdido. Vuelve a intentarlo en unos segundos.
          </p>
          <div className={styles.errorActions}>
            <button type="button" className="btn btn-primary" onClick={() => reset()}>
              Reintentar
            </button>
            <Link href="/hoy" className="btn btn-secondary">
              Recargar Hoy
            </Link>
          </div>
        </div>
      </div>
      <TabBar active="hoy" />
    </div>
  );
}
