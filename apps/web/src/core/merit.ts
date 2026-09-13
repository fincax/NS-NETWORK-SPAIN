/** Promesa (D-021), Veredicto (D-020) y Mérito en tres momentos. Funciones puras. */
import { VALUE_BAND_RANGE, type ChapterLayer, type NSMatchScore, type QualificationTurn, type ReferralPromise, type ReferralVerdict, type PromiseComponentKey } from "./types";

export const MERIT = {
  promiseBase: 100,
  verdictBase: 100,
  closeBase: 150,
  receiverBase: 40,
  embassyMultiplier: 2.5,
} as const;

/** La Promesa se fija con datos estructurados, no con una opinión. */
export function computePromise(layer0: ChapterLayer, score: NSMatchScore, turns: QualificationTurn[], opts: { embassy?: boolean } = {}): ReferralPromise {
  const range = layer0.value_band ? VALUE_BAND_RANGE[layer0.value_band] : { min: 0, max: 0 };
  const turnOf = (k: QualificationTurn["kind"]) => turns.find((t) => t.kind === k);
  const status = (conf: number | undefined, insufficient?: boolean) => (insufficient || conf === undefined ? "RED" : conf >= 0.75 ? "GREEN" : conf >= 0.5 ? "AMBER" : "RED") as "GREEN" | "AMBER" | "RED";

  const comp: { key: PromiseComponentKey; status: "GREEN" | "AMBER" | "RED"; detail: string }[] = [];
  comp.push({ key: "expects_contact", status: layer0.third_party_expects_contact ? "GREEN" : "AMBER", detail: layer0.third_party_expects_contact ? "El Interesado sabe que le llamarán." : "El Interesado no ha sido avisado todavía." });
  comp.push({ key: "real_need", status: layer0.confidence >= 0.75 ? "GREEN" : layer0.confidence >= 0.5 ? "AMBER" : "RED", detail: `Confianza del Indicio ${(layer0.confidence * 100).toFixed(0)} %.` });
  const answered = turns.filter((t) => !t.insufficient && (t.confidence ?? 0) >= 0.6).length;
  comp.push({ key: "information_complete", status: turns.length === 0 ? "RED" : answered === turns.length ? "GREEN" : answered > 0 ? "AMBER" : "RED", detail: `${answered} de ${turns.length} preguntas respondidas.` });
  const dm = turnOf("DECISION_MAKER");
  comp.push({ key: "decision_maker", status: status(dm?.confidence, dm?.insufficient), detail: dm?.answer ?? "Decisor sin identificar." });
  const tm = turnOf("TIMING");
  comp.push({ key: "timing", status: tm ? status(tm.confidence, tm.insufficient) : layer0.timing === "UNKNOWN" ? "RED" : "AMBER", detail: tm?.answer ?? `Horizonte ${layer0.timing}.` });
  const bd = turnOf("BUDGET");
  comp.push({ key: "budget", status: status(bd?.confidence, bd?.insufficient), detail: bd?.answer ?? "Presupuesto sin confirmar." });

  const points = comp.reduce((a, c) => a + (c.status === "GREEN" ? 1 : c.status === "AMBER" ? 0.5 : 0), 0) / comp.length;
  const rel = { DIRECT: 1, INDIRECT: 0.7, WEAK: 0.4, UNKNOWN: 0.3 }[layer0.relationship_strength];
  const promise_score = Math.min(1, 0.5 * points + 0.3 * score.total + 0.2 * rel);
  const merit_promise = Math.round(MERIT.promiseBase * promise_score * (opts.embassy ? MERIT.embassyMultiplier : 1));
  return { estimated_value_min: range.min, estimated_value_max: range.max, fit: score.total, components: comp, promise_score, merit_promise, adjusted_by_receiver: false };
}

export interface VerdictMerit {
  originator: { verdict: number; close: number; promiseRevoked: boolean };
  receiver: { closedLoop: number };
}

/** Mérito de Veredicto + Mérito de Cierre para el cedente; Mérito de cesionario por cerrar el bucle. */
export function computeVerdictMerit(v: ReferralVerdict, promise: ReferralPromise, opts: { embassy?: boolean } = {}): VerdictMerit {
  const mult = opts.embassy ? MERIT.embassyMultiplier : 1;
  if (!v.need_was_real) {
    return { originator: { verdict: 0, close: 0, promiseRevoked: true }, receiver: { closedLoop: MERIT.receiverBase } };
  }
  const axisMean = (v.ease + v.business + v.treatment) / 15; // 0.2..1
  const verdict = Math.round(MERIT.verdictBase * axisMean * mult);
  let close = 0;
  if (v.result === "WON" && v.value_verified && v.value_verified > 0) {
    const ratio = promise.estimated_value_max > 0 ? Math.min(2, v.value_verified / Math.max(1, (promise.estimated_value_min + promise.estimated_value_max) / 2)) : 1;
    close = Math.round(MERIT.closeBase * Math.max(0.5, ratio) * mult);
  }
  return { originator: { verdict, close, promiseRevoked: false }, receiver: { closedLoop: MERIT.receiverBase } };
}

export const PROMISE_LABEL: Record<PromiseComponentKey, string> = {
  expects_contact: "Interesado avisado",
  real_need: "Necesidad real",
  information_complete: "Información completa",
  decision_maker: "Decisor identificado",
  timing: "Plazo",
  budget: "Presupuesto",
};
