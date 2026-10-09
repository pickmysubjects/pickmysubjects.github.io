import { offeredIn, periodsFor } from './availability'
import { evaluateField, referencedSubjects, type Tri } from './expr'
import type { Note, Params } from './plan'
import type { Dataset, Period, Skill, Subject } from './schema'
import { relatedTopics, topicsOf } from './topics'


export type Goal = 'wam' | 'balanced' | 'challenge'

export interface Profile {
  /** Completed subjects; marks are optional (0–100). */
  results: { code: string; mark?: number }[]
  /** Self-rated skill levels, 1 (weak) – 5 (strong). Missing = not rated. */
  skills: Partial<Record<Skill, number>>
  /** Topic tags the student is interested in, e.g. "machine-learning". */
  interests: string[]
  goal: Goal
  /** Subjects whose uncheckable prerequisites (e.g. a VCE score) the student says they meet. */
  confirmed?: string[]
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
  /** "Now", for skipping subjects that aren't running soon. Defaults to this year. */
  year?: number
  /** Only subjects up to this level (e.g. year-1 students see level 1). */
  maxLevel?: number
}

const WEIGHTS: Record<Goal, Record<Signal, number>> = {
  wam: { ease: 0.35, predicted: 0.25, skillFit: 0.2, interest: 0.15, unlocks: 0.05 },
  balanced: { ease: 0.2, predicted: 0.2, skillFit: 0.2, interest: 0.3, unlocks: 0.1 },
  challenge: { ease: 0, predicted: 0.1, skillFit: 0.2, interest: 0.45, unlocks: 0.25 },
}

type Signal = 'ease' | 'predicted' | 'skillFit' | 'interest' | 'unlocks'
const MIN_REVIEWS = 3
/** Interest scores: two tagged matches, one, an area-implied match, a related topic. */
const INTEREST_FULL = 1
const INTEREST_ONE = 0.8
const INTEREST_INFERRED = 0.6
const INTEREST_RELATED = 0.55
/** No match: nothing known about it, a broad area-implied mismatch, a tagged mismatch. */
const INTEREST_UNKNOWN = 0.3
const INTEREST_INFERRED_MISS = 0.2
/** How many related marks it takes before they outweigh the overall WAM (Bayesian shrinkage). */
const MARK_PRIOR_WEIGHT = 2
/** Ratings are averaged with the site-wide average as if it were this many extra reviews. */
const RATING_PRIOR_REVIEWS = 5
const MIN_RATED_FOR_PRIOR = 10
/** Re-ranking only swaps near-ties: subjects within this many points of each other. */
const TIE_POINTS = 3
/** A subject that doesn't run in this many years from now isn't worth suggesting. */
const RUN_HORIZON_YEARS = 2
/** Interest score for a subject that isn't on a topic you like but leads to one that is, less per extra step. */
const PATHWAY_INTEREST = 0.7
const PATHWAY_STEP = 0.08
const PATHWAY_MAX_STEPS = 3

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
  // Non-allowed works both ways, but the Handbook often lists it on one side only.
  const blocked = new Set(
    [...taken].flatMap((c) => {
      const t = data.subjects[c]
      return t && t.nonAllowed !== 'unknown' ? t.nonAllowed : []
    }),
  )

  // Prerequisites of subjects already passed: going back to them adds nothing
  // (e.g. COMP10001 after COMP10002).
  const behind = new Set(
    [...completed].flatMap((c) => {
      const d = data.subjects[c]
      return d ? referencedSubjects(d.prerequisites) : []
    }),
  )

  const creditCourses = new Set(Object.values(data.subjects).flatMap((x) => Object.keys(x.categories)))
  const ratingMean = siteRatingMean(data)

  const recs: Recommendation[] = []
  for (const s of Object.values(data.subjects)) {
    if (taken.has(s.code) || behind.has(s.code)) continue
    if (blocked.has(s.code)) continue
    if (s.nonAllowed !== 'unknown' && s.nonAllowed.some((c) => taken.has(c))) continue
    if (opts.course && opts.category && s.categories[opts.course] !== opts.category) continue
    if (opts.level !== undefined && s.level !== opts.level) continue
    if (opts.maxLevel !== undefined && s.level > opts.maxLevel) continue
    if (opts.term && offeredIn(s, opts.term.year, opts.term.period).status === 'fail') continue
    // Without a chosen term: skip subjects we know aren't running soon.
    if (!opts.term && !runsSoon(s, opts.year ?? new Date().getFullYear())) continue
    // In a course where other subjects are categorised, an uncategorised one doesn't count for credit.
    if (opts.course && creditCourses.has(opts.course) && !s.categories[opts.course]) continue

    const eligibleWith = opts.eligibleWith ? new Set(opts.eligibleWith) : taken
    const pre = evaluateField(s.prerequisites, {
      completed: eligibleWith,
      subjects: data.subjects,
      admittedCourse: opts.course,
    })
    if (pre.status === 'fail') continue
    // A condition only the student can check (a VCE score) that they said they meet.
    const eligibility = pre.status === 'unknown' && profile.confirmed?.includes(s.code) ? 'ok' : pre.status

    recs.push(score(s, { profile, data, wam, marks, dependents, eligibility, unmet: pre.unmet, ratingMean, taken }))
  }

  recs.sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
  const ranked = diversify(recs, data)
  return opts.limit ? ranked.slice(0, opts.limit) : ranked
}

