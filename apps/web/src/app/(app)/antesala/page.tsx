import Link from "next/link";
import { getDb } from "@/db/client";
import { requireDirector } from "@/lib/session";
import { NSCAT, SPECIALTY_NAME } from "@/db/nscat";
import { dateTime } from "@/lib/format";
import { Empty } from "@/components/ui";
import { candidacyAction, foundingAction, releaseAction } from "./actions";
import { pendingReleases } from "@/services/compromiso";
import { listFoundings } from "@/services/fundacion";
import { CANDIDACY_LABEL, CANDIDACY_TRANSITIONS, candidacyCounts, listCandidacies, triageCandidacy, type Candidacy, type CandidacyStatus, type CandidacyTriage, type CandidacyView } from "@/services/antesala";

const VIEWS: { key: CandidacyView; label: string }[] = [
  { key: "pendientes", label: "Pendientes" },
  { key: "espera", label: "En la Antesala" },
  { key: "aprobadas", label: "Aprobadas" },
  { key: "declinadas", label: "Declinadas" },
  { key: "todas", label: "Todas" },
];

const ACTION_LABEL: Record<CandidacyStatus, string> = {
  NEW: "Reabrir",
  CONTACTED: "Contactada",
  INTERVIEW: "Entrevista hecha",
  APPROVED: "Aprobar plaza",
  WAITLISTED: "A la Antesala",
  FOUNDING: "En fundación",
  DECLINED: "Declinar",
  ACTIVATED: "Titular activo",
};

const STATUS_TONE: Record<CandidacyStatus, string> = { NEW: "amber", CONTACTED: "amber", INTERVIEW: "amber", APPROVED: "green", ACTIVATED: "green", WAITLISTED: "blue", FOUNDING: "blue", DECLINED: "red" };

type FoundingView = Awaited<ReturnType<typeof listFoundings>>[number];

function SeatBadge({ t }: { t: CandidacyTriage }) {
  if (t.seat === "VACANT" && !t.overlaps.length && !t.duplicateOf) return <span className="badge green">Plaza vacante · {t.specialtyName}</span>;
  if (t.seat === "VACANT") return <span className="badge amber">Vacante con reservas · {t.specialtyName}</span>;
  if (t.seat === "TAKEN") return <span className="badge red">Plaza ocupada · {t.specialtyName}</span>;
  return <span className="badge">Sin clasificar</span>;
}

