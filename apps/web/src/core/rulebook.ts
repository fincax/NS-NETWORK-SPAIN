/**
 * Reglamento (D-043): Normas de obligado cumplimiento para todos los titulares y Ventajas para los destacados.
 * Es el canal por el que el fundador añade normas en el tiempo. Cada entrada nace en BORRADOR, se PROTOCOLIZA cuando el
 * fundador la fija (queda especificada y visible en la Sala) y pasa a VIGENTE cuando el sistema la verifica y aplica sola.
 * Fuente de verdad legible: docs/18_REGLAMENTO.md. Este registro tipado es lo que la app muestra y lo que las pruebas comprueban.
 */

export type RuleKind = "NORMA" | "VENTAJA";
export type RuleScope = "TODOS" | "DESTACADOS" | "NS";
export type RuleStatus = "BORRADOR" | "PROTOCOLIZADA" | "VIGENTE" | "SUSPENDIDA" | "DEROGADA";

export interface Rule {
  id: string; // N-001 · V-001
  kind: RuleKind;
  title: string; // enunciado breve, en léxico NS
  text: string; // la norma o ventaja completa, tal como se aplica
  scope: RuleScope; // a quién obliga o a quién beneficia
  status: RuleStatus;
  since: string; // fecha en que el fundador la fijó (AAAA-MM-DD)
  source: string; // decisión que la sustenta (D-0xx)
  mechanism: string; // cómo la aplica el sistema o la Sala
  consequence?: string; // qué pasa al incumplirla (Normas) o cómo se disfruta (Ventajas)
  verification: string[]; // eventos o comprobaciones con las que NS la verifica; vacío en BORRADOR
  immutable?: boolean; // regla inmutable: no se revisa, se aplica
}

export const RULE_STATUS_LABEL: Record<RuleStatus, string> = {
  BORRADOR: "Borrador · pendiente del fundador",
  PROTOCOLIZADA: "Protocolizada · en la Sala, verificación en construcción",
  VIGENTE: "Vigente · NS la verifica y la aplica",
  SUSPENDIDA: "Suspendida",
  DEROGADA: "Derogada",
};

export const RULE_SCOPE_LABEL: Record<RuleScope, string> = {
  TODOS: "Todos los titulares",
  DESTACADOS: "Titulares destacados",
  NS: "Obligación de NS con la Sala",
};

/**
 * Criterio propuesto de titular Destacado (PROPUESTA, pendiente del fundador).
 * 85 es el titular que cumple plazos y Ritmo al 100 %, con Ecos medios de 4/5 y lo cedido con Aval 80 (docs/18 §2):
 * no se alcanza con Ecos perfectos y media disciplina (80) ni con disciplina perfecta y Ecos discretos (80).
 */
export const DESTACADO = {
  minAval: 85,
  weeksInPace: 8,
  requireCommunique: true,
  noBreachesInPeriod: true,
  text: "Titular con Aval firme ≥ 85, En Ritmo o Por encima en las últimas 8 semanas, Comunicado al día y sin incumplimientos del Reglamento en el Ejercicio.",
} as const;

