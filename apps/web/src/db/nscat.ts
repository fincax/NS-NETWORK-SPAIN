/**
 * NS-CAT v0.2 · Clasificación NS de Actividades (D-013, D-080): base CNAE + Especialidad NS.
 *
 * La CNAE es el índice, nunca la plaza. Una Especialidad NS existe, y es plaza, solo si pasa a la vez las tres pruebas
 * (del referido, de la unidad de contratación y de la señal) y la prueba de mercado (D-080, `docs/12` §3.4).
 *
 * Dos clases de plaza (D-080):
 *  - `base`: la que NS-CAT marca para fundar cualquier Sala. Toda Sala tiene una fila de plaza (vacante u ocupada) por
 *    cada especialidad base. Orden de captación en la Antesala: Manantiales, profesiones tecnológicas, resto.
 *  - por demanda (sin `base`): existe en el catálogo, pero la Sala no tiene fila de plaza hasta que sus Agentes detectan
 *    una necesidad de esa especialidad sin titular (Mesa) o la Directiva aprueba una candidatura para ella (Antesala).
 *
 * Las marcas `manantial` (D-059) y `tech` (D-080) no cambian ninguna regla de la plaza: ordenan la Antesala, preparan al
 * Agente y reconocen la amplitud de lo cedido. Los códigos CNAE son de la CNAE-2009; fijar `nscat_version` sobre la
 * CNAE-2025 antes de las admisiones reales (pendiente del fundador).
 */
export const NSCAT_VERSION = "0.2";

export interface NscatSpecialty {
  code: string;
  cnae: string;
  name: string;
  description: string;
  status: "OFFICIAL" | "NS_EXTENDED" | "PROVISIONAL";
  regulated?: boolean;
  overlapsWith?: string[];
  /** Manantial (D-059): especialidad que, por naturaleza, ve necesidades de muchos sectores. */
  manantial?: boolean;
  /** Plaza base (D-080): toda Sala la abre al fundarse. Sin la marca, es plaza por demanda. */
  base?: boolean;
  /** Profesión tecnológica (D-080): segundo bloque de captación tras los Manantiales; prueba de mercado nacional. */
  tech?: boolean;
}

