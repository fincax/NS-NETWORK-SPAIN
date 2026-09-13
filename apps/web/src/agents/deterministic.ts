/**
 * Proveedor determinista: reglas explícitas sobre el texto del Indicio.
 * Sirve para la demo, los tests y como red de seguridad. NS-ARP §12: nunca reglas que inventen contenido;
 * lo que no está en el texto se devuelve como insuficiente o con confianza baja.
 */
import type { BusinessTrigger, IntroPackage, NeedDraft, SizeBand, TimingBand, ValueBand } from "@/core/types";
import type { ExtractionInput, ExtractionOutput, IntroInput, LLMProvider, QualificationAnswer, QualificationInput } from "./provider";

const TRIGGER_RULES: { trigger: BusinessTrigger; re: RegExp }[] = [
  { trigger: "NEW_SITE", re: /nueva (sede|planta|nave|oficina|f[aá]brica|delegaci[oó]n)|abr(e|ir[aá]|ir|iendo) (una |otra |su )?(nueva )?(planta|sede|nave|oficina|delegaci[oó]n|f[aá]brica)|traslad(a|o|ar[aá]) (la|su) (sede|planta)/i },
  { trigger: "HEADCOUNT_GROWTH", re: /\d+\s*(empleados|personas|trabajadores|puestos) (nuevos|m[aá]s)|contratar|ampliar (la )?plantilla|crecimiento de plantilla|incorporar[aá]n? \d+/i },
  { trigger: "INTERNATIONAL_EXPANSION", re: /portugal|francia|marruecos|italia|internacional|exportar|entrada en [A-ZÁ]/i },
  { trigger: "FUNDING_ROUND", re: /ronda (seed|serie|de financiaci[oó]n)|inversor|ampliaci[oó]n de capital/i },
  { trigger: "COMPANY_SALE", re: /venta de la empresa|vender (la|su) empresa|sucesi[oó]n|entrada de (un )?socio|operaci[oó]n societaria/i },
  { trigger: "FLEET_RENEWAL", re: /flota/i },
  { trigger: "DIGITALIZATION", re: /\berp\b|digitaliz|ciberataque|incidente de seguridad|ransomware/i },
  { trigger: "NEW_PRODUCT", re: /nueva l[ií]nea|nuevo producto|lanzamiento/i },
  { trigger: "REGULATORY_CHANGE", re: /normativa|regulaci[oó]n|\bens\b/i },
  { trigger: "LEADERSHIP_CHANGE", re: /nuevo director|cambio de direcci[oó]n|nueva direcci[oó]n financiera/i },
];