export const RULEBOOK: Rule[] = [
  // ───────────── NORMAS · para todos los titulares ─────────────
  {
    id: "N-001", kind: "NORMA", scope: "TODOS", status: "VIGENTE", since: "2026-09-11", source: "D-010", immutable: true,
    title: "Nunca se cobra por una Cesión",
    text: "Ningún titular pide, ofrece, acepta ni condiciona una Cesión a dinero, comisión, descuento, contraprestación o favor. Tampoco se paga ni se descuenta por una valoración (Eco). NS tampoco cobra por Cesión.",
    mechanism: "Filtro de contraprestación en notas, Puente, Veredicto, Petición de Eco y comentarios; Compliance emite REFERRAL_FEE_VIOLATION y abre expediente ante la Directiva.",
    consequence: "Expulsión de la Sala y de la red.",
    verification: ["REFERRAL_FEE_VIOLATION"],
  },
  {
    id: "N-002", kind: "NORMA", scope: "TODOS", status: "PROTOCOLIZADA", since: "2026-09-11", source: "D-010", immutable: true,
    title: "Compromiso: un mínimo de Cesiones válidas por Ejercicio",
    text: "Toda empresa aporta el número mínimo de Cesiones válidas que fije su Sala en cada Ejercicio. Pertenecer es contribuir. El Ritmo semanal es el paso que lleva al Compromiso.",
    mechanism: "Ritmo por Sala (weekly_pace) y bloque Contribución del Aval. El objeto ContributionQuota por Ejercicio y la escalera de consecuencias están pendientes de parámetros del fundador.",
    consequence: "Escalera: aviso del Agente → conversación con la Directiva → plan de contribución → plaza en revisión → baja.",
    verification: ["CONTRIBUTION_QUOTA_MET", "CONTRIBUTION_QUOTA_MISSED"],
  },
  {
    id: "N-003", kind: "NORMA", scope: "TODOS", status: "VIGENTE", since: "2026-09-11", source: "D-010", immutable: true,
    title: "Calidad por encima de cantidad",
    text: "Solo cuenta la Cesión que el cesionario cualifica como válida con su Veredicto y NS puede contrastar. Una Cesión floja no cumple el Compromiso ni suma Mérito; un Indicio falso retira el Mérito de Promesa y anula el Aval de la Cesión.",
    mechanism: "Balanza y Compromiso cuentan solo Cesiones válidas; PROMISE_REVOKED si el Veredicto demuestra que el Indicio era falso; Aval NULO.",
    consequence: "La Cesión no cuenta; el Mérito de Promesa se retira.",
    verification: ["VERDICT_MERIT", "PROMISE_REVOKED"],
  },
  {
    id: "N-004", kind: "NORMA", scope: "TODOS", status: "PROTOCOLIZADA", since: "2026-09-11", source: "D-018", immutable: true,
    title: "Dar a conocer el trabajo a la Sala cada semana",
    text: "Cada semana el Agente redacta el Comunicado (lo estable y el delta) y el Timonel lo aprueba en el Despacho. Dos Comunicados de continuidad seguidos generan aviso; tres, aviso de la Directiva.",
    mechanism: "Protocolo II (NS-ADP). Comunicado, Gaceta y Dossier especificados en docs/14; persistencia y Reloj semanal pendientes de implementación.",
    consequence: "Misma escalera que el Compromiso.",
    verification: ["COMMUNIQUE_MET", "COMMUNIQUE_MISSED"],
  },
  {
    id: "N-005", kind: "NORMA", scope: "NS", status: "VIGENTE", since: "2026-09-11", source: "D-019", immutable: true,
    title: "Lo que se da y lo que se recibe se ve",
    text: "La Balanza de cada titular es pública en su Sala, exacta y contrastada, ordenada por plaza y nunca como ranking. La Brújula es privada.",
    mechanism: "Balanza en Mi Sala y Dossier con Cesiones válidas, valor contrastado y Aval.",
    verification: ["VALUE_CONFIRMED"],
  },
  {
    id: "N-006", kind: "NORMA", scope: "TODOS", status: "VIGENTE", since: "2026-09-14", source: "D-042", immutable: true,
    title: "Toda Cesión da la palabra al Interesado",
    text: "El cesionario pide el Eco del Interesado con la Petición que redacta su Agente y envía él mismo. El Interesado nunca ve el Veredicto; su Eco se publica solo con su consentimiento y sin datos de contacto.",
    mechanism: "Protocolo IV (NS-AEP): invitación con el Puente, Reloj a los 3, 14 y 30 días del cierre, Peticiones pendientes en Hoy y en el icono.",
    consequence: "ECO_REQUEST_MISSED (−15 de Mérito) a los 14 días del cierre sin Petición; cuenta en el bloque Respuesta del Aval.",
    verification: ["ECO_REQUEST_SENT", "ECO_REQUEST_MISSED", "ECO_RECEIVED"],
  },
  {
    id: "N-007", kind: "NORMA", scope: "TODOS", status: "VIGENTE", since: "2026-09-12", source: "D-024, D-030",
    title: "Decidir sobre una Cesión en siete días",
    text: "Toda Cesión que espera el visto bueno de un titular se decide en 7 días. A las 72 h el Agente recuerda; a los 7 días caduca y vuelve al cedente, que puede proponerla a otra Sala. El silencio cuenta.",
    mechanism: "Reloj de la Sala: REMINDER a las 72 h, EXPIRED a los 7 días.",
    consequence: "RESPONSE_LATE (−20 de Mérito) para quien calló; cuenta en el bloque Respuesta del Aval.",
    verification: ["RESPONSE_ON_TIME", "RESPONSE_LATE"],
  },
  {
    id: "N-008", kind: "NORMA", scope: "TODOS", status: "VIGENTE", since: "2026-09-12", source: "D-024, D-030",
    title: "Responder al Interesado en 48 horas tras el Puente",
    text: "Al aceptar una Cesión el cesionario se compromete a responder al Interesado en 48 h desde que el cedente tiende el Puente y a registrar el hito.",
    mechanism: "Reloj de la Sala: response_due_at a las 48 h del Puente; RESPONSE_LATE si no hay hito.",
    consequence: "RESPONSE_LATE (−10 de Mérito); cuenta en el bloque Respuesta del Aval.",
    verification: ["RESPONSE_LATE"],
  },
  {
    id: "N-009", kind: "NORMA", scope: "TODOS", status: "PROTOCOLIZADA", since: "2026-09-11", source: "D-020",
    title: "Emitir Veredicto al cerrar toda Cesión",
    text: "Toda Cesión resuelta termina con el Veredicto del cesionario en tres ejes (Facilidad, Negocio, Trato) y, si ganó, con el valor contrastado por ambas partes.",
    mechanism: "Check-in del Agente cada 14 días en las Cesiones en curso. Falta la consecuencia automática por Veredicto no emitido en plazo (parámetro del fundador).",
    consequence: "Pendiente: propuesta, RESPONSE_LATE a los 14 días del cierre sin Veredicto.",
    verification: ["OUTCOME_REPORTED"],
  },
  {
    id: "N-010", kind: "NORMA", scope: "TODOS", status: "VIGENTE", since: "2026-09-11", source: "D-001, D-027",
    title: "Una empresa por plaza y un Timonel que decide",
    text: "Cada empresa ocupa una única plaza de especialidad en su Sala y actúa a través de su Timonel, que da los vistos buenos, autoriza la Apertura, tiende el Puente y emite el Veredicto. El Agente propone; la persona decide.",
    mechanism: "Plaza única por (Sala, especialidad) en el alta; puertas humanas de NS-ARP exigen la decisión de una persona con rol en la Cesión.",
    consequence: "El alta con plaza ocupada se deriva a la Antesala o a la Fundación de una Sala nueva (D-041).",
    verification: ["HUMAN_DECISION"],
  },
  {
    id: "N-011", kind: "NORMA", scope: "TODOS", status: "VIGENTE", since: "2026-09-11", source: "CLAUDE.md · Autonomía externa en el MVP",
    title: "Ningún Agente contacta con un tercero: lo hace la persona",
    text: "El Puente y la Petición de Eco los redacta el Agente y los envía siempre el Timonel. Ningún Agente escribe a un Interesado ni a nadie fuera de NS.",
    mechanism: "No existe acción de envío externo en el código; el Timonel marca el Puente y la Petición como enviados.",
    consequence: "Si una persona contacta con un tercero usando datos de una Cesión sin Apertura autorizada, Contraste y expediente ante la Directiva (POLICY_VIOLATION).",
    verification: ["INTRODUCED", "ECO_REQUESTED"],
  },
  {
    id: "N-012", kind: "NORMA", scope: "TODOS", status: "PROTOCOLIZADA", since: "2026-09-14", source: "D-040",
    title: "Mantener el ADN de Empresa validado",
    text: "Todo titular completa la Entrevista de su Agente y valida su ADN; mientras esté sin validar, la Sala lo ve y el Agente trabaja con lo poco que sabe.",
    mechanism: "Aviso en Hoy y en el Dossier; Entrevista en /entrevista. Falta el plazo máximo sin ADN validado (parámetro del fundador).",
    consequence: "Pendiente del fundador. Propuesta: pasado el plazo, la Sala ve la plaza como 'ADN sin validar' y las Pistas hacia ese titular llevan confianza baja.",
    verification: [],
  },

  // ───────────── VENTAJAS · para los titulares destacados ─────────────
  {
    id: "V-001", kind: "VENTAJA", scope: "DESTACADOS", status: "VIGENTE", since: "2026-09-14", source: "D-015, D-042",
    title: "Acoger Embajadas",
    text: "Solo un titular con Aval ≥ 70, al menos 3 Ecos como cesionario y voz de los Interesados ≥ 70 puede ser elegido como Embajadora de una especialidad en otra Sala. Los candidatos se ordenan por Aval.",
    mechanism: "EMBASSY_ELIGIBILITY en core/aval.ts; elegibilidad visible en el Dossier.",
    consequence: "Cesiones de otras Salas y mención de Embajadora en la Hoja de Méritos.",
    verification: ["ECO_RECEIVED"],
  },
  {
    id: "V-002", kind: "VENTAJA", scope: "DESTACADOS", status: "VIGENTE", since: "2026-09-14", source: "D-042",
    title: "Prioridad en la Mesa",
    text: "A igual plaza, la Mesa consulta primero al titular con más Aval, y el Aval pesa en el Encaje de cada Pista.",
    mechanism: "Orden de candidatos en agents/mesa.ts y componente member_reputation del Encaje.",
    consequence: "Recibe antes y con mejor Encaje.",
    verification: ["AGENT_DISCOVERY"],
  },
  {
    id: "V-003", kind: "VENTAJA", scope: "DESTACADOS", status: "VIGENTE", since: "2026-09-11", source: "D-015",
    title: "Prima de Mérito por Embajada",
    text: "Quien cede fuera de su Sala una Cesión que resuelve recibe una prima de Mérito muy superior a la ordinaria (×2,5 en Promesa y Veredicto; ×1,5 en Eco).",
    mechanism: "embassyMultiplier en core/merit.ts y core/aval.ts.",
    verification: ["PROMISE_EARNED", "VERDICT_MERIT"],
  },
  {
    id: "V-004", kind: "VENTAJA", scope: "DESTACADOS", status: "PROTOCOLIZADA", since: "2026-09-11", source: "D-020",
    title: "Distinción y Cesión del mes",
    text: "El cesionario puede otorgar una Distinción al cedente (una por mes) que se publica en la Crónica; de entre las Distinciones del mes sale la Cesión del mes de la Sala.",
    mechanism: "Distinción implementada (recognitions); la Cesión del mes y su publicación en la Crónica están pendientes.",
    verification: ["RECOGNITION_GIVEN"],
  },
  {
    id: "V-005", kind: "VENTAJA", scope: "DESTACADOS", status: "PROTOCOLIZADA", since: "2026-09-11", source: "D-009, D-016",
    title: "Niveles que amplían el acceso",
    text: "Contribuidor, Referente, Consejero y Fundador se ganan con Mérito y amplían el acceso: prioridad en empates de plaza secundaria, Cesiones de otras Salas de la zona, red nacional y asiento en el consejo de la Sala. Nunca restringen el acceso básico.",
    mechanism: "Columna tier en companies; umbrales de Mérito y automatismo pendientes del fundador.",
    verification: [],
  },
  {
    id: "V-006", kind: "VENTAJA", scope: "TODOS", status: "VIGENTE", since: "2026-09-14", source: "D-041",
    title: "Gratificación a la Promotora de una Sala nueva",
    text: "La empresa que promueve una Sala nueva y reúne el mínimo de fundadoras recibe la gratificación que NS anuncia (por defecto, tres meses de cuota gratis). Nunca es dinero por referidos.",
    mechanism: "reward_text y reward_granted_at en chapter_foundings; se concede al fundar la Sala.",
    verification: ["FOUNDING_REWARD"],
  },
];

