import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { balance } from "@/services/today";
import { eur } from "@/lib/format";
import { AgentAvatar } from "@/components/brand";
import { openDemands } from "@/services/demands";
import { createDemandAction, closeDemandAction, addSourceAction, removeSourceAction, runOwnSourcesAction } from "./actions";
import { listSources, MAX_SOURCES_PER_AGENT } from "@/services/sources";
import { dateTime } from "@/lib/format";

export default async function EmpresaPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ fuente?: string }> }) {
  const { slug } = await params;
  const { fuente: sourceError } = await searchParams;
  const { company: me, chapter } = await requireMember();
  const db = await getDb();
  const company = await db.query.companies.findFirst({ where: eq(schema.companies.slug, slug) });
  if (!company || company.chapterId !== chapter.id) notFound();
  const dnaRow = await db.query.businessDna.findFirst({ where: eq(schema.businessDna.companyId, company.id) });
  const person = await db.query.members.findFirst({ where: and(eq(schema.members.companyId, company.id), eq(schema.members.isPrimary, true)) });
  const seat = await db.select({ name: schema.specialties.name }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.categorySeats.companyId, company.id));
  const bal = await balance(db, chapter.id, company.id);
  const distinctions = await db.query.recognitions.findMany({ where: eq(schema.recognitions.toCompanyId, company.id) });
  const own = company.id === me.id;
  const demandsOpen = await openDemands(db, chapter.id, company.id);
  const sources = own ? await listSources(db, company.id) : [];
  const dna = dnaRow?.dna;
  if (!dna) notFound();
  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="page-head">
        <div>
          <p className="eyebrow">Dossier · plaza de {seat[0]?.name}</p>
          <h1>{company.name}</h1>
          <p className="lead">{dna.company.description}</p>
        </div>
        <AgentAvatar state={own ? "analizando" : "reposo"} label={own ? "Tu Agente, en la Mesa" : `Agente de ${company.name}`} />
      </div>
      <div className="grid grid-3">
        <div className="card kpi"><span className="value">{bal.given}</span><span className="label">Cesiones hechas</span></div>
        <div className="card kpi"><span className="value">{bal.received}</span><span className="label">Cesiones recibidas</span></div>
        <div className="card kpi"><span className="value green money" style={{ fontSize: 26 }}>{eur(bal.valueGiven)}</span><span className="label">valor contrastado generado para otros</span></div>
        <div className="card kpi"><span className="value">{bal.merit}</span><span className="label">Mérito · {distinctions.length} Distinciones</span></div>
      </div>
      <div className="grid grid-2">
        <section className="card"><p className="eyebrow">Qué hace</p><ul className="plain">{dna.offering.services.map((s) => <li key={s}>{s}</li>)}</ul></section>
        <section className="card"><p className="eyebrow">A quién sirve</p><p>{dna.ideal_customer.industries.join(", ") || "—"}</p><p className="mono" style={{ marginTop: 6 }}>{dna.ideal_customer.company_size.join(" · ") || "cualquier tamaño"} · {dna.ideal_customer.geography.join(", ")}</p><p style={{ marginTop: 8 }}>Señales: {dna.ideal_customer.triggers.map((t) => t.toLowerCase().replaceAll("_", " ")).join(", ") || "—"}</p></section>
        <section className="card"><p className="eyebrow">Cesión perfecta</p><p>{dna.referrals.perfect_referral || "—"}</p>{dna.referrals.disqualifiers.length ? <p className="mono" style={{ marginTop: 8 }}>Nunca: {dna.referrals.disqualifiers.join(", ")}</p> : null}</section>
        <section className="card"><p className="eyebrow">Cómo presentarla</p><p>{dna.referrals.introduction_preferences || "Sin preferencia declarada."}</p><p className="mono" style={{ marginTop: 8 }}>Ticket {dna.commercial.ticket_min?.toLocaleString("es-ES") ?? "—"} – {dna.commercial.ticket_max?.toLocaleString("es-ES") ?? "—"} € · capacidad {dna.offering.capacity.toLowerCase()} · Timonel: {person?.fullName} ({person?.role})</p></section>
      </div>
      <section className="card">
        <p className="eyebrow">Encargos · lo que busca ahora</p>
        {demandsOpen.length === 0 ? <p className="lead" style={{ fontSize: 14 }}>Sin Encargos abiertos.</p> : (
          <ul className="plain">
            {demandsOpen.map((d) => (
              <li key={d.id} className="row"><span>{d.text}</span>{d.trigger ? <span className="badge">{d.trigger.toLowerCase().replaceAll("_", " ")}</span> : null}<span className="spacer" />{own ? <form action={closeDemandAction}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="slug" value={company.slug} /><button className="btn small ghost" type="submit">Cerrar</button></form> : null}</li>
            ))}
          </ul>
        )}
        {own ? (
          <form action={createDemandAction} className="form-grid" style={{ marginTop: 14 }}>
            <input type="hidden" name="slug" value={company.slug} />
            <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="dt">Nuevo Encargo (los Agentes de la Sala lo usan para priorizar)</label><input id="dt" name="text" required minLength={10} placeholder="Busco empresas industriales de más de 50 empleados que abran planta en el área de Sevilla" /></div>
            <div className="field"><label htmlFor="dtr">Señal</label><select id="dtr" name="trigger" defaultValue=""><option value="">Cualquiera</option>{["NEW_SITE", "HEADCOUNT_GROWTH", "INTERNATIONAL_EXPANSION", "FUNDING_ROUND", "COMPANY_SALE", "NEW_PRODUCT", "DIGITALIZATION", "FLEET_RENEWAL", "REGULATORY_CHANGE", "LEADERSHIP_CHANGE"].map((t) => <option key={t} value={t}>{t.toLowerCase().replaceAll("_", " ")}</option>)}</select></div>
            <div className="field"><label htmlFor="din">Industria (opcional)</label><input id="din" name="industry" placeholder="Industrial" /></div>
            <div className="actions"><button className="btn" type="submit">Publicar Encargo</button></div>
          </form>
        ) : null}
      </section>
      {own ? (
        <section className="card" id="fuentes">
          <p className="eyebrow">Fuentes de mi Agente · lo que lee cada mañana</p>
          <p className="lead" style={{ fontSize: 14 }}>Además de las fuentes públicas de NS, tu Agente lee las direcciones que tú le des: prensa local, boletines, portales de licitaciones, asociaciones de tu sector. Pega la dirección del canal RSS o Atom. Lo que encuentre te lo deja en Hoy como Indicio en borrador.</p>
          {sourceError ? <div className="notice error" style={{ marginTop: 10 }}>{sourceError}</div> : null}
          {sources.length === 0 ? <p className="mono" style={{ marginTop: 10 }}>Tu Agente todavía no tiene fuentes propias.</p> : (
            <ul className="plain" style={{ marginTop: 10 }}>
              {sources.map((f) => (
                <li key={f.id} className="row">
                  <span><strong>{f.label}</strong> <span className="mono">{new URL(f.url).hostname}</span></span>
                  <span className={`badge ${f.lastStatus?.startsWith("error") ? "red" : f.lastStatus ? "green" : ""}`}>{f.lastStatus ? f.lastStatus.split(" · ")[0] : "sin leer aún"}</span>
                  <span className="mono">{f.lastStatus ? `${f.lastStatus.split(" · ").slice(1).join(" · ")}${f.lastFetchedAt ? ` · ${dateTime(f.lastFetchedAt)}` : ""}` : ""}</span>
                  <span className="spacer" />
                  <form action={removeSourceAction}><input type="hidden" name="id" value={f.id} /><input type="hidden" name="slug" value={company.slug} /><button className="btn small ghost" type="submit">Quitar</button></form>
                </li>
              ))}
            </ul>
          )}
          <form action={addSourceAction} className="form-grid" style={{ marginTop: 14 }}>
            <input type="hidden" name="slug" value={company.slug} />
            <div className="field"><label htmlFor="fl">Nombre de la fuente</label><input id="fl" name="label" required maxLength={80} placeholder="Diario de Sevilla · Economía" /></div>
            <div className="field"><label htmlFor="fu">Dirección (RSS o Atom)</label><input id="fu" name="url" required inputMode="url" placeholder="https://…/rss" /></div>
            <div className="actions" style={{ gridColumn: "1 / -1" }}>
              <button className="btn" type="submit" disabled={sources.length >= MAX_SOURCES_PER_AGENT}>Añadir fuente</button>
              <span className="mono">{sources.length} de {MAX_SOURCES_PER_AGENT}</span>
            </div>
          </form>
          {sources.length ? <form action={runOwnSourcesAction} style={{ marginTop: 10 }}><input type="hidden" name="slug" value={company.slug} /><button className="btn small ghost" type="submit">Leer mis fuentes ahora</button></form> : null}
        </section>
      ) : null}
      {own ? (
        <section className="card quiet">
          <p className="eyebrow">Solo tú ves esto</p>
          <p>Nunca se comparte: {dna.knowledge.never_share.join(", ") || "nada declarado"}. Tu ADN está en la versión {dnaRow.version}. La entrevista completa del Agente para ampliarlo llega en la siguiente iteración.</p>
        </section>
      ) : null}
    </div>
  );
}
