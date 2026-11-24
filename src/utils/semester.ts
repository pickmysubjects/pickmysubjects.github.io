import type { KeyDate, KeyDateKind, KeyDateTerm } from './keyDates'
import { daysBetween } from './whatsNext'

/**
 * "This semester": which week of semester it is, worked out only from the official key dates
 * (data/real/keyDates/<year>.yaml): the teaching period, the mid-semester break, SWOT Vac, the
 * exam period and the results day. Nothing is hardcoded, so a new year's file is all it needs.
 * Pure functions of the dates and a Melbourne day (YYYY-MM-DD), tested with any date.
 *
 * Teaching weeks run Monday to Sunday from the Monday of the teaching period's first day. A week
 * counts as the break when at least three of its weekdays fall in the break (Easter often starts
 * the break on a Friday, which stays part of the teaching week before it).
 */

export type SemesterTerm = Extract<KeyDateTerm, 'semester-1' | 'semester-2'>
const SEMESTERS: readonly KeyDateTerm[] = ['semester-1', 'semester-2']

export interface WeekSegment {
  kind: 'teach' | 'break' | 'swotvac' | 'exams'
  /** Teaching week number (1…n); 0 for the others. */
  week: number
  start: string
  end: string
  /** How many calendar weeks it spans (the exam period is usually three). */
  span: number
}

