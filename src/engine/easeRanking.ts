import { periodsFor } from './availability'
import { FITTED } from './fitted'
import { sharedOffset } from './grades'
import { discussionVerdict, type Period, type Subject } from './schema'

/**
 * "水课" and "难课": subjects ranked by how easy (or hard) they are to do well in, from our own
 * data only, each with the reasons it's there. Guidance, not a promise.
 *
 * Two kinds of evidence, kept apart:
 * - Handbook facts, known for almost every subject: final-exam share, hurdles, weekly class
 *   hours, level.
 * - What students say: the verdict tagged on a public review summary (difficulty, workload),
 *   our own ratings once 3 or more students gave them, and how shared grades sit against WAMs.
 *
 * Reviews decide the order first: subjects reviewers call easy come before any subject ranked on
 * facts alone, so a subject nobody has reviewed can never top the easy list (no data is not
 * "easy"). Facts order subjects within each group, and are all a subject without reviews has.
 */

export type RankDirection = 'easy' | 'hard'

/** One reason a subject is on a list: a message key under `rank.reason.` and its values. */
export interface RankReason {
  key: string
  params?: Record<string, string | number>
}

export interface RankedSubject {
  subject: Subject
  /** -1 (hard) … +1 (easy), from everything known. */
  score: number
  /** -1 … +1 from what students say (reviews, ratings, shared grades); null when nobody has. */
  reviews: number | null
  /** Why it's on this list, strongest first. Never empty. */
  reasons: RankReason[]
}

export interface RankOptions {
  direction: RankDirection
  /** The degree whose subjects count: subjects closed to it are left out. '' for any. */
  course: string
  year: number
  level?: number | null
  period?: Period | null
  /** Only subjects that are breadth for `course`. */
  breadthOnly?: boolean
  /** How many to return; all when left out. */
  limit?: number
}

/** Our own ratings count once this many students gave them, as everywhere on the site. */
const MIN_RATINGS = 3
/** Shared grades count once this many students shared them (grade-offsets.json does the same). */
const MIN_GRADES = 5
/** A review lean this far either side of neutral counts as "reviews say easy / hard". */
const VERDICT = 0.25
const MAX_REASONS = 4
/** The neutral prior the review score is pulled toward, in units of evidence: fitted once 30+ subjects are rated (fitted.ts). */
const REVIEW_PRIOR = FITTED.reviewPrior ?? 1

interface Evidence {
  /** -1 … +1 from Handbook facts; null when nothing is recorded. */
  facts: number | null
  /** -1 … +1 from what students say; null when nobody has. */
  reviews: number | null
  /** Each piece of what students say, on -1 … +1, with its weight (for fitting REVIEW_PRIOR). */
  parts: { value: number; weight: number }[]
  easy: RankReason[]
  hard: RankReason[]
}

const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x))
const round1 = (x: number) => Math.round(x * 10) / 10