const NEEDS_BY_TRIGGER: Record<BusinessTrigger, { code: string; p: number; desc: string }[]> = {
  NEW_SITE: [
    { code: "OBRA_INDUSTRIAL", p: 0.85, desc: "Reforma y adecuación de la nueva nave o planta." },
    { code: "PRL", p: 0.8, desc: "Plan de prevención y apertura del nuevo centro de trabajo." },
    { code: "SELECCION_PERSONAL", p: 0.5, desc: "Selección de personal para la nueva sede." },
    { code: "CIBERSEGURIDAD", p: 0.65, desc: "Protección de redes y puestos de la nueva sede." },
    { code: "TELECOMUNICACIONES", p: 0.6, desc: "Conectividad y telefonía de la nueva sede." },
    { code: "SEGUROS_EMPRESA", p: 0.6, desc: "Cobertura de la nueva sede y su actividad." },
    { code: "ARQUITECTURA", p: 0.5, desc: "Proyecto y dirección de obra." },
    { code: "MOBILIARIO_OFICINA", p: 0.45, desc: "Equipamiento de oficinas de la nueva sede." },
    { code: "FACILITY_MANAGEMENT", p: 0.4, desc: "Mantenimiento de las nuevas instalaciones." },
    { code: "FINANCIACION", p: 0.35, desc: "Financiación de la inversión." },
  ],
  HEADCOUNT_GROWTH: [
    { code: "SELECCION_PERSONAL", p: 0.85, desc: "Selección de las nuevas incorporaciones." },
    { code: "PRL", p: 0.6, desc: "Adaptación del plan de prevención al aumento de plantilla." },
  ],
  INTERNATIONAL_EXPANSION: [
    { code: "ASESORIA_FISCAL", p: 0.8, desc: "Fiscalidad internacional y estructura en el país de destino." },
    { code: "LEGAL_MA", p: 0.6, desc: "Constitución y contratos en el país de destino." },
    { code: "LOGISTICA", p: 0.55, desc: "Logística de exportación." },
    { code: "SEGUROS_EMPRESA", p: 0.5, desc: "Cobertura de la actividad internacional." },
    { code: "SELECCION_PERSONAL", p: 0.5, desc: "Equipo local en destino." },
    { code: "BRANDING", p: 0.4, desc: "Adaptación de marca al nuevo mercado." },
  ],
  FUNDING_ROUND: [
    { code: "LEGAL_MA", p: 0.7, desc: "Pacto de socios y documentación de la ronda." },
    { code: "VALORACION_EMPRESAS", p: 0.7, desc: "Valoración previa a la ronda." },
    { code: "BRANDING", p: 0.5, desc: "Marca e identidad antes de la ronda." },
  ],
  COMPANY_SALE: [
    { code: "LEGAL_MA", p: 0.9, desc: "Due diligence legal y contrato de compraventa." },
    { code: "VALORACION_EMPRESAS", p: 0.85, desc: "Valoración independiente de la empresa." },
    { code: "ASESORIA_FISCAL", p: 0.7, desc: "Planificación fiscal de la operación." },
  ],
  NEW_PRODUCT: [
    { code: "BRANDING", p: 0.5, desc: "Marca de la nueva línea." },
    { code: "OBRA_INDUSTRIAL", p: 0.4, desc: "Adecuación de la línea de producción." },
  ],
  REGULATORY_CHANGE: [{ code: "CIBERSEGURIDAD", p: 0.6, desc: "Cumplimiento normativo de seguridad." }],
  SUPPLIER_CHANGE: [],
  DIGITALIZATION: [
    { code: "CIBERSEGURIDAD", p: 0.85, desc: "Auditoría y protección tras el cambio tecnológico." },
    { code: "TELECOMUNICACIONES", p: 0.5, desc: "Infraestructura de red." },
  ],
  FLEET_RENEWAL: [
    { code: "SEGUROS_EMPRESA", p: 0.85, desc: "Programa de seguros de la nueva flota." },
    { code: "FINANCIACION", p: 0.5, desc: "Financiación de la flota." },
  ],
  LEADERSHIP_CHANGE: [{ code: "BRANDING", p: 0.4, desc: "Nueva etapa, nueva marca." }],
  OTHER: [],
};

const EXPLICIT_NEEDS: { re: RegExp; code: string; p: number; desc: string }[] = [
  { re: /identidad de marca|branding|rebranding|nueva marca/i, code: "BRANDING", p: 0.9, desc: "Diseño de identidad de marca." },
  { re: /ciberseguridad|auditor[ií]a de seguridad/i, code: "CIBERSEGURIDAD", p: 0.9, desc: "Auditoría y protección de ciberseguridad." },
  { re: /due diligence/i, code: "LEGAL_MA", p: 0.9, desc: "Due diligence legal." },
  { re: /valoraci[oó]n/i, code: "VALORACION_EMPRESAS", p: 0.85, desc: "Valoración independiente." },
  { re: /seguro/i, code: "SEGUROS_EMPRESA", p: 0.7, desc: "Revisión del programa de seguros." },
  { re: /mobiliario/i, code: "MOBILIARIO_OFICINA", p: 0.8, desc: "Equipamiento de oficinas." },
  { re: /prevenci[oó]n de riesgos|\bprl\b/i, code: "PRL", p: 0.9, desc: "Servicio de prevención." },
];

const INDUSTRY_RULES: { re: RegExp; industry: string }[] = [
  { re: /metal[uú]rgic|industrial|f[aá]brica|planta|producci[oó]n|manufactur/i, industry: "Industrial" },
  { re: /saas|software|startup|tecnol[oó]g|app\b/i, industry: "Tecnología" },
  { re: /agro|alimentaci[oó]n|aceite|bodega/i, industry: "Agroalimentario" },
  { re: /log[ií]stic|transporte|almac[eé]n/i, industry: "Logística" },
  { re: /despacho|abogad|bufete/i, industry: "Legal" },
  { re: /hotel|restaurante|hostel/i, industry: "Hostelería" },
  { re: /cl[ií]nica|hospital|sanitari/i, industry: "Sanitario" },
  { re: /inmobiliari|promotora/i, industry: "Inmobiliario" },
  { re: /empresa familiar|familiar/i, industry: "Servicios" },
];

