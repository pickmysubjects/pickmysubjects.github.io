import { ASSESSMENT_KINDS, type AssessmentKind } from './schema'
import { BAND_EDGES } from './grades'
import type { AssessmentTask } from './handbookPaste'

/**
 * "What do I need on the final?": from the marks a student has for the parts already done, the
 * average they need on the parts still to come for each UniMelb grade, plus the hurdles they must
 * clear on their own whatever the total. Works on any list of parts: the Handbook's, or one the
 * student typed in from this year's subject guide.
 */

/** One assessment part. `score` is the student's mark on it as a percentage, absent when not done yet. */
export interface CalcPart {
  kind: AssessmentKind
  weight: number
  hurdle?: boolean
  score?: number
}

/** The grades a student aims for, with the mark each starts at. N is the floor, not a goal. */
export const CALC_TARGETS = [
  { band: 'H1', mark: 80 },
  { band: 'H2A', mark: 75 },
  { band: 'H2B', mark: 70 },
  { band: 'H3', mark: 65 },
  { band: 'P', mark: 50 },
] as const
export type CalcBand = (typeof CALC_TARGETS)[number]['band']

export type NeedStatus = 'secured' | 'possible' | 'impossible'

export interface BandNeed {
  band: CalcBand
  target: number
  /** Where the band starts once the final mark is rounded (79.5 for H1), as everywhere on the site. */
  from: number
  /** Average needed on the parts still to come, rounded up to a whole mark; null when nothing is left. */
  needed: number | null
  status: NeedStatus
}

export interface CalcResult {
  /** Sum of all weights (100 for Handbook data; whatever the student typed otherwise). */
  totalWeight: number
  doneWeight: number
  leftWeight: number
  /** Marks banked so far, out of the total weight scaled to 100 (to one decimal, for the working). */
  earned: number
  /**
   * With every part done: the final mark as UniMelb gives it, a whole number (79.5 → 80, 79.45 →
   * 79). Null while parts are still to come.
   */
  mark: number | null
  /** Best final mark still reachable (100% on everything left). */
  best: number
  bands: BandNeed[]
  /** Parts not done yet that must be passed on their own. */
  hurdlesLeft: CalcPart[]
  /**
   * Hurdles already marked under 50%. The Handbook doesn't give a hurdle's pass mark, but 50% is
   * the usual one: below it the subject is likely failed (NH, 49 on the transcript) whatever the total.
   */
  hurdlesMissed: CalcPart[]
  /** True when counting 79.5 as 80 changes a shown result: only then is the rounding explained. */
  roundingMatters: boolean
}

/** The parts of a subject from its Handbook assessment, nothing filled in yet. */
export function partsFromAssessment(tasks: AssessmentTask[] | 'unknown' | undefined): CalcPart[] {
  if (!tasks || tasks === 'unknown') return []
  return tasks.map((t) => ({ kind: t.kind, weight: t.weight, ...(t.hurdle ? { hurdle: true } : {}) }))
}

/** A mark typed as score / out of, as a percentage; null when it can't be read. */
export function percentOf(score: number, outOf = 100): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(outOf) || outOf <= 0 || score < 0 || score > outOf) return null
  return (score / outOf) * 100
}

const tenth = (x: number) => Math.round(x * 10) / 10

/** The usual pass mark of a hurdle, when the subject guide doesn't say otherwise. */
export const HURDLE_PASS = 50

