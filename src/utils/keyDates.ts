/**
 * University key dates, copied by hand from the official key dates page (and the Employability
 * Week page) on 2026-10-23. Only dates the pages state are here; anything the pages didn't list
 * (for example 2027 census and withdrawal dates) is left out rather than guessed.
 * Census and withdrawal dates are the standard ones; each subject's own are on its Handbook page.
 */
export const KEY_DATES_SOURCE = 'https://students.unimelb.edu.au/course-admin/key-dates'
export const EMPLOYABILITY_SOURCE = 'https://students.unimelb.edu.au/careers/employability-week'
/** When the dates were copied; also the DTSTAMP of the calendar file, so it's stable. */
export const KEY_DATES_CHECKED = '2026-10-23'

export const KEY_DATE_KINDS = ['teaching', 'orientation', 'selfEnrol', 'employability', 'census', 'break', 'withdraw', 'swotvac', 'exams', 'results', 'supp'] as const
export type KeyDateKind = (typeof KEY_DATE_KINDS)[number]
export const KEY_DATE_TERMS = ['summer', 'semester-1', 'winter', 'semester-2'] as const
export type KeyDateTerm = (typeof KEY_DATE_TERMS)[number]

export interface KeyDate {
  /** Stable id, also the calendar UID. */
  id: string
  kind: KeyDateKind
  /** The academic year and term it belongs to (Summer Term 2027 starts in November 2026). */
  year: number
  term: KeyDateTerm
  /** First and last day, inclusive, as YYYY-MM-DD (Melbourne dates). */
  start: string
  end: string
  url: string
}

type Row = [KeyDateKind, KeyDateTerm, string, string?]
const A = KEY_DATES_SOURCE
const E = EMPLOYABILITY_SOURCE

function rows(year: number, list: Row[]): KeyDate[] {
  return list.map(([kind, term, start, end]) => ({
    id: `${year}-${term}-${kind}`,
    kind,
    year,
    term,
    start,
    end: end ?? start,
    url: kind === 'employability' ? E : A,
  }))
}

export const KEY_DATES: KeyDate[] = [
  ...rows(2026, [
    ['teaching', 'summer', '2026-01-05', '2026-03-01'],
    ['exams', 'summer', '2026-02-16', '2026-02-23'],
    ['orientation', 'semester-1', '2026-02-23', '2026-02-27'],
    ['teaching', 'semester-1', '2026-03-02', '2026-05-31'],
    ['selfEnrol', 'semester-1', '2026-03-13'],
    ['employability', 'semester-1', '2026-03-16', '2026-03-20'],
    ['census', 'semester-1', '2026-03-31'],
    ['break', 'semester-1', '2026-04-03', '2026-04-12'],
    ['withdraw', 'semester-1', '2026-05-08'],
    ['swotvac', 'semester-1', '2026-06-01', '2026-06-05'],
    ['exams', 'semester-1', '2026-06-09', '2026-06-26'],
    ['results', 'semester-1', '2026-07-10'],
    ['supp', 'semester-1', '2026-07-16', '2026-07-23'],
    ['teaching', 'winter', '2026-06-29', '2026-07-26'],
    ['orientation', 'semester-2', '2026-07-20', '2026-07-24'],
    ['teaching', 'semester-2', '2026-07-27', '2026-10-25'],
    ['selfEnrol', 'semester-2', '2026-08-07'],
    ['employability', 'semester-2', '2026-08-10', '2026-08-14'],
    ['census', 'semester-2', '2026-08-31'],
    ['withdraw', 'semester-2', '2026-09-25'],
    ['break', 'semester-2', '2026-09-28', '2026-10-04'],
    ['swotvac', 'semester-2', '2026-10-26', '2026-10-30'],
    ['exams', 'semester-2', '2026-11-02', '2026-11-20'],
    ['results', 'semester-2', '2026-12-04'],
    ['supp', 'semester-2', '2026-12-10', '2026-12-17'],
  ]),
  ...rows(2027, [
    ['teaching', 'summer', '2026-11-23', '2027-02-28'],
    ['exams', 'summer', '2027-02-15', '2027-02-22'],
    ['orientation', 'semester-1', '2027-02-22', '2027-02-26'],
    ['teaching', 'semester-1', '2027-03-01', '2027-05-30'],
    ['employability', 'semester-1', '2027-03-15', '2027-03-19'],
    ['break', 'semester-1', '2027-03-26', '2027-04-04'],
    ['swotvac', 'semester-1', '2027-05-31', '2027-06-04'],
    ['exams', 'semester-1', '2027-06-07', '2027-06-25'],
    ['results', 'semester-1', '2027-07-09'],
    ['supp', 'semester-1', '2027-07-16', '2027-07-23'],
    ['teaching', 'winter', '2027-06-28', '2027-07-25'],
    ['orientation', 'semester-2', '2027-07-19', '2027-07-23'],
    ['teaching', 'semester-2', '2027-07-26', '2027-10-24'],
    ['employability', 'semester-2', '2027-08-09', '2027-08-13'],
    ['break', 'semester-2', '2027-09-27', '2027-10-03'],
    ['swotvac', 'semester-2', '2027-10-25', '2027-10-29'],
    ['exams', 'semester-2', '2027-11-01', '2027-11-19'],
    ['results', 'semester-2', '2027-12-03'],
    ['supp', 'semester-2', '2027-12-10', '2027-12-17'],
  ]),
]

export interface KeyDateGroup {
  year: number
  term: KeyDateTerm
  items: (KeyDate & { past: boolean })[]
}

/** Today in Melbourne as YYYY-MM-DD (the dates are Melbourne dates). */
export function melbourneToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Melbourne', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/**
 * Groups by year, then term, in calendar order. A group with anything still to come is
 * "upcoming" (its finished items marked past); groups that are entirely over go to "past",
 * most recent first, and only for the current year.
 */
export function groupKeyDates(items: KeyDate[], today: string): { upcoming: KeyDateGroup[]; past: KeyDateGroup[] } {
  const groups = new Map<string, KeyDateGroup>()
  const order = (g: { year: number; term: KeyDateTerm }) => g.year * 10 + KEY_DATE_TERMS.indexOf(g.term)
  for (const d of [...items].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))) {
    const key = `${d.year}-${d.term}`
    if (!groups.has(key)) groups.set(key, { year: d.year, term: d.term, items: [] })
    groups.get(key)!.items.push({ ...d, past: d.end < today })
  }
  const all = [...groups.values()].sort((a, b) => order(a) - order(b))
  const thisYear = Number(today.slice(0, 4))
  return {
    upcoming: all.filter((g) => g.items.some((i) => !i.past)),
    past: all.filter((g) => g.items.every((i) => i.past) && g.year === thisYear).reverse(),
  }
}

const compact = (date: string) => date.replaceAll('-', '')

/** The day after a YYYY-MM-DD date (calendar all-day events end on the next day). */
export function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** An iCalendar file of all-day events. `label` names each item (in the reader's language). */
export function buildIcs(items: KeyDate[], label: (d: KeyDate) => string): string {
  const stamp = `${compact(KEY_DATES_CHECKED)}T000000Z`
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PickMySubjects//Key dates//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const d of items) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${d.id}@pickmysubjects.github.io`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(d.start)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(d.end))}`,
      `SUMMARY:${escapeText(label(d))}`,
      `URL:${d.url}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
