/**
 * The revision planner: a day-by-day timetable from a start date to the last exam. Pure and
 * deterministic (same input, same plan); dates are Melbourne calendar days as YYYY-MM-DD and are
 * stepped with UTC date arithmetic, so daylight-saving changes never add or drop a day.
 *
 * What it follows, and how strong the reason is:
 * - Spread each subject over several days (≥3 when the days allow), coming back after a gap of
 *   about 15% of the days left to its exam (at least a day). Spaced study is remembered longer
 *   than one long block (the spacing effect, Cepeda et al. 2008). Only the last free day before an
 *   exam is given to one subject.
 * - Move from learning to testing: early sittings are for understanding and summarising, later
 *   ones for testing yourself, and a subject's last day for past papers and checking mistakes
 *   (retrieval practice, Roediger & Karpicke 2006; Adesope et al. 2017).
 * - The day before an exam: that subject only, a past paper and its mistakes, no new topics, a
 *   lighter day that ends early, so there's time for 7–9 hours' sleep (Okano et al. 2019).
 * - An exam ≤3 days after the start: all self-testing, still with full sleep.
 * Rules of thumb, not research findings: 2–3 subjects a day and one subject a sitting; sittings of
 * 60–90 minutes with 10-minute breaks; about 4–6 hours a day by default and never more than 8; a
 * subject's weight of difficulty (easier 0.8, about average 1, harder 1.3) times its final exam's
 * share (0.5 + share), with no subject weighted above half of all the time when there are 3 or more.
 *
 * How a day is filled: exam days and rest days stay free. Every other day, each subject still
 * ahead earns its share of the day (weight / √days left); the subjects that must come back to
 * reach 3 days go first, then those whose gap is over, most owed first; each gets at least an hour.
 */

export type RevisionDifficulty = 'easier' | 'average' | 'harder'

export interface RevisionSubject {
  code: string
  /** Exam day, YYYY-MM-DD; empty until the timetable is out. */
  exam: string
  /** Exam start time, HH:MM (optional). */
  time?: string
  difficulty: RevisionDifficulty
  /** Final exam's share of the mark, 0–100, when known. */
  examWeight?: number
  /** The student says there is no final exam: left out of the plan, not flagged. */
  noExam?: boolean
}

export interface RevisionInput {
  subjects: readonly RevisionSubject[]
  /** First day of revision, YYYY-MM-DD. */
  start: string
  /**
   * Hours a day the student has (0–8), the most on any day; days far from an exam get less.
   * Left out (null), the planner picks the load itself: about 4 hours a day two weeks out,
   * rising to 6 near an exam.
   */
  hoursPerDay?: number | null
  /** Weekdays to rest, 0 = Sunday … 6 = Saturday. */
  restWeekdays?: readonly number[]
}

/** What a sitting is for: understand and summarise, test yourself, or a past paper then its mistakes. */
export type RevisionType = 'learn' | 'test' | 'paper'

export interface RevisionSession {
  code: string
  /** Hours, in half hours: 1–1.5 (less only when the whole day is shorter). */
  hours: number
  /** On the last free day before this subject's exam. */
  focus: boolean
  type: RevisionType
  /** Why this kind of sitting: its type, or 'short' when the exam was ≤3 days away at the start. */
  reason: RevisionType | 'short'
  /** Learn and test sittings: which part of the subject, counting from 0 in each pass (learn, then test). */
  part?: number
}

export type RevisionDayKind = 'study' | 'rest' | 'exam'

/**
 * Why a study day looks as it does, for the one-line note under it:
 * dayBefore: one subject, past paper and mistakes, end early; short: exam within 3 days, all self-testing;
 * spread: `code` first appears, it comes back on `n` days; testing: mostly self-testing;
 * mix: 2–3 subjects, each with gaps; learn: understanding first.
 */
export type RevisionReason = { why: 'dayBefore' | 'short'; code: string } | { why: 'spread'; code: string; n: number } | { why: 'testing' | 'mix' | 'learn' }

