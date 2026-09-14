/**
 * Página pública del Aval de un titular (D-042). Fuera de la puerta de la demo: cualquiera puede verla.
 * Muestra solo lo que el fundador fijó: nombre de la empresa y su Aval, y de cada Eco el nombre que eligió el Interesado
 * y su valoración. Sin datos de contacto de nadie.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { Monogram } from "@/components/brand";
import { getDb } from "@/db/client";
import { publicAvalPage } from "@/services/eco";
import { avalBand, TITULAR_WEIGHTS } from "@/core/aval";

export const dynamic = "force-dynamic";

const fecha = (d: Date | null) => (d ? new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(d) : "");

export default async function AvalPublicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await getDb();
  const p = await publicAvalPage(db, slug);
  if (!p) notFound();
  const band = avalBand(p.total);
  return (
    <main className="public-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "40px 16px" }}>
      <div className="card" style={{ width: "100%", maxWidth: 640, display: "grid", gap: 22 }}>
        <Link href="/" className="brand" aria-label="NS Network Spain">
          <Monogram size={34} />
          <span><span className="wordmark">NS Network</span><br /><span className="lockup">Aval · {p.zoneName} · {p.chapterName}</span></span>
        </Link>

        <div>
          <p className="eyebrow">{p.specialtyName ? `Titular de ${p.specialtyName}` : "Miembro"}</p>
          <h1 style={{ fontSize: 30 }}>{p.companyName}</h1>
          <div className="row" style={{ alignItems: "baseline", gap: 18, marginTop: 12 }}>
            <span className="encaje" aria-label={`Aval ${p.total} sobre 100, ${band.label}`}>{p.total}<small>{p.provisional ? "Aval provisional" : band.label}</small></span>
            <span className="lead" style={{ fontSize: 14 }}>El Aval es el número público que respalda a una empresa en NS Network: lo que dicen los clientes a los que atendió por presentación de otro miembro, la calidad de lo que cede, cómo responde y cuánto contribuye. Nunca un ranking.</span>
          </div>
        </div>

        <ul className="plain">
          {p.blocks.map((b) => (
            <li key={b.key} style={{ display: "grid", gap: 4 }}>
              <div className="row">
                <span className="mono" style={{ minWidth: 190 }}>{b.label} · {Math.round(TITULAR_WEIGHTS[b.key as keyof typeof TITULAR_WEIGHTS] * 100)} %</span>
                <span className="bar" aria-hidden="true"><span style={{ width: `${Math.round(b.value * 100)}%` }} /></span>
                <span className="mono" style={{ minWidth: 70, textAlign: "right", color: b.hasData ? "var(--porcelain)" : undefined }}>{Math.round(b.value * 100)}{b.hasData ? "" : " · neutro"}</span>
              </div>
              <span className="mono">{b.evidence}</span>
            </li>
          ))}
        </ul>

        <section style={{ display: "grid", gap: 12 }}>
          <p className="eyebrow">La palabra de sus Interesados · {p.ecosCount} Eco{p.ecosCount === 1 ? "" : "s"} recibido{p.ecosCount === 1 ? "" : "s"}</p>
          {p.ecos.length === 0 ? (
            <p className="mono">{p.ecosCount ? "Ningún Interesado ha autorizado todavía publicar su Eco con su nombre." : "Todavía sin Ecos: el Aval arranca en su valor neutro."}</p>
          ) : (
            p.ecos.map((e, i) => (
              <p key={i} className="eco-quote">{e.comment ? `“${e.comment}”` : "Sin comentario."}<span className="mono">{e.displayName} · {e.score} sobre 100{e.submittedAt ? ` · ${fecha(e.submittedAt)}` : ""}</span></p>
            ))
          )}
        </section>

        <p className="mono">Cada Eco lo deja el propio cliente tras una presentación entre miembros, desde un enlace único, y se publica solo con su consentimiento. NS Network no muestra datos de contacto de nadie en esta página. <Link href="/#plaza">Solicitar plaza</Link>.</p>
      </div>
    </main>
  );
}
