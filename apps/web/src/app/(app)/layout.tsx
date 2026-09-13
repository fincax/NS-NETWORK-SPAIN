import Link from "next/link";
import { Monogram } from "@/components/brand";
import { currentMember, listMembers } from "@/lib/session";
import { PersonaSwitch } from "./persona-switch";
import { NavLinks } from "./nav-links";
import { logoutAction } from "../acceso/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let ctx: Awaited<ReturnType<typeof currentMember>> = null;
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  try {
    ctx = await currentMember();
    members = await listMembers();
  } catch {
    ctx = null;
  }
  return (
    <div className="shell">
      <div className="beta-bar" role="status">
        <span className="dot amber" /> Beta privada · NS Sevilla · datos ficticios de demostración
        <span className="spacer" />
        <form action={logoutAction}><button type="submit" className="linkish">Salir</button></form>
      </div>
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
          {ctx ? <PersonaSwitch members={members} currentId={ctx.member.id} /> : <span>Prepara la Sala desde Hoy</span>}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