export interface RevisionDay {
  date: string
  kind: RevisionDayKind
  /** Subjects with their exam on this day (an exam day). */
  exams: string[]
  /** Sittings in order, one subject each. */
  sessions: RevisionSession[]
  /** Set on a study day with sittings. */
  reason?: RevisionReason
}

export type RevisionSkip = 'noDate' | 'pastExam' | 'noExam'

export interface RevisionPlan {
  days: RevisionDay[]
  /** Hours per subject, in the order the subjects were given. */
  totals: { code: string; hours: number }[]
  /** Subjects left out, and why. */
  skipped: { code: string; why: RevisionSkip }[]
  /** Planned, not planned: there was nothing to plan (no hours, or no dated exams ahead). */
  empty: boolean
}

export const DIFFICULTY_WEIGHT: Record<RevisionDifficulty, number> = { easier: 0.8, average: 1, harder: 1.3 }
/** Subjects sharing one ordinary day, at most (rule of thumb). */
export const MAX_SUBJECTS_A_DAY = 3
/** The most hours on any day, whatever the student types (rule of thumb). */
export const MAX_HOURS_A_DAY = 8
/** The day before an exam ends early: at most this many hours. */
export const DAY_BEFORE_HOURS = 5
/** The planner's own load when the student gives none: lighter far out, heavier near an exam. */
export const AUTO_HOURS = { far: 4, near: 6 } as const
/** Days before an exam over which the load ramps up. */
export const RAMP_DAYS = 14
/** With the student's hours, the lightest day is this share of them. */
export const RAMP_FLOOR = 0.6
/** Separate days each subject should get when the days allow. */
export const MIN_DAYS = 3
/** The gap before a subject comes back: this share of the days left to its exam, at least a day. */
export const GAP_SHARE = 0.15
/** No subject's weight above this share of all weights (with 3 or more subjects). */
export const MAX_SHARE = 0.5
/** An exam this many days or fewer after the start: all self-testing. */
export const SHORT_DAYS = 3
/** A sitting's length in hours: at least, at most, and the length aimed for. */
export const SITTING = { min: 1, max: 1.5, aim: 1.25 } as const
/** Minutes of break between sittings, and the latest end of a day (the day before an exam earlier). */
export const BREAK_MINUTES = 10
export const LATEST_END = { usual: 22 * 60, dayBefore: 20 * 60 } as const

/**
 * Hours for a day `daysLeft` days before the next exam (1 = the day before), in half hours:
 * rising toward the exam, never above the student's hours (or 6 when they give none), never above 8.
 */
