import type { Profile } from './recommend'
import type { Dataset, Skill, Subject } from './schema'

/**
 * How hard one semester's subjects are to carry together.
 *
 * Follows course load analytics (Pardos & Borchers, "Credit hours is not enough", 2023):
 * credit points say little about workload, so each subject gets a load on three dimensions —
 * time in teaching weeks (class hours, coursework, rated workload), mental effort (difficulty,
 * and how well it suits this student) and exam stress (how much rides on the final and how
 * hard students found it) — and a semester's load is the sum of its subjects'. A subject can be
 * light week to week and brutal at exam time, or the other way round; the two are kept apart. "Typical" comes from the data: the semesters the plan builder makes for
 * every major (worked out when the data is built). A semester's overall score is its heaviest
 * dimension as a multiple of the typical; "heavy" is the top 15% of real semesters and "very
 * heavy" the top 3%.
 *
 * On top of the sum, subjects that lean on the same skill the student is weak at (two maths
 * subjects for someone who struggles with maths) add effort: they compete for the same study time.
 */

export type StressLevel = 'ok' | 'heavy' | 'veryHeavy'
export type Dimension = 'time' | 'effort' | 'stress'

export interface StressReason {
  /** i18n key under `stress.` */
  key: 'stackWeak' | 'stackMarks' | 'stack' | 'time' | 'effort' | 'exams' | 'examsHard'
  params: Record<string, string | number>
}

export interface TermStress {
  level: StressLevel
  reasons: StressReason[]
  /**
   * How close the semester is to heavy (1 is the line), plus a step for each weak-skill stack.
   * For comparing semesters (balancing).
   */
  score: number
}

/** Skills that wear you down when two subjects lean on them in the same semester. */
const STACKING: Skill[] = ['maths', 'programming', 'statistics', 'writing', 'lab']
/** Stacking on these is mentioned even when we don't know the student; the rest only when they're weak at it. */
const ALWAYS_NOTE: Skill[] = ['maths', 'programming', 'statistics']
/** Skills that make a subject harder than its level alone suggests. */
const DEMANDING: Skill[] = ['maths', 'programming', 'statistics']

/** What a subject leans on when nobody has tagged it: by its area code. */
const AREA_SKILLS: Record<string, Skill[]> = {
  MAST: ['maths'],
  ACTL: ['maths', 'statistics'],
  PHYC: ['maths'],
  COMP: ['programming'],
  SWEN: ['programming'],
  INFO: ['programming'],
  CHEM: ['lab'],
  BCMB: ['lab'],
  MIIM: ['lab'],
  PATH: ['lab'],
}

export function skillsOf(s: Subject): Skill[] {
  return s.skills.length ? s.skills : (AREA_SKILLS[s.area ?? s.code.slice(0, 4)] ?? [])
}

/** A past average below this in a skill's subjects counts as a weakness; at or above STRONG_MARK, a strength. */
export const WEAK_MARK = 65
export const STRONG_MARK = 80
/** Typical weekly class hours when a subject's aren't recorded. */
const DEFAULT_HOURS = 3.5
/** Final-exam share assumed when a subject's assessment isn't recorded (about the median). */
const DEFAULT_EXAM = 50
/** Extra effort for each further subject leaning on a skill the student is weak at. */
const STACK_PENALTY = 0.6

type Load = Record<Dimension, number>

/** One subject's load, without anything about the student. */
function baseLoad(s: Subject): Load {
  const sig = s.signals && s.signals.reviews >= 3 ? s.signals : undefined
  const hours = s.weeklyContactHours ?? DEFAULT_HOURS
  // Rated workload 3/5 is typical; 5/5 adds 40% to the time, 1/5 takes 40% off.
  // Teaching weeks: class time (scaled by rated workload) plus the coursework done along the way —
  // a subject marked mostly on assignments and projects keeps you busy every week, whatever its exam.
  const coursework = s.assessment ? (100 - examShare(s)) / 100 : 0.5
  const time =
    hours * (sig?.workload !== undefined ? 0.4 + 0.2 * sig.workload : 1) + 1.5 * coursework + ((s.assessment?.length ?? 0) > 5 ? 0.5 : 0)
  const effort =
    sig?.difficulty ?? 2.5 + 0.5 * (Math.min(s.level, 3) - 1) + (skillsOf(s).some((k) => DEMANDING.includes(k)) ? 0.3 : 0)
  const exam = s.assessment ? examShare(s) : DEFAULT_EXAM
  const stress =
    1 + 2 * (exam / 100) + (s.assessment?.some((t) => t.kind === 'exam' && t.hurdle) ? 0.5 : 0) + (sig?.examDifficulty !== undefined ? (sig.examDifficulty - 3) * 0.3 : 0)
  return { time, effort, stress }
}

