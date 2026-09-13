import { requireMember } from "@/lib/session";
import { createSignalAction } from "./actions";

export default async function NuevoIndicioPage() {
  const { company } = await requireMember();
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{company.name} · Despacho</p>
          <h1>Cuéntaselo a tu Agente.</h1>
          <p className="lead">Describe lo que sabes de un Interesado como se lo contarías a un socio. Tu Agente lo estructura como Indicio, protege la identidad y lo lleva a la Mesa. Antes de publicar verás exactamente lo que verán los demás.</p>
        </div>
      </div>
      <form action={createSignalAction} className="stack" style={{ maxWidth: 760 }}>
        <div className="field">
          <label htmlFor="raw">Lo que sabes</label>
          <textarea id="raw" name="rawContent" required minLength={20} style={{ minHeight: 160 }} placeholder="Mi cliente Metalúrgica del Sur abre planta en Dos Hermanas en Q1, 60 empleados nuevos. Presupuesto de obra aprobado. Decide el Director General, al que le aseguro la flota." />
          <span className="hint">Nunca escribas una contraprestación: un referido no se cobra. Los nombres de personas solo se usan en la capa 2 y con base jurídica.</span>
        </div>
        <fieldset>
          <legend>Visibilidad</legend>
          <div className="radio-row">
            <label><input type="radio" name="visibility" value="CHAPTER" defaultChecked /> Sala · tu Agente publica la capa 0 (sin identidad)</label>
            <label><input type="radio" name="visibility" value="COMPANY_ONLY" /> Solo mi empresa · tu Agente busca sin publicar nada</label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Persona de contacto (opcional · capa 2)</legend>
          <div className="form-grid">
            <div className="field"><label htmlFor="cn">Nombre</label><input id="cn" name="contactName" /></div>
            <div className="field"><label htmlFor="cr">Cargo</label><input id="cr" name="contactRole" /></div>
            <div className="field"><label htmlFor="lb">Base jurídica para revelarla</label>
              <select id="lb" name="legalBasisForContact" defaultValue="NONE">
                <option value="NONE">Ninguna (solo se revelará la empresa)</option>
                <option value="LEGITIMATE_INTEREST">Interés legítimo (relación comercial previa)</option>
                <option value="CONSENT">Consentimiento de la persona</option>
                <option value="CONTRACT">Relación contractual</option>
              </select>
            </div>
          </div>
        </fieldset>
        <div className="actions"><button className="btn primary" type="submit">Entregar a mi Agente</button></div>
      </form>
    </div>
  );
}
