"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Número en el icono (D-039): lo que espera el toque del Timonel. Se pinta al cargar, al cambiar de pantalla
 * y se refresca cada minuto mientras la pestaña está visible. Funciona en la app instalada (Android, iOS 16.4+,
 * escritorio con Chrome/Edge); en un navegador normal, el número va en el título de la pestaña.
 */
type BadgeNavigator = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

function paint(total: number) {
  const nav = navigator as BadgeNavigator;
  try {
    if (total > 0) nav.setAppBadge?.(total);
    else nav.clearAppBadge?.();
  } catch {
    /* sin soporte: no pasa nada */
  }
  const base = document.title.replace(/^\(\d+\)\s*/, "");
  const next = total > 0 ? `(${total}) ${base}` : base;
  if (document.title !== next) document.title = next;
}

export function AppBadge({ initial }: { initial: number }) {
  const path = usePathname();
  const last = useRef(initial);

  // Al cambiar de pantalla, Next reescribe el título: se vuelve a poner el número un instante después.
  useEffect(() => {
    last.current = initial;
    const t = setTimeout(() => paint(last.current), 150);
    return () => clearTimeout(t);
  }, [path, initial]);

  useEffect(() => {
    let stop = false;
    const refresh = async () => {
      if (stop || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/pending", { cache: "no-store" });
        if (res.ok) {
          last.current = ((await res.json()) as { total: number }).total;
          paint(last.current);
        }
      } catch {
        /* sin red: se conserva el último número */
      }
    };
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stop = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return null;
}
