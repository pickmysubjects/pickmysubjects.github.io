import generated from '@/generated/key-dates.json'
import { KEY_DATE_TERMS, type KeyDateKind, type KeyDateTerm } from './keyDatesSchema'
export { KEY_DATE_KINDS, KEY_DATE_TERMS, type KeyDateKind, type KeyDateTerm } from './keyDatesSchema'

/**
 * University key dates, from data/real/keyDates/<year>.yaml (each row with its official source,
 * validated when the data is built). Only dates the pages state are there; anything not
 * published yet (for example 2027 census and withdrawal dates) is left out rather than guessed.
 * Census and withdrawal dates are the standard ones; each subject's own are on its Handbook page.
 */
export const KEY_DATES_SOURCE = 'https://students.unimelb.edu.au/course-admin/key-dates'
export const EMPLOYABILITY_SOURCE = 'https://students.unimelb.edu.au/careers/employability-week'
export const REENROL_SOURCE = 'https://students.unimelb.edu.au/course-admin/re-enrol-in-your-course'

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

const data = generated as { checked: string; dates: KeyDate[] }
/** When the dates were last checked; also the DTSTAMP of the calendar file, so it's stable. */
export const KEY_DATES_CHECKED: string = data.checked
export const KEY_DATES: KeyDate[] = data.dates

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