interface ScoreCtx {
  profile: Profile
  data: Dataset
  wam: number | null
  marks: Map<string, number>
  dependents: Map<string, string[]>
  eligibility: Tri
  unmet: string[]
  /** Site-wide average ease, the prior that a subject's own ratings are shrunk toward. */
  ratingMean: number
  /** Passed or planned: not worth pointing to as "opens up". */
  taken: Set<string>
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
  // A subject that leads to an interesting one counts too, a bit less (the
  // first-year subject on the way to Machine Learning); a subject with no
  // curated topics stays neutral rather than looking like a mismatch.
  const interests = ctx.profile.interests
  const path = interests.length ? pathTo(s.code, interests, ctx) : { steps: 0, codes: [] }
  const leadsTo = path.codes
  if (interests.length > 0) {
    const { topics, inferred } = topicsOf(s)
    const hit = topics.filter((t) => interests.includes(t))
    const near = topics.some((t) => interests.some((i) => relatedTopics(t, i)))
    // One shared interest is already a strong signal; a second makes it a full match.
    // A topic only implied by the area code ("a biology subject") counts for less, and
    // a related topic (AI when you picked machine learning) for less again.
    const direct = hit.length === 0 ? 0 : inferred ? INTEREST_INFERRED : hit.length >= 2 ? INTEREST_FULL : INTEREST_ONE
    const viaPath = path.steps ? PATHWAY_INTEREST - PATHWAY_STEP * (path.steps - 1) : 0
    const related = near ? INTEREST_RELATED : 0
    const best = Math.max(direct, viaPath, related)
    if (best > 0) parts.interest = best
    // The area code is a coarse guess, so a mismatch there counts for less than a tagged one.
    else if (topics.length) parts.interest = inferred ? INTEREST_INFERRED_MISS : 0
    // Nothing known about what it covers: a little under neutral, so it can't tie with a real match.
    else parts.interest = INTEREST_UNKNOWN
    if (hit.length) reasons.push(note('interests', { topics: hit.join(', ') }, `Covers ${hit.join(', ')}, which you're interested in.`))
  }

