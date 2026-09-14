/**
 * Normas NS: lo que toda empresa acepta de forma expresa al suscribirse como titular (D-010, D-018, D-019, D-025, D-042, D-043).
 * Son las reglas inmutables de la constitución más la condición de la cuota. Cambiar el texto obliga a subir la versión:
 * la aceptación queda registrada con la versión firmada, y el sistema no da de alta a nadie que no las haya aceptado todas.
 */
export const NORMAS_VERSION = "2026-09-14.3";

export interface NormaNS {
  code: string;
  title: string;
  text: string;
  decision: string;
}

export const NORMAS_NS: readonly NormaNS[] = [
  {
    code: "SIN_CONTRAPRESTACION",
    title: "Nunca se cobra por un referido.",
    text: "Ningún miembro puede pedir, ofrecer, aceptar ni condicionar una Cesión a dinero, comisión, descuento, contraprestación o favor. NS tampoco cobra por Cesión. Hacerlo es motivo de expulsión de la Sala y de la red.",
    decision: "D-010",
  },
  {
    code: "PARA_LOS_DEMAS",
    title: "Tu Agente y tú buscáis negocio para los demás titulares de la Sala.",
    text: "El negocio para tu propia empresa no entra en NS: solo entra lo que cedes a uno o varios cesionarios. Lo que recibes lo han buscado los demás para ti. Ningún Agente NS trabaja para su propia empresa.",
    decision: "D-049",
  },
  {
    code: "COMPROMISO_SEMANAL",
    title: "Al menos una Cesión válida a la semana, sin excusas.",
    text: "Pertenecer a NS es contribuir. Con una se cumple; para destacar, varias y a varias especialidades. Cuatro semanas seguidas sin una sola Cesión válida suponen la baja de la titularidad: aviso diplomático del Agente en la segunda, aviso formal de la Directiva en la tercera y notificación de baja en la cuarta.",
    decision: "D-042",
  },
  {
    code: "CALIDAD",
    title: "La calidad del negocio cedido vale más que la cantidad. Siempre.",
    text: "Una Cesión cuenta cuando el cesionario la cualifica como válida y NS puede auditarla. Una Cesión floja no cumple el Compromiso ni suma Mérito; puede restar. Ninguna métrica de NS premia el número por encima de la calidad.",
    decision: "D-010",
  },
  {
    code: "COMUNICADO_SEMANAL",
    title: "Dar a conocer el trabajo a la Sala cada semana.",
    text: "El Agente redacta el Comunicado semanal de la empresa y el Timonel lo aprueba. Sin conocimiento mutuo no hay Cesiones de calidad.",
    decision: "D-018",
  },
  {
    code: "BALANZA_PUBLICA",
    title: "Lo que se da y lo que se recibe se ve.",
    text: "La Balanza de cada titular es pública en su Sala: Cesiones dadas y recibidas, valor contrastado y estado frente al Ritmo. Nunca es un ranking. La Brújula, con lo que hay que mejorar, solo la ve la empresa.",
    decision: "D-019",
  },
  {
    code: "CUOTA_POR_TRAMOS",
    title: "La cuota no es fija: empieza baja y sube solo con el negocio recibido.",
    text: "La cuota cubre la plaza y el Agente. Empieza en el Tramo de entrada y cambia de Tramo una vez por Ejercicio según el valor contrastado que NS haya generado a la empresa. Nunca es un porcentaje del negocio ni un cargo por Cesión.",
    decision: "D-025",
  },
] as const;

export const NORMAS_CODES: readonly string[] = NORMAS_NS.map((n) => n.code);

export interface RulesAcceptanceInput {
  rulesVersion: string;
  rules: readonly string[];
}

/** Aceptación completa de la versión vigente: la que usan el seed y las pruebas. */
export const acceptAllNormas = (): RulesAcceptanceInput => ({ rulesVersion: NORMAS_VERSION, rules: [...NORMAS_CODES] });

/** Devuelve los códigos que faltan (vacío si la aceptación es completa y de la versión vigente). */
export function missingNormas(acceptance: RulesAcceptanceInput | undefined): string[] {
  if (!acceptance || acceptance.rulesVersion !== NORMAS_VERSION) return [...NORMAS_CODES];
  const given = new Set(acceptance.rules);
  return NORMAS_CODES.filter((c) => !given.has(c));
}
