import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { onboardAction } from "./actions";
import { SPECIALTY_NAME } from "@/db/nscat";

export default async function AltaPage({ searchParams }: { searchParams: Promise<{ error?: string; candidatura?: string }> }) {
  const { chapter } = await requireMember();
  const { error, candidatura } = await searchParams;
  const db = await getDb();
  const cand = candidatura ? await db.query.betaRequests.findFirst({ where: eq(schema.betaRequests.id, candidatura) }) : undefined;
  const fromCandidacy = cand && cand.status === "APPROVED" ? cand : undefined;
  const seats = await db.select({ status: schema.categorySeats.status, name: schema.specialties.name, code: schema.specialties.nscatCode, holderId: schema.categorySeats.companyId }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.categorySeats.chapterId, chapter.id)).orderBy(asc(schema.specialties.name));
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">{chapter.name} · Candidatura</p>
          <h1>Solicitar plaza.</h1>
          <p className="lead">Una empresa por especialidad. Comprueba la plaza, da de alta a la empresa y a su Timonel, y deja el resto al Agente: la entrevista del ADN empieza en cuanto se activa la plaza.</p>
        </div>
      </div>
      {error ? <div className="notice error">{error}</div> : null}
      {fromCandidacy ? <div className="notice amber">Alta desde la candidatura aprobada de <strong>{fromCandidacy.companyName}</strong>{fromCandidacy.specialtyCode ? ` · ${SPECIALTY_NAME[fromCandidacy.specialtyCode]}` : ""}. Al activar la plaza, la candidatura pasa a titular activo.</div> : null}
      <form action={onboardAction} className="stack" style={{ maxWidth: 820 }}>
        {fromCandidacy ? <input type="hidden" name="candidacyId" value={fromCandidacy.id} /> : null}
        <fieldset>
          <legend>Plaza</legend>
          <div className="field">
            <label htmlFor="sp">Especialidad (NS-CAT)</label>
            <select id="sp" name="specialtyCode" required defaultValue={fromCandidacy?.specialtyCode ?? ""}>
              <option value="" disabled>Comprobar disponibilidad de mi sector…</option>
              {seats.map((s) => <option key={s.code} value={s.code} disabled={s.status === "ACTIVE"}>{s.name} · {s.status === "ACTIVE" ? "ocupada" : "vacante"}</option>)}
            </select>
          </div>
        </fieldset>
        <fieldset>
          <legend>Empresa y Timonel</legend>
          <div className="form-grid">
            <div className="field"><label htmlFor="n">Nombre comercial</label><input id="n" name="name" required defaultValue={fromCandidacy?.companyName} /></div>
            <div className="field"><label htmlFor="w">Web</label><input id="w" name="website" type="url" placeholder="https://" /></div>
            <div className="field"><label htmlFor="pn">Timonel (la persona que decide por la empresa)</label><input id="pn" name="personName" required defaultValue={fromCandidacy?.fullName} /></div>
            <div className="field"><label htmlFor="pr">Cargo</label><input id="pr" name="personRole" required /></div>
            <div className="field"><label htmlFor="pe">Correo</label><input id="pe" name="personEmail" type="email" required defaultValue={fromCandidacy?.email} /></div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Para que el Agente empiece</legend>
          <div className="field"><label htmlFor="d">Qué hace la empresa, en una o dos frases</label><textarea id="d" name="description" required minLength={20} style={{ minHeight: 90 }} placeholder="Correduría de seguros para pymes industriales y flotas en la provincia de Sevilla. 12 personas, 20 años." defaultValue={fromCandidacy?.message ?? ""} /></div>
          <p className="hint">Lo demás (servicios, cliente ideal, señales, ticket, referido perfecto) lo pregunta el Agente en la entrevista, justo después de activar la plaza.</p>
        </fieldset>
        <div className="actions"><button className="btn primary" type="submit">Activar la plaza y empezar la entrevista</button></div>
      </form>
    </div>
  );
}
