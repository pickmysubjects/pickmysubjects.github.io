import { periodsFor } from './availability'
import type { Period, Subject } from './schema'

export type BrowseSort = 'code' | 'exam' | 'hours' | 'rating'

export interface BrowseFilters {
  /** Free text matched against code and title. */
  text: string
  /** A course category (e.g. 'breadth' for B-SCI); '' for any. */
  category: string
  level: number | null
  period: Period | null
  noPrereq: boolean
  noExam: boolean
  noGroup: boolean
  sort: BrowseSort
}

export const EMPTY_FILTERS: BrowseFilters = {
  text: '',
  category: '',
  level: null,
  period: null,
  noPrereq: false,
  noExam: false,
  noGroup: false,
  sort: 'code',
}

/** Starting points for the questions new students ask most. */
export const PRESETS = {
  firstSemester: { level: 1, period: 'semester-1' },
  breadth: { category: 'breadth' },
  noExam: { noExam: true },
} as const satisfies Record<string, Partial<BrowseFilters>>

export type PresetName = keyof typeof PRESETS

export interface BrowseRow {
  subject: Subject
  periods: Period[]
  /** Final exam share; null when the assessment isn't recorded. */
  exam: number | null
  /** Share done in groups; null when the assessment isn't recorded. */
  group: number | null
  hours: number | null
  rating: number | null
}

function share(subject: Subject, pick: (t: NonNullable<Subject['assessment']>[number]) => boolean): number | null {
  const tasks = subject.assessment
  if (!tasks) return null
  return Math.round(tasks.filter(pick).reduce((sum, t) => sum + t.weight, 0) * 10) / 10
}

/** An overall 1–5 score from student ratings, only once enough students rated it. */
const MIN_REVIEWS = 3
function overall(subject: Subject): number | null {
  const s = subject.signals
  if (!s || s.reviews < MIN_REVIEWS) return null
  const parts = [s.interest, s.teaching, s.usefulness].filter((x): x is number => x !== undefined)
  return parts.length ? Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10 : null
}

export function browseRow(subject: Subject, year: number): BrowseRow {
  return {
    subject,
    periods: periodsFor(subject, year),
    exam: share(subject, (t) => t.kind === 'exam'),
    group: share(subject, (t) => t.group === true),
    hours: subject.weeklyContactHours ?? null,
    rating: overall(subject),
  }
}

// Unknown values sort last whichever way the list is ordered.
const byNumber = (pick: (r: BrowseRow) => number | null, dir: 1 | -1) => (a: BrowseRow, b: BrowseRow) => {
  const x = pick(a)
  const y = pick(b)
  if (x === null || y === null) return x === y ? a.subject.code.localeCompare(b.subject.code) : x === null ? 1 : -1
  return (x - y) * dir || a.subject.code.localeCompare(b.subject.code)
}

/**
 * Subjects matching every filter. A filter on something the data doesn't record
 * (no assessment, unknown prerequisites) leaves the subject out rather than guessing.
 */
export function browse(subjects: Subject[], f: BrowseFilters, course: string, year: number): BrowseRow[] {
  const text = f.text.trim().toLowerCase()
  const rows = subjects
    .filter((s) => !text || s.code.toLowerCase().includes(text) || s.title.toLowerCase().includes(text))
    .filter((s) => !f.category || s.categories[course] === f.category)
    .filter((s) => f.level === null || s.level === f.level)
    .filter((s) => !f.noPrereq || s.prerequisites === 'none')
    .map((s) => browseRow(s, year))
    .filter((r) => f.period === null || r.periods.includes(f.period))
    .filter((r) => !f.noExam || r.exam === 0)
    .filter((r) => !f.noGroup || r.group === 0)
  const sorts: Record<BrowseSort, (a: BrowseRow, b: BrowseRow) => number> = {
    code: (a, b) => a.subject.code.localeCompare(b.subject.code),
    exam: byNumber((r) => r.exam, 1),
    hours: byNumber((r) => r.hours, 1),
    rating: byNumber((r) => r.rating, -1),
  }
  return rows.sort(sorts[f.sort])
}

/** Filters as a query string, so a filtered list can be linked to; defaults are left out. */
export function filtersToQuery(f: BrowseFilters): string {
  const q = new URLSearchParams()
  if (f.text.trim()) q.set('q', f.text.trim())
  if (f.category) q.set('type', f.category)
  if (f.level !== null) q.set('level', String(f.level))
  if (f.period) q.set('when', f.period)
  if (f.noPrereq) q.set('noprereq', '1')
  if (f.noExam) q.set('noexam', '1')
  if (f.noGroup) q.set('nogroup', '1')
  if (f.sort !== 'code') q.set('sort', f.sort)
  return q.toString()
}

const PERIOD_SET = new Set<string>(['summer', 'semester-1', 'winter', 'semester-2'])
const SORT_SET = new Set<string>(['code', 'exam', 'hours', 'rating'])

export function filtersFromQuery(q: URLSearchParams): BrowseFilters {
  const preset = q.get('preset')
  const base = { ...EMPTY_FILTERS, ...(preset && preset in PRESETS ? PRESETS[preset as PresetName] : {}) }
  const level = Number(q.get('level'))
  const when = q.get('when') ?? ''
  const sort = q.get('sort') ?? ''
  return {
    text: q.get('q') ?? base.text,
    category: q.get('type') ?? base.category,
    level: Number.isInteger(level) && level >= 1 && level <= 3 ? level : base.level,
    period: PERIOD_SET.has(when) ? (when as Period) : base.period,
    noPrereq: q.get('noprereq') === '1' || base.noPrereq,
    noExam: q.get('noexam') === '1' || base.noExam,
    noGroup: q.get('nogroup') === '1' || base.noGroup,
    sort: SORT_SET.has(sort) ? (sort as BrowseSort) : base.sort,
  }
}
