import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getTrialByToken } from "@/services/prueba";
import { Monogram } from "@/components/brand";
import { VALUE_BAND_RANGE } from "@/core/types";

export const dynamic = "force-dynamic";

const BAND: Record<string, string> = Object.fromEntries(Object.entries(VALUE_BAND_RANGE).map(([k, v]) => [k, `${(v.min / 1000).toFixed(0)}–${(v.max / 1000).toFixed(0)} mil €`]));
const TIMING: Record<string, string> = { IMMEDIATE: "inmediato", "30D": "30 días", "90D": "90 días", "180D": "6 meses", UNKNOWN: "plazo por confirmar" };

/** Informe público de la Prueba de Valor (D-050). Solo con el enlace; sin identidad de terceros ni capa 0. */
export default async function PruebaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();
  const trial = await getTrialByToken(db, token);
  if (!trial || !trial.report) notFound();
  const r = trial.report;
  return (
    <main className="shell" style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px" }}>
      <div className="row" style={{ gap: 12, marginBottom: 24 }}><Monogram size={34} state="green" /><span className="wordmark">NS Network</span><span className="mono">· Prueba de Valor · {r.candidate.chapterName}</span></div>
      <p className="eyebrow">{r.candidate.companyName} · {r.candidate.specialtyName}</p>
      <h1>Lo que tu Agente hizo por la Sala en {r.days} {r.days === 1 ? "día" : "días"}. Y lo que la Sala ya tiene para ti.</h1>
      <p className="lead">{r.summary}</p>

      <div className="grid grid-3" style={{ margin: "24px 0" }}>
        <div className="card kpi"><span className="value">{r.ceded.count}</span><span className="label">Indicios que habrías cedido</span></div>
        <div className="card kpi"><span className="value">{r.ceded.receivers}</span><span className="label">titulares que los habrían recibido</span></div>
        <div className="card kpi"><span className="value green">{r.forYou.count}</span><span className="label">necesidades de {r.candidate.specialtyName} que la Sala ya detectó</span></div>
      </div>

      <section className="section">
        <h2>1 · Lo que tu Agente habría cedido</h2>
        <p className="lead" style={{ fontSize: 14 }}>En NS nadie busca para sí. Tu Agente ha leído fuentes públicas de la zona y ha encontrado esto para otros titulares. Cada uno es un Indicio que tú habrías cedido con un toque.</p>
        {r.ceded.items.length === 0 ? <p className="mono">Ningún Indicio todavía: las fuentes públicas no han traído hechos nuevos en estos días.</p> : (
          <div className="stack">
            {r.ceded.items.map((it, i) => (
              <article key={i} className="card">
                <p className="eyebrow">{it.source} · {it.publishedAt}</p>
                <strong>{it.title}</strong>
                <ul className="plain" style={{ marginTop: 8 }}>
                  {it.needs.map((n, j) => <li key={j} className="row"><span>{n.description}</span><span className="badge">{n.specialties.join(" · ")}</span>{n.receivers.length ? <span className="mono">→ {n.receivers.join(", ")}</span> : <span className="mono">plaza vacante · Embajada</span>}</li>)}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <h2>2 · Lo que la Sala ya ha encontrado para tu especialidad</h2>
        <p className="lead" style={{ fontSize: 14 }}>Los Agentes de {r.forYou.fromAgents} titular(es) detectaron en el último mes {r.forYou.count} necesidad(es) de {r.candidate.specialtyName}. Sin titular, {r.forYou.uncovered} se quedaron sin atender. Lo ves en agregado: la identidad solo se revela a un titular, con permiso del cedente.</p>
        <div className="grid grid-3">
          <div className="card"><p className="eyebrow">Sectores</p><ul className="plain">{r.forYou.industries.length ? r.forYou.industries.map((x) => <li key={x.name}>{x.name} · {x.count}</li>) : <li className="mono">—</li>}</ul></div>
          <div className="card"><p className="eyebrow">Valor estimado</p><ul className="plain">{r.forYou.valueBands.length ? r.forYou.valueBands.map((x) => <li key={x.band}>{BAND[x.band] ?? x.band} · {x.count}</li>) : <li className="mono">—</li>}</ul></div>
          <div className="card"><p className="eyebrow">Plazo</p><ul className="plain">{r.forYou.timings.length ? r.forYou.timings.map((x) => <li key={x.timing}>{TIMING[x.timing] ?? x.timing} · {x.count}</li>) : <li className="mono">—</li>}</ul></div>
        </div>
      </section>

      <section className="section card">
        <h2 style={{ marginBottom: 6 }}>Solicitar la plaza de {r.candidate.specialtyName} en {r.candidate.chapterName}</h2>
        <p>Una empresa por especialidad. Al ocupar la plaza aceptas las Normas NS: nunca se cobra por un referido; al menos una Cesión válida a la semana; la calidad vale más que la cantidad; y tu Agente busca para los demás, como los demás buscan para ti.</p>
        <p className="mono" style={{ marginTop: 8 }}>Informe generado el {new Date(r.generatedAt).toLocaleDateString("es-ES")}. Datos de fuentes públicas y de la actividad agregada de la Sala. Ningún dato personal de terceros.</p>
      </section>
    </main>
  );
}
