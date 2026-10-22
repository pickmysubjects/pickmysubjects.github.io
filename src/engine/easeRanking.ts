import { periodsFor } from './availability'
import { discussionVerdict, type Period, type Subject } from './schema'

/**
 * "水课" and "难课": subjects ranked by how easy (or hard) they are to do well in, from our own
 * data only, each with the reasons it's there. Guidance, not a promise.
 *
 * Two kinds of evidence, kept apart:
 * - Handbook facts, known for almost every subject: final-exam share, hurdles, weekly class
 *   hours, number of assessment tasks, level.
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
const REVIEW_PRIOR = 1

interface Evidence {
  /** -1 … +1 from Handbook facts; null when nothing is recorded. */
  facts: number | null
  /** -1 … +1 from what students say; null when nobody has. */
  reviews: number | null
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
  const g = s.gradeOffset && s.gradeOffset.n >= MIN_GRADES ? s.gradeOffset : undefined
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
    // Many separate tasks mean steady work all semester.
    if (tasks.length >= 7) {
      f -= 0.1
      hard.push({ key: 'manyTasks', params: { n: tasks.length } })
    }
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
  return { facts, reviews, easy, hard }
}

/**
 * Where a subject sits on the list for `direction`: 0 when reviews agree, 1 when they're neutral
 * or there are none, 2 when they say the opposite.
 */
function tier(reviews: number | null, direction: RankDirection): number {
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
  return r && { tier: tier(r.reviews, 'easy'), score: r.score }
}

/** Whether a ranked subject leans far enough `direction` to be on that list (rankable aside). */
function belongs(r: RankedSubject, direction: RankDirection): boolean {
  const sign = direction === 'easy' ? 1 : -1
  // Being first-year backs a place on the list but isn't a reason on its own.
  if (!r.reasons.some((x) => x.key !== 'firstYear') || r.score * sign <= 0) return false
  // Reviews that say the opposite: it doesn't belong on this list.
  return tier(r.reviews, direction) !== 2
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
    rows.push({ r, tier: tier(r.reviews, o.direction) })
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
      rankSubjects(list, { direction, course, year, limit: top }).forEach((r, i) => {
        if (!places!.has(r.subject.code)) places!.set(r.subject.code, { direction, place: i + 1 })
      })
    }
    byKey.set(key, places)
  }
  return places.get(code) ?? null
}

/** Where a subject falls in the full easy and hard orderings of every rankable subject. */
export interface FullPlace {
  /** 1-based places, in the easy and in the hard order (the lists' own sort, nothing left out). */
  easy: number
  hard: number
  /** How many rankable subjects the orderings hold. */
  n: number
}

interface OrderKey {
  code: string
  score: number
  easyTier: number
  hardTier: number
}

const keyOf = (r: RankedSubject): OrderKey => ({ code: r.subject.code, score: r.score, easyTier: tier(r.reviews, 'easy'), hardTier: tier(r.reviews, 'hard') })
// The list pages' sort: reviews' tier first, then score, then code.
const easyFirst = (a: OrderKey, b: OrderKey) => a.easyTier - b.easyTier || b.score - a.score || a.code.localeCompare(b.code)
const hardFirst = (a: OrderKey, b: OrderKey) => a.hardTier - b.hardTier || a.score - b.score || a.code.localeCompare(b.code)

const orderCache = new WeakMap<Record<string, Subject>, Map<string, OrderKey[]>>()

/**
 * A subject's places in the full easy and hard orderings for `course` in `year`: every rankable
 * subject in the lists' own order, before the lists keep only those leaning their way. A subject
 * the lists leave out (pass/fail, not running) gets the place it would take. Null with nothing
 * to rank it on.
 */
export function fullPlace(subjects: Record<string, Subject>, code: string, course: string, year: number): FullPlace | null {
  const s = subjects[code]
  const r = s && rankSubject(s, 'easy')
  if (!r) return null
  let byKey = orderCache.get(subjects)
  if (!byKey) orderCache.set(subjects, (byKey = new Map()))
  const cacheKey = `${course}|${year}`
  let keys = byKey.get(cacheKey)
  if (!keys) {
    keys = []
    for (const x of Object.values(subjects)) {
      if (!rankable(x, course, year)) continue
      const rx = rankSubject(x, 'easy')
      if (rx) keys.push(keyOf(rx))
    }
    byKey.set(cacheKey, keys)
  }
  const me = keyOf(r)
  const others = keys.filter((k) => k.code !== code)
  return {
    easy: others.filter((k) => easyFirst(k, me) < 0).length + 1,
    hard: others.filter((k) => hardFirst(k, me) < 0).length + 1,
    n: others.length + 1,
  }
}
