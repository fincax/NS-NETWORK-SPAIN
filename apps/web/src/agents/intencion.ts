/**
 * Intérprete determinista de la intención del Timonel (D-075). Reglas explícitas sobre el texto, como el resto del
 * proveedor determinista: lo que no está dicho no se propone, y si no se entiende se pregunta (NS-ARP §12).
 *
 *  1. Si habla de un tercero ("mi cliente X…", "conozco a…", "he oído que…") es un referido → APUNTE.
 *  2. Si habla de lo que quiere para su empresa:
 *       - lo estructural (ticket mínimo o máximo, sectores que no quiere, zonas, tamaño, capacidad) → parche del ADN;
 *       - lo coyuntural o imperativo ("este trimestre quiero…", "busca empresas que…") → Encargo, con sus señales.
 *     Pueden convivir: "Este trimestre quiero industriales grandes. Nada por debajo de 30.000 €" es Encargo + ADN.
 *  3. Si no reconoce nada, INSUFICIENTE con la pregunta que lo desatasca.
 */
import type { BusinessTrigger, SizeBand, ValueBand } from "@/core/types";
import { DnaPatch, IntentProposal, patchIsEmpty, type IntentApunte, type IntentEncargo } from "@/core/intencion";
import type { IntentInput } from "./provider";
import { CITIES, INDUSTRY_RULES, TRIGGER_RULES } from "./deterministic";

const THIRD_PARTY = /\b(mi cliente|un cliente( m[ií]o| nuestro)?|nuestro cliente|cliente m[ií]o|conozco (a|una|un)|un conocido|me han? (contado|dicho|comentado)|he o[ií]do que|he sabido que|me ha comentado|un amigo|un proveedor)\b/i;
const FIRST_PERSON_WANT = /\b(quiero|busco|b[uú]scame|me interesa[n]?|prioriza|encuentra|necesito (clientes|empresas|referidos)|nos interesa[n]?|queremos|buscamos)\b/i;
const TEMPORAL = /\b(este (trimestre|mes|a[nñ]o|semestre)|estas semanas|ahora mismo|ahora|hasta (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|final de a[nñ]o|verano)|en (los pr[oó]ximos|las pr[oó]ximas)|q[1-4]\b)/i;
const NEGATIVE = /\b(no quiero|nada|ning[uú]n[ao]?|descarta|sin|nunca|no me (interesan?|pases|traigas|cedas)|fuera)\b/i;
const BELOW = /\b(inferior(es)?|por debajo|menos|menor(es)?|peque[nñ]os?)\b/i;
const ABOVE = /\b(m[aá]ximo|hasta|por encima|m[aá]s de|superior(es)?)\b/i;
const MINIMUM = /\bm[ií]nimo\b/i;
const CAPACITY_FULL = /\b(no tengo capacidad|estoy (lleno|a tope|saturado)|estamos (llenos|a tope|saturados)|no (puedo|podemos) coger m[aá]s|sin capacidad)\b/i;
const CAPACITY_LIMITED = /\b(poca capacidad|capacidad limitada|solo (uno|dos|tres) m[aá]s)\b/i;
const CAPACITY_OPEN = /\b(tengo capacidad|tenemos capacidad|capacidad abierta|puedo coger m[aá]s|podemos coger m[aá]s)\b/i;
const EXPECTS_CONTACT = /espera (la|vuestra|tu|su) llamada|sabe que le llamar|est[aá] avisad|le he hablado de vosotros|me ha pedido que le presente/i;
const LARGE = /\b(grandes?|gran empresa|grandes cuentas|multinacional(es)?|corporaci[oó]n)\b/i;
const SMALL = /\b(pymes?|peque[nñ]as empresas|peque[nñ]os negocios|aut[oó]nomos)\b/i;
const MID = /\b(medianas?( empresas?)?)\b/i;

