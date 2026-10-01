import Link from "next/link";
import { getDb } from "@/db/client";
import { currentMember, requireDemo } from "@/lib/session";
import { todaySummary, balance } from "@/services/today";
import { hoyBoard } from "@/services/hoy";
import { latestGazette, relevantForMe } from "@/services/comunicado";
import { daysAgo, eur, eurRange, firstName, greeting } from "@/lib/format";
import { StateBadge } from "@/components/ui";
import { AgentAvatar } from "@/components/brand";
import { prepareDemo, runRastreoAction } from "../actions";
import { toqueAction } from "./actions";
import { runClockThrottled } from "@/services/clock";
import { InstallHint } from "../install-hint";
import { leerEstadoCopias, mostrarEstadoCopias, valorarCopias } from "@/services/copias";

/**
 * Hoy (D-070): el tiempo del Timonel es oro. Arriba, solo lo que espera su toque, con el botón dentro. Después, los
 * contratiempos con su solución. Todo lo demás, en una línea de estado o plegado. Nada que leer antes de decidir.
 */
export default async function HoyPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireDemo();
  const { ok, error } = await searchParams;
  const ctx = await currentMember();
  if (!ctx) {
    return (
      <div className="stack">
        <p className="eyebrow">Primer uso</p>
        <h1>NS Cumbre todavía no tiene titulares.</h1>
        <p className="lead">Prepara la Sala de demostración con diez empresas sevillanas, sus ADN de Empresa y los tres escenarios de referencia del protocolo.</p>
        <form action={prepareDemo}><button className="btn primary" type="submit">Preparar NS Cumbre (demo)</button></form>
      </div>
    );
  }
  const db = await getDb();
  const { member, company, chapter } = ctx;
  await runClockThrottled(db, chapter.id);
  const board = await hoyBoard(db, { chapterId: chapter.id, companyId: company.id, member });
  const summary = await todaySummary(db, chapter.id, company.id, daysAgo(7));
  const bal = await balance(db, chapter.id, company.id);
  const gazette = await latestGazette(db, chapter.id);
  const relevant = gazette ? (await relevantForMe(db, chapter.id, company.id, gazette.weekStart)).slice(0, 3) : [];
  const companies = new Map((await db.query.companies.findMany({ columns: { id: true, slug: true } })).map((c) => [c.id, c.slug]));
  const copias = member.isDirector && mostrarEstadoCopias() ? valorarCopias(await leerEstadoCopias()) : null;
  const agentState = board.toques.length ? "esperando" : summary.matches ? "encontrado" : "analizando";
  const { compromiso, comunicado } = board;
  const compromisoTone = compromiso.lastAction === "RELEASE_NOTICE" || compromiso.missedStreak >= 2 ? "red" : compromiso.thisWeek.validCount >= compromiso.minimum ? "green" : "amber";

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · {company.name}</p>
          <h1>{greeting()}, {firstName(member.fullName)}.</h1>
          <p className="lead">Mientras estabas fuera: {summary.agentConversations} conversaciones entre Agentes, {summary.signals} Indicios y {summary.matches} Pistas en siete días. {board.toques.length === 0 ? "Nada espera tu toque." : board.toques.length === 1 ? "Una decisión espera tu toque." : `${board.toques.length} decisiones esperan tu toque.`}</p>
        </div>
        <AgentAvatar state={agentState} label={agentState === "esperando" ? "Tu Agente espera tu decisión" : agentState === "encontrado" ? "Tu Agente ha encontrado algo" : "Tu Agente está en la Mesa"} />
      </div>

      {error ? <div className="notice error" role="alert">{error}</div> : null}
      {ok ? <div className="notice" role="status" style={{ borderColor: "var(--green)" }}>Hecho. Tu Agente sigue con el resto.</div> : null}

      <section aria-label="Para tu toque">
        {board.toques.length === 0 ? (
          <div className="card quiet"><h3>Nada espera tu toque.</h3><p style={{ marginTop: 6 }}>Tu Agente está en la Mesa. Cuando encuentre algo, lo verás aquí primero, con el botón dentro.</p></div>
        ) : (
          <ol className="toques">
            {board.toques.map((t) => (
              <li key={t.key} className={`toque ${t.tone}`}>
                <div className="ctx">
                  <strong>{t.title}</strong>
                  {t.detail ? <p>{t.detail}</p> : null}
                  <span className="mono">{[t.meta, t.deadline].filter(Boolean).join(" · ")}</span>
                </div>
                <div className="act">
                  {t.primary ? (
                    <form action={toqueAction}>
                      <input type="hidden" name="action" value={t.primary.action} />
                      {Object.entries(t.primary.payload).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                      <button className="btn primary" type="submit">{t.primary.label}</button>
                    </form>
                  ) : null}
                  <Link href={t.href} className={`btn ${t.primary ? "ghost" : ""}`}>{t.hrefLabel}</Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {board.contratiempos.length ? (
        <section aria-label="Contratiempos">
          <h2 style={{ marginBottom: 12 }}>Contratiempos · con solución</h2>
          <ol className="toques">
            {board.contratiempos.map((c) => (
              <li key={c.key} className={`toque ${c.tone}`}>
                <div className="ctx"><strong>{c.title}</strong><p>{c.detail}</p></div>
                <div className="act">
                  {c.primary ? (
                    <form action={toqueAction}>
                      <input type="hidden" name="action" value={c.primary.action} />
                      {Object.entries(c.primary.payload).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                      <button className="btn primary" type="submit">{c.primary.label}</button>
                    </form>
                  ) : null}
                  {c.href ? <Link href={c.href} className={`btn ${c.primary ? "ghost" : ""}`}>{c.actionLabel}</Link> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <InstallHint />

      <section className="row estado" aria-label="Estado">
        <span><span className="money" style={{ fontSize: 20, color: "var(--amber)" }}>{eurRange(summary.potential.min, summary.potential.max)}</span> en Cesiones abiertas</span>
        <span>·</span>
        <span><span className="money" style={{ fontSize: 20, color: "var(--green)" }}>{eur(bal.valueReceived)}</span> contrastado recibido · Mérito {bal.merit}</span>
        <span className="spacer" />
        <Link href="/sala" className={`badge ${compromisoTone}`} title={compromiso.nextStep}>Compromiso · {compromiso.label.replace(/^Pendiente esta semana$/, `${compromiso.thisWeek.validCount} de ${compromiso.minimum} esta semana`)}</Link>
        {comunicado.row?.status === "APPROVED" ? <Link href="/comunicado" className="badge green">Comunicado aprobado</Link> : null}
        <form action={runRastreoAction}><button className="btn small ghost" type="submit">Rastrear ahora</button></form>
        {copias && copias.tone !== "green" ? <span className={`badge ${copias.tone}`} title={copias.detail}>Copias · {copias.headline}</span> : null}
      </section>

      {gazette && relevant.length ? (
        <section className="section" style={{ marginTop: 8 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Relevante para ti</h2>
            <span className="spacer" />
            <Link href="/gaceta" className="mono">Gaceta {gazette.gazette.week} →</Link>
          </div>
          <ul className="why">
            {relevant.map((it, i) => <li key={i}><span><Link href={`/empresa/${companies.get(it.company_id) ?? ""}`}><strong>{it.text}</strong></Link> <span className="mono">{it.why}</span></span></li>)}
          </ul>
        </section>
      ) : null}

      {summary.internal.length > 0 ? (
        <section className="section" style={{ marginTop: 8 }}>
          <h2>Solo para ti</h2>
          <div className="stack">
            {summary.internal.map((e) => (
              <div key={e.id} className="card"><p>{e.result}</p><p className="mono" style={{ marginTop: 6 }}>COMPANY_ONLY · nada ha salido de tu empresa</p></div>
            ))}
          </div>
        </section>
      ) : null}

      {board.waiting.length || board.inCourse.length ? (
        <details className="plegable">
          <summary>En marcha · {board.waiting.length + board.inCourse.length} {board.waiting.length + board.inCourse.length === 1 ? "Cesión" : "Cesiones"} que no necesitan tu toque</summary>
          <div className="stack" style={{ marginTop: 12 }}>
            {[...board.waiting, ...board.inCourse].map((r) => (
              <Link key={r.id} href={`/cesiones/${r.id}`} className="card" style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <StateBadge state={r.state} />
                <span>{r.iAmReceiver ? `De ${r.other}` : `A ${r.other}`}</span>
                <span className="spacer" />
                <span className="money">{r.value}</span>
              </Link>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
