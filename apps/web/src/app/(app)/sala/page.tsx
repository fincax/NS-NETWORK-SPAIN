import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { balance } from "@/services/today";
import { eur } from "@/lib/format";
import { openDemands } from "@/services/demands";
import { compromisoStatus } from "@/services/compromiso";
import { MANANTIALES } from "@/db/nscat";

export default async function SalaPage() {
  const { chapter, company } = await requireMember();
  const db = await getDb();
  const seats = await db.select({ id: schema.categorySeats.id, status: schema.categorySeats.status, specialtyName: schema.specialties.name, code: schema.specialties.nscatCode, companyId: schema.categorySeats.companyId }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.categorySeats.chapterId, chapter.id)).orderBy(asc(schema.specialties.name));
  const companies = await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapter.id), orderBy: [asc(schema.companies.name)] });
  const byId = new Map(companies.map((c) => [c.id, c]));
  const balances = await Promise.all(companies.filter((c) => c.status === "ACTIVE" || c.status === "SUSPENDED").map(async (c) => ({ c, b: await balance(db, chapter.id, c.id), r: await compromisoStatus(db, chapter.id, c.id) })));
  const occupied = seats.filter((s) => s.status === "ACTIVE").length;
  const demandsOpen = await openDemands(db, chapter.id);
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
        <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Lo que cada titular da y recibe. Ordenada por plaza, nunca un ranking. Solo valor contrastado.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Titular</th><th className="num">Cesiones dadas</th><th className="num">Recibidas</th><th className="num">Valor generado</th><th className="num">Valor recibido</th><th className="num">Mérito</th><th>Ritmo</th></tr></thead>
            <tbody>
              {balances.map(({ c, b, r }) => (
                <tr key={c.id} style={c.id === company.id ? { background: "var(--graphite)" } : undefined}>
                  <td><Link href={`/empresa/${c.slug}`}>{c.name}</Link></td>
                  <td className="num">{b.given}</td><td className="num">{b.received}</td>
                  <td className="num money">{eur(b.valueGiven)}</td><td className="num money">{eur(b.valueReceived)}</td>
                  <td className="num">{b.merit}</td>
                  <td><span className={`badge ${r.lastAction === "RELEASE_NOTICE" || r.missedStreak >= 2 ? "red" : r.thisWeek.validCount >= r.minimum ? "green" : ""}`}>{r.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
