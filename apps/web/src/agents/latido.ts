/**
 * Latido de la Sala de demostración (D-057).
 *
 * La tesis de NS es que los Agentes trabajan 24/7. En la demo, sin empresas reales, eso solo se veía al pulsar
 * "Preparar NS Cumbre" y en la Ronda de las 06:00: el resto del día la Mesa quedaba con fechas viejas. El Latido
 * hace que la Sala ficticia viva a cualquier hora en la que el fundador la enseñe:
 *
 *  1. En cada franja del día (09:00, 13:00 y 18:00, hora de Madrid) el Agente de una empresa ficticia lleva a la
 *     Mesa un Indicio verosímil de un banco rotatorio, y la Mesa lo cualifica como siempre (NS-ARP S1–S9).
 *  2. Las Cesiones entre empresas ficticias avanzan solas con plazos realistas: visto bueno, aceptación, Apertura,
 *     Puente, reunión, propuesta, Veredicto y valor contrastado. Así la Balanza, el Mérito y el Libro de Valor crecen.
 *
 * Lo que el Latido nunca hace (el Timonel manda, D-027):
 *  - Decidir por la empresa protagonista (por defecto Reformas Industriales Híspalis, la persona con la que se enseña
 *    la demo): sus Cesiones esperan el toque de la persona.
 *  - Decidir por ninguna empresa que no sea de la semilla (una empresa dada de alta por el fundador para probar).
 *  - Publicar Indicios en nombre de la protagonista: lo que ella cede lo cede su Timonel con un Apunte.
 *  - Funcionar con cuentas reales (`NS_AUTH_MODE=real`) salvo que se pida expresamente con `NS_LATIDO=on`.
 *
 * Idempotente por franja: una franja produce un Indicio como máximo, y cada Cesión avanza un paso por pasada solo
 * cuando su plazo ha vencido. Se puede lanzar cada cinco minutos sin efectos dobles.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { authMode } from "@/lib/auth";
import { SEED_COMPANIES } from "@/db/seed-data";
import { createSignal, publishSignal } from "@/services/signals";
import { authorizeIntro, confirmValue, decide, markIntroduced, submitVerdict, updateStage } from "@/services/referrals";
import { mesaMode } from "@/services/jobs";
import type { SignalEnvelope, VerdictAxis } from "@/core/types";

export interface LatidoIndicio {
  key: string;
  originator: string; // slug de la empresa ficticia que cede
  rawContent: string;
  contactName?: string;
  contactRole?: string;
  legalBasisForContact?: "CONSENT" | "LEGITIMATE_INTEREST" | "CONTRACT" | "NONE";
  thirdPartyExpectsContact?: boolean;
  visibility?: "COMPANY_ONLY";
  /** Qué demuestra este Indicio (para el banco y las pruebas). */
  shows: string;
}

/**
 * Banco de Indicios del Latido. Todo ficticio; formatos y tipos de hecho, reales. Cubre las diez especialidades de
 * NS Cumbre, plazas vacantes (candidatas a Embajada), falsos positivos por ticket y un Indicio confidencial.
 * La protagonista nunca cede aquí; recibe.
 */
