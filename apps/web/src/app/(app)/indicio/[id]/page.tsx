import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { SPECIALTY_NAME } from "@/db/nscat";
import type { SignalEnvelope } from "@/core/types";
import { publishSignalAction, withdrawSignalAction } from "../nuevo/actions";

export default async function IndicioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { company } = await requireMember();
  const db = await getDb();
  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, id) });
  if (!os || os.originatorCompanyId !== company.id) notFound();
  const needs = await db.query.needs.findMany({ where: eq(schema.needs.opportunitySignalId, os.id) });
  const env = os.envelope as SignalEnvelope;
  const internal = os.visibility === "COMPANY_ONLY";
  const bs = await db.query.businessSignals.findFirst({ where: eq(schema.businessSignals.id, os.businessSignalId) });
  const isPublic = bs?.source === "PUBLIC_RECORD";
  const l0 = env.chapter_layer;
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Indicio · {os.status === "DRAFT" ? "previsualización" : os.status.toLowerCase()}</p>
          <h1>{internal ? "Esto no saldrá de tu empresa." : isPublic ? "Tu Agente lo encontró en una fuente pública." : "Esto es exactamente lo que verá la Sala."}</h1>
          <p className="lead">{isPublic ? "Es un Indicio para otros titulares de la Sala: nadie de tu empresa lo ha aportado, lo ha detectado tu Agente. Si lo publicas, serás el cedente (relación débil, sin Interesado avisado) y ganarás Mérito si prospera." : internal ? "Tu Agente buscará qué plazas de la Sala cubrirían la necesidad sin emitir ningún mensaje. Solo tú verás el resultado." : "Capa 0: sin identidad, sin personas. El contexto detallado (capa 1) solo llega a los Agentes que declaren interés; la identidad (capa 2) solo tras tu Apertura."}</p>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <p className="eyebrow">Capa 0 · {internal ? "no se publica" : "visible en la Sala"}</p>
          <h2 style={{ fontSize: 20 }}>{l0.need_summary}</h2>
          <p className="mono" style={{ marginTop: 8 }}>{l0.industry} · {l0.company_size_band} empleados · {l0.geography.city ?? l0.geography.region} · {l0.timing} · {l0.value_band ?? "valor sin estimar"} · confianza {Math.round(l0.confidence * 100)} %</p>
        </section>
        <section className="card">
          <p className="eyebrow">Necesidades que tu Agente ha detectado</p>
          <ul className="plain">
            {needs.sort((a, b) => Number(b.plausibility) - Number(a.plausibility)).map((n) => (
              <li key={n.id}><span><strong>{SPECIALTY_NAME[n.specialtyHints[0]] ?? n.specialtyHints[0]}</strong> · {Math.round(Number(n.plausibility) * 100)} % · <span style={{ color: "var(--muted-2)" }}>{n.description}</span>{Number(n.plausibility) < 0.4 ? <span className="mono"> · latente</span> : null}</span></li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <p className="eyebrow">Capa 2 · solo tú, hasta la Apertura</p>
        {env.identity_layer ? <p><strong>{env.identity_layer.third_party_company.name}</strong>{env.identity_layer.contact_person ? ` · ${env.identity_layer.contact_person.name} (${env.identity_layer.contact_person.legal_basis})` : ""}</p> : <p className="lead" style={{ fontSize: 14 }}>No has nombrado al Interesado. Podrás hacerlo en la Apertura.</p>}
      </section>

      {os.status === "DRAFT" ? (
        <div className="actions">
          <form action={publishSignalAction}><input type="hidden" name="id" value={os.id} /><button className="btn primary" type="submit">{internal ? "Autorizar la búsqueda interna" : "Publicar en la Sala"}</button></form>
          <form action={withdrawSignalAction}><input type="hidden" name="id" value={os.id} /><button className="btn ghost" type="submit">Retirar</button></form>
        </div>
      ) : (
        <div className="notice">Indicio {os.status === "PUBLISHED" ? "publicado" : os.status.toLowerCase()}. Sigue a los Agentes en la Mesa Permanente.</div>
      )}
    </div>
  );
}
