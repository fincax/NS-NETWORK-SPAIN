"use client";
import { useState, useSyncExternalStore } from "react";

type Recognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start(): void; stop(): void };
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Dictado (D-052): el Timonel habla y el texto cae en el campo. Usa el reconocimiento del propio móvil; si no existe, el botón no aparece. */
export function DictationButton({ target, label = "Dictar" }: { target: string; label?: string }) {
  const [listening, setListening] = useState(false);
  const supported = useSyncExternalStore(() => () => {}, () => Boolean(getCtor()), () => false);
  if (!supported) return null;
  const start = () => {
    const ctor = getCtor();
    if (!ctor) return;
    const rec = new ctor();
    rec.lang = "es-ES";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      const el = document.getElementById(target) as HTMLTextAreaElement | HTMLInputElement | null;
      if (!el) return;
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      el.value = (el.value ? `${el.value.trimEnd()} ` : "") + text.trim();
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
    (window as unknown as { __nsRec?: Recognition }).__nsRec = rec;
  };
  const stop = () => {
    (window as unknown as { __nsRec?: Recognition }).__nsRec?.stop();
    setListening(false);
  };
  return (
    <button type="button" className={`btn small ${listening ? "primary" : "ghost"}`} onClick={listening ? stop : start} aria-pressed={listening} aria-label={listening ? "Detener dictado" : `${label} por voz`}>
      {listening ? "● Escuchando… tocar para parar" : `🎙 ${label}`}
    </button>
  );
}