export const LATIDO_INDICIOS: LatidoIndicio[] = [
  { key: "conservas-aljarafe", originator: "guadalquivir", shows: "Obra, PRL, ciberseguridad y mobiliario para un traslado de planta", rawContent: "Mi cliente Conservas Aljarafe traslada su planta a Alcalá de Guadaíra en marzo: nave nueva de 6.000 m² y 120 empleados. Presupuesto de obra aprobado de 1,5 millones de euros. Decide el Director de Operaciones, con el que tengo trato directo.", contactName: "Andrés Pineda", contactRole: "Director de Operaciones", legalBasisForContact: "LEGITIMATE_INTEREST", thirdPartyExpectsContact: true },
  { key: "marisma-ransomware", originator: "talento-sur", shows: "Ciberseguridad urgente tras un incidente", rawContent: "Mi cliente Grupo Logístico Marisma, 180 empleados, sufrió un ransomware la semana pasada y sigue con parte de la operativa parada. El Director General quiere una auditoría de ciberseguridad urgente. Presupuesto aprobado de 30.000 €." },
  { key: "carnicas-sierra-norte", originator: "bufete-alameda", shows: "Valoración y fiscal ante la entrada de un socio", rawContent: "Mi cliente Cárnicas Sierra Norte, empresa familiar de 60 empleados, prepara la entrada de un socio industrial. El propietario quiere una valoración independiente y planificación fiscal antes de septiembre. Presupuesto conjunto de unos 40.000 €." },
  { key: "distribuciones-guadaira-flota", originator: "securenet", shows: "Seguros de flota y selección; financiación sin titular (plaza vacante)", rawContent: "Mi cliente Distribuciones Guadaíra renueva su flota de 25 furgonetas en octubre y contratará 10 conductores más. Decide el gerente, con el que trato cada semana. Presupuesto de seguros por definir." },
  { key: "bodegas-torre-del-rio", originator: "fiscal-triana", shows: "Expansión a Portugal: marca, legal, seguros; logística sin titular", rawContent: "Mi cliente Bodegas Torre del Río, 45 empleados, entra en Portugal el año que viene con una filial en Oporto. Necesitará marca adaptada, contratos y logística de exportación. Presupuesto de marca de 30.000 €. Decide la propietaria, con la que tengo trato directo." },
  { key: "asesoria-segunda-oficina", originator: "prl-andaluza", shows: "Falso positivo: mobiliario por debajo del ticket", rawContent: "Conozco una asesoría de 12 personas que abre una segunda oficina en Sevilla este mes. Quieren mobiliario y algo de obra, presupuesto de unos 20.000 € en total. Decide el gerente." },
  { key: "talleres-utrera-venta", originator: "mobiliario-delta", shows: "Venta de empresa: legal, valoración y fiscal", rawContent: "Mi cliente Talleres Mecánicos Utrera, 70 empleados, quiere vender la empresa a un grupo nacional en los próximos seis meses. Necesita due diligence, valoración y planificación fiscal. Presupuesto aprobado por el propietario, con el que tengo trato directo." },
  { key: "startup-serie-a", originator: "branding-atelier", shows: "Ronda de financiación: pacto de socios y valoración", rawContent: "Conozco una startup tecnológica sevillana de 20 personas que prepara una ronda serie A para el primer trimestre. Su CEO busca despacho para el pacto de socios y una valoración independiente antes de la ronda. Presupuesto aprobado." },
  { key: "aeroestructuras-nave", originator: "valoraciones-ibericas", shows: "Obra grande para la protagonista; varios descartes por ticket", rawContent: "Mi cliente Aeroestructuras del Guadalquivir abre una nueva nave en Dos Hermanas en Q2 con 90 empleados nuevos. Presupuesto de obra aprobado de 900.000 €. Decide el Director de Operaciones, con el que tengo trato directo.", contactName: "Marta Salguero", contactRole: "Directora de Operaciones", legalBasisForContact: "LEGITIMATE_INTEREST" },
  { key: "clinica-nervion-erp", originator: "guadalquivir", shows: "Ciberseguridad exigida por la aseguradora", rawContent: "Mi cliente Clínica Nervión, 40 empleados, implanta un nuevo ERP y su aseguradora le exige una auditoría de ciberseguridad antes de renovar. Presupuesto de 15.000 €. Decide la directora financiera, con la que tengo trato directo." },
  { key: "frio-andaluz-huelva", originator: "talento-sur", shows: "Nueva plataforma logística en Huelva", rawContent: "Mi cliente Frío Andaluz, empresa de logística de 150 empleados, abre una nueva nave logística en Huelva en septiembre. Presupuesto de obra aprobado, cifra no conocida. Decide el Director General, con el que tengo trato directo." },
  { key: "panificadora-sucesion", originator: "securenet", shows: "Sucesión familiar: fiscal, valoración y legal", rawContent: "Mi cliente Panificadora Los Alcores, empresa familiar de 35 empleados, prepara la sucesión a la segunda generación. El propietario quiere ordenar la fiscalidad y valorar la empresa este año. Presupuesto de 25.000 €." },
  { key: "envases-betica-linea", originator: "fiscal-triana", shows: "Nueva línea y 30 contrataciones: selección y PRL", rawContent: "Mi cliente Envases Bética lanza una nueva línea de envase reciclado y contratará 30 personas más en 90 días. Empresa industrial de 110 empleados. Decide el Director de RRHH, con el que tengo trato directo. Presupuesto de selección aprobado." },
  { key: "transportes-campana-flota", originator: "bufete-alameda", shows: "Interesado avisado: renovación de flota", rawContent: "Mi cliente Transportes La Campana renueva su flota de 40 camiones en noviembre. Empresa de transporte de 95 empleados. Decide el gerente; me ha pedido que le presente a alguien que revise sus seguros. Presupuesto aprobado.", contactName: "Julián Roldán", contactRole: "Gerente", legalBasisForContact: "CONSENT", thirdPartyExpectsContact: true },
  { key: "aceites-campina-export", originator: "prl-andaluza", shows: "Exportación a Francia e Italia: fiscal y marca", rawContent: "Mi cliente Aceites Campiña de Marchena exportará a Francia e Italia a partir de enero. 55 empleados. Busca estructura fiscal y adaptación de marca al mercado exterior, presupuesto de 60.000 € en total. Decide el Director General, con el que tengo trato directo." },
  { key: "despacho-incidente", originator: "mobiliario-delta", shows: "Relación indirecta: incidente de seguridad en un despacho", rawContent: "Conozco un despacho de abogados de 30 personas en Sevilla que ha sufrido un incidente de seguridad este mes. Necesitan respuesta y protección inmediata, presupuesto de 12.000 €. Decide el socio director." },
  { key: "hormigones-aljarafe-confidencial", originator: "valoraciones-ibericas", shows: "Confidencial: solo búsqueda interna (Scenario D)", visibility: "COMPANY_ONLY", rawContent: "Nota interna confidencial: mi cliente Hormigones del Aljarafe, 80 empleados, negocia la venta de la empresa a un fondo. Necesitará due diligence legal y planificación fiscal en los próximos seis meses. Confidencial hasta que firme la carta de intenciones." },
  { key: "laboratorios-italica-ampliacion", originator: "guadalquivir", shows: "Ampliación farmacéutica: obra, selección, ciberseguridad y mobiliario", rawContent: "Mi cliente Laboratorios Itálica, farmacéutica de 200 empleados, amplía su planta de Alcalá de Guadaíra con 60 puestos nuevos en el segundo semestre. Presupuesto de obra aprobado de 350.000 €. Decide el Director de Planta, con el que tengo trato directo.", contactName: "Rocío Valverde", contactRole: "Directora de Planta", legalBasisForContact: "LEGITIMATE_INTEREST" },
  { key: "ingenieria-sur-ens", originator: "talento-sur", shows: "Cumplimiento normativo (ENS)", rawContent: "Mi cliente Ingeniería Sur Digital, 60 empleados, debe certificarse en el ENS para seguir trabajando con la administración antes de diciembre. Presupuesto de 20.000 €. Decide el CIO, con el que tengo trato directo." },
  { key: "asegurador-meridional-sede", originator: "branding-atelier", shows: "Sede nueva de 300 empleados: mobiliario integral", rawContent: "Mi cliente Grupo Asegurador Meridional traslada su sede a un edificio nuevo en Sevilla con 300 empleados en Q1. Presupuesto de equipamiento aprobado de 400.000 €. Decide el Director de Compras, con el que tengo trato directo." },
  { key: "autonomo-marca-antivirus", originator: "prl-andaluza", shows: "Referido flojo: la Mesa lo descarta", rawContent: "Conozco a un autónomo que quiere una nueva marca y una auditoría de seguridad para su ordenador, presupuesto de 800 €." },
  { key: "muebles-sevillanos-lisboa", originator: "securenet", shows: "Delegación en Lisboa: fiscal internacional y legal", rawContent: "Mi cliente Muebles Sevillanos del Sur abre delegación en Lisboa en 90 días, 80 empleados. Necesita fiscalidad internacional y contratos en Portugal; presupuesto aprobado. Decide el Director Financiero, con el que tengo trato directo." },
  { key: "metales-alcala-segunda-planta", originator: "fiscal-triana", shows: "Segunda planta y 40 operarios: obra y mobiliario", rawContent: "Mi cliente Metales Alcalá abre una segunda planta en Utrera y contratará 40 operarios antes de junio. 130 empleados. Presupuesto de obra aprobado de 700.000 €. Decide el Director de Operaciones, con el que tengo trato directo." },
  { key: "cooperativa-olivarera-sede", originator: "valoraciones-ibericas", shows: "Sede administrativa nueva sin cifra: varios titulares", rawContent: "Mi cliente Cooperativa Olivarera Campiña abre nueva sede administrativa en Écija en Q3, 70 empleados. Presupuesto aprobado, cifra por cerrar. Decide el gerente, con el que tengo trato directo." },
  { key: "cervezas-guadaira-marca", originator: "guadalquivir", shows: "Nueva dirección y nueva línea: identidad de marca", rawContent: "Mi cliente Cervezas Guadaíra tiene nuevo director general y quiere reconstruir la identidad de marca antes del lanzamiento de su nueva línea en marzo. 55 empleados. Presupuesto de marca de 45.000 €. Decide el nuevo director general, con el que tengo trato directo." },
];

