"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { requireMember } from "@/lib/session";
import { abandonInterview, answerInterview, finishInterview, InterviewError, startInterview } from "@/services/entrevista";

const fail = (e: unknown) => redirect(`/entrevista?error=${encodeURIComponent(e instanceof InterviewError ? e.message : e instanceof Error ? `El Agente no ha podido responder: ${e.message}` : "El Agente no ha podido responder.")}`);

export async function startInterviewAction(formData: FormData) {
  const { member, company } = await requireMember();
  const db = await getDb();
  try {
    await startInterview(db, { companyId: company.id, memberId: member.id, restart: formData.get("restart") === "1" });
  } catch (e) {
    fail(e);
  }
  revalidatePath("/entrevista");
  redirect("/entrevista");
}

export async function answerInterviewAction(formData: FormData) {
  const { member } = await requireMember();
  const db = await getDb();
  const skip = formData.get("skip") === "1";
  try {
    await answerInterview(db, { interviewId: String(formData.get("id")), memberId: member.id, text: skip ? "paso" : String(formData.get("text") ?? "") });
  } catch (e) {
    fail(e);
  }
  revalidatePath("/entrevista");
  redirect("/entrevista#turno");
}

export async function finishInterviewAction(formData: FormData) {
  const { member, company } = await requireMember();
  const db = await getDb();
  try {
    await finishInterview(db, { interviewId: String(formData.get("id")), memberId: member.id });
  } catch (e) {
    fail(e);
  }
  revalidatePath("/", "layout");
  redirect(`/empresa/${company.slug}?adn=validado`);
}

export async function abandonInterviewAction(formData: FormData) {
  const { member, company } = await requireMember();
  const db = await getDb();
  await abandonInterview(db, { interviewId: String(formData.get("id")), memberId: member.id });
  revalidatePath("/entrevista");
  redirect(`/empresa/${company.slug}`);
}
