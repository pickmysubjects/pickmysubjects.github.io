import { referencedSubjects } from './expr'
import type { Dataset, Subject } from './schema'

export interface MarkPrediction {
  /** Expected mark, 0–100. */
  mark: number
  /** Likely range: wider when the evidence is thin or the student's marks vary. */
  low: number
  high: number
  /** The marked subjects it is based on. */
  basis: string[]
}

/** How many related marks it takes before they outweigh the overall WAM (Bayesian shrinkage). */
const WAM_WEIGHT = 2
/** A same-area subject counts for this much of a prerequisite. */
const SAME_AREA_WEIGHT = 0.6

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

  // Range: the spread of the student's marks, narrower with more related evidence.
  const all = level.map(([, m]) => m)
  const sd = Math.sqrt(all.reduce((sum, m) => sum + (m - wam) ** 2, 0) / all.length) || 8
  // Shared grades narrow it a little: the subject's own grading is then known, not assumed.
  const half = Math.min(15, Math.max(4, sd / Math.sqrt(1 + w / 2 + (s.gradeOffset ? Math.min(s.gradeOffset.n, 20) / 10 : 0))))
  const basis = related.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.code)
  return { mark, low: Math.max(0, mark - half), high: Math.min(100, mark + half), basis }
}
