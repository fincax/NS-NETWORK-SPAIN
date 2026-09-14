import Link from "next/link";
import { requireMember } from "@/lib/session";
import { DESTACADO, normas, RULE_SCOPE_LABEL, RULE_STATUS_LABEL, ventajas, type Rule } from "@/core/rulebook";

/** Reglamento (D-043): las Normas de obligado cumplimiento y las Ventajas de los destacados, tal como las verifica NS. */
export default async function ReglamentoPage() {
  const { chapter } = await requireMember();
  const n = normas();
  const v = ventajas();
  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · Reglamento</p>
          <h1>Normas para todos. Ventajas para los destacados.</h1>
          <p className="lead">Lo que obliga a todo titular y lo que gana quien destaca. Cada entrada dice cómo la verifica NS y qué pasa si se incumple. Nada aquí es un consejo: es protocolo.</p>
        </div>
        <Link href="/sala" className="btn">Volver a Mi Sala</Link>
      </div>

      <section className="section" style={{ marginTop: 0 }}>
        <h2>Normas · {n.filter((r) => r.status === "VIGENTE").length} vigentes de {n.length}</h2>
        <div className="stack">{n.map((r) => <RuleCard key={r.id} rule={r} />)}</div>
      </section>

      <section className="section">
        <h2>Ventajas · {v.filter((r) => r.status === "VIGENTE").length} vigentes de {v.length}</h2>
        <div className="card amber" style={{ marginBottom: 12 }}>
          <p className="eyebrow">Quién es titular destacado · criterio propuesto, pendiente del fundador</p>
          <p>{DESTACADO.text}</p>
        </div>
        <div className="stack">{v.map((r) => <RuleCard key={r.id} rule={r} />)}</div>
      </section>

      <p className="mono">Las Normas y Ventajas las fija el fundador y se registran en <code>docs/18_REGLAMENTO.md</code>. Borrador: anotada. Protocolizada: fijada y visible aquí. Vigente: NS la verifica y la aplica sola.</p>
    </div>
  );
}

function RuleCard({ rule }: { rule: Rule }) {
  const tone = rule.status === "VIGENTE" ? "green" : rule.status === "PROTOCOLIZADA" ? "amber" : rule.status === "BORRADOR" ? "" : "red";
  return (
    <article className="card" style={{ display: "grid", gap: 8 }}>
      <div className="row">
        <span className="mono">{rule.id}</span>
        <strong>{rule.title}</strong>
        {rule.immutable ? <span className="badge red">Inmutable</span> : null}
        <span className="spacer" />
        <span className={`badge ${tone}`}>{RULE_STATUS_LABEL[rule.status]}</span>
      </div>
      <p>{rule.text}</p>
      <p className="mono">{RULE_SCOPE_LABEL[rule.scope]} · desde {rule.since} · {rule.source}</p>
      <ul className="plain" style={{ fontSize: 13, color: "var(--muted-2)" }}>
        <li><span className="mono">Cómo se aplica</span> · {rule.mechanism}</li>
        {rule.consequence ? <li><span className="mono">{rule.kind === "NORMA" ? "Si se incumple" : "Qué se gana"}</span> · {rule.consequence}</li> : null}
        {rule.verification.length ? <li><span className="mono">Verificación</span> · {rule.verification.join(" · ")}</li> : <li><span className="mono">Verificación</span> · en construcción</li>}
      </ul>
    </article>
  );
}