  // Predicted performance: marks in its prerequisites / same area, else overall WAM.
  // Its own prerequisites say most about how you'll go, same-area subjects less;
  // with only a mark or two the estimate leans back toward your WAM.
  const prereqs = new Set(referencedSubjects(s.prerequisites))
  const related = [...new Set([...prereqs, ...sameArea(s, ctx)])].filter((c) => ctx.marks.has(c))
  if (related.length > 0) {
    let sum = 0
    let weight = 0
    for (const c of related) {
      const w = prereqs.has(c) ? 1 : 0.6
      sum += w * (ctx.marks.get(c) as number)
      weight += w
    }
    const own = sum / weight
    const m = ctx.wam === null ? own : (sum + MARK_PRIOR_WEIGHT * ctx.wam) / (weight + MARK_PRIOR_WEIGHT)
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
    // Ease from whichever of the three averages we have (each on 0–4).
    const easeParts = [
      s.signals.difficulty === undefined ? undefined : 5 - s.signals.difficulty,
      s.signals.workload === undefined ? undefined : 5 - s.signals.workload,
      s.signals.grading === undefined ? undefined : s.signals.grading - 1,
    ].filter((x): x is number => x !== undefined)
    // Bayesian average: few reviews stay close to the site-wide average.
    if (easeParts.length) {
      const raw = easeParts.reduce((a, b) => a + b, 0) / (4 * easeParts.length)
      const n = s.signals.reviews
      parts.ease = (raw * n + ctx.ratingMean * RATING_PRIOR_REVIEWS) / (n + RATING_PRIOR_REVIEWS)
    }
    const n = `${s.signals.reviews} review${s.signals.reviews === 1 ? '' : 's'}`
    const { difficulty, workload, grading, reviews } = s.signals
    if (reviews < MIN_REVIEWS) warnings.push(note('fewReviews', { n: reviews }, `Only ${n} so far — difficulty data is thin.`))
    else {
      if (difficulty !== undefined && difficulty >= 4) warnings.push(note('hard', { score: difficulty, n: reviews }, `Students rate it hard (${difficulty}/5, ${n}).`))
      if (workload !== undefined && workload >= 4) warnings.push(note('heavy', { score: workload, n: reviews }, `Heavy workload (${workload}/5, ${n}).`))
      if (grading !== undefined && grading >= 4) reasons.push(note('generous', { score: grading, n: reviews }, `Students say marking is generous (${grading}/5, ${n}).`))
      if (difficulty !== undefined && difficulty <= 2) reasons.push(note('approachable', { score: difficulty, n: reviews }, `Students rate it approachable (${difficulty}/5, ${n}).`))
    }
  }

  // No ratings of our own yet: what the public review summary says stands in, a little
  // either side of neutral, until students rate it here.
  if (!s.signals || s.signals.reviews < MIN_REVIEWS) {
    const d = s.discussion
    if (d?.difficulty === 'hard') warnings.push(note('reviewsHard', {}, 'Public reviews say it is hard.'))
    if (d?.workload === 'heavy') warnings.push(note('reviewsHeavy', {}, 'Public reviews say it takes a lot of time.'))
    if (d?.difficulty === 'easy') reasons.push(note('reviewsEasy', {}, 'Public reviews say it is manageable.'))
    // Worth about as much as a handful of ratings: close to neutral, so it nudges rather than
    // reorders. A heavy workload is shown as a warning and counts in the semester check, but
    // costs time, not marks, so it doesn't count against ease here.
    if (parts.ease === undefined && (d?.difficulty === 'hard' || d?.difficulty === 'easy')) parts.ease = d.difficulty === 'hard' ? 0.42 : 0.58
  }

  // Pathway value: subjects it unlocks that match the student's interests.
  const unlocks = leadsTo
  if (unlocks.length > 0) {
    parts.unlocks = Math.min(1, unlocks.length / 3)
    const codes = `${unlocks.slice(0, 3).join(', ')}${unlocks.length > 3 ? '…' : ''}`
    reasons.push(note('unlocks', { codes }, `Opens up ${codes}.`))
  }

