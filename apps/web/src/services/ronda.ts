/**
 * Ronda (D-036): la pasada de cada mañana de los Agentes, para todas las Salas.
 *
 *  1. Reloj de la Sala (D-030): recordatorios, caducidades, respuestas tardías y check-ins.
 *  2. Rastreo (D-031): cada Agente de empresa prospecta las fuentes públicas de su zona y después sus
 *     fuentes propias (D-038), las que su Timonel le ha añadido. Los registros públicos
 *     nuevos se reparten: empieza el Agente que menos ha rastreado, para que los Indicios en borrador
 *     no caigan siempre en el mismo Timonel.
 *  3. Un evento RONDA por Sala en la Mesa Permanente, con el resumen, para que se vea que la red trabajó.
 *
 * Idempotente: el Reloj marca cada acción y el Rastreo deduplica por referencia externa. Se puede lanzar
 * varias veces al día sin efectos dobles; solo la primera pasada de la mañana produce trabajo.
 */
import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { audit } from "@/lib/audit";
import { runClock, type ClockResult } from "@/services/clock";
import { runRastreo, SampleFeed, type PublicFeed } from "@/agents/rastreo";
import { runOwnSources } from "@/services/sources";
import { fetchText as defaultFetch, type FetchText } from "@/agents/feeds";

export interface RondaChapterResult {
  chapterId: string;
  chapterName: string;
  clock: ClockResult;
  rastreo: { agents: number; drafts: number; skipped: number };
  ownSources: { sources: number; drafts: number; errors: number };
}

export interface RondaResult {
  ranAt: string;
  chapters: RondaChapterResult[];
}

export async function runRonda(db: Db, now = new Date(), feed: PublicFeed = new SampleFeed(), reader: FetchText = defaultFetch): Promise<RondaResult> {
  const chapters = await db.query.chapters.findMany();
  const out: RondaResult = { ranAt: now.toISOString(), chapters: [] };

  for (const chapter of chapters) {
    const clock = await runClock(db, now, chapter.id);

    const companies = await db.query.companies.findMany({ where: and(eq(schema.companies.chapterId, chapter.id), eq(schema.companies.status, "ACTIVE")) });
    const records = await db.query.publicRecords.findMany({ where: eq(schema.publicRecords.chapterId, chapter.id), columns: { ingestedByCompanyId: true } });
    const ingestedBy = new Map<string, number>();
    for (const r of records) if (r.ingestedByCompanyId) ingestedBy.set(r.ingestedByCompanyId, (ingestedBy.get(r.ingestedByCompanyId) ?? 0) + 1);
    const ordered = [...companies].sort((a, b) => (ingestedBy.get(a.id) ?? 0) - (ingestedBy.get(b.id) ?? 0) || a.name.localeCompare(b.name));

    const rastreo = { agents: 0, drafts: 0, skipped: 0 };
    const ownSources = { sources: 0, drafts: 0, errors: 0 };
    for (const c of ordered) {
      const agent = await db.query.agents.findFirst({ where: and(eq(schema.agents.companyId, c.id), eq(schema.agents.kind, "COMPANY")) });
      if (!agent) continue;
      const r = await runRastreo(db, c.id, feed);
      rastreo.agents++;
      rastreo.drafts += r.ingested.length;
      rastreo.skipped += r.skipped;
      const o = await runOwnSources(db, c.id, reader);
      ownSources.sources += o.sources;
      ownSources.drafts += o.drafts;
      ownSources.errors += o.errors;
    }

    const worked = clock.reminders + clock.expired + clock.late + clock.nudges + clock.compromiso.evaluated + rastreo.drafts + ownSources.drafts > 0;
    if (worked) {
      const parts = [
        clock.reminders ? `${clock.reminders} recordatorio(s)` : null,
        clock.expired ? `${clock.expired} Cesión(es) caducada(s)` : null,
        clock.late ? `${clock.late} respuesta(s) tardía(s)` : null,
        clock.nudges ? `${clock.nudges} check-in(s)` : null,
        clock.compromiso.evaluated ? `Compromiso de la semana evaluado a ${clock.compromiso.evaluated} titular(es): ${clock.compromiso.met} cumplen${clock.compromiso.notices ? `, ${clock.compromiso.notices} aviso(s)` : ""}${clock.compromiso.releases ? `, ${clock.compromiso.releases} baja(s) notificada(s)` : ""}` : null,
        rastreo.drafts ? `${rastreo.drafts} Indicio(s) en borrador desde fuentes públicas` : null,
        ownSources.drafts ? `${ownSources.drafts} Indicio(s) en borrador desde fuentes propias de los Agentes` : null,
      ].filter(Boolean);
      await audit(db, { chapterId: chapter.id, kind: "RONDA", actor: { type: "AGENT", id: "ronda" }, subject: { type: "Chapter", id: chapter.id }, policyApplied: "ronda.daily", result: `Ronda de la mañana con ${rastreo.agents} Agentes en la Mesa: ${parts.join(", ")}.`, significant: true });
    }
    out.chapters.push({ chapterId: chapter.id, chapterName: chapter.name, clock, rastreo, ownSources });
  }
  return out;
}
