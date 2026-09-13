/** NS-CAT v0.1 · Clasificación NS de Actividades (D-013): base CNAE + Especialidad NS. Subconjunto para NS Cumbre. */
export interface NscatSpecialty {
  code: string;
  cnae: string;
  name: string;
  description: string;
  status: "OFFICIAL" | "NS_EXTENDED" | "PROVISIONAL";
  regulated?: boolean;
  overlapsWith?: string[];
}

export const NSCAT: NscatSpecialty[] = [
  { code: "OBRA_INDUSTRIAL", cnae: "41.20", name: "Obra y reforma industrial", description: "Construcción, reforma y adecuación de naves, plantas y oficinas industriales." , status: "OFFICIAL", overlapsWith: ["ARQUITECTURA"] },
  { code: "SEGUROS_EMPRESA", cnae: "66.22", name: "Seguros de empresa", description: "Correduría de seguros para empresas: flotas, responsabilidad civil, multirriesgo, D&O.", status: "OFFICIAL", regulated: true },
  { code: "PRL", cnae: "74.90", name: "Prevención de riesgos laborales", description: "Servicio de prevención ajeno, planes de seguridad, coordinación de actividades.", status: "OFFICIAL" },
  { code: "SELECCION_PERSONAL", cnae: "78.10", name: "Selección de personal", description: "Búsqueda y selección de perfiles técnicos, mandos intermedios y directivos.", status: "OFFICIAL" },
  { code: "CIBERSEGURIDAD", cnae: "62.02", name: "Ciberseguridad", description: "Auditoría, protección de redes, cumplimiento ENS/ISO 27001, respuesta a incidentes.", status: "NS_EXTENDED", overlapsWith: ["TELECOMUNICACIONES"] },
  { code: "MOBILIARIO_OFICINA", cnae: "46.65", name: "Mobiliario de oficina", description: "Equipamiento y mobiliario de oficinas, espacios industriales y salas.", status: "OFFICIAL" },
  { code: "BRANDING", cnae: "73.11", name: "Branding", description: "Identidad de marca, naming y sistemas visuales para empresas consolidadas.", status: "NS_EXTENDED" },
  { code: "ASESORIA_FISCAL", cnae: "69.20", name: "Asesoría fiscal", description: "Planificación y cumplimiento fiscal de empresas y grupos familiares.", status: "OFFICIAL", regulated: false },
  { code: "LEGAL_MA", cnae: "69.10", name: "Legal M&A", description: "Compraventa de empresas, due diligence legal, pactos de socios.", status: "OFFICIAL", regulated: true },
  { code: "VALORACION_EMPRESAS", cnae: "70.22", name: "Valoración de empresas", description: "Valoraciones independientes para operaciones societarias, sucesión y financiación.", status: "NS_EXTENDED" },
  // Plazas vacantes en NS Cumbre (para Antesala y Embajada)
  { code: "TELECOMUNICACIONES", cnae: "61.10", name: "Telecomunicaciones", description: "Conectividad, redes y telefonía para sedes empresariales.", status: "OFFICIAL" },
  { code: "ARQUITECTURA", cnae: "71.11", name: "Arquitectura", description: "Proyectos y dirección de obra de edificios industriales y terciarios.", status: "OFFICIAL", regulated: true },
  { code: "FINANCIACION", cnae: "64.99", name: "Financiación de empresa", description: "Intermediación de financiación bancaria y alternativa para inversión.", status: "NS_EXTENDED", regulated: true },
  { code: "LOGISTICA", cnae: "52.29", name: "Logística", description: "Transporte, almacenaje y operaciones logísticas.", status: "OFFICIAL" },
  { code: "FACILITY_MANAGEMENT", cnae: "81.10", name: "Facility management", description: "Mantenimiento integral y servicios generales de instalaciones.", status: "OFFICIAL" },
];

export const SPECIALTY_NAME: Record<string, string> = Object.fromEntries(NSCAT.map((s) => [s.code, s.name]));
