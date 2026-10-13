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

/**
 * How a student is likely to go in a subject, from their own marks: its prerequisites say most,
 * subjects in the same area less, and with only a mark or two the estimate leans back toward the
 * WAM. Checked against a real transcript (2026-10-14): finer ideas (skill and topic similarity, a
 * per-skill lean) were less accurate than this, and nothing beat the WAM by much, so it is shown
 * as a range rather than a precise mark.
 */
export function predictMark(s: Subject, marks: Map<string, number>, data: Dataset): MarkPrediction | null {
  const others = [...marks].filter(([c]) => c !== s.code && data.subjects[c])
  if (others.length === 0) return null
  const wam = others.reduce((sum, [, m]) => sum + m, 0) / others.length
  const prereqs = new Set(referencedSubjects(s.prerequisites))
  const related = others
    .filter(([c]) => prereqs.has(c) || data.subjects[c]!.area === s.area)
    .map(([code, mark]) => ({ code, mark, w: prereqs.has(code) ? 1 : SAME_AREA_WEIGHT }))
  const w = related.reduce((sum, x) => sum + x.w, 0)
  const own = w > 0 ? related.reduce((sum, x) => sum + x.w * x.mark, 0) / w : wam
  // How the subject grades next to its students' own level, once enough have shared their bands.
  const offset = s.gradeOffset?.offset ?? 0
  const mark = Math.max(0, Math.min(100, (own * w + wam * WAM_WEIGHT) / (w + WAM_WEIGHT) + offset))

  // Range: the spread of the student's marks, narrower with more related evidence.
  const all = others.map(([, m]) => m)
  const sd = Math.sqrt(all.reduce((sum, m) => sum + (m - wam) ** 2, 0) / all.length) || 8
  // Shared grades narrow it a little: the subject's own grading is then known, not assumed.
  const half = Math.min(15, Math.max(4, sd / Math.sqrt(1 + w / 2 + (s.gradeOffset ? Math.min(s.gradeOffset.n, 20) / 10 : 0))))
  const basis = related.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.code)
  return { mark, low: Math.max(0, mark - half), high: Math.min(100, mark + half), basis }
}