function evidence(s: Subject): Evidence {
  const easy: RankReason[] = []
  const hard: RankReason[] = []

  // ---- what students say (strongest first, so their reasons lead) ----
  const parts: { value: number; weight: number }[] = []
  const sig = s.signals && s.signals.reviews >= MIN_RATINGS ? s.signals : undefined
  if (sig) {
    const n = sig.reviews
    if (sig.difficulty !== undefined) {
      parts.push({ value: (3 - sig.difficulty) / 2, weight: 2 })
      if (sig.difficulty <= 2.5) easy.push({ key: 'ratedEasy', params: { score: round1(sig.difficulty), n } })
      if (sig.difficulty >= 3.5) hard.push({ key: 'ratedHard', params: { score: round1(sig.difficulty), n } })
    }
    if (sig.grading !== undefined) {
      parts.push({ value: (sig.grading - 3) / 2, weight: 2 })
      if (sig.grading >= 3.5) easy.push({ key: 'generous', params: { score: round1(sig.grading), n } })
      if (sig.grading <= 2.5) hard.push({ key: 'harsh', params: { score: round1(sig.grading), n } })
    }
    // How hard the exams and assignments were: it's about marks, but overlaps difficulty, so it
    // counts once alongside it rather than as a second full vote.
    if (sig.examDifficulty !== undefined) parts.push({ value: (3 - sig.examDifficulty) / 2, weight: 1 })
    if (sig.workload !== undefined) {
      parts.push({ value: (3 - sig.workload) / 2, weight: 1 })
      if (sig.workload <= 2.5) easy.push({ key: 'ratedLight', params: { score: round1(sig.workload), n } })
      if (sig.workload >= 3.5) hard.push({ key: 'ratedHeavy', params: { score: round1(sig.workload), n } })
    }
  }
  // What the shared grades alone say: an offset moved by the feature prior would count the
  // Handbook facts and review verdicts below a second time.
  const g = s.gradeOffset && s.gradeOffset.n >= MIN_GRADES ? { n: s.gradeOffset.n, offset: sharedOffset(s.gradeOffset) } : undefined
  if (g) {
    parts.push({ value: clamp(g.offset / 8), weight: 3 })
    const params = { n: g.n, by: Math.abs(Math.round(g.offset)) }
    if (g.offset >= 2) easy.push({ key: 'gradesAbove', params })
    if (g.offset <= -2) hard.push({ key: 'gradesBelow', params })
  }
  // All public summaries together: sources that disagree give no verdict (see discussionVerdict).
  const many = (n: number) => 0.5 + 0.5 * Math.min(n, 10) / 10
  const diff = discussionVerdict(s.discussions, 'difficulty')
  if (diff) {
    const n = diff.n
    parts.push({ value: diff.value === 'easy' ? 1 : diff.value === 'hard' ? -1 : 0, weight: 2 * many(n) })
    if (diff.value === 'easy') easy.push({ key: 'reviewsEasy', params: { n } })
    if (diff.value === 'hard') hard.push({ key: 'reviewsHard', params: { n } })
  }
  // A heavy workload costs time more than marks: it counts, but less than difficulty.
  const work = discussionVerdict(s.discussions, 'workload')
  if (work && (work.value === 'light' || work.value === 'heavy')) {
    const n = work.n
    parts.push({ value: work.value === 'light' ? 1 : -1, weight: many(n) })
    if (work.value === 'light') easy.push({ key: 'reviewsLight', params: { n } })
    else hard.push({ key: 'reviewsHeavy', params: { n } })
  }
  // A neutral prior worth one unit: a single verdict (workload only) leans less than several
  // that agree, and a summary of 10 reviews counts for more than one of 3.
  const weight = parts.reduce((a, p) => a + p.weight, 0)
  const reviews = weight ? parts.reduce((a, p) => a + p.value * p.weight, 0) / (weight + REVIEW_PRIOR) : null

  // ---- Handbook facts ----
  let facts: number | null = null
  const tasks = s.assessment
  if (tasks) {
    const exam = Math.round(tasks.filter((t) => t.kind === 'exam').reduce((a, t) => a + t.weight, 0))
    // The more rides on one exam, the riskier for a mark: ±0.5 from all coursework to all exam.
    let f = ((50 - exam) / 50) * 0.5
    if (exam === 0) easy.push({ key: 'noExam' })
    else if (exam <= 30) easy.push({ key: 'smallExam', params: { n: exam } })
    else if (exam >= 60) hard.push({ key: 'bigExam', params: { n: exam } })
    const examHurdle = tasks.some((t) => t.kind === 'exam' && t.hurdle)
    const otherHurdles = tasks.filter((t) => t.kind !== 'exam' && t.hurdle).length
    if (examHurdle) {
      f -= 0.15
      hard.push({ key: 'examHurdle' })
    }
    if (otherHurdles) {
      f -= Math.min(2, otherHurdles) * 0.05
      hard.push({ key: 'hurdles', params: { n: otherHurdles } })
    }
    // The number of tasks isn't counted here: many small tasks spread the risk rather than add to
    // it (reviews lean slightly easier with more of them). They're workload, which the semester
    // check counts (termStress, DEADLINES_RULE).
    facts = f
  }
  const h = s.weeklyContactHours
  if (h !== undefined) {
    // Most subjects have about 3 hours a week in class; well under or over that counts a little.
    facts = (facts ?? 0) + clamp((3.5 - h) / 2, -1, 1) * 0.2
    if (h <= 2.5) easy.push({ key: 'fewHours', params: { n: h } })
    if (h >= 5) hard.push({ key: 'manyHours', params: { n: h } })
  }
  if (facts !== null) {
    if (s.level === 1) {
      facts += 0.05
      easy.push({ key: 'firstYear' })
    } else if (s.level === 3) facts -= 0.05
    facts = clamp(facts)
  }
  return { facts, reviews, parts, easy, hard }
}

/**
 * Where a subject sits on the list for `direction`: 0 when reviews agree, 1 when they're neutral
 * or there are none, 2 when they say the opposite.
 */
export function rankTier(reviews: number | null, direction: RankDirection): number {
  if (reviews === null) return 1
  const lean = direction === 'easy' ? reviews : -reviews
  return lean >= VERDICT ? 0 : lean <= -VERDICT ? 2 : 1
}

