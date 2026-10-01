import Link from "next/link";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { brujula, DISMISS_REASONS } from "@/services/brujula";
import { eur } from "@/lib/format";
import { AgentAvatar } from "@/components/brand";
import { toqueAction } from "../hoy/actions";
import { dismissMoveAction } from "./actions";

/**
 * Brújula (Protocolo III, D-019 · D-072). Privada: solo el Timonel y su Agente. Cuatro bloques: dónde estás, por qué,
 * qué ganas y los Movimientos de la semana, cada uno con un toque o un descarte con motivo.
 */
export default async function BrujulaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { member, company, chapter } = await requireMember();
  const { error } = await searchParams;
  const db = await getDb();
  const b = await brujula(db, { chapterId: chapter.id, companyId: company.id });
  const { compromiso } = b.donde;
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);
  const rate = (a: number, t: number) => (t ? `${Math.round((a / t) * 100)} %` : "sin datos");
  const compromisoTone = compromiso.lastAction === "RELEASE_NOTICE" || compromiso.missedStreak >= 2 ? "red" : compromiso.thisWeek.validCount >= compromiso.minimum ? "green" : "amber";

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{company.name} · Brújula · semana {b.weekLabel}</p>
          <h1>Lo que tu Agente ha estudiado para ti, {member.fullName.split(" ")[0]}.</h1>
          <p className="lead">Dónde estás, por qué, qué ganas y qué hacer esta semana. Solo tú lo ves: la Brújula nunca sale de tu empresa.</p>
        </div>
        <AgentAvatar state="analizando" label="Tu Agente estudia cómo mejorar tus resultados" />
      </div>
      {error ? <div className="notice error" role="alert">{error}</div> : null}

      <section aria-label="Movimientos">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{b.movimientosObjetivo === 5 ? "Cinco Movimientos para esta semana" : "Tres Movimientos para esta semana"}</h2>
          <span className="spacer" />
          <span className="mono">{b.movimientosObjetivo === 5 ? "una semana sin ceder: tu Agente propone cinco" : "cada uno, un toque"}</span>
        </div>
        {b.movimientos.length === 0 ? (
          <div className="card quiet"><h3>Tu Agente no tiene Movimientos con confianza suficiente.</h3><p style={{ marginTop: 6 }}>Dale dos datos: apunta un referido o amplía tu ADN con la entrevista, y la Brújula tendrá con qué trabajar.</p><div className="actions"><Link href="/apunte" className="btn primary">Apuntar un referido</Link><Link href="/entrevista" className="btn">Ampliar mi ADN</Link></div></div>
        ) : (
          <ol className="toques">
            {b.movimientos.map((m, i) => (
              <li key={m.key} className={`toque ${m.kind === "CEDER" || m.kind === "PROPONER" ? "amber" : ""}`}>
                <div className="ctx">
                  <span className="mono">{i + 1} · {m.kind.charAt(0) + m.kind.slice(1).toLowerCase()} · {m.origin} · confianza {m.confidence.toLowerCase()}</span>
                  <strong>{m.title}</strong>
                  <p>{m.why}</p>
                </div>
                <div className="act">
                  {m.primary ? (
                    <form action={toqueAction}>
                      <input type="hidden" name="action" value={m.primary.action} />
                      {Object.entries(m.primary.payload).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                      <button className="btn primary" type="submit">{m.primary.label}</button>
                    </form>
                  ) : null}
                  <Link href={m.href} className={`btn ${m.primary ? "ghost" : ""}`}>{m.hrefLabel}</Link>
                  <form action={dismissMoveAction} className="row" style={{ gap: 6, flexBasis: "100%", justifyContent: "flex-end" }}>
                    <input type="hidden" name="key" value={m.key} />
                    <select name="reason" aria-label="Motivo para descartar" defaultValue="" className="mono" style={{ background: "var(--obsidian)", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px", color: "var(--porcelain)" }}>
                      <option value="" disabled>Descartar…</option>
                      {DISMISS_REASONS.map((r) => <option key={r.key} value={r.key}>{r.text}</option>)}
                    </select>
                    <button className="btn small ghost" type="submit">Descartar</button>
                  </form>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="grid grid-2">
        <section className="card" style={{ display: "grid", gap: 10, alignContent: "start" }} aria-label="Dónde estás">
          <p className="eyebrow">1 · Dónde estás</p>
          <p><span className={`badge ${compromisoTone}`}>Ritmo · {compromiso.label}</span> <span className="mono">{compromiso.thisWeek.validCount} de {compromiso.minimum} esta semana{compromiso.thisWeek.distinctSpecialties > 1 ? ` · ${compromiso.thisWeek.distinctSpecialties} especialidades` : ""}</span></p>
          <p className="lead" style={{ fontSize: 14 }}>{compromiso.nextStep}</p>
          <p><span className={`badge ${b.donde.comunicado.status === "APPROVED" ? "green" : "amber"}`}>Comunicado · {b.donde.comunicado.label}</span></p>
          <p><strong>Recibes</strong> <span className="money">{eur(b.donde.recibes.valueMonth)}</span> contrastados este mes · {eur(b.donde.recibes.valueTotal)} acumulado · aceptas {rate(b.donde.recibes.accepted, b.donde.recibes.decided)} de lo que te ceden</p>
          <p><strong>Das</strong> <span className="money">{eur(b.donde.das.valueMonth)}</span> contrastados este mes · {eur(b.donde.das.valueTotal)} acumulado · tus Cesiones se aceptan al {rate(b.donde.das.accepted, b.donde.das.decided)}{b.donde.das.salaRate !== null ? ` (Sala ${Math.round(b.donde.das.salaRate * 100)} %)` : ""}</p>
        </section>

        <section className="card" style={{ display: "grid", gap: 10, alignContent: "start" }} aria-label="Por qué">
          <p className="eyebrow">2 · Por qué</p>
          <ul className="plain">
            {b.porque.map((p, i) => <li key={i} style={{ display: "grid", gridTemplateColumns: "18px 1fr", gap: 8 }}><span className="mono" style={{ color: p.sign === "+" ? "var(--green)" : p.sign === "–" ? "var(--red)" : "var(--muted)" }}>{p.sign}</span><span>{p.text}</span></li>)}
          </ul>
          <p className="mono">Evidencia real: Veredictos, plazos y Cesiones. Nunca consejos genéricos.</p>
        </section>

        <section className="card" style={{ display: "grid", gap: 10, alignContent: "start" }} aria-label="Qué ganas">
          <p className="eyebrow">3 · Qué ganas</p>
          <p><strong>Mérito</strong> {b.ganas.merit} · <strong>Distinciones</strong> {b.ganas.distinciones.total}{b.ganas.distinciones.total ? ` (${Object.entries(b.ganas.distinciones.byAxis).map(([k, v]) => `${v} por ${k.charAt(0) + k.slice(1).toLowerCase()}`).join(", ")})` : ""}</p>
          <p><strong>Valoración</strong> {pct(b.ganas.valoracion.score)} en {b.ganas.valoracion.month} · {b.ganas.valoracion.eligibleEmbajada ? <span className="badge green">apta para Embajada</span> : <span className="mono">Embajada: ≥ 80 % un mes completo</span>}</p>
          {b.ganas.embajada.length ? <p><strong>Embajada</strong> · plazas sin titular reclamadas por la Mesa este mes: {b.ganas.embajada.join(", ")}. Cada Embajada que resuelva vale prima ×2,5.</p> : null}
          <p><strong>Cuota</strong> · Tramo de {b.ganas.cuota.tier.toLowerCase()} · has recibido {eur(b.ganas.cuota.valueReceivedYear)} contrastados en el Ejercicio. El Tramo se revisa cada enero con ese valor; los umbrales los anunciará NS y te avisaré aquí antes de cualquier cambio.</p>
          <p className="mono">Esta es la única pantalla donde aparece tu cuota. La Balanza pública nunca la muestra.</p>
        </section>

        <section className="card quiet" style={{ alignContent: "start" }} aria-label="Cómo funciona">
          <p className="eyebrow">Cómo trabaja tu Agente</p>
          <p style={{ marginTop: 6 }}>Cada Movimiento sale de un hecho: algo que tu Agente encontró, un Encargo de un titular, una Cesión abierta, un Dossier que no has leído. Lo que descartas con motivo le enseña qué no proponerte; lo que haces, qué sí. Tras una semana sin ceder propone cinco en vez de tres.</p>
        </section>
      </div>
    </div>
  );
}