const CITIES = ["Dos Hermanas", "Alcalá de Guadaíra", "Utrera", "Sevilla", "Córdoba", "Cádiz", "Huelva", "Málaga", "Madrid", "Lisboa", "Oporto"];

function sizeBand(text: string): { band: SizeBand; conf: number } {
  const m = text.match(/(\d{1,4})\s*(empleados|personas|trabajadores)( nuevos| m[aá]s)?/i);
  if (m) {
    const n = Number(m[1]);
    const newHires = Boolean(m[3]);
    const base = newHires ? n * 2 : n; // si son incorporaciones nuevas, la empresa suele ser mayor
    const band: SizeBand = base <= 10 ? "1-10" : base <= 50 ? "11-50" : base <= 200 ? "51-200" : base <= 500 ? "201-500" : "500+";
    return { band, conf: newHires ? 0.6 : 0.85 };
  }
  if (/startup/i.test(text)) return { band: "1-10", conf: 0.6 };
  if (/pyme/i.test(text)) return { band: "11-50", conf: 0.5 };
  if (/gran empresa|multinacional/i.test(text)) return { band: "500+", conf: 0.6 };
  return { band: "11-50", conf: 0.3 };
}

function timing(text: string): TimingBand {
  if (/inmediat|urgente|esta semana|ya mismo/i.test(text)) return "IMMEDIATE";
  if (/este mes|30 d[ií]as|pr[oó]ximas semanas/i.test(text)) return "30D";
  if (/q[1-4]|trimestre|enero|febrero|marzo|abril|mayo|junio|julio|septiembre|octubre|noviembre|diciembre|90 d[ií]as|tres meses|antes de (la |su )?ronda/i.test(text)) return "90D";
  if (/seis meses|segundo semestre|180 d[ií]as|pr[oó]ximo a[nñ]o|el a[nñ]o que viene/i.test(text)) return "180D";
  return "UNKNOWN";
}

function valueBand(text: string, triggers: BusinessTrigger[]): ValueBand | undefined {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(k|mil|m|millones?)?\s*(€|euros)/i) ?? text.match(/(\d+(?:[.,]\d+)?)\s*(k|mil)\b/i);
  if (m) {
    let n = Number(m[1].replace(".", "").replace(",", "."));
    const unit = (m[2] ?? "").toLowerCase();
    if (unit === "k" || unit === "mil") n *= 1_000;
    if (unit.startsWith("m")) n *= 1_000_000;
    return n < 10_000 ? "<10K" : n < 50_000 ? "10-50K" : n < 100_000 ? "50-100K" : n < 500_000 ? "100-500K" : ">500K";
  }
  if (/startup|peque[nñ]a|presupuesto ajustado|barato/i.test(text)) return "<10K";
  if (triggers.includes("NEW_SITE")) return "50-100K";
  if (triggers.includes("COMPANY_SALE")) return "10-50K";
  if (triggers.includes("FLEET_RENEWAL") || triggers.includes("INTERNATIONAL_EXPANSION")) return "10-50K";
  return undefined;
}

const THIRD_PARTY_RE = /cliente(?:\s+m[ií]o|\s+nuestro)?\s+([A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñ]*(?:\s+(?:de|del|la|las|los|y|el)\s+[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñ]*|\s+[A-ZÁÉÍÓÚ][\wÁÉÍÓÚáéíóúñ]*)*)/;

export class DeterministicProvider implements LLMProvider {
  readonly name = "deterministic";

