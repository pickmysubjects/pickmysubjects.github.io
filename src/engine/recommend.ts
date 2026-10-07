import { offeredIn } from './availability'
import { evaluateField, referencedSubjects, type Tri } from './expr'
import type { Note, Params } from './plan'
import type { Dataset, Period, Subject } from './schema'

export const SKILLS = [
  'programming',
  'algorithms',
  'maths',
  'statistics',
  'data',
  'systems',
  'writing',
  'presentation',
  'lab',
  'design',
  'business',
] as const
export type Skill = (typeof SKILLS)[number]

export type Goal = 'wam' | 'balanced' | 'challenge'

export interface Profile {
  /** Completed subjects; marks are optional (0–100). */
  results: { code: string; mark?: number }[]
  /** Self-rated skill levels, 1 (weak) – 5 (strong). Missing = not rated. */
  skills: Partial<Record<Skill, number>>
  /** Topic tags the student is interested in, e.g. "machine-learning". */
  interests: string[]
  goal: Goal
}

export interface Recommendation {
  code: string
  title: string
  /** 0–100. Only meaningful alongside `reasons`. */
  score: number
  confidence: 'low' | 'medium' | 'high'
  eligibility: Tri
  reasons: Note[]
  warnings: Note[]
}

export interface RecommendOptions {
  /** Subjects already in the plan (not yet completed). */
  planned?: string[]
  /** Restrict to subjects offered in this term. */
  term?: { year: number; period: Period }
  course?: string
  /** Only recommend subjects in this category for `course` (e.g. "breadth"). */
  category?: string
  /** Only recommend subjects at this level. */
  level?: number
  /**
   * Subjects that count as done for prerequisite checks. Defaults to completed + planned;
   * the generator narrows it to subjects in *earlier* terms.
   */
  eligibleWith?: string[]
  limit?: number
}

const WEIGHTS: Record<Goal, Record<Signal, number>> = {
  wam: { ease: 0.35, predicted: 0.25, skillFit: 0.2, interest: 0.15, unlocks: 0.05 },
  balanced: { ease: 0.2, predicted: 0.2, skillFit: 0.2, interest: 0.3, unlocks: 0.1 },
  challenge: { ease: 0, predicted: 0.1, skillFit: 0.2, interest: 0.45, unlocks: 0.25 },
}

type Signal = 'ease' | 'predicted' | 'skillFit' | 'interest' | 'unlocks'
const MIN_REVIEWS = 3

export const PASS_MARK = 50

/**
 * Subjects that count as done: passed, or completed without a mark entered.
 * A failed subject (mark below 50) can be planned again.
 */
export function passedCodes(results: Profile['results']): string[] {
  return results.filter((r) => r.mark === undefined || r.mark >= PASS_MARK).map((r) => r.code)
}

/** Credit-point weighted average of marked results, fails included (UniMelb WAM is points-weighted). */
export function computeWam(results: Profile['results'], data: Dataset): number | null {
  let weighted = 0
  let points = 0
  for (const r of results) {
    if (r.mark === undefined) continue
    const pts = data.subjects[r.code]?.points ?? 12.5
    weighted += r.mark * pts
    points += pts
  }
  return points > 0 ? Math.round((weighted / points) * 10) / 10 : null
}

export function recommend(data: Dataset, profile: Profile, opts: RecommendOptions = {}): Recommendation[] {
  const completed = new Set(passedCodes(profile.results))
  const taken = new Set([...completed, ...(opts.planned ?? [])])
  const wam = computeWam(profile.results, data)
  const marks = new Map(profile.results.filter((r) => r.mark !== undefined).map((r) => [r.code, r.mark as number]))
  const dependents = buildDependents(data)

  const recs: Recommendation[] = []
  for (const s of Object.values(data.subjects)) {
    if (taken.has(s.code)) continue
    if (s.nonAllowed !== 'unknown' && s.nonAllowed.some((c) => taken.has(c))) continue
    if (opts.course && opts.category && s.categories[opts.course] !== opts.category) continue
    if (opts.level !== undefined && s.level !== opts.level) continue
    if (opts.term && offeredIn(s, opts.term.year, opts.term.period).status === 'fail') continue

    const eligibleWith = opts.eligibleWith ? new Set(opts.eligibleWith) : taken
    const pre = evaluateField(s.prerequisites, {
      completed: eligibleWith,
      subjects: data.subjects,
      admittedCourse: opts.course,
    })
    if (pre.status === 'fail') continue

    recs.push(score(s, { profile, data, wam, marks, dependents, eligibility: pre.status, unmet: pre.unmet }))
  }

  recs.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
  return opts.limit ? recs.slice(0, opts.limit) : recs
}

interface ScoreCtx {
  profile: Profile
  data: Dataset
  wam: number | null
  marks: Map<string, number>
  dependents: Map<string, string[]>
  eligibility: Tri
  unmet: string[]
}

function note(key: string, params: Params, text: string): Note {
  return { key, params, text }
}

