"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { onboardCompany, SeatTakenError } from "@/services/onboarding";
import { activateCandidacy } from "@/services/antesala";

const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
const slugify = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function onboardAction(formData: FormData) {
  const { chapter } = await requireMember();
  const db = await getDb();
  const name = String(formData.get("name"));
  const ticketMin = formData.get("ticket_min") ? Number(formData.get("ticket_min")) : undefined;
  const ticketMax = formData.get("ticket_max") ? Number(formData.get("ticket_max")) : undefined;
  let company;
  try {
    ({ company } = await onboardCompany(db, {
      chapterId: chapter.id,
      name,
      slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`,
      website: String(formData.get("website") ?? "") || undefined,
      specialtyCode: String(formData.get("specialtyCode")),
      person: { fullName: String(formData.get("personName")), role: String(formData.get("personRole")), email: String(formData.get("personEmail")) },
      dna: {
        company: { description: String(formData.get("description")), locations: ["Sevilla"], website: String(formData.get("website") ?? "") || undefined, certifications: [], credibility: [] },
        offering: { services: lines(formData.get("services")), products: [], differentiators: [], exclusions: [], capacity: "OPEN" },
        ideal_customer: { industries: lines(formData.get("industries")), company_size: [], geography: lines(formData.get("geography")), roles: [], triggers: formData.getAll("triggers").map(String), problems: [], exclusions: [] },
        commercial: { ticket_min: ticketMin, ticket_max: ticketMax, strategic_priority: 2, urgency: "90D" },
        referrals: { perfect_referral: String(formData.get("perfect_referral")), acceptable_referral: "", poor_referral: "", disqualifiers: lines(formData.get("disqualifiers")), introduction_preferences: "" },
        knowledge: { public: [], chapter_only: [], match_only: [], management_only: [], never_share: [] },
        permissions: { auto_publish_chapter_signals: false, external_contact: false, human_approval_required: true },
        objectives: { monthly: "", quarterly: "", strategic: "" },
      },
    }));
  } catch (e) {
    const msg = e instanceof SeatTakenError ? `${e.message}. Puedes esperar en la Antesala o solicitar plaza en otra Sala de NS Sevilla.` : e instanceof Error ? e.message : "Error desconocido";
    redirect(`/sala/alta?error=${encodeURIComponent(msg)}`);
  }
  const candidacyId = String(formData.get("candidacyId") ?? "");
  if (candidacyId) await activateCandidacy(db, candidacyId, company.id);
  revalidatePath("/", "layout");
  redirect(`/empresa/${company.slug}`);
}
