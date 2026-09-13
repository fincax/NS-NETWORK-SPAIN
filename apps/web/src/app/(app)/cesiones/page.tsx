import Link from "next/link";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { eurRange, dateTime } from "@/lib/format";
import { Empty, StateBadge } from "@/components/ui";

export default async function CesionesPage() {
  const { company, chapter, member } = await requireMember();
  const db = await getDb();
  const rows = await db.query.referrals.findMany({
    where: member.isDirector
      ? eq(schema.referrals.chapterId, chapter.id)
      : and(eq(schema.referrals.chapterId, chapter.id), or(eq(schema.referrals.receiverCompanyId, company.id), eq(schema.referrals.originatorCompanyId, company.id))),
    orderBy: [desc(schema.referrals.updatedAt)],
  });
  const companies = new Map((await db.query.companies.findMany()).map((c) => [c.id, c]));
  const matches = new Map((await db.query.matchCandidates.findMany({ where: inArray(schema.matchCandidates.id, rows.map((r) => r.matchId).concat("00000000-0000-0000-0000-000000000000")) })).map((m) => [m.id, m]));
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · Cesiones</p>
          <h1>Lo que das y lo que recibes.</h1>
          <p className="lead">{member.isDirector ? "Como Directiva ves todas las Cesiones de la Sala." : "Cesiones en las que tu empresa es cedente o cesionaria."}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <Empty title="Todavía no hay Cesiones con tu empresa.">Tu Agente está en la Mesa buscando.</Empty>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Estado</th><th>Cesión</th><th>Encaje</th><th className="num">Valor</th><th>Actualizada</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const m = matches.get(r.matchId);
                const gives = r.originatorCompanyId === company.id;
                return (
                  <tr key={r.id}>
                    <td><StateBadge state={r.state} /></td>
                    <td><Link href={`/cesiones/${r.id}`}>{companies.get(r.originatorCompanyId)?.name} → {companies.get(r.receiverCompanyId)?.name}</Link><br /><span className="mono">{gives ? "cedes" : r.receiverCompanyId === company.id ? "recibes" : "Sala"}</span></td>
                    <td>{m ? `${Math.round(m.score.total * 100)} %` : "—"}</td>
                    <td className="num money">{r.valueVerified ? `${r.valueVerified.toLocaleString("es-ES")} €` : eurRange(r.valuePotentialMin, r.valuePotentialMax)}</td>
                    <td className="mono">{dateTime(r.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
