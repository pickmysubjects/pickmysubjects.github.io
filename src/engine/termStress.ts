import type { Profile } from './recommend'
import type { Dataset, Skill, Subject } from './schema'
import { skillsOf } from './skills'

export { skillsOf }

/**
 * How hard one semester's subjects are to carry together.
 *
 * Credit points say little about workload (Pardos & Borchers, "Credit hours is not enough",
 * 2023), so a semester is checked against a few plain rules, each one something a student
 * would recognise and each said back to them in one sentence:
 *
 * - your weak spot: two or more subjects leaning on a skill the student is weak at (their
 *   own rating, or low past marks); three or more counts twice;
 * - busy weeks: 20+ class hours a week, or two subjects students rate as a heavy workload;
 * - busy all semester: three or more subjects marked mostly on coursework (assignments due
 *   week after week);
 * - exam crunch: three or more subjects decided mostly by the final exam;
 * - project pile-up: three or more programming subjects each with a sizeable project or
 *   assignment (20%+), so from about week 4 there is always code due;
 * - rated hard: two or more subjects students rate hard.
 *
 * "Students say": our own ratings once three people have given them, else what the public
 * review summary says (heavy workload / hard), so a semester can be judged before anyone rates.
 *
 * One rule is a heavy semester, two a very heavy one. A subject can be light week to week and
 * brutal at exam time, or the other way round; the rules keep the two apart. Where we don't
 * know something (no ratings, no assessment), the rule stays quiet rather than guessing.
 *
 * Class hours alone aren't treated as workload: a lab subject has more of them, but the
 * University expects about ten hours a week per subject either way.
 */

export type StressLevel = 'ok' | 'heavy' | 'veryHeavy'

export interface StressReason {
  /** i18n key under `stress.` */
  key: 'stackWeak' | 'stackMarks' | 'hours' | 'workload' | 'coursework' | 'exams' | 'projects' | 'hard'
  params: Record<string, string | number>
}

export interface TermStress {
  level: StressLevel
  reasons: StressReason[]
  /**
   * How close the semester is to tripping each rule (1 is the line on any one), added up.
   * For comparing semesters (balancing), not for showing.
   */
  score: number
}

/** Skills that wear you down when two subjects lean on them in the same semester. */
const STACKING: Skill[] = ['maths', 'programming', 'statistics', 'writing', 'lab']

/**
 * A past average below this in a skill's subjects counts as a weakness — from two or more
 * marks; a single mark only when it's clearly low (one bad semester says little).
 */
export const WEAK_MARK = 65
const WEAK_SINGLE_MARK = 55
/** Typical weekly class hours when a subject's aren't recorded. */
const DEFAULT_HOURS = 3.5
/** Weekly class hours that make busy weeks (most full-time semesters have 14–17). */
const HOURS_RULE = 20
/** A subject is decided by the exam from this final-exam share, and by coursework up to COURSEWORK_EXAM. */
const EXAM_HEAVY = 70
const COURSEWORK_EXAM = 40
/** How many exam-decided (or coursework-decided) subjects make a crunch. */
const CRUNCH_RULE = 3
/** A project or assignment worth this much makes a subject's weeks busy; this many of them in code is a pile-up. */
const PROJECT_SHARE = 20
const PROJECTS_RULE = 3
/** A 1–5 rating that counts as hard / heavy, and how many such subjects trip the rule. */
const HIGH_RATING = 4
const RATED_RULE = 2
/** Ratings from fewer students than this are left out. */
const MIN_REVIEWS = 3

export interface StressOptions {
  /**
   * Per skill, the most subjects a semester can have on it before it counts as stacked
   * (default 1). planStress raises it when the plan can't spread them any thinner.
   */
  stackFloor?: Partial<Record<Skill, number>>
}