export const NSCAT: NscatSpecialty[] = [
  // ── Plazas base de NS-CAT v0.1 (las dieciséis de NS Cumbre) ─────────────────────────────────────────────────────
  { code: "OBRA_INDUSTRIAL", cnae: "41.20", name: "Obra y reforma industrial", description: "Construcción, reforma y adecuación de naves, plantas y oficinas industriales.", status: "OFFICIAL", base: true, overlapsWith: ["ARQUITECTURA"] },
  { code: "SEGUROS_EMPRESA", cnae: "66.22", name: "Seguros de empresa", description: "Correduría de seguros para empresas: flotas, responsabilidad civil, multirriesgo, D&O.", status: "OFFICIAL", regulated: true, base: true, manantial: true },
  { code: "PRL", cnae: "74.90", name: "Prevención de riesgos laborales", description: "Servicio de prevención ajeno, planes de seguridad, coordinación de actividades.", status: "OFFICIAL", base: true },
  { code: "SELECCION_PERSONAL", cnae: "78.10", name: "Selección de personal", description: "Búsqueda y selección de perfiles técnicos, mandos intermedios y directivos.", status: "OFFICIAL", base: true },
  { code: "CIBERSEGURIDAD", cnae: "62.02", name: "Ciberseguridad", description: "Auditoría, protección de redes, cumplimiento ENS/ISO 27001, respuesta a incidentes.", status: "NS_EXTENDED", base: true, tech: true, overlapsWith: ["TELECOMUNICACIONES", "NUBE_INFRAESTRUCTURA", "COMPLIANCE_DATOS"] },
  { code: "MOBILIARIO_OFICINA", cnae: "46.65", name: "Mobiliario de oficina", description: "Equipamiento y mobiliario de oficinas, espacios industriales y salas.", status: "OFFICIAL", base: true },
  { code: "BRANDING", cnae: "73.11", name: "Branding", description: "Identidad de marca, naming y sistemas visuales para empresas consolidadas.", status: "NS_EXTENDED", base: true, overlapsWith: ["MARKETING_DIGITAL"] },
  { code: "ASESORIA_FISCAL", cnae: "69.20", name: "Asesoría fiscal", description: "Planificación y cumplimiento fiscal de empresas y grupos familiares.", status: "OFFICIAL", regulated: false, base: true, manantial: true },
  { code: "LEGAL_MA", cnae: "69.10", name: "Legal M&A", description: "Compraventa de empresas, due diligence legal, pactos de socios.", status: "OFFICIAL", regulated: true, base: true },
  { code: "VALORACION_EMPRESAS", cnae: "70.22", name: "Valoración de empresas", description: "Valoraciones independientes para operaciones societarias, sucesión y financiación.", status: "NS_EXTENDED", base: true },
  { code: "TELECOMUNICACIONES", cnae: "61.10", name: "Telecomunicaciones", description: "Conectividad, redes, cableado y telefonía para sedes empresariales.", status: "OFFICIAL", base: true, tech: true, overlapsWith: ["NUBE_INFRAESTRUCTURA", "IOT_INDUSTRIA"] },
  { code: "ARQUITECTURA", cnae: "71.11", name: "Arquitectura", description: "Proyectos y dirección de obra de edificios industriales y terciarios.", status: "OFFICIAL", regulated: true, base: true, manantial: true },
  { code: "FINANCIACION", cnae: "64.99", name: "Financiación de empresa", description: "Intermediación de financiación bancaria y alternativa para inversión.", status: "NS_EXTENDED", regulated: true, base: true },
  { code: "LOGISTICA", cnae: "52.29", name: "Logística", description: "Transporte, almacenaje y operaciones logísticas.", status: "OFFICIAL", base: true },
  { code: "FACILITY_MANAGEMENT", cnae: "81.10", name: "Facility management", description: "Mantenimiento integral y servicios generales de instalaciones.", status: "OFFICIAL", base: true, overlapsWith: ["LIMPIEZA", "ENERGIA_EFICIENCIA"] },
  { code: "ADMINISTRACION_FINCAS", cnae: "68.32", name: "Administración de fincas", description: "Gestión de comunidades de propietarios y patrimonios inmobiliarios: cada comunidad necesita obra, seguros, energía, limpieza, legal o mantenimiento.", status: "OFFICIAL", base: true, manantial: true, overlapsWith: ["INMOBILIARIO_EMPRESA"] },

  // ── Plazas base nuevas en v0.2 · bloque tecnológico (D-080: las más receptivas a lo agentic de NS) ─────────────
  { code: "SOFTWARE_MEDIDA", cnae: "62.01", name: "Desarrollo de software a medida", description: "Aplicaciones propias, integraciones y plataformas internas que ningún producto de mercado cubre. No es implantar un ERP ni montar una tienda online.", status: "OFFICIAL", base: true, tech: true, overlapsWith: ["ECOMMERCE_PLATAFORMAS", "PRODUCTO_DIGITAL_UX", "IA_AGENTES"] },
  { code: "ERP_GESTION", cnae: "62.02", name: "Implantación de ERP y sistemas de gestión", description: "Selección e implantación de ERP (Odoo, SAP, Business Central, Sage y similares), migración de datos y formación. Un ERP nuevo arrastra datos, ciberseguridad, formación, financiación y mobiliario: ve necesidades de muchos sectores.", status: "NS_EXTENDED", base: true, tech: true, manantial: true, overlapsWith: ["CRM_AUTOMATIZACION", "AUTOMATIZACION_PROCESOS", "DATOS_ANALITICA"] },
  { code: "NUBE_INFRAESTRUCTURA", cnae: "62.03", name: "Nube e infraestructura", description: "Migración a la nube, servidores, copias, puestos de trabajo y continuidad de negocio. No es la auditoría de seguridad ni el cableado de la sede.", status: "NS_EXTENDED", base: true, tech: true, overlapsWith: ["CIBERSEGURIDAD", "TELECOMUNICACIONES", "SISTEMAS_GESTIONADOS"] },
  { code: "DATOS_ANALITICA", cnae: "63.11", name: "Datos, analítica e inteligencia de negocio", description: "Cuadros de mando, integración de fuentes, calidad del dato e informes de dirección. No es construir un agente ni implantar el ERP.", status: "NS_EXTENDED", base: true, tech: true, overlapsWith: ["IA_AGENTES", "ERP_GESTION"] },
  { code: "IA_AGENTES", cnae: "62.01", name: "Inteligencia artificial y agentes", description: "Asistentes y agentes de IA para atención, ventas, operaciones y back office; automatización con modelos de lenguaje; formación de equipos en IA.", status: "NS_EXTENDED", base: true, tech: true, overlapsWith: ["DATOS_ANALITICA", "AUTOMATIZACION_PROCESOS", "SOFTWARE_MEDIDA"] },

  // ── Plazas base nuevas en v0.2 · resto (D-080 §2.2: legal, marketing, inmobiliario) ──────────────────────────────
  { code: "DERECHO_LABORAL", cnae: "69.10", name: "Derecho laboral", description: "Despidos, ERE y ERTE, convenios, inspecciones y litigios laborales. No es la gestoría de nóminas ni la selección de personal.", status: "NS_EXTENDED", regulated: true, base: true, overlapsWith: ["ASESORIA_FISCAL", "LEGAL_MA"] },
  { code: "INMOBILIARIO_EMPRESA", cnae: "68.31", name: "Inmobiliario de empresa", description: "Búsqueda y negociación de naves, oficinas y locales; venta y alquiler de activos empresariales.", status: "OFFICIAL", base: true, overlapsWith: ["ADMINISTRACION_FINCAS", "ARQUITECTURA"] },
  { code: "MARKETING_DIGITAL", cnae: "73.11", name: "Marketing digital de resultados", description: "Captación de clientes con campañas de pago, embudos y medición. No es la identidad de marca ni el posicionamiento orgánico.", status: "NS_EXTENDED", base: true, tech: true, overlapsWith: ["BRANDING", "SEO_CONTENIDO"] },

  // ── Plazas por demanda · tecnológicas (D-080 §3.5): se abren cuando la Sala detecta la necesidad ────────────────
  { code: "CRM_AUTOMATIZACION", cnae: "62.02", name: "Implantación de CRM y automatización comercial", description: "CRM, embudos, secuencias y cuadros comerciales (HubSpot, Salesforce, Zoho y similares). No es el ERP ni las campañas de captación.", status: "NS_EXTENDED", tech: true, overlapsWith: ["ERP_GESTION", "MARKETING_DIGITAL", "AUTOMATIZACION_PROCESOS"] },
  { code: "AUTOMATIZACION_PROCESOS", cnae: "62.02", name: "Automatización de procesos e integraciones", description: "Robotización de tareas, integraciones entre sistemas y flujos sin código. No es construir un agente de IA ni implantar un ERP.", status: "NS_EXTENDED", tech: true, overlapsWith: ["ERP_GESTION", "IA_AGENTES", "IOT_INDUSTRIA"] },
  { code: "ECOMMERCE_PLATAFORMAS", cnae: "47.91", name: "Comercio electrónico y plataformas digitales", description: "Tiendas online, marketplaces y portales de cliente, con sus integraciones de pago y logística.", status: "NS_EXTENDED", tech: true, overlapsWith: ["SOFTWARE_MEDIDA", "MARKETING_DIGITAL"] },
  { code: "PRODUCTO_DIGITAL_UX", cnae: "74.10", name: "Producto digital y experiencia de usuario", description: "Diseño de producto, investigación con usuarios, prototipado e interfaces. No es el desarrollo ni la marca.", status: "NS_EXTENDED", tech: true, overlapsWith: ["SOFTWARE_MEDIDA", "BRANDING"] },
  { code: "IOT_INDUSTRIA", cnae: "62.09", name: "Internet de las cosas e industria 4.0", description: "Sensorización, captura de datos de planta, mantenimiento predictivo y conectividad industrial.", status: "NS_EXTENDED", tech: true, overlapsWith: ["TELECOMUNICACIONES", "AUTOMATIZACION_PROCESOS", "DATOS_ANALITICA"] },
  { code: "SISTEMAS_GESTIONADOS", cnae: "62.03", name: "Soporte y sistemas gestionados", description: "Soporte informático continuado, puestos de trabajo, licencias y servicio gestionado para pymes.", status: "NS_EXTENDED", tech: true, overlapsWith: ["NUBE_INFRAESTRUCTURA", "CIBERSEGURIDAD"] },
  { code: "SEO_CONTENIDO", cnae: "73.11", name: "SEO y contenido", description: "Posicionamiento orgánico, contenidos y autoridad digital. No es la campaña de pago ni la identidad de marca.", status: "NS_EXTENDED", tech: true, overlapsWith: ["MARKETING_DIGITAL", "BRANDING"] },

  // ── Plazas por demanda · resto ──────────────────────────────────────────────────────────────────────────────────
  { code: "ENERGIA_EFICIENCIA", cnae: "71.12", name: "Energía y eficiencia energética", description: "Autoconsumo, auditorías energéticas, climatización eficiente y contratos de suministro.", status: "NS_EXTENDED", overlapsWith: ["FACILITY_MANAGEMENT", "OBRA_INDUSTRIAL"] },
  { code: "LIMPIEZA", cnae: "81.21", name: "Limpieza de instalaciones", description: "Limpieza de oficinas, naves y centros de trabajo con contrato recurrente.", status: "OFFICIAL", overlapsWith: ["FACILITY_MANAGEMENT"] },
  { code: "COMPLIANCE_DATOS", cnae: "69.10", name: "Compliance y protección de datos", description: "Programas de cumplimiento, canal de denuncias, protección de datos y delegado de protección de datos.", status: "NS_EXTENDED", regulated: true, overlapsWith: ["CIBERSEGURIDAD", "LEGAL_MA"] },
  { code: "FORMACION_EMPRESAS", cnae: "85.59", name: "Formación para empresas", description: "Formación técnica, directiva y bonificada para plantillas.", status: "OFFICIAL", overlapsWith: ["SELECCION_PERSONAL"] },
];

