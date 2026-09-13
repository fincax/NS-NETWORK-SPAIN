/**
 * Proveedor Anthropic: mismo contrato que el determinista, con salidas estructuradas validadas.
 * Se activa con ANTHROPIC_API_KEY (o NS_LLM_PROVIDER=anthropic). Modelo por defecto: claude-opus-5.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { IntroPackage } from "@/core/types";
import { ExtractionOutput, QualificationAnswer, type ExtractionInput, type IntroInput, type LLMProvider, type QualificationInput } from "./provider";

const MODEL = process.env.NS_LLM_MODEL ?? "claude-opus-5";

const SYSTEM = `Eres el Agente NS de una empresa miembro de una Sala NS Network. Trabajas con el protocolo NS-ARP.
Reglas: nunca inventes datos; si no hay evidencia en el texto, marca la incógnita o responde con insufficient=true y confianza baja.
En la capa 0 (chapter_layer) nunca aparece el nombre del tercero ni de personas físicas. Escribe en castellano, registro empresarial sobrio.`;

export class AnthropicProvider implements LLMProvider {
  readonly name = `anthropic:${MODEL}`;
  private client = new Anthropic();

  async extractSignal(input: ExtractionInput): Promise<ExtractionOutput> {
    const res = await this.client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Estructura este Indicio (NS-ARP S1/S2) para la Sala. Ciudad por defecto: ${input.defaultCity}.
Especialidades disponibles en la Sala (usa solo estos códigos en specialty_hints): ${input.availableSpecialties.map((s) => `${s.code} (${s.name}: ${s.description})`).join("; ")}.
ADN de la empresa originadora (contexto de relación y sector): ${JSON.stringify({ description: input.originatorDna.company.description, industries: input.originatorDna.ideal_customer.industries })}.
Texto del Indicio: """${input.rawContent}"""
Produce: chapter_layer (sin identidad), qualification_layer (contexto detallado sin nombres de personas), identity_layer solo si el texto nombra al tercero, needs (una por especialidad plausible, con plausibility 0..1, evidence y unknowns) y triggers.`,
        },
      ],
      output_config: { format: zodOutputFormat(ExtractionOutput) },
    });
    if (!res.parsed_output) throw new Error("La salida del modelo no valida contra el esquema de extracción.");
    return res.parsed_output;
  }

  async answerQualification(input: QualificationInput): Promise<QualificationAnswer> {
    const res = await this.client.messages.parse({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Pregunta de cualificación (${input.kind}): ${input.question}
Responde solo con lo que se deduce del Indicio y de las notas privadas del cedente. Si no hay información, insufficient=true.
Indicio: """${input.rawContent}"""
Notas privadas (nunca se comparten literalmente; extrae solo el hecho): """${input.privateNotes}"""`,
        },
      ],
      output_config: { format: zodOutputFormat(QualificationAnswer) },
    });
    if (!res.parsed_output) throw new Error("La salida del modelo no valida contra el esquema de cualificación.");
    return res.parsed_output;
  }

  async draftIntro(input: IntroInput): Promise<IntroPackage> {
    const res = await this.client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Redacta el Puente (introducción cálida) que ${input.originatorPerson} (${input.originatorCompany}) enviará desde su propio correo a ${input.contactName ?? "su contacto"} en ${input.thirdPartyCompany}, presentando a ${input.receiverPerson} de ${input.receiverCompany} (${input.receiverServices.join(", ")}).
Necesidad: ${input.needSummary}. Contexto: ${input.detailedContext}. Preferencia de introducción del cesionario: ${input.introductionPreferences}.
Tono: cercano, breve, de empresario a empresario. Sin jerga. Sin mencionar NS ni agentes. Nunca menciones dinero, comisiones ni contraprestaciones.`,
        },
      ],
      output_config: { format: zodOutputFormat(IntroPackage) },
    });
    if (!res.parsed_output) throw new Error("La salida del modelo no valida contra el esquema del Puente.");
    return res.parsed_output;
  }
}
