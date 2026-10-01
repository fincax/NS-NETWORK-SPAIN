"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { authorizeIntro, decide, infoRound, markContacted } from "@/services/referrals";
import { approveCommunique, ComunicadoError } from "@/services/comunicado";
import { publishSignal } from "@/services/signals";
import { mesaMode, runJobs } from "@/services/jobs";
import { schema } from "@/db/client";
import { eq } from "drizzle-orm";
import type { ToqueAction } from "@/services/hoy";

function refresh() {
  revalidatePath("/", "layout");
}

/**
 * Un toque desde Hoy (D-070). La fila ya muestra lo que la persona necesita para la decisión evidente; el detalle
 * está a un enlace. Cada acción pasa por el mismo servicio que la tarjeta: ninguna puerta humana se salta.
 */
export async function toqueAction(formData: FormData) {
  const { member, company, chapter } = await requireMember();
  const db = await getDb();
  const action = String(formData.get("action")) as ToqueAction;
  const referralId = String(formData.get("referralId") ?? "");
  try {
    switch (action) {
      case "ACCEPT":
        await decide(db, { referralId, memberId: member.id, decision: "APPROVE" });
        break;
      case "PROPOSE":
        // Apertura en el visto bueno (D-067) con el alcance por defecto: solo la empresa.
        await decide(db, { referralId, memberId: member.id, decision: "APPROVE", revealScope: "COMPANY_ONLY" });
        break;
      case "ANSWER_DRAFT": {
        const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, referralId) });
        const round = ref ? await infoRound(db, ref) : null;
        const draft = round?.pending?.draft_answer;
        if (!draft) redirect(`/cesiones/${referralId}`);
        await decide(db, { referralId, memberId: member.id, decision: "ANSWER", notes: draft });
        break;
      }
      case "OPEN":
        await authorizeIntro(db, referralId, member.id, "COMPANY_ONLY");
        break;
      case "PUBLISH_SIGNAL": {
        const res = await publishSignal(db, String(formData.get("id")), member.id, { mode: mesaMode() });
        if ("queued" in res) after(() => runJobs(db, { chapterId: chapter.id, max: 3 }));
        break;
      }
      case "CONTACTED":
        await markContacted(db, referralId, member.id);
        break;
      case "APPROVE_COMMUNIQUE":
        await approveCommunique(db, { chapterId: chapter.id, companyId: company.id, memberId: member.id });
        break;
      default:
        throw new Error("Acción desconocida");
    }
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect()
    const msg = e instanceof ComunicadoError || e instanceof Error ? e.message : "No se pudo completar el toque.";
    refresh();
    redirect(`/hoy?error=${encodeURIComponent(msg)}`);
  }
  refresh();
  redirect("/hoy?ok=1");
}