/** Can a student of `course` take it in `year`, as far as our data says? */
export function rankable(s: Subject, course: string, year: number): boolean {
  if (s.level > 3) return false // graduate subjects
  if (s.passFail) return false // no mark, so nothing to gain or lose for a WAM
  if (s.campus) return false // taught far from Parkville
  if (s.discontinuedFrom !== undefined && year >= s.discontinuedFrom) return false
  if (s.offerings === 'unknown' || periodsFor(s, year).length === 0) return false
  // A degree whose subjects are sorted into categories counts only the ones it lists.
  if (course && !s.categories[course]) return false
  return true
}

/** One subject's score and reasons for a list; null when there's nothing to rank it on. */
export function rankSubject(s: Subject, direction: RankDirection): RankedSubject | null {
  const e = evidence(s)
  if (e.facts === null && e.reviews === null) return null
  // Reviews outweigh facts; facts alone are shrunk towards neutral, being less sure.
  const score = e.reviews !== null ? 0.65 * e.reviews + 0.35 * (e.facts ?? 0) : 0.5 * (e.facts ?? 0)
  const reasons = (direction === 'easy' ? e.easy : e.hard).slice(0, MAX_REASONS)
  return { subject: s, score: Math.round(score * 1000) / 1000, reviews: e.reviews === null ? null : Math.round(e.reviews * 1000) / 1000, reasons }
}

/**
 * A sort key for "easiest first" in any list: the easy list's own order (reviews that say easy,
 * then the rest, then reviews that say hard; score within each), and null when there's nothing
 * to go on, so the caller puts it last.
 */
export function easeKey(s: Subject): { tier: number; score: number } | null {
  const r = rankSubject(s, 'easy')
  return r && { tier: rankTier(r.reviews, 'easy'), score: r.score }
}

/** Whether a ranked subject leans far enough `direction` to be on that list (rankable aside). */
function belongs(r: RankedSubject, direction: RankDirection): boolean {
  const sign = direction === 'easy' ? 1 : -1
  // Being first-year backs a place on the list but isn't a reason on its own.
  if (!r.reasons.some((x) => x.key !== 'firstYear') || r.score * sign <= 0) return false
  // Reviews that say the opposite: it doesn't belong on this list.
  return rankTier(r.reviews, direction) !== 2
}

/**
 * Subjects ranked for `direction`, easiest (or hardest) first. Only subjects that lean that way
 * and have at least one reason to show are listed.
 */
export function rankSubjects(subjects: Subject[], o: RankOptions): RankedSubject[] {
  const sign = o.direction === 'easy' ? 1 : -1
  const rows: { r: RankedSubject; tier: number }[] = []
  for (const s of subjects) {
    if (!rankable(s, o.course, o.year)) continue
    if (o.level != null && s.level !== o.level) continue
    if (o.breadthOnly && s.categories[o.course] !== 'breadth') continue
    if (o.period != null && !periodsFor(s, o.year).includes(o.period)) continue
    const r = rankSubject(s, o.direction)
    if (!r || !belongs(r, o.direction)) continue
    rows.push({ r, tier: rankTier(r.reviews, o.direction) })
  }
  rows.sort((a, b) => a.tier - b.tier || (b.r.score - a.r.score) * sign || a.r.subject.code.localeCompare(b.r.subject.code))
  const out = rows.map((x) => x.r)
  return o.limit === undefined ? out : out.slice(0, o.limit)
}

/** Each list's own address (/subjects/easy/, /subjects/hard/). */
export const RANK_SLUGS: Record<RankDirection, string> = { easy: 'easy', hard: 'hard' }

export function rankFromSlug(slug: string): RankDirection | undefined {
  return slug === 'easy' || slug === 'hard' ? slug : undefined
}

/** Where a subject sits near the top of one of the lists. */
export interface ListPlace {
  direction: RankDirection
  /** 1-based, as the list page numbers it. */
  place: number
}

/** How far down a list still counts as "on the list" for a subject page. */
export const LIST_TOP = 30

// Both lists' top places per subjects record, per course and year: built once, then each lookup is a Map read.
const placeCache = new WeakMap<Record<string, Subject>, Map<string, Map<string, ListPlace>>>()

/**
 * Whether `code` is in the top `top` of the easy or hard list for `course` in `year`, using the
 * same unfiltered list the ranking page shows for that degree. `subjects` should be the course's
 * view of the data (forCourse), as the ranking page uses. Null when it's on neither.
 */
export function listPlace(subjects: Record<string, Subject>, code: string, course: string, year: number, top = LIST_TOP): ListPlace | null {
  let byKey = placeCache.get(subjects)
  if (!byKey) placeCache.set(subjects, (byKey = new Map()))
  const key = `${course}|${year}|${top}`
  let places = byKey.get(key)
  if (!places) {
    places = new Map()
    const list = Object.values(subjects)
    for (const direction of ['easy', 'hard'] as const) {
      // Tied subjects (same tier and score) share a place, numbered as the first of them, so a
      // tie across #30 is either all shown or none.
      const rows = rankSubjects(list, { direction, course, year })
      let place = 0
      rows.forEach((r, i) => {
        const prev = rows[i - 1]
        if (!prev || !sameSpot(prev, r, direction)) place = i + 1
        if (place <= top && !places!.has(r.subject.code)) places!.set(r.subject.code, { direction, place })
      })
    }
    byKey.set(key, places)
  }
  return places.get(code) ?? null
}

