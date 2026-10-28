import { evaluateField, referencedSubjects, simplifyFor } from './expr'
import type { PlanTerm } from './plan'
import type { Dataset } from './schema'

/** One subject that lists `code` among its prerequisites, seen from a student's plan. */
export interface UnlockEntry {
  code: string
  /** Its semester in the plan (index into the plan's terms), or null when not planned. */
  termIndex: number | null
  /** Already passed. */
  done: boolean
  /**
   * Planned in the same semester as `code` or before it, and its prerequisites aren't met by
   * what comes earlier: the planner flags it too.
   */
  problem: 'same-term' | 'before' | null
}

/**
 * What a subject leads to for this student: subjects whose prerequisites name it, as the same
 * rules as the suggestions see them. A graduate subject (level 9) or one with no category in a
 * categorised degree isn't somewhere an undergraduate subject leads, unless it's already in the
 * plan. A subject planned no later than this one whose prerequisites are met another way isn't
 * unlocked by it and is left out; one that isn't met is a problem.
 */
export function unlockList(
  code: string,
  data: Pick<Dataset, 'subjects'> & { courses?: Dataset['courses'] },
  opts: { course: string; terms: readonly Pick<PlanTerm, 'subjects'>[]; completed: readonly string[] },
): UnlockEntry[] {
  const { course, terms } = opts
  const done = new Set(opts.completed)
  const termOf = new Map<string, number>()
  terms.forEach((t, i) => t.subjects.forEach((c) => termOf.set(c, i)))
  const own = termOf.get(code)
  const categorised = !!course && Object.values(data.subjects).some((x) => x.categories[course] !== undefined)
  const closed = new Set(data.courses?.find((c) => c.code === course)?.closed ?? [])
  const out: UnlockEntry[] = []
  for (const s of Object.values(data.subjects)) {
    if (s.code === code || !referencedSubjects(s.prerequisites).includes(code)) continue
    const at = termOf.get(s.code) ?? null
    const mine = at !== null || done.has(s.code)
    if (!mine) {
      if (closed.has(s.code)) continue
      if (course.startsWith('B-') && s.level > 3 && s.categories[course] === undefined) continue
      if (categorised && s.categories[course] === undefined) continue
      // Only a route open to this student counts (not "admission to the Master of …").
      if (!referencedSubjects(simplifyFor(s.prerequisites, course)).includes(code)) continue
    }
    let problem: UnlockEntry['problem'] = null
    if (at !== null && own !== undefined && at <= own) {
      const before = new Set([...done, ...terms.slice(0, at).flatMap((t) => t.subjects)])
      const sameTerm = new Set([...before, ...(terms[at]?.subjects ?? [])])
      const r = evaluateField(s.prerequisites, { completed: before, sameTerm, subjects: data.subjects, admittedCourse: course })
      // Met by what comes earlier: this subject isn't what opens it. Unknown (a test, a form) too.
      if (r.status !== 'fail') continue
      problem = at === own ? 'same-term' : 'before'
    }
    out.push({ code: s.code, termIndex: at, done: done.has(s.code), problem })
  }
  // Problems first, then in plan order, then the rest by code.
  const rank = (e: UnlockEntry) => (e.problem ? 0 : e.done ? 1 : e.termIndex !== null ? 2 : 3)
  return out.sort((a, b) => rank(a) - rank(b) || (a.termIndex ?? 0) - (b.termIndex ?? 0) || a.code.localeCompare(b.code))
}
