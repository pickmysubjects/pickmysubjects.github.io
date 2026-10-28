import { periodsFor } from './availability'
import { easeKey, inTopShare, RANK_SLUGS, rankable, rankFromSlug, rankSubject, rankTier, type RankDirection, type RankedSubject } from './easeRanking'
import { evaluateField, simplifyFor } from './expr'
import type { Recommendation } from './recommend'
import type { Period, Subject } from './schema'

export type BrowseSort = 'code' | 'easy' | 'exam' | 'hours' | 'rating'
/** The final exam's share: none, up to 40%, between, 60% or more (the gist's own cut-offs). */
export type ExamBand = 'none' | 'light' | 'mid' | 'heavy'
/** Class hours a week: up to 3, over 3 up to 5, over 5. */
export type HoursBand = 'light' | 'mid' | 'heavy'
/** Prerequisites: any, none at all, or met by what the student has done. */
export type PrereqChoice = 'any' | 'none' | 'met'

/**
 * What narrows Find subjects. Within a group the options are alternatives (level 1 or 2), and
 * the groups all apply together (level 1 or 2, and in semester 1).
 */
export interface BrowseFilters {
  /** Free text matched against code and titles. */
  text: string
  /**
   * Kinds of subject. 'breadth' is breadth for the student's degree; any other value (science,
   * arts, design…) is a subject that counts as that kind in some degree.
   */
  category: readonly string[]
  /** Fields (topic ids: biology, history…). */
  topics: readonly string[]
  level: readonly number[]
  period: readonly Period[]
  points: readonly number[]
  exam: readonly ExamBand[]
  hours: readonly HoursBand[]
  /** Easier or harder than most (the top third of the easy or hard list). */
  ease: readonly RankDirection[]
  prereq: PrereqChoice
  noGroup: boolean
  /** Leave out subjects whose final exam is a hurdle (must be passed on its own). */
  noHurdle: boolean
  /** Only subjects whose recorded assessment has no test during semester. */
  noTest: boolean
  /** Only subjects students have reviewed (a public summary or 3+ ratings here). */
  reviewed: boolean
  sort: BrowseSort
  /**
   * An order of its own, instead of `sort`: easiest first ('easy', 水课) or hardest first
   * ('hard', 难课). Never together with `mine`.
   */
  rank: RankDirection | null
  /** "Fits me": ordered by the student's own suggestions. Never together with `rank`. */
  mine: boolean
  /**
   * Leave out subjects the year's timetable says don't run (when it runs isn't known: kept).
   * On unless the student asks to see those too.
   */
  running: boolean
  /**
   * The degree an easy/hard list was opened for from a link (a subject page's "#5 on the easy
   * list" chip names its degree's list), until the student has chosen a degree of their own.
   */
  listCourse?: string
}

export const EMPTY_FILTERS: BrowseFilters = {
  text: '',
  category: [],
  topics: [],
  level: [],
  period: [],
  points: [],
  exam: [],
  hours: [],
  ease: [],
  prereq: 'any',
  noGroup: false,
  noHurdle: false,
  noTest: false,
  reviewed: false,
  sort: 'code',
  rank: null,
  mine: false,
  running: true,
}

/**
 * Shortcuts for the questions new students ask most. Each one only sets ordinary filters (the
 * same controls the filter panel shows), so the shortcut and the panel can never disagree: the
 * shortcut is lit while those filters are exactly its values.
 */
export const PRESETS = {
  firstSemester: { level: [1], period: ['semester-1'] },
  breadth: { category: ['breadth'] },
  noExam: { exam: ['none'] },
  summerWinter: { period: ['summer', 'winter'] },
} as const satisfies Record<string, Partial<BrowseFilters>>

export type PresetName = keyof typeof PRESETS

/** Each quick pick's own address (/subjects/no-exam/), a page search engines can show on its own. */
export const PRESET_SLUGS: Record<PresetName, string> = { firstSemester: 'first-semester', breadth: 'breadth', noExam: 'no-exam', summerWinter: 'summer-winter' }

/**
 * Lists cut from the easy list that students search for by name, each with its own address:
 * the easy list with the filters below (breadth for the student's degree, B-SCI on static pages).
 */
