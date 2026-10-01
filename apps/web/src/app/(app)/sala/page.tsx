import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { balance } from "@/services/today";
import { eur } from "@/lib/format";
import { openDemands } from "@/services/demands";
import { compromisoStatus } from "@/services/compromiso";
import { MANANTIALES } from "@/db/nscat";
import { latestGazette, relevantForMe, weekCommuniques } from "@/services/comunicado";
import { weekStart } from "@/core/compromiso";
import { isoWeekLabel } from "@/core/comunicado";
import { monthAgo, tiemposDinamismo } from "@/services/dinamismo";

export default async function SalaPage() {
  const { chapter, company } = await requireMember();
  const db = await getDb();
  const seats = await db.select({ id: schema.categorySeats.id, status: schema.categorySeats.status, specialtyName: schema.specialties.name, code: schema.specialties.nscatCode, companyId: schema.categorySeats.companyId }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.categorySeats.chapterId, chapter.id)).orderBy(asc(schema.specialties.name));
  const companies = await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapter.id), orderBy: [asc(schema.companies.name)] });
  const byId = new Map(companies.map((c) => [c.id, c]));
  const balances = await Promise.all(companies.filter((c) => c.status === "ACTIVE" || c.status === "SUSPENDED").map(async (c) => ({ c, b: await balance(db, chapter.id, c.id), r: await compromisoStatus(db, chapter.id, c.id) })));
  const occupied = seats.filter((s) => s.status === "ACTIVE").length;
  const demandsOpen = await openDemands(db, chapter.id);
  const gazette = await latestGazette(db, chapter.id);
  const relevant = gazette ? await relevantForMe(db, chapter.id, company.id, gazette.weekStart) : [];
  const live = await weekCommuniques(db, chapter.id, weekStart(new Date()));
  const liveApproved = live.filter((r) => r.status === "APPROVED").length;
  const statusByCompany = new Map(live.map((r) => [r.companyId, r.status]));
  const tiempos = await tiemposDinamismo(db, { chapterId: chapter.id, since: monthAgo() });
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">NS Sevilla · Sala</p>
          <h1>{chapter.name}</h1>
          <p className="lead">{occupied} plazas ocupadas · {seats.length - occupied} vacantes · Ritmo {Math.max(1, chapter.weeklyPace)} Cesión válida por semana y titular, sin excusas; a la cuarta semana sin ceder, la plaza vuelve a la Antesala (D-042).</p>
        </div>
        <Link href="/sala/alta" className="btn">Solicitar plaza para una empresa</Link>
      </div>

      <section>
        <h2 style={{ marginBottom: 12 }}>Plazas</h2>
        <div className="seats">
          {seats.map((s) => {
            const holder = s.companyId ? byId.get(s.companyId) : undefined;
            return (
              <div key={s.id} className={`seat ${holder ? "" : "vacant"}`}>
                <span className="mono">{s.specialtyName}{MANANTIALES.has(s.code) ? <span className="badge blue" title="Especialidad Manantial (D-059): ve necesidades de muchos sectores; misma plaza y mismas reglas que cualquier titular" style={{ marginLeft: 8 }}>Manantial</span> : null}</span>
                {holder ? <Link className="name" href={`/empresa/${holder.slug}`}>{holder.name}{holder.id === company.id ? " · tú" : ""}</Link> : <span className="name">Plaza vacante · Antesala</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="row" style={{ marginBottom: 4 }}>
          <h2 style={{ margin: 0 }}>Gaceta de la semana</h2>
          <span className="spacer" />
          <Link href="/gaceta" className="btn small">Leer la Gaceta</Link>
          <Link href="/comunicado" className="btn small ghost">Mi Comunicado</Link>
        </div>
        <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Protocolo II · Dar a Conocer. Cada semana el Agente de cada titular informa a la Sala; el domingo a las 20:00 el Agente de la Sala compila la Gaceta. Semana {isoWeekLabel(weekStart(new Date()))}: {liveApproved} de {live.length} Comunicados aprobados.</p>
        {gazette ? (
          <div className="card" style={{ display: "grid", gap: 8 }}>
            <p className="eyebrow">Relevante para ti · Gaceta {gazette.gazette.week}</p>
            {relevant.length === 0 ? <p className="mono">Nada de la última Gaceta toca directamente a tus clientes.</p> : (
              <ul className="why">{relevant.slice(0, 3).map((it, i) => <li key={i}><span><Link href={`/empresa/${byId.get(it.company_id)?.slug ?? ""}`}><strong>{it.text}</strong></Link> <span className="mono">{it.why}</span></span></li>)}</ul>
            )}
            <p className="mono">{gazette.gazette.communiques.approved + gazette.gazette.communiques.continuity} Comunicados de {gazette.gazette.members} · {gazette.gazette.new_services} servicios nuevos · {gazette.gazette.verified_closes.count} cierres contrastados · {gazette.gazette.open_encargos} Encargos abiertos</p>
          </div>
        ) : <p className="mono">La primera Gaceta sale al cerrar esta semana.</p>}
      </section>

      <section>
        <h2 style={{ marginBottom: 4 }}>Encargos abiertos</h2>
        <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Lo que cada titular busca ahora. Los Agentes priorizan las Pistas que responden a un Encargo.</p>
        {demandsOpen.length === 0 ? <p className="mono">Ningún Encargo abierto.</p> : (
          <ul className="plain">
            {demandsOpen.map((d) => <li key={d.id} className="row"><Link href={`/empresa/${byId.get(d.companyId)?.slug}`}><strong>{byId.get(d.companyId)?.name}</strong></Link><span>{d.text}</span>{d.trigger ? <span className="badge">{d.trigger.toLowerCase().replaceAll("_", " ")}</span> : null}</li>)}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ marginBottom: 4 }}>Balanza</h2>
        <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Lo que cada titular da y recibe. Ordenada por plaza, nunca un ranking. Solo valor contrastado.{tiempos.contact ? ` Dinamismo de la Sala en 30 días: del Apunte a la llamada al Interesado, ${tiempos.contact.hours} h de media (${tiempos.contact.n} ${tiempos.contact.n === 1 ? "contacto" : "contactos"})` : ""}{tiempos.mesa ? `${tiempos.contact ? ";" : " Dinamismo de la Sala en 30 días:"} del Apunte a la mesa del cesionario, ${tiempos.mesa.minutes < 1 ? "menos de un minuto" : `${Math.round(tiempos.mesa.minutes)} min`}.` : tiempos.contact ? "." : ""}</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Titular</th><th className="num">Cesiones dadas</th><th className="num">Recibidas</th><th className="num">Valor generado</th><th className="num">Valor recibido</th><th className="num">Mérito</th><th>Ritmo</th><th>Comunicado</th></tr></thead>
            <tbody>
              {balances.map(({ c, b, r }) => (
                <tr key={c.id} style={c.id === company.id ? { background: "var(--graphite)" } : undefined}>
                  <td><Link href={`/empresa/${c.slug}`}>{c.name}</Link></td>
                  <td className="num">{b.given}</td><td className="num">{b.received}</td>
                  <td className="num money">{eur(b.valueGiven)}</td><td className="num money">{eur(b.valueReceived)}</td>
                  <td className="num">{b.merit}</td>
                  <td><span className={`badge ${r.lastAction === "RELEASE_NOTICE" || r.missedStreak >= 2 ? "red" : r.thisWeek.validCount >= r.minimum ? "green" : ""}`}>{r.label}</span></td>
                  <td><span className={`badge ${statusByCompany.get(c.id) === "APPROVED" ? "green" : ""}`}>{statusByCompany.get(c.id) === "APPROVED" ? "Aprobado" : statusByCompany.get(c.id) === "CONTINUITY" ? "Continuidad" : statusByCompany.get(c.id) ? "Pendiente" : "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
