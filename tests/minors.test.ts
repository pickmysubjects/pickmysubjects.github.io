import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { buildDataset } from '../scripts/dataset'
import { componentFileSchema, courseFileSchema, type Dataset } from '../src/engine/schema'
import { checkCourse } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import { evaluate } from '../src/engine/expr'
import { cleanPlans } from '../src/utils/sanitize'
import { setupTitles } from '../src/composables/usePlanCompare'
import type { Plan } from '../src/engine/plan'

const fixture = componentFileSchema.parse(parse(readFileSync(new URL('./fixtures/philosophy-minor.yaml', import.meta.url), 'utf8')))
const { dataset: real } = buildDataset('real')
const data: Dataset = { ...real, components: [...real.components, fixture] }

describe('minors in the schema', () => {
  it('reads a minor component and a course rule limiting minors', () => {
    expect(fixture.kind).toBe('minor')
    expect(fixture.requirements).toEqual([{ choose: { points: 25, from: ['PHIL20008', 'PHIL20030', 'PHIL20033', 'PHIL20039'] } }, { all: ['PHIL30024'] }])
    const course = courseFileSchema.parse({ code: 'X', title: 'X', year: 2026, total_points: 300, standard_load: 50, rules: [{ id: 'minor', kind: 'minor', max: 1, description: 'At most one minor' }] })
    expect(course.rules[0]).toEqual({ id: 'minor', kind: 'minor', max: 1, informal: false, description: 'At most one minor' })
    expect(() => courseFileSchema.parse({ code: 'X', title: 'X', year: 2026, total_points: 300, standard_load: 50, rules: [{ id: 'minor', kind: 'minor', description: 'x' }] })).toThrow()
  })

  it('B-ARTS allows at most one minor', () => {
    const arts = real.courses.find((c) => c.code === 'B-ARTS')!
    expect(arts.rules.find((r) => r.kind === 'minor')).toMatchObject({ max: 1 })
  })
})

describe('saved plans from before minors', () => {
  it('get no minor; a saved minor is kept', () => {
    const setup = { course: 'B-ARTS', courseYear: 2026, startYear: 2027, startPeriod: 'semester-1', major: 'history', specialisation: '' }
    const old = { real: { active: 'a', plans: [{ id: 'a', label: 'A', setup, terms: [], notes: [], unplaced: [] }] } }
    expect(cleanPlans(old).real!.plans[0]!.setup.minors).toEqual([])
    const withMinor = { real: { active: 'a', plans: [{ id: 'a', label: 'A', setup: { ...setup, minors: ['test-philosophy-minor', 3] }, terms: [], notes: [], unplaced: [] }] } }
    expect(cleanPlans(withMinor).real!.plans[0]!.setup.minors).toEqual(['test-philosophy-minor'])
  })
})

describe('planning a minor', () => {
  const profile = { results: [], skills: {}, interests: [], goal: 'balanced' as const }

  it("plans the minor's required subjects alongside the major and meets its rule", () => {
    const { plan, unplaced } = generatePlan({ data, profile, course: 'B-ARTS', courseYear: 2026, major: 'history', minors: ['test-philosophy-minor'], startYear: 2027, startPeriod: 'semester-1' })
    const codes = plan.terms.flatMap((t) => t.subjects)
    expect(plan.minors).toEqual(['test-philosophy-minor'])
    expect(codes).toContain('PHIL30024')
    expect(codes.filter((c) => ['PHIL20008', 'PHIL20030', 'PHIL20033', 'PHIL20039'].includes(c)).length).toBeGreaterThanOrEqual(2)
    expect(unplaced).toEqual([])
    const statuses = checkCourse(plan, data).statuses
    expect(statuses.find((s) => s.ruleId === 'minor')?.status).toBe('ok')
    expect(statuses.find((s) => s.ruleId === 'major')?.status).toBe('ok')
    expect(checkTerms(plan, data).filter((i) => i.severity === 'error')).toEqual([])
    // Without the minor, nothing asks for PHIL30024.
    const without = generatePlan({ data, profile, course: 'B-ARTS', courseYear: 2026, major: 'history', minors: [], startYear: 2027, startPeriod: 'semester-1' })
    expect(without.plan.terms.flatMap((t) => t.subjects)).not.toContain('PHIL30024')
  })
})

