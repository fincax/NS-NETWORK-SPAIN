"use client";
import { useEffect, useState } from "react";

/**
 * Invitación a instalar NS en el móvil (D-039). Solo aparece la primera vez, fuera de la app instalada,
 * y se puede descartar. Android/Chrome: botón directo. iPhone: instrucciones de Safari.
 */
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const KEY = "ns.install.dismissed";

export function InstallHint() {
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {
      /* sin almacenamiento: se muestra igual */
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const ua = navigator.userAgent;
    const isIos = /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    // fuera del cuerpo síncrono del efecto, como pide React
    if (isIos) queueMicrotask(() => setMode("ios"));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (mode === "hidden") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* nada */
    }
    setMode("hidden");
  };
  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") dismiss();
  };

  return (
    <div className="card install" role="region" aria-label="Instalar NS en tu móvil">
      <div>
        <p className="eyebrow">NS en tu móvil</p>
        <strong>Instala NS como una app.</strong>
        <p className="lead" style={{ fontSize: 14, marginTop: 4 }}>
          {mode === "android" ? "Tendrás el icono en tu pantalla de inicio, con el número de decisiones que te esperan, y el atajo para apuntar un referido." : "En Safari, pulsa el botón Compartir y luego “Añadir a pantalla de inicio”. Tendrás el icono con el número de decisiones que te esperan y el atajo para apuntar un referido."}
        </p>
      </div>
      <div className="actions">
        {mode === "android" ? <button type="button" className="btn primary small" onClick={install}>Instalar</button> : null}
        <button type="button" className="btn small ghost" onClick={dismiss}>Ahora no</button>
      </div>
    </div>
  );
}