export interface SemesterShape {
  year: number
  term: SemesterTerm
  teaching: KeyDate
  segments: WeekSegment[]
  /** Teaching weeks (usually 12). */
  weeks: number
  orientation?: KeyDate
  swotvac?: KeyDate
  exams?: KeyDate
  results?: KeyDate
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** The Monday on or before a date. */
export function mondayOf(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay()
  return addDays(date, -((dow + 6) % 7))
}

const find = (dates: KeyDate[], year: number, term: KeyDateTerm, kind: KeyDateKind) => dates.find((d) => d.year === year && d.term === term && d.kind === kind)

/** One semester's weeks, from its key dates; null when its teaching period isn't published. */
export function semesterShape(dates: KeyDate[], year: number, term: SemesterTerm): SemesterShape | null {
  const teaching = find(dates, year, term, 'teaching')
  if (!teaching) return null
  const brk = find(dates, year, term, 'break')
  const swotvac = find(dates, year, term, 'swotvac')
  const exams = find(dates, year, term, 'exams')
  const segments: WeekSegment[] = []
  let week = 0
  for (let mon = mondayOf(teaching.start); mon <= teaching.end; mon = addDays(mon, 7)) {
    const sun = addDays(mon, 6)
    const breakDays = brk ? [0, 1, 2, 3, 4].map((i) => addDays(mon, i)).filter((d) => d >= brk.start && d <= brk.end).length : 0
    if (breakDays >= 3) segments.push({ kind: 'break', week: 0, start: mon, end: sun, span: 1 })
    else segments.push({ kind: 'teach', week: ++week, start: mon, end: sun, span: 1 })
  }
  if (swotvac) segments.push({ kind: 'swotvac', week: 0, start: mondayOf(swotvac.start), end: addDays(mondayOf(swotvac.end), 6), span: 1 })
  if (exams) {
    const start = mondayOf(exams.start)
    const span = Math.max(1, Math.round(daysBetween(start, addDays(mondayOf(exams.end), 7)) / 7))
    segments.push({ kind: 'exams', week: 0, start, end: addDays(start, span * 7 - 1), span })
  }
  return {
    year,
    term,
    teaching,
    segments,
    weeks: week,
    orientation: find(dates, year, term, 'orientation'),
    swotvac,
    exams,
    results: find(dates, year, term, 'results'),
  }
}

/** Every semester in the data, in calendar order. */
export function allSemesters(dates: KeyDate[]): SemesterShape[] {
  const out: SemesterShape[] = []
  for (const d of dates) {
    if (d.kind !== 'teaching' || !SEMESTERS.includes(d.term)) continue
    const s = semesterShape(dates, d.year, d.term as SemesterTerm)
    if (s) out.push(s)
  }
  return out.sort((a, b) => a.teaching.start.localeCompare(b.teaching.start))
}

/** How long after results the page keeps leading with "rate what you just finished". */
export const RESULTS_WINDOW_DAYS = 28

export type SemesterNow =
  /** Between semesters: the next one starts in `days`. */
  | { phase: 'before'; sem: SemesterShape; days: number }
  /** A teaching week, or the break (`week` is the last teaching week before it). */
  | { phase: 'teach' | 'break'; sem: SemesterShape; week: number; segment: number }
  | { phase: 'swotvac' | 'exams'; sem: SemesterShape; segment: number }
  /** Exams over, results not out yet. */
  | { phase: 'waiting'; sem: SemesterShape }
  /** Results are out (for up to RESULTS_WINDOW_DAYS, or until the next orientation). */
  | { phase: 'results'; sem: SemesterShape; next: SemesterShape | null }

/** Where today falls in the semesters; null when the data has nothing about now or later. */
export function semesterNow(dates: KeyDate[], today: string): SemesterNow | null {
  const sems = allSemesters(dates)
  for (let i = 0; i < sems.length; i++) {
    const sem = sems[i]!
    const next = sems[i + 1] ?? null
    const startMon = mondayOf(sem.teaching.start)
    if (today < startMon) {
      // Results of the semester before still count as "just out" only in the loop below.
      return { phase: 'before', sem, days: daysBetween(today, sem.teaching.start) }
    }
    let idx = sem.segments.findIndex((s) => s.start <= today && today <= s.end)
    // A day between published segments (say SWOT Vac not out yet) belongs to the one before it,
    // not to the next semester.
    if (idx < 0 && sem.segments.length && today <= sem.segments.at(-1)!.end) idx = sem.segments.reduce((last, s, k) => (s.start <= today ? k : last), -1)
    const seg = sem.segments[idx]
    const afterExams = seg?.kind === 'exams' && sem.exams !== undefined && today > sem.exams.end
    if (seg && !afterExams) {
      const ended = today > seg.end
      if (seg.kind === 'teach' || seg.kind === 'break') {
        // Past the last teaching week with nothing published after it yet: that's SWOT Vac's time.
        if (ended) return { phase: 'swotvac', sem, segment: idx }
        // A break that starts mid-week (Easter Friday) shows as the break on those days.
        const brk = find(dates, sem.year, sem.term, 'break')
        const inBreak = seg.kind === 'break' || (brk !== undefined && today >= brk.start && today <= brk.end)
        const before = sem.segments.slice(0, idx).filter((s) => s.kind === 'teach').length
        // In a teaching week the break runs into (it began the week before), the last full week is the one before.
        const week = seg.kind === 'teach' && !(inBreak && brk !== undefined && brk.start < seg.start) ? seg.week : before
        return { phase: inBreak ? 'break' : 'teach', sem, week, segment: idx }
      }
      // Exam weeks run Monday to Sunday; the days before the first exam are still SWOT Vac.
      if (seg.kind === 'exams' && sem.exams && today < sem.exams.start) return { phase: 'swotvac', sem, segment: idx }
      // Weekend days between SWOT Vac and the exams belong to SWOT Vac's segment already.
      return { phase: seg.kind, sem, segment: idx }
    }
    const last = sem.segments.at(-1)
    if (!afterExams && last && today <= last.end) continue
    if (sem.results) {
      if (today < sem.results.start) return { phase: 'waiting', sem }
      const until = [addDays(sem.results.start, RESULTS_WINDOW_DAYS - 1), next?.orientation ? addDays(next.orientation.start, -1) : null, next ? addDays(mondayOf(next.teaching.start), -1) : null]
        .filter((x): x is string => x !== null)
        .sort()[0]!
      if (today <= until) return { phase: 'results', sem, next }
    }
    // Otherwise on to the next semester ("starts in …").
  }
  return null
}

/** "Week 6 of 12" style progress through teaching: 0…1, for the slim bar on home. */
export function teachingProgress(now: SemesterNow): number {
  if (now.phase === 'before') return 0
  if (now.phase === 'teach' || now.phase === 'break') return now.sem.weeks ? now.week / now.sem.weeks : 0
  return 1
}

/** Official key dates still to come (or running), soonest first; the semester's own teaching period is left out. */
const NEXT_KINDS: readonly KeyDateKind[] = ['census', 'withdraw', 'selfEnrol', 'employability', 'reenrol', 'reenrolLate', 'orientation', 'teaching', 'break', 'swotvac', 'exams', 'results', 'supp']
export function nextKeyDates(dates: KeyDate[], today: string, max = 4): { date: KeyDate; days: number; running: boolean }[] {
  return dates
    .filter((d) => NEXT_KINDS.includes(d.kind) && d.end >= today && !(d.kind === 'teaching' && d.start <= today))
    .map((d) => ({ date: d, days: daysBetween(today, d.start), running: d.start < today }))
    .sort((a, b) => Number(b.running) - Number(a.running) || a.date.start.localeCompare(b.date.start) || a.date.end.localeCompare(b.date.end))
    .slice(0, max)
}

