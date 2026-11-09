/**
 * Plans every degree with every major (both start semesters), every minor and specialisation,
 * and every diploma stream, and checks each plan: course rules, term problems and unplaced
 * subjects. A release check, not a test: it takes several minutes and some combinations are
 * impossible by the Handbook's own rules (a specialisation excluded by the major's subjects).
 *
 *   npm run sweep              # everything
 *   npm run sweep -- --majors  # degrees × majors only (about a minute)
 *
 * Prints one line per plan with a problem, then a count. Run `npm run data` first.
 */
import { checkCourse, diplomaClash, findDiploma } from '../src/engine/courseRules'
import { generatePlan, type GenerateInput } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import { realData } from '../tests/realData'
import { latestDataYear } from '../src/engine/dataYear'

const data = realData()
// The newest Handbook year in the data, so the sweep follows the import (2027 and on).
const YEAR = latestDataYear(data.subjects)
const profile = { results: [], skills: {}, interests: [], goal: 'balanced' as const }
const majorsOnly = process.argv.includes('--majors')
const open = (c: { closedFrom?: number }) => c.closedFrom === undefined || YEAR < c.closedFrom
const of = (course: string, kind: string) => data.components.filter((c) => c.course === course && c.kind === kind && open(c)).map((c) => c.id)

let checked = 0
let problems = 0
function run(label: string, input: Partial<GenerateInput> & { course: string }): void {
  checked++
  try {
    const { plan, unplaced } = generatePlan({ data, profile, courseYear: YEAR, startYear: YEAR, startPeriod: 'semester-1', minors: [], ...input })
    const fails = checkCourse(plan, data).statuses.filter((s) => s.status === 'fail').map((s) => s.ruleId)
    const errors = [...new Set(checkTerms(plan, data).filter((i) => i.severity === 'error').map((i) => `${i.kind} ${i.subject ?? ''}`.trim()))]
    if (fails.length || errors.length || unplaced.length) {
      problems++
      console.log(`${label}: ${[fails.length ? `rules ${fails.join(',')}` : '', errors.length ? `terms ${errors.join(',')}` : '', unplaced.length ? `${unplaced.length} unplaced` : ''].filter(Boolean).join('; ')}`)
    }
  } catch (e) {
    problems++
    console.log(`${label}: threw ${(e as Error).message}`)
  }
}

for (const course of [...new Set(data.courses.map((c) => c.code))]) {
  const majors = of(course, 'major')
  for (const major of majors.length ? majors : [undefined]) {
    for (const startPeriod of ['semester-1', 'semester-2'] as const) run(`${course} ${major ?? '-'} from ${startPeriod}`, { course, major, startPeriod })
  }
  if (majorsOnly) continue
  const first = majors[0]
  for (const minor of of(course, 'minor')) run(`${course} ${first} + minor ${minor}`, { course, major: first, minors: [minor] })
  for (const spec of of(course, 'specialisation')) for (const major of majors) run(`${course} ${major} + ${spec}`, { course, major, specialisation: spec })
  for (const d of data.diplomas ?? []) {
    for (const stream of d.streams?.length ? d.streams : [undefined]) {
      if (diplomaClash(data, findDiploma(data, d.code)!, { course, major: first, diplomaStream: stream })) continue
      run(`${course} ${first} + ${d.code} ${stream ?? ''}`.trim(), { course, major: first, diploma: d.code, diplomaStream: stream })
    }
  }
}
console.log(`${checked} plans, ${problems} with a problem`)
