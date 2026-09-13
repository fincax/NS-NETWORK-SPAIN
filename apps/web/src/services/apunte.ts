/**
 * Apunte (D-037): el Timonel anota en 30 segundos un posible referido, en la calle, y entra de inmediato
 * en la memoria de su Agente como Indicio en borrador. El Agente lo lee, detecta necesidades y lo deja
 * en Hoy para que el Timonel decida si lo publica. Nunca se publica solo.
 */
import type { Db } from "@/db/client";
import { createSignal } from "@/services/signals";
import { detectsReferralFee } from "@/core/compliance";

export type ApunteRelation = "CLIENT" | "KNOWN" | "HEARD";

export const RELATION_LABEL: Record<ApunteRelation, string> = { CLIENT: "Es mi cliente", KNOWN: "Lo conozco", HEARD: "Me lo han contado" };

export interface ApunteInput {
  companyId: string;
  memberId: string;
  who: string; // empresa o persona
  need: string; // qué necesita
  contactName?: string;
  contactRole?: string;
  notes?: string;
  relation?: ApunteRelation;
  expectsContact?: boolean; // D-029
}

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** El texto que recibe el Agente: una frase natural, como se lo contarías a un socio. */
export function apunteText(i: ApunteInput): string {
  const who = clean(i.who);
  const rel = i.relation === "CLIENT" ? `Mi cliente ${who}` : i.relation === "HEARD" ? `He oído que ${who}` : `Conozco a ${who}, que`;
  const parts = [`Apunte del Timonel. ${rel} necesita ${clean(i.need).replace(/\.$/, "")}.`];
  if (clean(i.notes)) parts.push(`Observaciones: ${clean(i.notes).replace(/\.$/, "")}.`);
  if (i.expectsContact) parts.push("Sabe que le llamarán.");
  return parts.join(" ");
}

export class ApunteError extends Error {}

export async function createApunte(db: Db, input: ApunteInput) {
  if (clean(input.who).length < 2) throw new ApunteError("Di quién es: una empresa o una persona.");
  if (clean(input.need).length < 5) throw new ApunteError("Di qué necesita, aunque sea en cuatro palabras.");
  const text = apunteText(input);
  if (detectsReferralFee(text)) throw new ApunteError("El Apunte menciona una contraprestación. Un referido nunca se cobra (regla inmutable D-010).");
  const contactName = clean(input.contactName) || undefined;
  return createSignal(db, {
    companyId: input.companyId,
    memberId: input.memberId,
    rawContent: text,
    source: "APUNTE",
    visibility: "CHAPTER",
    contactName,
    contactRole: clean(input.contactRole) || undefined,
    legalBasisForContact: contactName ? "NONE" : undefined,
    thirdPartyExpectsContact: !!input.expectsContact,
  });
}