/** Cifra en euros dentro de un fragmento: "30.000 €", "30k", "30 mil", "1,5 millones", "30000". */
export function parseEuros(fragment: string): number | undefined {
  const m = fragment.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+(?:[.,]\d+)?)\s*(k\b|mil\b|millones?|m\b)?\s*(€|euros?)?/i);
  if (!m) return undefined;
  const unit = (m[2] ?? "").toLowerCase();
  const hasCurrency = Boolean(m[3]) || Boolean(unit);
  const raw = m[1];
  let n = /^\d{1,3}(?:[.\s]\d{3})+$/.test(raw) ? Number(raw.replace(/[.\s]/g, "")) : Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  if (unit === "k" || unit === "mil") n *= 1_000;
  if (unit.startsWith("m")) n *= 1_000_000;
  // Sin unidad ni símbolo, solo aceptamos cifras que parezcan importes (≥ 1.000) para no confundir "40 empleados".
  if (!hasCurrency && n < 1_000) return undefined;
  return Math.round(n);
}

export function valueBandOf(n: number): ValueBand {
  return n < 10_000 ? "<10K" : n < 50_000 ? "10-50K" : n < 100_000 ? "50-100K" : n < 500_000 ? "100-500K" : ">500K";
}

function clauses(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.;!?])\s+|\n+|\s+y\s+(?=(?:no|nada|tampoco|busca|quiero|prioriza)\b)/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 2);
}

/** Las reglas de señales del Indicio están escritas en singular ("abre una nueva sede"); la intención suele venir en plural. */
function singular(fragment: string): string {
  const map: Record<string, string> = { sedes: "sede", plantas: "planta", naves: "nave", oficinas: "oficina", delegaciones: "delegación", fábricas: "fábrica", fabricas: "fabrica" };
  return fragment.replace(/\b(nuevas|nuevos)\b/gi, "nueva").replace(/\b(sedes|plantas|naves|oficinas|delegaciones|f[aá]bricas)\b/gi, (w) => map[w.toLowerCase()] ?? w);
}

function industriesIn(fragment: string): string[] {
  return [...new Set(INDUSTRY_RULES.filter((r) => r.re.test(fragment)).map((r) => r.industry))];
}

function sizesIn(fragment: string): SizeBand[] {
  const out: SizeBand[] = [];
  if (LARGE.test(fragment)) out.push("201-500", "500+");
  if (MID.test(fragment)) out.push("51-200");
  if (SMALL.test(fragment)) out.push("1-10", "11-50");
  return out;
}

function citiesIn(fragment: string): string[] {
  const found = CITIES.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(fragment));
  if (/\bandaluc[ií]a\b/i.test(fragment)) found.push("Andalucía");
  if (/\bportugal\b/i.test(fragment)) found.push("Portugal");
  if (/\bespa[nñ]a\b|nacional\b/i.test(fragment)) found.push("España");
  return [...new Set(found)];
}

function apunteFrom(text: string): IntentApunte | undefined {
  const m = text.match(/(?:mi cliente|un cliente(?: m[ií]o| nuestro)?|nuestro cliente|cliente m[ií]o|conozco (?:a|una empresa|un)|un conocido de|he o[ií]do que|he sabido que|me han? (?:contado|dicho|comentado) que|me ha comentado que)\s+(.+)/i);
  if (!m) return undefined;
  const rest = m[1].trim();
  // "Metalúrgica del Sur va a abrir…", "Metalúrgica del Sur, que necesita…", "Metalúrgica del Sur necesita…"
  const split = rest.match(/^(.+?)(?:,\s*que\s+|,\s*|\s+que\s+|\s+(?=(?:va|van|est[aá]n?|necesita|busca|abre|abrir[aá]|quiere|prepara|contrata|renueva|ampl[ií]a)\b))(.+)$/i);
  const who = (split?.[1] ?? rest.split(" ").slice(0, 4).join(" ")).replace(/[.,;]$/, "").trim();
  const need = (split?.[2] ?? rest).replace(/[.;]$/, "").trim();
  if (who.length < 2 || need.length < 5) return undefined;
  const relation: IntentApunte["relation"] = /cliente/i.test(m[0]) ? "CLIENT" : /o[ií]do|sabido|contado|dicho|comentado/i.test(m[0]) ? "HEARD" : "KNOWN";
  return { who, need, relation, expects_contact: EXPECTS_CONTACT.test(text) };
}