  if (ctx.eligibility === 'unknown') {
    const needs = ctx.unmet.join('; ')
    warnings.push(note('eligibilityUnknown', { needs }, `Eligibility not confirmed: ${needs}.`))
  }

  // Signals we have no data for count as neutral (0.5), so a subject can't
  // outrank a well-documented one just by having less known about it.
  const weights = WEIGHTS[ctx.profile.goal]
  const present = (Object.keys(parts) as Signal[]).filter((k) => weights[k] > 0)
  const signalKeys = (Object.keys(weights) as Signal[]).filter((k) => weights[k] > 0)
  const totalWeight = signalKeys.reduce((sum, k) => sum + weights[k], 0)
  const value = signalKeys.reduce((sum, k) => sum + weights[k] * (parts[k] ?? 0.5), 0) / totalWeight
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

/**
 * Nearest subjects (within a few prerequisite steps) that this one leads to and
 * that cover one of the student's interests.
 */
function pathTo(code: string, interests: string[], ctx: ScoreCtx): { steps: number; codes: string[] } {
  let frontier = [code]
  const seen = new Set(frontier)
  for (let steps = 1; steps <= PATHWAY_MAX_STEPS; steps++) {
    frontier = frontier.flatMap((c) => ctx.dependents.get(c) ?? []).filter((c) => !seen.has(c) && seen.add(c))
    const hits = frontier.filter((c) => !ctx.taken.has(c) && ctx.data.subjects[c]?.topics.some((t) => interests.includes(t)))
    if (hits.length) return { steps, codes: hits }
    if (frontier.length === 0) break
  }
  return { steps: 0, codes: [] }
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

/** Known to run in this year or the next few; unknown timetables get the benefit of the doubt. */
function runsSoon(s: Subject, year: number): boolean {
  if (s.offerings === 'unknown') return true
  for (let d = 0; d < RUN_HORIZON_YEARS; d++) if (periodsFor(s, year + d).length > 0) return true
  return false
}

/** Average ease (0–1) over all rated subjects; 0.5 until enough are rated. */
function siteRatingMean(data: Dataset): number {
  const vals: number[] = []
  for (const s of Object.values(data.subjects)) {
    const g = s.signals
    if (!g || g.reviews === 0) continue
    const xs = [g.difficulty === undefined ? undefined : 5 - g.difficulty, g.workload === undefined ? undefined : 5 - g.workload, g.grading === undefined ? undefined : g.grading - 1].filter(
      (x): x is number => x !== undefined,
    )
    if (xs.length) vals.push(xs.reduce((a, b) => a + b, 0) / (4 * xs.length))
  }
  // Until enough subjects are rated, the site-wide average is itself unreliable.
  return vals.length >= MIN_RATED_FOR_PRIOR ? avg(vals) : 0.5
}

/**
 * Variety without hiding better matches: when the next pick would make three in a row
 * from the same area, take the best subject from another area instead, but only if
 * it's within a few points. Scores are unchanged; only near-ties move.
 */
function diversify(recs: Recommendation[], data: Dataset): Recommendation[] {
  const pool = [...recs]
  const out: Recommendation[] = []
  const area = (r: Recommendation) => data.subjects[r.code]?.area
  while (pool.length) {
    const top = pool[0] as Recommendation
    const [a, b] = [out.at(-1), out.at(-2)]
    const streak = a && b && area(a) === area(top) && area(b) === area(top)
    const alt = streak ? pool.findIndex((r) => area(r) !== area(top) && top.score - r.score <= TIE_POINTS) : -1
    out.push(pool.splice(alt > 0 ? alt : 0, 1)[0] as Recommendation)
  }
  return out
}

/** The highest level a student can usually take: year 1 until 100 points are done, and so on. */
export function yearLevel(results: Profile['results'], data: Dataset): number {
  const done = passedCodes(results).reduce((sum, c) => sum + (data.subjects[c]?.points ?? 12.5), 0)
  return Math.min(3, Math.floor(done / 100) + 1)
}
