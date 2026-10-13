import type { Dataset, Subject } from './schema'

const cache = new WeakMap<Dataset, Map<string, Dataset>>()

/**
 * The dataset as a student in `course` sees it: a subject that is breadth for them and limits
 * breadth students to some periods runs only in those.
 */
export function forCourse(data: Dataset, course: string): Dataset {
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
  byCourse.set(course, view)
  return view
}

/** The course a new visitor starts with: the one with the most majors curated. */
export function defaultCourse(data: Dataset): string {
  const majors = (code: string) => data.components.filter((c) => c.course === code && c.kind === 'major').length
  return [...data.courses].sort((a, b) => majors(b.code) - majors(a.code))[0]?.code ?? ''
}
