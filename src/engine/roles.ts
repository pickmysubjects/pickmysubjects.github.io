import { evaluateField, referencedSubjects } from './expr'
import type { Dataset } from './schema'

/** How a subject matters to a major or specialisation. */
export interface SubjectRole {
  component: string
  title: string
  kind: 'major' | 'specialisation'
  /** core: compulsory; option: one of a list to choose from; pathway: a prerequisite on the way to a core or option subject. */
  role: 'core' | 'option' | 'pathway' | 'route'
  /** pathway: can't be skipped on the way to `via`; route: one of several ways to it. */
  via?: string
}

const PATHWAY_DEPTH = 3

/**
 * Majors and specialisations of `course` that list this subject, or need it
 * (through up to three prerequisite steps) before one of their subjects.
 */
export function subjectRoles(data: Dataset, code: string, course: string): SubjectRole[] {
  const out: SubjectRole[] = []
  const blocked = blockedWithout(data, code, course)
  for (const c of data.components) {
    if (c.course !== course || c.requirements === 'unknown') continue
    const core = new Set(c.requirements.flatMap((r) => ('all' in r ? r.all : [])))
    const options = new Set(c.requirements.flatMap((r) => ('choose' in r ? r.choose.from : [])).filter((x) => !core.has(x)))
    const base = { component: c.id, title: c.title, kind: c.kind }
    if (core.has(code)) out.push({ ...base, role: 'core' })
    else if (options.has(code)) out.push({ ...base, role: 'option' })
    else {
      // Prefer leading to a compulsory subject over an option.
      const all = [...core, ...options]
      const needed = all.filter((x) => blocked.has(x)).sort()
      const via = needed.find((x) => core.has(x)) ?? needed[0]
      if (via) out.push({ ...base, role: 'pathway', via })
      else {
        const route = leadsTo(data, code, [...core]) ?? leadsTo(data, code, [...options])
        if (route) out.push({ ...base, role: 'route', via: route })
      }
    }
  }
  return out
}

/** The first of `targets` whose prerequisites reach `code` within a few steps. */
function leadsTo(data: Dataset, code: string, targets: string[]): string | undefined {
  return [...targets].sort().find((target) => ancestors(data, target).has(code))
}

const REFS = new WeakMap<Dataset, Map<string, string[]>>()
/** Subjects named in a subject's prerequisites, worked out once per dataset. */
function prereqRefs(data: Dataset, code: string): string[] {
  let cache = REFS.get(data)
  if (!cache) REFS.set(data, (cache = new Map()))
  let out = cache.get(code)
  if (!out) {
    const s = data.subjects[code]
    cache.set(code, (out = s ? referencedSubjects(s.prerequisites) : []))
  }
  return out
}

const ANCESTORS = new WeakMap<Dataset, Map<string, Set<string>>>()
/** Everything within PATHWAY_DEPTH prerequisite steps of a subject (cached: every subject asks). */
function ancestors(data: Dataset, target: string): Set<string> {
  let cache = ANCESTORS.get(data)
  if (!cache) ANCESTORS.set(data, (cache = new Map()))
  let seen = cache.get(target)
  if (seen) return seen
  seen = new Set([target])
  let frontier = [target]
  for (let depth = 0; depth < PATHWAY_DEPTH && frontier.length; depth++) {
    const next: string[] = []
    for (const c of frontier) {
      for (const r of prereqRefs(data, c)) {
        if (!seen.has(r)) {
          seen.add(r)
          next.push(r)
        }
      }
    }
    frontier = next
  }
  seen.delete(target)
  cache.set(target, seen)
  return seen
}

/**
 * Subjects that can't be taken at all without `code`: their prerequisites fail
 * when it (and anything that itself needs it) is missing. Unknown or manual
 * conditions count as passable, so this errs towards "not required".
 */