export const EASY_CUTS = {
  level3Breadth: { slug: 'easy-level-3-breadth', filters: { rank: 'easy', level: [3], category: ['breadth'] } },
} as const satisfies Record<string, { slug: string; filters: Partial<BrowseFilters> }>

export type EasyCut = keyof typeof EASY_CUTS

export function easyCutFromSlug(slug: string): EasyCut | undefined {
  return (Object.keys(EASY_CUTS) as EasyCut[]).find((c) => EASY_CUTS[c].slug === slug)
}

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

/** What the filters need to know beyond the subjects themselves. */
export interface BrowseContext {
  /** The student's degree: what "breadth" means, and how prerequisites read for it. */
  course: string
  year: number
  /** Every subject by code (prerequisites and the easy/hard cut-offs look across them). */
  all?: Readonly<Record<string, Subject>>
  /** Subjects the student has passed or planned before now, for "prerequisites I meet". */
  done?: ReadonlySet<string>
}

/** The groups of filters; within one, options are alternatives; across them, all apply. */
export const FILTER_GROUPS = ['category', 'topics', 'level', 'period', 'points', 'exam', 'hours', 'ease', 'prereq', 'noGroup', 'noHurdle', 'noTest', 'reviewed', 'running', 'text'] as const
export type FilterGroup = (typeof FILTER_GROUPS)[number]
/** The groups that take a list of options. */
export const LIST_GROUPS = ['category', 'topics', 'level', 'period', 'points', 'exam', 'hours', 'ease'] as const
export type ListGroup = (typeof LIST_GROUPS)[number]
/** The groups that are a single on/off switch. */
export const SWITCHES = ['noGroup', 'noHurdle', 'noTest', 'reviewed'] as const

/** A subject's row with every option it matches worked out once (they don't depend on the filters). */
export interface IndexedRow extends BrowseRow {
  options: Record<ListGroup, readonly (string | number)[]>
  /** Prerequisites: none at all; met by what the student has done. */
  prereqNone: boolean
  prereqMet: boolean
  reviewed: boolean
  /** Lower-case code and titles, for the text search. */
  words: string
}

export function examBand(exam: number | null): ExamBand | null {
  if (exam === null) return null
  return exam === 0 ? 'none' : exam <= 40 ? 'light' : exam < 60 ? 'mid' : 'heavy'
}

export function hoursBand(hours: number | null): HoursBand | null {
  if (hours === null) return null
  return hours <= 3 ? 'light' : hours <= 5 ? 'mid' : 'heavy'
}

const byCode = new WeakMap<readonly Subject[], Record<string, Subject>>()
function dictOf(subjects: readonly Subject[]): Record<string, Subject> {
  let d = byCode.get(subjects)
  if (!d) byCode.set(subjects, (d = Object.fromEntries(subjects.map((s) => [s.code, s]))))
  return d
}

/** Every subject's row and options, once per data set, degree, year and record. */
export function browseIndex(subjects: readonly Subject[], ctx: BrowseContext): IndexedRow[] {
  const all = ctx.all ?? dictOf(subjects)
  const done = ctx.done ?? new Set<string>()
  return subjects.map((s) => {
    const row = browseRow(s, ctx.year)
    const kinds = new Set<string>(Object.values(s.categories).filter((c) => c !== 'breadth'))
    if (s.categories[ctx.course] === 'breadth') kinds.add('breadth')
    const ease: RankDirection[] = []
    if (inTopShare(all, s, 'easy', ctx.course, ctx.year)) ease.push('easy')
    if (inTopShare(all, s, 'hard', ctx.course, ctx.year)) ease.push('hard')
    const needs = simplifyFor(s.prerequisites, ctx.course)
    const exam = examBand(row.exam)
    const hours = hoursBand(row.hours)
    return {
      ...row,
      options: {
        category: [...kinds],
        topics: s.topics,
        level: [s.level],
        period: row.periods,
        points: [s.points],
        exam: exam ? [exam] : [],
        hours: hours ? [hours] : [],
        ease,
      },
      prereqNone: needs === 'none',
      prereqMet: needs === 'none' || (needs !== 'unknown' && evaluateField(needs, { completed: done, subjects: all, admittedCourse: ctx.course }).status === 'ok'),
      reviewed: (s.discussions?.length ?? 0) > 0 || (s.signals?.reviews ?? 0) >= MIN_REVIEWS,
      words: [s.code, s.title, ...Object.values(s.titles ?? {})].join(' ').toLowerCase(),
    }
  })
}

