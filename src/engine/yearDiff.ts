import { referencedSubjects } from './expr'
import { PERIODS, type Dataset, type Period, type ReqField } from './schema'

/**
 * "What changed in 2027": the Handbook facts of one year, frozen (a snapshot), compared with the
 * next year's. Subjects keep one file across years (data/real/subjects/), so last year's
 * prerequisites, assessment and title are lost once the new year's are typed over them; a
 * snapshot taken before that keeps them (see MAINTENANCE.md, scripts/snapshot-year.ts).
 */

export interface SubjectSnap {
  title: string
  points: number
  /** Periods it runs in that year, or null when the data has nothing for that year. */
  periods: Period[] | null
  /** The prerequisite rule as canonical JSON, for comparing ('none', 'unknown' or the expression). */
  prereq: string
  prereqCodes: string[]
  /** Final exam's share of the mark (0 = no exam), or null when the assessment isn't recorded. */
  exam: number | null
}

export interface ComponentSnap {
  title: string
  course: string
  kind: string
  /** Subjects every student in it must take. */
  core: string[]
}

export interface YearSnapshot {
  year: number
  subjects: Record<string, SubjectSnap>
  components: Record<string, ComponentSnap>
}

/** Keys in a fixed order, so the same rule always gives the same text. */
function canonical(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(canonical).join(',')}]`
  if (x && typeof x === 'object') {
    return `{${Object.keys(x)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical((x as Record<string, unknown>)[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(x)
}

/** The facts of `year` in a dataset: subjects running that year, and every open major. */
export function snapshotOf(data: Pick<Dataset, 'subjects' | 'components'>, year: number): YearSnapshot {
  const subjects: Record<string, SubjectSnap> = {}
  for (const s of Object.values(data.subjects)) {
    if (s.discontinuedFrom !== undefined && year >= s.discontinuedFrom) continue
    const own = s.offerings === 'unknown' ? undefined : s.offerings[String(year)]
    const exam = s.assessment ? s.assessment.filter((a) => a.kind === 'exam').reduce((n, a) => n + a.weight, 0) : null
    subjects[s.code] = {
      title: s.title,
      points: s.points,
      periods: own ? PERIODS.filter((p) => own.includes(p)) : null,
      prereq: canonical(s.prerequisites as ReqField),
      prereqCodes: referencedSubjects(s.prerequisites),
      exam,
    }
  }
  const components: Record<string, ComponentSnap> = {}
  for (const c of data.components) {
    if (c.closedFrom !== undefined && year >= c.closedFrom) continue
    const core = c.requirements === 'unknown' ? [] : c.requirements.flatMap((r) => ('all' in r ? r.all : []))
    components[c.id] = { title: c.title, course: c.course, kind: c.kind, core: [...new Set(core)].sort() }
  }
  return { year, subjects, components }
}

export type SubjectChange =
  | { field: 'periods'; from: Period[]; to: Period[] }
  | { field: 'prerequisites'; added: string[]; removed: string[] }
  | { field: 'exam'; from: number; to: number }
  | { field: 'points'; from: number; to: number }
  | { field: 'title'; from: string; to: string }

export interface YearDiff {
  from: number
  to: number
  subjects: {
    added: string[]
    discontinued: string[]
    changed: { code: string; changes: SubjectChange[] }[]
  }
  components: {
    added: string[]
    closed: string[]
    changed: { id: string; added: string[]; removed: string[] }[]
  }
}

const minus = (a: readonly string[], b: readonly string[]) => a.filter((x) => !b.includes(x))
const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/**
 * What's different between two years: subjects new, gone and changed (when it runs, its
 * prerequisites, exam share, points, title), and majors new, closed and with different compulsory
 * subjects. A field that one year doesn't record (no timetable, no assessment) is not a change.
 */
export function diffYears(a: YearSnapshot, b: YearSnapshot): YearDiff {
  const codes = (r: Record<string, unknown>) => Object.keys(r).sort()
  const changed: YearDiff['subjects']['changed'] = []
  for (const code of codes(b.subjects)) {
    const x = a.subjects[code]
    const y = b.subjects[code]!
    if (!x) continue
    const changes: SubjectChange[] = []
    if (x.periods && y.periods && !same(x.periods, y.periods)) changes.push({ field: 'periods', from: x.periods, to: y.periods })
    if (x.prereq !== y.prereq && x.prereq !== '"unknown"' && y.prereq !== '"unknown"') {
      changes.push({ field: 'prerequisites', added: minus(y.prereqCodes, x.prereqCodes), removed: minus(x.prereqCodes, y.prereqCodes) })
    }
    if (x.exam !== null && y.exam !== null && Math.round(x.exam) !== Math.round(y.exam)) changes.push({ field: 'exam', from: x.exam, to: y.exam })
    if (x.points !== y.points) changes.push({ field: 'points', from: x.points, to: y.points })
    if (x.title !== y.title) changes.push({ field: 'title', from: x.title, to: y.title })
    if (changes.length) changed.push({ code, changes })
  }
  const compChanged: YearDiff['components']['changed'] = []
  for (const id of codes(b.components)) {
    const x = a.components[id]
    const y = b.components[id]!
    if (!x) continue
    const added = minus(y.core, x.core)
    const removed = minus(x.core, y.core)
    if (added.length || removed.length) compChanged.push({ id, added, removed })
  }
  return {
    from: a.year,
    to: b.year,
    subjects: { added: minus(codes(b.subjects), codes(a.subjects)), discontinued: minus(codes(a.subjects), codes(b.subjects)), changed },
    components: { added: minus(codes(b.components), codes(a.components)), closed: minus(codes(a.components), codes(b.components)), changed: compChanged },
  }
}

/** Nothing to say: no page is made for an empty diff. */
export function diffIsEmpty(d: YearDiff): boolean {
  return [d.subjects.added, d.subjects.discontinued, d.subjects.changed, d.components.added, d.components.closed, d.components.changed].every((l) => l.length === 0)
}

/** The headline numbers, for the summary at the top of the page. */
export function diffCounts(d: YearDiff): { added: number; discontinued: number; changed: number; majors: number } {
  return {
    added: d.subjects.added.length,
    discontinued: d.subjects.discontinued.length,
    changed: d.subjects.changed.length,
    majors: d.components.added.length + d.components.closed.length + d.components.changed.length,
  }
}