export function dayLoad(daysLeft: number, hoursPerDay?: number | null): number {
  const near = Math.min(Math.max(0, RAMP_DAYS - daysLeft), RAMP_DAYS - 1) / (RAMP_DAYS - 1) // 0 far … 1 the day before
  if (hoursPerDay === null || hoursPerDay === undefined) return cleanHours(AUTO_HOURS.far + (AUTO_HOURS.near - AUTO_HOURS.far) * near)
  const cap = cleanHours(hoursPerDay)
  return cleanHours(cap * (RAMP_FLOOR + (1 - RAMP_FLOOR) * near))
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** A real calendar date as YYYY-MM-DD. */
export function isDay(x: unknown): x is string {
  if (typeof x !== 'string' || !DATE.test(x)) return false
  const d = new Date(`${x}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x
}

/** The date n days after (or before) a YYYY-MM-DD date. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Whole days from a to b. */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

/** 0 = Sunday … 6 = Saturday. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay()
}

/** A subject's weight (rule 1). */
export function subjectWeight(s: Pick<RevisionSubject, 'difficulty' | 'examWeight'>): number {
  const exam = typeof s.examWeight === 'number' && Number.isFinite(s.examWeight) ? 0.5 + Math.max(0, Math.min(100, s.examWeight)) / 100 : 1
  return DIFFICULTY_WEIGHT[s.difficulty] * exam
}

/** Hours rounded down to half hours, within 0–16. */
export function cleanHours(h: number): number {
  if (!Number.isFinite(h) || h <= 0) return 0
  return Math.floor(Math.min(h, MAX_HOURS_A_DAY) * 2) / 2
}

/** Weights with none above MAX_SHARE of the sum (3 or more subjects): the excess goes to the rest. */
export function cappedWeights(ws: readonly number[]): number[] {
  if (ws.length < 3) return [...ws]
  const out = [...ws]
  for (let round = 0; round < ws.length; round++) {
    const sum = out.reduce((a, b) => a + b, 0)
    const over = out.findIndex((w) => w > MAX_SHARE * sum + 1e-9)
    if (over < 0) break
    // w = 0.5 × (others + w)  ⇒  w = others
    out[over] = sum - out[over]!
  }
  return out
}

/**
 * Splits `units` (half hours) among items by score, each at least `min` units (when there's room)
 * and at most `max`; the rest by largest remainder, ties in the given order.
 */
function split(units: number, items: { code: string; score: number }[], min: number, max: number): Map<string, number> {
  const out = new Map(items.map((x) => [x.code, Math.min(min, max)]))
  let left = units - items.length * Math.min(min, max)
  while (left > 0) {
    const open = items.filter((x) => out.get(x.code)! < max)
    if (!open.length) break
    const total = open.reduce((t, x) => t + x.score, 0)
    let given = 0
    for (const x of open) {
      const add = Math.min(Math.floor((left * x.score) / total), max - out.get(x.code)!)
      out.set(x.code, out.get(x.code)! + add)
      given += add
    }
    if (!given) {
      // Whatever is left, one unit each, highest score first.
      const order = [...open].sort((a, b) => b.score - a.score)
      for (const x of order) if (left - given > 0 && out.get(x.code)! < max) (out.set(x.code, out.get(x.code)! + 1), given++)
    }
    left -= given
  }
  return out
}

/** A subject's hours on one day as sittings of 1–1.5 hours (half-hour units), longest first. */
export function sittings(hours: number): number[] {
  const units = Math.round(hours * 2)
  if (units <= SITTING.min * 2) return units ? [units / 2] : []
  let k = Math.max(1, Math.round(hours / SITTING.aim))
  while (units / k > SITTING.max * 2) k++
  while (k > 1 && units / k < SITTING.min * 2) k--
  const base = Math.floor(units / k)
  return Array.from({ length: k }, (_, i) => (base + (i < units - base * k ? 1 : 0)) / 2)
}

export function planRevision(input: RevisionInput): RevisionPlan {
  const auto = input.hoursPerDay === null || input.hoursPerDay === undefined
  const hours = auto ? AUTO_HOURS.near : cleanHours(input.hoursPerDay!)
  const rest = new Set((input.restWeekdays ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))
  const skipped: RevisionPlan['skipped'] = []
  // One row per code (the first one wins), in the order given.
  const seen = new Set<string>()
  const subjects: (RevisionSubject & { w: number; order: number; short: boolean })[] = []
  input.subjects.forEach((s) => {
    if (seen.has(s.code)) return
    seen.add(s.code)
    if (s.noExam) skipped.push({ code: s.code, why: 'noExam' })
    else if (!isDay(s.exam)) skipped.push({ code: s.code, why: 'noDate' })
    else if (!isDay(input.start) || s.exam <= input.start) skipped.push({ code: s.code, why: 'pastExam' })
    else subjects.push({ ...s, w: subjectWeight(s), order: subjects.length, short: daysBetween(input.start, s.exam) <= SHORT_DAYS })
  })
  cappedWeights(subjects.map((s) => s.w)).forEach((w, i) => (subjects[i]!.w = w))
  const totals = new Map(input.subjects.filter((s) => subjects.some((x) => x.code === s.code)).map((s) => [s.code, 0]))
  const result = (days: RevisionDay[]): RevisionPlan => ({
    days,
    totals: [...totals].map(([code, h]) => ({ code, hours: h })),
    skipped,
    empty: !days.some((d) => d.sessions.length),
  })
  if (!subjects.length) return result([])

  // Earliest exam first; ties by the order given, so the plan never depends on anything else.
  const byExam = [...subjects].sort((a, b) => a.exam.localeCompare(b.exam) || a.order - b.order)
  const last = byExam[byExam.length - 1]!.exam
  const examsOn = new Map<string, string[]>()
  for (const s of byExam) examsOn.set(s.exam, [...(examsOn.get(s.exam) ?? []), s.code])

  const days: RevisionDay[] = []
  for (let d = input.start; d <= last; d = addDays(d, 1)) {
    const exams = examsOn.get(d) ?? []
    days.push({ date: d, kind: exams.length ? 'exam' : rest.has(weekday(d)) ? 'rest' : 'study', exams, sessions: [] })
  }
  if (hours === 0) return result(days)

  // The last free day before each exam date, earliest exams choosing first.
  const focus = new Map<string, string>() // date -> exam date it's kept for
  for (const exam of examsOn.keys()) {
    for (let i = daysBetween(input.start, exam) - 1; i >= 0; i--) {
      const day = days[i]!
      if (day.kind !== 'study' || focus.has(day.date)) continue
      focus.set(day.date, exam)
      break
    }
  }
  // Ordinary (shared) study days still to come for a subject, after `date` and before its exam.
  const shared = days.filter((d) => d.kind === 'study' && !focus.has(d.date)).map((d) => d.date)
  const sharedLeft = (s: { exam: string }, date: string) => shared.filter((d) => d > date && d < s.exam).length

  const owed = new Map(subjects.map((s) => [s.code, 0])) // hours deserved minus hours given
  const lastDay = new Map<string, string>()
  const dayCount = new Map(subjects.map((s) => [s.code, 0]))
  const blocks: { day: RevisionDay; code: string; hours: number; focus: boolean }[] = []
  for (const day of days) {
    if (day.kind !== 'study') continue
    const ahead = byExam.filter((s) => s.exam > day.date)
    if (!ahead.length) continue
    const kept = focus.get(day.date)
    const load = kept ? Math.min(dayLoad(1, input.hoursPerDay), DAY_BEFORE_HOURS) : dayLoad(daysBetween(day.date, ahead[0]!.exam), input.hoursPerDay)
    const units = load * 2
    if (!units) continue
    if (kept) {
      const who = ahead.filter((s) => s.exam === kept)
      const n = Math.min(who.length, units)
      for (const [code, u] of split(units, who.slice(0, n).map((s) => ({ code: s.code, score: s.w })), 1, units)) blocks.push({ day, code, hours: u / 2, focus: true })
    } else {
      const score = (s: (typeof ahead)[number]) => s.w / Math.sqrt(daysBetween(day.date, s.exam))
      const sum = ahead.reduce((t, s) => t + score(s), 0)
      for (const s of ahead) owed.set(s.code, owed.get(s.code)! + (load * score(s)) / sum)
      const gap = (s: (typeof ahead)[number]) => Math.max(1, Math.round(GAP_SHARE * daysBetween(day.date, s.exam)))
      const due = (s: (typeof ahead)[number]) => !lastDay.has(s.code) || daysBetween(lastDay.get(s.code)!, day.date) >= gap(s)
      // Must come today to still reach MIN_DAYS separate days before the exam.
      const must = (s: (typeof ahead)[number]) => MIN_DAYS - dayCount.get(s.code)! > sharedLeft(s, day.date)
      const rank = (s: (typeof ahead)[number]) => (must(s) && dayCount.get(s.code)! < MIN_DAYS ? 0 : due(s) ? 1 : 2)
      const want = Math.min(ahead.length, MAX_SUBJECTS_A_DAY, load >= 4.5 ? 3 : 2, Math.max(1, Math.floor(units / (SITTING.min * 2))))
      const pick = [...ahead].sort((a, b) => rank(a) - rank(b) || owed.get(b.code)! - owed.get(a.code)! || a.exam.localeCompare(b.exam) || a.order - b.order).slice(0, want)
      // No massing: on a shared day one subject gets at most 60% of the day (unless it's alone).
      const max = pick.length > 1 ? Math.max(SITTING.min * 2, Math.ceil(units * 0.6)) : units
      const shares = split(units, pick.map((s) => ({ code: s.code, score: Math.max(owed.get(s.code)!, 0.01) })), Math.min(SITTING.min * 2, Math.floor(units / pick.length)), max)
      for (const s of byExam) {
        const u = shares.get(s.code)
        if (u) blocks.push({ day, code: s.code, hours: u / 2, focus: false })
      }
    }
    for (const b of blocks.filter((x) => x.day === day)) {
      owed.set(b.code, owed.get(b.code)! - b.hours)
      totals.set(b.code, totals.get(b.code)! + b.hours)
      lastDay.set(b.code, day.date)
      dayCount.set(b.code, dayCount.get(b.code)! + 1)
    }
  }

  // Sittings, then their types per subject in time order: learn → test → past paper.
  const bySubject = new Map<string, RevisionSession[]>(subjects.map((s) => [s.code, []]))
  for (const b of blocks) {
    for (const h of sittings(b.hours)) {
      const session: RevisionSession = { code: b.code, hours: h, focus: b.focus, type: 'learn', reason: 'learn' }
      b.day.sessions.push(session)
      bySubject.get(b.code)!.push(session)
    }
  }
  for (const s of subjects) {
    const list = bySubject.get(s.code)!
    const papers = list.some((x) => x.focus) ? list.filter((x) => x.focus) : list.slice(-Math.min(2, list.length))
    const rest = list.filter((x) => !papers.includes(x))
    const learn = s.short ? 0 : Math.ceil(rest.length * 0.4)
    rest.forEach((x, i) => {
      x.type = i < learn ? 'learn' : 'test'
      x.reason = s.short ? 'short' : x.type
      x.part = i < learn ? i : i - learn
    })
    for (const x of papers) x.type = x.reason = 'paper'
  }
  const firstDate = new Map<string, string>()
  for (const b of blocks) if (!firstDate.has(b.code)) firstDate.set(b.code, b.day.date)
  // Interleave each day's sittings so one subject's sittings aren't back to back where avoidable.
  for (const day of days) {
    if (!day.sessions.length) continue
    const queues = byExam.map((s) => day.sessions.filter((x) => x.code === s.code)).filter((q) => q.length)
    const order: RevisionSession[] = []
    while (queues.some((q) => q.length)) {
      queues.sort((a, b) => b.length - a.length)
      const prev = order.at(-1)?.code
      const q = queues.find((x) => x.length && x[0]!.code !== prev) ?? queues.find((x) => x.length)!
      order.push(q.shift()!)
    }
    day.sessions = order
    day.reason = dayReason(day, subjects, dayCount, firstDate)
  }
  return result(days)
}

function dayReason(day: RevisionDay, subjects: readonly { code: string; short: boolean }[], dayCount: Map<string, number>, firstDate: Map<string, string>): RevisionReason {
  const codes = [...new Set(day.sessions.map((s) => s.code))]
  if (day.sessions.every((s) => s.focus)) return { why: 'dayBefore', code: codes[0]! }
  const short = codes.find((c) => subjects.find((s) => s.code === c)?.short)
  if (short) return { why: 'short', code: short }
  const tests = day.sessions.filter((s) => s.type !== 'learn').length
  if (tests * 2 > day.sessions.length) return { why: 'testing' }
  const first = codes.find((c) => firstDate.get(c) === day.date)
  if (first && (dayCount.get(first) ?? 0) > 1) return { why: 'spread', code: first, n: dayCount.get(first)! }
  return codes.length > 1 ? { why: 'mix' } : { why: 'learn' }
}

// ---------- saving ----------

export interface RevisionState {
  subjects: { code: string; exam: string; time?: string; difficulty?: RevisionDifficulty; noExam?: boolean }[]
  start: string
  /** Hours a day, the most on any day; null: the planner decides. */
  hoursPerDay: number | null
  /** Daily start time of the first session, HH:MM; empty: sessions go in the calendar as all-day notes. */
  dayStart: string
  restWeekdays: number[]
  /** The student changed the list: stop filling it from the plan. */
  edited: boolean
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
export const isTime = (x: unknown): x is string => typeof x === 'string' && TIME.test(x)
const LEVELS: readonly RevisionDifficulty[] = ['easier', 'average', 'harder']

export function emptyRevision(): RevisionState {
  return { subjects: [], start: '', hoursPerDay: null, dayStart: '', restWeekdays: [], edited: false }
}

/** Puts a saved (or restored) copy back in shape; anything unknown is dropped. */
export function cleanRevision(raw: unknown): RevisionState {
  const base = emptyRevision()
  if (typeof raw !== 'object' || raw === null) return base
  const r = raw as Record<string, unknown>
  const subjects = Array.isArray(r.subjects)
    ? r.subjects.flatMap((x) => {
        if (typeof x !== 'object' || x === null) return []
        const s = x as Record<string, unknown>
        if (typeof s.code !== 'string' || !/^[A-Z]{4}\d{5}$/.test(s.code)) return []
        return [{ code: s.code, exam: isDay(s.exam) ? s.exam : '', ...(isTime(s.time) ? { time: s.time } : {}), ...(LEVELS.includes(s.difficulty as RevisionDifficulty) ? { difficulty: s.difficulty as RevisionDifficulty } : {}), ...(typeof s.noExam === 'boolean' ? { noExam: s.noExam } : {}) }]
      })
    : []
  return {
    subjects: subjects.slice(0, 12),
    start: isDay(r.start) ? r.start : '',
    hoursPerDay: typeof r.hoursPerDay === 'number' && Number.isFinite(r.hoursPerDay) ? cleanHours(r.hoursPerDay) : null,
    dayStart: isTime(r.dayStart) ? r.dayStart : base.dayStart,
    restWeekdays: Array.isArray(r.restWeekdays) ? [...new Set(r.restWeekdays.filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort() : [],
    edited: r.edited === true,
  }
}

/** Every term's own revision plan, by term key ("2026-semester-2"), and the term last picked. */
export interface RevisionStore {
  terms: Record<string, RevisionState>
  term: string
}

const TERM_KEY = /^\d{4}-(summer|semester-1|winter|semester-2)$/
export const termKey = (t: { year: number; period: string }) => `${t.year}-${t.period}`

export function emptyRevisionStore(): RevisionStore {
  return { terms: {}, term: '' }
}

/**
 * Puts a saved copy back in shape. A copy from before terms were kept apart (one flat plan) is
 * kept under "legacy"; the page gives it to the first term the student opens that has nothing yet.
 */
export function cleanRevisionStore(raw: unknown): RevisionStore {
  if (typeof raw !== 'object' || raw === null) return emptyRevisionStore()
  const r = raw as Record<string, unknown>
  if (!('terms' in r)) return 'subjects' in r ? { terms: { legacy: cleanRevision(r) }, term: '' } : emptyRevisionStore()
  const terms: Record<string, RevisionState> = {}
  if (typeof r.terms === 'object' && r.terms !== null) {
    for (const [k, v] of Object.entries(r.terms)) if (TERM_KEY.test(k) || k === 'legacy') terms[k] = cleanRevision(v)
  }
  return { terms, term: typeof r.term === 'string' && TERM_KEY.test(r.term) ? r.term : '' }
}

// ---------- exam periods ----------

export type RevisionPeriod = 'summer' | 'semester-1' | 'winter' | 'semester-2'
const PERIOD_ORDER: readonly RevisionPeriod[] = ['summer', 'semester-1', 'winter', 'semester-2']

/** A key-date row, as far as the planner needs one. */
export interface TermDate {
  kind: string
  year: number
  term: string
  start: string
  end: string
}

/** A term's exam window from the key dates: revision from `from`, exams `examsStart`–`end`. */
export interface ExamPeriod {
  /** First day of SWOT Vac, else of the exam period. */
  from: string
  examsStart: string
  end: string
  /** The earliest exam date a student can pick: summer and winter intensives can end any time in the term. */
  earliest: string
}

/**
 * The term's exam window. Without an exam period in the key dates (winter, intensive summer
 * subjects), the exams fall in the last two weeks of teaching; with neither, there is none.
 */
export function examPeriod(dates: readonly TermDate[], year: number, term: string): ExamPeriod | null {
  const of = (kind: string) => dates.find((d) => d.kind === kind && d.year === year && d.term === term)
  const exams = of('exams')
  const teach = of('teaching')
  const intensive = term === 'summer' || term === 'winter'
  if (exams) {
    const swot = of('swotvac')
    return { from: swot && swot.start < exams.start ? swot.start : exams.start, examsStart: exams.start, end: exams.end, earliest: intensive && teach && teach.start < exams.start ? teach.start : exams.start }
  }
  if (!teach) return null
  const from = addDays(teach.end, -13) < teach.start ? teach.start : addDays(teach.end, -13)
  return { from, examsStart: from, end: teach.end, earliest: intensive ? teach.start : from }
}

/** The first revision day: today when the window has begun, else the window's first day. */
export function defaultStart(period: ExamPeriod | null, today: string): string {
  return period && period.from > today ? period.from : today
}

/**
 * The terms the student can plan revision for, in calendar order: each term of the plan or of the
 * record with subjects in it, whose exams haven't all finished (a term with no dates counts as
 * ahead when it is after today's year). The first one is the default.
 */
export function revisionTerms(
  terms: readonly { year: number; period: string; subjects: readonly string[] }[],
  dates: readonly TermDate[],
  today: string,
): { year: number; period: RevisionPeriod; subjects: string[]; window: ExamPeriod | null }[] {
  const byKey = new Map<string, { year: number; period: RevisionPeriod; subjects: string[] }>()
  for (const t of terms) {
    if (!PERIOD_ORDER.includes(t.period as RevisionPeriod) || !t.subjects.length) continue
    const k = termKey(t)
    const cur = byKey.get(k) ?? { year: t.year, period: t.period as RevisionPeriod, subjects: [] }
    cur.subjects = [...new Set([...cur.subjects, ...t.subjects])]
    byKey.set(k, cur)
  }
  const thisYear = Number(today.slice(0, 4))
  return [...byKey.values()]
    .map((t) => ({ ...t, window: examPeriod(dates, t.year, t.period) }))
    .filter((t) => (t.window ? t.window.end >= today : t.year > thisYear))
    .sort((a, b) => a.year - b.year || PERIOD_ORDER.indexOf(a.period) - PERIOD_ORDER.indexOf(b.period))
}

// ---------- calendar file ----------

/** Melbourne's time zone, AEST/AEDT, with the rules in force since 2008. */
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Australia/Melbourne',
  'BEGIN:STANDARD',
  'DTSTART:20080406T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU',
  'TZOFFSETFROM:+1100',
  'TZOFFSETTO:+1000',
  'TZNAME:AEST',
  'END:STANDARD',
  'BEGIN:DAYLIGHT',
  'DTSTART:20081005T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=1SU',
  'TZOFFSETFROM:+1000',
  'TZOFFSETTO:+1100',
  'TZNAME:AEDT',
  'END:DAYLIGHT',
  'END:VTIMEZONE',
]

const esc = (text: string) => text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
function fold(line: string): string {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = ''
  let size = 0
  for (const ch of line) {
    const n = enc.encode(ch).length
    if (size + n > (out.length ? 74 : 75)) {
      out.push(cur)
      cur = ''
      size = 0
    }
    cur += ch
    size += n
  }
  out.push(cur)
  return out.join('\r\n ')
}
const local = (date: string, minutes: number) => `${date.replaceAll('-', '')}T${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}00`
const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

/**
 * A day's sittings from the start time with a short break between them, ending by 22:00 (20:00 the
 * day before an exam, so the evening stays free for sleep); a sitting that wouldn't fit is cut.
 */
export function sessionTimes(day: RevisionDay, dayStart: string): { session: RevisionSession; from: number; to: number }[] {
  let at = isTime(dayStart) ? toMinutes(dayStart) : 9 * 60
  const end = day.sessions.length && day.sessions.every((s) => s.focus) ? LATEST_END.dayBefore : LATEST_END.usual
  const out: { session: RevisionSession; from: number; to: number }[] = []
  for (const session of day.sessions) {
    const to = Math.min(at + session.hours * 60, end)
    if (to - at < 30) break
    out.push({ session, from: at, to })
    at = to + BREAK_MINUTES
  }
  return out
}

export interface IcsText {
  /** `hours` is given for an all-day session (no start time), to say how long. */
  session: (code: string, type: RevisionType, hours?: number) => string
  exam: (code: string) => string
  reminder: string
}

/**
 * An iCalendar file: one event per session and one per exam, in Melbourne time (TZID with its
 * VTIMEZONE, so a session at 09:00 stays at 09:00 across the daylight-saving change), each with a
 * reminder. `stamp` is the DTSTAMP (UTC), passed in so the file is reproducible.
 */
export function revisionIcs(plan: RevisionPlan, subjects: readonly RevisionSubject[], dayStart: string, text: IcsText, stamp: Date): string {
  const dt = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PickMySubjects//Revision plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...VTIMEZONE]
  const event = (uid: string, start: string, end: string, summary: string, trigger: string, allDay = false) => {
    lines.push('BEGIN:VEVENT', `UID:${uid}@pickmysubjects.github.io`, `DTSTAMP:${dt}`)
    if (allDay) lines.push(`DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`)
    else lines.push(`DTSTART;TZID=Australia/Melbourne:${start}`, `DTEND;TZID=Australia/Melbourne:${end}`)
    lines.push(`SUMMARY:${esc(summary)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(text.reminder)}`, `TRIGGER:${trigger}`, 'END:VALARM', 'END:VEVENT')
  }
  for (const day of plan.days) {
    if (!isTime(dayStart)) {
      // No start time: each session is an all-day note on its day.
      day.sessions.forEach((session, i) => event(`rev-${day.date}-${i}-${session.code}`, day.date.replaceAll('-', ''), addDays(day.date, 1).replaceAll('-', ''), text.session(session.code, session.type, session.hours), '-PT12H', true))
    }
    for (const [i, { session, from, to }] of (isTime(dayStart) ? sessionTimes(day, dayStart) : []).entries()) {
      event(`rev-${day.date}-${i}-${session.code}`, local(day.date, from), local(day.date, to), text.session(session.code, session.type), '-PT15M')
    }
    for (const code of day.exams) {
      const s = subjects.find((x) => x.code === code)
      if (s?.time && isTime(s.time)) {
        const from = toMinutes(s.time)
        event(`exam-${day.date}-${code}`, local(day.date, from), local(day.date, Math.min(from + 120, 24 * 60 - 1)), text.exam(code), '-PT2H')
      } else {
        event(`exam-${day.date}-${code}`, day.date.replaceAll('-', ''), addDays(day.date, 1).replaceAll('-', ''), text.exam(code), '-PT12H', true)
      }
    }
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n') + '\r\n'
}
