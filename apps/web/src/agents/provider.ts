/**
 * Abstracción del razonamiento LLM. Los agentes de NS llaman a estas funciones con entradas tipadas
 * y reciben salidas validadas con zod. Ninguna salida de modelo cambia estado sin pasar por el sistema.
 */
import { z } from "zod";
import { BusinessTrigger, ChapterLayer, IdentityLayer, IntroPackage, NeedDraft, QualificationLayer, type BusinessDNA, type QualificationQuestionKind } from "@/core/types";

export const ExtractionOutput = z.object({
  chapter_layer: ChapterLayer,
  qualification_layer: QualificationLayer,
  identity_layer: IdentityLayer.optional(),
  needs: z.array(NeedDraft),
  triggers: z.array(BusinessTrigger),
});
export type ExtractionOutput = z.infer<typeof ExtractionOutput>;

export const QualificationAnswer = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  insufficient: z.boolean(),
});
export type QualificationAnswer = z.infer<typeof QualificationAnswer>;

export interface ExtractionInput {
  rawContent: string;
  originatorDna: BusinessDNA;
  availableSpecialties: { code: string; name: string; description: string }[];
  defaultCity: string;
}

export interface QualificationInput {
  kind: QualificationQuestionKind;
  question: string;
  rawContent: string;
  privateNotes: string;
}

export interface IntroInput {
  originatorCompany: string;
  originatorPerson: string;
  receiverCompany: string;
  receiverPerson: string;
  receiverServices: string[];
  thirdPartyCompany: string;
  contactName?: string;
  needSummary: string;
  detailedContext: string;
  introductionPreferences: string;
}

export interface LLMProvider {
  readonly name: string;
  extractSignal(input: ExtractionInput): Promise<ExtractionOutput>;
  answerQualification(input: QualificationInput): Promise<QualificationAnswer>;
  draftIntro(input: IntroInput): Promise<IntroPackage>;
}

let cached: LLMProvider | undefined;

/** Anthropic si hay credenciales y no se fuerza el determinista; si no, el proveedor determinista (demo y tests). */
export async function getProvider(): Promise<LLMProvider> {
  if (cached) return cached;
  const forced = process.env.NS_LLM_PROVIDER;
  if (forced !== "deterministic" && (process.env.ANTHROPIC_API_KEY || forced === "anthropic")) {
    const { AnthropicProvider } = await import("./anthropic");
    cached = new AnthropicProvider();
  } else {
    const { DeterministicProvider } = await import("./deterministic");
    cached = new DeterministicProvider();
  }
  return cached;
}

export function setProvider(p: LLMProvider | undefined) {
  cached = p;
}
