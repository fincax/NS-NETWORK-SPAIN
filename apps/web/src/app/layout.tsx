import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Monogram } from "@/components/brand";
import { currentMember, listMembers } from "@/lib/session";
import { PersonaSwitch } from "./persona-switch";
import { NavLinks } from "./nav-links";

export const metadata: Metadata = {
  title: "NS Network · NS Cumbre",
  description: "Tu empresa no hace networking. Su agente sí. 24/7.",
  icons: { icon: "/icon.svg" },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let ctx: Awaited<ReturnType<typeof currentMember>> = null;
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  try {
    ctx = await currentMember();
    members = await listMembers();
  } catch {
    ctx = null;
  }
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: el layout raíz carga las fuentes para toda la app */}
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/hoy" className="brand" aria-label="NS Network, inicio">
              <Monogram size={30} state={ctx ? "green" : undefined} />
              <span>
                <span className="wordmark">NS Network</span>
                <br />
                <span className="lockup">{ctx ? `${ctx.chapter.name} · Sala · NS Sevilla` : "Sala sin inicializar"}</span>
              </span>
            </Link>
            <NavLinks />
            <div className="persona">
              {ctx ? <PersonaSwitch members={members} currentId={ctx.member.id} /> : <span>Ejecuta <code>pnpm db:seed</code></span>}
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
