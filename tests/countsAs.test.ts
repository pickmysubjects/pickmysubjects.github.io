import { describe, expect, it } from 'vitest'
import { realData } from './realData'
import { checkCourse, countsAsChoices, findCourse, withCountsAs } from '../src/engine/courseRules'
import { cleanPlans } from '../src/utils/sanitize'
import { planBody } from '../src/utils/planBook'

const detail = (r: ReturnType<typeof checkCourse>, id: string) => r.statuses.find((s) => s.ruleId === id)?.detail ?? ''
const points = (r: ReturnType<typeof checkCourse>, id: string) => Number(detail(r, id).split(' ')[0])

describe('a subject the student says counts differently (faculty-approved exception)', () => {
  const real = realData()
  // Any level-2 science subject of B-SCI: the rule is general, not about one code.
  const code = Object.values(real.subjects).find((s) => s.categories['B-SCI'] === 'science' && s.level === 2 && s.points === 12.5)!.code
  const plan = (countsAs?: Record<string, string>) =>
    ({ course: 'B-SCI', courseYear: 2026, completed: [], terms: [{ year: 2026, period: 'semester-1', subjects: [code] }], ...(countsAs ? { countsAs } : {}) }) as never

  it('counts toward breadth, not science, once changed', () => {
    const before = checkCourse(plan(), real)
    const after = checkCourse(plan({ [code]: 'breadth' }), real)
    expect(points(before, 'science')).toBe(12.5)
    expect(points(before, 'breadth')).toBe(0)
    expect(points(after, 'science')).toBe(0)
    expect(points(after, 'breadth')).toBe(12.5)
  })

  it('offers the categories the degree’s rules use', () => {
    expect(countsAsChoices(findCourse(real, 'B-SCI', 2026))).toEqual(['science', 'breadth'])
    expect(countsAsChoices(undefined)).toEqual([])
  })

  it('leaves the dataset alone with no changes', () => {
    expect(withCountsAs(real, 'B-SCI', undefined)).toBe(real)
    expect(withCountsAs(real, 'B-SCI', {})).toBe(real)
    expect(withCountsAs(real, 'B-SCI', { [code]: 'science' })).toBe(real)
  })

  it('is kept with the plan and cleaned on load', () => {
    const state = { setup: { course: 'B-SCI', startYear: 2026, startPeriod: 'semester-1' }, terms: [], notes: [], unplaced: [] }
    const books = cleanPlans({ real: { active: 'a', plans: [{ id: 'a', label: 'A', ...state, countsAs: { [code]: 'breadth', BAD: 'breadth', [`${code.slice(0, 4)}99999`]: 'nonsense' } }] } })
    expect(books.real!.plans[0]!.countsAs).toEqual({ [code]: 'breadth' })
    const none = cleanPlans({ real: { active: 'a', plans: [{ id: 'a', label: 'A', ...state, countsAs: 'x' }] } })
    expect(none.real!.plans[0]!.countsAs).toBeUndefined()
    expect(planBody({ ...(state as object), countsAs: { [code]: 'breadth' } } as never).countsAs).toEqual({ [code]: 'breadth' })
  })
})