/** Whether a row passes one group of filters. A filter on something not recorded leaves the row out. */
function passes(r: IndexedRow, g: FilterGroup, f: BrowseFilters, text: string): boolean {
  switch (g) {
    case 'text':
      return !text || r.words.includes(text)
    case 'prereq':
      return f.prereq === 'any' || (f.prereq === 'none' ? r.prereqNone : r.prereqMet)
    case 'noGroup':
      return !f.noGroup || r.group === 0
    case 'noHurdle':
      return !f.noHurdle || r.examHurdle === false
    case 'noTest':
      return !f.noTest || r.test === 0
    case 'reviewed':
      return !f.reviewed || r.reviewed
    case 'running':
      return !f.running || r.periods.length > 0 || r.subject.offerings === 'unknown'
    default: {
      const want = f[g] as readonly (string | number)[]
      return want.length === 0 || r.options[g].some((v) => want.includes(v))
    }
  }
}

/** The rows matching every filter, in the index's order. */
export function filterIndex(index: readonly IndexedRow[], f: BrowseFilters): IndexedRow[] {
  const text = f.text.trim().toLowerCase()
  return index.filter((r) => FILTER_GROUPS.every((g) => passes(r, g, f, text)))
}

/** For each option: how many subjects it would show, with every other group's filters applied. */
export interface Facets {
  lists: Record<ListGroup, Map<string | number, number>>
  prereq: { none: number; met: number }
  switches: Record<(typeof SWITCHES)[number] | 'running', number>
}

/**
 * Live counts beside each option. A row counts for a group's options when it passes every
 * other group (so picking level 1 doesn't make level 2 read 0: they are alternatives).
 */
export function facetCounts(index: readonly IndexedRow[], f: BrowseFilters): Facets {
  const text = f.text.trim().toLowerCase()
  const lists = Object.fromEntries(LIST_GROUPS.map((g) => [g, new Map<string | number, number>()])) as Facets['lists']
  const prereq = { none: 0, met: 0 }
  const switches = { noGroup: 0, noHurdle: 0, noTest: 0, reviewed: 0, running: 0 }
  for (const r of index) {
    let failed: FilterGroup | null = null
    let fails = 0
    for (const g of FILTER_GROUPS) {
      if (passes(r, g, f, text)) continue
      failed = g
      if (++fails > 1) break
    }
    if (fails > 1) continue
    const counts = (g: FilterGroup) => fails === 0 || failed === g
    for (const g of LIST_GROUPS) {
      if (!counts(g)) continue
      const m = lists[g]
      for (const v of new Set(r.options[g])) m.set(v, (m.get(v) ?? 0) + 1)
    }
    if (counts('prereq')) {
      if (r.prereqNone) prereq.none++
      if (r.prereqMet) prereq.met++
    }
    if (counts('noGroup') && r.group === 0) switches.noGroup++
    if (counts('noHurdle') && r.examHurdle === false) switches.noHurdle++
    if (counts('noTest') && r.test === 0) switches.noTest++
    if (counts('reviewed') && r.reviewed) switches.reviewed++
    // "Include subjects not running": how many the list would show with it on.
    if (counts('running')) switches.running++
  }
  return { lists, prereq, switches }
}

/** How many filters are narrowing the list (each chosen option counts once), search text aside. */
export function activeCount(f: BrowseFilters): number {
  return (
    LIST_GROUPS.reduce((n, g) => n + f[g].length, 0) +
    (f.prereq !== 'any' ? 1 : 0) +
    SWITCHES.filter((k) => f[k]).length +
    (f.running ? 0 : 1)
  )
}

/** Every filter off; the search text, order, list and "sort for me" stay. */
export function clearFilters(f: BrowseFilters): BrowseFilters {
  const { text, sort, rank, mine, listCourse } = f
  return { ...EMPTY_FILTERS, text, sort, rank, mine, ...(listCourse ? { listCourse } : {}) }
}

