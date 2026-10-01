import Link from "next/link";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { communiqueHistory, comunicadoStatus } from "@/services/comunicado";
import { CapacityNow, DELTA_LABEL, SOURCE_LABEL, STATUS_LABEL, weekRangeLabel, isoWeekLabel, type CommuniqueStatus } from "@/core/comunicado";
import { dateTime } from "@/lib/format";
import { AgentAvatar } from "@/components/brand";
import { approveCommuniqueAction } from "./actions";

/**
 * Despacho · Tu Comunicado de esta semana (Protocolo II, D-018 · D-069).
 * El Agente lo tiene listo; el Timonel lo lee en 60 segundos y lo aprueba con un toque. Puede añadir una novedad en una
 * frase, un Sondeo para la Sala y ajustar su capacidad. Nada sale de la empresa que no esté en las capas PUBLIC y CHAPTER.
 */
export default async function ComunicadoPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { member, company, chapter } = await requireMember();
  const { ok, error } = await searchParams;
  const db = await getDb();
  const status = await comunicadoStatus(db, chapter.id, company.id);
  const history = await communiqueHistory(db, company.id, 8);
  const row = status.row;
  const tone = row?.status === "APPROVED" ? "green" : status.continuityStreak >= 2 ? "red" : "amber";
  const capacities = CapacityNow.options;

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · Despacho · Protocolo II</p>
          <h1>Tu Comunicado de esta semana.</h1>
          <p className="lead">Semana {status.weekLabel} · {weekRangeLabel(status.weekStart)}. Lo que la Sala sabrá de {company.name}: lo estable y lo que ha cambiado. Tu Agente lo redacta; tú lo apruebas.</p>
        </div>
        <AgentAvatar state={row?.status === "APPROVED" ? "reposo" : "esperando"} label={row?.status === "APPROVED" ? "Comunicado aprobado" : "Tu Agente espera tu toque"} />
      </div>

      {error ? <div className="notice error" role="alert">{error}</div> : null}
      {ok ? <div className="notice" role="status" style={{ borderColor: "var(--green)" }}><strong>Comunicado aprobado.</strong> Los Agentes de la Sala ya lo han recibido; el domingo sale en la Gaceta y cada Timonel verá lo que le importa.</div> : null}

      <section className={`card ${tone} row`} style={{ justifyContent: "space-between", gap: 14 }} aria-label="Estado del Comunicado">
        <span><strong>{status.label}.</strong> {status.nextStep}</span>
        <span className="mono">Norma NS 4 · Dar a Conocer</span>
      </section>

      {!row ? (
        <div className="card quiet">
          <h3>Tu Agente no puede redactar tu Comunicado.</h3>
          <p style={{ marginTop: 6 }}>Sin ADN de Empresa no hay nada que contar a la Sala. Haz la entrevista con tu Agente y el borrador aparecerá aquí.</p>
          <div className="actions"><Link href="/entrevista" className="btn primary">Hacer la entrevista</Link></div>
        </div>
      ) : (
        <div className="grid grid-2">
          <section className="card" style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <p className="eyebrow">Lo que ha cambiado · delta</p>
            {row.delta.length + row.declared.length === 0 ? (
              <p className="lead" style={{ fontSize: 14 }}>Sin novedades esta semana. Tu Agente no ha visto cambios en tu ADN ni hechos nuevos en la Sala. Puedes añadir una abajo o aprobar tal cual: lo estable sigue vigente.</p>
            ) : (
              <ul className="plain">
                {[...row.delta, ...row.declared].map((d, i) => (
                  <li key={i} className="row" style={{ alignItems: "flex-start" }}>
                    <span className={`badge ${d.source === "VERIFIED" ? "green" : d.source === "DECLARED_BY_MEMBER" ? "amber" : ""}`}>{DELTA_LABEL[d.kind]}</span>
                    <span style={{ flex: 1 }}>{d.text}<span className="mono" style={{ marginLeft: 8 }}>{SOURCE_LABEL[d.source]}</span></span>
                  </li>
                ))}
              </ul>
            )}
            {row.encargos.length ? (
              <>
                <p className="eyebrow" style={{ marginTop: 6 }}>Encargos vigentes · lo que buscas ahora</p>
                <ul className="plain">{row.encargos.map((e) => <li key={e.id}>{e.summary}{e.trigger ? <span className="badge" style={{ marginLeft: 8 }}>{e.trigger.toLowerCase().replaceAll("_", " ")}</span> : null}</li>)}</ul>
              </>
            ) : null}
            {row.asks.length ? (
              <>
                <p className="eyebrow" style={{ marginTop: 6 }}>Sondeos a la Sala</p>
                <ul className="plain">{row.asks.map((a, i) => <li key={i}>«{a}»</li>)}</ul>
              </>
            ) : null}
          </section>

          <section className="card" style={{ display: "grid", gap: 10, alignContent: "start" }}>
            <p className="eyebrow">Lo estable · lo que eres</p>
            <p><strong>Plaza:</strong> {row.stable.specialty}</p>
            <p className="lead" style={{ fontSize: 14 }}>{row.stable.description}</p>
            <p><strong>Ofreces:</strong> {row.stable.offering.join(" · ") || "—"}</p>
            {row.stable.not_offering.length ? <p><strong>No ofreces:</strong> {row.stable.not_offering.join(" · ")}</p> : null}
            <p><strong>Cliente ideal:</strong> {row.stable.ideal_customer}</p>
            {row.stable.perfect_referral ? <p><strong>Cesión perfecta:</strong> {row.stable.perfect_referral}</p> : null}
            <p className="mono">Capacidad ahora: {row.stable.capacity_now} · señales: {row.stable.triggers.map((t) => t.toLowerCase().replaceAll("_", " ")).join(", ") || "—"} · ADN v{row.dnaVersion}</p>
            <p className="mono">Solo capas PUBLIC y CHAPTER. Nunca lo marcado como confidencial ni datos de terceros.</p>
          </section>
        </div>
      )}

      {row && row.status === "DRAFT" ? (
        <form action={approveCommuniqueAction} className="card" style={{ display: "grid", gap: 14 }} aria-label="Aprobar el Comunicado">
          <p className="eyebrow">Antes de aprobar · opcional</p>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="note">Una novedad de esta semana, en una frase</label>
              <input id="note" name="note" maxLength={280} placeholder="Abrimos coordinación de actividades para obras con varias contratas" />
              <span className="hint">Concreto y corto, sin adjetivos: es información de trabajo para los Agentes y los Timoneles de la Sala.</span>
            </div>
            <div className="field">
              <label htmlFor="capacity">Capacidad ahora</label>
              <select id="capacity" name="capacity" defaultValue={row.stable.capacity_now}>{capacities.map((c) => <option key={c} value={c}>{c}</option>)}</select>
              <span className="hint">Se guarda en tu ADN: los Agentes la usan para no cederte lo que no puedes atender.</span>
            </div>
            <div className="field">
              <label htmlFor="ask">Un Sondeo a la Sala</label>
              <input id="ask" name="ask" maxLength={200} placeholder="¿Alguien conoce al director financiero de…?" />
            </div>
          </div>
          <div className="actions">
            <button className="btn primary" type="submit">Aprobar y enviar a la Sala</button>
            <span className="mono">Cierra el domingo a las 20:00 · {status.hoursLeft} h · sin tu toque saldrá solo lo estable</span>
          </div>
        </form>
      ) : null}

      <section className="section">
        <h2>Histórico de Comunicados</h2>
        {history.length === 0 ? (
          <div className="card quiet"><h3>Todavía ninguno publicado.</h3><p style={{ marginTop: 6 }}>Cada domingo, lo aprobado (o lo estable, si no hubo toque) queda aquí semana a semana.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Semana</th><th>Estado</th><th>Novedades</th><th>Aprobado</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="mono">{isoWeekLabel(h.weekStart)} · {weekRangeLabel(h.weekStart)}</td>
                    <td><span className={`badge ${h.status === "APPROVED" ? "green" : h.continuityStreak >= 2 ? "red" : "amber"}`}>{STATUS_LABEL[h.status as CommuniqueStatus]}{h.status === "CONTINUITY" && h.continuityStreak > 1 ? ` · ${h.continuityStreak} seguidos` : ""}</span></td>
                    <td>{[...h.delta, ...h.declared].map((d) => d.text).join(" · ") || <span className="mono">sin novedades</span>}</td>
                    <td className="mono">{h.approvedAt ? dateTime(h.approvedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mono" style={{ marginTop: 10 }}>Firmado por {member.fullName}. Lo que apruebas lo reciben los Agentes de la Sala en el acto y los Timoneles en la <Link href="/gaceta">Gaceta</Link> del domingo.</p>
      </section>
    </div>
  );
}
