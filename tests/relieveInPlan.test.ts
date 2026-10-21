import { describe, expect, it } from 'vitest'
import { buildDataset } from '../scripts/dataset'
import { planComponentIds } from '../src/engine/courseRules'
import type { Plan } from '../src/engine/plan'
import type { Profile } from '../src/engine/recommend'
import { noWorse, relieveTerm, type Relief } from '../src/engine/relieve'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import { planRoles } from '../src/engine/roles'
import { courseStressFactors, planStress, requiredWithPrerequisites, termStress } from '../src/engine/termStress'
import { termsWithCarried } from '../src/engine/yearLong'

const { dataset: data } = buildDataset('real')
const profile = (skills: Profile['skills']): Profile => ({ results: [], skills, interests: [], goal: 'balanced' })

/** A term's level the way the planner page shows it (usePlanStress). */
function shown(plan: Plan, p: Profile): string[] {
  const roles = planRoles(data, plan.course, plan.courseYear, planComponentIds(plan).filter((id): id is string => !!id))
  const fixed = requiredWithPrerequisites(new Set([...roles.required, ...roles.options]), plan.terms.flatMap((t) => t.subjects), data.subjects, plan.course)
  return planStress(termsWithCarried(plan.terms, data), data, p, fixed, plan.course).terms.map((t) => t.level)
}

const plan = (course: string, s1: string[], s2: string[], major?: string): Plan => ({
  course,
  courseYear: 2026,
  major,
  minors: [],
  completed: [],
  terms: [
    { year: 2027, period: 'semester-1', subjects: s1 },
    { year: 2027, period: 'semester-2', subjects: s2 },
  ],
})

describe('relieveTerm judges a term the way the page shows it', () => {
  it('counts the carried half of a year-long subject in Semester 2', () => {
    for (const [course, yearLong] of [['B-FADANCE', 'DNCE20039'], ['B-FAPRO', 'DPSS30010']] as const) {
      expect(data.subjects[yearLong]?.yearLong).toBe(true)
      const p = plan(course, [yearLong, 'ACCT20001', 'ACCT20002'], ['ABPL30039', 'ABPL20033', 'ABPL20053', 'ABPL30041'])
      const student = profile({ writing: 1 })
      const levels = shown(p, student)
      expect(levels[1]).not.toBe('ok')
      // The page offers a fix only when the engine sees the same heavy term.
      const r = relieveTerm(p, data, 1, student)
      if (r && r.kind !== 'shortTerm') expect(['ok', 'heavy', 'veryHeavy'].indexOf(shown({ ...p, terms: r.terms }, student)[1] as string)).toBeLessThan(['ok', 'heavy', 'veryHeavy'].indexOf(levels[1] as string))
      expect(r, course).not.toBeNull()
    }
  })
})

const RANK = ['ok', 'heavy', 'veryHeavy']

/** The plan after pressing the button (as usePlan.applyRelief does). */
function applied(plan: Plan, i: number, r: Relief): Plan {
  if (r.kind !== 'shortTerm') return { ...plan, terms: r.terms }
  const terms = plan.terms.map((t, k) => ({ ...t, subjects: k === i ? t.subjects.filter((c) => c !== r.code) : [...t.subjects] }))
  let at = terms.find((t) => t.year === r.year && t.period === r.period)
  if (!at) {
    at = { year: r.year, period: r.period, subjects: [] }
    const key = (t: { year: number; period: string }) => t.year * 10 + ['summer', 'semester-1', 'winter', 'semester-2'].indexOf(t.period)
    const k = terms.findIndex((t) => key(t) > key(at!))
    terms.splice(k < 0 ? terms.length : k, 0, at)
  }
  at.subjects.push(r.code)
  return { ...plan, terms }
}