export function finalNeeds(parts: readonly CalcPart[]): CalcResult | null {
  const usable = parts.filter((p) => Number.isFinite(p.weight) && p.weight > 0)
  const totalWeight = usable.reduce((s, p) => s + p.weight, 0)
  if (totalWeight <= 0) return null
  // Weights that don't add up to 100 (typed by hand) count in proportion.
  const scale = 100 / totalWeight
  const done = usable.filter((p) => p.score !== undefined && Number.isFinite(p.score))
  const left = usable.filter((p) => !done.includes(p))
  const doneWeight = done.reduce((s, p) => s + p.weight, 0)
  const leftWeight = totalWeight - doneWeight
  const earned = done.reduce((s, p) => s + (Math.max(0, Math.min(100, p.score as number)) * p.weight) / 100, 0) * scale
  const leftShare = leftWeight * scale
  const need = (mark: number, from: number) => {
    if (leftShare <= 0) return { needed: null, status: (earned + 1e-9 >= from ? 'secured' : 'impossible') as NeedStatus }
    // Rounded up: the mark shown must be enough on its own. The 1e-9 keeps 70.0000001 at 70.
    const needed = Math.ceil(((from - earned) / leftShare) * 100 - 1e-9)
    if (needed <= 0) return { needed: 0, status: 'secured' as NeedStatus }
    return { needed, status: (needed > 100 ? 'impossible' : 'possible') as NeedStatus }
  }
  const bands = CALC_TARGETS.map(({ band, mark }): BandNeed => ({ band, target: mark, from: BAND_EDGES[band][0], ...need(mark, BAND_EDGES[band][0]) }))
  const roundingMatters = CALC_TARGETS.some(({ band, mark }, i) => {
    const plain = need(mark, mark)
    return plain.needed !== bands[i]!.needed || plain.status !== bands[i]!.status
  })
  return {
    totalWeight: tenth(totalWeight),
    doneWeight: tenth(doneWeight),
    leftWeight: tenth(leftWeight),
    earned: tenth(earned),
    // The 1e-9 keeps a sum like 79.4999999 (really 79.5) from rounding down.
    mark: leftShare <= 0 ? Math.round(earned + 1e-9) : null,
    best: tenth(earned + leftShare),
    bands,
    hurdlesLeft: left.filter((p) => p.hurdle),
    hurdlesMissed: done.filter((p) => p.hurdle && (p.score as number) < HURDLE_PASS),
    roundingMatters,
  }
}

/**
 * The grade of a finished subject, from the bands it secured (so 79.45 is H2A even though it
 * shows as 79.5). A pass/fail subject only has P or N. A hurdle marked under 50% caps it: NH
 * (a fail, 49 on the transcript) when the total would have passed, N when it wouldn't.
 */
export function finalBand(result: CalcResult, passFail = false): CalcBand | 'N' | 'NH' {
  const got = result.bands.find((b) => b.status === 'secured' && (!passFail || b.band === 'P'))
  if (got && result.hurdlesMissed.length) return 'NH'
  return got ? (passFail ? 'P' : got.band) : 'N'
}

/** A calculator row as saved: raw score and what it's out of, as typed ('' when not done yet). */
export interface CalcRow {
  kind: AssessmentKind
  weight: number
  hurdle?: boolean
  score: number | ''
  outOf: number | ''
}

export interface CalcEntry {
  rows: CalcRow[]
  /** True once the rows differ from the Handbook's (edited, added or removed). */
  custom?: boolean
}

const savedNum = (x: unknown): number | '' => (typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1000 ? x : '')

/** Puts a saved copy (browser storage or a backup file) back in shape, dropping anything broken. */
export function cleanCalc(raw: unknown): Record<string, CalcEntry> {
  const out: Record<string, CalcEntry> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [code, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Z]{4}\d{5}$/.test(code) || !v || typeof v !== 'object' || !Array.isArray((v as CalcEntry).rows)) continue
    const rows = (v as CalcEntry).rows
      .filter((r) => r && (ASSESSMENT_KINDS as readonly string[]).includes(r.kind))
      .slice(0, 30)
      .map((r): CalcRow => ({ kind: r.kind, weight: typeof r.weight === 'number' && r.weight >= 0 && r.weight <= 100 ? r.weight : 0, ...(r.hurdle ? { hurdle: true } : {}), score: savedNum(r.score), outOf: savedNum(r.outOf) }))
    out[code] = { rows, ...((v as CalcEntry).custom ? { custom: true } : {}) }
  }
  return out
}

type PartShape = Pick<CalcRow, 'kind' | 'weight' | 'hurdle'>

/** Same parts in the same order (kind, weight, hurdle); marks don't count. */
export function sameCalcParts(a: readonly PartShape[], b: readonly PartShape[]): boolean {
  return a.length === b.length && a.every((r, i) => r.kind === b[i]!.kind && r.weight === b[i]!.weight && !!r.hurdle === !!b[i]!.hurdle)
}

/**
 * A saved entry the student never changed whose parts no longer match the Handbook's: the
 * Handbook changed after it was saved (new weights, a part added or dropped).
 */
export function handbookChanged(entry: CalcEntry | undefined, handbook: readonly PartShape[]): boolean {
  return !!entry && !entry.custom && handbook.length > 0 && !sameCalcParts(entry.rows, handbook)
}
