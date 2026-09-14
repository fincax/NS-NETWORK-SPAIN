/** Aval (D-042): el número público que respalda una Cesión o a un titular. Siempre con su explicación al lado. */
import { avalBand, AVAL_STATUS_LABEL, type ReferralAval, type TitularAval } from "@/core/aval";
import type { AvalStatus } from "@/core/types";

export function AvalBadge({ total, status }: { total: number | null | undefined; status?: AvalStatus | string | null }) {
  if (total === null || total === undefined) return <span className="badge">Aval · pendiente</span>;
  const band = avalBand(total);
  const tone = status === "NULO" ? "red" : band.key === "ALTO" || band.key === "SOLIDO" ? "green" : band.key === "EN_CONSTRUCCION" ? "amber" : "red";
  return <span className={`badge ${tone}`} title={band.label}>Aval {total}{status ? ` · ${AVAL_STATUS_LABEL[status as AvalStatus] ?? status}` : ""}</span>;
}

export function AvalNumber({ total, provisional }: { total: number; provisional?: boolean }) {
  const band = avalBand(total);
  return (
    <span className="encaje" aria-label={`Aval ${total} sobre 100, ${band.label}${provisional ? ", provisional" : ""}`}>
      {total}<small>{provisional ? "Aval provisional" : band.label}</small>
    </span>
  );
}

/** Las tres partes del Aval de una Cesión: Promesa, Veredicto, Eco. */
export function ReferralAvalParts({ aval }: { aval: ReferralAval }) {
  return (
    <ul className="plain">
      {aval.parts.map((p) => (
        <li key={p.key} className="row" style={{ alignItems: "baseline" }}>
          <span className="mono" style={{ minWidth: 80 }}>{p.label} · {Math.round(p.weight * 100)} %</span>
          <span className={p.value === null ? "mono" : undefined}>{p.value === null ? "pendiente" : `${Math.round(p.value * 100)} sobre 100`}</span>
          <span className="mono">{p.evidence}</span>
        </li>
      ))}
    </ul>
  );
}

/** Los cuatro bloques del Aval de un titular: nunca un número opaco. */
export function TitularAvalBlocks({ aval }: { aval: TitularAval }) {
  return (
    <ul className="plain">
      {aval.blocks.map((b) => (
        <li key={b.key} style={{ display: "grid", gap: 4 }}>
          <div className="row">
            <span className="mono" style={{ minWidth: 190 }}>{b.label} · {Math.round(b.weight * 100)} %</span>
            <span className="bar" aria-hidden="true"><span style={{ width: `${Math.round(b.value * 100)}%` }} /></span>
            <span className={`mono ${b.hasData ? "" : ""}`} style={{ minWidth: 70, textAlign: "right", color: b.hasData ? "var(--porcelain)" : undefined }}>{Math.round(b.value * 100)}{b.hasData ? "" : " · neutro"}</span>
          </div>
          <span className="mono">{b.evidence}</span>
        </li>
      ))}
    </ul>
  );
}
