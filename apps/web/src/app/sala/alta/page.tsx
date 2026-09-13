import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { onboardAction } from "./actions";

export default async function AltaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { chapter } = await requireMember();
  const { error } = await searchParams;
  const db = await getDb();
  const seats = await db.select({ status: schema.categorySeats.status, name: schema.specialties.name, code: schema.specialties.nscatCode, holderId: schema.categorySeats.companyId }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.categorySeats.chapterId, chapter.id)).orderBy(asc(schema.specialties.name));
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · Candidatura</p>
          <h1>Solicitar plaza.</h1>
          <p className="lead">Una empresa por especialidad. Comprueba la disponibilidad de la plaza y describe el negocio como lo haría su Agente: a quién sirve, qué señales anticipan una oportunidad y cómo es su Cesión perfecta. En producción esta entrevista la conduce el Agente.</p>
        </div>
      </div>
      {error ? <div className="notice error">{error}</div> : null}
      <form action={onboardAction} className="stack" style={{ maxWidth: 820 }}>
        <fieldset>
          <legend>Plaza</legend>
          <div className="field">
            <label htmlFor="sp">Especialidad (NS-CAT)</label>
            <select id="sp" name="specialtyCode" required defaultValue="">
              <option value="" disabled>Comprobar disponibilidad de mi sector…</option>
              {seats.map((s) => <option key={s.code} value={s.code} disabled={s.status === "ACTIVE"}>{s.name} · {s.status === "ACTIVE" ? "ocupada" : "vacante"}</option>)}
            </select>
          </div>
        </fieldset>
        <fieldset>
          <legend>Empresa y Timonel</legend>
          <div className="form-grid">
            <div className="field"><label htmlFor="n">Nombre comercial</label><input id="n" name="name" required /></div>
            <div className="field"><label htmlFor="w">Web</label><input id="w" name="website" type="url" placeholder="https://" /></div>
            <div className="field"><label htmlFor="pn">Timonel (la persona que decide por la empresa)</label><input id="pn" name="personName" required /></div>
            <div className="field"><label htmlFor="pr">Cargo</label><input id="pr" name="personRole" required /></div>
            <div className="field"><label htmlFor="pe">Correo</label><input id="pe" name="personEmail" type="email" required /></div>
          </div>
        </fieldset>
        <fieldset>
          <legend>ADN de Empresa (mínimo para activar el Agente)</legend>
          <div className="stack">
            <div className="field"><label htmlFor="d">Qué hace la empresa</label><textarea id="d" name="description" required /></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="s">Servicios (uno por línea)</label><textarea id="s" name="services" required /></div>
              <div className="field"><label htmlFor="i">Industrias del cliente ideal (una por línea)</label><textarea id="i" name="industries" /></div>
              <div className="field"><label htmlFor="g">Zonas donde trabaja (una por línea)</label><textarea id="g" name="geography" defaultValue={"Sevilla\nAndalucía"} /></div>
              <div className="field"><label htmlFor="t">Señales que anticipan una oportunidad</label>
                <select id="t" name="triggers" multiple size={6}>
                  {["NEW_SITE", "HEADCOUNT_GROWTH", "INTERNATIONAL_EXPANSION", "FUNDING_ROUND", "COMPANY_SALE", "NEW_PRODUCT", "DIGITALIZATION", "FLEET_RENEWAL", "REGULATORY_CHANGE", "LEADERSHIP_CHANGE"].map((t) => <option key={t} value={t}>{t.replaceAll("_", " ").toLowerCase()}</option>)}
                </select>
              </div>
              <div className="field"><label htmlFor="tmin">Ticket mínimo (€)</label><input id="tmin" name="ticket_min" type="number" min={0} step={500} /></div>
              <div className="field"><label htmlFor="tmax">Ticket máximo (€)</label><input id="tmax" name="ticket_max" type="number" min={0} step={500} /></div>
            </div>
            <div className="field"><label htmlFor="pr2">Explícame una situación real que para ti sería la Cesión perfecta</label><textarea id="pr2" name="perfect_referral" required /></div>
            <div className="field"><label htmlFor="dq">Lo que nunca quieres recibir (una por línea)</label><textarea id="dq" name="disqualifiers" /></div>
          </div>
        </fieldset>
        <div className="actions"><button className="btn primary" type="submit">Activar la plaza y el Agente</button></div>
      </form>
    </div>
  );
}
