import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { gazetteByWeek, latestGazette, listGazettes, parteComunicados, recordView, relevantForMe, weekCommuniques } from "@/services/comunicado";
import { DELTA_LABEL, STATUS_LABEL, isoWeekLabel, weekRangeLabel, type CommuniqueStatus } from "@/core/comunicado";
import { weekStart } from "@/core/compromiso";
import { eur } from "@/lib/format";
import { Empty } from "@/components/ui";

/**
 * Gaceta de la Sala (Protocolo II, D-018 · D-069). La compila el Chapter Intelligence Agent cada domingo a partir de los
 * Comunicados. Dos vistas: "relevante para ti" (leída con el ADN del Timonel) y "en la Sala esta semana". En el Pleno
 * sustituye la ronda de presentaciones: solo novedades. La Directiva ve además el Parte de cumplimiento.
 */
export default async function GacetaPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { member, company, chapter } = await requireMember();
  const { semana } = await searchParams;
  const db = await getDb();
  const requested = semana ? new Date(semana) : null;
  const gazetteRow = requested && !Number.isNaN(requested.getTime()) ? await gazetteByWeek(db, chapter.id, weekStart(requested)) : await latestGazette(db, chapter.id);
  const archive = await listGazettes(db, chapter.id, 12);
  const liveWeek = weekStart(new Date());
  const live = await weekCommuniques(db, chapter.id, liveWeek);
  const liveApproved = live.filter((r) => r.status === "APPROVED");
  const liveRelevant = await relevantForMe(db, chapter.id, company.id, liveWeek);
  const companies = new Map((await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapter.id) })).map((c) => [c.id, c]));

  if (gazetteRow) await recordView(db, { chapterId: chapter.id, companyId: company.id, memberId: member.id, kind: "GAZETTE_VIEWED", subjectId: gazetteRow.gazette.week });
  const g = gazetteRow?.gazette ?? null;
  const relevant = gazetteRow ? await relevantForMe(db, chapter.id, company.id, gazetteRow.weekStart) : [];
  const rows = gazetteRow ? (await weekCommuniques(db, chapter.id, gazetteRow.weekStart)).filter((r) => r.status !== "DRAFT") : [];
  const withNews = rows.filter((r) => !r.unchanged);
  const quiet = rows.filter((r) => r.unchanged);
  const parte = member.isDirector && gazetteRow ? await parteComunicados(db, chapter.id, gazetteRow.weekStart) : null;
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)} %`);

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · Gaceta</p>
          <h1>{g ? `Gaceta · semana ${g.week}` : "La Gaceta de la Sala"}</h1>
          <p className="lead">{g ? `${weekRangeLabel(gazetteRow!.weekStart)}. Lo que los titulares han dado a conocer, leído para ti por tu Agente.` : "Cada domingo a las 20:00 el Agente de la Sala compila los Comunicados de la semana. La primera Gaceta sale al cerrar esta semana."}</p>
        </div>
        <Link href="/comunicado" className="btn">Mi Comunicado</Link>
      </div>

      {g ? (
        <>
          <section className="section" style={{ marginTop: 0 }}>
            <h2>Relevante para ti</h2>
            {relevant.length === 0 ? (
              <Empty title="Nada de esta semana toca directamente a tus clientes.">Tu Agente solo te trae lo que encaja con tu ADN o con tu historial de Cesiones. En «En la Sala esta semana» tienes el resto.</Empty>
            ) : (
              <ul className="why">
                {relevant.map((it, i) => (
                  <li key={i}><span><Link href={`/empresa/${companies.get(it.company_id)?.slug ?? ""}`}><strong>{it.text}</strong></Link> <span className="mono">{it.why}</span></span></li>
                ))}
              </ul>
            )}
          </section>

          <section className="section">
            <h2>En la Sala esta semana</h2>
            <div className="grid grid-3">
              <div className="card kpi"><span className="value">{g.communiques.approved + g.communiques.continuity}<span className="mono" style={{ fontSize: 14 }}> / {g.members}</span></span><span className="label">Comunicados · {g.communiques.continuity} de continuidad</span></div>
              <div className="card kpi"><span className="value">{g.new_services}</span><span className="label">servicios nuevos</span></div>
              <div className="card kpi"><span className="value green money" style={{ fontSize: 26 }}>{eur(g.verified_closes.value)}</span><span className="label">{g.verified_closes.count} cierre(s) contrastado(s)</span></div>
              <div className="card kpi"><span className="value">{g.open_encargos}</span><span className="label">Encargos abiertos</span></div>
              <div className="card kpi"><span className="value amber">{g.vacancies_claimed}</span><span className="label">necesidades sin titular (plazas que reclamar)</span></div>
              <div className="card kpi"><span className="value">{pct(g.mutual_knowledge)}</span><span className="label">conocimiento mutuo · Timoneles que consultaron Gaceta o Dossier</span></div>
            </div>
          </section>

          <section className="section">
            <h2>Novedades por titular</h2>
            {withNews.length === 0 ? <p className="mono">Nadie declaró novedades esta semana.</p> : (
              <div className="stack">
                {withNews.map((r) => (
                  <div key={r.id} className="card" style={{ display: "grid", gap: 8 }}>
                    <div className="row"><Link href={`/empresa/${r.company.slug}`}><strong>{r.company.name}</strong></Link><span className="mono">{r.stable.specialty}</span><span className="spacer" /><span className={`badge ${r.status === "APPROVED" ? "green" : "amber"}`}>{STATUS_LABEL[r.status as CommuniqueStatus]}</span></div>
                    <ul className="plain">
                      {[...r.delta, ...r.declared].map((d, i) => <li key={i}><span className="badge" style={{ marginRight: 8 }}>{DELTA_LABEL[d.kind]}</span>{d.text}</li>)}
                    </ul>
                    {r.asks.length ? <p className="mono">Sondeo: «{r.asks[r.asks.length - 1]}»</p> : null}
                  </div>
                ))}
              </div>
            )}
            {quiet.length ? <p className="mono" style={{ marginTop: 12 }}>Sin novedades ({quiet.length}): {quiet.map((r) => r.company.name).join(", ")}. Su Comunicado estable sigue vigente en su Dossier.</p> : null}
            {g.communiques.missing ? <p className="mono" style={{ marginTop: 6 }}>{g.communiques.missing} titular(es) sin Comunicado (sin ADN validado).</p> : null}
          </section>

          {parte ? (
            <section className="section" aria-label="Parte de la Directiva">
              <h2>Parte · cumplimiento del Comunicado</h2>
              <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Solo la Directiva lo ve. Conocimiento mutuo de la semana: {pct(parte.mutualKnowledge)}.</p>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Titular</th><th>Comunicado</th><th className="num">Novedades</th><th>Continuidad seguidos</th><th>ADN</th></tr></thead>
                  <tbody>
                    {parte.members.map((m) => (
                      <tr key={m.company.id}>
                        <td><Link href={`/empresa/${m.company.slug}`}>{m.company.name}</Link></td>
                        <td><span className={`badge ${m.status === "APPROVED" ? "green" : m.status === "MISSING" || m.continuityStreak >= 3 ? "red" : "amber"}`}>{m.status === "MISSING" ? "Sin Comunicado" : STATUS_LABEL[m.status]}</span></td>
                        <td className="num">{m.novelties}</td>
                        <td className="mono">{m.continuityStreak || "—"}</td>
                        <td className="mono">{m.dnaValidated ? "validado" : "sin validar"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="section">
        <h2>Semana en curso · {isoWeekLabel(liveWeek)}</h2>
        <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>{liveApproved.length} de {live.length} Comunicados aprobados hasta ahora. La Gaceta sale el domingo a las 20:00; lo ya aprobado se lee aquí en vivo.</p>
        {liveRelevant.length ? (
          <ul className="why">
            {liveRelevant.map((it, i) => <li key={i}><span><Link href={`/empresa/${companies.get(it.company_id)?.slug ?? ""}`}><strong>{it.text}</strong></Link> <span className="mono">{it.why}</span></span></li>)}
          </ul>
        ) : <p className="mono">Nada relevante para ti todavía esta semana.</p>}
      </section>

      {archive.length > 1 ? (
        <section className="section">
          <h2>Gacetas anteriores</h2>
          <ul className="plain">
            {archive.map((a) => <li key={a.id}><Link href={`/gaceta?semana=${a.weekStart.toISOString().slice(0, 10)}`} aria-current={gazetteRow?.id === a.id ? "page" : undefined}>{a.gazette.week} · {weekRangeLabel(a.weekStart)}</Link> <span className="mono">{a.gazette.communiques.approved + a.gazette.communiques.continuity} Comunicados · {a.gazette.new_services} servicios nuevos · {a.gazette.verified_closes.count} cierres</span></li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