describe('the minor course rule', () => {
  const plan = (minors: string[] | undefined, major = 'history', subjects: string[] = []): Plan => ({ course: 'B-ARTS', courseYear: 2026, major, minors, completed: subjects, terms: [] })
  const minorRule = (p: Plan) => checkCourse(p, data).statuses.find((s) => s.ruleId === 'minor')!

  it('is met with no minor (optional), missing until its subjects are in, complete once they are', () => {
    expect(minorRule(plan([])).status).toBe('ok')
    expect(minorRule(plan(undefined)).status).toBe('ok')
    const missing = minorRule(plan(['test-philosophy-minor'], 'history', ['PHIL20008']))
    expect(missing.status).toBe('fail')
    expect(missing.detailKey).toBe('componentMissing')
    expect(minorRule(plan(['test-philosophy-minor'], 'history', ['PHIL20008', 'PHIL20030', 'PHIL30024'])).detailKey).toBe('componentDone')
  })

  it('allows at most the course maximum', () => {
    const r = minorRule(plan(['test-philosophy-minor', 'philosophy-minor-2']))
    expect(r.status).toBe('fail')
    expect(r.detailKey).toBe('tooManyMinors')
  })

  it("can't be the same discipline as the major (same title)", () => {
    const r = minorRule(plan(['test-philosophy-minor'], 'philosophy', ['PHIL20008', 'PHIL20030', 'PHIL30024']))
    expect(r.status).toBe('fail')
    expect(r.detailKey).toBe('minorSameAsMajor')
  })
})

describe('prerequisites a minor can meet', () => {
  const text = 'Admission into or selection of one of the following: Philosophy major in the B-ARTS Bachelor of Arts, Philosophy minor in the B-ARTS Bachelor of Arts'
  const ctx = (majors?: string[], minors?: string[]) => ({ completed: new Set<string>(), subjects: {}, admittedCourse: 'B-ARTS', majors, minors })

  it('is met by the named minor, failed when neither the major nor the minor is held, unknown when minors are unknown', () => {
    expect(evaluate({ manual: text }, ctx(['History'], ['Philosophy'])).status).toBe('ok')
    expect(evaluate({ manual: text }, ctx(undefined, ['Philosophy'])).status).toBe('ok')
    expect(evaluate({ manual: text }, ctx(['Philosophy'], [])).status).toBe('ok')
    const fail = evaluate({ manual: text }, ctx(['History'], []))
    expect(fail.status).toBe('fail')
    expect(fail.unmet).toEqual(['a place in the Philosophy major / Philosophy minor'])
    expect(evaluate({ manual: text }, ctx(['History'], undefined)).status).toBe('unknown')
    expect(evaluate({ manual: text }, ctx(undefined, [])).status).toBe('unknown')
  })

  it('a minor title does not meet a condition naming only the major', () => {
    const majorOnly = 'Philosophy major in the B-ARTS Bachelor of Arts'
    expect(evaluate({ manual: majorOnly }, ctx(['History'], ['Philosophy'])).status).toBe('fail')
  })
})

describe('comparing plans', () => {
  it("shows each plan's minor next to its major", () => {
    expect(setupTitles(data, { major: 'history', specialisation: '', minors: ['test-philosophy-minor'] })).toEqual({ major: 'History', minor: 'Philosophy', minorInformal: false })
    expect(setupTitles(data, { major: 'history', specialisation: '', minors: [] }).minor).toBe('')
  })

  it('rules out a minor the Handbook pairs against the major ("Diversity of study")', async () => {
    const { minorClash } = await import('../src/engine/courseRules')
    expect(minorClash(data, 'chinese-studies', 'chinese-societies-minor')).toMatch(/can't be taken with/)
    expect(minorClash(data, 'history', 'chinese-societies-minor')).toBeNull()
  })
})
