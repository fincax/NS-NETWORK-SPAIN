import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { requireMember } from "@/lib/session";
import { eur, eurRange, dateTime, daysUntil, firstName } from "@/lib/format";
import { Encaje, StateBadge } from "@/components/ui";
import { PROMISE_LABEL } from "@/core/merit";
import { MAX_INFO_ROUNDS, STATE_LABEL, TIMEOUTS } from "@/core/state-machine";
import type { QualificationTurn, ReferralState, SignalEnvelope } from "@/core/types";
import { infoRound, type InfoRound } from "@/services/referrals";
import { aperturaAction, confirmValueAction, decideAction, puenteAction, stageAction, verdictAction } from "./actions";

export default async function CesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member, company } = await requireMember();
  const db = await getDb();
  const ref = await db.query.referrals.findFirst({ where: eq(schema.referrals.id, id) });
  if (!ref) notFound();
  const iAmOriginator = ref.originatorCompanyId === company.id;
  const iAmReceiver = ref.receiverCompanyId === company.id;
  if (!iAmOriginator && !iAmReceiver && !member.isDirector) notFound();

  const match = await db.query.matchCandidates.findFirst({ where: eq(schema.matchCandidates.id, ref.matchId) });
  const os = await db.query.opportunitySignals.findFirst({ where: eq(schema.opportunitySignals.id, ref.opportunitySignalId) });
  const need = await db.query.needs.findFirst({ where: eq(schema.needs.id, ref.needId) });
  const originator = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.originatorCompanyId) });
  const receiver = await db.query.companies.findFirst({ where: eq(schema.companies.id, ref.receiverCompanyId) });
  const originatorPerson = await db.query.members.findFirst({ where: and(eq(schema.members.companyId, ref.originatorCompanyId), eq(schema.members.isPrimary, true)) });
  const receiverPerson = await db.query.members.findFirst({ where: and(eq(schema.members.companyId, ref.receiverCompanyId), eq(schema.members.isPrimary, true)) });
  const intro = await db.query.introductions.findFirst({ where: eq(schema.introductions.referralId, ref.id) });
  const verdict = await db.query.verdicts.findFirst({ where: eq(schema.verdicts.referralId, ref.id) });
  const transitions = await db.query.referralTransitions.findMany({ where: eq(schema.referralTransitions.referralId, ref.id) });
  const recognitionsFrom = await db.query.recognitions.findMany({ where: eq(schema.recognitions.fromCompanyId, ref.receiverCompanyId) });
  const originatorTrust = await db.query.trustEvents.findMany({ where: eq(schema.trustEvents.companyId, ref.originatorCompanyId) });
  const originatorDistinctions = await db.query.recognitions.findMany({ where: eq(schema.recognitions.toCompanyId, ref.originatorCompanyId) });
  if (!match || !os || !need || !originator || !receiver) notFound();

  const env = os.envelope as SignalEnvelope;
  const state = ref.state as ReferralState;
  const promise = ref.promise;
  const layer2Open = ["INTRO_AUTHORIZED", "INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY", "WON", "LOST", "NO_DECISION", "VALUE_CONFIRMED"].includes(state);
  const canSeeIdentity = iAmOriginator || (iAmReceiver && layer2Open);
  const blockedContact = match.compliance?.blocked_fields.includes("identity_layer.contact_person") ?? false;
  const showContact = canSeeIdentity && (iAmOriginator || ref.revealScope === "COMPANY_AND_CONTACT");
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const recognitionUsed = recognitionsFrom.some((r) => r.createdAt >= monthStart);
  const merit = originatorTrust.reduce((a, t) => a + t.weight, 0);

  const info = await infoRound(db, ref);
  const receiverFirst = receiverPerson ? firstName(receiverPerson.fullName) : receiver.name;
  const originatorFirst = originatorPerson ? firstName(originatorPerson.fullName) : originator.name;

  const face: "A" | "B" | "B0" | "PREGUNTA" | "SEGUIMIENTO" | "VEREDICTO" | "LECTURA" =
    iAmReceiver && state === "RECEIVER_PENDING" ? "A"
    : iAmOriginator && state === "ORIGINATOR_PENDING" && info.pending ? "PREGUNTA"
    : iAmOriginator && state === "ORIGINATOR_PENDING" ? "B0"
    : iAmOriginator && ["APPROVED", "INTRO_AUTHORIZED"].includes(state) ? "B"
    : iAmReceiver && ["INTRODUCED", "MEETING", "COMMERCIAL_OPPORTUNITY"].includes(state) && !verdict ? "SEGUIMIENTO"
    : iAmReceiver && ["WON", "LOST", "NO_DECISION"].includes(state) && !verdict ? "VEREDICTO"
    : "LECTURA";

  const expires = daysUntil(ref.expiresAt);

  return (
    <div className="referral">
      <div className="head">
        <div className="row">
          <StateBadge state={state} />
          {match.compliance ? <span className={`badge ${match.compliance.verdict === "PASS" ? "green" : match.compliance.verdict === "BLOCK" ? "red" : "amber"}`}>Salvoconducto · {match.compliance.verdict === "PASS" ? "sin excepciones" : match.compliance.verdict === "BLOCK" ? "bloqueado" : match.compliance.exceptions.join(", ")}</span> : null}
          {ref.embassy ? <span className="badge blue">Embajada</span> : null}
          {env.chapter_layer.third_party_expects_contact ? <span className="badge green">Interesado avisado</span> : null}
          <span className="spacer" />
          {expires !== null && ["ORIGINATOR_PENDING", "RECEIVER_PENDING"].includes(state) ? <span className="mono">caduca en {expires} días</span> : null}
        </div>
        <p className="eyebrow">{iAmReceiver ? "Cesión que recibes" : iAmOriginator ? "Cesión que cedes" : "Cesión de la Sala"} · {need.description}</p>
        <div className="title">
          <Encaje total={match.score.total} band={match.score.band} />
          <h1 style={{ fontSize: 26 }}>{env.chapter_layer.need_summary.split("·")[0].trim()}</h1>
        </div>
        <div className="row" style={{ color: "var(--muted-2)" }}>
          <span>Cedente: <strong style={{ color: "var(--porcelain)" }}>{originator.name}</strong> · {originatorPerson?.fullName}</span>
          <span>→</span>
          <span>Cesionario: <strong style={{ color: "var(--porcelain)" }}>{receiver.name}</strong> · {receiverPerson?.fullName}</span>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Promesa (D-021): pieza central de ambas caras */}
        <section className="card amber promise">
          <p className="eyebrow">Promesa</p>
          <div className="row" style={{ alignItems: "baseline" }}>
            <span className="money" style={{ fontSize: 28 }}>{eurRange(promise?.estimated_value_min, promise?.estimated_value_max)}</span>
            <span className="mono">valor a priori · Mérito de Promesa {promise?.merit_promise ?? "—"}{promise?.adjusted_by_receiver ? " · ajustada por el cesionario" : ""}</span>
          </div>
          <div className="components">
            {promise?.components.map((c) => (
              <span key={c.key} className="comp" title={c.detail}><span className={`dot ${c.status === "GREEN" ? "green" : c.status === "AMBER" ? "amber" : "red"}`} />{PROMISE_LABEL[c.key]}</span>
            ))}
          </div>
          <p className="lead" style={{ fontSize: 13 }}>Trigger: {env.qualification_layer?.triggers.join(", ") || "sin declarar"} · Plazo: {env.chapter_layer.timing} · Relación del cedente: {env.chapter_layer.relationship_strength.toLowerCase()}</p>
        </section>

        {/* Por qué encaja (WHY · EVIDENCE · CONFIDENCE · UNKNOWN · NEXT ACTION) */}
        <section className="card">
          <p className="eyebrow">Por qué encaja · confianza {match.explanation.confidence.toLowerCase()}</p>
          <ul className="why">{match.explanation.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          {match.explanation.unknowns.length ? (<><p className="eyebrow" style={{ marginTop: 14 }}>Pendiente</p><ul className="why pending">{match.explanation.unknowns.map((u, i) => <li key={i}>{u}</li>)}</ul></>) : null}
          {match.explanation.negatives.length ? (<><p className="eyebrow" style={{ marginTop: 14 }}>En contra</p><ul className="why neg">{match.explanation.negatives.map((u, i) => <li key={i}>{u}</li>)}</ul></>) : null}
          <p className="mono" style={{ marginTop: 14 }}>Siguiente paso: {nextStep(state, { iAmOriginator, iAmReceiver, info, suggested: match.explanation.next_action, receiverFirst, originatorFirst })}</p>
        </section>
      </div>

      <div className="grid grid-2">
        {/* Capa 0/1 · contexto del Interesado */}
        <section className="card">
          <p className="eyebrow">Interesado · {layer2Open || iAmOriginator ? "capa 2 abierta" : "capa 1"}</p>
          <div className="layer2">
            {canSeeIdentity && env.identity_layer ? (
              <>
                <p><strong>{env.identity_layer.third_party_company.name}</strong></p>
                {env.identity_layer.contact_person ? (
                  showContact && !blockedContact ? (
                    <p>{env.identity_layer.contact_person.name}{env.identity_layer.contact_person.role ? ` · ${env.identity_layer.contact_person.role}` : ""} <span className="mono">· base jurídica {env.identity_layer.contact_person.legal_basis}</span></p>
                  ) : (
                    <p className="locked">Persona de contacto: {blockedContact ? "bloqueada por Compliance (sin base jurídica)" : "solo con Apertura de empresa y contacto"}</p>
                  )
                ) : null}
              </>
            ) : (
              <p className="locked">Identidad del Interesado restringida hasta la Apertura del cedente.</p>
            )}
            <p style={{ marginTop: 6 }}>{env.qualification_layer?.detailed_context}</p>
            <p className="mono">{env.chapter_layer.industry} · {env.chapter_layer.company_size_band} empleados · {env.chapter_layer.geography.city ?? env.chapter_layer.geography.region}</p>
            {iAmOriginator && env.private_layer ? <p className="locked">Notas privadas y material de origen: COMPANY_ONLY. Tu Agente las usa; nunca las comparte.</p> : null}
          </div>
        </section>

        {/* Cualificación agente-a-agente */}
        <section className="card">
          <p className="eyebrow">Lo que averiguaron los Agentes</p>
          <QualificationList qualificationId={match.qualificationId} />
          <p className="mono" style={{ marginTop: 12 }}>Hoja de Méritos de {originator.name}: Mérito {merit} · {originatorDistinctions.length} Distinciones</p>
        </section>
      </div>

      {/* ───────── Cara A · el cesionario acepta ───────── */}
      {face === "A" ? (
        <section className="card amber">
          <h2>Tu decisión</h2>
          {info.answered.length ? (
            <div className="stack" style={{ gap: 8, marginBottom: 14 }} aria-label="Respuestas del cedente">
              {info.answered.map((t, i) => (
                <div key={i} className="notice">
                  <p className="mono">Preguntaste: {t.question}</p>
                  <p><strong>{originatorFirst} responde:</strong> {t.answer}</p>
                </div>
              ))}
            </div>
          ) : null}
          <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Al aceptar te comprometes a responder al Interesado en {TIMEOUTS.responseAfterIntroHours} h tras el Puente y a emitir Veredicto al cerrar. Puedes confirmar la Promesa tal cual o ajustarla; tu Agente registrará la diferencia.</p>
          <form action={decideAction} className="stack">
            <input type="hidden" name="referralId" value={ref.id} />
            <div className="form-grid">
              <div className="field"><label htmlFor="pmin">Ajustar valor mínimo (opcional)</label><input id="pmin" name="promise_min" type="number" min={0} step={1000} placeholder={String(promise?.estimated_value_min ?? "")} /></div>
              <div className="field"><label htmlFor="pmax">Ajustar valor máximo (opcional)</label><input id="pmax" name="promise_max" type="number" min={0} step={1000} placeholder={String(promise?.estimated_value_max ?? "")} /></div>
            </div>
            <div className="field"><label htmlFor="notes">Motivo o pregunta (obligatorio al declinar o pedir información)</label><textarea id="notes" name="notes" placeholder={info.roundsLeft > 0 ? "Por ejemplo: ¿tiene presupuesto cerrado?; o, al declinar: sin decisor identificado." : "Por ejemplo, al declinar: sin decisor identificado."} /></div>
            <div className="actions">
              <button className="btn amber" name="decision" value="APPROVE" type="submit">Aceptar y confirmar la Promesa</button>
              {info.roundsLeft > 0 ? <button className="btn" name="decision" value="REQUEST_INFO" type="submit">Pedir más información a {originatorFirst}</button> : null}
              <button className="btn danger ghost" name="decision" value="REJECT" type="submit">Declinar con motivo</button>
            </div>
            <p className="mono">{info.roundsLeft === MAX_INFO_ROUNDS ? `Puedes pedir información hasta ${MAX_INFO_ROUNDS} veces; la pregunta va al cedente y vuelve aquí con su respuesta.` : info.roundsLeft > 0 ? `Te queda ${info.roundsLeft} pregunta al cedente.` : `Ya has pedido información ${MAX_INFO_ROUNDS} veces: acepta o declina.`}</p>
          </form>
        </section>
      ) : null}

      {/* ───────── Cara Pregunta · el cedente responde al cesionario (D-058) ───────── */}
      {face === "PREGUNTA" && info.pending ? (
        <section className="card amber">
          <h2>Una pregunta de {receiverPerson?.fullName ?? receiver.name}</h2>
          <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Antes de aceptar, {receiverFirst} quiere saber algo más del Interesado. Tu respuesta se añade a lo que averiguaron los Agentes y la Cesión vuelve a su mesa. Ronda {info.roundsUsed} de {MAX_INFO_ROUNDS}.</p>
          <div className="notice" style={{ marginBottom: 12 }}><strong>{receiverFirst} pregunta:</strong> {info.pending.question}</div>
          <form action={decideAction} className="stack">
            <input type="hidden" name="referralId" value={ref.id} />
            <div className="field">
              <label htmlFor="answer">Tu respuesta{info.pending.draft_answer ? " · tu Agente propone un borrador a partir del Indicio; corrígelo si hace falta" : ""}</label>
              <textarea id="answer" name="notes" required defaultValue={info.pending.draft_answer ?? ""} placeholder="Solo lo que puedas compartir. La identidad del Interesado sigue reservada hasta la Apertura." />
            </div>
            <div className="actions">
              <button className="btn amber" name="decision" value="ANSWER" type="submit">Enviar la respuesta a {receiver.name}</button>
              <button className="btn danger ghost" name="decision" value="REJECT" type="submit">No ceder</button>
            </div>
          </form>
        </section>
      ) : null}

      {/* ───────── Cara B0 · el cedente da el primer visto bueno ───────── */}
      {face === "B0" ? (
        <section className="card amber">
          <h2>Tu visto bueno</h2>
          <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Tu Agente propone ceder este Interesado a {receiver.name}. Si das el visto bueno, {receiverPerson?.fullName} verá la capa 1 (contexto sin identidad) y decidirá. La identidad solo se abre cuando tú autorices la Apertura.</p>
          <form action={decideAction} className="stack">
            <input type="hidden" name="referralId" value={ref.id} />
            <div className="field"><label htmlFor="notes0">Nota para tu Agente (opcional)</label><textarea id="notes0" name="notes" placeholder="Nunca una contraprestación: es motivo de expulsión." /></div>
            <div className="actions">
              <button className="btn amber" name="decision" value="APPROVE" type="submit">Proponer la Cesión a {receiver.name}</button>
              <button className="btn danger ghost" name="decision" value="REJECT" type="submit">No ceder</button>
            </div>
          </form>
        </section>
      ) : null}

      {/* ───────── Cara B · el cedente autoriza la Apertura y tiende el Puente ───────── */}
      {face === "B" && state === "APPROVED" ? (
        <section className="card amber">
          <h2>Apertura</h2>
          <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>{receiverPerson?.fullName} ({receiver.name}) ha aceptado y confirmado la Promesa. Ya has ganado {promise?.merit_promise} de Mérito de Promesa. Decide qué revela tu Agente.</p>
          <form action={aperturaAction} className="stack">
            <input type="hidden" name="referralId" value={ref.id} />
            <div className="radio-row">
              <label><input type="radio" name="reveal_scope" value="COMPANY_ONLY" defaultChecked /> Solo la empresa</label>
              <label><input type="radio" name="reveal_scope" value="COMPANY_AND_CONTACT" disabled={blockedContact || !env.identity_layer?.contact_person} /> Empresa y persona de contacto{blockedContact ? " (bloqueado: sin base jurídica)" : ""}</label>
            </div>
            <div className="actions"><button className="btn amber" type="submit">Autorizar la Apertura y redactar el Puente</button></div>
          </form>
        </section>
      ) : null}
      {face === "B" && state === "INTRO_AUTHORIZED" && intro ? (
        <section className="card green">
          <h2>El Puente</h2>
          <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Lo ha redactado tu Agente. Lo envías tú, como Timonel, desde tu correo o desde NS. Ningún Agente contacta con el Interesado.</p>
          <form action={puenteAction} className="stack">
            <input type="hidden" name="referralId" value={ref.id} />
            <div className="field"><label>Asunto</label><input readOnly value={intro.preparedByAgent.subject} /></div>
            <div className="field"><label htmlFor="msg">Mensaje (edítalo si quieres)</label><textarea id="msg" name="message" defaultValue={intro.preparedByAgent.message} style={{ minHeight: 170 }} /></div>
            <div className="radio-row">
              <label><input type="radio" name="channel" value="EMAIL_BY_MEMBER" defaultChecked /> Desde mi correo</label>
              <label><input type="radio" name="channel" value="NS_MESSAGE" /> Desde NS</label>
              <label><input type="radio" name="channel" value="MEETING" /> En persona</label>
            </div>
            <div className="actions"><button className="btn primary" type="submit">Marcar el Puente como tendido</button></div>
          </form>
        </section>
      ) : null}

      {/* ───────── Seguimiento del cesionario ───────── */}
      {face === "SEGUIMIENTO" ? (
        <section className="card">
          <h2>Seguimiento</h2>
          <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Tu Agente te preguntará cada {TIMEOUTS.checkInDays} días. Actualiza el hito o cierra la Cesión para emitir el Veredicto.</p>
          <form action={stageAction} className="stack">
            <input type="hidden" name="referralId" value={ref.id} />
            <div className="actions">
              {state === "INTRODUCED" ? <button className="btn" name="stage" value="MEETING" type="submit">Reunión celebrada</button> : null}
              {["INTRODUCED", "MEETING"].includes(state) ? <button className="btn" name="stage" value="COMMERCIAL_OPPORTUNITY" type="submit">Propuesta en curso</button> : null}
              <button className="btn green" name="stage" value="WON" type="submit" style={{ borderColor: "var(--green)" }}>Cierre ganado</button>
              <button className="btn ghost" name="stage" value="LOST" type="submit">Perdida</button>
              <button className="btn ghost" name="stage" value="NO_DECISION" type="submit">Sin decisión</button>
            </div>
          </form>
        </section>
      ) : null}

      {/* ───────── Veredicto (D-020) y Distinción ───────── */}
      {face === "VEREDICTO" ? (
        <section className="card amber">
          <h2>Veredicto</h2>
          <p className="lead" style={{ fontSize: 14, marginBottom: 12 }}>Tres ejes, tres toques. Tu Agente ya ha rellenado la evidencia. Al confirmar, {originator.name} recibe Mérito de Veredicto y de Cierre.</p>
          <form action={verdictAction} className="stack">
            <input type="hidden" name="referralId" value={ref.id} />
            <input type="hidden" name="result" value={state} />
            <div className="form-grid">
              <Scale name="ease" label="Facilidad · ¿fue fácil prestar el servicio?" />
              <Scale name="business" label="Negocio · ¿cuánto negocio generó?" />
              <Scale name="treatment" label="Trato · ¿cómo fue el trato de las personas?" />
            </div>
            <div className="form-grid">
              {state === "WON" ? <div className="field"><label htmlFor="vv">Valor del cierre (€)</label><input id="vv" name="value_verified" type="number" min={0} step={500} required /><span className="hint">El cedente lo confirmará: solo el valor contrastado por ambos entra en el Libro de Valor.</span></div> : null}
              <div className="field"><label htmlFor="nwr">¿El Interesado tenía la necesidad?</label><select id="nwr" name="need_was_real" defaultValue="yes"><option value="yes">Sí, era real</option><option value="no">No: el Indicio era falso (retira el Mérito de Promesa)</option></select></div>
            </div>
            <fieldset>
              <legend>Distinción (opcional · una por mes)</legend>
              {recognitionUsed ? <p className="mono">Ya has otorgado tu Distinción de este mes.</p> : (
                <div className="form-grid">
                  <div className="field"><label htmlFor="rax">Eje que destacó</label><select id="rax" name="recognition_axis" defaultValue=""><option value="">Sin Distinción</option><option value="FACILIDAD">Facilidad</option><option value="NEGOCIO">Negocio</option><option value="TRATO">Trato</option></select></div>
                  <div className="field"><label htmlFor="rre">Motivo (una línea, se publica en la Crónica)</label><input id="rre" name="recognition_reason" maxLength={140} /></div>
                </div>
              )}
            </fieldset>
            <div className="field"><label htmlFor="vnotes">Notas para el Contraste (opcional)</label><textarea id="vnotes" name="notes" /></div>
            <div className="actions"><button className="btn amber" type="submit">Confirmar el Veredicto</button></div>
          </form>
        </section>
      ) : null}

      {/* ───────── Lectura: qué pasó y qué toca ───────── */}
      {verdict ? (
        <section className="card green">
          <h2>Veredicto emitido</h2>
          <p>Facilidad {verdict.verdict.ease}/5 · Negocio {verdict.verdict.business}/5 · Trato {verdict.verdict.treatment}/5 · {STATE_LABEL[verdict.verdict.result as ReferralState]}{verdict.verdict.value_verified ? ` · ${eur(verdict.verdict.value_verified)}` : ""}</p>
          <p className="mono" style={{ marginTop: 6 }}>Mérito para el cedente {verdict.meritOriginator} · para el cesionario {verdict.meritReceiver} · Contraste {verdict.contrastStatus}</p>
          {iAmOriginator && state === "WON" ? (
            <form action={confirmValueAction} style={{ marginTop: 12 }}><input type="hidden" name="referralId" value={ref.id} /><button className="btn primary" type="submit">Confirmar {eur(ref.valueVerified)} como valor contrastado</button></form>
          ) : null}
        </section>
      ) : null}
      {face === "LECTURA" && !verdict ? (
        <div className="notice">{waitingText(state, iAmOriginator, iAmReceiver, receiver.name, originator.name, info)}</div>
      ) : null}

      <section className="section">
        <p className="eyebrow">Trazabilidad</p>
        <ol className="timeline">
          {transitions.map((t) => (
            <li key={t.id}><span className="t">{dateTime(t.occurredAt)}</span><span className="mark"><span className="dot" /></span><div><span className="kind">{t.actorType} · {t.actorId.slice(0, 8)}</span><p className="txt">{STATE_LABEL[t.fromState as ReferralState]} → {STATE_LABEL[t.toState as ReferralState]}{t.reason ? ` · ${t.reason}` : ""}</p></div></li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Scale({ name, label }: { name: string; label: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="scale" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((v) => (
          <label key={v}><input type="radio" name={name} value={v} required defaultChecked={v === 4} />{v}</label>
        ))}
      </div>
    </div>
  );
}

async function QualificationList({ qualificationId }: { qualificationId: string | null }) {
  if (!qualificationId) return <p className="mono">Sin cualificación.</p>;
  const db = await getDb();
  const q = await db.query.qualifications.findFirst({ where: eq(schema.qualifications.id, qualificationId) });
  if (!q) return null;
  const label: Record<string, string> = { BUDGET: "Presupuesto", TIMING: "Plazo", DECISION_MAKER: "Decisor", SCOPE: "Alcance", CONSTRAINT: "Condicionantes", FREE: "Pregunta" };
  return (
    <ul className="plain">
      {q.turns.map((t: QualificationTurn, i: number) => (
        <li key={i}>
          {t.asked_by === "RECEIVER" ? (
            <span><span className="mono">Pregunta del cesionario</span> · {t.question} {t.answered_by ? <>· <strong>respondió el cedente:</strong> {t.answer}</> : <span style={{ color: "var(--amber)" }}>· esperando al cedente</span>}</span>
          ) : (
            <span><span className="mono">{label[t.kind]}</span> · {t.insufficient ? <span style={{ color: "var(--amber)" }}>sin información suficiente</span> : t.answer}{t.confidence !== undefined && !t.insufficient ? <span className="mono"> · conf {Math.round(t.confidence * 100)} %</span> : null}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Qué toca ahora, según el estado y quién mira. Solo en la revisión del cesionario vale la sugerencia del Fundamento. */
function nextStep(state: ReferralState, o: { iAmOriginator: boolean; iAmReceiver: boolean; info: InfoRound; suggested: string; receiverFirst: string; originatorFirst: string }): string {
  switch (state) {
    case "ORIGINATOR_PENDING":
      if (o.info.pending) return o.iAmOriginator ? `Responder a la pregunta de ${o.receiverFirst}.` : `${o.originatorFirst} está respondiendo a tu pregunta.`;
      return o.iAmOriginator ? "Dar el visto bueno para proponer la Cesión." : `Esperar el visto bueno de ${o.originatorFirst}.`;
    case "RECEIVER_PENDING":
      if (!o.iAmReceiver) return `Esperar a que ${o.receiverFirst} acepte.`;
      return o.info.roundsLeft === 0 && /informaci/i.test(o.suggested) ? "Aceptar la Cesión y confirmar la Promesa, o declinar con motivo." : o.suggested;
    case "DIRECTOR_PENDING": return "Esperar a la Directiva.";
    case "APPROVED": return o.iAmOriginator ? "Autorizar la Apertura y redactar el Puente." : `${o.originatorFirst} decidirá el alcance de la Apertura.`;
    case "INTRO_AUTHORIZED": return o.iAmOriginator ? "Enviar el Puente en persona y marcarlo como tendido." : `${o.originatorFirst} enviará el Puente.`;
    case "INTRODUCED": return o.iAmReceiver ? `Responder al Interesado en ${TIMEOUTS.responseAfterIntroHours} h y anotar el hito.` : `${o.receiverFirst} responderá al Interesado.`;
    case "MEETING": case "COMMERCIAL_OPPORTUNITY": return o.iAmReceiver ? "Actualizar el hito al cerrar." : `${o.receiverFirst} actualiza los hitos.`;
    case "WON": case "LOST": case "NO_DECISION": return o.iAmReceiver ? "Emitir el Veredicto." : `Esperar el Veredicto de ${o.receiverFirst}.`;
    default: return "Nada pendiente.";
  }
}

function waitingText(state: ReferralState, iAmOriginator: boolean, iAmReceiver: boolean, receiverName: string, originatorName: string, info: InfoRound) {
  switch (state) {
    case "ORIGINATOR_PENDING":
      if (info.pending) return iAmReceiver ? `Tu pregunta está en manos de ${originatorName}. Cuando responda, la Cesión vuelve aquí.` : `${originatorName} responde a la pregunta de ${receiverName}.`;
      return iAmReceiver ? `En revisión: esperando el visto bueno de ${originatorName}.` : "Esperando tu visto bueno.";
    case "RECEIVER_PENDING": return iAmOriginator ? `En revisión: esperando a que ${receiverName} acepte.` : "Esperando tu decisión.";
    case "DIRECTOR_PENDING": return "Requiere Directiva: hay una excepción de Compliance que revisar.";
    case "APPROVED": return `Aprobada. ${originatorName} decidirá el alcance de la Apertura.`;
    case "INTRO_AUTHORIZED": return `Puente listo. ${originatorName} lo enviará en persona.`;
    case "INTRODUCED": return "Puente tendido. El cesionario responderá al Interesado en 48 h.";
    case "MEETING": case "COMMERCIAL_OPPORTUNITY": return "En curso. El cesionario actualiza los hitos.";
    case "WON": case "LOST": case "NO_DECISION": return "Cerrada. Pendiente del Veredicto del cesionario.";
    case "VALUE_CONFIRMED": return "Valor contrastado por ambas partes.";
    case "REJECTED_BY_MEMBER": return "Declinada con motivo. No afecta a la reputación de quien declina; el cedente conserva su Mérito de Promesa.";
    case "EXPIRED": return "Caducada por silencio. Vuelve al cedente, que puede proponerla a otra Sala.";
    case "BLOCKED": return "Bloqueada por Compliance.";
    default: return STATE_LABEL[state];
  }
}