/** Franjas del día en las que un Agente lleva un Indicio a la Mesa (hora de Madrid). */
export const LATIDO_SLOTS_LOCAL = [9, 13, 18] as const;
const TZ = "Europe/Madrid";
const MAX_ADVANCES_PER_RUN = 4;
const HOUR = 3_600_000;

/** Plazos mínimos, en horas, para que una Cesión ficticia dé el siguiente paso. Realistas: nadie decide en un minuto. */
export const LATIDO_DELAYS_H = { ORIGINATOR_PENDING: 1, RECEIVER_PENDING: 2, DIRECTOR_PENDING: 3, APPROVED: 1, INTRO_AUTHORIZED: 1, INTRODUCED: 24, MEETING: 48, COMMERCIAL_OPPORTUNITY: 72, WON: 24 } as const;
type Advanceable = keyof typeof LATIDO_DELAYS_H;

/** Slug de la empresa con la que se enseña la demo. Sus decisiones son siempre de su Timonel. */
export function protagonistSlug(): string {
  return process.env.NS_LATIDO_PROTAGONISTA?.trim() || "hispalis";
}

/** Encendido en la demo; apagado con cuentas reales y en las pruebas, salvo NS_LATIDO=on. NS_LATIDO=off lo apaga siempre. */
export function latidoEnabled(): boolean {
  const v = process.env.NS_LATIDO;
  if (v === "off") return false;
  if (v === "on") return true;
  if (process.env.NODE_ENV === "test") return false;
  return authMode() === "demo";
}

function localParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** Identificador de la franja vigente ("2026-09-16T13") o null antes de la primera franja del día. */
export function currentSlot(now: Date): string | null {
  const { date, hour } = localParts(now);
  const slot = [...LATIDO_SLOTS_LOCAL].reverse().find((h) => hour >= h);
  return slot === undefined ? null : `${date}T${String(slot).padStart(2, "0")}`;
}

export interface LatidoResult {
  enabled: boolean;
  slot: string | null;
  indicio: { key: string; originator: string; referrals: number; discarded: number; queued: boolean } | null;
  advanced: { referralId: string; from: string; to: string; by: string }[];
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h >>> 0);
}

async function primaryMember(db: Db, companyId: string): Promise<typeof schema.members.$inferSelect | undefined> {
  return (await db.query.members.findFirst({ where: and(eq(schema.members.companyId, companyId), eq(schema.members.isPrimary, true)) })) ?? (await db.query.members.findFirst({ where: eq(schema.members.companyId, companyId) }));
}

export async function runLatido(db: Db, opts: { now?: Date; force?: boolean } = {}): Promise<LatidoResult> {
  const now = opts.now ?? new Date();
  const result: LatidoResult = { enabled: latidoEnabled() || Boolean(opts.force), slot: null, indicio: null, advanced: [] };
  if (!result.enabled) return result;

  const seedSlugs = SEED_COMPANIES.map((c) => c.slug);
  const seeded = await db.query.companies.findMany({ where: inArray(schema.companies.slug, seedSlugs) });
  if (seeded.length === 0) return result;
  const chapterId = seeded[0].chapterId;
  const bySlug = new Map(seeded.map((c) => [c.slug, c]));
  const byId = new Map(seeded.map((c) => [c.id, c]));
  const protagonist = protagonistSlug();
  /** Solo se decide por empresas ficticias de la semilla, activas, que no sean la protagonista. */
  const automatable = (companyId: string) => {
    const c = byId.get(companyId);
    return Boolean(c && c.status === "ACTIVE" && c.slug !== protagonist);
  };

  // 0 · La semilla puede haberse creado antes de D-057 (el servidor ya tenía la Sala): garantiza las Directivas ficticias
  //     que la semilla declara, para que una Directiva nunca tenga que revisar su propia excepción.
  for (const seed of SEED_COMPANIES.filter((c) => c.person.isDirector)) {
    const company = bySlug.get(seed.slug);
    if (!company) continue;
    const member = await primaryMember(db, company.id);
    if (member && !member.isDirector) await db.update(schema.members).set({ isDirector: true }).where(eq(schema.members.id, member.id));
  }

  // 1 · Un Indicio por franja
  const slot = opts.force ? `manual:${now.toISOString()}` : currentSlot(now);
  result.slot = slot;
  if (slot) {
    const done = await db.query.auditEvents.findFirst({ where: and(eq(schema.auditEvents.kind, "LATIDO"), eq(schema.auditEvents.subjectId, slot)) });
    if (!done) {
      const previous = await db.query.auditEvents.findMany({ where: eq(schema.auditEvents.kind, "LATIDO"), columns: { id: true } });
      const candidates = LATIDO_INDICIOS.filter((i) => i.originator !== protagonist && automatable(bySlug.get(i.originator)?.id ?? ""));
      if (candidates.length > 0) {
        const indicio = candidates[previous.length % candidates.length];
        const company = bySlug.get(indicio.originator)!;
        const member = await primaryMember(db, company.id);
        const created = await createSignal(db, { companyId: company.id, memberId: member?.id, rawContent: indicio.rawContent, visibility: indicio.visibility ?? "CHAPTER", contactName: indicio.contactName, contactRole: indicio.contactRole, legalBasisForContact: indicio.legalBasisForContact, thirdPartyExpectsContact: indicio.thirdPartyExpectsContact ?? false });
        const published = await publishSignal(db, created.opportunitySignal.id, member?.id, { mode: mesaMode() });
        const queued = "queued" in published;
        result.indicio = { key: indicio.key, originator: company.name, referrals: queued ? 0 : published.referralIds.length, discarded: queued ? 0 : published.discarded.length, queued };
        await audit(db, { chapterId, kind: "LATIDO", actor: { type: "SYSTEM", id: "latido" }, subject: { type: "Latido", id: slot }, policyApplied: "demo.latido", result: `Latido ${slot}: el Agente de ${company.name} llevó a la Mesa el Indicio "${indicio.key}".`, significant: false, companyIds: [] });
      }
    }
  }

  // 2 · Las Cesiones ficticias avanzan con plazos realistas; nunca las de la protagonista ni las de empresas ajenas a la semilla
  const open = await db.query.referrals.findMany({ where: and(eq(schema.referrals.chapterId, chapterId), inArray(schema.referrals.state, Object.keys(LATIDO_DELAYS_H))), orderBy: [desc(schema.referrals.updatedAt)] });
  const due = open
    .map((r) => ({ r, age: (now.getTime() - r.updatedAt.getTime()) / HOUR, state: r.state as Advanceable }))
    .filter(({ age, state }) => age >= LATIDO_DELAYS_H[state])
    .sort((a, b) => b.age - a.age);
  for (const { r, state } of due) {
    if (result.advanced.length >= MAX_ADVANCES_PER_RUN) break;
    const receiverActs = state === "RECEIVER_PENDING" || state === "INTRODUCED" || state === "MEETING" || state === "COMMERCIAL_OPPORTUNITY";
    let actingCompanyId = receiverActs ? r.receiverCompanyId : r.originatorCompanyId;
    let member: { id: string } | undefined;
    if (state === "DIRECTOR_PENDING") {
      // Decide una Directiva ficticia que no sea parte de la Cesión (una Directiva no revisa su propia excepción) ni la protagonista.
      const directors = await db.query.members.findMany({ where: and(eq(schema.members.chapterId, chapterId), eq(schema.members.isDirector, true)) });
      const director = directors.find((d) => d.companyId !== r.originatorCompanyId && d.companyId !== r.receiverCompanyId && automatable(d.companyId));
      if (!director) continue; // espera a una Directiva de verdad
      actingCompanyId = director.companyId;
      member = director;
    } else {
      if (!automatable(actingCompanyId)) continue;
      member = await primaryMember(db, actingCompanyId);
    }
    if (!member) continue;
    const h = hash(r.id);
    const by = byId.get(actingCompanyId)!.name;
    try {
      switch (state) {
        case "DIRECTOR_PENDING": {
          await decide(db, { referralId: r.id, memberId: member.id, decision: "APPROVE" });
          result.advanced.push({ referralId: r.id, from: state, to: "APPROVED", by });
          break;
        }
        case "ORIGINATOR_PENDING": {
          await decide(db, { referralId: r.id, memberId: member.id, decision: "APPROVE" });
          result.advanced.push({ referralId: r.id, from: state, to: "RECEIVER_PENDING", by });
          break;
        }
        case "RECEIVER_PENDING": {
          if (h % 6 === 0) {
            await decide(db, { referralId: r.id, memberId: member.id, decision: "REJECT", notes: "Ahora mismo no tenemos capacidad para este perfil; gracias por pensar en nosotros." });
            result.advanced.push({ referralId: r.id, from: state, to: "REJECTED_BY_MEMBER", by });
          } else {
            const adjust = h % 3 === 0 && r.valuePotentialMax ? { estimated_value_max: Math.round((r.valuePotentialMax * 0.8) / 1000) * 1000, note: "Ajuste por el alcance que vemos viable." } : undefined;
            await decide(db, { referralId: r.id, memberId: member.id, decision: "APPROVE", promiseAdjustment: adjust });
            result.advanced.push({ referralId: r.id, from: state, to: "APPROVED", by });
          }
          break;
        }
        case "APPROVED": {
          const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, r.opportunitySignalId) });
          const hasContact = Boolean((os?.envelope as SignalEnvelope | undefined)?.identity_layer?.contact_person);
          await authorizeIntro(db, r.id, member.id, hasContact ? "COMPANY_AND_CONTACT" : "COMPANY_ONLY");
          result.advanced.push({ referralId: r.id, from: state, to: "INTRO_AUTHORIZED", by });
          break;
        }
        case "INTRO_AUTHORIZED": {
          const intro = await db.query.introductions.findFirst({ where: eq(schema.introductions.referralId, r.id) });
          await markIntroduced(db, r.id, member.id, intro?.preparedByAgent.message ?? "Os presento; hablad directamente.");
          result.advanced.push({ referralId: r.id, from: state, to: "INTRODUCED", by });
          break;
        }
        case "INTRODUCED": {
          await updateStage(db, r.id, member.id, "MEETING");
          result.advanced.push({ referralId: r.id, from: state, to: "MEETING", by });
          break;
        }
        case "MEETING": {
          if (h % 5 === 0) {
            await submitVerdict(db, { referralId: r.id, memberId: member.id, verdict: { ease: 3 + (h % 2), business: 1, treatment: 4, result: "LOST", need_was_real: true, notes: "Eligieron a un proveedor con el que ya trabajaban." } });
            result.advanced.push({ referralId: r.id, from: state, to: "LOST", by });
          } else {
            await updateStage(db, r.id, member.id, "COMMERCIAL_OPPORTUNITY");
            result.advanced.push({ referralId: r.id, from: state, to: "COMMERCIAL_OPPORTUNITY", by });
          }
          break;
        }
        case "COMMERCIAL_OPPORTUNITY": {
          if (h % 4 === 0) {
            await submitVerdict(db, { referralId: r.id, memberId: member.id, verdict: { ease: 4, business: 2, treatment: 4, result: "NO_DECISION", need_was_real: true, notes: "Aplazan la decisión al próximo ejercicio." } });
            result.advanced.push({ referralId: r.id, from: state, to: "NO_DECISION", by });
          } else {
            const min = r.valuePotentialMin ?? 0;
            const max = r.valuePotentialMax ?? 0;
            const value = max > min ? Math.round((min + ((max - min) * ((h % 70) + 15)) / 100) / 500) * 500 : Math.max(min, 5_000);
            const axes: VerdictAxis[] = ["TRATO", "FACILIDAD", "NEGOCIO"];
            const verdict = { ease: 4 + (h % 2), business: 4 + ((h >> 3) % 2), treatment: 5, result: "WON" as const, value_verified: value, need_was_real: true };
            try {
              await submitVerdict(db, { referralId: r.id, memberId: member.id, verdict, recognition: h % 3 === 0 ? { axis: axes[(h >> 5) % 3], reason: "Referido bien preparado y trato impecable con el Interesado." } : undefined });
            } catch {
              // Distinción ya otorgada este mes (máx. una por titular y mes, D-020): se emite el Veredicto sin ella.
              await submitVerdict(db, { referralId: r.id, memberId: member.id, verdict });
            }
            result.advanced.push({ referralId: r.id, from: state, to: "WON", by });
          }
          break;
        }
        case "WON": {
          await confirmValue(db, r.id, member.id);
          result.advanced.push({ referralId: r.id, from: state, to: "VALUE_CONFIRMED", by });
          break;
        }
      }
    } catch (e) {
      // Un paso que no procede (p. ej. una transición ya hecha por una persona) no detiene el Latido.
      await audit(db, { chapterId, kind: "LATIDO_SKIPPED", actor: { type: "SYSTEM", id: "latido" }, subject: { type: "Referral", id: r.id }, policyApplied: "demo.latido", result: `Latido: no se avanzó la Cesión (${state}): ${e instanceof Error ? e.message : String(e)}`, significant: false, companyIds: [r.originatorCompanyId, r.receiverCompanyId] });
    }
  }
  return result;
}

/** Última franja latida y siguiente prevista, para la tarjeta de Hoy. */
export async function latidoStatus(db: Db, now = new Date()) {
  const last = await db.query.auditEvents.findFirst({ where: eq(schema.auditEvents.kind, "LATIDO"), orderBy: [desc(schema.auditEvents.occurredAt)] });
  const { hour } = localParts(now);
  const next = LATIDO_SLOTS_LOCAL.find((h) => h > hour) ?? LATIDO_SLOTS_LOCAL[0];
  const protagonist = SEED_COMPANIES.find((c) => c.slug === protagonistSlug());
  return { enabled: latidoEnabled(), lastAt: last?.occurredAt ?? null, nextLocalHour: next, protagonistName: protagonist?.name ?? protagonistSlug(), protagonistPerson: protagonist?.person.fullName ?? null };
}
