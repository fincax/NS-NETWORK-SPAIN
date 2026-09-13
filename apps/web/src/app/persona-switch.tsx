"use client";
import { useTransition } from "react";
import { setPersona } from "./actions";

export function PersonaSwitch({ members, currentId }: { members: { id: string; fullName: string; companyName: string; isDirector: boolean }[]; currentId: string }) {
  const [pending, start] = useTransition();
  return (
    <label>
      <span style={{ marginRight: 8 }}>Timonel</span>
      <select value={currentId} disabled={pending} onChange={(e) => start(() => setPersona(e.target.value))} aria-label="Timonel activo (demo)">
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.fullName} · {m.companyName}{m.isDirector ? " · Directiva" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