describe('a relief always takes the shown level down', () => {
  it('B-MUS composition, struggling with writing: an unavoidable writing stack is not what makes a term heavy', () => {
    const student = profile({ writing: 1, maths: 2 })
    // A plan the builder made for this student (kept fixed so the test doesn't follow the builder).
    const rows = [
      'MUSI10230 MUSI10047 MUSI10231 MUSI10204 MUSI10066',
      'MUSI10023 MUSI10232 MUSI10067 MUSI10206 MUSI20207 MUSI20108',
      'MUSI20198 MUSI20055 MUSI20237 MUSI30025',
      'MUSI20061 MUSI20056 MUSI20174 ERTH20001',
      'MUSI30213 MUSI30249 GEOM30009 PSYC30013',
      'MUSI30046 MUSI30214 MGMT30015 MUSI30164 MUSI30182',
    ]
    const p: Plan = {
      course: 'B-MUS',
      courseYear: 2026,
      major: 'mus-composition',
      minors: [],
      completed: [],
      terms: rows.map((r, i) => ({ year: 2027 + Math.floor(i / 2), period: i % 2 ? 'semester-2' : 'semester-1', subjects: r.split(' ') })),
    }
    const levels = shown(p, student)
    let checked = 0
    for (const [i, level] of levels.entries()) {
      // Two writing subjects is as spread as this degree gets: the engine must not see a heavy term here either.
      if (level === 'ok') {
        expect(relieveTerm(p, data, i, student), `term ${i}`).toBeNull()
        continue
      }
      const r = relieveTerm(p, data, i, student)
      if (!r) continue
      const after = applied(p, i, r)
      const t = p.terms[i]!
      const j = after.terms.findIndex((x) => x.year === t.year && x.period === t.period)
      expect(RANK.indexOf(shown(after, student)[j]!), `term ${i} ${JSON.stringify({ ...r, terms: undefined })}`).toBeLessThan(RANK.indexOf(level))
      checked++
    }
    expect(levels.some((l) => l !== 'ok')).toBe(true)
    expect(checked).toBeGreaterThan(0)
  })
})

describe('course lines are whole counts', () => {
  it('an extended Science semester is judged as a Science one (based_on), not a subject more lenient', () => {
    const codes = ['ABPL10005', 'ABPL30041', 'ABPL30053', 'ABPL30039']
    expect(courseStressFactors(data, 'B-SCIEXTD')).toEqual(courseStressFactors(data, 'B-SCI'))
    expect(termStress(codes, data, undefined, { course: 'B-SCIEXTD' })).toEqual(termStress(codes, data, undefined, { course: 'B-SCI' }))
    expect(termStress(codes, data, undefined, { course: 'B-SCI' }).reasons.map((r) => r.key)).toContain('coursework')
  })

  it('a factor just over 1 does not raise a line by a whole subject', () => {
    const codes = ['ABPL10005', 'ABPL30041', 'ABPL30053', 'ABPL30039']
    const f = courseStressFactors(data, 'B-AGR').coursework
    expect(f).toBeGreaterThan(1)
    expect(f).toBeLessThan(1.16)
    expect(termStress(codes, data, undefined, { course: 'B-AGR' }).reasons.map((r) => r.key)).toContain('coursework')
  })
})

describe('nothing gets worse means no new problem, not the same number of them', () => {
  it('trading one unmet corequisite for another is worse', () => {
    const none: Profile = profile({})
    const { plan: made } = generatePlan({ data, profile: none, course: '841AC', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1' })
    const swapped = (p: Plan, a: string, b: string): Plan => ({
      ...p,
      terms: p.terms.map((t) => ({ ...t, subjects: t.subjects.map((c) => (c === a ? b : c === b ? a : c)) })),
    })
    const errors = (p: Plan) => checkTerms(p, data).filter((i) => i.severity === 'error').map((i) => `${i.kind}:${i.subject}`)
    const before = swapped(made, 'ORAL10003', 'ORAL20003')
    const after = swapped(before, 'ORAL20003', 'ORAL20005')
    expect(errors(after)).toHaveLength(errors(before).length)
    expect(errors(before)).toContain('coreq-unmet:ORAL20003')
    expect(errors(after)).toContain('coreq-unmet:ORAL20005')
    expect(errors(before)).not.toContain('coreq-unmet:ORAL20005')
    expect(noWorse(before, after, data)).toBe(false)
    expect(noWorse(before, before, data)).toBe(true)
    expect(noWorse(before, made, data)).toBe(true)
  })
})
