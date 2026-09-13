import { STATE_LABEL } from "@/core/state-machine";
import type { ReferralState } from "@/core/types";

const TONE: Partial<Record<ReferralState, string>> = {
  ORIGINATOR_PENDING: "amber", RECEIVER_PENDING: "amber", DIRECTOR_PENDING: "amber", APPROVED: "amber",
  INTRO_AUTHORIZED: "green", INTRODUCED: "green", MEETING: "green", COMMERCIAL_OPPORTUNITY: "green", WON: "green", VALUE_CONFIRMED: "green",
  BLOCKED: "red", REJECTED_BY_MEMBER: "red", DISQUALIFIED: "red", EXPIRED: "red", LOST: "red",
};

export function StateBadge({ state }: { state: string }) {
  const tone = TONE[state as ReferralState] ?? "";
  return <span className={`badge ${tone}`}>{STATE_LABEL[state as ReferralState] ?? state}</span>;
}

export function Encaje({ total, band }: { total: number; band: string }) {
  const label = { HIGH: "Confianza alta", GOOD: "Buen encaje", PARTIAL: "Encaje parcial", LOW: "Encaje bajo" }[band] ?? band;
  return (
    <span className="encaje" aria-label={`Encaje ${Math.round(total * 100)} por ciento, ${label}`}>
      {Math.round(total * 100)} %<small>{label}</small>
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card quiet">
      <h3>{title}</h3>
      {children ? <p style={{ marginTop: 6 }}>{children}</p> : null}
    </div>
  );
}