/** Sorts rows in place by the chosen order. */
function sortRows<T extends BrowseRow>(rows: T[], sort: BrowseSort): T[] {
  const sorts: Record<BrowseSort, (a: BrowseRow, b: BrowseRow) => number> = {
    code: (a, b) => a.subject.code.localeCompare(b.subject.code),
    easy: easiest(),
    exam: byNumber((r) => r.exam, 1),
    hours: byNumber((r) => r.hours, 1),
    rating: byNumber((r) => r.rating, -1),
  }
  return rows.sort(sorts[sort])
}

/**
 * Subjects matching every filter, in the chosen order. A filter on something the data doesn't
 * record (no assessment, unknown prerequisites) leaves the subject out rather than guessing.
 */
export function browse(subjects: Subject[], f: BrowseFilters, course: string, year: number, ctx: Partial<BrowseContext> = {}): IndexedRow[] {
  return sortRows(filterIndex(browseIndex(subjects, { ...ctx, course, year }), f), f.sort)
}

/** Sorts already-filtered rows (the page keeps one index and filters it on every change). */
export function sortedRows(rows: IndexedRow[], sort: BrowseSort): IndexedRow[] {
  return sortRows([...rows], sort)
}

const list = <T extends string | number>(xs: readonly T[]) => [...xs].join(',')

/** Filters as a query string, so a filtered list can be linked to; defaults are left out. */
export function filtersToQuery(f: BrowseFilters): string {
  const q = new URLSearchParams()
  if (f.text.trim()) q.set('q', f.text.trim())
  if (f.category.length) q.set('type', list(f.category))
  if (f.topics.length) q.set('topic', list(f.topics))
  if (f.level.length) q.set('level', list(f.level))
  if (f.period.length) q.set('when', list(f.period))
  if (f.points.length) q.set('points', list(f.points))
  if (f.exam.length) q.set('exam', list(f.exam))
  if (f.hours.length) q.set('hours', list(f.hours))
  if (f.ease.length) q.set('ease', list(f.ease))
  if (f.prereq !== 'any') q.set('prereq', f.prereq)
  if (f.noGroup) q.set('nogroup', '1')
  if (f.noHurdle) q.set('nohurdle', '1')
  if (f.noTest) q.set('notest', '1')
  if (f.reviewed) q.set('reviewed', '1')
  if (f.sort !== 'code') q.set('sort', f.sort)
  if (f.rank) q.set('list', f.rank)
  if (f.mine) q.set('mine', '1')
  if (!f.running) q.set('running', '0')
  if (f.rank && f.listCourse) q.set('course', f.listCourse)
  return q.toString()
}

const PERIOD_SET = new Set<string>(['summer', 'semester-1', 'winter', 'semester-2'])
const SORT_SET = new Set<string>(['code', 'easy', 'exam', 'hours', 'rating'])
const EXAM_SET = new Set<string>(['none', 'light', 'mid', 'heavy'])
const HOURS_SET = new Set<string>(['light', 'mid', 'heavy'])
const EASE_SET = new Set<string>(['easy', 'hard'])

/** The query keys that set filters; anything else (fbclid, utm_source from a shared link) is ignored. */
const FILTER_KEYS = new Set(['q', 'type', 'topic', 'level', 'when', 'points', 'exam', 'hours', 'ease', 'prereq', 'noprereq', 'noexam', 'nogroup', 'nohurdle', 'notest', 'reviewed', 'sort', 'preset', 'list', 'mine', 'breadth', 'offterm', 'running'])

/** A comma list from the query, each part kept only if `ok`, without repeats. */
function parts<T>(raw: string | null, ok: (x: string) => boolean, as: (x: string) => T = (x) => x as T): T[] {
  if (!raw) return []
  return [...new Set(raw.split(',').map((x) => x.trim()).filter((x) => x && ok(x)))].map(as)
}

/**
 * `slug` is the quick pick in the path (/subjects/no-exam/, /subjects/easy/); filters in the query
 * win over a filter preset. The easy and hard lists stay on whatever else the query sets, so the
 * old list addresses (/subjects/easy/?level=1&breadth=1) open the same list. Old single-value
 * addresses (type=breadth, noexam=1, noprereq=1, running=1) open what they always did.
 */
