import Link from "next/link";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { SPECIALTY_NAME } from "@/db/nscat";
import { RELATION_LABEL, type ApunteRelation } from "@/services/apunte";
import { apunteAction } from "./actions";
import { publishSignalAction } from "../indicio/nuevo/actions";
import { DictationButton } from "@/components/dictation";

/**
 * Apunte (D-037). Pensado para el móvil, en la calle: cuatro campos, un toque. Lo demás lo hace el Agente.
 */
export default async function ApuntePage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { company } = await requireMember();
  const { ok, error } = await searchParams;

  if (ok) {
    const db = await getDb();
    const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, ok) });
    const needs = os && os.originatorCompanyId === company.id ? await db.query.needs.findMany({ where: eq(schema.needs.opportunitySignalId, os.id) }) : [];
    const top = needs.sort((a, b) => Number(b.plausibility) - Number(a.plausibility)).slice(0, 3);
    return (
      <div className="apunte">
        <p className="eyebrow">Apunte guardado</p>
        <h1 style={{ fontSize: 30 }}>Ya está en la memoria de tu Agente.</h1>
        <div className="card">
          {top.length ? (
            <>
              <p className="eyebrow">Lo que tu Agente ha entendido</p>
              <ul className="why">
                {top.map((n) => <li key={n.id}><span><strong>{SPECIALTY_NAME[n.specialtyHints[0]] ?? n.specialtyHints[0]}</strong> · {Math.round(Number(n.plausibility) * 100)} %</span></li>)}
              </ul>
            </>
          ) : (
            <p className="lead" style={{ fontSize: 15 }}>Tu Agente aún no ve una plaza clara para esta necesidad. Lo guarda igualmente: puedes completarlo más tarde o publicarlo y que la Mesa lo estudie.</p>
          )}
          <p className="mono" style={{ marginTop: 10 }}>Sigue en borrador. No sale de tu empresa hasta que tú lo publiques.</p>
        </div>
        <div className="stack">
          {os && os.status === "DRAFT" ? (
            <form action={publishSignalAction}><input type="hidden" name="id" value={os.id} /><button className="btn primary" type="submit" style={{ width: "100%" }}>Publicar en la Sala ahora</button></form>
          ) : null}
          <Link href="/apunte" className="btn" style={{ width: "100%" }}>Apuntar otro</Link>
          {os ? <Link href={`/indicio/${os.id}`} className="btn ghost" style={{ width: "100%" }}>Ver lo que verá la Sala</Link> : null}
          <Link href="/hoy" className="mono" style={{ textAlign: "center" }}>Volver a Hoy</Link>
        </div>
      </div>
    );
  }

  return (
    <form action={apunteAction} className="apunte">
      <div>
        <p className="eyebrow">{company.name} · Apunte</p>
        <h1 style={{ fontSize: 30 }}>Apunta un posible referido.</h1>
        <p className="lead" style={{ fontSize: 15 }}>Treinta segundos. Lo que no sepas, déjalo en blanco: tu Agente lo completará contigo.</p>
      </div>
      {error ? <div className="notice error">{error}</div> : null}
      <div className="field">
        <label htmlFor="who">Quién · empresa o persona</label>
        <input id="who" name="who" required autoFocus autoComplete="off" autoCapitalize="words" placeholder="Metalúrgica del Sur" />
      </div>
      <div className="field">
        <div className="row" style={{ justifyContent: "space-between" }}><label htmlFor="need">Qué necesita</label><DictationButton target="need" /></div>
        <textarea id="need" name="need" required minLength={5} style={{ minHeight: 96 }} placeholder="Abre planta nueva en Dos Hermanas y busca obra, seguros y 20 técnicos" />
      </div>
      <div className="chips" role="radiogroup" aria-label="Relación con el Interesado">
        {(Object.keys(RELATION_LABEL) as ApunteRelation[]).map((r) => (
          <label key={r}><input type="radio" name="relation" value={r} defaultChecked={r === "KNOWN"} />{RELATION_LABEL[r]}</label>
        ))}
      </div>
      <details>
        <summary className="mono" style={{ cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center" }}>Persona de contacto y observaciones</summary>
        <div className="stack" style={{ marginTop: 12 }}>
          <div className="form-grid">
            <div className="field"><label htmlFor="cn">Nombre</label><input id="cn" name="contactName" autoComplete="off" autoCapitalize="words" /></div>
            <div className="field"><label htmlFor="cr">Cargo</label><input id="cr" name="contactRole" autoComplete="off" /></div>
          </div>
          <div className="field"><div className="row" style={{ justifyContent: "space-between" }}><label htmlFor="notes">Observaciones</label><DictationButton target="notes" /></div><textarea id="notes" name="notes" style={{ minHeight: 80 }} placeholder="Presupuesto aprobado, decide en octubre, me lo comentó en la feria" /></div>
          <p className="hint">Los nombres de personas solo los ve tu empresa hasta que tú autorices la Apertura. Nunca escribas una contraprestación: un referido no se cobra.</p>
        </div>
      </details>
      <label className="toggle">
        <input type="checkbox" name="expectsContact" value="1" />
        <span>Ya sabe que le llamarán</span>
      </label>
      <button className="btn primary" type="submit">Guardar en mi Agente</button>
      <Link href="/hoy" className="mono" style={{ textAlign: "center" }}>Cancelar</Link>
    </form>
  );
}
