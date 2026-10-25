/**
 * Grade bands as students share them: the mark never leaves the browser, only its band and the
 * five-point range of the student's WAM (without that subject), so a band can be read against
 * how strong a student is overall without ever linking one person's subjects together.
 */
export const GRADE_BANDS = ['H1', 'H2A', 'H2B', 'H3', 'P', 'N'] as const
export type GradeBand = (typeof GRADE_BANDS)[number]

export function bandOf(mark: number): GradeBand {
  if (mark >= 80) return 'H1'
  if (mark >= 75) return 'H2A'
  if (mark >= 70) return 'H2B'
  if (mark >= 65) return 'H3'
  if (mark >= 50) return 'P'
  return 'N'
}

/**
 * Where each band starts and ends on the mark scale. H1 is 80–100 and N is under 50; a mark can't
 * go past 100 or below 0, so a mark the model would put above 100 is an H1 all the same (and one
 * below 0 an N): the outer ends are open. Marks are whole numbers, so 80 is anything from 79.5.
 */
export const BAND_EDGES: Record<GradeBand, readonly [number, number]> = {
  H1: [79.5, Infinity],
  H2A: [74.5, 79.5],
  H2B: [69.5, 74.5],
  H3: [64.5, 69.5],
  P: [49.5, 64.5],
  N: [-Infinity, 49.5],
}

/** "70–74": the five-point range a WAM falls in. */
export function wamBandOf(wam: number): string {
  const low = Math.max(0, Math.min(95, Math.floor(wam / 5) * 5))
  return `${low}–${low + 4}`
}

/** The middle of a "70–74" range, or null when it can't be read. */
export function wamBandMid(band: string): number | null {
  const m = /^(\d{1,2})[–-](\d{1,3})$/.exec(band.trim())
  if (!m) return null
  const low = Number(m[1])
  const high = Number(m[2])
  return high - low === 4 && low % 5 === 0 ? low + 2 : null
}

/** A subject's grading next to students' own level, published once enough people shared. */
export interface GradeOffset {
  /** Marks above (+) or below (−) the WAM of those who took it, pulled toward the prior when few shared. */
  offset: number
  /** How sure: the standard deviation of that estimate, in marks (absent in files from before it was kept). */
  sd?: number
  n: number
}

/**
 * Shares needed before a subject's offset is published at all. A privacy floor (one or two
 * people's bands are never published), not the statistical shrinkage: that is the prior below.
 */
export const MIN_GRADE_SHARES = 5

/**
 * How a shared band is read: the mark is normal around a + beta·(WAM − 70) + the subject's
 * offset, with spread sigma; offsets themselves are normal around a prior mean with spread tau.
 * These defaults hold until enough bands are in to fit them (see gradeModel.ts).
 */
export interface GradeModel {
  a: number
  beta: number
  sigma: number
  tau: number
}
export const DEFAULT_GRADE_MODEL: GradeModel = { a: 70, beta: 1, sigma: 8, tau: 4 }

/** A band from this many years ago counts 0.8^years: assessment changes over time. */
export const AGE_WEIGHT = 0.8

/** A shared band as the form sends it; `year` is the year the subject was taken, when given. */
export interface GradeRow {
  code: string
  band: string
  wamBand: string
  year?: number | string
}

/** One usable band: the WAM-range middle, the band's edges, and its age weight. */
export interface BandObs {
  wam: number
  lo: number
  hi: number
  w: number
}

/** Rows by subject, with unknown codes and malformed rows dropped. */
export function bandsBySubject(rows: GradeRow[], known?: Set<string>, thisYear?: number): Map<string, BandObs[]> {
  const out = new Map<string, BandObs[]>()
  for (const r of rows) {
    const code = r.code.trim().toUpperCase()
    if (!/^[A-Z]{4}\d{5}$/.test(code) || (known && !known.has(code))) continue
    const band = r.band.trim().toUpperCase() as GradeBand
    const wam = wamBandMid(r.wamBand)
    if (!GRADE_BANDS.includes(band) || wam === null) continue
    const [lo, hi] = BAND_EDGES[band]
    // A WAM is an average, not a whole number: "70–74" is anything from 70 up to 75.
    const mid = wam + 0.5
    const year = Number(r.year)
    const dated = thisYear !== undefined && r.year !== undefined && r.year !== '' && Number.isFinite(year)
    out.set(code, [...(out.get(code) ?? []), { wam: mid, lo, hi, w: dated ? AGE_WEIGHT ** Math.max(0, thisYear - year) : 1 }])
  }
  return out
}

// ---- the normal distribution, accurate far into the tails (where log-likelihoods go) ----

