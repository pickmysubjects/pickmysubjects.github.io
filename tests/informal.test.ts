import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { componentFileSchema, type Dataset } from '../src/engine/schema'
import { checkCourse, heldAsMinor, informalPicks } from '../src/engine/courseRules'
import { generatePlan } from '../src/engine/generate'
import { checkTerms } from '../src/engine/planCheck'
import { setupTitles } from '../src/composables/usePlanCompare'
import type { Plan } from '../src/engine/plan'

const real = realData()
// PLAN30004 isn't curated yet: stand in a copy of a level 3 Design subject with no prerequisites.
const stub = { ...real.subjects.ABPL30051!, code: 'PLAN30004', title: 'Transport Planning and Urban Mobilities', prerequisites: 'none' as const, corequisites: 'none' as const }
const data: Dataset = { ...real, subjects: { ...real.subjects, PLAN30004: stub } }
const TRANSPORT = 'des-informal-transport-design'

describe('informal specialisations in the schema', () => {
  it('are kind specialisation with informal set, and only that kind may set it', () => {
    const informal = real.components.filter((c) => c.informal)
    expect(informal.map((c) => c.id).sort()).toHaveLength(9)
    expect(informal.every((c) => c.course === 'B-DES' && c.kind === 'specialisation' && c.points === 25)).toBe(true)
    expect(real.components.find((c) => c.id === 'des-spec-artificial-intelligence')?.informal).toBe(false)
    const base = { id: 'x', course: 'X', year: 2026, title: 'X', points: 25, informal: true }
    expect(() => componentFileSchema.parse({ ...base, kind: 'minor' })).toThrow()
    expect(componentFileSchema.parse({ ...base, kind: 'specialisation' }).informal).toBe(true)
  })

  it('are held like minors, not as the formal specialisation', () => {
    expect(heldAsMinor(real.components.find((c) => c.id === TRANSPORT)!)).toBe(true)
    expect(heldAsMinor(real.components.find((c) => c.id === 'des-spec-advanced-computing')!)).toBe(false)
    expect(informalPicks(real, [TRANSPORT])).toBe(true)
    expect(informalPicks(real, [])).toBe(false)
  })

  it('B-DES allows one, through an informal minor rule beside the formal specialisation rule', () => {
    const des = real.courses.find((c) => c.code === 'B-DES')!
    expect(des.rules.find((r) => r.kind === 'minor')).toMatchObject({ max: 1, informal: true })
    expect(des.rules.find((r) => r.kind === 'specialisation')).toMatchObject({ max: 1 })
  })
})

describe('checking an informal specialisation', () => {
  const plan = (minors: string[], completed: string[] = [], specialisation?: string): Plan => ({ course: 'B-DES', courseYear: 2026, major: 'des-urban-planning', specialisation, minors, completed, terms: [] })
  const rule = (p: Plan) => checkCourse(p, data).statuses.find((s) => s.ruleId === 'informal-specialisation')!

  it('is optional, missing until its subjects are in, done once they are', () => {
    expect(rule(plan([])).status).toBe('ok')
    expect(rule(plan([TRANSPORT], ['CVEN30011'])).detailKey).toBe('componentMissing')
    expect(rule(plan([TRANSPORT], ['CVEN30011', 'PLAN30004'])).detailKey).toBe('componentDone')
  })

  it("doesn't count against the formal specialisation maximum", () => {
    // Holding an informal one leaves the formal specialisation unchosen.
    expect(checkCourse(plan([TRANSPORT]), data).statuses.find((s) => s.ruleId === 'specialisation')?.detailKey).toBe('noSpec')
    // A formal one alongside is checked on its own; the informal rule is unaffected.
    expect(rule(plan([TRANSPORT], ['CVEN30011', 'PLAN30004'], 'des-spec-artificial-intelligence')).detailKey).toBe('componentDone')
    expect(rule(plan([TRANSPORT, 'des-informal-typography'])).detailKey).toBe('tooManyMinors')
  })

  it('is named as an informal specialisation when plans are compared', () => {
    expect(setupTitles(data, { major: 'des-urban-planning', specialisation: '', minors: [TRANSPORT] })).toEqual({ major: 'Urban Planning', minor: 'Transport Design', minorInformal: true })
  })
})

describe('planning an informal specialisation', () => {
  const profile = { results: [], skills: {}, interests: [], goal: 'balanced' as const }

  it('plans its subjects alongside the major and meets its rule', () => {
    const { plan, unplaced } = generatePlan({ data, profile, course: 'B-DES', courseYear: 2026, major: 'des-urban-planning', minors: [TRANSPORT], startYear: 2027, startPeriod: 'semester-1' })
    const codes = plan.terms.flatMap((t) => t.subjects)
    expect(codes).toEqual(expect.arrayContaining(['PLAN30004', 'CVEN30011']))
    expect(unplaced).toEqual([])
    expect(checkCourse(plan, data).statuses.find((s) => s.ruleId === 'informal-specialisation')?.status).toBe('ok')
    expect(checkTerms(plan, data).filter((i) => i.severity === 'error')).toEqual([])
  })
})
