"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="stack">
      <p className="eyebrow">Algo no ha ido bien</p>
      <h1>Tu Agente no ha podido completar esta acción.</h1>
      <div className="notice error">{error.message}</div>
      <div className="actions">
        <button className="btn" onClick={() => reset()}>Reintentar</button>
      </div>
    </div>
  );
}
