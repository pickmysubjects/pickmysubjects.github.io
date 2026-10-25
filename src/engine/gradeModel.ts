import { bandsBySubject, DEFAULT_GRADE_MODEL, fitOffset, gradeOffsets, MIN_GRADE_SHARES, truncatedMoments, type BandObs, type GradeModel, type GradeOffset, type GradeRow } from './grades'

/**
 * Build-time fitting of the grade model (run by the weekly ratings job, never in the browser):
 * once enough bands are in, the model's own numbers come from them instead of being assumed.
 *
 * - a, beta, sigma: where a subject's mark sits for a given WAM, and how far it strays. beta under 1
 *   is expected, since a WAM without one subject is a noisy stand-in for ability; with beta fixed
 *   at 1, subjects that strong students take look harder than they are.
 * - tau: how much subjects really differ, which sets how far a subject with few shares is pulled
 *   toward the prior (it replaces a fixed shrink count).
 *
 * Below MIN_MODEL_ROWS bands nothing is fitted and DEFAULT_GRADE_MODEL holds, exactly.
 */

/** Bands needed before a, beta and sigma are fitted. */
export const MIN_MODEL_ROWS = 200
/** Subjects with published offsets needed before tau is estimated from them. */
const MIN_TAU_SUBJECTS = 10
/** tau never goes below this: with few subjects its estimate can collapse to 0 and pull everything onto the prior. */
export const MIN_TAU = 1

export interface FittedGrades {
  offsets: Record<string, GradeOffset>
  model: GradeModel
  /** Whether `model` was fitted (false: the defaults, because there were too few bands). */
  fitted: boolean
  rows: number
}

export interface FitOptions {
  /** This year, for the age weights. */
  year?: number
  /** Each subject's prior mean offset (the feature prior); 0 when left out. */
  priorMean?: (code: string) => number
}

/** a, beta and sigma by EM over every band, with each subject's offset refitted between rounds. */
function fitGlobal(groups: [string, BandObs[]][], start: GradeModel, priorMean: (code: string) => number): GradeModel {
  let m = { ...start }
  for (let round = 0; round < 60; round++) {
    // E-step: each band's expected mark (and its variance) given the current model.
    const pts: { x: number; y: number; v: number; d: number; w: number }[] = []
    for (const [code, obs] of groups) {
      const d = fitOffset(obs, m, priorMean(code)).offset
      for (const o of obs) {
        const t = truncatedMoments(m.a + m.beta * (o.wam - 70) + d, m.sigma, o.lo, o.hi)
        pts.push({ x: o.wam - 70, y: t.mean - d, v: t.variance, d, w: o.w })
      }
    }
    // M-step: weighted least squares of the expected mark (less the offset) on the WAM.
    const W = pts.reduce((s, p) => s + p.w, 0)
    const mx = pts.reduce((s, p) => s + p.w * p.x, 0) / W
    const my = pts.reduce((s, p) => s + p.w * p.y, 0) / W
    const sxx = pts.reduce((s, p) => s + p.w * (p.x - mx) ** 2, 0)
    const sxy = pts.reduce((s, p) => s + p.w * (p.x - mx) * (p.y - my), 0)
    // Sanity bounds: a WAM range that barely varies can't pin the slope down.
    const beta = sxx > 0 ? Math.max(0.3, Math.min(1.5, sxy / sxx)) : 1
    const a = my - beta * mx
    const sigma = Math.max(3, Math.min(20, Math.sqrt(pts.reduce((s, p) => s + p.w * (p.v + (p.y - a - beta * p.x) ** 2), 0) / W)))
    const moved = Math.abs(a - m.a) + Math.abs(beta - m.beta) + Math.abs(sigma - m.sigma)
    m = { ...m, a, beta, sigma }
    if (moved < 1e-4) break
  }
  return m
}

/**
 * tau by the method of moments (DerSimonian–Laird, with the prior as the known centre): how much
 * the subjects' own estimates (barely pulled toward the prior) spread around it, beyond what their
 * estimation error explains. Each subject counts by its precision, so a handful of all-H1 shares
 * with a huge error can't swamp it.
 */
export function estimateTau(groups: [string, BandObs[]][], model: GradeModel, priorMean: (code: string) => number): number | null {
  const est = groups.filter(([, obs]) => obs.length >= MIN_GRADE_SHARES).map(([code, obs]) => ({ ...fitOffset(obs, { ...model, tau: 50 }, priorMean(code)), code }))
  if (est.length < MIN_TAU_SUBJECTS) return null
  const w = est.map((e) => 1 / (e.sd * e.sd))
  const sw = w.reduce((s, x) => s + x, 0)
  const q = est.reduce((s, e, i) => s + w[i]! * (e.offset - priorMean(e.code)) ** 2, 0)
  return Math.max(MIN_TAU, Math.sqrt(Math.max(0, (q - est.length) / sw)))
}

const round3 = (x: number) => Math.round(x * 1000) / 1000

/**
 * Offsets from shared bands, with the model fitted from them once there are MIN_MODEL_ROWS;
 * below that, the defaults and exactly what gradeOffsets gives.
 */
export function fitGrades(rows: GradeRow[], known?: Set<string>, o: FitOptions = {}): FittedGrades {
  const groups = [...bandsBySubject(rows, known, o.year)].sort(([a], [b]) => a.localeCompare(b))
  const count = groups.reduce((s, [, obs]) => s + obs.length, 0)
  const prior = o.priorMean ?? (() => 0)
  if (count < MIN_MODEL_ROWS) return { offsets: gradeOffsets(rows, known, { year: o.year, priorMean: o.priorMean }), model: DEFAULT_GRADE_MODEL, fitted: false, rows: count }
  const global = fitGlobal(groups, DEFAULT_GRADE_MODEL, prior)
  const tau = estimateTau(groups, global, prior) ?? DEFAULT_GRADE_MODEL.tau
  const model = { a: round3(global.a), beta: round3(global.beta), sigma: round3(global.sigma), tau: round3(tau) }
  return { offsets: gradeOffsets(rows, known, { year: o.year, model, priorMean: o.priorMean }), model, fitted: true, rows: count }
}
