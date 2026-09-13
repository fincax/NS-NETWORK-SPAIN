/**
 * Guion determinista de la entrevista del Agente (D-040). Sirve para la demo y los tests, y como red de
 * seguridad sin clave del modelo. Una pregunta por tema, en orden; entiende respuestas en lenguaje natural
 * con reglas sencillas (listas, cifras en euros, ciudades, señales) y nunca inventa lo que no se dijo.
 */
import type { BusinessDNA, SizeBand } from "@/core/types";
import { INTERVIEW_ORDER, type InterviewInput, type InterviewStep, type InterviewTopic } from "./provider";
import { CITIES, TRIGGER_RULES } from "./deterministic";

const QUESTION: Record<Exclude<InterviewTopic, "DONE">, (i: InterviewInput) => string> = {
  COMPANY: (i) => `Encantado de trabajar para ${i.companyName}, ${i.timonelName.split(" ")[0]}. Empecemos por lo esencial: ¿a qué se dedica la empresa, dónde trabaja y desde cuándo?`,
  SERVICES: () => "¿Qué servicios o productos ofrecéis exactamente? Y, tan importante como eso, ¿qué no hacéis aunque os lo pidan?",
  IDEAL_CUSTOMER: () => "Descríbeme a vuestro cliente ideal: sectores, tamaño de empresa, zonas donde trabajáis y quién suele decidir la compra.",
  TRIGGERS: () => "¿Qué está pasando en una empresa cuando os necesita? Por ejemplo, abre una sede, contrata mucha gente, sale al extranjero, cambia de dirección…",
  COMMERCIAL: () => "Hablemos de cifras para que solo te lleve lo que merece la pena: ¿cuál es el ticket mínimo que os compensa y el máximo habitual, en euros? ¿Y cuánto suele durar la venta?",
  PERFECT_REFERRAL: () => "Explícame una situación real que para ti sería el referido perfecto. Con todo detalle: qué empresa, qué le pasa, quién decide, en qué momento.",
  DISQUALIFIERS: () => "¿Qué no quieres recibir nunca? Sectores, tamaños o situaciones que te hagan perder el tiempo.",
  INTRO_PREFERENCES: () => "Cuando un socio te presente a alguien, ¿cómo prefieres que lo haga? ¿Correo, llamada, visita? ¿Qué tiene que decir de vosotros?",
  KNOWLEDGE: () => "Última pregunta delicada: ¿qué información de la empresa no debo compartir nunca con la Sala, ni siquiera para razonar en voz alta?",
  OBJECTIVES: () => "Para terminar: ¿qué quieres conseguir este trimestre? Un objetivo concreto me ayuda a priorizar lo que busco para ti.",
};

const SKIP = /^\s*(no s[eé]|paso|siguiente|luego|m[aá]s tarde|nada|n\/a|-|\.)\s*\.?$/i;
const NEG_SPLIT = /\b(no hacemos|no ofrecemos|nunca|excepto|salvo|no trabajamos)\b/i;

export const list = (s: string): string[] =>
  s
    .replace(/\s+(y|e|ni)\s+/gi, ", ")
    .split(/[,;\n·•]+/)
    .map((x) => x.trim().replace(/^(y|e|ni|o)\s+/i, "").replace(/[.\s]+$/, "").trim())
    .filter((x) => x.length > 1)
    .slice(0, 12);

/** "40.000 €", "40k", "40 mil", "1,2 millones" → euros. */
export function euros(s: string): number[] {
  const out: number[] = [];
  const re = /(\d+(?:[.,]\d+)?)\s*(millones?|mill?|m\b|k\b|mil\b)?\s*(?:€|euros?)?/gi;
  for (const m of s.matchAll(re)) {
    const raw = m[1];
    const unit = (m[2] ?? "").toLowerCase();
    let n = Number(raw.includes(",") && !raw.includes(".") ? raw.replace(",", ".") : raw.replace(/\.(?=\d{3}\b)/g, ""));
    if (Number.isNaN(n)) continue;
    if (unit.startsWith("mill") || unit === "m") n *= 1_000_000;
    else if (unit === "k" || unit === "mil") n *= 1_000;
    if (n >= 500) out.push(Math.round(n));
  }
  return out;
}