export function filtersFromQuery(q: URLSearchParams, slug = ''): BrowseFilters {
  const setsFilters = [...q.keys()].some((k) => FILTER_KEYS.has(k))
  const preset = q.get('preset') ?? (setsFilters ? undefined : presetFromSlug(slug))
  const cut = setsFilters ? undefined : easyCutFromSlug(slug)
  const base: BrowseFilters = { ...EMPTY_FILTERS, ...(preset && preset in PRESETS ? PRESETS[preset as PresetName] : {}), ...(cut ? EASY_CUTS[cut].filters : {}) }
  const pick = <T>(xs: T[], fallback: readonly T[]): readonly T[] => (xs.length ? xs : fallback)
  const category = parts<string>(q.get('type'), (x) => /^[a-z][a-z-]*$/.test(x))
  if (q.get('breadth') === '1' && !category.includes('breadth')) category.push('breadth')
  // The old summer & winter switch is those two periods.
  const period = parts<Period>(q.get('when'), (x) => PERIOD_SET.has(x))
  if (q.get('offterm') === '1') for (const p of ['summer', 'winter'] as const) if (!period.includes(p)) period.push(p)
  const exam = parts<ExamBand>(q.get('exam'), (x) => EXAM_SET.has(x))
  if (q.get('noexam') === '1' && !exam.includes('none')) exam.push('none')
  const prereq = q.get('prereq')
  const sort = q.get('sort') ?? ''
  return {
    text: q.get('q') ?? base.text,
    category: pick(category, base.category),
    topics: parts<string>(q.get('topic'), (x) => /^[a-z][a-z-]*$/.test(x)),
    level: pick(parts(q.get('level'), (x) => /^[1-9]$/.test(x), Number), base.level),
    period: pick(period, base.period),
    points: parts(q.get('points'), (x) => Number(x) > 0 && Number(x) <= 100, Number),
    exam: pick(exam, base.exam),
    hours: parts<HoursBand>(q.get('hours'), (x) => HOURS_SET.has(x)),
    ease: parts<RankDirection>(q.get('ease'), (x) => EASE_SET.has(x)),
    prereq: prereq === 'none' || prereq === 'met' ? prereq : q.get('noprereq') === '1' ? 'none' : base.prereq,
    noGroup: q.get('nogroup') === '1',
    noHurdle: q.get('nohurdle') === '1',
    noTest: q.get('notest') === '1',
    reviewed: q.get('reviewed') === '1',
    sort: SORT_SET.has(sort) ? (sort as BrowseSort) : base.sort,
    // One order at a time: an old link with both keeps "Fits me".
    rank: q.get('mine') === '1' ? null : (rankFromSlug(q.get('list') ?? '') ?? rankFromSlug(slug) ?? base.rank),
    mine: q.get('mine') === '1',
    running: q.get('running') !== '0',
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

/**
 * What the row of chips on Find subjects amounts to: an order (easy, hard) or a filter shortcut
 * (PRESETS); 'all' when neither. Used for the page's heading and its own address.
 */
export type QuickChoice = 'all' | RankDirection | PresetName
export const QUICK_CHOICES: readonly QuickChoice[] = ['all', 'easy', 'hard', 'noExam', 'firstSemester', 'breadth', 'summerWinter']

const same = (a: unknown, b: unknown) => JSON.stringify([...(a as unknown[])].sort()) === JSON.stringify([...(b as unknown[])].sort())

/** The filter shortcut whose filters are exactly what's set, if any (other groups may be set too). */
export function activePreset(f: BrowseFilters): PresetName | null {
  for (const name of Object.keys(PRESETS) as PresetName[]) {
    if (Object.entries(PRESETS[name]).every(([k, v]) => same(f[k as keyof BrowseFilters], v))) return name
  }
  return null
}

/** The order the chips set: "Fits me", easiest first, hardest first, or none (the sort menu's). */
export type Order = 'mine' | RankDirection | null
export function orderOf(f: BrowseFilters): Order {
  return f.mine ? 'mine' : f.rank
}

/** One order at a time: choosing one turns the others off (null: back to the sort menu). */
export function chooseOrder(f: BrowseFilters, o: Order): BrowseFilters {
  const { listCourse, ...rest } = f
  const rank = o === 'easy' || o === 'hard' ? o : null
  // Easy to hard and back stays on the same degree's lists.
  return { ...rest, rank, mine: o === 'mine', ...(rank && listCourse ? { listCourse } : {}) }
}

/** A filter shortcut: its filters, the others start over; the search text and the order stay. */
export function choosePreset(f: BrowseFilters, p: PresetName): BrowseFilters {
  const { text, sort, rank, mine, listCourse } = f
  return { ...EMPTY_FILTERS, text, sort, rank, mine, ...(listCourse ? { listCourse } : {}), ...PRESETS[p] }
}

/** Takes a shortcut's filters off again, leaving any others. */
export function removePreset(f: BrowseFilters, p: PresetName): BrowseFilters {
  const off = Object.fromEntries(Object.keys(PRESETS[p]).map((k) => [k, EMPTY_FILTERS[k as keyof BrowseFilters]]))
  return { ...f, ...off }
}

/** Which chip the filters amount to: an order first, then a shortcut; 'all' for neither. */
export function quickChoice(f: BrowseFilters): QuickChoice {
  return f.rank ?? activePreset(f) ?? 'all'
}

/** The state a chip's own address opens (/subjects/easy/, /subjects/no-exam/), from nothing set. */
export function applyQuick(f: BrowseFilters, choice: QuickChoice): BrowseFilters {
  if (choice === 'all') return { ...EMPTY_FILTERS, text: f.text }
  if (choice === 'easy' || choice === 'hard') return chooseOrder(f, choice)
  return choosePreset(f, choice)
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
  for (const cut of Object.values(EASY_CUTS)) {
    if (q === filtersToQuery({ ...EMPTY_FILTERS, ...cut.filters })) {
      return `subjects/${cut.slug}/${listCourse ? `?course=${encodeURIComponent(listCourse)}` : ''}`
    }
  }
  const all = filtersToQuery(f)
  return `subjects/${all ? `?${all}` : ''}`
}

/** A row on Find subjects, with why it's there when a list or "sort for me" put it there. */
export interface FoundRow extends IndexedRow {
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
  /** The rows already indexed (browseIndex) for this course and year, so they aren't worked out again. */
  index?: readonly IndexedRow[]
}

/**
 * Easiest first (or hardest first) over the rows given: what students say first, then the
 * Handbook facts (the easy list's own measure, rankSubject). The two directions are exact
 * reverses of each other. Subjects with nothing to rank on, or that can't be ranked (graduate,
 * pass/fail, not running that year, not part of the degree), go last, by code, in both.
 */
export function easeOrder<T extends BrowseRow>(rows: readonly T[], direction: RankDirection, course: string, year: number): (T & { ranked?: RankedSubject })[] {
  const sign = direction === 'easy' ? 1 : -1
  const keyed = rows.map((r) => {
    const ranked = rankable(r.subject, course, year) ? rankSubject(r.subject, direction) : null
    return { r, ranked, tier: ranked ? rankTier(ranked.reviews, direction) : 0 }
  })
  keyed.sort((a, b) => {
    if (!a.ranked || !b.ranked) return a.ranked === b.ranked ? a.r.subject.code.localeCompare(b.r.subject.code) : a.ranked ? -1 : 1
    return a.tier - b.tier || (b.ranked.score - a.ranked.score) * sign || a.r.subject.code.localeCompare(b.r.subject.code)
  })
  return keyed.map(({ r, ranked }) => (ranked ? { ...r, ranked } : r))
}

/**
 * What Find subjects lists: the filtered subjects in the chosen order; easiest or hardest first
 * (easeOrder); with "Fits me", only the student's suggestions, in their order.
 */
export function findRows(subjects: Subject[], f: BrowseFilters, o: FindOptions): FoundRow[] {
  let rows: FoundRow[] = o.index ? sortedRows(filterIndex(o.index, f), f.sort) : browse(subjects, f, o.course, o.year)
  if (f.rank) rows = easeOrder(rows, f.rank, o.rankCourse, o.year)
  if (f.mine && o.recs) {
    const byCode = new Map(rows.map((r) => [r.subject.code, r]))
    rows = o.recs.flatMap((rec) => {
      const row = byCode.get(rec.code)
      return row ? [{ ...row, rec }] : []
    })
  }
  return rows
}
