import { findCourse } from './courseRules'
import { latestDataYear } from './dataYear'
import { generatePlan } from './generate'
import type { Dataset } from './schema'

/**
 * What a new student's first year looks like in a degree, before choosing a major: the planner's
 * own first two semesters for it, keeping open every major the degree offers (the first-year
 * subjects at least half of them need). Each place in a semester is a set subject, one option of
 * a choice the degree gives, or an elective the student picks, named by the rule it counts for
 * (breadth, a commerce elective…): the planner's pick there is only one of many, so it isn't shown.
 * Worked out once per degree when the data is built (generated/first-year.json): planning takes
 * seconds, too slow to do on a phone.
 */
/**
 * An elective counts for the degree's own subjects (its category: arts, commerce…), for breadth,
 * or for anything. One in the degree's own area keeps the planner's pick as an example (a common
 * first-year subject there); a breadth one doesn't, as breadth is the student's own choice.
 */
export type FirstYearSlot = { kind: 'set' | 'choice'; code: string } | { kind: 'elective'; category: string; points: number; example?: string }

export interface FirstYear {
  course: string
  /** Semester 1, then semester 2. */
  semesters: [FirstYearSlot[], FirstYearSlot[]]
}

/** The degree's majors still offered in the latest year we have. */
export function openMajors(data: Dataset, course: string): string[] {
  const year = latestDataYear(data.subjects)
  return data.components.filter((c) => c.course === course && c.kind === 'major' && (c.closedFrom === undefined || year < c.closedFrom)).map((c) => c.id)
}

export function firstYear(data: Dataset, course: string): FirstYear {
  const year = latestDataYear(data.subjects)
  const courseYear = Math.max(...data.courses.filter((c) => c.code === course).map((c) => c.year))
  const majors = openMajors(data, course)
  const { plan, notes } = generatePlan({
    data,
    profile: { results: [], skills: {}, interests: [], goal: 'balanced' },
    course,
    courseYear,
    startYear: year,
    startPeriod: 'semester-1',
    minors: [],
    ...(majors.length ? { keepOpen: majors } : {}),
  })
  // Electives the planner added to fill a rule, and options it picked from a choice.
  const added = new Map(notes.filter((n) => n.key === 'added').map((n) => [String(n.params.code), String(n.params.rule)]))
  const chosen = new Set(notes.filter((n) => n.key === 'chose').map((n) => String(n.params.code)))
  // The category the rule counts (arts, breadth…); a rule on the total or a level alone takes anything.
  // The rules in force for that start year (the nearest earlier version when it has none of its own).
  const rules = findCourse(data, course, courseYear)?.rules ?? []
  const category = (ruleId: string) => {
    const r = rules.find((x) => x.id === ruleId)
    return r?.kind === 'points' && r.category ? r.category : 'any'
  }
  const slot = (code: string): FirstYearSlot => {
    if (!added.has(code)) return { kind: chosen.has(code) ? 'choice' : 'set', code }
    const cat = category(added.get(code)!)
    return { kind: 'elective', category: cat, points: data.subjects[code]?.points ?? 12.5, ...(cat !== 'breadth' && cat !== 'any' ? { example: code } : {}) }
  }
  const main = plan.terms.filter((t) => t.period === 'semester-1' || t.period === 'semester-2')
  return { course, semesters: [(main[0]?.subjects ?? []).map(slot), (main[1]?.subjects ?? []).map(slot)] }
}
