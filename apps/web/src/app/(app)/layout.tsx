import Link from "next/link";
import { Monogram } from "@/components/brand";
import { currentMember, listMembers } from "@/lib/session";
import { PersonaSwitch } from "./persona-switch";
import { NavLinks } from "./nav-links";
import { ApunteFab } from "./apunte-fab";
import { AppBadge } from "./app-badge";
import { pendingDecisions } from "@/services/today";
import { logoutAction } from "../acceso/actions";
import { authMode } from "@/lib/auth";
import { getDb } from "@/db/client";
import { candidacyCounts } from "@/services/antesala";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let ctx: Awaited<ReturnType<typeof currentMember>> = null;
  let members: Awaited<ReturnType<typeof listMembers>> = [];
  let newCandidacies = 0;
  let pendingTotal = 0;
  try {
    ctx = await currentMember();
    members = await listMembers();
    if (ctx?.member.isDirector) newCandidacies = (await candidacyCounts(await getDb())).nuevas;
    if (ctx) pendingTotal = (await pendingDecisions(await getDb(), ctx.chapter.id, ctx.company.id, ctx.member)).total;
  } catch {
    ctx = null;
  }
  return (
    <div className="shell">
      <div className="beta-bar" role="status">
        <span className="dot amber" /> {authMode() === "real" ? "Beta privada · NS Sevilla" : "Beta privada · NS Sevilla · datos ficticios de demostración"}
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
        <NavLinks director={!!ctx?.member.isDirector} newCandidacies={newCandidacies} />
        <div className="persona">
          {ctx && authMode() === "real" ? <Link href="/cuenta" style={{ color: "var(--porcelain)" }}>{ctx.member.fullName}<span className="mono" style={{ marginLeft: 8 }}>{ctx.member.isDirector ? "Directiva" : "Timonel"}</span></Link> : ctx ? <PersonaSwitch members={members} currentId={ctx.member.id} /> : <span>Prepara la Sala desde Hoy</span>}
        </div>
      </header>
      <main>{children}</main>
      {ctx ? <ApunteFab /> : null}
      {ctx ? <AppBadge initial={pendingTotal} /> : null}
    </div>
  );
}
