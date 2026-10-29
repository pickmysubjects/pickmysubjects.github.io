/**
 * The revision planner: a day-by-day timetable from a start date to the last exam. Pure and
 * deterministic (same input, same plan); dates are Melbourne calendar days as YYYY-MM-DD and are
 * stepped with UTC date arithmetic, so daylight-saving changes never add or drop a day.
 *
 * The rule, as the page states it:
 * 1. Each subject gets a weight: its difficulty (easier 0.8, about average 1, harder 1.3) times
 *    its final exam's share of the mark when known (0.5 + share, so a 50% exam counts 1).
 * 2. Exam days and rest days are left free; no day has more than the hours the student gives.
 * 3. The last free day before each exam goes to that subject (shared by exams on the same day).
 * 4. Every other free day is shared by the subjects whose exams are still ahead, by weight times
 *    how close the exam is (1 / square root of the days left), at most three subjects a day; a
 *    subject that got less than its share on earlier days catches up first.
 * 5. Nothing is planned for a subject after its exam.
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
}

export interface RevisionInput {
  subjects: readonly RevisionSubject[]
  /** First day of revision, YYYY-MM-DD. */
  start: string
  /** Hours a day available (0–16). */
  hoursPerDay: number
  /** Weekdays to rest, 0 = Sunday … 6 = Saturday. */
  restWeekdays?: readonly number[]
}

export interface RevisionSession {
  code: string
  /** Hours, in half hours. */
  hours: number
  /** The last free day before this subject's exam. */
  focus: boolean
}

export type RevisionDayKind = 'study' | 'rest' | 'exam'

export interface RevisionDay {
  date: string
  kind: RevisionDayKind
  /** Subjects with their exam on this day (an exam day). */
  exams: string[]
  sessions: RevisionSession[]
}

export type RevisionSkip = 'noDate' | 'pastExam'

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
/** Subjects sharing one ordinary day, at most. */
export const MAX_SUBJECTS_A_DAY = 3
export const MAX_HOURS_A_DAY = 16

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

/** Splits `units` among items by score (largest remainder), one unit each first; scores are > 0. */
function split(units: number, items: { code: string; score: number }[]): Map<string, number> {
  const list = items.slice(0, units)
  const out = new Map(list.map((x) => [x.code, 1]))
  let left = units - list.length
  if (left <= 0) return out
  const total = list.reduce((t, x) => t + x.score, 0)
  const exact = list.map((x) => ({ code: x.code, v: (left * x.score) / total }))
  for (const x of exact) {
    const whole = Math.floor(x.v)
    out.set(x.code, out.get(x.code)! + whole)
    left -= whole
  }
  // Ties keep the given order (a stable sort), so the result never varies.
  const byRest = [...exact].sort((a, b) => b.v - Math.floor(b.v) - (a.v - Math.floor(a.v)))
  for (let i = 0; left > 0; i++, left--) out.set(byRest[i % byRest.length]!.code, out.get(byRest[i % byRest.length]!.code)! + 1)
  return out
}