export const normas = () => RULEBOOK.filter((r) => r.kind === "NORMA");
export const ventajas = () => RULEBOOK.filter((r) => r.kind === "VENTAJA");
export const ruleById = (id: string) => RULEBOOK.find((r) => r.id === id);

/** Comprobaciones de integridad del Reglamento (las ejecutan las pruebas). */
export function validateRulebook(rules: Rule[] = RULEBOOK): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const r of rules) {
    if (seen.has(r.id)) errors.push(`${r.id}: identificador repetido`);
    seen.add(r.id);
    if (!/^(N|V)-\d{3}$/.test(r.id)) errors.push(`${r.id}: formato de identificador`);
    if ((r.kind === "NORMA") !== r.id.startsWith("N-")) errors.push(`${r.id}: el prefijo no coincide con el tipo`);
    if (r.status === "VIGENTE" && r.verification.length === 0) errors.push(`${r.id}: una regla VIGENTE necesita verificación`);
    if (r.status === "VIGENTE" && !r.mechanism) errors.push(`${r.id}: una regla VIGENTE necesita mecanismo`);
    if (r.kind === "NORMA" && r.status !== "BORRADOR" && r.scope === "TODOS" && !r.consequence && !r.immutable) errors.push(`${r.id}: una Norma protocolizada necesita consecuencia`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.since)) errors.push(`${r.id}: fecha`);
    if (r.kind === "VENTAJA" && r.immutable) errors.push(`${r.id}: una Ventaja no es inmutable`);
  }
  return errors;
}
