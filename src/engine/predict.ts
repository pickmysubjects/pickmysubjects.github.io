import { referencedSubjects } from './expr'
import { FITTED } from './fitted'
import { priorOffset } from './gradeModel'
import type { Dataset, Skill, Subject } from './schema'
import { MARKING_SKILLS, skillsOf } from './skills'

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
 * A subject from another area that uses the same skills counts for at most this much (a quarter
 * of a same-area one). Set by a rule, not tuned: a mark's weight follows how much of the
 * student's lean for the target it is expected to share. A same-area subject shares two parts of
 * it (the skill and the area's subject matter), a subject that only shares a skill shares one:
 * half. And whether marks lean by skill beyond the area at all is unproven on real marks (a
 * per-skill lean didn't help on the 2026-10-14 check), so that half counts at even odds: half
 * again. Scaled by how alike the two skill lists are (see skillOverlap).
 */
const SKILL_WEIGHT = SAME_AREA_WEIGHT / 4

/** What a subject's content asks of a student: its skills, less the ones read off how it's marked. */
function contentSkills(s: Subject, data: Dataset): Skill[] {
  return skillsOf(s, data).filter((k) => !MARKING_SKILLS.includes(k))
}

/**
 * How alike two skill lists are, 0–1: the shared skills over the geometric mean of the two
 * counts (the cosine of the two tag sets). One shared skill out of one each is 1; one shared out
 * of two each is ½. If each skill lifts or lowers a student by its own amount and a subject's
 * mark follows the mean over its skills, this is how closely the two subjects' skill parts move.
 */
function skillOverlap(a: Skill[], b: Skill[]): number {
  if (!a.length || !b.length) return 0
  const shared = a.filter((k) => b.includes(k)).length
  return shared / Math.sqrt(a.length * b.length)
}
/**
 * What the likely range means: the actual mark lands inside it about this often ("1 in 2"), and
 * the z that gives it for a normal error (the 75th percentile). Set by that meaning, not tuned.
 */
export const RANGE_SHARE = 0.5
export const RANGE_Z = 0.6745
/** How far marks usually stray from a student's own level, in marks: the grade model's sigma once fitted. */
const USUAL_SPREAD = FITTED.spread ?? 8
/** A student's own spread counts as if the usual one came with this many marks of its own. */
const SPREAD_PRIOR_MARKS = 4

/**
 * How a subject grades next to its students' own level: its shared grades; else, once the feature
 * prior is fitted, what its Handbook facts predict; else 0. With its uncertainty (sd).
 */
export function gradingOf(s: Subject): { offset: number; sd: number } {
  if (s.gradeOffset) return { offset: s.gradeOffset.offset, sd: s.gradeOffset.sd ?? 0 }
  const fp = FITTED.featurePrior
  const prior = priorOffset(s, fp)
  return prior === null || !fp ? { offset: 0, sd: 0 } : { offset: prior, sd: fp.tau }
}

export function offsetOf(s: Subject): number {
  return gradingOf(s).offset
}

/**
 * How a student is likely to go in a subject, from their own marks: its prerequisites say most,
 * subjects in the same area less, subjects elsewhere that use the same skills less again (an 88 in
 * an English subject says something about an anthropology essay subject), and with only a mark or
 * two the estimate leans back toward the WAM. Checked against a real transcript (2026-10-14):
 * finer ideas (skill and topic similarity as the main signal, a per-skill lean) were less accurate
 * than this, and nothing beat the WAM by much, so it is shown as a range rather than a precise
 * mark. The skill part (2026-10-26) is kept small on purpose: on synthetic students it helps when
 * students do differ by skill and costs nothing measurable when they don't (gradeModel.test.ts).
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
  const skills = contentSkills(s, data)
  const weightOf = (c: string) =>
    prereqs.has(c) ? 1 : data.subjects[c]!.area === s.area ? SAME_AREA_WEIGHT : SKILL_WEIGHT * skillOverlap(skills, contentSkills(data.subjects[c]!, data))
  const related = level.map(([code, mark]) => ({ code, mark, w: weightOf(code) })).filter((x) => x.w > 0)
  const w = related.reduce((sum, x) => sum + x.w, 0)
  // Related subjects pull it toward how the student goes in them (their residual over the WAM,
  // shrunk by how much there is to go on): own·w + wam·2 over w + 2 is wam + (own − wam)·w/(w + 2).
  const own = w > 0 ? related.reduce((sum, x) => sum + x.w * x.mark, 0) / w : wam
  // How the subject grades next to its students' own level, once enough have shared their bands.
  const grading = gradingOf(s)
  const offset = grading.offset
  const mark = Math.max(0, Math.min(100, (own * w + wam * WAM_WEIGHT) / (w + WAM_WEIGHT) + offset))

  // Range: where a new mark lands RANGE_SHARE of the time. A new mark varies however much is
  // known (spread), and the estimate itself is uncertain too (se): over how many marks it rests on,
  // plus how sure the subject's shared grading is. The spread is the student's own, around their
  // level, pulled toward the usual spread when there are only a few marks to judge it from.
  const n = level.length
  const own2 = level.reduce((sum, [, m]) => sum + (m - wam) ** 2, 0)
  const spread2 = (own2 + SPREAD_PRIOR_MARKS * USUAL_SPREAD ** 2) / (n + SPREAD_PRIOR_MARKS)
  const se2 = spread2 / (n + w) + grading.sd ** 2
  const half = RANGE_Z * Math.sqrt(spread2 + se2)
  const basis = related.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.code)
  return { mark, low: Math.max(0, mark - half), high: Math.min(100, mark + half), basis }
}
