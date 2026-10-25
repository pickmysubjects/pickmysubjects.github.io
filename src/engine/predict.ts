import { referencedSubjects } from './expr'
import { FITTED } from './fitted'
import type { Dataset, Subject } from './schema'

export interface MarkPrediction {
  /** Expected mark, 0–100. */
  mark: number
  /** Likely range: the mark lands inside it about RANGE_SHARE of the time; wider when the student's marks vary or there are few. */
  low: number
  high: number
  /** The marked subjects it is based on. */
  basis: string[]
}

/** How many related marks it takes before they outweigh the overall WAM (Bayesian shrinkage). */
const WAM_WEIGHT = 2
/** A same-area subject counts for this much of a prerequisite. */
const SAME_AREA_WEIGHT = 0.6
/**
 * What the likely range means: the actual mark lands inside it about this often ("1 in 2"), and
 * the z that gives it for a normal error (the 75th percentile). Set by that meaning, not tuned.
 */
export const RANGE_SHARE = 0.5
const RANGE_Z = 0.6745
/** How far marks usually stray from a student's own level, in marks: the grade model's sigma once fitted. */
const USUAL_SPREAD = FITTED.spread ?? 8
/** A student's own spread counts as if the usual one came with this many marks of its own. */
const SPREAD_PRIOR_MARKS = 4

/** How a subject grades next to its students' own level (shared grades), 0 when unknown. */
export function offsetOf(s: Subject): number {
  return s.gradeOffset?.offset ?? 0
}

/**
 * How a student is likely to go in a subject, from their own marks: its prerequisites say most,
 * subjects in the same area less, and with only a mark or two the estimate leans back toward the
 * WAM. Checked against a real transcript (2026-10-14): finer ideas (skill and topic similarity, a
 * per-skill lean) were less accurate than this, and nothing beat the WAM by much, so it is shown
 * as a range rather than a precise mark.
 *
 * Each mark is read less how its subject grades (once shared grades say so): an 85 in a subject
 * where everyone does 5 above their WAM says less about the student than an 85 in a strict one.
 * So the baseline is a difficulty-adjusted WAM, related subjects add how this student goes in
 * them beyond that level, and the subject's own grading goes on top. With no shared grades every
 * adjustment is 0 and this is the plain WAM and related-marks average, exactly.
 */
export function predictMark(s: Subject, marks: Map<string, number>, data: Dataset): MarkPrediction | null {
  const others = [...marks].filter(([c]) => c !== s.code && data.subjects[c])
  if (others.length === 0) return null
  // The student's level in each subject: the mark less how that subject grades.
  const level = others.map(([c, m]) => [c, m - offsetOf(data.subjects[c]!)] as const)
  // The baseline is the WAM as the University works it out: weighted by each subject's points.
  const pts = (c: string) => data.subjects[c]!.points
  const wam = level.reduce((sum, [c, m]) => sum + m * pts(c), 0) / level.reduce((sum, [c]) => sum + pts(c), 0)
  const prereqs = new Set(referencedSubjects(s.prerequisites))
  const related = level
    .filter(([c]) => prereqs.has(c) || data.subjects[c]!.area === s.area)
    .map(([code, mark]) => ({ code, mark, w: prereqs.has(code) ? 1 : SAME_AREA_WEIGHT }))
  const w = related.reduce((sum, x) => sum + x.w, 0)
  // Related subjects pull it toward how the student goes in them (their residual over the WAM,
  // shrunk by how much there is to go on): own·w + wam·2 over w + 2 is wam + (own − wam)·w/(w + 2).
  const own = w > 0 ? related.reduce((sum, x) => sum + x.w * x.mark, 0) / w : wam
  // How the subject grades next to its students' own level, once enough have shared their bands.
  const offset = offsetOf(s)
  const mark = Math.max(0, Math.min(100, (own * w + wam * WAM_WEIGHT) / (w + WAM_WEIGHT) + offset))

  // Range: where a new mark lands RANGE_SHARE of the time. A new mark varies however much is
  // known (spread), and the estimate itself is uncertain too (se): over how many marks it rests on,
  // plus how sure the subject's shared grading is. The spread is the student's own, around their
  // level, pulled toward the usual spread when there are only a few marks to judge it from.
  const n = level.length
  const own2 = level.reduce((sum, [, m]) => sum + (m - wam) ** 2, 0)
  const spread2 = (own2 + SPREAD_PRIOR_MARKS * USUAL_SPREAD ** 2) / (n + SPREAD_PRIOR_MARKS)
  const se2 = spread2 / (n + w) + (s.gradeOffset?.sd ?? 0) ** 2
  const half = RANGE_Z * Math.sqrt(spread2 + se2)
  const basis = related.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.code)
  return { mark, low: Math.max(0, mark - half), high: Math.min(100, mark + half), basis }
}