export function sizeBands(s: string): SizeBand[] {
  const t = s.toLowerCase();
  const bands = new Set<SizeBand>();
  const nums = [...t.matchAll(/(\d+)\s*(?:a|-|y)?\s*(\d+)?\s*(empleados|personas|trabajadores)/g)];
  for (const m of nums) {
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (const [band, lo, hi] of [["1-10", 1, 10], ["11-50", 11, 50], ["51-200", 51, 200], ["201-500", 201, 500], ["500+", 501, 1e9]] as const) {
      if (/m[aá]s de/.test(t) && !m[2] ? hi > a : lo <= b && hi >= a) bands.add(band);
    }
  }
  if (/pyme|peque[ñn]a/.test(t)) bands.add("11-50");
  if (/mediana/.test(t)) bands.add("51-200");
  if (/grande|gran empresa|corporaci/.test(t)) bands.add("201-500").add("500+");
  return [...bands];
}

export const cities = (s: string): string[] => CITIES.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(s));
const INDUSTRIES = ["Industrial", "Metal", "Agroalimentario", "Logística", "Farmacéutico", "Tecnología", "Construcción", "Retail", "Hostelería", "Sanidad", "Educación", "Energía", "Transporte", "Servicios", "Inmobiliario", "Automoción", "Químico", "Textil"];
const industries = (s: string): string[] => INDUSTRIES.filter((i) => new RegExp(i.normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 6), "i").test(s.normalize("NFD").replace(/[̀-ͯ]/g, "")));
const ROLES = ["Director General", "CEO", "Gerente", "Director de Operaciones", "Director de Planta", "Director Financiero", "Director de RRHH", "Director Comercial", "Propietario", "Socio"];
const roles = (s: string): string[] => ROLES.filter((r) => new RegExp(r.replace(/ /g, "\\s+"), "i").test(s));

function apply(topic: InterviewTopic, answer: string, dna: BusinessDNA, input: InterviewInput): { dna: BusinessDNA; learned: string[] } {
  const d: BusinessDNA = structuredClone(dna);
  const learned: string[] = [];
  const a = answer.trim();
  if (!a || SKIP.test(a)) return { dna: d, learned: ["Lo dejamos para más adelante."] };
  switch (topic) {
    case "COMPANY": {
      d.company.description = a.length > 20 ? a : `${d.company.description} ${a}`.trim();
      const c = cities(a);
      if (c.length) d.company.locations = [...new Set([...d.company.locations, ...c])];
      learned.push(`Ya sé a qué se dedica ${input.companyName}${c.length ? ` y que trabaja en ${c.join(", ")}` : ""}.`);
      break;
    }
    case "SERVICES": {
      const [yes, no] = a.split(NEG_SPLIT).length > 1 ? [a.split(NEG_SPLIT)[0], a.split(NEG_SPLIT).slice(2).join(" ")] : [a, ""];
      const s = list(yes);
      if (s.length) d.offering.services = [...new Set([...d.offering.services, ...s])];
      const ex = list(no);
      if (ex.length) d.offering.exclusions = [...new Set([...d.offering.exclusions, ...ex])];
      learned.push(`Ofrecéis ${s.slice(0, 3).join(", ")}${s.length > 3 ? " y más" : ""}.`);
      if (ex.length) learned.push(`No hacéis ${ex.join(", ")}: no os llevaré eso.`);
      break;
    }
    case "IDEAL_CUSTOMER": {
      const ind = industries(a);
      const sz = sizeBands(a);
      const geo = cities(a);
      const rl = roles(a);
      if (ind.length) d.ideal_customer.industries = [...new Set([...d.ideal_customer.industries, ...ind])];
      if (sz.length) d.ideal_customer.company_size = [...new Set([...d.ideal_customer.company_size, ...sz])];
      if (geo.length) d.ideal_customer.geography = [...new Set([...d.ideal_customer.geography, ...geo])];
      if (rl.length) d.ideal_customer.roles = [...new Set([...d.ideal_customer.roles, ...rl])];
      if (!ind.length && !sz.length && !geo.length) d.ideal_customer.problems = [...new Set([...d.ideal_customer.problems, a.slice(0, 160)])];
      learned.push(`Tu cliente ideal: ${[ind.join("/"), sz.length ? `${sz.join(" o ")} empleados` : "", geo.join(", ")].filter(Boolean).join(" · ") || "lo he anotado tal cual"}.`);
      break;
    }
    case "TRIGGERS": {
      const trg = TRIGGER_RULES.filter((r) => r.re.test(a)).map((r) => r.trigger);
      if (trg.length) d.ideal_customer.triggers = [...new Set([...d.ideal_customer.triggers, ...trg])];
      else d.ideal_customer.problems = [...new Set([...d.ideal_customer.problems, a.slice(0, 160)])];
      learned.push(trg.length ? `Estaré atento a: ${trg.map((t) => input.availableTriggers.find((x) => x.code === t)?.label ?? t).join(", ")}.` : "Anotado como situación que os necesita; lo afinaré con los primeros Indicios.");
      break;
    }
    case "COMMERCIAL": {
      const e = euros(a);
      if (e.length) {
        d.commercial.ticket_min = Math.min(...e);
        d.commercial.ticket_max = Math.max(...e);
        if (e.length === 1) d.commercial.ticket_max = undefined;
      }
      const days = a.match(/(\d+)\s*(d[ií]as|semanas|meses)/i);
      if (days) d.commercial.sales_cycle_days = Number(days[1]) * (days[2].startsWith("sem") ? 7 : days[2].startsWith("mes") ? 30 : 1);
      if (/sin capacidad|lleno|no podemos|saturad/i.test(a)) d.offering.capacity = "FULL";
      else if (/poca capacidad|limitad|justos/i.test(a)) d.offering.capacity = "LIMITED";
      learned.push(e.length ? `Ticket desde ${d.commercial.ticket_min?.toLocaleString("es-ES")} €${d.commercial.ticket_max ? ` hasta ${d.commercial.ticket_max.toLocaleString("es-ES")} €` : ""}: descartaré lo que no llegue.` : "No me has dado cifras: aceptaré cualquier ticket hasta que me digas lo contrario.");
      break;
    }
    case "PERFECT_REFERRAL":
      d.referrals.perfect_referral = a;
      learned.push("Este es el ejemplo que usaré para reconocer una Cesión de las buenas.");
      break;
    case "DISQUALIFIERS": {
      const ex = list(a);
      d.referrals.disqualifiers = [...new Set([...d.referrals.disqualifiers, ...ex])];
      d.referrals.poor_referral = d.referrals.poor_referral || a;
      learned.push(`Nunca te llevaré: ${ex.join(", ")}.`);
      break;
    }
    case "INTRO_PREFERENCES":
      d.referrals.introduction_preferences = a;
      learned.push("Así pediré a los socios que te presenten.");
      break;
    case "KNOWLEDGE": {
      const ns = list(a);
      d.knowledge.never_share = [...new Set([...d.knowledge.never_share, ...ns])];
      learned.push(`No saldrá de la empresa: ${ns.join(", ")}.`);
      break;
    }
    case "OBJECTIVES":
      d.objectives.quarterly = a;
      learned.push("Priorizaré los Indicios que acerquen ese objetivo.");
      break;
    case "DONE":
      break;
  }
  return { dna: d, learned };
}