/** erfc with relative error under 1.2e-7 everywhere (Numerical Recipes' erfcc). */
function erfc(x: number): number {
  const z = Math.abs(x)
  const t = 1 / (1 + 0.5 * z)
  const poly = -1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
  const r = t * Math.exp(-z * z + poly)
  return x >= 0 ? r : 2 - r
}
/** P(Z > x). */
const upper = (x: number) => (x === Infinity ? 0 : x === -Infinity ? 1 : 0.5 * erfc(x / Math.SQRT2))
const density = (x: number) => (Number.isFinite(x) ? Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI) : 0)
const xDensity = (x: number) => (Number.isFinite(x) ? x * density(x) : 0)

/** P(l < Z < u), from whichever tail keeps it from cancelling. */
function between(l: number, u: number): number {
  if (l > 0) return upper(l) - upper(u)
  if (u < 0) return upper(-u) - upper(-l)
  return 1 - upper(u) - upper(-l)
}

/** One band's probability given its mean, and its first and second log-derivatives in that mean. */
function bandTerms(mean: number, lo: number, hi: number, sigma: number): { d1: number; d2: number } {
  const l = (lo - mean) / sigma
  const u = (hi - mean) / sigma
  const p = Math.max(between(l, u), 1e-300)
  const n = density(l) - density(u)
  return { d1: n / (sigma * p), d2: ((xDensity(l) - xDensity(u)) * p - n * n) / (sigma * sigma * p * p) }
}

/** Mean and variance of a normal(mean, sigma) cut to [lo, hi] (the EM step in gradeModel.ts). */
export function truncatedMoments(mean: number, sigma: number, lo: number, hi: number): { mean: number; variance: number } {
  const l = (lo - mean) / sigma
  const u = (hi - mean) / sigma
  const p = Math.max(between(l, u), 1e-300)
  const a = (density(l) - density(u)) / p
  const b = (xDensity(l) - xDensity(u)) / p
  return { mean: mean + sigma * a, variance: sigma * sigma * Math.max(1e-6, 1 + b - a * a) }
}

/**
 * One subject's offset: the most likely value given its bands (each band's probability for the
 * sharer's WAM, weighted by age) and a normal prior, with its standard deviation from the
 * curvature there. The log-likelihood is concave in the offset, so Newton steps find the top,
 * kept inside a bracket that halves whenever a step would leave it.
 */
export function fitOffset(obs: BandObs[], model: GradeModel = DEFAULT_GRADE_MODEL, priorMean = 0): { offset: number; sd: number } {
  const { a, beta, sigma, tau } = model
  const at = (delta: number) => {
    let slope = -(delta - priorMean) / (tau * tau)
    let info = 1 / (tau * tau)
    for (const o of obs) {
      const t = bandTerms(a + beta * (o.wam - 70) + delta, o.lo, o.hi, sigma)
      slope += o.w * t.d1
      info -= o.w * t.d2
    }
    return { slope, info }
  }
  let lo = -60
  let hi = 60
  let delta = Math.max(lo, Math.min(hi, priorMean))
  for (let i = 0; i < 100; i++) {
    const { slope, info } = at(delta)
    if (slope > 0) lo = delta
    else hi = delta
    let next = delta + slope / info
    if (!(next > lo && next < hi)) next = (lo + hi) / 2
    if (Math.abs(next - delta) < 1e-10 || hi - lo < 1e-10) {
      delta = next
      break
    }
    delta = next
  }
  return { offset: delta, sd: 1 / Math.sqrt(at(delta).info) }
}

const round1 = (x: number) => Math.round(x * 10) / 10

export interface OffsetOptions {
  /** This year, for the age weights; rows without a year count in full. */
  year?: number
  model?: GradeModel
  /** Each subject's prior mean offset (0 when not given): the feature prior, once fitted. */
  priorMean?: (code: string) => number
}

/**
 * Per subject: how far its grades sit above or below the sharers' WAMs, reading each band as the
 * interval it is (an H1 is anywhere from 80 up, not 85). Unknown codes and malformed rows are
 * dropped, and a subject with fewer than MIN_GRADE_SHARES shares isn't published.
 */
export function gradeOffsets(rows: GradeRow[], known?: Set<string>, o: OffsetOptions = {}): Record<string, GradeOffset> {
  const out: Record<string, GradeOffset> = {}
  for (const [code, obs] of [...bandsBySubject(rows, known, o.year)].sort(([a], [b]) => a.localeCompare(b))) {
    if (obs.length < MIN_GRADE_SHARES) continue
    const fit = fitOffset(obs, o.model, o.priorMean?.(code) ?? 0)
    out[code] = { offset: round1(fit.offset), sd: round1(fit.sd), n: obs.length }
  }
  return out
}
