import type { KeyDate, KeyDateKind, KeyDateTerm } from './keyDates'

/**
 * "What's next" on the home page: which key dates to show today. Pure functions of the dates
 * and a Melbourne day (YYYY-MM-DD), so they can be tested with any date.
 */

/** Dates worth a line on the home page (teaching periods only for when they start). */
const STRIP_KINDS: readonly KeyDateKind[] = ['census', 'withdraw', 'selfEnrol', 'reenrol', 'reenrolLate', 'orientation', 'teaching', 'break', 'swotvac', 'exams', 'results', 'supp']
/** Ranges still shown while they run ("until …"). */
const RUNNING_KINDS: readonly KeyDateKind[] = ['reenrol', 'reenrolLate', 'swotvac', 'exams', 'supp', 'break']
/** How far ahead a date counts as "coming up". */
export const STRIP_HORIZON_DAYS = 14

export interface StripItem {
  date: KeyDate
  /** Days from today to its first day (0 = today); negative while a range is running. */
  days: number
  running: boolean
}

/** Whole days from a to b (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

/** The 1–3 nearest dates that matter today: ranges running now first, then what starts soonest. */
export function upcomingDates(dates: KeyDate[], today: string, max = 3, horizon = STRIP_HORIZON_DAYS): StripItem[] {
  const items: StripItem[] = []
  for (const d of dates) {
    if (!STRIP_KINDS.includes(d.kind)) continue
    const days = daysBetween(today, d.start)
    const running = days < 0 && d.end >= today && RUNNING_KINDS.includes(d.kind)
    if (running || (days >= 0 && days <= horizon)) items.push({ date: d, days, running })
  }
  return items.sort((a, b) => Number(b.running) - Number(a.running) || a.date.start.localeCompare(b.date.start) || a.date.end.localeCompare(b.date.end)).slice(0, max)
}

export interface ExamWindow {
  year: number
  term: KeyDateTerm
  /** First day of SWOT Vac (or of the exams when a term has none) to the last exam day. */
  start: string
  exams: KeyDate
}

/** The exam season running today (SWOT Vac through the last exam), if any. */
export function examWindow(dates: KeyDate[], today: string): ExamWindow | null {
  for (const exams of dates) {
    if (exams.kind !== 'exams') continue
    const swot = dates.find((d) => d.kind === 'swotvac' && d.year === exams.year && d.term === exams.term)
    const start = swot && swot.start < exams.start ? swot.start : exams.start
    if (start <= today && today <= exams.end) return { year: exams.year, term: exams.term, start, exams }
  }
  return null
}

/** Terms under way today: teaching has started and the exams (or teaching) haven't finished. */
export function currentTerms(dates: KeyDate[], today: string): { year: number; term: KeyDateTerm }[] {
  const out: { year: number; term: KeyDateTerm }[] = []
  for (const teach of dates) {
    if (teach.kind !== 'teaching' || teach.start > today) continue
    const exams = dates.find((d) => d.kind === 'exams' && d.year === teach.year && d.term === teach.term)
    const last = exams && exams.end > teach.end ? exams.end : teach.end
    if (today <= last) out.push({ year: teach.year, term: teach.term })
  }
  return out
}

interface TermSubjects {
  year: number
  period: string
  subjects: string[]
}

/** The student's subjects in one term: planned there, or recorded there in My record. */
export function subjectsIn(year: number, term: KeyDateTerm, planTerms: TermSubjects[], results: { code: string; year?: number; period?: string }[]): string[] {
  const planned = planTerms.filter((t) => t.year === year && t.period === term).flatMap((t) => t.subjects)
  const recorded = results.filter((r) => r.year === year && r.period === term).map((r) => r.code)
  return [...new Set([...planned, ...recorded])]
}

/** The term under way that has the student's subjects in it, with those subjects and its exams. */
export function myTerm(dates: KeyDate[], today: string, planTerms: TermSubjects[], results: { code: string; year?: number; period?: string }[], known: (code: string) => boolean = () => true): { year: number; term: KeyDateTerm; subjects: string[]; exams?: KeyDate } | null {
  for (const t of currentTerms(dates, today)) {
    // Codes not in our data (typos, other universities) aren't counted as the student's subjects.
    const subjects = subjectsIn(t.year, t.term, planTerms, results).filter(known)
    if (!subjects.length) continue
    const exams = dates.find((d) => d.kind === 'exams' && d.year === t.year && d.term === t.term && d.end >= today)
    return { ...t, subjects, ...(exams ? { exams } : {}) }
  }
  return null
}
