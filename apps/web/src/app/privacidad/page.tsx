import type { Metadata } from "next";
import Link from "next/link";
import { Monogram } from "@/components/brand";
import { PRIVACIDAD_SECCIONES, PRIVACIDAD_VERSION, RESPONSABLE } from "@/core/privacidad";

export const metadata: Metadata = {
  title: "Privacidad · NS Network Spain",
  description: "Qué datos recoge networkspain.com, para qué, con qué base y cómo ejercer tus derechos.",
};

/** Aviso de privacidad público (D-055). El texto vive en core/privacidad.ts para que la versión aceptada sea la publicada. */
export default function PrivacidadPage() {
  return (
    <div className="public-shell">
      <header className="public-top">
        <Link href="/" className="brand" aria-label="NS Network Spain">
          <Monogram size={32} />
          <span><span className="wordmark">NS Network</span><br /><span className="lockup">Spain · Beta privada</span></span>
        </Link>
        <nav className="row" aria-label="Portada">
          <Link href="/#plaza" className="public-link">Solicitar plaza</Link>
          <Link href="/acceso" className="btn small ghost">Acceso demo</Link>
        </nav>
      </header>

      <main className="public-section legal">
        <p className="eyebrow">Aviso de privacidad · versión {PRIVACIDAD_VERSION}</p>
        <h1>Tus datos, en claro.</h1>
        <p className="lead">Esto es lo que hacemos con lo que nos dejas en networkspain.com. Sin letra pequeña: si algo no está aquí, no lo hacemos.</p>
        {PRIVACIDAD_SECCIONES.map((s) => (
          <section key={s.title}>
            <h2>{s.title}</h2>
            {s.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </section>
        ))}
        <p className="mono" style={{ marginTop: 32 }}>{RESPONSABLE.razonSocial} · NIF {RESPONSABLE.nif} · {RESPONSABLE.domicilio} · {RESPONSABLE.contacto} · {RESPONSABLE.telefono}</p>
      </main>

      <footer className="public-footer">
        <span className="mono">NS Network Spain · Beta privada · Sevilla · {new Date().getFullYear()}</span>
        <span className="spacer" />
        <Link href="/" className="mono">Portada</Link>
        <Link href="/acceso" className="mono">Acceso a la demostración</Link>
      </footer>
    </div>
  );
}