/** The same, adjusted for how well the subject suits this student. */
function loadFor(s: Subject, data: Dataset, profile?: Profile): Load {
  const load = baseLoad(s)
  if (!profile) return load
  const skills = skillsOf(s)
  const rated = skills.map((k) => profile.skills[k]).filter((x): x is number => x !== undefined)
  if (rated.length) load.effort += (3 - rated.reduce((a, b) => a + b, 0) / rated.length) * 0.4
  else {
    const marks = skills.map((k) => pastAverage(k, data, profile)).filter((x): x is number => x !== null)
    const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : null
    if (avg !== null && avg < WEAK_MARK) load.effort += 0.5
    if (avg !== null && avg >= STRONG_MARK) load.effort -= 0.3
  }
  return load
}

/**
 * What a real semester looks like, per subject: the typical (median) load on each dimension,
 * the level that counts as high on it (85th percentile), and cutoffs on the overall score —
 * the heaviest dimension as a multiple of typical — at its 85th and 97th percentile.
 */
export interface Cutoffs {
  typical: Record<Dimension, number>
  high: Record<Dimension, number>
  heavy: number
  veryHeavy: number
}

const DIMS = ['time', 'effort', 'stress'] as const
const Q_HIGH = 0.85
const Q_HEAVY = 0.85
const Q_VERY_HEAVY = 0.97
const round = (x: number) => Math.round(x * 1000) / 1000
const at = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.floor(q * (xs.length - 1))] as number

function perSubject(loads: Load[]): Load {
  const out: Load = { time: 0, effort: 0, stress: 0 }
  for (const l of loads) for (const d of DIMS) out[d] += l[d] / loads.length
  return out
}

/** Cutoffs from a set of semesters, each given as its subjects' loads. */
function calibrate(terms: Load[][]): Cutoffs {
  const avgs = terms.filter((t) => t.length >= 3).map(perSubject)
  const typical = Object.fromEntries(DIMS.map((d) => [d, round(at(avgs.map((a) => a[d]), 0.5))])) as Record<Dimension, number>
  const high = Object.fromEntries(DIMS.map((d) => [d, round(at(avgs.map((a) => a[d]), Q_HIGH))])) as Record<Dimension, number>
  const overall = avgs.map((a) => Math.max(...DIMS.map((d) => a[d] / typical[d])))
  return { typical, high, heavy: round(at(overall, Q_HEAVY)), veryHeavy: round(at(overall, Q_VERY_HEAVY)) }
}

/** Cutoffs from real semesters (the plan builder's, at data-build time). */
export function calibrateCutoffs(data: Dataset, terms: string[][]): Cutoffs {
  return calibrate(terms.map((codes) => codes.map((c) => data.subjects[c]).filter((s): s is Subject => s !== undefined).map(baseLoad)))
}

const CUTOFFS = new WeakMap<Dataset, Cutoffs>()
/** Fallback for tiny datasets (tests, demo): what the 2026 Bachelor of Science data gives. */
export const DEFAULT_CUTOFFS: Cutoffs = {
  typical: { time: 4.588, effort: 3.1, stress: 2.2 },
  high: { time: 4.938, effort: 3.5, stress: 2.4 },
  heavy: 1.129,
  veryHeavy: 1.185,
}
const SAMPLES = 4000

export function loadCutoffs(data: Dataset): Cutoffs {
  if (data.stressCutoffs) return data.stressCutoffs
  const cached = CUTOFFS.get(data)
  if (cached) return cached
  // No real semesters to go by: random four-subject ones, from subjects we have full facts for.
  const known = Object.values(data.subjects).filter((s) => s.weeklyContactHours !== undefined && s.assessment !== undefined)
  if (known.length < 40) return DEFAULT_CUTOFFS
  const loads = known.map(baseLoad)
  let seed = 1
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const terms = Array.from({ length: SAMPLES }, () => Array.from({ length: 4 }, () => loads[Math.floor(rand() * loads.length)] as Load))
  const cutoffs = calibrate(terms)
  CUTOFFS.set(data, cutoffs)
  return cutoffs
}

