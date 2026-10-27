import { describe, expect, it } from 'vitest'
import { categoryOf, checkCourse, checkTerms, generatePlan, planRoles, type Plan, type Profile } from '../src/engine'
import { pinSpot } from '../src/utils/pendingAdd'
import { dataset, subject } from './helpers'
import { realData } from './realData'

// "Add to plan" on a subject's page before there's a plan: the subject goes into the plan built.
describe('a subject picked before the plan is pinned into it', () => {
  const data = realData()
  const empty: Profile = { results: [], skills: {}, interests: [], goal: 'balanced' }
  const built = generatePlan({ data, profile: empty, course: 'B-SCI', courseYear: 2027, major: 'computing-and-software-systems', startYear: 2027, startPeriod: 'semester-1' }).plan
  const planned = new Set(built.terms.flatMap((t) => t.subjects))
  const roles = planRoles(data, 'B-SCI', 2027, ['computing-and-software-systems'])
  const keep = new Set([...roles.required, ...roles.options])
  // First-year subjects open to B-SCI with no prerequisites, that the plan doesn't have.
  const candidates = Object.values(data.subjects).filter(
    (s) => s.level === 1 && s.prerequisites === 'none' && !s.campus && s.discontinuedFrom === undefined && categoryOf(s, 'B-SCI') !== undefined && !planned.has(s.code) && checkTerms({ ...built, terms: [{ year: 2027, period: 'semester-1', subjects: [s.code] }] }, data).length === 0,
  )
  const apply = (code: string, spot: { termIndex: number; replace?: string }): Plan => ({
    ...built,
    terms: built.terms.map((t, i) => (i === spot.termIndex ? { ...t, subjects: spot.replace ? t.subjects.map((c) => (c === spot.replace ? code : c)) : [...t.subjects, code] } : t)),
  })
  const errors = (p: Plan) => checkCourse(p, data).issues.filter((i) => i.severity === 'error').length

  it('every such subject goes in, never at the cost of what the degree and major need', () => {
    expect(candidates.length).toBeGreaterThan(10)
    let clean = 0
    for (const s of candidates.slice(0, 40)) {
      const spot = pinSpot(built, data, s.code, keep, 50)
      expect(spot, s.code).not.toBeNull()
      const after = apply(s.code, spot!)
      // Nothing wrong with the subject where it went.
      expect(checkTerms(after, data).filter((i) => i.severity === 'error'), s.code).toEqual([])
      if (spot!.replace) expect(keep.has(spot!.replace)).toBe(false)
      if (!spot!.over) {
        // In a free place or a trade: no term over the load, no degree rule newly broken.
        expect(checkTerms(after, data).filter((i) => i.kind === 'overload'), s.code).toEqual([])
        expect(errors(after), s.code).toBeLessThanOrEqual(errors(built))
        clean++
      }
    }
    // Most go in by trading a free elective, without making any term heavier.
    expect(clean).toBeGreaterThan(0)
  })

  it('is not placed again when the plan has it already', () => {
    const inPlan = built.terms[0]!.subjects[0]!
    expect(pinSpot(built, data, inPlan, keep, 50)).toBeNull()
  })

  it('says nowhere works when its prerequisites are not in the plan', () => {
    const small = dataset([
      subject({ code: 'AAAA10001', offerings: { 2026: ['semester-1', 'semester-2'] }, prerequisites: 'none' }),
      subject({ code: 'AAAA30001', level: 3, offerings: { 2026: ['semester-1', 'semester-2'] }, prerequisites: 'AAAA20001' }),
      subject({ code: 'AAAA20001', level: 2, offerings: { 2026: ['semester-1'] }, prerequisites: 'none' }),
    ])
    const plan: Plan = { course: 'X', courseYear: 2026, completed: [], terms: [{ year: 2026, period: 'semester-1', subjects: ['AAAA10001'] }, { year: 2026, period: 'semester-2', subjects: [] }] }
    expect(pinSpot(plan, small, 'AAAA30001', new Set(), 50)).toBeNull()
    // One that fits goes straight in, the first term it can.
    expect(pinSpot(plan, small, 'AAAA20001', new Set(), 50)).toEqual({ termIndex: 0 })
  })
})
