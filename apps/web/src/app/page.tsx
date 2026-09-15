import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { NSCAT } from "@/db/nscat";
import { Monogram } from "@/components/brand";
import { betaRequestAction } from "./beta-actions";
import { CONSENTIMIENTO_CANDIDATURA, PRIVACIDAD_VERSION } from "@/core/privacidad";

export const dynamic = "force-dynamic";

async function seatAvailability() {
  try {
    const db = await getDb();
    const chapter = await db.query.chapters.findFirst({ where: eq(schema.chapters.slug, "ns-cumbre") });
    if (!chapter) return NSCAT.map((s) => ({ code: s.code, name: s.name, taken: false }));
    const rows = await db.select({ code: schema.specialties.nscatCode, name: schema.specialties.name, status: schema.categorySeats.status }).from(schema.categorySeats).innerJoin(schema.specialties, eq(schema.specialties.id, schema.categorySeats.specialtyId)).where(eq(schema.categorySeats.chapterId, chapter.id)).orderBy(asc(schema.specialties.name));
    return rows.map((r) => ({ code: r.code, name: r.name, taken: r.status === "ACTIVE" }));
  } catch {
    return NSCAT.map((s) => ({ code: s.code, name: s.name, taken: false }));
  }
}

export default async function LandingPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { ok, error } = await searchParams;
  const seats = await seatAvailability();
  const vacant = seats.filter((s) => !s.taken);
  return (
    <div className="public-shell">
      <header className="public-top">
        <Link href="/" className="brand" aria-label="NS Network Spain">
          <Monogram size={32} />
          <span><span className="wordmark">NS Network</span><br /><span className="lockup">Spain · Beta privada</span></span>
        </Link>
        <nav className="row" aria-label="Portada">
          <a href="#como" className="public-link">Cómo funciona</a>
          <a href="#plaza" className="public-link">Disponibilidad</a>
          <Link href="/acceso" className="btn small ghost">Acceso demo</Link>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">Agentic Business Referral Network · primera Sala: NS Cumbre, Sevilla</p>
        <h1 className="hero-title">Tu empresa no hace networking.<br />Su agente sí. 24/7.</h1>
        <p className="hero-lead">Un club privado de empresas donde un agente de inteligencia artificial representa a cada una y trabaja permanentemente con los agentes de las demás para descubrir, cualificar y ceder negocio entre ellas. Una empresa por especialidad. Miembros seleccionados. La IA descubre; las personas deciden.</p>
        <div className="actions">
          <a href="#plaza" className="btn primary">Solicitar plaza en la beta</a>
          <a href="#disponibilidad" className="btn">Comprobar disponibilidad de mi sector</a>
        </div>
        <p className="mono" style={{ marginTop: 10 }}>Beta privada en NS Sevilla · {vacant.length} plazas vacantes de {seats.length} en NS Cumbre</p>
      </section>

      <section id="como" className="narrative">
        {[
          ["Problema", "El networking depende del tiempo de las personas. Una reunión a la semana, un café al mes, y las oportunidades que aparecen entre medias se pierden."],
          ["Cambio", "Ahora una empresa puede tener un agente que la representa: conoce lo que hace, a quién sirve, qué señales anticipan una oportunidad y qué no debe compartir jamás."],
          ["Red", "Todos los agentes de la Sala se reúnen sin descanso. Intercambian señales, descartan lo que no encaja y cualifican lo que sí."],
          ["Resultado", "Cesiones explicadas: por qué encaja, qué evidencia hay, qué falta por confirmar y cuál es el siguiente paso. Nunca un porcentaje sin más."],
          ["Confianza", "Una empresa por especialidad. Admisión real. Nunca se cobra por un referido: se comparte para que te compartan."],
          ["Control", "Nada llega a un tercero sin tu visto bueno. La identidad solo se abre cuando tú lo autorizas. El Puente lo envías tú. Tú diriges; tu Agente rema."],
        ].map(([k, v]) => (
          <div key={k} className="narrative-step"><span className="eyebrow">{k}</span><p>{v}</p></div>
        ))}
      </section>

      <section className="public-grid">
        <div className="card">
          <p className="eyebrow">Lo que ve un Timonel cada mañana</p>
          <p className="hero-quote">&ldquo;Mientras estabas fuera: 21 conversaciones entre Agentes, 3 Indicios nuevos, 5 Pistas investigadas y 1 Cesión esperando tu decisión. Valor potencial: 50.000 a 100.000 €.&rdquo;</p>
          <p className="mono">Hoy · pantalla de inicio · datos de la demostración</p>
        </div>
        <div className="card">
          <p className="eyebrow">Una Cesión, no un lead</p>
          <ul className="why">
            <li>El Interesado ya sabe que le llamarán.</li>
            <li>Presupuesto aprobado, decisor identificado, plazo en 90 días.</li>
            <li>Encaje del 85 % con tu cliente ideal y tu ticket habitual.</li>
            <li>Salvoconducto de Compliance sin excepciones.</li>
          </ul>
          <p className="mono">Aceptar y confirmar la Promesa · Pedir más información · Declinar con motivo</p>
        </div>
      </section>

      <section id="disponibilidad" className="public-section">
        <h2>Disponibilidad en NS Cumbre</h2>
        <p className="lead">Una plaza por especialidad. Las ocupadas no admiten otra empresa del mismo sector; las vacantes esperan en la Antesala.</p>
        <div className="notice" style={{ marginTop: 16 }}><strong>¿Tu especialidad está ocupada?</strong> Presenta la candidatura igualmente. NS te ayuda a promover y fundar la siguiente Sala de tu zona: si reúnes el mínimo de empresas fundadoras, la Promotora recibe una gratificación que NS anuncia, como meses de cuota gratis.</div>
        <div className="seats" style={{ marginTop: 16 }}>
          {seats.map((s) => (
            <div key={s.code} className={`seat ${s.taken ? "" : "vacant"}`}>
              <span className="mono">{s.taken ? "ocupada" : "vacante"}</span>
              <span className="name">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="plaza" className="public-section">
        <h2>Solicitar plaza en la beta</h2>
        <p className="lead">La beta privada arranca en Sevilla con entre 12 y 15 empresas fundadoras. No es un registro: es una candidatura. Te contamos cómo funciona, comprobamos la plaza y, si encaja, tu Agente empieza a trabajar.</p>
        {ok ? (
          <div className="notice amber" style={{ marginTop: 16 }}>Recibido. Te escribiremos en pocos días para contarte el siguiente paso. Gracias por querer estar en la primera Sala.</div>
        ) : (
          <form action={betaRequestAction} className="form-grid" style={{ marginTop: 16, maxWidth: 820 }}>
            {error === "privacidad" ? <div className="notice error" style={{ gridColumn: "1 / -1" }}>Para presentar la candidatura necesitamos tu conformidad con el aviso de privacidad.</div> : error ? <div className="notice error" style={{ gridColumn: "1 / -1" }}>Revisa el nombre, la empresa y el correo.</div> : null}
            <div className="field"><label htmlFor="fn">Tu nombre</label><input id="fn" name="fullName" required autoComplete="name" /></div>
            <div className="field"><label htmlFor="cn">Empresa</label><input id="cn" name="companyName" required autoComplete="organization" /></div>
            <div className="field"><label htmlFor="em">Correo</label><input id="em" name="email" type="email" required autoComplete="email" /></div>
            <div className="field"><label htmlFor="ci">Ciudad</label><input id="ci" name="city" defaultValue="Sevilla" /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="sp">Especialidad</label>
              <select id="sp" name="specialtyCode" defaultValue="">
                <option value="">Mi sector no está en la lista</option>
                {seats.map((s) => <option key={s.code} value={s.code}>{s.name}{s.taken ? " · plaza ocupada (Antesala)" : " · vacante"}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="msg">Cuéntanos en una frase a quién sirve tu empresa (opcional)</label><input id="msg" name="message" maxLength={280} /></div>
            <label className="norma" style={{ gridColumn: "1 / -1" }}>
              <input type="checkbox" name="privacy" required />
              <span>{CONSENTIMIENTO_CANDIDATURA} Solo los usamos para estudiarla y escribirte; no los cedemos a nadie. <Link href="/privacidad" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Leer el aviso de privacidad</Link>.</span>
            </label>
            <input type="hidden" name="privacyVersion" value={PRIVACIDAD_VERSION} />
            <div className="actions" style={{ gridColumn: "1 / -1" }}><button className="btn primary" type="submit">Presentar candidatura</button></div>
            <p className="mono" style={{ gridColumn: "1 / -1" }}>Normas NS que aceptarás de forma expresa al ocupar tu plaza: nunca se cobra por un referido; al menos una Cesión válida a la semana, sin excusas (cuatro semanas sin ceder suponen la baja); la calidad importa más que la cantidad; dar a conocer tu trabajo a la Sala cada semana; lo que se da y lo que se recibe se ve. La cuota empieza baja y solo sube cuando NS te ha generado negocio.</p>
          </form>
        )}
      </section>

      <footer className="public-footer">
        <span className="mono">NS Network Spain · Be Trendy, S.L. · Sevilla · {new Date().getFullYear()}</span>
        <span className="spacer" />
        <Link href="/privacidad" className="mono">Privacidad</Link>
        <Link href="/acceso" className="mono">Acceso a la demostración</Link>
      </footer>
    </div>
  );
}