function score(s: Subject, ctx: ScoreCtx): Recommendation {
  const reasons: Note[] = []
  const warnings: Note[] = []
  const parts: Partial<Record<Signal, number>> = {}

  // Skill fit: how well the student's self-rated skills cover what the subject uses.
  const rated = s.skills.filter((k): k is Skill => ctx.profile.skills[k as Skill] !== undefined)
  if (rated.length > 0) {
    const fits = rated.map((k) => ((ctx.profile.skills[k] ?? 3) - 1) / 4)
    parts.skillFit = avg(fits)
    const strong = rated.filter((k) => (ctx.profile.skills[k] ?? 0) >= 4)
    const weak = rated.filter((k) => (ctx.profile.skills[k] ?? 5) <= 2)
    if (strong.length) reasons.push(note('strengths', { skills: strong.join(', ') }, `Uses your strengths: ${strong.join(', ')}.`))
    if (weak.length) warnings.push(note('weakSkills', { skills: weak.join(', ') }, `Leans on ${weak.join(', ')}, which you rated as weaker.`))
  }

  // Interest: overlap between the subject's topics and the student's interests.
  if (s.topics.length > 0 && ctx.profile.interests.length > 0) {
    const hit = s.topics.filter((t) => ctx.profile.interests.includes(t))
    parts.interest = Math.min(1, hit.length / Math.min(2, s.topics.length))
    if (hit.length) reasons.push(note('interests', { topics: hit.join(', ') }, `Covers ${hit.join(', ')}, which you're interested in.`))
  }

  // Predicted performance: marks in its prerequisites / same area, else overall WAM.
  const related = [...new Set([...referencedSubjects(s.prerequisites), ...sameArea(s, ctx)])].filter((c) =>
    ctx.marks.has(c),
  )
  if (related.length > 0) {
    const m = avg(related.map((c) => ctx.marks.get(c) as number))
    parts.predicted = clamp((m - 50) / 50)
    const text = `${Math.round(m)} in related subjects (${related.join(', ')})`
    const params = { mark: Math.round(m), codes: related.join(', ') }
    if (m >= 70) reasons.push(note('averagedHigh', params, `You averaged ${text}.`))
    else if (m < 55) warnings.push(note('averagedLow', params, `You averaged only ${text}, so this may be tough.`))
  } else if (ctx.wam !== null) {
    parts.predicted = clamp((ctx.wam - 50) / 50)
  }

  // Ease from crowd signals, shrunk toward neutral when there are few reviews.
  if (s.signals) {
    const raw = (5 - s.signals.difficulty + (5 - s.signals.workload) + (s.signals.grading - 1)) / 12
    const trust = Math.min(1, s.signals.reviews / MIN_REVIEWS)
    parts.ease = 0.5 + (raw - 0.5) * trust
    const n = `${s.signals.reviews} review${s.signals.reviews === 1 ? '' : 's'}`
    const { difficulty, workload, grading, reviews } = s.signals
    if (reviews < MIN_REVIEWS) warnings.push(note('fewReviews', { n: reviews }, `Only ${n} so far — difficulty data is thin.`))
    else {
      if (difficulty >= 4) warnings.push(note('hard', { score: difficulty, n: reviews }, `Students rate it hard (${difficulty}/5, ${n}).`))
      if (workload >= 4) warnings.push(note('heavy', { score: workload, n: reviews }, `Heavy workload (${workload}/5, ${n}).`))
      if (grading >= 4) reasons.push(note('generous', { score: grading, n: reviews }, `Students say marking is generous (${grading}/5, ${n}).`))
      if (difficulty <= 2) reasons.push(note('approachable', { score: difficulty, n: reviews }, `Students rate it approachable (${difficulty}/5, ${n}).`))
    }
  }

  // Pathway value: subjects it unlocks that match the student's interests.
  const unlocks = (ctx.dependents.get(s.code) ?? []).filter((c) => {
    const d = ctx.data.subjects[c]
    return d !== undefined && d.topics.some((t) => ctx.profile.interests.includes(t))
  })
  if (unlocks.length > 0) {
    parts.unlocks = Math.min(1, unlocks.length / 3)
    const codes = `${unlocks.slice(0, 3).join(', ')}${unlocks.length > 3 ? '…' : ''}`
    reasons.push(note('unlocks', { codes }, `Opens up ${codes}.`))
  }

  if (ctx.eligibility === 'unknown') {
    const needs = ctx.unmet.join('; ')
    warnings.push(note('eligibilityUnknown', { needs }, `Eligibility not confirmed: ${needs}.`))
  }

  const weights = WEIGHTS[ctx.profile.goal]
  const present = (Object.keys(parts) as Signal[]).filter((k) => weights[k] > 0)
  const totalWeight = present.reduce((sum, k) => sum + weights[k], 0)
  const value = totalWeight > 0 ? present.reduce((sum, k) => sum + weights[k] * (parts[k] as number), 0) / totalWeight : 0.5
  const confidence = present.length >= 4 ? 'high' : present.length >= 2 ? 'medium' : 'low'

  return {
    code: s.code,
    title: s.title,
    score: Math.round(value * 100),
    confidence,
    eligibility: ctx.eligibility,
    reasons,
    warnings,
  }
}

function sameArea(s: Subject, ctx: ScoreCtx): string[] {
  return [...ctx.marks.keys()].filter((c) => ctx.data.subjects[c]?.area === s.area)
}

/** code -> subjects whose prerequisites mention it. */
function buildDependents(data: Dataset): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const s of Object.values(data.subjects)) {
    for (const ref of referencedSubjects(s.prerequisites)) {
      map.set(ref, [...(map.get(ref) ?? []), s.code])
    }
  }
  return map
}

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}

function clamp(x: number): number {
  return Math.max(0, Math.min(1, x))
}
