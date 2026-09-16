/** Datos demo · NS Sevilla · NS Cumbre. Empresas verosímiles del brief (docs/05_DESIGN_BRIEF.md §8). */
import type { BusinessDNA } from "@/core/types";

export interface SeedCompany {
  slug: string;
  name: string;
  legalName: string;
  website: string;
  specialty: string;
  person: { fullName: string; role: string; email: string; isDirector?: boolean; isNetwork?: boolean };
  dna: BusinessDNA;
}

const base = (over: Partial<BusinessDNA> & { company: BusinessDNA["company"]; offering: BusinessDNA["offering"]; ideal_customer: BusinessDNA["ideal_customer"]; commercial: BusinessDNA["commercial"]; referrals: BusinessDNA["referrals"] }): BusinessDNA => ({
  knowledge: { public: [], chapter_only: [], match_only: [], management_only: [], never_share: [] },
  permissions: { auto_publish_chapter_signals: false, external_contact: false, human_approval_required: true },
  objectives: { monthly: "", quarterly: "", strategic: "" },
  ...over,
});

export const SEED_COMPANIES: SeedCompany[] = [
  {
    slug: "hispalis",
    name: "Reformas Industriales Híspalis",
    legalName: "Reformas Industriales Híspalis, S.L.",
    website: "https://hispalis-industrial.es",
    specialty: "OBRA_INDUSTRIAL",
    person: { fullName: "Carlos Ruiz", role: "CEO", email: "carlos@hispalis-industrial.es" },
    dna: base({
      company: { description: "Constructora especializada en reforma y adecuación de naves y plantas industriales en Andalucía occidental. 42 personas, 18 años de actividad.", locations: ["Sevilla", "Dos Hermanas"], website: "https://hispalis-industrial.es", certifications: ["ISO 9001", "ISO 14001", "Clasificación de contratista Grupo C"], credibility: ["120 naves reformadas", "Clientes: agroindustria, logística, metal"] },
      offering: { services: ["Reforma integral de naves industriales", "Adecuación de plantas de producción", "Oficinas dentro de nave", "Instalaciones industriales llave en mano", "Licencias y legalización de actividad"], products: [], differentiators: ["Plazo cerrado con penalización", "Oficina técnica propia", "Obra sin parar la producción"], exclusions: ["Vivienda residencial", "Obra civil pública"], capacity: "OPEN" },
      ideal_customer: { industries: ["Industrial", "Metal", "Agroalimentario", "Logística", "Farmacéutico"], company_size: ["51-200", "201-500", "500+"], geography: ["Sevilla", "Andalucía", "Dos Hermanas", "Alcalá de Guadaíra", "Cádiz", "Huelva"], roles: ["Director General", "Director de Operaciones", "Director de Planta"], triggers: ["NEW_SITE", "HEADCOUNT_GROWTH", "NEW_PRODUCT"], problems: ["Ampliar capacidad productiva sin parar", "Legalizar una actividad", "Trasladar una planta"], exclusions: ["Retail"] },
      commercial: { average_ticket: 180_000, ticket_min: 40_000, ticket_max: 2_000_000, sales_cycle_days: 90, strategic_priority: 3, urgency: "90D" },
      referrals: { perfect_referral: "Una empresa industrial de más de 50 empleados que va a abrir o ampliar una planta en la provincia de Sevilla y necesita reformar la nave, con presupuesto aprobado y un director de operaciones al frente.", acceptable_referral: "Adecuación de oficinas dentro de una nave existente.", poor_referral: "Pequeña reforma de local comercial.", disqualifiers: ["vivienda", "local comercial", "obra pública"], introduction_preferences: "Preferimos visita a la nave en la primera semana." },
      knowledge: { public: ["Servicios y certificaciones"], chapter_only: ["Capacidad actual de obra"], match_only: ["Precios orientativos"], management_only: [], never_share: ["Márgenes por proyecto", "Lista de clientes"] },
      objectives: { monthly: "2 nuevas obras", quarterly: "Entrar en farmacéutico", strategic: "Duplicar facturación en 3 años" },
    }),
  },
  {
    slug: "guadalquivir",
    name: "Correduría Guadalquivir",
    legalName: "Correduría de Seguros Guadalquivir, S.L.",
    website: "https://correduriaguadalquivir.es",
    specialty: "SEGUROS_EMPRESA",
    person: { fullName: "Lucía Márquez", role: "Socia directora", email: "lucia@correduriaguadalquivir.es" },
    dna: base({
      company: { description: "Correduría independiente especializada en programas de seguros para empresas industriales y flotas. 15 personas.", locations: ["Sevilla"], website: "https://correduriaguadalquivir.es", certifications: ["Registro DGSFP"], credibility: ["300 empresas cliente", "Especialistas en flotas y RC industrial"] },
      offering: { services: ["Programas de seguros de empresa", "Flotas", "Responsabilidad civil", "Multirriesgo industrial", "D&O", "Crédito y caución"], products: [], differentiators: ["Gestión de siniestros propia", "Auditoría gratuita de pólizas"], exclusions: ["Seguros de particulares"], capacity: "OPEN" },
      ideal_customer: { industries: ["Industrial", "Logística", "Transporte", "Construcción"], company_size: ["11-50", "51-200", "201-500"], geography: ["Sevilla", "Andalucía"], roles: ["Director Financiero", "Director General", "Gerente"], triggers: ["NEW_SITE", "FLEET_RENEWAL", "HEADCOUNT_GROWTH", "INTERNATIONAL_EXPANSION"], problems: ["Pólizas dispersas", "Coberturas insuficientes en nueva actividad"], exclusions: [] },
      commercial: { average_ticket: 12_000, ticket_min: 3_000, ticket_max: 250_000, sales_cycle_days: 45, strategic_priority: 2, urgency: "90D" },
      referrals: { perfect_referral: "Empresa industrial que abre sede o renueva flota y necesita revisar todo su programa de seguros con el director financiero.", acceptable_referral: "Revisión de una póliza concreta.", poor_referral: "Seguro de hogar o de coche particular.", disqualifiers: ["particular", "hogar"], introduction_preferences: "Llamada de 20 minutos con el director financiero." },
      knowledge: { public: [], chapter_only: [], match_only: [], management_only: [], never_share: ["Primas de clientes"] },
    }),
  },
  {
    slug: "prl-andaluza",
    name: "PRL Andaluza",
    legalName: "Prevención Andaluza de Riesgos, S.L.",
    website: "https://prlandaluza.es",
    specialty: "PRL",
    person: { fullName: "Manuel Ortega", role: "Director general", email: "manuel@prlandaluza.es" },
    dna: base({
      company: { description: "Servicio de prevención ajeno acreditado en Andalucía. Planes de seguridad para obra e industria, coordinación de actividades empresariales.", locations: ["Sevilla", "Córdoba"], website: "https://prlandaluza.es", certifications: ["SPA acreditado Junta de Andalucía"], credibility: ["25 técnicos", "400 empresas cliente"] },
      offering: { services: ["Servicio de prevención ajeno", "Plan de seguridad y salud", "Coordinación de actividades", "Vigilancia de la salud", "Formación PRL"], products: [], differentiators: ["Técnico asignado en 48 h", "Especialistas en industria"], exclusions: [], capacity: "OPEN" },
      ideal_customer: { industries: ["Industrial", "Construcción", "Logística", "Agroalimentario"], company_size: ["11-50", "51-200", "201-500"], geography: ["Sevilla", "Andalucía"], roles: ["Director de RRHH", "Director de Planta", "Gerente"], triggers: ["NEW_SITE", "HEADCOUNT_GROWTH"], problems: ["Apertura de centro de trabajo", "Inspección de trabajo"], exclusions: [] },
      commercial: { average_ticket: 9_000, ticket_min: 2_000, ticket_max: 80_000, sales_cycle_days: 30, strategic_priority: 2, urgency: "30D" },
      referrals: { perfect_referral: "Empresa que abre un nuevo centro de trabajo con más de 30 personas y necesita el plan de prevención antes de la apertura.", acceptable_referral: "Cambio de servicio de prevención.", poor_referral: "Autónomo sin empleados.", disqualifiers: ["autónomo sin empleados"], introduction_preferences: "Visita al centro." },
    }),
  },
  {
    slug: "talento-sur",
    name: "Talento Sur",
    legalName: "Talento Sur Selección, S.L.",
    website: "https://talentosur.es",
    specialty: "SELECCION_PERSONAL",
    person: { fullName: "Ana Belén Cortés", role: "Directora", email: "anabelen@talentosur.es" },
    dna: base({
      company: { description: "Consultora de selección especializada en perfiles técnicos e industriales en Andalucía. 12 consultores.", locations: ["Sevilla"], website: "https://talentosur.es", certifications: [], credibility: ["600 procesos cerrados", "Garantía de 6 meses"] },
      offering: { services: ["Selección de perfiles técnicos", "Mandos intermedios", "Directivos industriales", "Selección masiva para aperturas"], products: [], differentiators: ["Base de datos propia de 40.000 perfiles industriales", "Procesos en 4 semanas"], exclusions: ["ETT", "Trabajo temporal"], capacity: "LIMITED" },
      ideal_customer: { industries: ["Industrial", "Logística", "Tecnología", "Agroalimentario"], company_size: ["51-200", "201-500", "500+"], geography: ["Sevilla", "Andalucía", "España"], roles: ["Director de RRHH", "Director General"], triggers: ["NEW_SITE", "HEADCOUNT_GROWTH", "NEW_PRODUCT"], problems: ["Contratar 20+ personas en 3 meses"], exclusions: [] },
      commercial: { average_ticket: 25_000, ticket_min: 6_000, ticket_max: 200_000, sales_cycle_days: 30, strategic_priority: 3, urgency: "30D" },
      referrals: { perfect_referral: "Empresa industrial que abre planta y necesita contratar 30 o más personas en menos de 6 meses, con director de RRHH identificado.", acceptable_referral: "Un perfil directivo concreto.", poor_referral: "Contratación temporal de campaña.", disqualifiers: ["temporal", "campaña"], introduction_preferences: "Reunión con RRHH." },
    }),
  },
  {
    slug: "securenet",
    name: "SecureNet Sevilla",
    legalName: "SecureNet Sevilla, S.L.",
    website: "https://securenet.es",
    specialty: "CIBERSEGURIDAD",
    person: { fullName: "Javier Peña", role: "CEO", email: "javier@securenet.es" },
    dna: base({
      company: { description: "Ciberseguridad para pymes industriales y despachos profesionales: auditoría, protección y cumplimiento.", locations: ["Sevilla"], website: "https://securenet.es", certifications: ["ISO 27001", "ENS Medio"], credibility: ["SOC propio 24/7"] },
      offering: { services: ["Auditoría de ciberseguridad", "Protección de redes y puestos", "Cumplimiento ENS / ISO 27001", "Respuesta a incidentes", "Formación de empleados"], products: [], differentiators: ["SOC 24/7 en Sevilla"], exclusions: ["Desarrollo de software"], capacity: "OPEN" },
      ideal_customer: { industries: ["Industrial", "Legal", "Sanitario", "Logística"], company_size: ["11-50", "51-200", "201-500"], geography: ["Sevilla", "Andalucía", "España"], roles: ["Director General", "CIO", "Director Financiero"], triggers: ["NEW_SITE", "DIGITALIZATION", "REGULATORY_CHANGE"], problems: ["Incidente reciente", "Exigencia de cliente o aseguradora"], exclusions: [] },
      commercial: { average_ticket: 22_000, ticket_min: 5_000, ticket_max: 150_000, sales_cycle_days: 60, strategic_priority: 2, urgency: "90D" },
      referrals: { perfect_referral: "Empresa de 50 a 200 empleados que abre sede o sufre un incidente y necesita auditoría y protección con decisor identificado.", acceptable_referral: "Formación de empleados.", poor_referral: "Antivirus para un autónomo.", disqualifiers: ["autónomo"], introduction_preferences: "Demo del SOC." },
    }),
  },
  {
    slug: "mobiliario-delta",
    name: "Mobiliario Delta",
    legalName: "Mobiliario Delta, S.A.",
    website: "https://mobiliariodelta.es",
    specialty: "MOBILIARIO_OFICINA",
    person: { fullName: "Rocío Benítez", role: "Directora comercial", email: "rocio@mobiliariodelta.es" },
    dna: base({
      company: { description: "Equipamiento integral de oficinas y espacios corporativos para proyectos grandes.", locations: ["Sevilla", "Madrid"], website: "https://mobiliariodelta.es", certifications: [], credibility: ["Proyectos de 200+ puestos"] },
      offering: { services: ["Proyecto y equipamiento integral de oficinas", "Mobiliario técnico"], products: ["Puestos operativos", "Salas de reuniones", "Archivo"], differentiators: ["Solo proyectos integrales"], exclusions: ["Venta suelta de mobiliario"], capacity: "OPEN" },
      ideal_customer: { industries: ["Servicios", "Tecnología", "Industrial", "Banca"], company_size: ["201-500", "500+"], geography: ["Sevilla", "Andalucía", "Madrid"], roles: ["Director General", "Director de Compras"], triggers: ["NEW_SITE"], problems: ["Equipar una sede completa"], exclusions: [] },
      commercial: { average_ticket: 250_000, ticket_min: 120_000, ticket_max: 3_000_000, sales_cycle_days: 120, strategic_priority: 2, urgency: "180D" },
      referrals: { perfect_referral: "Empresa que equipa una sede nueva de más de 150 puestos con proyecto integral.", acceptable_referral: "Ampliación de 80 puestos.", poor_referral: "Diez mesas para una oficina pequeña.", disqualifiers: ["venta suelta"], introduction_preferences: "Reunión con dirección y planos." },
    }),
  },
  {
    slug: "branding-atelier",
    name: "Branding Atelier",
    legalName: "Branding Atelier Estudio, S.L.",
    website: "https://brandingatelier.es",
    specialty: "BRANDING",
    person: { fullName: "Marta Salinas", role: "Directora creativa", email: "marta@brandingatelier.es" },
    dna: base({
      company: { description: "Estudio de identidad de marca para empresas consolidadas que cambian de etapa.", locations: ["Sevilla"], website: "https://brandingatelier.es", certifications: [], credibility: ["Premios Laus", "Marcas de 40 empresas andaluzas"] },
      offering: { services: ["Identidad de marca", "Naming", "Sistema visual", "Arquitectura de marca"], products: [], differentiators: ["Proceso de 12 semanas con dirección"], exclusions: ["Diseño de piezas sueltas", "Redes sociales"], capacity: "LIMITED" },
      ideal_customer: { industries: ["Industrial", "Alimentación", "Servicios", "Tecnología"], company_size: ["51-200", "201-500"], geography: ["Sevilla", "Andalucía", "España"], roles: ["Director General", "Director de Marketing"], triggers: ["INTERNATIONAL_EXPANSION", "COMPANY_SALE", "NEW_PRODUCT", "LEADERSHIP_CHANGE"], problems: ["Marca que ya no representa a la empresa"], exclusions: [] },
      commercial: { average_ticket: 45_000, ticket_min: 25_000, ticket_max: 200_000, sales_cycle_days: 60, strategic_priority: 1, urgency: "180D" },
      referrals: { perfect_referral: "Empresa consolidada de más de 50 empleados que cambia de etapa (sucesión, internacionalización) y necesita reconstruir su marca con presupuesto de 25.000 € o más.", acceptable_referral: "Naming de una nueva línea.", poor_referral: "Logo barato para una startup.", disqualifiers: ["logo barato"], introduction_preferences: "Sesión de diagnóstico de 90 minutos." },
    }),
  },
  {
    slug: "fiscal-triana",
    name: "Consultora Fiscal Triana",
    legalName: "Consultora Fiscal Triana, S.L.P.",
    website: "https://fiscaltriana.es",
    specialty: "ASESORIA_FISCAL",
    person: { fullName: "Alberto Vidal", role: "Socio director", email: "alberto@fiscaltriana.es" },
    dna: base({
      company: { description: "Asesoría fiscal para empresas familiares y grupos en Sevilla. 20 profesionales.", locations: ["Sevilla"], website: "https://fiscaltriana.es", certifications: ["AEDAF"], credibility: ["Especialistas en empresa familiar"] },
      offering: { services: ["Planificación fiscal", "Cumplimiento fiscal", "Reestructuraciones", "Fiscalidad de sucesión"], products: [], differentiators: ["Socio siempre al frente"], exclusions: ["Contabilidad de autónomos"], capacity: "OPEN" },
      ideal_customer: { industries: ["Industrial", "Agroalimentario", "Inmobiliario", "Servicios"], company_size: ["11-50", "51-200", "201-500"], geography: ["Sevilla", "Andalucía"], roles: ["Director Financiero", "Propietario", "Director General"], triggers: ["COMPANY_SALE", "INTERNATIONAL_EXPANSION", "NEW_SITE"], problems: ["Sucesión", "Reestructuración de grupo"], exclusions: [] },
      commercial: { average_ticket: 18_000, ticket_min: 4_000, ticket_max: 120_000, sales_cycle_days: 45, strategic_priority: 2, urgency: "90D" },
      referrals: { perfect_referral: "Empresa familiar que prepara una venta o una sucesión y necesita planificación fiscal con el propietario.", acceptable_referral: "Cambio de asesoría.", poor_referral: "Declaración de la renta.", disqualifiers: ["renta particular"], introduction_preferences: "Reunión confidencial con el propietario." },
      knowledge: { public: [], chapter_only: [], match_only: [], management_only: [], never_share: ["Operaciones en curso de clientes"] },
    }),
  },
  {
    slug: "bufete-alameda",
    name: "Bufete Alameda",
    legalName: "Bufete Alameda Abogados, S.L.P.",
    website: "https://bufetealameda.es",
    specialty: "LEGAL_MA",
    person: { fullName: "Inés Domínguez", role: "Socia", email: "ines@bufetealameda.es", isDirector: true, isNetwork: true }, // en la demo, la misma persona hace de Directiva y de NS
    dna: base({
      company: { description: "Despacho mercantil especializado en compraventa de empresas y due diligence. 14 abogados.", locations: ["Sevilla"], website: "https://bufetealameda.es", certifications: ["Colegio de Abogados de Sevilla"], credibility: ["60 operaciones cerradas"] },
      offering: { services: ["Compraventa de empresas", "Due diligence legal", "Pactos de socios", "Reestructuraciones societarias"], products: [], differentiators: ["Equipo dedicado por operación"], exclusions: ["Laboral", "Penal"], capacity: "OPEN" },
      ideal_customer: { industries: ["Industrial", "Agroalimentario", "Tecnología", "Servicios"], company_size: ["11-50", "51-200", "201-500"], geography: ["Sevilla", "Andalucía", "España"], roles: ["Propietario", "Director General", "Director Financiero"], triggers: ["COMPANY_SALE", "FUNDING_ROUND", "INTERNATIONAL_EXPANSION"], problems: ["Vender la empresa", "Entrada de un inversor"], exclusions: [] },
      commercial: { average_ticket: 40_000, ticket_min: 10_000, ticket_max: 400_000, sales_cycle_days: 90, strategic_priority: 3, urgency: "180D" },
      referrals: { perfect_referral: "Empresa familiar de 20 a 200 empleados que prepara la venta total o parcial y necesita due diligence y contrato, con el propietario al frente.", acceptable_referral: "Pacto de socios.", poor_referral: "Reclamación de una factura.", disqualifiers: ["reclamación de factura", "penal"], introduction_preferences: "Reunión confidencial." },
    }),
  },
  {
    slug: "valoraciones-ibericas",
    name: "Valoraciones Ibéricas",
    legalName: "Valoraciones Ibéricas, S.L.",
    website: "https://valoracionesibericas.es",
    specialty: "VALORACION_EMPRESAS",
    person: { fullName: "Pedro Lucena", role: "Socio", email: "pedro@valoracionesibericas.es", isDirector: true }, // segunda Directiva (D-057): cuando la excepción afecta a Bufete Alameda, decide una Directiva que no es parte
    dna: base({
      company: { description: "Valoraciones independientes de empresas para operaciones, sucesión y financiación.", locations: ["Sevilla", "Madrid"], website: "https://valoracionesibericas.es", certifications: ["REV"], credibility: ["200 valoraciones"] },
      offering: { services: ["Valoración de empresas", "Fairness opinion", "Valoración de activos intangibles"], products: [], differentiators: ["Informe defendible ante terceros"], exclusions: ["Tasación inmobiliaria"], capacity: "OPEN" },
      ideal_customer: { industries: ["Industrial", "Agroalimentario", "Servicios", "Tecnología"], company_size: ["11-50", "51-200", "201-500"], geography: ["Sevilla", "Andalucía", "España"], roles: ["Propietario", "Director Financiero"], triggers: ["COMPANY_SALE", "FUNDING_ROUND"], problems: ["Saber cuánto vale la empresa antes de negociar"], exclusions: [] },
      commercial: { average_ticket: 15_000, ticket_min: 5_000, ticket_max: 90_000, sales_cycle_days: 30, strategic_priority: 2, urgency: "90D" },
      referrals: { perfect_referral: "Empresa que prepara una venta o entrada de socio y necesita una valoración independiente antes de negociar.", acceptable_referral: "Valoración para sucesión.", poor_referral: "Tasación de un local.", disqualifiers: ["tasación inmobiliaria"], introduction_preferences: "Llamada con el director financiero." },
    }),
  },
];