  async extractSignal(input: ExtractionInput): Promise<ExtractionOutput> {
    const text = input.rawContent;
    const triggers = TRIGGER_RULES.filter((r) => r.re.test(text)).map((r) => r.trigger);
    const industry = INDUSTRY_RULES.find((r) => r.re.test(text))?.industry ?? "Servicios";
    const { band, conf: sizeConf } = sizeBand(text);
    const city = CITIES.find((c) => new RegExp(c, "i").test(text)) ?? input.defaultCity;
    const geography = { country: "España", region: "Andalucía", city };
    const publicSource = /^fuente p[uú]blica/i.test(text.trim());
    const expectsContact = /espera (la|vuestra|tu|su) llamada|le he dicho que le llamar|sabe que le llamar|est[aá] avisad|le he hablado de vosotros|me ha pedido que le presente/i.test(text);
    const relationship = publicSource
      ? "WEAK"
      : /mi cliente|nuestro cliente|cliente m[ií]o|le aseguro|le llevamos/i.test(text)
      ? "DIRECT"
      : /conozco|contacto|amigo|proveedor/i.test(text)
        ? "INDIRECT"
        : /he o[ií]do|he le[ií]do|dicen que|noticia/i.test(text)
          ? "WEAK"
          : "UNKNOWN";
    const t = timing(text);
    const vb = valueBand(text, triggers);
    const confidence = Math.min(0.95, 0.35 + (triggers.length > 0 ? 0.25 : 0) + (relationship === "DIRECT" ? 0.2 : relationship === "INDIRECT" ? 0.1 : 0) + sizeConf * 0.15);

    const available = new Set(input.availableSpecialties.map((s) => s.code));
    const map = new Map<string, NeedDraft>();
    for (const e of EXPLICIT_NEEDS) {
      if (e.re.test(text) && available.has(e.code)) {
        map.set(e.code, { specialty_hints: [e.code], description: e.desc, plausibility: e.p, evidence: [`Mención explícita en el Indicio: "${text.match(e.re)?.[0]}".`], unknowns: [] });
      }
    }
    for (const trg of triggers) {
      for (const n of NEEDS_BY_TRIGGER[trg]) {
        if (!available.has(n.code)) continue;
        let p = n.p;
        if (n.code === "SELECCION_PERSONAL" && triggers.includes("HEADCOUNT_GROWTH")) p = Math.max(p, 0.75);
        const prev = map.get(n.code);
        if (!prev || prev.plausibility < p) map.set(n.code, { specialty_hints: [n.code], description: n.desc, plausibility: p, evidence: [`Trigger ${trg} detectado en el Indicio.`], unknowns: [] });
      }
    }
    const needs = [...map.values()].sort((a, b) => b.plausibility - a.plausibility);
    for (const n of needs) {
      if (!vb) n.unknowns.push("Valor estimado sin confirmar.");
      if (!/presupuesto/i.test(text)) n.unknowns.push("Presupuesto sin confirmar.");
    }

    const sizeLabel = band.replace("-", "–");
    const industryLabel = industry === "Industrial" ? "Empresa industrial" : industry === "Tecnología" ? "Empresa tecnológica" : `Empresa de ${industry.toLowerCase()}`;
    const what = triggers.includes("NEW_SITE")
      ? `abrirá nueva sede en ${city === "Sevilla" ? "Sevilla" : `${city} (área de Sevilla)`}`
      : triggers.includes("COMPANY_SALE")
        ? "prepara una operación societaria"
        : triggers.includes("INTERNATIONAL_EXPANSION")
          ? "prepara su expansión internacional"
          : triggers.includes("FUNDING_ROUND")
            ? "prepara una ronda de financiación"
            : needs[0]
              ? `necesita ${needs[0].description.toLowerCase().replace(/\.$/, "")}`
              : "presenta una necesidad por concretar";
    const timingLabel = { IMMEDIATE: "inmediato", "30D": "30 días", "90D": "90 días", "180D": "180 días", UNKNOWN: "plazo sin confirmar" }[t];
    const relLabel = publicSource ? "fuente pública" : expectsContact ? "Interesado avisado" : { DIRECT: "relación directa", INDIRECT: "relación indirecta", WEAK: "relación débil", UNKNOWN: "relación sin confirmar" }[relationship];

    const tp = text.match(THIRD_PARTY_RE);
    const thirdPartyName = tp?.[1]?.trim();
    const decisionRole = text.match(/director(?:a)? (general|financier[oa]|de operaciones|de planta|de rrhh|de recursos humanos)|\bceo\b|gerente|propietari[oa]/i)?.[0];

    return {
      chapter_layer: {
        need_summary: `${industryLabel} de ${sizeLabel} empleados ${what} · ${timingLabel} · ${relLabel}`,
        industry,
        geography,
        company_size_band: band,
        timing: t,
        value_band: vb,
        relationship_strength: relationship,
        third_party_expects_contact: expectsContact,
        confidence: Number(confidence.toFixed(2)),
      },
      qualification_layer: {
        detailed_context: thirdPartyName ? text.split(tp![0]).join("cliente").split(thirdPartyName).join("la empresa") : text,
        triggers,
        constraints: [/presupuesto aprobado/i.test(text) ? "Presupuesto aprobado" : "", /licencia/i.test(text) ? "Licencia en trámite" : ""].filter(Boolean),
        decision_role: decisionRole ? capitalize(decisionRole) : undefined,
      },
      identity_layer: thirdPartyName ? { third_party_company: { name: thirdPartyName } } : undefined,
      needs,
      triggers,
    };
  }