export function interpretIntentRules(input: IntentInput): IntentProposal {
  const text = input.text.trim();
  const lowerText = text.toLowerCase();

  // 1 · Referido para la Sala.
  if (THIRD_PARTY.test(text) && !FIRST_PERSON_WANT.test(text)) {
    const apunte = apunteFrom(text);
    if (apunte) {
      return IntentProposal.parse({
        kind: "APUNTE",
        summary: `He entendido que esto es un referido: ${apunte.who} necesita ${apunte.need.replace(/\.$/, "")}. Si confirmas, lo guardo como Apunte en borrador y te lo dejo en Hoy para publicarlo.`,
        understood: [`Interesado: ${apunte.who}.`, `Necesidad: ${apunte.need}.`, `Relación: ${{ CLIENT: "es tu cliente", KNOWN: "lo conoces", HEARD: "te lo han contado" }[apunte.relation]}.`, apunte.expects_contact ? "Ya sabe que le llamarán." : "No consta que esté avisado."],
        apunte,
        confidence: 0.75,
      });
    }
  }

  // 2 · Lo que quiere para su empresa.
  const patch: DnaPatch = DnaPatch.parse({});
  const understood: string[] = [];
  const encargoTriggers: BusinessTrigger[] = [];
  const encargoIndustries: string[] = [];
  let wantsEncargo = FIRST_PERSON_WANT.test(text) && (TEMPORAL.test(text) || /\b(busca|b[uú]scame|encuentra|prioriza)\b/i.test(text));

  for (const clause of clauses(text)) {
    const neg = NEGATIVE.test(clause);
    const euros = parseEuros(clause);
    if (euros !== undefined) {
      if (neg && BELOW.test(clause)) { patch.ticket_min = euros; understood.push(`Ticket mínimo ${euros.toLocaleString("es-ES")} €: nada por debajo.`); continue; }
      if (MINIMUM.test(clause)) { patch.ticket_min = euros; understood.push(`Ticket mínimo ${euros.toLocaleString("es-ES")} €.`); continue; }
      if (ABOVE.test(clause) && !neg) { patch.ticket_max = euros; understood.push(`Ticket máximo habitual ${euros.toLocaleString("es-ES")} €.`); continue; }
      if (ABOVE.test(clause) && neg) { patch.ticket_min = euros; understood.push(`Solo proyectos de ${euros.toLocaleString("es-ES")} € o más.`); continue; }
    }
    const industries = industriesIn(clause);
    const triggers = TRIGGER_RULES.filter((r) => r.re.test(clause) || r.re.test(singular(clause))).map((r) => r.trigger);
    const sizes = sizesIn(clause);
    const cities = citiesIn(clause);
    if (neg && industries.length) { patch.exclusions_add.push(...industries); patch.industries_remove.push(...industries); understood.push(`No quieres recibir ${industries.join(", ").toLowerCase()}.`); continue; }
    if (neg && sizes.length) { patch.exclusions_add.push(SMALL.test(clause) ? "Pymes y pequeños negocios" : "Grandes cuentas"); understood.push(`Descartas ${SMALL.test(clause) ? "pymes y pequeños negocios" : "grandes cuentas"}.`); continue; }
    if (CAPACITY_FULL.test(clause)) { patch.capacity = "FULL"; understood.push("Capacidad completa: tu Agente lo tendrá en cuenta al cualificar."); continue; }
    if (CAPACITY_LIMITED.test(clause)) { patch.capacity = "LIMITED"; understood.push("Capacidad limitada ahora."); continue; }
    if (CAPACITY_OPEN.test(clause)) { patch.capacity = "OPEN"; understood.push("Capacidad abierta: puedes recibir más."); continue; }
    if (industries.length || triggers.length || sizes.length || cities.length) {
      const coyuntural = TEMPORAL.test(clause) || /\b(busca|b[uú]scame|encuentra|prioriza|quiero|me interesan?)\b/i.test(clause);
      if (coyuntural) wantsEncargo = true;
      if (industries.length) { (coyuntural ? encargoIndustries : patch.industries_add).push(...industries); if (coyuntural) patch.industries_add.push(...industries); understood.push(`Sectores: ${industries.join(", ")}.`); }
      if (triggers.length) { encargoTriggers.push(...triggers); patch.triggers_add.push(...triggers); understood.push(`Señales: ${triggers.map((t) => input.triggerLabels[t] ?? t).join(", ")}.`); }
      if (sizes.length) { patch.company_size_add.push(...sizes); understood.push(`Tamaño: ${sizes.join(" / ")} empleados.`); }
      if (cities.length) { patch.geography_add.push(...cities); understood.push(`Zonas: ${cities.join(", ")}.`); }
    }
  }

  const dedupe = <T,>(xs: T[]) => [...new Set(xs)];
  patch.exclusions_add = dedupe(patch.exclusions_add);
  patch.industries_remove = dedupe(patch.industries_remove);
  patch.industries_add = dedupe(patch.industries_add).filter((i) => !patch.industries_remove.includes(i));
  patch.geography_add = dedupe(patch.geography_add);
  patch.company_size_add = dedupe(patch.company_size_add);
  patch.triggers_add = dedupe(patch.triggers_add);

  let encargo: IntentEncargo | undefined;
  if (wantsEncargo) {
    const trigger = encargoTriggers[0];
    const industry = encargoIndustries[0] ?? patch.industries_add[0];
    const vb = patch.ticket_min !== undefined ? valueBandOf(patch.ticket_min) : undefined;
    const sentence = text.replace(/\s+/g, " ").replace(/[.;]$/, "");
    encargo = { text: sentence.length > 140 ? `${sentence.slice(0, 137)}…` : sentence, trigger, industry, value_band: vb };
  }
  const hasPatch = !patchIsEmpty(patch);

  if (!encargo && !hasPatch) {
    const mentionsAgent = /\bagente\b/i.test(lowerText);
    return IntentProposal.parse({
      kind: "INSUFICIENTE",
      summary: "No he podido traducir esto a algo concreto todavía.",
      understood: [],
      question: mentionsAgent ? "¿Qué quieres que haga: buscar algo para ti (un Encargo), cambiar cómo trabajo (tu ADN) o guardar un referido (un Apunte)?" : "¿Es algo que buscas ahora para tu empresa, un cambio en tu ticket, sectores o zonas, o un referido para la Sala? Dímelo con una cifra, un sector o un nombre y lo preparo.",
      confidence: 0.2,
    });
  }

  const kind = encargo ? "ENCARGO" : "ADN";
  const summaryParts: string[] = [];
  if (encargo) summaryParts.push(`publico un Encargo para que los Agentes de la Sala prioricen lo que te ceden`);
  if (hasPatch) summaryParts.push(`actualizo tu ADN como versión nueva, validada por ti`);
  const summary = `He entendido ${understood.length} ${understood.length === 1 ? "cosa" : "cosas"}. Si confirmas, ${summaryParts.join(" y ")}. Nada cambia hasta tu toque.`;
  return IntentProposal.parse({ kind, summary, understood, encargo, dna_patch: hasPatch ? patch : undefined, confidence: Math.min(0.9, 0.5 + understood.length * 0.1) });
}
