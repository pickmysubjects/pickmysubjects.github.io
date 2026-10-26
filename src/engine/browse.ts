import { periodsFor } from './availability'
import { easeKey, RANK_SLUGS, rankFromSlug, rankSubjects, type RankDirection, type RankedSubject } from './easeRanking'
import type { Recommendation } from './recommend'
import type { Period, Subject } from './schema'

export type BrowseSort = 'code' | 'easy' | 'exam' | 'hours' | 'rating'

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
  /** Leave out subjects whose final exam is a hurdle (must be passed on its own). */
  noHurdle: boolean
  /** Only subjects whose recorded assessment has no test during semester. */
  noTest: boolean
  sort: BrowseSort
  /** Only the easy (or hard) list, in its order; null for no list. */
  rank: RankDirection | null
  /** "Sort for me": ordered by the student's own suggestions. */
  mine: boolean
  /** Only subjects offered in summer or winter term that year. */
  offTerm: boolean
  /**
   * The degree an easy/hard list was opened for from a link (a subject page's "#5 on the easy
   * list" chip names its degree's list), until the student has chosen a degree of their own.
   */
  listCourse?: string
}

export const EMPTY_FILTERS: BrowseFilters = {
  text: '',
  category: '',
  level: null,
  period: null,
  noPrereq: false,
  noExam: false,
  noGroup: false,
  noHurdle: false,
  noTest: false,
  sort: 'code',
  rank: null,
  mine: false,
  offTerm: false,
}

/** Starting points for the questions new students ask most. */
export const PRESETS = {
  firstSemester: { level: 1, period: 'semester-1' },
  // Breadth is picked for an easy mark more than anything: easiest first.
  breadth: { category: 'breadth', sort: 'easy' },
  noExam: { noExam: true },
  summerWinter: { offTerm: true },
} as const satisfies Record<string, Partial<BrowseFilters>>

export type PresetName = keyof typeof PRESETS

/** Each quick pick's own address (/subjects/no-exam/), a page search engines can show on its own. */
export const PRESET_SLUGS: Record<PresetName, string> = { firstSemester: 'first-semester', breadth: 'breadth', noExam: 'no-exam', summerWinter: 'summer-winter' }

export function presetFromSlug(slug: string): PresetName | undefined {
  return (Object.keys(PRESET_SLUGS) as PresetName[]).find((p) => PRESET_SLUGS[p] === slug)
}

