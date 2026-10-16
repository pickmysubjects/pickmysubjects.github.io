import { SKILLS, type Dataset, type Skill, type Subject } from './schema'
import { MARKING_SKILLS, skillsOf } from './skills'
import { topicsOf } from './topics'

const cache = new WeakMap<Dataset, Map<string, Dataset>>()
// Each view's source: a view for one course turned into another starts from the full data again.
const rawOf = new WeakMap<Dataset, Dataset>()

/**
 * The dataset as a student in `course` sees it: a subject that is breadth for them and limits
 * breadth students to some periods runs only in those.
 */
export function forCourse(given: Dataset, course: string): Dataset {
  const data = rawOf.get(given) ?? given
  let byCourse = cache.get(data)
  if (!byCourse) cache.set(data, (byCourse = new Map()))
  const hit = byCourse.get(course)
  if (hit) return hit
  let changed = false
  const subjects: Record<string, Subject> = {}
  for (const [code, s] of Object.entries(data.subjects)) {
    const limit = s.categories[course] === 'breadth' ? s.breadthOfferings : undefined
    subjects[code] = limit ? { ...s, offerings: limit } : s
    changed ||= limit !== undefined
  }
  const view = changed ? { ...data, subjects } : data
  if (view !== data) rawOf.set(view, data)
  byCourse.set(course, view)
  return view
}

/** The course a new visitor starts with: the one with the most majors curated. */
export function defaultCourse(data: Dataset): string {
  const majors = (code: string) => data.components.filter((c) => c.course === code && c.kind === 'major').length
  return [...data.courses].filter((c) => c.listed).sort((a, b) => majors(b.code) - majors(a.code))[0]?.code ?? ''
}

const focusCache = new WeakMap<Dataset, Map<string, CourseFocus>>()

export interface CourseFocus {
  /** Every skill, the ones the course's own subjects use most first. */
  skills: Skill[]
  /** How many of the course's own subjects cover each topic. */
  topics: Map<string, number>
}

/** What a course's own subjects (not its breadth) are mostly about, to put those first. */
export function courseFocus(data: Dataset, course: string): CourseFocus {
  let byCourse = focusCache.get(data)
  if (!byCourse) focusCache.set(data, (byCourse = new Map()))
  const hit = byCourse.get(course)
  if (hit) return hit
  const own = Object.values(data.subjects).filter((s) => {
    const c = s.categories[course]
    return c !== undefined && c !== 'breadth' && c !== 'core'
  })
  const skillCount = new Map<Skill, number>()
  const topics = new Map<string, number>()
  for (const s of own) {
    for (const k of skillsOf(s, data)) skillCount.set(k, (skillCount.get(k) ?? 0) + 1)
    for (const t of topicsOf(s).topics) topics.set(t, (topics.get(t) ?? 0) + 1)
  }
  // How a subject is marked (exams, group work) is in nearly every course: those stay last.
  const marking = (k: Skill) => ((MARKING_SKILLS as readonly Skill[]).includes(k) ? 1 : 0)
  const skills = [...SKILLS].sort((a, b) => marking(a) - marking(b) || (skillCount.get(b) ?? 0) - (skillCount.get(a) ?? 0))
  const focus = { skills, topics }
  byCourse.set(course, focus)
  return focus
}