/** The share of a list, from its top, that reads as clearly easier (or harder) on a subject page. */
export const LEAN_SHARE = 1 / 3

/** Same tier and score on a list: a tie, whatever the codes. */
function sameSpot(a: RankedSubject, b: RankedSubject, direction: RankDirection): boolean {
  return rankTier(a.reviews, direction) === rankTier(b.reviews, direction) && a.score === b.score
}

/** The last (tier, score) still in a list's top share; null when nothing is. */
type Cutoff = { tier: number; score: number } | null
const cutoffCache = new WeakMap<Record<string, Subject>, Map<string, Cutoff>>()

/**
 * Where a list's top share ends. The share's last place often falls inside a block of tied
 * subjects (many unreviewed subjects score the same); the whole block then goes on whichever
 * side leaves the share closer to LEAN_SHARE, and above it when that's a draw.
 */
function cutoffFor(list: RankedSubject[], direction: RankDirection): Cutoff {
  if (!list.length) return null
  const want = list.length * LEAN_SHARE
  const at = list[Math.ceil(want) - 1]!
  const first = list.findIndex((r) => sameSpot(r, at, direction))
  let last = first
  while (last + 1 < list.length && sameSpot(list[last + 1]!, at, direction)) last++
  const above = first // subjects strictly above the block
  const through = last + 1 // subjects up to and including the block
  const end = Math.abs(through - want) < Math.abs(above - want) ? last : first - 1
  if (end < 0) return { tier: -1, score: 0 } // nothing above the block: no subject is in the share
  const r = list[end]!
  return { tier: rankTier(r.reviews, direction), score: r.score }
}

export function inTopShare(subjects: Record<string, Subject>, s: Subject, direction: RankDirection, course: string, year: number): boolean {
  const r = rankSubject(s, direction)
  if (!r || !belongs(r, direction)) return false
  let byKey = cutoffCache.get(subjects)
  if (!byKey) cutoffCache.set(subjects, (byKey = new Map()))
  const key = `${direction}|${course}|${year}`
  let cut = byKey.get(key)
  if (cut === undefined) {
    cut = cutoffFor(rankSubjects(Object.values(subjects), { direction, course, year }), direction)
    byKey.set(key, cut)
  }
  // An empty list (a tiny data set): leaning that way is all there is to go on.
  if (!cut) return true
  const t = rankTier(r.reviews, direction)
  const sign = direction === 'easy' ? 1 : -1
  return t < cut.tier || (t === cut.tier && r.score * sign >= cut.score * sign)
}

/** Subjects rated here by MIN_RATINGS+ students needed before REVIEW_PRIOR is estimated. */
export const MIN_RATED_SUBJECTS = 30

/**
 * REVIEW_PRIOR from the data (normal–normal empirical Bayes): how much the pieces of evidence for
 * one subject disagree (noise per unit of weight) against how much subjects really differ. Run by
 * the weekly ratings job; undefined until MIN_RATED_SUBJECTS subjects have our own ratings, so
 * public review summaries alone never change it.
 */
export function fitReviewPrior(subjects: Subject[]): number | undefined {
  if (subjects.filter((s) => s.signals && s.signals.reviews >= MIN_RATINGS).length < MIN_RATED_SUBJECTS) return undefined
  const groups = subjects.map((s) => evidence(s).parts).filter((p) => p.length >= 2)
  if (groups.length < MIN_RATED_SUBJECTS) return undefined
  let within = 0
  let dof = 0
  const means = groups.map((parts) => {
    const w = parts.reduce((a, p) => a + p.weight, 0)
    const mean = parts.reduce((a, p) => a + p.weight * p.value, 0) / w
    within += parts.reduce((a, p) => a + p.weight * (p.value - mean) ** 2, 0)
    dof += parts.length - 1
    return { mean, w }
  })
  const noise = within / dof
  if (!(noise > 0)) return undefined
  // Between subjects, centred on neutral (0), each mean counted by its precision.
  const prec = means.map((m) => m.w / noise)
  const q = means.reduce((a, m, i) => a + prec[i]! * m.mean ** 2, 0)
  const between = Math.max(0.01, (q - means.length) / prec.reduce((a, x) => a + x, 0))
  return Math.round(Math.max(0.25, Math.min(10, noise / between)) * 100) / 100
}
