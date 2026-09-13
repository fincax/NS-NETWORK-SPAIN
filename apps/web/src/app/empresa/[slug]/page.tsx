import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { balance } from "@/services/today";
import { eur } from "@/lib/format";
import { AgentAvatar } from "@/components/brand";

export default async function EmpresaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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
        <section className="card"><p className="eyebrow">Cómo presentarla</p><p>{dna.referrals.introduction_preferences || "Sin preferencia declarada."}</p><p className="mono" style={{ marginTop: 8 }}>Ticket {dna.commercial.ticket_min?.toLocaleString("es-ES") ?? "—"} – {dna.commercial.ticket_max?.toLocaleString("es-ES") ?? "—"} € · capacidad {dna.offering.capacity.toLowerCase()} · {person?.fullName} ({person?.role})</p></section>
      </div>
      {own ? (
        <section className="card quiet">
          <p className="eyebrow">Solo tú ves esto</p>
          <p>Nunca se comparte: {dna.knowledge.never_share.join(", ") || "nada declarado"}. Tu ADN está en la versión {dnaRow.version}. La entrevista completa del Agente para ampliarlo llega en la siguiente iteración.</p>
        </section>
      ) : null}
    </div>
  );
}