function blockedWithout(data: Dataset, code: string, course: string): Set<string> {
  const blocked = new Set([code])
  let changed = true
  while (changed) {
    changed = false
    const completed = new Set(Object.keys(data.subjects).filter((c) => !blocked.has(c)))
    for (const s of Object.values(data.subjects)) {
      if (blocked.has(s.code) || !prereqRefs(data, s.code).some((r) => blocked.has(r))) continue
      if (evaluateField(s.prerequisites, { completed, subjects: data.subjects, admittedCourse: course }).status === 'fail') {
        blocked.add(s.code)
        changed = true
      }
    }
  }
  blocked.delete(code)
  return blocked
}

export interface MajorOverview {
  /** Level-3 subjects every student of the major takes. */
  core: string[]
  /** Pick `points` from `from`. */
  choices: { points: number; from: string[] }[]
  /** Earlier subjects the major can't be done without, with one subject each leads to. */
  pathway: { code: string; via: string }[]
  /** Earlier subjects that are one of several ways in. */
  routes: { code: string; via: string }[]
}

/** What a major or specialisation asks for, including the earlier subjects on the way in. */
export function majorOverview(data: Dataset, id: string, course: string): MajorOverview | null {
  const c = data.components.find((x) => x.id === id && x.course === course)
  if (!c || c.requirements === 'unknown') return null
  const core = [...new Set(c.requirements.flatMap((r) => ('all' in r ? r.all : [])))].sort()
  const choices = c.requirements.flatMap((r) => ('choose' in r ? [{ points: r.choose.points, from: [...r.choose.from].sort() }] : []))
  const listed = new Set([...core, ...choices.flatMap((x) => x.from)])
  const pathway: MajorOverview['pathway'] = []
  const routes: MajorOverview['routes'] = []
  for (const s of Object.values(data.subjects)) {
    if (listed.has(s.code)) continue
    // Cheap test first: only subjects some listed subject's prerequisites reach are worth the full check.
    if (!leadsTo(data, s.code, [...listed])) continue
    const role = subjectRoles(data, s.code, course).find((r) => r.component === id)
    if (role?.role === 'pathway' && role.via) pathway.push({ code: s.code, via: role.via })
    else if (role?.role === 'route' && role.via) routes.push({ code: s.code, via: role.via })
  }
  const byCode = (a: { code: string }, b: { code: string }) => a.code.localeCompare(b.code)
  return { core, choices, pathway: pathway.sort(byCode), routes: routes.sort(byCode) }
}

/** Subjects two majors share anywhere in their overview (core, choices or pathway). */
export function sharedSubjects(a: MajorOverview, b: MajorOverview): string[] {
  const all = (o: MajorOverview) =>
    new Set([...o.core, ...o.choices.flatMap((c) => c.from), ...o.pathway.map((p) => p.code)])
  const bs = all(b)
  return [...all(a)].filter((x) => bs.has(x)).sort()
}

/**
 * Which subjects a plan must have, and which are picks from a major's lists: the course's
 * compulsory subjects, plus the core and unavoidable earlier subjects of the chosen major
 * and specialisation.
 */
export function planRoles(
  data: Dataset,
  course: string,
  courseYear: number,
  components: string[],
): { required: Set<string>; options: Set<string> } {
  const required = new Set<string>()
  const options = new Set<string>()
  const c = data.courses.find((x) => x.code === course && x.year === courseYear) ?? data.courses.find((x) => x.code === course)
  for (const rule of c?.rules ?? []) if (rule.kind === 'compulsory') rule.subjects.forEach((s) => required.add(s))
  for (const id of components.filter(Boolean)) {
    const o = majorOverview(data, id, course)
    if (!o) continue
    o.core.forEach((s) => required.add(s))
    o.pathway.forEach((p) => required.add(p.code))
    o.choices.flatMap((x) => x.from).forEach((s) => options.add(s))
  }
  for (const s of required) options.delete(s)
  return { required, options }
}
