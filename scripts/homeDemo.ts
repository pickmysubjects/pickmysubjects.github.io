/**
 * The two examples on the home page, worked out from the real data at build time so the page
 * shows them at once (and in its static HTML) without running the planner in the browser.
 */
import { checkCourse } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { subjectRoles } from '../src/engine/roles'
import type { Dataset } from '../src/engine/schema'
import type { HomeDemo } from '../src/utils/homeDemo'

export const DEMO_SUBJECT = 'COMP10001'
export const DEMO_COURSE = 'B-SCI'
export const DEMO_MAJOR = 'computing-and-software-systems'

export function buildHomeDemo(data: Dataset, year: number): HomeDemo {
  const s = data.subjects[DEMO_SUBJECT]
  if (!s) throw new Error(`home demo: ${DEMO_SUBJECT} is missing`)
  const { plan } = generatePlan({
    data,
    profile: { results: [], skills: {}, interests: [], goal: 'balanced' },
    course: DEMO_COURSE,
    courseYear: year,
    major: DEMO_MAJOR,
    startYear: year,
    startPeriod: 'semester-1',
  })
  const statuses = checkCourse(plan, data).statuses
  const major = data.components.find((c) => c.id === DEMO_MAJOR)
  const course = data.courses.find((c) => c.code === DEMO_COURSE)
  return {
    // Plain counts for the proof row under the hero.
    stats: {
      subjects: Object.keys(data.subjects).length,
      degrees: data.courses.filter((c) => c.title.startsWith('Bachelor')).length,
    },
    // The card shows the reviewers' verdicts and source, not their points: leave those out to keep it small.
    subject: { ...s, about: undefined, discussions: s.discussions?.map((d) => ({ ...d, points: [] })) },
    plan: {
      course: DEMO_COURSE,
      courseTitle: course?.title ?? DEMO_COURSE,
      major: DEMO_MAJOR,
      majorTitle: major?.title ?? DEMO_MAJOR,
      terms: plan.terms.map((x) => ({ year: x.year, period: x.period, subjects: x.subjects })),
      // What each planned subject card shows: its title and whether it counts for the major.
      cards: Object.fromEntries(
        plan.terms.flatMap((x) =>
          x.subjects.map((code) => {
            const sub = data.subjects[code]
            return [
              code,
              {
                title: sub?.title ?? code,
                titles: sub?.titles,
                category: sub?.categories[DEMO_COURSE],
                major: subjectRoles(data, code, DEMO_COURSE).some((r) => r.component === DEMO_MAJOR),
              },
            ]
          }),
        ),
      ),
      met: statuses.filter((r) => r.status === 'ok').length,
      total: statuses.length,
    },
  }
}