const byCode = new Map(NSCAT.map((s) => [s.code, s]));

/** Especialidades Manantial (D-059): las primeras que la Antesala busca al fundar y completar una Sala. */
export const MANANTIALES = new Set(NSCAT.filter((s) => s.manantial).map((s) => s.code));
/** Plazas base (D-080): toda Sala tiene fila de plaza para ellas. */
export const BASE_SEATS = new Set(NSCAT.filter((s) => s.base).map((s) => s.code));
/** Profesiones tecnológicas (D-080): segundo bloque de captación. */
export const TECH = new Set(NSCAT.filter((s) => s.tech).map((s) => s.code));

export const SPECIALTY_NAME: Record<string, string> = Object.fromEntries(NSCAT.map((s) => [s.code, s.name]));

export const isBaseSeat = (code: string) => BASE_SEATS.has(code);

/**
 * Orden de captación de la Antesala (D-059, D-080): 0 Manantial · 1 profesión tecnológica · 2 resto de plazas base ·
 * 3 plaza por demanda. Dentro de cada bloque, por nombre.
 */
export function seatPriority(code: string): 0 | 1 | 2 | 3 {
  const s = byCode.get(code);
  if (!s) return 3;
  if (s.manantial) return 0;
  if (s.tech && s.base) return 1;
  if (s.base) return 2;
  return 3;
}

export const compareSeats = (a: { code: string; name: string }, b: { code: string; name: string }) =>
  seatPriority(a.code) - seatPriority(b.code) || a.name.localeCompare(b.name, "es");

/** Etiqueta corta de la clase de plaza para fichas y selectores. */
export function seatClassLabel(code: string): "Manantial" | "Tech" | "Base" | "Por demanda" {
  switch (seatPriority(code)) {
    case 0: return "Manantial";
    case 1: return "Tech";
    case 2: return "Base";
    default: return "Por demanda";
  }
}