export function termStress(codes: string[], data: Dataset, profile?: Profile, opts: StressOptions = {}): TermStress {
  const subjects = codes.map((c) => data.subjects[c]).filter((s): s is Subject => s !== undefined)
  const reasons: StressReason[] = []
  // Fewer than three subjects is a light (or part-time) semester.
  if (subjects.length < 3) return { level: 'ok', reasons, score: 0 }
  const list = (xs: Subject[]) => xs.map((s) => s.code).join(', ')
  let points = 0
  let score = 0

  // Your weak spot: subjects stacked on a skill the student is weak at.
  for (const skill of STACKING) {
    const on = subjects.filter((s) => skillsOf(s, data).includes(skill))
    if (on.length < 2) continue
    const self = profile?.skills[skill]
    const marks = self === undefined ? weakAverage(skill, data, profile) : null
    const params = { skill, codes: list(on), n: on.length }
    if (self !== undefined && self <= 2) reasons.push({ key: 'stackWeak', params })
    else if (marks !== null) reasons.push({ key: 'stackMarks', params: { ...params, mark: marks } })
    else continue
    // Balancing still sees every stack; only the label skips one the plan can't avoid.
    score += on.length - 1
    if (on.length <= (opts.stackFloor?.[skill] ?? 1)) reasons.pop()
    else points += on.length >= 3 ? 2 : 1
  }

  // Busy weeks: class hours, or students saying the workload is heavy.
  const hours = Math.round(subjects.reduce((a, s) => a + (s.weeklyContactHours ?? DEFAULT_HOURS), 0))
  const rated = (s: Subject) => (s.signals && s.signals.reviews >= MIN_REVIEWS ? s.signals : undefined)
  const heavyWork = subjects.filter((s) => {
    const r = rated(s)
    return r?.workload !== undefined ? r.workload >= HIGH_RATING : s.discussion?.workload === 'heavy'
  })
  if (hours >= HOURS_RULE) {
    points++
    const most = [...subjects].sort((a, b) => (b.weeklyContactHours ?? 0) - (a.weeklyContactHours ?? 0)).slice(0, 2)
    reasons.push({ key: 'hours', params: { hours, codes: list(most) } })
  } else if (heavyWork.length >= RATED_RULE) {
    points++
    reasons.push({ key: 'workload', params: { n: heavyWork.length, codes: list(heavyWork) } })
  }
  score += Math.max(0, (hours - 16) / (HOURS_RULE - 16)) + heavyWork.length / RATED_RULE

  // Busy all semester, or all at the end.
  const recorded = subjects.filter((s) => s.assessment)
  const coursework = recorded.filter((s) => examShare(s) <= COURSEWORK_EXAM)
  const exams = recorded.filter((s) => examShare(s) >= EXAM_HEAVY)
  if (coursework.length >= CRUNCH_RULE) {
    points++
    reasons.push({ key: 'coursework', params: { n: coursework.length, codes: list(coursework) } })
  }
  if (exams.length >= CRUNCH_RULE) {
    points++
    reasons.push({ key: 'exams', params: { n: exams.length, codes: list(exams) } })
  }
  score += coursework.length / CRUNCH_RULE + exams.length / CRUNCH_RULE

  // Project pile-up: deadlines from several coding subjects landing in the same weeks.
  const projects = recorded.filter(
    (s) =>
      skillsOf(s, data).includes('programming') &&
      (s.assessment ?? []).some((t) => (t.kind === 'project' || t.kind === 'assignment') && t.weight >= PROJECT_SHARE),
  )
  if (projects.length >= PROJECTS_RULE) {
    points++
    reasons.push({ key: 'projects', params: { n: projects.length, codes: list(projects) } })
  }
  score += projects.length / PROJECTS_RULE

  // Rated hard, unless the student says they're strong at what the subject leans on.
  const strong = (s: Subject) => {
    const own = skillsOf(s, data).map((k) => profile?.skills[k])
    return own.length > 0 && own.every((x) => x !== undefined && x >= 4)
  }
  const hard = subjects.filter((s) => {
    const r = rated(s)
    const isHard = r?.difficulty !== undefined ? r.difficulty >= HIGH_RATING : s.discussion?.difficulty === 'hard'
    return isHard && !strong(s)
  })
  if (hard.length >= RATED_RULE) {
    points++
    reasons.push({ key: 'hard', params: { n: hard.length, codes: list(hard) } })
  }
  score += hard.length / RATED_RULE

  const level: StressLevel = points >= 2 ? 'veryHeavy' : points === 1 ? 'heavy' : 'ok'
  return { level, reasons, score: Math.round(score * 1000) / 1000 }
}

/** A weak skill the plan leans on in every semester, so no amount of moving spreads it out. */
export interface UnavoidableStack {
  skill: Skill
  /** Subjects in the plan on it. */
  total: number
  /** The fewest per full semester it can be spread to. */
  perTerm: number
}

/**
 * Every semester's load, judged as part of the whole plan: when the degree itself puts more
 * subjects on a weak skill than there are semesters (a maths major who rates maths weak), two
 * per semester is as spread as it gets — said once for the plan, not as a warning on each term.
 */
export function planStress(
  terms: string[][],
  data: Dataset,
  profile?: Profile,
): { terms: TermStress[]; unavoidable: UnavoidableStack[] } {
  const full = terms.filter((t) => t.length >= 3)
  const weak = weakSkills(data, profile)
  const unavoidable: UnavoidableStack[] = []
  const stackFloor: Partial<Record<Skill, number>> = {}
  for (const skill of weak) {
    const total = full.flat().filter((c) => {
      const s = data.subjects[c]
      return s !== undefined && skillsOf(s, data).includes(skill)
    }).length
    const perTerm = full.length ? Math.ceil(total / full.length) : 0
    if (perTerm >= 2) {
      stackFloor[skill] = perTerm
      unavoidable.push({ skill, total, perTerm })
    }
  }
  return { terms: terms.map((t) => termStress(t, data, profile, { stackFloor })), unavoidable }
}

function examShare(s: Subject): number {
  return (s.assessment ?? []).filter((t) => t.kind === 'exam').reduce((sum, t) => sum + t.weight, 0)
}

/** Skills the student is weak at: rated 1–2 themselves, or (unrated) a past average below WEAK_MARK. */
export function weakSkills(data: Dataset, profile?: Profile): Set<Skill> {
  const weak = new Set<Skill>()
  for (const skill of STACKING) {
    const self = profile?.skills[skill]
    if (self !== undefined ? self <= 2 : weakAverage(skill, data, profile) !== null) weak.add(skill)
  }
  return weak
}

/** The student's past average in a skill's subjects when it marks a weakness, else null. */
function weakAverage(skill: Skill, data: Dataset, profile?: Profile): number | null {
  const marks = pastMarks(skill, data, profile)
  if (!marks.length) return null
  const avg = Math.round(marks.reduce((a, b) => a + b, 0) / marks.length)
  return avg < (marks.length >= 2 ? WEAK_MARK : WEAK_SINGLE_MARK) ? avg : null
}

/** The student's marks in past subjects that lean on this skill. */
function pastMarks(skill: Skill, data: Dataset, profile?: Profile): number[] {
  return (profile?.results ?? [])
    .filter((r) => r.mark !== undefined)
    .filter((r) => {
      const s = data.subjects[r.code]
      return s !== undefined && skillsOf(s, data).includes(skill)
    })
    .map((r) => r.mark as number)
}