  async answerQualification(input: QualificationInput): Promise<QualificationAnswer> {
    const text = `${input.rawContent}\n${input.privateNotes}`;
    switch (input.kind) {
      case "BUDGET": {
        const amount = text.match(/presupuesto[^.]*?(\d[\d.,]*\s*(k|mil|€|euros|millones?))/i);
        if (amount) return { answer: `Presupuesto aprobado: ${amount[1]}.`, confidence: 0.85, insufficient: false };
        if (/presupuesto (de obra )?aprobado/i.test(text)) return { answer: "Presupuesto aprobado internamente, cifra no conocida.", confidence: 0.6, insufficient: false };
        if (/sin presupuesto|presupuesto ajustado/i.test(text)) return { answer: "Presupuesto limitado o sin definir.", confidence: 0.5, insufficient: false };
        return { answer: "", confidence: 0.2, insufficient: true };
      }
      case "TIMING": {
        const m = text.match(/(inicio previsto|prev[ií]sto|para|antes de)\s+(q[1-4]|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|[a-z]+ semestre|la ronda)/i);
        if (m) return { answer: `${/licencia/i.test(text) ? "Licencia de obra en trámite, " : ""}${m[0].toLowerCase()}.`, confidence: 0.8, insufficient: false };
        const t = timing(text);
        if (t !== "UNKNOWN") return { answer: `Horizonte ${t}.`, confidence: 0.6, insufficient: false };
        return { answer: "", confidence: 0.2, insufficient: true };
      }
      case "DECISION_MAKER": {
        const m = text.match(/director(?:a)? (general|financier[oa]|de operaciones|de planta|de rrhh)|\bceo\b|gerente|propietari[oa]|fundador/i);
        if (m) {
          const rel = /le aseguro|le llevamos|trato directo|conozco personalmente/i.test(text) ? " El cedente tiene trato directo con esa persona." : "";
          return { answer: `${capitalize(m[0])} decide.${rel}`, confidence: rel ? 0.9 : 0.7, insufficient: false };
        }
        return { answer: "", confidence: 0.2, insufficient: true };
      }
      case "SCOPE":
      case "CONSTRAINT":
      case "FREE":
        return { answer: "Sin información adicional en el Indicio.", confidence: 0.3, insufficient: true };
    }
  }

  async draftIntro(input: IntroInput): Promise<IntroPackage> {
    const contact = input.contactName ? `${input.contactName}, ` : "Hola, ";
    const need = input.needSummary.split("·")[0].trim();
    const pref = input.introductionPreferences ? input.introductionPreferences.toLowerCase().replace(/\.$/, "") : "una primera conversación de 20 minutos";
    return {
      subject: `Presentación: ${input.receiverCompany} · ${need}`,
      message: `${contact}te presento a ${input.receiverPerson}, de ${input.receiverCompany}. Sé que ${need.toLowerCase().replace(/^empresa/, "vuestra empresa")} y creo que os pueden ayudar con ${input.receiverServices.slice(0, 2).join(" y ").toLowerCase()}. Los conozco y responden. Si te parece bien, ${input.receiverPerson} os propone ${pref}. Os dejo en contacto.`,
      context_for_receiver: `${input.originatorPerson} (${input.originatorCompany}) cede a ${input.thirdPartyCompany}. Contexto: ${input.detailedContext}`,
      suggested_next_step: input.introductionPreferences || "Primera conversación de 20 minutos esta semana.",
    };
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