export function planRevision(input: RevisionInput): RevisionPlan {
  const hours = cleanHours(input.hoursPerDay)
  const rest = new Set((input.restWeekdays ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))
  const skipped: RevisionPlan['skipped'] = []
  // One row per code (the first one wins), in the order given.
  const seen = new Set<string>()
  const subjects: (RevisionSubject & { w: number; order: number })[] = []
  input.subjects.forEach((s) => {
    if (seen.has(s.code)) return
    seen.add(s.code)
    if (!isDay(s.exam)) skipped.push({ code: s.code, why: 'noDate' })
    else if (!isDay(input.start) || s.exam <= input.start) skipped.push({ code: s.code, why: 'pastExam' })
    else subjects.push({ ...s, w: subjectWeight(s), order: subjects.length })
  })
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

  // Rule 3: the last free day before each exam date, earliest exams choosing first.
  const focus = new Map<string, string>() // date -> exam date it's kept for
  for (const exam of [...examsOn.keys()]) {
    for (let i = daysBetween(input.start, exam) - 1; i >= 0; i--) {
      const day = days[i]!
      if (day.kind !== 'study' || focus.has(day.date)) continue
      focus.set(day.date, exam)
      break
    }
  }

  const units = hours * 2
  const owed = new Map(subjects.map((s) => [s.code, 0])) // hours deserved minus hours given
  for (const day of days) {
    if (day.kind !== 'study') continue
    const ahead = byExam.filter((s) => s.exam > day.date)
    if (!ahead.length) continue
    const kept = focus.get(day.date)
    if (kept) {
      const who = ahead.filter((s) => s.exam === kept)
      for (const [code, u] of split(units, who.map((s) => ({ code: s.code, score: s.w })))) {
        day.sessions.push({ code, hours: u / 2, focus: true })
      }
    } else {
      const score = (s: (typeof ahead)[number]) => s.w / Math.sqrt(daysBetween(day.date, s.exam))
      const sum = ahead.reduce((t, s) => t + score(s), 0)
      for (const s of ahead) owed.set(s.code, owed.get(s.code)! + (hours * score(s)) / sum)
      const pick = [...ahead]
        .sort((a, b) => owed.get(b.code)! - owed.get(a.code)! || a.exam.localeCompare(b.exam) || a.order - b.order)
        .slice(0, Math.min(MAX_SUBJECTS_A_DAY, units))
      const shares = split(units, pick.map((s) => ({ code: s.code, score: Math.max(owed.get(s.code)!, 0.01) })))
      for (const s of byExam) {
        const u = shares.get(s.code)
        if (u) day.sessions.push({ code: s.code, hours: u / 2, focus: false })
      }
    }
    for (const x of day.sessions) {
      owed.set(x.code, owed.get(x.code)! - x.hours)
      totals.set(x.code, totals.get(x.code)! + x.hours)
    }
  }
  return result(days)
}

// ---------- saving ----------

export interface RevisionState {
  subjects: { code: string; exam: string; time?: string; difficulty?: RevisionDifficulty }[]
  start: string
  hoursPerDay: number
  /** Daily start time of the first session, HH:MM. */
  dayStart: string
  restWeekdays: number[]
  /** The student changed the list: stop filling it from the plan. */
  edited: boolean
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
export const isTime = (x: unknown): x is string => typeof x === 'string' && TIME.test(x)
const LEVELS: readonly RevisionDifficulty[] = ['easier', 'average', 'harder']

export function emptyRevision(): RevisionState {
  return { subjects: [], start: '', hoursPerDay: 6, dayStart: '09:00', restWeekdays: [], edited: false }
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
        return [{ code: s.code, exam: isDay(s.exam) ? s.exam : '', ...(isTime(s.time) ? { time: s.time } : {}), ...(LEVELS.includes(s.difficulty as RevisionDifficulty) ? { difficulty: s.difficulty as RevisionDifficulty } : {}) }]
      })
    : []
  return {
    subjects: subjects.slice(0, 12),
    start: isDay(r.start) ? r.start : '',
    hoursPerDay: typeof r.hoursPerDay === 'number' ? cleanHours(r.hoursPerDay) : base.hoursPerDay,
    dayStart: isTime(r.dayStart) ? r.dayStart : base.dayStart,
    restWeekdays: Array.isArray(r.restWeekdays) ? [...new Set(r.restWeekdays.filter((d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6))].sort() : [],
    edited: r.edited === true,
  }
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

/** Each day's sessions back to back from the start time, cut at midnight. */
export function sessionTimes(day: RevisionDay, dayStart: string): { session: RevisionSession; from: number; to: number }[] {
  let at = isTime(dayStart) ? toMinutes(dayStart) : 9 * 60
  const out: { session: RevisionSession; from: number; to: number }[] = []
  for (const session of day.sessions) {
    const to = Math.min(at + session.hours * 60, 24 * 60 - 1)
    if (to <= at) break
    out.push({ session, from: at, to })
    at = to
  }
  return out
}

export interface IcsText {
  session: (code: string, focus: boolean) => string
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
    for (const { session, from, to } of sessionTimes(day, dayStart)) {
      event(`rev-${day.date}-${session.code}`, local(day.date, from), local(day.date, to), text.session(session.code, session.focus), '-PT15M')
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
