import type { Subject } from './schema'

/*
 * One rule for "which Handbook year's facts do we show". The data is entered year by year
 * (a new year goes under `offerings:` subject by subject), so for a while some subjects have the
 * new year and others only the old one. Everything that shows a year-bound fact asks here.
 */

/**
 * The newest Handbook year that is published. The maintainer bumps this when the next year's
 * Handbook comes out (mid-November); see MAINTENANCE.md. The calendar year counts as published
 * too, so a forgotten bump can't hide that the data is behind.
 */
export const HANDBOOK_PUBLISHED = 2026

/** "Today", replaceable in tests (the browser's own Date is mocked with page.clock instead). */
let fixedToday: Date | undefined
export function today(): Date {
  return fixedToday ? new Date(fixedToday) : new Date()
}
/** For tests: pretend it is this date (undefined: back to the real clock). */
export function setToday(d: Date | string | undefined): void {
  fixedToday = d === undefined ? undefined : new Date(d)
}
export const thisYear = (): number => today().getFullYear()

type Subjects = Record<string, Subject> | readonly Subject[]
const list = (s: Subjects): readonly Subject[] => (Array.isArray(s) ? s : Object.values(s))

/** The years a subject has offerings for, oldest first. */
export function dataYears(s: Subject): number[] {
  return s.offerings === 'unknown' ? [] : Object.keys(s.offerings).map(Number).sort((a, b) => a - b)
}

/** The newest year with any offerings in the data: the newest Handbook year we can link to. */
export function latestDataYear(subjects: Subjects): number {
  let max = 0
  for (const s of list(subjects)) for (const y of dataYears(s)) if (y > max) max = y
  return max || HANDBOOK_PUBLISHED
}

/** The newest Handbook year that is out: the constant, the data, or the calendar, whichever is later. */
export function publishedYear(subjects: Subjects, now: Date = today()): number {
  return Math.max(HANDBOOK_PUBLISHED, latestDataYear(subjects), now.getFullYear())
}

export interface FactsYear {
  /** The Handbook year the subject's facts come from. */
  year: number
  /** True when that is older than the year wanted and a newer Handbook is already out. */
  older: boolean
}

/**
 * Which year's facts to show for a subject when the student looks at `wanted`: that year if the
 * subject has it, else the newest year it has before it (else its oldest). `older` is set only
 * when the newer facts could exist already (the Handbook for that year is out), so a plan's 2029
 * terms aren't all flagged just because no one can know 2029 yet.
 */
export function factsYear(s: Subject, wanted: number, published: number = HANDBOOK_PUBLISHED): FactsYear {
  const years = dataYears(s)
  const earlier = years.filter((y) => y <= wanted)
  const year = earlier.length ? earlier[earlier.length - 1]! : years.length ? years[0]! : Math.min(s.sourceYear, wanted)
  return { year, older: year < Math.min(wanted, published) }
}

/** The data's own facts year for `wanted` is a real "doesn't run that year" (not just not entered yet). */
export function knownNotRunning(s: Subject, year: number): boolean {
  if (s.offerings === 'unknown') return false
  const exact = s.offerings[String(year)]
  return exact !== undefined && exact.length === 0
}

/**
 * Share of subjects whose data already has the newest published year. The site-wide "being
 * updated" notice shows while this is under half.
 */
export function shareUpdated(subjects: Subjects, published: number): number {
  const all = list(subjects).filter((s) => s.offerings !== 'unknown')
  if (!all.length) return 1
  return all.filter((s) => dataYears(s).some((y) => y >= published)).length / all.length
}

/** The date the data was last checked (newest `verified_on`), or undefined. */
export function lastVerified(subjects: Subjects): string | undefined {
  let max: string | undefined
  for (const s of list(subjects)) if (s.verifiedOn && (!max || s.verifiedOn > max)) max = s.verifiedOn
  return max
}

/**
 * The year a page looks at: this calendar year, or the plan's first year when that's later. An
 * older plan start (or the default plan's) never pins a page to a year that has passed.
 */
export function viewYear(planStart?: number): number {
  return Math.max(planStart ?? 0, thisYear())
}
