import type { AssessmentKind, AssessmentTask } from './schema'

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
  /** Average needed on the parts still to come, rounded up to a whole mark; null when nothing is left. */
  needed: number | null
  status: NeedStatus
}

export interface CalcResult {
  /** Sum of all weights (100 for Handbook data; whatever the student typed otherwise). */
  totalWeight: number
  doneWeight: number
  leftWeight: number
  /** Marks banked so far, out of the total weight scaled to 100. */
  earned: number
  /** Best final mark still reachable (100% on everything left). */
  best: number
  bands: BandNeed[]
  /** Parts not done yet that must be passed on their own. */
  hurdlesLeft: CalcPart[]
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
  const bands = CALC_TARGETS.map(({ band, mark }): BandNeed => {
    if (leftShare <= 0) return { band, target: mark, needed: null, status: earned + 1e-9 >= mark ? 'secured' : 'impossible' }
    // Rounded up: the mark shown must be enough on its own. The 1e-9 keeps 70.0000001 at 70.
    const needed = Math.ceil(((mark - earned) / leftShare) * 100 - 1e-9)
    if (needed <= 0) return { band, target: mark, needed: 0, status: 'secured' }
    return { band, target: mark, needed, status: needed > 100 ? 'impossible' : 'possible' }
  })
  return {
    totalWeight: tenth(totalWeight),
    doneWeight: tenth(doneWeight),
    leftWeight: tenth(leftWeight),
    earned: tenth(earned),
    best: tenth(earned + leftShare),
    bands,
    hurdlesLeft: left.filter((p) => p.hurdle),
  }
}
