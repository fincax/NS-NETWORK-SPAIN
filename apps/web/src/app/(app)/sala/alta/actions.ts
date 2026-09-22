"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb, schema } from "@/db/client";
import { eq } from "drizzle-orm";
import { requireMember } from "@/lib/session";
import { onboardCompany, RulesNotAcceptedError, SeatTakenError } from "@/services/onboarding";
import { activateCandidacy } from "@/services/antesala";
import { cookies } from "next/headers";
import { MEMBER_COOKIE } from "@/lib/session";
import { authMode } from "@/lib/auth";
import { inviteByMail } from "@/services/correo";

const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function onboardAction(formData: FormData) {
  const { chapter: own } = await requireMember();
  const db = await getDb();
  const name = String(formData.get("name"));
  const chapterSlug = String(formData.get("chapterSlug") ?? "");
  const target = chapterSlug ? await db.query.chapters.findFirst({ where: eq(schema.chapters.slug, chapterSlug) }) : undefined;
  const chapter = target && target.zoneId === own.zoneId ? target : own;
  let company;
  let member;
  const description = String(formData.get("description") ?? "").trim();
  try {
    ({ company, member } = await onboardCompany(db, {
      chapterId: chapter.id,
      name,
      slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`,
      website: String(formData.get("website") ?? "") || undefined,
      specialtyCode: String(formData.get("specialtyCode")),
      person: { fullName: String(formData.get("personName")), role: String(formData.get("personRole")), email: String(formData.get("personEmail")) },
      validate: false, // el ADN lo valida el Timonel al terminar la entrevista (D-040)
      acceptance: { rulesVersion: String(formData.get("normasVersion") ?? ""), rules: formData.getAll("normas").map(String) }, // D-043
      dna: {
        company: { description, locations: ["Sevilla"], website: String(formData.get("website") ?? "") || undefined, certifications: [], credibility: [] },
        offering: { services: [], products: [], differentiators: [], exclusions: [], capacity: "OPEN" },
        ideal_customer: { industries: [], company_size: [], geography: ["Sevilla"], roles: [], triggers: [], problems: [], exclusions: [] },
        commercial: { strategic_priority: 2, urgency: "90D" },
        referrals: { perfect_referral: "", acceptable_referral: "", poor_referral: "", disqualifiers: [], introduction_preferences: "" },
        knowledge: { public: [], chapter_only: [], match_only: [], management_only: [], never_share: [] },
        permissions: { auto_publish_chapter_signals: false, external_contact: false, human_approval_required: true },
        objectives: { monthly: "", quarterly: "", strategic: "" },
      },
    }));
  } catch (e) {
    const msg = e instanceof SeatTakenError ? `${e.message}. Puedes esperar en la Antesala o solicitar plaza en otra Sala de NS Sevilla.` : e instanceof RulesNotAcceptedError ? e.message : e instanceof Error ? e.message : "Error desconocido";
    redirect(`/sala/alta?error=${encodeURIComponent(msg)}`);
  }
  const candidacyId = String(formData.get("candidacyId") ?? "");
  if (candidacyId) await activateCandidacy(db, candidacyId, company.id);
  revalidatePath("/", "layout");
  if (authMode() === "real") {
    // Cuentas personales (D-054): el nuevo Timonel recibe su enlace de acceso por correo (D-060); él hará la entrevista al entrar.
    // Sin correo configurado, o si el envío falla, la Directiva ve el enlace para hacérselo llegar.
    const r = await inviteByMail(db, { memberId: member.id, createdBy: (await requireMember()).member.id });
    if (r.sent) redirect(`/empresa/${company.slug}?enviado=${encodeURIComponent(r.email)}`);
    redirect(`/empresa/${company.slug}?invite=${encodeURIComponent(r.token)}${r.error ? "&correo=fallo" : ""}`);
  }
  // En la demo, la sesión pasa al nuevo Timonel para que haga la entrevista.
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, member.id, { path: "/", sameSite: "lax" });
  redirect("/entrevista");
}
