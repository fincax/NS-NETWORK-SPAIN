/**
 * Candidatura a la beta desde la portada (D-033) con consentimiento expreso de privacidad (D-055).
 * Sin consentimiento no se guarda nada. La aceptación queda con la versión del aviso y la fecha.
 */
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { NSCAT } from "@/db/nscat";
import { PRIVACIDAD_VERSION } from "@/core/privacidad";

export type CandidaturaError = "DATOS" | "PRIVACIDAD";

export interface CandidaturaInput {
  fullName: string;
  companyName: string;
  email: string;
  specialtyCode?: string;
  city?: string;
  message?: string;
  /** Casilla marcada en el formulario. */
  privacyAccepted: boolean;
  /** Versión del aviso que vio la persona (campo oculto). Si no coincide con la vigente, se guarda la vigente: es la que estaba publicada. */
  privacyVersion?: string;
}

export type CandidaturaResult = { ok: true; id: string } | { ok: false; error: CandidaturaError };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseCandidatura(formData: FormData): CandidaturaInput {
  const str = (k: string) => String(formData.get(k) ?? "").trim();
  return {
    fullName: str("fullName"),
    companyName: str("companyName"),
    email: str("email"),
    specialtyCode: str("specialtyCode"),
    city: str("city"),
    message: str("message"),
    privacyAccepted: formData.get("privacy") === "on",
    privacyVersion: str("privacyVersion"),
  };
}

export async function submitCandidatura(db: Db, input: CandidaturaInput): Promise<CandidaturaResult> {
  const fullName = input.fullName.trim();
  const companyName = input.companyName.trim();
  const email = input.email.trim();
  if (!fullName || !companyName || !EMAIL.test(email)) return { ok: false, error: "DATOS" };
  if (!input.privacyAccepted) return { ok: false, error: "PRIVACIDAD" };
  const specialtyCode = NSCAT.some((s) => s.code === input.specialtyCode) ? input.specialtyCode! : null;
  const city = (input.city ?? "").trim() || "Sevilla";
  const message = (input.message ?? "").trim() || null;
  const [row] = await db
    .insert(schema.betaRequests)
    .values({ fullName, companyName, email, specialtyCode, city, message, privacyVersion: PRIVACIDAD_VERSION, privacyAcceptedAt: new Date() })
    .returning();
  return { ok: true, id: row.id };
}
