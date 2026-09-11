"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { NSMark } from "@/components/brand";
import { ArrowRightIcon } from "@/components/icons";
import type { ReferralSummary } from "@/domain/types";
import { CONFIDENCE_LABEL, formatDayRange, formatEuroRange, formatPercent } from "@/lib/format";
import styles from "./hoy.module.css";

/**
 * Referral card compacta de Hoy. Muestra siempre WHY · EVIDENCE · CONFIDENCE · UNKNOWN · NEXT ACTION.
 * "Por qué encaja" es un toggle local sin animación de altura.
 */
export function ReferralCard({ referral }: { referral: ReferralSummary }) {
  const [open, setOpen] = useState(false);
  const whyId = useId();
  const r = referral;

  return (
    <article className={styles.card} aria-labelledby={`${whyId}-title`}>
      <div className={styles.cardTop}>
        <span className={styles.cardKicker}>
          <NSMark size={18} state="waiting" />
          Oportunidad detectada
        </span>
        <span className={styles.cardScore}>
          {formatPercent(r.matchScore)} · {CONFIDENCE_LABEL[r.confidence]}
        </span>
      </div>

      <h2 id={`${whyId}-title`} className={styles.cardTitle}>
        {r.title}
      </h2>

      <p className={styles.cardBody}>
        Origen: {r.origin}. Trigger: {r.trigger}.
      </p>

      <dl className={styles.cardFacts}>
        <div>
          <dt>Valor estimado</dt>
          <dd>{formatEuroRange(r.valuePotential, "compact")}</dd>
        </div>
        <div>
          <dt>Timing</dt>
          <dd>{formatDayRange(r.timing)}</dd>
        </div>
      </dl>

      <button
        type="button"
        className={styles.whyToggle}
        aria-expanded={open}
        aria-controls={whyId}
        onClick={() => setOpen((v) => !v)}
      >
        Por qué encaja
        <span>{open ? "Ocultar" : "Ver"}</span>
      </button>

      {open ? (
        <ul id={whyId} className={styles.why}>
          {r.explanation.why.map((w) => (
            <li key={w}>
              <span aria-hidden="true">+</span>
              <span className="visually-hidden">A favor: </span>
              {w}
            </li>
          ))}
          {r.explanation.unknowns.map((u) => (
            <li key={u} className={styles.unknown}>
              <span aria-hidden="true">–</span>
              <span className="visually-hidden">Pendiente: </span>
              {u}
            </li>
          ))}
        </ul>
      ) : null}

      <p className={styles.cardNote}>
        {r.sharedWithThirdParties ? "Ya se ha compartido con la otra parte." : "Nada se ha compartido todavía. Tú decides."}
      </p>

      <Link href={`/referidos/${r.id}`} className={`btn btn-primary btn-block ${styles.cardCta}`}>
        {r.explanation.nextAction}
        <ArrowRightIcon />
      </Link>
    </article>
  );
}