export function termStress(codes: string[], data: Dataset, profile?: Profile): TermStress {
  const subjects = codes.map((c) => data.subjects[c]).filter((s): s is Subject => s !== undefined)
  const reasons: StressReason[] = []
  // Fewer than three subjects is a light (or part-time) semester.
  if (subjects.length < 3) return { level: 'ok', reasons, score: 0 }

  const loads = subjects.map((s) => ({ s, load: loadFor(s, data, profile) }))
  const sum: Load = { time: 0, effort: 0, stress: 0 }
  for (const { load } of loads) for (const d of ['time', 'effort', 'stress'] as const) sum[d] += load[d]

  // Subjects stacked on the same skill.
  for (const skill of STACKING) {
    const on = subjects.filter((s) => skillsOf(s).includes(skill))
    if (on.length < 2) continue
    const codesOn = on.map((s) => s.code).join(', ')
    const self = profile?.skills[skill]
    const marks = pastAverage(skill, data, profile)
    if (self !== undefined && self <= 2) {
      sum.effort += STACK_PENALTY * (on.length - 1)
      reasons.push({ key: 'stackWeak', params: { skill, codes: codesOn, n: on.length } })
    } else if (self === undefined && marks !== null && marks < WEAK_MARK) {
      sum.effort += STACK_PENALTY * (on.length - 1)
      reasons.push({ key: 'stackMarks', params: { skill, codes: codesOn, n: on.length, mark: marks } })
    } else if (self === undefined && (marks === null || marks < STRONG_MARK) && ALWAYS_NOTE.includes(skill) && on.length >= 3) {
      // We don't know how the student copes with it: worth a mention, not a verdict. Two is
      // normal for most majors (a computing student has two programming subjects most terms).
      reasons.push({ key: 'stack', params: { skill, codes: codesOn, n: on.length } })
    }
  }

  // The heaviest dimension, per subject, as a multiple of a typical semester's.
  const cutoffs = loadCutoffs(data)
  const n = subjects.length
  const per = (d: Dimension) => sum[d] / n
  const overall = Math.max(...DIMS.map((d) => per(d) / cutoffs.typical[d]))
  let level: StressLevel = overall >= cutoffs.veryHeavy ? 'veryHeavy' : overall >= cutoffs.heavy ? 'heavy' : 'ok'
  // Subjects stacked on the student's own weak spot outweigh the averages: that's the
  // combination students ask about ("Calculus 2 and Linear Algebra together, weak at maths?").
  const weakStacks = reasons.filter((r) => r.key === 'stackWeak' || r.key === 'stackMarks')
  if (weakStacks.some((r) => Number(r.params.n) >= 3) || weakStacks.length >= 2) level = 'veryHeavy'
  else if (weakStacks.length && level === 'ok') level = 'heavy'

  // Say which dimensions make it heavy (the highest one at least).
  if (level !== 'ok' && overall >= cutoffs.heavy) {
    const top = (d: Dimension) =>
      [...loads]
        .sort((a, b) => b.load[d] - a.load[d])
        .slice(0, 2)
        .map((x) => x.s.code)
        .join(', ')
    const worstDim = DIMS.reduce((a, d) => (per(d) / cutoffs.typical[d] > per(a) / cutoffs.typical[a] ? d : a))
    for (const d of DIMS) {
      if (per(d) < cutoffs.high[d] && d !== worstDim) continue
      if (d === 'time') {
        const hours = Math.round(subjects.reduce((a, s) => a + (s.weeklyContactHours ?? DEFAULT_HOURS), 0))
        reasons.push({ key: 'time', params: { hours, codes: top('time') } })
      } else if (d === 'effort') reasons.push({ key: 'effort', params: { codes: top('effort') } })
      else {
        const examHeavy = subjects.filter((s) => examShare(s) >= 60)
        if (examHeavy.length >= 2) reasons.push({ key: 'exams', params: { n: examHeavy.length, codes: examHeavy.map((s) => s.code).join(', ') } })
        else reasons.push({ key: 'examsHard', params: { codes: top('stress') } })
      }
    }
  }
  reasons.sort((a, b) => Number(a.key === 'stack') - Number(b.key === 'stack'))
  // 1 is the heavy line; weak-skill stacks push it further. For comparing semesters (balancing).
  const score = overall / cutoffs.heavy + 0.5 * weakStacks.length
  return { level, reasons, score: Math.round(score * 1000) / 1000 }
}

function examShare(s: Subject): number {
  return (s.assessment ?? []).filter((t) => t.kind === 'exam').reduce((sum, t) => sum + t.weight, 0)
}

/** The student's average mark in past subjects that lean on this skill, if they've entered any. */
function pastAverage(skill: Skill, data: Dataset, profile?: Profile): number | null {
  const marks = (profile?.results ?? [])
    .filter((r) => r.mark !== undefined)
    .filter((r) => {
      const s = data.subjects[r.code]
      return s !== undefined && skillsOf(s).includes(skill)
    })
    .map((r) => r.mark as number)
  return marks.length ? Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) : null
}
