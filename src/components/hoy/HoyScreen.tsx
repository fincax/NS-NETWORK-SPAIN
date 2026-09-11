import Link from "next/link";
import { Lockup, NSMark } from "@/components/brand";
import { MicIcon, RadarIcon } from "@/components/icons";
import { AGENT_STATUS_LABEL } from "@/domain/agent-status";
import { greetingFor } from "@/domain/greeting";
import type { TodayView } from "@/domain/types";
import { formatCircle, formatEuroRange, formatSince } from "@/lib/format";
import { ReferralCard } from "./ReferralCard";
import { TabBar } from "./TabBar";
import styles from "./hoy.module.css";

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : many;
}

/** Hoy (5a): "¿Qué ha hecho mi red por mi empresa desde la última vez que entré?" */
export function HoyScreen({ view, now }: { view: TodayView; now: Date }) {
  const { member, digest, referrals, agentStatus } = view;
  const circleLabel = formatCircle(member.circle.number);
  const hasReferral = digest.referralsPending > 0 && referrals.length > 0;
  const referral = referrals[0];

  return (
    <div className={styles.screen}>
      <div className={styles.content}>
        <header className={styles.header}>
          <Lockup level={`NS ${member.circle.city}`} circle={circleLabel} fontSize={18} markSize={28} />
          <span className={styles.agentIndicator} data-status={agentStatus} aria-live="polite">
            <NSMark size={16} state={agentStatus} />
            {AGENT_STATUS_LABEL[agentStatus]}
          </span>
        </header>

        <h1 className={styles.greeting}>
          {greetingFor(now)}, {member.firstName}.
        </h1>
        <p className={styles.since}>Mientras estabas fuera · desde {formatSince(digest.since, now)}</p>

        <ul className={styles.ledger} aria-label="Resumen de la actividad de tu red">
          <li className={styles.row}>
            <span className={styles.figure}>{digest.conversations}</span>
            <span>{plural(digest.conversations, "conversación entre agentes", "conversaciones entre agentes")}</span>
          </li>
          <li className={styles.row}>
            <span className={styles.figure}>{digest.signals}</span>
            <span>
              {plural(digest.signals, "señal relacionada", "señales relacionadas")} con {member.company.shortName}
            </span>
          </li>
          <li className={styles.row}>
            <span className={styles.figure}>{digest.matches}</span>
            <span>{plural(digest.matches, "match investigado", "matches investigados")}</span>
          </li>
          {hasReferral ? (
            <li className={styles.rowHost}>
              <Link href="/referidos" className={styles.rowLink}>
                <span className={styles.figure}>{digest.referralsPending}</span>
                <span className={styles.rowText}>
                  {plural(digest.referralsPending, "referido preparado", "referidos preparados")} para tu aprobación
                </span>
                <NSMark size={16} state="waiting" className={styles.rowMark} />
              </Link>
            </li>
          ) : (
            <li className={styles.row}>
              <span className={styles.figure}>0</span>
              <span>referidos pendientes de tu aprobación</span>
            </li>
          )}
        </ul>

        <section className={styles.value} aria-label="Valor potencial detectado">
          <div className="kicker">Valor potencial detectado</div>
          {digest.valuePotential ? (
            <div className={styles.valueFigure}>{formatEuroRange(digest.valuePotential)}</div>
          ) : (
            <div className={styles.valueEmpty}>Sin oportunidades cuantificadas esta noche.</div>
          )}
        </section>
      </div>

      {hasReferral && referral ? (
        <div className={styles.cardWrap}>
          <ReferralCard referral={referral} />
        </div>
      ) : (
        <section className={styles.quiet} aria-label="Sin referidos pendientes">
          <div className={styles.quietBox}>
            <h2 className={styles.quietTitle}>Tu agente sigue trabajando.</h2>
            <p className={styles.quietBody}>
              No hay ningún referido que revisar. Cuando un match supere el umbral de calidad y compliance lo verifique,
              lo verás aquí antes que en ningún otro sitio.
            </p>
          </div>
        </section>
      )}

      <nav className={styles.actions} aria-label="Acciones rápidas">
        <Link href="/senales/nueva" className={styles.action}>
          <MicIcon />
          <span className={styles.actionTitle}>He sabido que…</span>
          <span className={styles.actionSub}>Nueva señal · 30 s</span>
        </Link>
        <Link href="/radar" className={styles.action}>
          <RadarIcon />
          <span className={styles.actionTitle}>Radar</span>
          <span className={styles.actionSub}>
            {member.circle.activeSignals} {plural(member.circle.activeSignals, "señal activa", "señales activas")} ·{" "}
            {member.circle.seats.occupied >= member.circle.seats.total
              ? "círculo completo"
              : `${member.circle.seats.occupied} de ${member.circle.seats.total} plazas`}
          </span>
        </Link>
      </nav>

      <TabBar active="hoy" />
    </div>
  );
}
