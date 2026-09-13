import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { balance } from "@/services/today";
import { eur } from "@/lib/format";

export default async function SalaPage() {
  const { chapter, company } = await requireMember();
  const db = await getDb();
  const seats = await db.select({ id: schema.categorySeats.id, status: schema.categorySeats.status, specialtyName: schema.specialties.name, code: schema.specialties.nscatCode, companyId: schema.categorySeats.companyId }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.categorySeats.chapterId, chapter.id)).orderBy(asc(schema.specialties.name));
  const companies = await db.query.companies.findMany({ where: eq(schema.companies.chapterId, chapter.id), orderBy: [asc(schema.companies.name)] });
  const byId = new Map(companies.map((c) => [c.id, c]));
  const balances = await Promise.all(companies.map(async (c) => ({ c, b: await balance(db, chapter.id, c.id) })));
  const occupied = seats.filter((s) => s.status === "ACTIVE").length;
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">NS Sevilla · Sala</p>
          <h1>{chapter.name}</h1>
          <p className="lead">{occupied} plazas ocupadas · {seats.length - occupied} vacantes · Ritmo {chapter.weeklyPace} Cesión válida por semana y titular.</p>
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
                <span className="mono">{s.specialtyName}</span>
                {holder ? <Link className="name" href={`/empresa/${holder.slug}`}>{holder.name}{holder.id === company.id ? " · tú" : ""}</Link> : <span className="name">Plaza vacante · Antesala</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: 4 }}>Balanza</h2>
        <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Lo que cada titular da y recibe. Ordenada por plaza, nunca un ranking. Solo valor contrastado.</p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Titular</th><th className="num">Cesiones dadas</th><th className="num">Recibidas</th><th className="num">Valor generado</th><th className="num">Valor recibido</th><th className="num">Mérito</th></tr></thead>
            <tbody>
              {balances.map(({ c, b }) => (
                <tr key={c.id} style={c.id === company.id ? { background: "var(--graphite)" } : undefined}>
                  <td><Link href={`/empresa/${c.slug}`}>{c.name}</Link></td>
                  <td className="num">{b.given}</td><td className="num">{b.received}</td>
                  <td className="num money">{eur(b.valueGiven)}</td><td className="num money">{eur(b.valueReceived)}</td>
                  <td className="num">{b.merit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