export interface BrowseRow {
  subject: Subject
  periods: Period[]
  /** Final exam share; null when the assessment isn't recorded. */
  exam: number | null
  /** Share done in groups; null when the assessment isn't recorded. */
  group: number | null
  hours: number | null
  rating: number | null
  /** Whether a final exam is a hurdle; null when the assessment isn't recorded. */
  examHurdle: boolean | null
  /** Share of tests during semester; null when the assessment isn't recorded. */
  test: number | null
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

function browseRow(subject: Subject, year: number): BrowseRow {
  return {
    subject,
    periods: periodsFor(subject, year),
    exam: share(subject, (t) => t.kind === 'exam'),
    group: share(subject, (t) => t.group === true),
    hours: subject.weeklyContactHours ?? null,
    rating: overall(subject),
    test: share(subject, (t) => t.kind === 'test'),
    examHurdle: subject.assessment ? subject.assessment.some((t) => t.kind === 'exam' && t.hurdle === true) : null,
  }
}

// Unknown values sort last whichever way the list is ordered.
const byNumber = (pick: (r: BrowseRow) => number | null, dir: 1 | -1) => (a: BrowseRow, b: BrowseRow) => {
  const x = pick(a)
  const y = pick(b)
  if (x === null || y === null) return x === y ? a.subject.code.localeCompare(b.subject.code) : x === null ? 1 : -1
  return (x - y) * dir || a.subject.code.localeCompare(b.subject.code)
}

// Easiest first, as the easy list orders them; subjects with nothing to rank on go last.
function easiest() {
  const keys = new Map<string, ReturnType<typeof easeKey>>()
  const key = (r: BrowseRow) => {
    if (!keys.has(r.subject.code)) keys.set(r.subject.code, easeKey(r.subject))
    return keys.get(r.subject.code)!
  }
  return (a: BrowseRow, b: BrowseRow) => {
    const x = key(a)
    const y = key(b)
    if (!x || !y) return x === y ? a.subject.code.localeCompare(b.subject.code) : x ? -1 : 1
    return x.tier - y.tier || y.score - x.score || a.subject.code.localeCompare(b.subject.code)
  }
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
    .filter((r) => !f.offTerm || r.periods.includes('summer') || r.periods.includes('winter'))
    .filter((r) => !f.noExam || r.exam === 0)
    .filter((r) => !f.noGroup || r.group === 0)
    .filter((r) => !f.noHurdle || r.examHurdle === false)
    .filter((r) => !f.noTest || r.test === 0)
  const sorts: Record<BrowseSort, (a: BrowseRow, b: BrowseRow) => number> = {
    code: (a, b) => a.subject.code.localeCompare(b.subject.code),
    easy: easiest(),
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
  if (f.noHurdle) q.set('nohurdle', '1')
  if (f.noTest) q.set('notest', '1')
  if (f.sort !== 'code') q.set('sort', f.sort)
  if (f.rank) q.set('list', f.rank)
  if (f.mine) q.set('mine', '1')
  if (f.offTerm) q.set('offterm', '1')
  if (f.rank && f.listCourse) q.set('course', f.listCourse)
  return q.toString()
}

const PERIOD_SET = new Set<string>(['summer', 'semester-1', 'winter', 'semester-2'])
const SORT_SET = new Set<string>(['code', 'easy', 'exam', 'hours', 'rating'])

/** The query keys that set filters; anything else (fbclid, utm_source from a shared link) is ignored. */
const FILTER_KEYS = new Set(['q', 'type', 'level', 'when', 'noprereq', 'noexam', 'nogroup', 'nohurdle', 'notest', 'sort', 'preset', 'list', 'mine', 'breadth', 'offterm'])

/**
 * `slug` is the quick pick in the path (/subjects/no-exam/, /subjects/easy/); filters in the query
 * win over a filter preset. The easy and hard lists stay on whatever else the query sets, so the
 * old list addresses (/subjects/easy/?level=1&breadth=1) open the same list.
 */
export function filtersFromQuery(q: URLSearchParams, slug = ''): BrowseFilters {
  const setsFilters = [...q.keys()].some((k) => FILTER_KEYS.has(k))
  const preset = q.get('preset') ?? (setsFilters ? undefined : presetFromSlug(slug))
  const base = { ...EMPTY_FILTERS, ...(preset && preset in PRESETS ? PRESETS[preset as PresetName] : {}) }
  const level = Number(q.get('level'))
  const when = q.get('when') ?? ''
  const sort = q.get('sort') ?? ''
  return {
    text: q.get('q') ?? base.text,
    category: q.get('type') ?? (q.get('breadth') === '1' ? 'breadth' : base.category),
    level: Number.isInteger(level) && level >= 1 && level <= 3 ? level : base.level,
    period: PERIOD_SET.has(when) ? (when as Period) : base.period,
    noPrereq: q.get('noprereq') === '1' || base.noPrereq,
    noExam: q.get('noexam') === '1' || base.noExam,
    noGroup: q.get('nogroup') === '1' || base.noGroup,
    noHurdle: q.get('nohurdle') === '1',
    noTest: q.get('notest') === '1',
    sort: SORT_SET.has(sort) ? (sort as BrowseSort) : base.sort,
    rank: rankFromSlug(q.get('list') ?? '') ?? rankFromSlug(slug) ?? null,
    mine: q.get('mine') === '1',
    offTerm: q.get('offterm') === '1' || base.offTerm,
    ...(COURSE_CODE.test(q.get('course') ?? '') ? { listCourse: q.get('course')! } : {}),
  }
}

/** A degree's code as links write it (B-SCI, B-FADANCE). */
const COURSE_CODE = /^[A-Z]+(?:-[A-Z0-9]+)+$/

/**
 * The degree the easy and hard lists go by: the student's own once chosen; before that the one a
 * link opened the list for (what a subject page's place on it counted), else every degree.
 */
export function rankCourseOf(f: Pick<BrowseFilters, 'listCourse'>, chosen: string | null): string {
  return chosen ?? f.listCourse ?? ''
}

/** The one row of quick choices on Find subjects: one at a time, or all. */
export type QuickChoice = 'all' | RankDirection | PresetName
export const QUICK_CHOICES: readonly QuickChoice[] = ['all', 'easy', 'hard', 'noExam', 'firstSemester', 'breadth', 'summerWinter']

/** Which quick choice the filters amount to ('all' when none). Sort order doesn't count. */
export function quickChoice(f: BrowseFilters): QuickChoice {
  if (f.rank) return f.rank
  for (const name of Object.keys(PRESETS) as PresetName[]) {
    const want = PRESETS[name] as Partial<BrowseFilters>
    if (Object.entries(want).every(([k, v]) => k === 'sort' || f[k as keyof BrowseFilters] === v)) return name
  }
  return 'all'
}

/** Filters after tapping a quick choice: the search text and "sort for me" stay, the rest starts over. */
export function applyQuick(f: BrowseFilters, choice: QuickChoice): BrowseFilters {
  const base: BrowseFilters = { ...EMPTY_FILTERS, text: f.text, mine: f.mine }
  if (choice === 'all') return base
  // Easy to hard and back stays on the same degree's lists.
  if (choice === 'easy' || choice === 'hard') return { ...base, rank: choice, ...(f.listCourse ? { listCourse: f.listCourse } : {}) }
  return { ...base, ...PRESETS[choice] }
}

/**
 * The address for these filters, after the site part (e.g. "subjects/easy/"). A plain quick
 * choice keeps its own page's address (titles and search results point there); anything more
 * goes in the query.
 */
export function browseAddress(f: BrowseFilters): string {
  const choice = quickChoice(f)
  const { listCourse, ...rest } = f
  const q = filtersToQuery(rest)
  if (choice !== 'all' && q === filtersToQuery(applyQuick(EMPTY_FILTERS, choice))) {
    // A list opened for a degree keeps it in its address, so it stays that degree's list.
    const course = listCourse && f.rank ? `?course=${encodeURIComponent(listCourse)}` : ''
    return `subjects/${choice === 'easy' || choice === 'hard' ? RANK_SLUGS[choice] : PRESET_SLUGS[choice]}/${course}`
  }
  const all = filtersToQuery(f)
  return `subjects/${all ? `?${all}` : ''}`
}

/** A row on Find subjects, with why it's there when a list or "sort for me" put it there. */
export interface FoundRow extends BrowseRow {
  ranked?: RankedSubject
  rec?: Recommendation
}

export interface FindOptions {
  course: string
  /** The degree the easy/hard lists go by; '' for any degree. */
  rankCourse: string
  year: number
  /** The student's suggestions, best first: used when "sort for me" is on. */
  recs?: Recommendation[]
}

/**
 * What Find subjects lists: the filtered subjects; with an easy/hard list, only that list's
 * subjects in its order; with "sort for me", only the student's suggestions in their order.
 */
export function findRows(subjects: Subject[], f: BrowseFilters, o: FindOptions): FoundRow[] {
  let rows: FoundRow[] = browse(subjects, f, o.course, o.year)
  if (f.rank) {
    const byCode = new Map(rows.map((r) => [r.subject.code, r]))
    rows = rankSubjects(subjects, { direction: f.rank, course: o.rankCourse, year: o.year }).flatMap((ranked) => {
      const row = byCode.get(ranked.subject.code)
      return row ? [{ ...row, ranked }] : []
    })
  }
  if (f.mine && o.recs) {
    const byCode = new Map(rows.map((r) => [r.subject.code, r]))
    rows = o.recs.flatMap((rec) => {
      const row = byCode.get(rec.code)
      return row ? [{ ...row, rec }] : []
    })
  }
  return rows
}