/** Candidaturas de demostración para la Antesala (D-035): una por veredicto de plaza. */
export const SEED_CANDIDACIES: { fullName: string; companyName: string; email: string; specialtyCode: string | null; city: string; message: string | null; status: string; notes?: string; daysAgo: number }[] = [
  { fullName: "Manuel Ortiz", companyName: "Mantenimiento Integral Guadaíra", email: "mortiz@miguadaira.es", specialtyCode: "FACILITY_MANAGEMENT", city: "Sevilla", message: "Mantenimiento integral de naves y oficinas: climatización, electricidad, limpieza técnica. 60 técnicos.", status: "NEW", daysAgo: 0 },
  { fullName: "Lucía Romero", companyName: "Redes del Sur Telecom", email: "lucia@redesdelsur.es", specialtyCode: "TELECOMUNICACIONES", city: "Sevilla", message: "Conectividad y telefonía para sedes industriales de 30 a 300 empleados en Andalucía occidental.", status: "NEW", daysAgo: 1 },
  { fullName: "Javier Cansino", companyName: "Correduría Giralda", email: "jcansino@corredurigiralda.es", specialtyCode: "SEGUROS_EMPRESA", city: "Sevilla", message: "Seguros para pymes industriales y flotas. Trabajamos con 400 empresas en la provincia.", status: "FOUNDING", notes: "Plaza de Seguros ocupada. Acepta promover la siguiente Sala.", daysAgo: 10 },
  { fullName: "Marta Vidal", companyName: "Estudio Vidal Arquitectos", email: "marta@estudiovidal.com", specialtyCode: "ARQUITECTURA", city: "Sevilla", message: "Proyectos y dirección de obra de naves y oficinas. Colaboramos habitualmente con constructoras.", status: "CONTACTED", notes: "Llamada el lunes. Interesada. Hay que comprobar con Constructora Guadalquivir que no compiten en obra.", daysAgo: 6 },
  { fullName: "Antonio Beltrán", companyName: "Beltrán Consultores", email: "abeltran@beltranconsultores.es", specialtyCode: null, city: "Sevilla", message: "Consultoría de subvenciones y ayudas públicas para industria.", status: "NEW", daysAgo: 3 },
  { fullName: "Rosa Aguilar", companyName: "Logística Bética", email: "rosa@logisticabetica.es", specialtyCode: "LOGISTICA", city: "Córdoba", message: "Transporte y almacenaje para industria agroalimentaria. Nave en Córdoba y delegación en Sevilla.", status: "INTERVIEW", notes: "Entrevista hecha. Buen perfil; su base es Córdoba. Ver si prefiere fundar NS Córdoba.", daysAgo: 12 },
  { fullName: "Carmen Ledesma", companyName: "Asesoría Fiscal Nervión", email: "cledesma@fiscalnervion.es", specialtyCode: "ASESORIA_FISCAL", city: "Sevilla", message: "Fiscalidad de pymes y grupos familiares. Queremos entrar aunque la plaza esté ocupada.", status: "FOUNDING", daysAgo: 9 },
  { fullName: "Álvaro Peña", companyName: "Selección Andaluza", email: "apena@seleccionandaluza.es", specialtyCode: "SELECCION_PERSONAL", city: "Sevilla", message: "Selección de mandos intermedios para industria.", status: "FOUNDING", daysAgo: 8 },
  { fullName: "Pedro Lago", companyName: "Financia Sur", email: "plago@financiasur.es", specialtyCode: "FINANCIACION", city: "Sevilla", message: null, status: "WAITLISTED", notes: "Aprobable, pero pidió esperar al cierre de su ejercicio.", daysAgo: 20 },
];