/** Un paso del guion: aplica la última respuesta al tema en curso y formula la pregunta del siguiente tema. */
export async function scriptedInterview(input: InterviewInput): Promise<InterviewStep> {
  const transcript = input.transcript;
  const lastAgent = [...transcript].reverse().find((t) => t.role === "agent");
  const last = transcript[transcript.length - 1];
  let dna = input.dna;
  let learned: string[] = [];
  let idx = 0;
  if (lastAgent?.topic) {
    const current = lastAgent.topic;
    if (last?.role === "timonel") ({ dna, learned } = apply(current, last.text, dna, input));
    idx = INTERVIEW_ORDER.indexOf(current) + 1;
  } else if (input.websiteText && !dna.company.description) {
    dna = structuredClone(dna);
    dna.company.description = input.websiteText.slice(0, 280);
    learned = ["He leído vuestra web y me he quedado con lo esencial."];
  }
  if (last?.role === "timonel" && /^(terminar|acabar|ya est[aá]|suficiente|fin)\b/i.test(last.text.trim())) idx = INTERVIEW_ORDER.length - 1;
  const topic = INTERVIEW_ORDER[Math.min(idx, INTERVIEW_ORDER.length - 1)];
  const progress = Math.min(1, idx / (INTERVIEW_ORDER.length - 1));
  if (topic === "DONE") {
    const summary = [
      dna.offering.services.length ? `Ofrecéis ${dna.offering.services.slice(0, 3).join(", ")}.` : null,
      dna.ideal_customer.industries.length ? `Buscamos ${dna.ideal_customer.industries.join(", ")}${dna.ideal_customer.geography.length ? ` en ${dna.ideal_customer.geography.slice(0, 3).join(", ")}` : ""}.` : null,
      dna.commercial.ticket_min ? `Ticket desde ${dna.commercial.ticket_min.toLocaleString("es-ES")} €.` : null,
    ].filter(Boolean);
    return { message: `Tengo lo que necesito para empezar. ${summary.join(" ")} Revisa el ADN a la derecha y, si está bien, valídalo: desde ese momento trabajo con él en la Mesa. Podrás ampliarlo cuando quieras.`, topic: "DONE", dna, learned, progress: 1 };
  }
  return { message: QUESTION[topic](input), topic, dna, learned, progress };
}
