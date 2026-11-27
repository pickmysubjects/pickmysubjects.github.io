import type { Component, ComponentReq, Course, Dataset } from './schema'
import { isGraduateCode } from './graduateCourses'

/**
 * A coursework master's with no specialisations (MC-MTRNENG, MC-SCICMP) still has subject lists:
 * its course rules. For browsing only (the Courses & specialisations list, its pages and their
 * prerendered copies), each such course is shown as one card built from those rules. These cards
 * are never part of the data the planner reads, so plans and checks are unchanged.
 */
export const COURSE_CARD_PREFIX = 'course-'

export function courseCardId(code: string): string {
  return COURSE_CARD_PREFIX + code.toLowerCase()
}

function pathPoints(data: Dataset, path: ComponentReq[]): number {
  return path.reduce((sum, r) => sum + ('all' in r ? r.all.reduce((s, c) => s + (data.subjects[c]?.points ?? 12.5), 0) : r.choose.points), 0)
}

function cardOf(data: Dataset, course: Course): Component | null {
  const requirements: ComponentReq[] = []
  for (const r of course.rules) {
    if (r.kind === 'compulsory') requirements.push({ all: [...r.subjects] })
    else if (r.kind === 'requirement') {
      const [first, ...rest] = r.paths
      if (!first) continue
      if (!rest.length) requirements.push(...first)
      else {
        // Several routes (streams, a capstone done one way or another): one pick from all of them,
        // as many points as the smallest route. The planner keeps the routes themselves.
        const from = [...new Set(r.paths.flat().flatMap((x) => ('all' in x ? x.all : x.choose.from)))]
        requirements.push({ choose: { points: Math.min(...r.paths.map((p) => pathPoints(data, p))), from } })
      }
    }
  }
  if (!requirements.length) return null
  const points = requirements.reduce((s, r) => s + ('all' in r ? r.all.reduce((t, c) => t + (data.subjects[c]?.points ?? 12.5), 0) : r.choose.points), 0)
  return {
    id: courseCardId(course.code),
    course: course.code,
    year: course.year,
    kind: 'specialisation',
    informal: false,
    title: course.title,
    points,
    requiresMajor: undefined,
    notWith: [],
    assumedDone: course.assumedDone,
    noShareLevels: [],
    requirements,
    routes: undefined,
    limits: [],
    handbook: course.handbook,
    verifiedOn: course.verifiedOn,
    closedFrom: undefined,
    nonAllowedBreadth: undefined,
  } as unknown as Component
}

const WITH_CARDS = new WeakMap<Dataset, Dataset>()

/** The dataset plus a card for each listed-only master's course that has no specialisations. */
export function withCourseCards(data: Dataset): Dataset {
  const hit = WITH_CARDS.get(data)
  if (hit) return hit
  const hasSpecs = new Set(data.components.map((c) => c.course))
  const latest = new Map<string, Course>()
  for (const c of data.courses) if (isGraduateCode(c.code) && (latest.get(c.code)?.year ?? 0) < c.year) latest.set(c.code, c)
  const cards = [...latest.values()].filter((c) => !hasSpecs.has(c.code)).map((c) => cardOf(data, c)).filter((c): c is Component => c !== null)
  const out = cards.length ? { ...data, components: [...data.components, ...cards] } : data
  WITH_CARDS.set(data, out)
  return out
}

export function isCourseCard(id: string): boolean {
  return id.startsWith(COURSE_CARD_PREFIX)
}
