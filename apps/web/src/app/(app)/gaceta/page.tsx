import Link from "next/link";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { gaceta } from "@/services/comunicados";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

/** La Gaceta (Protocolo II, D-070): el digesto semanal de la Sala, con "relevante para ti" primero. */
export default async function GacetaPage() {
  const { company, chapter } = await requireMember();
  const db = await getDb();
  const g = await gaceta(db, chapter.id, company.id);
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · Dar a Conocer</p>
          <h1>Gaceta · semana {g.week}</h1>
          <p className="lead">{g.published ? `${g.totals.comunicados} Comunicados (${g.totals.approved} aprobados, ${g.totals.continuity} de continuidad) · ${g.totals.news} novedades · ${g.totals.won} cierres contrastados · ${g.totals.encargos} Encargos abiertos.` : "La primera Gaceta sale el viernes a las 14:00, con los Comunicados de esta semana."}</p>
        </div>
      </div>

      {!g.published ? <Empty title="Todavía no hay Gaceta.">Cada lunes tu Agente redacta tu Comunicado; lo apruebas con un toque en Hoy. El viernes a las 14:00 el Chapter Intelligence los compila aquí.</Empty> : null}

      {g.published ? (
        <section className="section">
          <h2 style={{ marginBottom: 12 }}>Relevante para ti</h2>
          {g.relevant.length === 0 ? <p className="lead" style={{ fontSize: 14 }}>Sin novedades que afecten a tus Cesiones esta semana.</p> : (
            <div className="grid grid-2">
              {g.relevant.map((e) => (
                <Link key={e.comunicado.id} href={`/empresa/${e.companySlug}`} className="card amber" style={{ display: "grid", gap: 8, textDecoration: "none" }}>
                  <strong>{e.companyName}</strong>
                  <span>{e.why}</span>
                  <span className="mono">{e.comunicado.stable.specialty} · capacidad {e.comunicado.stable.capacity_now}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {g.published ? (
        <section className="section">
          <h2 style={{ marginBottom: 12 }}>En la Sala esta semana</h2>
          <div className="stack" style={{ gap: 10 }}>
            {g.all.map((e) => (
              <article key={e.comunicado.id} className="card" style={{ display: "grid", gap: 6 }}>
                <div className="row" style={{ justifyContent: "space-between" }}><Link href={`/empresa/${e.companySlug}`}><strong>{e.companyName}</strong></Link><span className="mono">{e.comunicado.status === "APPROVED" ? "aprobado por su Timonel" : "continuidad · solo lo estable"}</span></div>
                <pre style={{ whiteSpace: "pre-wrap", font: "inherit", fontSize: 14, margin: 0 }}>{e.text}</pre>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
