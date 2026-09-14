import Link from "next/link";
import { redirect } from "next/navigation";
import { currentMember, requireDemo } from "@/lib/session";
import { logoutAction } from "../../acceso/actions";

/** Pantalla del Timonel cuya empresa ha recibido la notificación de baja (D-042, D-044): sin acceso a la Sala ni al panel. */
export default async function BajaPage() {
  await requireDemo();
  const ctx = await currentMember();
  if (!ctx) redirect("/hoy");
  if (ctx.company.status === "ACTIVE") redirect("/hoy");
  const released = ctx.company.status === "RELEASED";
  return (
    <div className="stack" style={{ gap: 18, maxWidth: 720 }}>
      <p className="eyebrow">{ctx.chapter.name} · {ctx.company.name}</p>
      <h1>{released ? "Baja de la titularidad." : "Baja notificada."}</h1>
      <p className="lead">
        {released
          ? `NS ha confirmado la baja de ${ctx.company.name} como titular en ${ctx.chapter.name} por incumplir el Compromiso. La plaza ha vuelto a la Antesala.`
          : `${ctx.company.name} lleva cuatro semanas seguidas sin una sola Cesión válida en ${ctx.chapter.name}. La Directiva propondrá la baja y NS la confirmará. Desde la notificación, la empresa está fuera de la Mesa de esta Sala y este panel queda cerrado.`}
      </p>
      <p>Esta baja afecta solo a esta Sala. Si la empresa es titular en otras Salas donde cumple, allí no cambia nada. Para cualquier aclaración, habla con la Directiva de la Sala.</p>
      <div className="actions"><form action={logoutAction}><button type="submit" className="btn">Salir</button></form><Link href="/acceso" className="btn small">Cambiar de Timonel</Link></div>
    </div>
  );
}
