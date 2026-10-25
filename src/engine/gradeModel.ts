import { discussionVerdict, type Subject } from './schema'
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
  /** Offsets predicted from Handbook facts, once MIN_FEATURE_SUBJECTS subjects have offsets. */
  featurePrior?: FeaturePrior
}

// ---- the feature prior (Fay–Herriot): a subject's offset predicted from its Handbook facts ----

/** What the feature prior reads, in order (after a constant): see offsetFeatures. */
export const FEATURE_NAMES = ['examShare', 'examHurdle', 'otherHurdles', 'hoursOver3_5', 'level1', 'level3', 'reviewsEasy', 'reviewsHard'] as const
/** Subjects with published offsets needed before the feature prior is fitted. */
export const MIN_FEATURE_SUBJECTS = 40

export interface FeaturePrior {
  /** One per FEATURE_NAMES, after the constant. */
  weights: number[]
  /** How far offsets still stray from what the facts predict. */
  tau: number
  subjects: number
}

/** The facts the feature prior reads, or null when the subject's assessment isn't recorded. */
export function offsetFeatures(s: Subject): number[] | null {
  const tasks = s.assessment
  if (!tasks) return null
  const exam = tasks.filter((t) => t.kind === 'exam').reduce((a, t) => a + t.weight, 0)
  const verdict = discussionVerdict(s.discussions, 'difficulty')?.value
  return [
    1,
    exam / 100,
    tasks.some((t) => t.kind === 'exam' && t.hurdle) ? 1 : 0,
    Math.min(2, tasks.filter((t) => t.kind !== 'exam' && t.hurdle).length),
    (s.weeklyContactHours ?? 3.5) - 3.5,
    s.level === 1 ? 1 : 0,
    s.level >= 3 ? 1 : 0,
    verdict === 'easy' ? 1 : 0,
    verdict === 'hard' ? 1 : 0,
  ]
}

/** The offset a subject's facts predict, or null without a fitted prior or recorded assessment. */
export function priorOffset(s: Subject, fp: { weights: number[] } | undefined): number | null {
  const x = fp ? offsetFeatures(s) : null
  return x && fp && fp.weights.length === x.length ? x.reduce((a, v, i) => a + v * fp.weights[i]!, 0) : null
}

/** Solves A·x = b (small, symmetric positive definite) by Gaussian elimination. */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]!])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r
    ;[M[c], M[p]] = [M[p]!, M[c]!]
    for (let r = c + 1; r < n; r++) {
      const f = M[r]![c]! / M[c]![c]!
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!
    }
  }
  const x = new Array<number>(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let v = M[r]![n]!
    for (let k = r + 1; k < n; k++) v -= M[r]![k]! * x[k]!
    x[r] = v / M[r]![r]!
  }
  return x
}

/**
 * Regress subjects' own offset estimates on their facts, each weighted by 1/(sd² + tau²), with a
 * light ridge on everything but the constant; tau (what the facts leave unexplained) is
 * re-estimated as it goes and never goes below MIN_TAU, so the prior can't swallow the data.
 */
export function fitFeaturePrior(est: { x: number[]; offset: number; sd: number }[], tau0: number): FeaturePrior | undefined {
  if (est.length < MIN_FEATURE_SUBJECTS) return undefined
  const p = est[0]!.x.length
  let tau = tau0
  let g = new Array<number>(p).fill(0)
  for (let round = 0; round < 30; round++) {
    const w = est.map((e) => 1 / (e.sd * e.sd + tau * tau))
    const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => est.reduce((a, e, k) => a + w[k]! * e.x[i]! * e.x[j]!, 0) + (i === j && i > 0 ? 1 : 0)))
    const b = Array.from({ length: p }, (_, i) => est.reduce((a, e, k) => a + w[k]! * e.x[i]! * e.offset, 0))
    g = solve(A, b)
    // Moments again: the residuals' spread beyond their estimation error.
    const prec = est.map((e) => 1 / (e.sd * e.sd))
    const q = est.reduce((a, e, k) => a + prec[k]! * (e.offset - e.x.reduce((s, v, i) => s + v * g[i]!, 0)) ** 2, 0)
    const next = Math.max(MIN_TAU, Math.sqrt(Math.max(0, (q - (est.length - p)) / prec.reduce((a, x) => a + x, 0))))
    if (Math.abs(next - tau) < 1e-6) break
    tau = next
  }
  return { weights: g.map(round3), tau: round3(tau), subjects: est.length }
}

export interface FitOptions {
  /** This year, for the age weights. */
  year?: number
  /** Each subject's facts (offsetFeatures), for the feature prior; null when unknown. */
  features?: (code: string) => number[] | null
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
  const zero = () => 0
  let model = DEFAULT_GRADE_MODEL
  let fitted = false
  if (count >= MIN_MODEL_ROWS) {
    const global = fitGlobal(groups, DEFAULT_GRADE_MODEL, zero)
    const tau = estimateTau(groups, global, zero) ?? DEFAULT_GRADE_MODEL.tau
    model = { a: round3(global.a), beta: round3(global.beta), sigma: round3(global.sigma), tau: round3(tau) }
    fitted = true
  }
  // The feature prior, from subjects with published offsets and recorded facts: their own
  // estimates, barely pulled toward 0, regressed on the facts.
  let featurePrior: FeaturePrior | undefined
  if (o.features) {
    const est = groups.flatMap(([code, obs]) => {
      const x = obs.length >= MIN_GRADE_SHARES ? o.features!(code) : null
      return x ? [{ x, ...fitOffset(obs, { ...model, tau: 50 }) }] : []
    })
    featurePrior = fitFeaturePrior(est, model.tau)
  }
  const priorMean = featurePrior ? (code: string) => {
    const x = o.features!(code)
    return x ? x.reduce((a, v, i) => a + v * featurePrior!.weights[i]!, 0) : 0
  } : undefined
  const prior = featurePrior ? { ...model, tau: featurePrior.tau } : model
  const offsets = gradeOffsets(rows, known, { year: o.year, model: prior, priorMean })
  return { offsets, model, fitted, rows: count, ...(featurePrior ? { featurePrior } : {}) }
}