function CandidacyCard({ c, t, view, foundings }: { c: Candidacy; t: CandidacyTriage; view: CandidacyView; foundings: FoundingView[] }) {
  const status = c.status as CandidacyStatus;
  const next = CANDIDACY_TRANSITIONS[status];
  const openFoundings = foundings.filter((f) => f.founding.status !== "ACTIVATED" && !(c.specialtyCode && f.specialties.includes(c.specialtyCode)));
  const canFound = !c.foundingId && !["DECLINED", "ACTIVATED", "APPROVED"].includes(status);
  const foundedChapter = c.foundingId ? foundings.find((f) => f.founding.id === c.foundingId)?.chapter : undefined;
  return (
    <article id={`c-${c.id}`} className={`card cand ${status === "NEW" ? "amber" : ""}`}>
      <div className="cand-head">
        <div>
          <p className="eyebrow">{dateTime(c.createdAt)} · {c.city}</p>
          <h3>{c.companyName}</h3>
          <p>{c.fullName} · <a href={`mailto:${c.email}`}>{c.email}</a></p>
        </div>
        <span className={`badge ${STATUS_TONE[status]}`}>{CANDIDACY_LABEL[status]}</span>
      </div>
      {c.message ? <blockquote className="cand-quote">&ldquo;{c.message}&rdquo;</blockquote> : null}
      <div className="cand-verdict">
        <div className="row"><SeatBadge t={t} />{t.outsideZone ? <span className="badge">Fuera de NS Sevilla</span> : null}{t.duplicateOf ? <span className="badge amber">Posible duplicado</span> : null}</div>
        <p className="cand-reco">{t.recommendation}</p>
        {t.overlaps.length ? <p className="mono">Solapa con: {t.overlaps.map((o) => `${o.specialtyName} · ${o.holderName}`).join(" · ")}</p> : null}
      </div>
      {status !== "ACTIVATED" ? (
        <div className="cand-actions">
          {status === "APPROVED" ? <Link href={`/sala/alta?candidatura=${c.id}${foundedChapter ? `&sala=${foundedChapter.slug}` : ""}`} className="btn primary small">Dar de alta en {foundedChapter ? foundedChapter.name : "la Sala"}</Link> : null}
          {next.map((s) => (
            <form key={s} action={candidacyAction}>
              <input type="hidden" name="id" value={c.id} /><input type="hidden" name="view" value={view} /><input type="hidden" name="status" value={s} />
              <button type="submit" className={`btn small ${s === "APPROVED" ? "primary" : s === "DECLINED" ? "danger ghost" : ""}`} disabled={s === "APPROVED" && !t.canApprove} title={s === "APPROVED" && !t.canApprove ? "Solo con plaza vacante y sin reservas" : undefined}>{ACTION_LABEL[s]}</button>
            </form>
          ))}
        </div>
      ) : c.companyId ? <p className="mono">Ya es titular de la Sala.</p> : null}
      {canFound && (t.seat === "TAKEN" || openFoundings.length) ? (
        <div className="cand-actions" style={{ borderTop: "1px dashed var(--line)", paddingTop: 10 }}>
          <span className="mono" style={{ alignSelf: "center" }}>{t.seat === "TAKEN" ? "Plaza ocupada: NS le ayuda a fundar la siguiente Sala ·" : "Sala en fundación ·"}</span>
          {t.seat === "TAKEN" ? (
            <form action={foundingAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="view" value={view} /><input type="hidden" name="op" value="start" /><button type="submit" className="btn small">Promotora de nueva Sala</button></form>
          ) : null}
          {openFoundings.map((f) => (
            <form key={f.founding.id} action={foundingAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="view" value={view} /><input type="hidden" name="op" value="join" /><input type="hidden" name="foundingId" value={f.founding.id} /><button type="submit" className="btn small ghost">Sumar a la Sala de {f.promoter?.companyName ?? "la Promotora"} ({f.count}/{f.founding.minMembers})</button></form>
          ))}
        </div>
      ) : null}
      {status === "FOUNDING" && c.foundingId ? <p className="mono">Fundadora de la Sala promovida por {foundings.find((f) => f.founding.id === c.foundingId)?.promoter?.companyName ?? "…"}.</p> : null}
      {status !== "ACTIVATED" ? (
        <details className="cand-more">
          <summary>Nota y clasificación{c.notes ? " · hay nota" : ""}</summary>
          <form action={candidacyAction} className="form-grid" style={{ marginTop: 12 }}>
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="view" value={view} />
            <div className="field">
              <label htmlFor={`sp-${c.id}`}>Especialidad (NS-CAT)</label>
              <select id={`sp-${c.id}`} name="specialtyCode" defaultValue={c.specialtyCode ?? ""}>
                <option value="">Sin clasificar</option>
                {NSCAT.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor={`nt-${c.id}`}>Nota privada de la Directiva</label>
              <textarea id={`nt-${c.id}`} name="notes" defaultValue={c.notes ?? ""} style={{ minHeight: 72 }} placeholder="Qué se habló, qué falta por comprobar, quién la conoce." />
            </div>
            <div className="actions"><button type="submit" className="btn small">Guardar</button></div>
          </form>
        </details>
      ) : null}
    </article>
  );
}

export default async function AntesalaPage({ searchParams }: { searchParams: Promise<{ vista?: string; error?: string }> }) {
  const ctx = await requireDirector();
  const { vista, error } = await searchParams;
  const view: CandidacyView = VIEWS.some((v) => v.key === vista) ? (vista as CandidacyView) : "pendientes";
  if (!ctx) {
    return (
      <div className="stack">
        <p className="eyebrow">Antesala</p>
        <h1>Solo la Directiva ve las candidaturas.</h1>
        <p className="lead">Las candidaturas llegan desde la portada pública y las despacha la Presidencia de la Sala. En la demo, elige un Timonel marcado como Directiva en el selector de arriba.</p>
        <Link href="/hoy" className="btn">Volver a Hoy</Link>
      </div>
    );
  }
  const db = await getDb();
  const [counts, rows, foundings, releases] = await Promise.all([candidacyCounts(db), listCandidacies(db, view), listFoundings(db, ctx.chapter.zoneId), pendingReleases(db, ctx.chapter.id)]);
  const triaged = await Promise.all(rows.map(async (c) => ({ c, t: await triageCandidacy(db, ctx.chapter.id, c) })));
  const countFor: Record<CandidacyView, number> = { pendientes: counts.pendientes, espera: counts.espera, aprobadas: counts.aprobadas, declinadas: counts.declinadas, todas: counts.todas };

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{ctx.chapter.name} · Directiva</p>
          <h1>Antesala.</h1>
          <p className="lead">Quien pide plaza desde la portada aparece aquí. El sistema comprueba la plaza; tú decides. Nunca se aprueba una especialidad ya ocupada.</p>
        </div>
        <div className="cand-counts" aria-label="Resumen">
          <div><strong>{counts.nuevas}</strong><span className="mono">nuevas</span></div>
          <div><strong>{counts.espera}</strong><span className="mono">en espera</span></div>
          <div><strong>{counts.aprobadas}</strong><span className="mono">aprobadas</span></div>
        </div>
      </div>

      {releases.length ? (
        <section id="bajas" className="stack" style={{ gap: 10 }}>
          <h2 style={{ margin: 0 }}>Bajas notificadas por Compromiso</h2>
          <p className="lead" style={{ fontSize: 14 }}>Cuatro semanas seguidas sin una sola Cesión válida suponen la baja de la titularidad (D-010, D-042). El sistema ya ha notificado a la empresa; la Directiva ejecuta la baja y la plaza vuelve a la Antesala.</p>
          {releases.map((r) => (
            <article key={r.seatId} className="card red row" style={{ justifyContent: "space-between", gap: 12 }}>
              <span><strong>{r.company.name}</strong> · plaza de {r.specialtyName}</span>
              <form action={releaseAction}><input type="hidden" name="companyId" value={r.company.id} /><input type="hidden" name="view" value={view} /><button type="submit" className="btn small">Ejecutar la baja</button></form>
            </article>
          ))}
        </section>
      ) : null}

      {foundings.length ? (
        <section id="fundacion" className="stack" style={{ gap: 10 }}>
          <h2 style={{ margin: 0 }}>Salas en fundación</h2>
          <p className="lead" style={{ fontSize: 14 }}>Cuando una plaza está ocupada, NS ayuda a esa empresa a promover la siguiente Sala de la zona. Al reunir el mínimo, la Directiva la funda y la Promotora recibe la gratificación anunciada (D-041).</p>
          {foundings.map((f) => (
            <article key={f.founding.id} className={`card ${f.ready && f.founding.status !== "ACTIVATED" ? "green" : ""}`} style={{ display: "grid", gap: 10 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div><p className="eyebrow">{f.founding.status === "ACTIVATED" ? "Sala fundada" : f.ready ? "Mínimo alcanzado" : "En fundación"}</p><strong>{f.chapter ? f.chapter.name : `Promotora: ${f.promoter?.companyName ?? "…"}`}</strong>{f.chapter ? <span className="mono"> · promovida por {f.promoter?.companyName} · nombre pendiente de autorización de NS</span> : null}</div>
                <div className="row" style={{ gap: 12 }}><div className="progress" aria-hidden="true"><span style={{ width: `${Math.min(100, Math.round((f.count / f.founding.minMembers) * 100))}%` }} /></div><span className="mono">{f.count} de {f.founding.minMembers} fundadoras</span></div>
              </div>
              <p className="mono">{f.specialties.map((code) => SPECIALTY_NAME[code] ?? code).join(" · ") || "sin especialidades aún"}{f.missing ? ` · faltan ${f.missing}` : ""}</p>
              <p className="mono">Gratificación anunciada: {f.founding.rewardText}{f.founding.rewardGrantedAt ? " · concedida" : ""}.</p>
              {f.ready && f.founding.status !== "ACTIVATED" ? (
                <form action={foundingAction} className="row">
                  <input type="hidden" name="op" value="activate" /><input type="hidden" name="foundingId" value={f.founding.id} /><input type="hidden" name="view" value={view} />
                  <div className="field" style={{ minWidth: 260 }}><label htmlFor={`fn-${f.founding.id}`}>Nombre propio de la Sala (prefijo NS, nunca un lugar)</label><input id={`fn-${f.founding.id}`} name="name" required placeholder="NS Ágora" defaultValue="NS " /></div>
                  <button type="submit" className="btn primary" style={{ alignSelf: "end" }}>Fundar la Sala</button>
                </form>
              ) : null}
              {f.chapter ? <div className="cand-actions">{f.members.filter((m) => m.status === "APPROVED").map((m) => <Link key={m.id} href={`/sala/alta?candidatura=${m.id}&sala=${f.chapter!.slug}`} className="btn small">Dar de alta a {m.companyName}</Link>)}</div> : null}
            </article>
          ))}
        </section>
      ) : null}

      <nav className="tabs" aria-label="Vistas">
        {VIEWS.map((v) => (
          <Link key={v.key} href={`/antesala?vista=${v.key}`} aria-current={v.key === view ? "page" : undefined}>{v.label} <span className="mono">{countFor[v.key]}</span></Link>
        ))}
      </nav>

      {error ? <div className="notice error">{error}</div> : null}

      {triaged.length === 0 ? (
        <Empty title={view === "pendientes" ? "Ninguna candidatura pendiente." : "Nada en esta vista."}>
          {counts.todas === 0 ? <>Cuando alguien solicite plaza desde la <Link href="/">portada</Link>, aparecerá aquí con su veredicto de plaza.</> : <>Cambia de vista para ver el resto.</>}
        </Empty>
      ) : (
        <div className="stack" style={{ gap: 14 }}>
          {triaged.map(({ c, t }) => <CandidacyCard key={c.id} c={c} t={t} view={view} foundings={foundings} />)}
        </div>
      )}

      <p className="mono">Proceso de admisión: solicitud → contacto → entrevista → comprobación de plaza → aprobación → alta y entrenamiento del Agente. Toda decisión queda en el registro de la Sala.</p>
    </div>
  );
}
